"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { applyObligationTransition } from "@/lib/obligations/state-machine";
import { rematerializeUserPeriods } from "@/lib/obligations/materialize";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { todayInTimezone } from "@/lib/periods/salary-period";
import type { ObligationStatus } from "@/lib/types/domain";
import { debtSchema } from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";

function revalidateDebts() {
  revalidatePath("/app");
  revalidatePath("/app/uitgaand");
  revalidatePath("/app/debts");
  revalidatePath("/app/timeline");
}

export async function createDebt(input: {
  name: string;
  outstandingEuros: string;
  paymentEuros: string;
  paymentDay: number;
}): Promise<ActionResult<{ debtId: string; ruleId: string }>> {
  try {
    const parsed = debtSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Ongeldige schuld");
    }

    let outstandingCents: number;
    let paymentCents: number;
    try {
      outstandingCents = requireCents(
        parsed.data.outstandingEuros,
        "Openstaand bedrag",
      );
      paymentCents = requireCents(
        parsed.data.paymentEuros,
        "Betaling",
      );
    } catch {
      return fail("Voer geldige bedragen in");
    }

    if (outstandingCents <= 0) {
      return fail("Openstaand bedrag moet groter zijn dan nul");
    }
    if (paymentCents <= 0) {
      return fail("Betaling moet groter zijn dan nul");
    }

    const { user, supabase } = await requireUser();

    const { data: debt, error: debtErr } = await supabase
      .from("debts")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        outstanding_cents: outstandingCents,
      })
      .select("id")
      .single();

    if (debtErr || !debt) {
      return fail(debtErr?.message ?? "Schuld opslaan mislukt");
    }

    const { data: rule, error: ruleErr } = await supabase
      .from("debt_payment_rules")
      .insert({
        user_id: user.id,
        debt_id: debt.id,
        amount_cents: paymentCents,
        day_of_month: parsed.data.paymentDay,
      })
      .select("id")
      .single();

    if (ruleErr || !rule) {
      return fail(ruleErr?.message ?? "Betalingsregel opslaan mislukt");
    }

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

    revalidateDebts();
    return ok({ debtId: debt.id, ruleId: rule.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Schuld opslaan mislukt",
    );
  }
}

export async function payDebt(input: {
  debtId: string;
  amountEuros: string;
  obligationId?: string | null;
  occurredOn?: string;
}): Promise<
  ActionResult<{
    outstandingCents: number;
    obligationStatus?: ObligationStatus;
  }>
> {
  try {
    if (!input.debtId) return fail("Kies een schuld");

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

    const { data: debt, error: debtErr } = await supabase
      .from("debts")
      .select("*")
      .eq("id", input.debtId)
      .eq("user_id", user.id)
      .single();

    if (debtErr || !debt) {
      return fail(debtErr?.message ?? "Schuld niet gevonden");
    }

    let obligationStatus: ObligationStatus | undefined;
    let obligationId = input.obligationId ?? null;

    if (!obligationId) {
      const { data: rules } = await supabase
        .from("debt_payment_rules")
        .select("id")
        .eq("debt_id", debt.id)
        .eq("user_id", user.id)
        .eq("is_active", true);

      const ruleIds = (rules ?? []).map((r) => r.id);
      if (ruleIds.length > 0) {
        const { data: linked } = await supabase
          .from("obligations")
          .select("id")
          .eq("user_id", user.id)
          .eq("period_id", period.id)
          .eq("source_type", "debt_payment_rule")
          .in("source_id", ruleIds)
          .in("status", [
            "planned",
            "due",
            "partially_paid",
            "returned_open",
          ])
          .maybeSingle();
        obligationId = linked?.id ?? null;
      }
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
      type: "debt_payment",
      name: debt.name,
      amount_cents: amountCents,
      occurred_on: occurredOn,
      obligation_id: obligationId,
      period_id: period.id,
    });

    if (ledErr) return fail(ledErr.message);

    const newOutstanding = Math.max(0, debt.outstanding_cents - amountCents);
    const { error: debtUpdErr } = await supabase
      .from("debts")
      .update({ outstanding_cents: newOutstanding })
      .eq("id", debt.id)
      .eq("user_id", user.id);

    if (debtUpdErr) return fail(debtUpdErr.message);

    revalidateDebts();
    return ok({
      outstandingCents: newOutstanding,
      obligationStatus,
    });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Aflossing opslaan mislukt",
    );
  }
}

export async function deactivateDebt(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.id) return fail("Schuld niet gevonden");

    const { user, supabase } = await requireUser();

    const { error } = await supabase
      .from("debts")
      .update({ is_active: false })
      .eq("id", input.id)
      .eq("user_id", user.id);

    if (error) return fail(error.message);

    const { data: rules } = await supabase
      .from("debt_payment_rules")
      .select("id")
      .eq("debt_id", input.id)
      .eq("user_id", user.id);

    await supabase
      .from("debt_payment_rules")
      .update({ is_active: false })
      .eq("debt_id", input.id)
      .eq("user_id", user.id);

    const ruleIds = (rules ?? []).map((r) => r.id);
    if (ruleIds.length > 0) {
      await supabase
        .from("obligations")
        .update({ status: "cancelled", remaining_open_cents: 0 })
        .eq("user_id", user.id)
        .eq("source_type", "debt_payment_rule")
        .in("source_id", ruleIds)
        .in("status", [
          "planned",
          "due",
          "partially_paid",
          "returned_open",
        ]);
    }

    revalidateDebts();
    return ok({ id: input.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Schuld verwijderen mislukt",
    );
  }
}
