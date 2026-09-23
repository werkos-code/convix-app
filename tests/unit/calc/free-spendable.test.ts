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
    });

    // tracked = 2058 - 42 - 4.50 = 2011.50
    expect(result.trackedCashCents).toBe(eurosToCents(2011.5));
    // remaining budgets = 358 + 250 + 100 = 708
    expect(result.remainingBudgetReserveCents).toBe(eurosToCents(708));
    // open = 690+35+100+100 = 925
    expect(result.openObligationsCents).toBe(eurosToCents(925));
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
