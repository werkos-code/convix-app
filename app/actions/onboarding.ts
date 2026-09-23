"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmPeriodFromAccountBalances } from "@/lib/accounts/confirm-period-balances";
import { requireUser } from "@/lib/auth/require-user";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { DEFAULT_SALARY_DAY } from "@/lib/periods/salary-period";
import { accountSchema } from "@/lib/validations/schemas";
import { z } from "zod";
import { fail, ok, requireCents, type ActionResult } from "./_result";

const onboardingSchema = z.object({
  accounts: z.array(accountSchema).min(1),
  salaryDay: z.coerce.number().int().min(1).max(28).optional(),
  displayName: z.string().trim().max(80).optional().nullable(),
  seedDefaults: z.boolean().optional(),
});

const DEFAULT_BUDGETS = [
  { name: "Boodschappen", euros: "400" },
  { name: "Brandstof", euros: "250" },
  { name: "Entertainment", euros: "100" },
] as const;

/**
 * Completes onboarding: creates accounts (+ optional default budgets),
 * stamps profile, opens the current salary period, and confirms starting balances.
 */
export async function completeOnboarding(input: {
  accounts: Array<{
    name: string;
    type: "checking" | "savings" | "other";
    balanceEuros: string;
  }>;
  salaryDay?: number;
  displayName?: string | null;
  seedDefaults?: boolean;
}): Promise<ActionResult<{ periodId: string }>> {
  try {
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid onboarding data");
    }

    const { user, supabase } = await requireUser();

    const profilePatch: {
      onboarding_completed_at: string;
      salary_day: number;
      display_name?: string | null;
    } = {
      onboarding_completed_at: new Date().toISOString(),
      salary_day: parsed.data.salaryDay ?? DEFAULT_SALARY_DAY,
    };
    if (parsed.data.displayName !== undefined) {
      profilePatch.display_name = parsed.data.displayName;
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", user.id);

    if (profileErr) return fail(profileErr.message);

    const { data: existingAccounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (!existingAccounts?.length) {
      const rows = parsed.data.accounts.map((a, index) => ({
        user_id: user.id,
        name: a.name,
        type: a.type,
        sort_order: index,
        last_confirmed_balance_cents: requireCents(a.balanceEuros, "Balance"),
        last_confirmed_at: new Date().toISOString(),
      }));

      const { error: acctErr } = await supabase.from("accounts").insert(rows);
      if (acctErr) return fail(acctErr.message);
    } else {
      for (const [index, a] of parsed.data.accounts.entries()) {
        if (index >= existingAccounts.length) {
          const { error } = await supabase.from("accounts").insert({
            user_id: user.id,
            name: a.name,
            type: a.type,
            sort_order: index,
            last_confirmed_balance_cents: requireCents(a.balanceEuros, "Balance"),
            last_confirmed_at: new Date().toISOString(),
          });
          if (error) return fail(error.message);
        } else {
          const { error } = await supabase
            .from("accounts")
            .update({
              name: a.name,
              type: a.type,
              last_confirmed_balance_cents: requireCents(
                a.balanceEuros,
                "Balance",
              ),
              last_confirmed_at: new Date().toISOString(),
            })
            .eq("id", existingAccounts[index].id);
          if (error) return fail(error.message);
        }
      }
    }

    if (parsed.data.seedDefaults !== false) {
      const { count } = await supabase
        .from("budget_categories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!count) {
        const { error: budErr } = await supabase.from("budget_categories").insert(
          DEFAULT_BUDGETS.map((b, i) => ({
            user_id: user.id,
            name: b.name,
            default_amount_cents: requireCents(b.euros),
            sort_order: i,
          })),
        );
        if (budErr) return fail(budErr.message);
      }
    }

    const { period } = await ensureOpenPeriod(supabase, user.id);

    // First setup: treat entered balances as the confirmed period starting point.
    await confirmPeriodFromAccountBalances(supabase, user.id, period.id, {
      zeroCarryOver: true,
    });

    revalidatePath("/app");
    revalidatePath("/app/onboarding");
    revalidatePath("/app/accounts");
    redirect("/app");
    return ok({ periodId: period.id });
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return fail(e instanceof Error ? e.message : "Onboarding failed");
  }
}
