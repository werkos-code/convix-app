"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { rematerializeUserPeriods } from "@/lib/obligations/materialize";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { clampDayOfMonth, parseISODate } from "@/lib/periods/salary-period";
import { incomeRuleSchema } from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";

export async function createIncomeRule(input: {
  name: string;
  amountEuros: string;
  recurrence: "monthly" | "yearly" | "once";
  dayOfMonth: number;
  monthOfYear?: number | null;
  accountId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = incomeRuleSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Ongeldige inkomstenregel",
      );
    }

    if (parsed.data.recurrence === "yearly" && !parsed.data.monthOfYear) {
      return fail("Kies een maand voor jaarlijkse inkomsten");
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
    const { period } = await ensureOpenPeriod(supabase, user.id);

    let startsOn: string | null = null;
    if (parsed.data.recurrence === "once") {
      const start = parseISODate(period.starts_on);
      startsOn = clampDayOfMonth(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        parsed.data.dayOfMonth,
      );
    }

    const { data, error } = await supabase
      .from("income_rules")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        amount_cents: amountCents,
        recurrence: parsed.data.recurrence,
        day_of_month: parsed.data.dayOfMonth,
        month_of_year:
          parsed.data.recurrence === "yearly"
            ? (parsed.data.monthOfYear ?? null)
            : null,
        account_id: parsed.data.accountId ?? null,
        starts_on: startsOn,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    const { data: periods } = await supabase
      .from("salary_periods")
      .select("id, starts_on, ends_on")
      .eq("user_id", user.id)
      .gte("starts_on", period.starts_on)
      .order("starts_on", { ascending: true })
      .limit(2);

    await rematerializeUserPeriods(
      supabase,
      user.id,
      periods ?? [
        {
          id: period.id,
          starts_on: period.starts_on,
          ends_on: period.ends_on,
        },
      ],
    );

    revalidatePath("/app");
    revalidatePath("/app/income");
    revalidatePath("/app/timeline");
    return ok({ id: data.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Inkomsten opslaan mislukt",
    );
  }
}

export async function deactivateIncomeRule(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.id) return fail("Regel niet gevonden");

    const { user, supabase } = await requireUser();

    const { error } = await supabase
      .from("income_rules")
      .update({ is_active: false })
      .eq("id", input.id)
      .eq("user_id", user.id);

    if (error) return fail(error.message);

    await supabase
      .from("obligations")
      .update({ status: "cancelled", remaining_open_cents: 0 })
      .eq("user_id", user.id)
      .eq("source_type", "income_rule")
      .eq("source_id", input.id)
      .in("status", [
        "planned",
        "due",
        "partially_paid",
        "returned_open",
      ]);

    revalidatePath("/app");
    revalidatePath("/app/income");
    revalidatePath("/app/timeline");
    return ok({ id: input.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Inkomstenregel verwijderen mislukt",
    );
  }
}
