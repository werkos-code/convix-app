import { describe, expect, it } from "vitest";
import {
  computeExpectedAtPeriodOpen,
  dayAfter,
  needsBalanceConfirmation,
} from "@/lib/periods/transition";
import { eurosToCents } from "@/lib/money/cents";
import {
  getPeriodBounds,
  isDateInPeriod,
  nextSalaryDate,
} from "@/lib/periods/salary-period";
import { dueDatesInPeriod } from "@/lib/obligations/materialize";
import { computeFreeSpendable } from "@/lib/calc/free-spendable";

describe("period transition", () => {
  it("prefers previous actual as expected", () => {
    expect(
      computeExpectedAtPeriodOpen({
        previousActualAvailableCents: eurosToCents(428),
        spendableAccountBalancesCents: eurosToCents(312),
      }),
    ).toBe(eurosToCents(428));
  });

  it("falls back to spendable balances", () => {
    expect(
      computeExpectedAtPeriodOpen({
        previousActualAvailableCents: null,
        spendableAccountBalancesCents: eurosToCents(312),
      }),
    ).toBe(eurosToCents(312));
  });

  it("dayAfter period end is next salary day", () => {
    const p = getPeriodBounds("2025-09-25", 24);
    expect(dayAfter(p.endsOn)).toBe("2025-10-24");
    expect(nextSalaryDate("2025-09-25", 24)).toBe(dayAfter(p.endsOn));
  });

  it("needs balance confirmation when unconfirmed", () => {
    expect(
      needsBalanceConfirmation({
        balance_confirmed_at: null,
        actual_available_cents: null,
      }),
    ).toBe(true);
    expect(
      needsBalanceConfirmation({
        balance_confirmed_at: "2025-09-24T10:00:00Z",
        actual_available_cents: 10000,
      }),
    ).toBe(false);
  });
});

describe("due dates in period", () => {
  const period = getPeriodBounds("2025-09-25", 24); // 24 Sep → 23 Oct

  it("monthly rent on the 1st appears once", () => {
    const dates = dueDatesInPeriod("monthly", 1, null, period);
    expect(dates).toEqual(["2025-10-01"]);
  });

  it("salary on the 24th is in the period", () => {
    const dates = dueDatesInPeriod("monthly", 24, null, period);
    expect(dates).toEqual(["2025-09-24"]);
  });

  it("annual Dec 1 is NOT in Sep–Oct period", () => {
    const dates = dueDatesInPeriod("yearly", 1, 12, period);
    expect(dates).toEqual([]);
  });

  it("annual Dec 1 IS in Nov–Dec period (full amount period)", () => {
    const decPeriod = getPeriodBounds("2025-12-01", 24);
    expect(decPeriod.startsOn).toBe("2025-11-24");
    expect(isDateInPeriod("2025-12-01", decPeriod)).toBe(true);
    const dates = dueDatesInPeriod("yearly", 1, 12, decPeriod);
    expect(dates).toEqual(["2025-12-01"]);
  });
});

describe("Free Spendable — debt + refund cash effect", () => {
  it("open debt payment reduces free spendable", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(500),
      ledgerSinceConfirm: [],
      periodObligations: [
        {
          kind: "debt_payment",
          status: "planned",
          remaining_open_cents: eurosToCents(42),
          amount_cents: eurosToCents(42),
        },
      ],
      periodBudgets: [],
    });
    expect(result.debtOpenCents).toBe(eurosToCents(42));
    expect(result.freeSpendableCents).toBe(eurosToCents(458));
  });

  it("refund increases tracked cash", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(100),
      ledgerSinceConfirm: [
        { type: "payment", amount_cents: eurosToCents(690), budget_category_id: null },
        {
          type: "refund_return",
          amount_cents: eurosToCents(690),
          budget_category_id: null,
        },
      ],
      periodObligations: [
        {
          kind: "fixed_expense",
          status: "returned_open",
          remaining_open_cents: eurosToCents(690),
          amount_cents: eurosToCents(690),
        },
      ],
      periodBudgets: [],
    });
    expect(result.trackedCashCents).toBe(eurosToCents(100));
    expect(result.freeSpendableCents).toBe(eurosToCents(100) - eurosToCents(690));
  });

  it("uncategorized expense does not reduce budget reserve", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(1000),
      ledgerSinceConfirm: [
        {
          type: "expense",
          amount_cents: eurosToCents(50),
          budget_category_id: null,
        },
      ],
      periodObligations: [],
      periodBudgets: [
        { category_id: "g", allocated_cents: eurosToCents(400) },
      ],
    });
    expect(result.remainingBudgetReserveCents).toBe(eurosToCents(400));
    expect(result.trackedCashCents).toBe(eurosToCents(950));
    expect(result.freeSpendableCents).toBe(eurosToCents(550));
  });
});
