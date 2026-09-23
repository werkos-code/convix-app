"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { applyObligationTransition } from "@/lib/obligations/state-machine";
import { rematerializeUserPeriods } from "@/lib/obligations/materialize";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { todayInTimezone } from "@/lib/periods/salary-period";
import type { ObligationStatus } from "@/lib/types/domain";
import { savingsGoalSchema } from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";

function revalidateSavings() {
  revalidatePath("/app");
  revalidatePath("/app/savings");
  revalidatePath("/app/timeline");
}

export async function createSavingsGoal(input: {
  name: string;
  currentAmountEuros?: string;
  targetAmountEuros?: string | null;
  scheduledAmountEuros: string;
  contributionDay: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = savingsGoalSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Ongeldig spaardoel",
      );
    }

    let scheduledCents: number;
    try {
      scheduledCents = requireCents(
        parsed.data.scheduledAmountEuros,
        "Maandelijkse bijdrage",
      );
    } catch {
      return fail("Voer een geldige maandelijkse bijdrage in");
    }

    if (scheduledCents <= 0) {
      return fail("Maandelijkse bijdrage moet groter zijn dan nul");
    }

    let currentCents = 0;
    if (
      parsed.data.currentAmountEuros != null &&
      parsed.data.currentAmountEuros !== ""
    ) {
      try {
        currentCents = requireCents(
          parsed.data.currentAmountEuros,
          "Huidig bedrag",
        );
      } catch {
        return fail("Voer een geldig huidig bedrag in");
      }
    }

    let targetCents: number | null = null;
    if (
      parsed.data.targetAmountEuros != null &&
      parsed.data.targetAmountEuros !== ""
    ) {
      try {
        targetCents = requireCents(
          parsed.data.targetAmountEuros,
          "Doelbedrag",
        );
      } catch {
        return fail("Voer een geldig doelbedrag in");
      }
    }

    const { user, supabase } = await requireUser();

    const { data, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        current_amount_cents: currentCents,
        target_amount_cents: targetCents,
        scheduled_amount_cents: scheduledCents,
        contribution_day: parsed.data.contributionDay,
        recurrence: "monthly",
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    const { period } = await ensureOpenPeriod(supabase, user.id);
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

    revalidateSavings();
    return ok({ id: data.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Spaardoel opslaan mislukt",
    );
  }
}

export async function contributeToSavings(input: {
  goalId: string;
  amountEuros: string;
  obligationId?: string | null;
  occurredOn?: string;
}): Promise<
  ActionResult<{
    goalCurrentCents: number;
    obligationStatus?: ObligationStatus;
  }>
> {
  try {
    if (!input.goalId) return fail("Kies een spaardoel");

    let amountCents: number;
    try {
      amountCents = requireCents(input.amountEuros, "Bedrag");
    } catch {
      return fail("Voer een geldig bedrag in");
    }
    if (amountCents <= 0) {
      return fail("Bedrag moet groter zijn dan nul");
    }

    const { user, supabase } = await requireUser();
    const { period, profile } = await ensureOpenPeriod(supabase, user.id);
    const occurredOn =
      input.occurredOn ?? todayInTimezone(profile.timezone);

    const { data: goal, error: goalErr } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("id", input.goalId)
      .eq("user_id", user.id)
      .single();

    if (goalErr || !goal) {
      return fail(goalErr?.message ?? "Spaardoel niet gevonden");
    }

    let obligationStatus: ObligationStatus | undefined;
    let obligationId = input.obligationId ?? null;

    if (!obligationId) {
      const { data: linked } = await supabase
        .from("obligations")
        .select("id")
        .eq("user_id", user.id)
        .eq("period_id", period.id)
        .eq("source_type", "savings_goal")
        .eq("source_id", goal.id)
        .in("status", ["planned", "due", "partially_paid", "returned_open"])
        .maybeSingle();
      obligationId = linked?.id ?? null;
    }

    if (obligationId) {
      const { data: obligation, error: oblErr } = await supabase
        .from("obligations")
        .select("*")
        .eq("id", obligationId)
        .eq("user_id", user.id)
        .single();

      if (oblErr || !obligation) {
        return fail(oblErr?.message ?? "Gekoppelde verplichting niet gevonden");
      }

      const next = applyObligationTransition(
        {
          amountCents: obligation.amount_cents,
          remainingOpenCents: obligation.remaining_open_cents,
          status: obligation.status as ObligationStatus,
        },
        { type: "payment", amountCents },
      );

      const { error: updObl } = await supabase
        .from("obligations")
        .update({
          remaining_open_cents: next.remainingOpenCents,
          status: next.status,
        })
        .eq("id", obligation.id);

      if (updObl) return fail(updObl.message);
      obligationStatus = next.status;
    }

    const { error: ledErr } = await supabase.from("ledger_events").insert({
      user_id: user.id,
      type: "savings_contribution",
      name: goal.name,
      amount_cents: amountCents,
      occurred_on: occurredOn,
      account_id: goal.linked_account_id,
      obligation_id: obligationId,
      period_id: period.id,
    });

    if (ledErr) return fail(ledErr.message);

    const newCurrent = goal.current_amount_cents + amountCents;
    const { error: goalUpdErr } = await supabase
      .from("savings_goals")
      .update({ current_amount_cents: newCurrent })
      .eq("id", goal.id)
      .eq("user_id", user.id);

    if (goalUpdErr) return fail(goalUpdErr.message);

    revalidateSavings();
    return ok({
      goalCurrentCents: newCurrent,
      obligationStatus,
    });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Bijdrage opslaan mislukt",
    );
  }
}

/** Soft-deactivate goal and cancel open contribution obligations. */
export async function deactivateSavingsGoal(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.id) return fail("Doel niet gevonden");

    const { user, supabase } = await requireUser();

    const { error } = await supabase
      .from("savings_goals")
      .update({ is_active: false })
      .eq("id", input.id)
      .eq("user_id", user.id);

    if (error) return fail(error.message);

    await supabase
      .from("obligations")
      .update({ status: "cancelled", remaining_open_cents: 0 })
      .eq("user_id", user.id)
      .eq("source_type", "savings_goal")
      .eq("source_id", input.id)
      .in("status", [
        "planned",
        "due",
        "partially_paid",
        "returned_open",
      ]);

    revalidateSavings();
    return ok({ id: input.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Spaardoel verwijderen mislukt",
    );
  }
}
