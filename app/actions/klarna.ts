"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { buildKlarnaInstallments } from "@/lib/klarna/installments";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { ensurePeriodContainingDate } from "@/lib/periods/ensure-period-for-date";
import { klarnaPurchaseSchema } from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";

function revalidateKlarna() {
  revalidatePath("/app");
  revalidatePath("/app/klarna");
  revalidatePath("/app/timeline");
}

export async function createKlarnaPurchase(input: {
  name: string;
  amountEuros: string;
  purchasedOn: string;
  plan: "pay_in_30" | "pay_in_3";
}): Promise<ActionResult<{ id: string; installmentCount: number }>> {
  try {
    const parsed = klarnaPurchaseSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Ongeldige Klarna-aankoop",
      );
    }

    let totalCents: number;
    try {
      totalCents = requireCents(parsed.data.amountEuros, "Bedrag");
    } catch {
      return fail("Voer een geldig bedrag in");
    }

    if (totalCents <= 0) {
      return fail("Bedrag moet groter zijn dan nul");
    }

    const { user, supabase } = await requireUser();
    const { period, profile } = await ensureOpenPeriod(supabase, user.id);
    const salaryDay = profile.salary_day;

    const { data: purchase, error: purchaseErr } = await supabase
      .from("klarna_purchases")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        total_cents: totalCents,
        purchased_on: parsed.data.purchasedOn,
        plan: parsed.data.plan,
        status: "open",
      })
      .select("id")
      .single();

    if (purchaseErr || !purchase) {
      return fail(purchaseErr?.message ?? "Klarna-aankoop opslaan mislukt");
    }

    const schedule = buildKlarnaInstallments(
      totalCents,
      parsed.data.purchasedOn,
      parsed.data.plan,
    );

    let createdInstallments = 0;

    for (const part of schedule) {
      const matchingPeriod = await ensurePeriodContainingDate(
        supabase,
        user.id,
        part.dueOn,
        salaryDay,
      );

      const { data: obl, error: oblErr } = await supabase
        .from("obligations")
        .insert({
          user_id: user.id,
          period_id: matchingPeriod.id,
          kind: "klarna_installment",
          name: `${parsed.data.name} (${part.sequence}/${schedule.length})`,
          amount_cents: part.amountCents,
          remaining_open_cents: part.amountCents,
          status: "planned",
          due_on: part.dueOn,
          source_type: "klarna_installment",
          source_id: null,
        })
        .select("id")
        .single();

      if (oblErr || !obl) {
        return fail(oblErr?.message ?? "Termijn aanmaken mislukt");
      }

      const { data: installment, error: instErr } = await supabase
        .from("klarna_installments")
        .insert({
          user_id: user.id,
          purchase_id: purchase.id,
          sequence: part.sequence,
          due_on: part.dueOn,
          amount_cents: part.amountCents,
          obligation_id: obl.id,
          status: "planned",
        })
        .select("id")
        .single();

      if (instErr || !installment) {
        return fail(instErr?.message ?? "Termijn opslaan mislukt");
      }

      await supabase
        .from("obligations")
        .update({
          source_type: "klarna_installment",
          source_id: installment.id,
        })
        .eq("id", obl.id);

      createdInstallments += 1;
    }

    // Touch open period so FS refreshes (period row already exists).
    void period;

    revalidateKlarna();
    return ok({ id: purchase.id, installmentCount: createdInstallments });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Klarna-aankoop opslaan mislukt",
    );
  }
}

/** Cancel open purchase: cancel unpaid installments + open obligations. */
export async function cancelKlarnaPurchase(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.id) return fail("Aankoop niet gevonden");

    const { user, supabase } = await requireUser();

    const { data: purchase, error: findErr } = await supabase
      .from("klarna_purchases")
      .select("id, status")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .single();

    if (findErr || !purchase) {
      return fail(findErr?.message ?? "Aankoop niet gevonden");
    }

    if (purchase.status === "cancelled") {
      return ok({ id: purchase.id });
    }

    const { data: installments } = await supabase
      .from("klarna_installments")
      .select("id, obligation_id, status")
      .eq("purchase_id", purchase.id)
      .eq("user_id", user.id);

    const openInstallments = (installments ?? []).filter((i) =>
      ["planned", "due", "partially_paid", "returned_open"].includes(i.status),
    );

    for (const inst of openInstallments) {
      await supabase
        .from("klarna_installments")
        .update({ status: "cancelled" })
        .eq("id", inst.id)
        .eq("user_id", user.id);

      if (inst.obligation_id) {
        await supabase
          .from("obligations")
          .update({ status: "cancelled", remaining_open_cents: 0 })
          .eq("id", inst.obligation_id)
          .eq("user_id", user.id)
          .in("status", [
            "planned",
            "due",
            "partially_paid",
            "returned_open",
          ]);
      }
    }

    await supabase
      .from("klarna_purchases")
      .update({ status: "cancelled" })
      .eq("id", purchase.id)
      .eq("user_id", user.id);

    revalidateKlarna();
    return ok({ id: purchase.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Klarna-aankoop annuleren mislukt",
    );
  }
}

/** Mark purchase paid when every installment is settled (called after settle). */
export async function syncKlarnaPurchaseStatus(
  purchaseId: string,
): Promise<void> {
  const { user, supabase } = await requireUser();
  const { data: installments } = await supabase
    .from("klarna_installments")
    .select("status")
    .eq("purchase_id", purchaseId)
    .eq("user_id", user.id);

  if (!installments?.length) return;

  const allSettled = installments.every((i) => i.status === "settled");
  const anyOpen = installments.some((i) =>
    ["planned", "due", "partially_paid", "returned_open"].includes(i.status),
  );

  if (allSettled) {
    await supabase
      .from("klarna_purchases")
      .update({ status: "paid" })
      .eq("id", purchaseId)
      .eq("user_id", user.id);
  } else if (anyOpen) {
    await supabase
      .from("klarna_purchases")
      .update({ status: "open" })
      .eq("id", purchaseId)
      .eq("user_id", user.id)
      .neq("status", "cancelled");
  }
}
