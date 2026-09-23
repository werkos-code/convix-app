"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { todayInTimezone } from "@/lib/periods/salary-period";
import { quickExpenseSchema } from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";

async function resolveDefaultCheckingAccountId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  preferredId?: string | null,
): Promise<string | null> {
  if (preferredId) return preferredId;

  const { data } = await supabase
    .from("accounts")
    .select("id, type")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!data?.length) return null;
  const checking = data.find((a) => a.type === "checking");
  return checking?.id ?? data[0]?.id ?? null;
}

/**
 * Snelle uitgave — nooit blokkeren bij overbudget.
 * Minimaal: bedrag + naam. Categorie optioneel.
 */
export async function createQuickExpense(input: {
  amountEuros: string;
  name: string;
  categoryId?: string | null;
  accountId?: string | null;
  occurredOn?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = quickExpenseSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Ongeldige uitgave",
      );
    }

    let amountCents: number;
    try {
      amountCents = requireCents(parsed.data.amountEuros, "Bedrag");
    } catch {
      return fail("Voer een geldig bedrag in");
    }

    if (amountCents <= 0) {
      return fail("Bedrag moet groter zijn dan nul");
    }

    const { user, supabase } = await requireUser();
    const { period, profile } = await ensureOpenPeriod(supabase, user.id);
    const occurredOn =
      parsed.data.occurredOn ?? todayInTimezone(profile.timezone);

    const accountId = await resolveDefaultCheckingAccountId(
      supabase,
      user.id,
      parsed.data.accountId,
    );

    const { data, error } = await supabase
      .from("ledger_events")
      .insert({
        user_id: user.id,
        type: "expense",
        name: parsed.data.name,
        amount_cents: amountCents,
        occurred_on: occurredOn,
        account_id: accountId,
        budget_category_id: parsed.data.categoryId ?? null,
        period_id: period.id,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    revalidatePath("/app");
    revalidatePath("/app/timeline");
    revalidatePath("/app/uitgaand");
    revalidatePath("/app/budgets");
    revalidatePath("/app/expenses/new");
    return ok({ id: data.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Uitgave opslaan mislukt",
    );
  }
}
