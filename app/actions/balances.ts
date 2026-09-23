"use server";

import { revalidatePath } from "next/cache";
import { isSpendableAccountType } from "@/lib/accounts/spendable";
import { requireUser } from "@/lib/auth/require-user";
import { computeCarryOver } from "@/lib/calc/free-spendable";
import { confirmBalanceSchema } from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";

export async function confirmPeriodBalances(input: {
  periodId: string;
  balances: Array<{ accountId: string; actualEuros: string }>;
}): Promise<ActionResult<{ actualAvailableCents: number; carryOverCents: number }>> {
  try {
    const parsed = confirmBalanceSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid balances");
    }

    const { user, supabase } = await requireUser();
    const periodId = parsed.data.periodId;
    const now = new Date().toISOString();

    const { data: period, error: periodErr } = await supabase
      .from("salary_periods")
      .select("*")
      .eq("id", periodId)
      .eq("user_id", user.id)
      .single();

    if (periodErr || !period) {
      return fail(periodErr?.message ?? "Period not found");
    }

    const { data: accounts, error: accountsErr } = await supabase
      .from("accounts")
      .select("id, type, last_confirmed_balance_cents")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (accountsErr) return fail(accountsErr.message);

    const accountMap = new Map((accounts ?? []).map((a) => [a.id, a]));
    let actualAvailable = 0;
    let expectedAvailable = 0;

    for (const entry of parsed.data.balances) {
      const account = accountMap.get(entry.accountId);
      if (!account) return fail(`Unknown account ${entry.accountId}`);

      const actualCents = requireCents(entry.actualEuros, "Balance");
      const expectedCents = account.last_confirmed_balance_cents;
      const carry = computeCarryOver(expectedCents, actualCents);

      const { data: existing } = await supabase
        .from("period_account_balances")
        .select("id")
        .eq("period_id", periodId)
        .eq("account_id", entry.accountId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("period_account_balances")
          .update({
            expected_cents: expectedCents,
            actual_cents: actualCents,
            carry_over_cents: carry,
          })
          .eq("id", existing.id);
        if (error) return fail(error.message);
      } else {
        const { error } = await supabase.from("period_account_balances").insert({
          period_id: periodId,
          account_id: entry.accountId,
          user_id: user.id,
          expected_cents: expectedCents,
          actual_cents: actualCents,
          carry_over_cents: carry,
        });
        if (error) return fail(error.message);
      }

      const { error: acctErr } = await supabase
        .from("accounts")
        .update({
          last_confirmed_balance_cents: actualCents,
          last_confirmed_at: now,
        })
        .eq("id", entry.accountId)
        .eq("user_id", user.id);

      if (acctErr) return fail(acctErr.message);

      if (isSpendableAccountType(account.type)) {
        actualAvailable += actualCents;
        expectedAvailable += expectedCents;
      }
    }

    const periodCarry = computeCarryOver(expectedAvailable, actualAvailable);

    const { error: updErr } = await supabase
      .from("salary_periods")
      .update({
        expected_available_cents: expectedAvailable,
        actual_available_cents: actualAvailable,
        carry_over_cents: periodCarry,
        balance_confirmed_at: now,
      })
      .eq("id", periodId)
      .eq("user_id", user.id);

    if (updErr) return fail(updErr.message);

    revalidatePath("/app");
    revalidatePath("/app/accounts");
    revalidatePath("/app/balances/confirm");
    return ok({
      actualAvailableCents: actualAvailable,
      carryOverCents: periodCarry,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to confirm balances");
  }
}
