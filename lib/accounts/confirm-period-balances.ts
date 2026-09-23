import type { AuthedClient } from "@/lib/auth/require-user";
import { isSpendableAccountType } from "@/lib/accounts/spendable";
import { computeCarryOver } from "@/lib/calc/free-spendable";

/**
 * Snapshot each active account into period_account_balances and stamp the
 * salary period as balance-confirmed using the given actuals (or last confirmed).
 * Used at end of onboarding and reusable for first-period setup.
 */
export async function confirmPeriodFromAccountBalances(
  supabase: AuthedClient,
  userId: string,
  periodId: string,
  options?: {
    /** When true, expected = actual (no carry-over), typical for first setup */
    zeroCarryOver?: boolean;
  },
): Promise<{ actualAvailableCents: number; carryOverCents: number }> {
  const zeroCarryOver = options?.zeroCarryOver ?? false;
  const now = new Date().toISOString();

  const { data: accounts, error: accountsErr } = await supabase
    .from("accounts")
    .select("id, type, last_confirmed_balance_cents")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (accountsErr) throw accountsErr;

  let actualAvailable = 0;
  let expectedAvailable = 0;

  for (const account of accounts ?? []) {
    const actualCents = account.last_confirmed_balance_cents;
    const expectedCents = zeroCarryOver
      ? actualCents
      : account.last_confirmed_balance_cents;
    const carry = computeCarryOver(expectedCents, actualCents);

    const { data: existing } = await supabase
      .from("period_account_balances")
      .select("id")
      .eq("period_id", periodId)
      .eq("account_id", account.id)
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
      if (error) throw error;
    } else {
      const { error } = await supabase.from("period_account_balances").insert({
        period_id: periodId,
        account_id: account.id,
        user_id: userId,
        expected_cents: expectedCents,
        actual_cents: actualCents,
        carry_over_cents: carry,
      });
      if (error) throw error;
    }

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
    .eq("user_id", userId);

  if (updErr) throw updErr;

  return {
    actualAvailableCents: actualAvailable,
    carryOverCents: periodCarry,
  };
}
