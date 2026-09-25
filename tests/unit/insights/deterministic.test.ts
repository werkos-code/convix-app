import { describe, expect, it } from "vitest";

import { buildDeterministicInsights } from "@/lib/insights/deterministic";
import { eurosToCents } from "@/lib/money/cents";

const emptyBreakdown = {
  freeSpendableCents: eurosToCents(200),
  trackedCashCents: eurosToCents(500),
  expectedIncomeCents: 0,
  openObligationsCents: eurosToCents(100),
  remainingBudgetReserveCents: eurosToCents(200),
  incomeTotalCents: eurosToCents(3000),
  expenseTotalCents: eurosToCents(300),
  savingsPeriodCents: eurosToCents(100),
  fixedOpenCents: eurosToCents(50),
  savingsOpenCents: 0,
  klarnaOpenCents: eurosToCents(50),
  debtOpenCents: 0,
  variableAllocatedCents: eurosToCents(400),
  variableSpentCents: eurosToCents(200),
};

describe("buildDeterministicInsights", () => {
  it("flags budget overspend in Dutch", () => {
    const insights = buildDeterministicInsights({
      breakdown: emptyBreakdown,
      budgets: [
        {
          categoryId: "g1",
          name: "Boodschappen",
          allocatedCents: eurosToCents(100),
          spentCents: eurosToCents(140),
        },
      ],
      upcomingObligations: [],
      today: "2026-09-23",
    });
    expect(insights.some((i) => i.kind === "budget_exceeded")).toBe(true);
    expect(insights[0].message).toContain("€");
  });

  it("flags negative free spendable as critical", () => {
    const insights = buildDeterministicInsights({
      breakdown: { ...emptyBreakdown, freeSpendableCents: -1_000 },
      budgets: [],
      upcomingObligations: [],
    });
    const hit = insights.find((i) => i.kind === "negative_free_spendable");
    expect(hit?.severity).toBe("critical");
  });

  it("flags Klarna due within window with NL date", () => {
    const insights = buildDeterministicInsights({
      breakdown: emptyBreakdown,
      budgets: [],
      upcomingObligations: [
        {
          id: "k1",
          name: "Sneakers (1/1)",
          kind: "klarna_installment",
          amountCents: eurosToCents(100),
          remainingOpenCents: eurosToCents(100),
          dueOn: "2026-09-25",
        },
      ],
      today: "2026-09-23",
    });
    const hit = insights.find((i) => i.kind === "klarna_upcoming");
    expect(hit).toBeTruthy();
    expect(hit?.message).toContain("25-09-2026");
  });
});
