import type { Cents } from "@/lib/money/cents";
import { addDaysISO, type ISODate } from "@/lib/periods/salary-period";

/**
 * Expected available at the start of a new salary period.
 * Prefer the previous period's last confirmed actual; fall back to
 * current spendable account balances.
 */
export function computeExpectedAtPeriodOpen(input: {
  previousActualAvailableCents: Cents | null | undefined;
  spendableAccountBalancesCents: Cents;
}): Cents {
  if (
    input.previousActualAvailableCents != null &&
    Number.isFinite(input.previousActualAvailableCents)
  ) {
    return input.previousActualAvailableCents;
  }
  return input.spendableAccountBalancesCents;
}

/** Calendar day after an ISO date (UTC date arithmetic). */
export function dayAfter(iso: ISODate): ISODate {
  return addDaysISO(iso, 1);
}

/** New / rolled-over periods need a manual bank balance confirm. */
export function needsBalanceConfirmation(period: {
  balance_confirmed_at: string | null;
  actual_available_cents: number | null;
}): boolean {
  return (
    period.balance_confirmed_at == null || period.actual_available_cents == null
  );
}
