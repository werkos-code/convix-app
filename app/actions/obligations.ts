"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { applyObligationTransition } from "@/lib/obligations/state-machine";
import { todayInTimezone } from "@/lib/periods/salary-period";
import type { LedgerEventType, ObligationKind, ObligationStatus } from "@/lib/types/domain";
import {
  refundSchema,
  settleObligationSchema,
} from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";
import { syncKlarnaPurchaseStatus } from "./klarna";

function ledgerTypeForKind(kind: ObligationKind): LedgerEventType {
  switch (kind) {
    case "income":
      return "income";
    case "savings_contribution":
      return "savings_contribution";
    case "debt_payment":
      return "debt_payment";
    case "fixed_expense":
    case "klarna_installment":
    case "one_time":
    default:
      return "payment";
  }
}

export async function settleObligation(input: {
  obligationId: string;
  amountEuros?: string;
  occurredOn?: string;
}): Promise<ActionResult<{ status: ObligationStatus; remainingOpenCents: number }>> {
  try {
    const parsed = settleObligationSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Ongeldige afboeking",
      );
    }

    const { user, supabase } = await requireUser();

    const { data: obligation, error: oblErr } = await supabase
      .from("obligations")
      .select("*")
      .eq("id", parsed.data.obligationId)
      .eq("user_id", user.id)
      .single();

    if (oblErr || !obligation) {
      return fail(oblErr?.message ?? "Verplichting niet gevonden");
    }

    let amountCents: number;
    try {
      amountCents =
        parsed.data.amountEuros != null && parsed.data.amountEuros !== ""
          ? requireCents(parsed.data.amountEuros, "Bedrag")
          : obligation.remaining_open_cents;
    } catch {
      return fail("Voer een geldig bedrag in");
    }

    if (amountCents <= 0) {
      return fail("Bedrag moet groter zijn dan nul");
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle();

    const occurredOn =
      parsed.data.occurredOn ??
      todayInTimezone(profile?.timezone ?? "Europe/Amsterdam");

    const next = applyObligationTransition(
      {
        amountCents: obligation.amount_cents,
        remainingOpenCents: obligation.remaining_open_cents,
        status: obligation.status as ObligationStatus,
      },
      { type: "payment", amountCents },
    );

    const { error: ledErr } = await supabase.from("ledger_events").insert({
      user_id: user.id,
      type: ledgerTypeForKind(obligation.kind as ObligationKind),
      name: obligation.name,
      amount_cents: amountCents,
      occurred_on: occurredOn,
      account_id: obligation.account_id,
      obligation_id: obligation.id,
      budget_category_id: obligation.budget_category_id,
      period_id: obligation.period_id,
    });

    if (ledErr) return fail(ledErr.message);

    const { error: updErr } = await supabase
      .from("obligations")
      .update({
        remaining_open_cents: next.remainingOpenCents,
        status: next.status,
      })
      .eq("id", obligation.id)
      .eq("user_id", user.id);

    if (updErr) return fail(updErr.message);

    if (
      obligation.kind === "debt_payment" &&
      obligation.source_type === "debt_payment_rule"
    ) {
      const { data: rule } = await supabase
        .from("debt_payment_rules")
        .select("debt_id")
        .eq("id", obligation.source_id!)
        .maybeSingle();

      if (rule) {
        const { data: debt } = await supabase
          .from("debts")
          .select("outstanding_cents")
          .eq("id", rule.debt_id)
          .single();

        if (debt) {
          await supabase
            .from("debts")
            .update({
              outstanding_cents: Math.max(
                0,
                debt.outstanding_cents - amountCents,
              ),
            })
            .eq("id", rule.debt_id);
        }
      }
    }

    if (
      obligation.kind === "savings_contribution" &&
      obligation.source_type === "savings_goal" &&
      obligation.source_id
    ) {
      const { data: goal } = await supabase
        .from("savings_goals")
        .select("current_amount_cents")
        .eq("id", obligation.source_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (goal) {
        await supabase
          .from("savings_goals")
          .update({
            current_amount_cents: goal.current_amount_cents + amountCents,
          })
          .eq("id", obligation.source_id)
          .eq("user_id", user.id);
      }
    }

    if (
      obligation.kind === "klarna_installment" &&
      obligation.source_type === "klarna_installment" &&
      obligation.source_id
    ) {
      await supabase
        .from("klarna_installments")
        .update({ status: next.status })
        .eq("id", obligation.source_id)
        .eq("user_id", user.id);

      const { data: inst } = await supabase
        .from("klarna_installments")
        .select("purchase_id")
        .eq("id", obligation.source_id)
        .maybeSingle();

      if (inst?.purchase_id) {
        await syncKlarnaPurchaseStatus(inst.purchase_id);
      }
    }

    revalidatePath("/app");
    revalidatePath("/app/timeline");
    revalidatePath("/app/klarna");
    revalidatePath("/app/savings");
    revalidatePath("/app/debts");
    return ok({
      status: next.status,
      remainingOpenCents: next.remainingOpenCents,
    });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Afboeking mislukt",
    );
  }
}

export async function registerRefund(input: {
  obligationId: string;
  amountEuros: string;
  name?: string;
  occurredOn?: string;
}): Promise<ActionResult<{ status: ObligationStatus; remainingOpenCents: number }>> {
  try {
    const parsed = refundSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Ongeldige terugboeking",
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

    const { data: obligation, error: oblErr } = await supabase
      .from("obligations")
      .select("*")
      .eq("id", parsed.data.obligationId)
      .eq("user_id", user.id)
      .single();

    if (oblErr || !obligation) {
      return fail(oblErr?.message ?? "Verplichting niet gevonden");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle();

    const occurredOn =
      parsed.data.occurredOn ??
      todayInTimezone(profile?.timezone ?? "Europe/Amsterdam");

    const next = applyObligationTransition(
      {
        amountCents: obligation.amount_cents,
        remainingOpenCents: obligation.remaining_open_cents,
        status: obligation.status as ObligationStatus,
      },
      { type: "refund_return", amountCents },
    );

    const { error: ledErr } = await supabase.from("ledger_events").insert({
      user_id: user.id,
      type: "refund_return",
      name: parsed.data.name ?? `Terugboeking: ${obligation.name}`,
      amount_cents: amountCents,
      occurred_on: occurredOn,
      account_id: obligation.account_id,
      obligation_id: obligation.id,
      budget_category_id: obligation.budget_category_id,
      period_id: obligation.period_id,
    });

    if (ledErr) return fail(ledErr.message);

    const { error: updErr } = await supabase
      .from("obligations")
      .update({
        remaining_open_cents: next.remainingOpenCents,
        status: next.status,
      })
      .eq("id", obligation.id)
      .eq("user_id", user.id);

    if (updErr) return fail(updErr.message);

    if (
      obligation.kind === "savings_contribution" &&
      obligation.source_type === "savings_goal" &&
      obligation.source_id
    ) {
      const { data: goal } = await supabase
        .from("savings_goals")
        .select("current_amount_cents")
        .eq("id", obligation.source_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (goal) {
        await supabase
          .from("savings_goals")
          .update({
            current_amount_cents: Math.max(
              0,
              goal.current_amount_cents - amountCents,
            ),
          })
          .eq("id", obligation.source_id)
          .eq("user_id", user.id);
      }
    }

    if (
      obligation.kind === "debt_payment" &&
      obligation.source_type === "debt_payment_rule" &&
      obligation.source_id
    ) {
      const { data: rule } = await supabase
        .from("debt_payment_rules")
        .select("debt_id")
        .eq("id", obligation.source_id)
        .maybeSingle();

      if (rule) {
        const { data: debt } = await supabase
          .from("debts")
          .select("outstanding_cents")
          .eq("id", rule.debt_id)
          .maybeSingle();

        if (debt) {
          await supabase
            .from("debts")
            .update({
              outstanding_cents: debt.outstanding_cents + amountCents,
            })
            .eq("id", rule.debt_id);
        }
      }
    }

    if (
      obligation.kind === "klarna_installment" &&
      obligation.source_type === "klarna_installment" &&
      obligation.source_id
    ) {
      await supabase
        .from("klarna_installments")
        .update({ status: next.status })
        .eq("id", obligation.source_id)
        .eq("user_id", user.id);

      const { data: inst } = await supabase
        .from("klarna_installments")
        .select("purchase_id")
        .eq("id", obligation.source_id)
        .maybeSingle();

      if (inst?.purchase_id) {
        await syncKlarnaPurchaseStatus(inst.purchase_id);
      }
    }

    revalidatePath("/app");
    revalidatePath("/app/timeline");
    revalidatePath("/app/klarna");
    revalidatePath("/app/savings");
    revalidatePath("/app/debts");
    return ok({
      status: next.status,
      remainingOpenCents: next.remainingOpenCents,
    });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Terugboeking mislukt",
    );
  }
}
