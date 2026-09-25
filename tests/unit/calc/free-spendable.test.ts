import { describe, expect, it } from "vitest";
import {
  computeCarryOver,
  computeFreeSpendable,
} from "@/lib/calc/free-spendable";
import { eurosToCents } from "@/lib/money/cents";
import { applyObligationTransition } from "@/lib/obligations/state-machine";
import { buildKlarnaInstallments } from "@/lib/klarna/installments";
import {
  getPeriodBounds,
  isDateInPeriod,
  nextSalaryDate,
} from "@/lib/periods/salary-period";
import type { ObligationStatus } from "@/lib/types/domain";

describe("salary periods", () => {
  it("builds 24 Sep → 23 Oct", () => {
    const p = getPeriodBounds("2025-09-25", 24);
    expect(p.startsOn).toBe("2025-09-24");
    expect(p.endsOn).toBe("2025-10-23");
  });

  it("starts new period on the 24th", () => {
    const p = getPeriodBounds("2025-10-24", 24);
    expect(p.startsOn).toBe("2025-10-24");
    expect(p.endsOn).toBe("2025-11-23");
  });

  it("includes period end day", () => {
    const p = getPeriodBounds("2025-09-25", 24);
    expect(isDateInPeriod("2025-10-23", p)).toBe(true);
    expect(isDateInPeriod("2025-10-24", p)).toBe(false);
  });

  it("next salary date", () => {
    expect(nextSalaryDate("2025-09-25", 24)).toBe("2025-10-24");
  });
});

describe("Free Spendable — Example A mid-period", () => {
  it("matches worked example", () => {
    const groceriesId = "cat-groceries";
    const fuelId = "cat-fuel";
    const funId = "cat-fun";

    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(2058),
      ledgerSinceConfirm: [
        {
          type: "expense",
          amount_cents: eurosToCents(42),
          budget_category_id: groceriesId,
        },
        {
          type: "expense",
          amount_cents: eurosToCents(4.5),
          budget_category_id: null,
        },
      ],
      periodObligations: [
        {
          kind: "income",
          status: "settled",
          remaining_open_cents: 0,
          amount_cents: eurosToCents(2058),
        },
        {
          kind: "fixed_expense",
          status: "planned",
          remaining_open_cents: eurosToCents(690),
          amount_cents: eurosToCents(690),
        },
        {
          kind: "fixed_expense",
          status: "planned",
          remaining_open_cents: eurosToCents(35),
          amount_cents: eurosToCents(35),
        },
        {
          kind: "savings_contribution",
          status: "planned",
          remaining_open_cents: eurosToCents(100),
          amount_cents: eurosToCents(100),
        },
        {
          kind: "klarna_installment",
          status: "planned",
          remaining_open_cents: eurosToCents(100),
          amount_cents: eurosToCents(100),
        },
      ],
      periodBudgets: [
        { category_id: groceriesId, allocated_cents: eurosToCents(400) },
        { category_id: fuelId, allocated_cents: eurosToCents(250) },
        { category_id: funId, allocated_cents: eurosToCents(100) },
      ],
      periodQuickExpenseCents: eurosToCents(46.5),
    });

    // tracked = 2058 - 42 - 4.50 = 2011.50
    expect(result.trackedCashCents).toBe(eurosToCents(2011.5));
    // remaining budgets = 358 + 250 + 100 = 708
    expect(result.remainingBudgetReserveCents).toBe(eurosToCents(708));
    // open = 690+35+100+100 = 925
    expect(result.openObligationsCents).toBe(eurosToCents(925));
    // expense total = all bills (925) + snelle uitgaven (42+4.50) = 971.50
    expect(result.expenseTotalCents).toBe(eurosToCents(971.5));
    // FS = 2011.50 - 708 - 925 = 378.50
    expect(result.freeSpendableCents).toBe(eurosToCents(378.5));
  });
});

describe("carry-over", () => {
  it("positive carry-over", () => {
    expect(computeCarryOver(eurosToCents(312), eurosToCents(428))).toBe(
      eurosToCents(116),
    );
  });

  it("negative discrepancy", () => {
    expect(computeCarryOver(eurosToCents(312), eurosToCents(250))).toBe(
      eurosToCents(-62),
    );
  });
});

describe("Free Spendable — saldo is current reality", () => {
  it("does not inflate FS with unpaid expected income", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(-98.17),
      ledgerSinceConfirm: [],
      periodObligations: [
        {
          kind: "income",
          status: "returned_open",
          remaining_open_cents: eurosToCents(2058.85),
          amount_cents: eurosToCents(2058.85),
        },
        {
          kind: "fixed_expense",
          status: "planned",
          remaining_open_cents: eurosToCents(318.49),
          amount_cents: eurosToCents(318.49),
        },
      ],
      periodBudgets: [],
    });

    expect(result.trackedCashCents).toBe(eurosToCents(-98.17));
    expect(result.expectedIncomeCents).toBe(0);
    // −98,17 − 318,49 = −416,66 (no phantom salary)
    expect(result.freeSpendableCents).toBe(eurosToCents(-416.66));
  });

  it("can still opt in to count expected income", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(-98.17),
      ledgerSinceConfirm: [],
      periodObligations: [
        {
          kind: "income",
          status: "planned",
          remaining_open_cents: eurosToCents(2058.85),
          amount_cents: eurosToCents(2058.85),
        },
      ],
      periodBudgets: [],
      includeExpectedIncome: true,
    });

    expect(result.expectedIncomeCents).toBe(eurosToCents(2058.85));
    expect(result.freeSpendableCents).toBe(eurosToCents(1960.68));
  });

  it("settling Betaald keeps FS stable — cash out matches released reservation", () => {
    const before = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(1000),
      ledgerSinceConfirm: [],
      periodObligations: [
        {
          kind: "fixed_expense",
          status: "planned",
          remaining_open_cents: eurosToCents(200),
          amount_cents: eurosToCents(200),
        },
      ],
      periodBudgets: [],
    });

    const after = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(1000),
      ledgerSinceConfirm: [
        {
          type: "payment",
          amount_cents: eurosToCents(200),
          budget_category_id: null,
        },
      ],
      periodObligations: [
        {
          kind: "fixed_expense",
          status: "settled",
          remaining_open_cents: 0,
          amount_cents: eurosToCents(200),
        },
      ],
      periodBudgets: [],
    });

    expect(before.freeSpendableCents).toBe(eurosToCents(800));
    expect(after.trackedCashCents).toBe(eurosToCents(800));
    expect(after.openObligationsCents).toBe(0);
    expect(after.freeSpendableCents).toBe(before.freeSpendableCents);
    // Uitgaven chip still shows the full bill after Betaald
    expect(before.expenseTotalCents).toBe(eurosToCents(200));
    expect(after.expenseTotalCents).toBe(eurosToCents(200));
  });

  it("Uitgaven total includes snelle uitgaven for the whole period", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(1000),
      ledgerSinceConfirm: [],
      periodObligations: [
        {
          kind: "fixed_expense",
          status: "settled",
          remaining_open_cents: 0,
          amount_cents: eurosToCents(500),
        },
      ],
      periodBudgets: [],
      periodQuickExpenseCents: eurosToCents(75),
    });

    expect(result.openObligationsCents).toBe(0);
    expect(result.expenseTotalCents).toBe(eurosToCents(575));
  });

  it("ignores unpaid expected income — settled income ledger moves cash", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(-98.17),
      ledgerSinceConfirm: [
        {
          type: "income",
          amount_cents: eurosToCents(2058.85),
          budget_category_id: null,
        },
        {
          type: "payment",
          amount_cents: eurosToCents(350),
          budget_category_id: null,
        },
        {
          type: "refund_return",
          amount_cents: eurosToCents(141.45),
          budget_category_id: null,
        },
        {
          type: "expense",
          amount_cents: eurosToCents(10),
          budget_category_id: null,
        },
      ],
      periodObligations: [
        {
          kind: "fixed_expense",
          status: "returned_open",
          remaining_open_cents: eurosToCents(141.45),
          amount_cents: eurosToCents(141.45),
        },
      ],
      periodBudgets: [],
    });

    // −98.17 + 2058.85 − 350 + 141.45 − 10 = 1742.13
    expect(result.trackedCashCents).toBe(eurosToCents(1742.13));
    // 1742.13 − 141.45 = 1600.68
    expect(result.freeSpendableCents).toBe(eurosToCents(1600.68));
  });
});

describe("budget overspend", () => {
  it("never blocks and reserve floors at 0", () => {
    const cat = "groceries";
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(1000),
      ledgerSinceConfirm: [
        {
          type: "expense",
          amount_cents: eurosToCents(437),
          budget_category_id: cat,
        },
      ],
      periodObligations: [],
      periodBudgets: [{ category_id: cat, allocated_cents: eurosToCents(400) }],
    });
    expect(result.remainingBudgetReserveCents).toBe(0);
    expect(result.variableSpentCents).toBe(eurosToCents(437));
    expect(result.trackedCashCents).toBe(eurosToCents(563));
    expect(result.freeSpendableCents).toBe(eurosToCents(563));
  });
});

describe("returned payment state machine", () => {
  it("payment → refund → payment settles without cancelling obligation", () => {
    let state: {
      amountCents: number;
      remainingOpenCents: number;
      status: ObligationStatus;
    } = {
      amountCents: eurosToCents(690),
      remainingOpenCents: eurosToCents(690),
      status: "planned",
    };

    state = applyObligationTransition(state, {
      type: "payment",
      amountCents: eurosToCents(690),
    });
    expect(state.status).toBe("settled");
    expect(state.remainingOpenCents).toBe(0);

    state = applyObligationTransition(state, {
      type: "refund_return",
      amountCents: eurosToCents(690),
    });
    expect(state.status).toBe("returned_open");
    expect(state.remainingOpenCents).toBe(eurosToCents(690));

    state = applyObligationTransition(state, {
      type: "payment",
      amountCents: eurosToCents(690),
    });
    expect(state.status).toBe("settled");
    expect(state.remainingOpenCents).toBe(0);
  });
});

describe("Klarna", () => {
  it("pay in 30 assigns due +30 days", () => {
    const parts = buildKlarnaInstallments(
      eurosToCents(100),
      "2025-09-23",
      "pay_in_30",
    );
    expect(parts).toHaveLength(1);
    expect(parts[0].dueOn).toBe("2025-10-23");
    expect(isDateInPeriod(parts[0].dueOn, getPeriodBounds("2025-09-25", 24))).toBe(
      true,
    );
  });

  it("pay in 3 creates three installments", () => {
    const parts = buildKlarnaInstallments(
      eurosToCents(300),
      "2025-09-23",
      "pay_in_3",
    );
    expect(parts).toHaveLength(3);
    expect(parts[0].amountCents + parts[1].amountCents + parts[2].amountCents).toBe(
      eurosToCents(300),
    );
    expect(parts[0].isImmediate).toBe(true);
    expect(parts[0].dueOn).toBe("2025-09-23");
    expect(parts[1].dueOn).toBe("2025-10-23");
    expect(parts[2].dueOn).toBe("2025-11-23");
  });
});

describe("annual expense period assignment", () => {
  it("Dec 1 falls in Nov 24 → Dec 23 period", () => {
    const p = getPeriodBounds("2025-12-01", 24);
    expect(p.startsOn).toBe("2025-11-24");
    expect(p.endsOn).toBe("2025-12-23");
    expect(isDateInPeriod("2025-12-01", p)).toBe(true);
  });
});

describe("savings reduce free spendable", () => {
  it("open savings contribution reserves cash", () => {
    const result = computeFreeSpendable({
      lastConfirmedActualCents: eurosToCents(500),
      ledgerSinceConfirm: [],
      periodObligations: [
        {
          kind: "savings_contribution",
          status: "planned",
          remaining_open_cents: eurosToCents(100),
          amount_cents: eurosToCents(100),
        },
      ],
      periodBudgets: [],
    });
    expect(result.freeSpendableCents).toBe(eurosToCents(400));
    expect(result.savingsOpenCents).toBe(eurosToCents(100));
  });
});
