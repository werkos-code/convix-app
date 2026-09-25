import type { Cents } from "@/lib/money/cents";
import type {
  FreeSpendableBreakdown,
  LedgerEvent,
  Obligation,
  ObligationKind,
  ObligationStatus,
  PeriodBudget,
} from "@/lib/types/domain";

const OPEN_STATUSES: ObligationStatus[] = [
  "planned",
  "due",
  "partially_paid",
  "returned_open",
];

/** Settlements and snelle uitgaven that leave the bank. */
const CASH_OUT_TYPES = new Set([
  "expense",
  "payment",
  "savings_contribution",
  "debt_payment",
]);

/** Settled income / returned bank money that enters the bank. */
const CASH_IN_TYPES = new Set(["income", "refund_return"]);

/** Explicit signed adjustments. */
const CASH_ADJUST_TYPES = new Set(["balance_adjustment"]);

export interface CalcInput {
  /** Confirmed actual available on spendable accounts at last confirm */
  lastConfirmedActualCents: Cents;
  /**
   * Ledger since last balance confirmation.
   * Settlements move tracked cash so Free Spendable stays stable when an
   * obligation leaves “open” (cash down, reservation released).
   * Unpaid expected income is never added here — only settled `income` events.
   */
  ledgerSinceConfirm: Pick<LedgerEvent, "type" | "amount_cents" | "budget_category_id">[];
  /** Obligations belonging to the open period */
  periodObligations: Pick<
    Obligation,
    "kind" | "status" | "remaining_open_cents" | "amount_cents"
  >[];
  /** Budget allocations for the period */
  periodBudgets: Pick<PeriodBudget, "category_id" | "allocated_cents">[];
  /**
   * When true, open income obligations inflate Free Spendable.
   * Default false: bank saldo (+ settled income ledger) is current reality.
   */
  includeExpectedIncome?: boolean;
}

function isOpen(status: ObligationStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

function sumOpenByKinds(
  obligations: CalcInput["periodObligations"],
  kinds: ObligationKind[],
): Cents {
  return obligations
    .filter((o) => kinds.includes(o.kind) && isOpen(o.status))
    .reduce((sum, o) => sum + o.remaining_open_cents, 0);
}

/**
 * Tracked cash ≈ last confirmed bank saldo
 *   + income / refunds settled since confirm
 *   − expenses / payments / savings / debt settled since confirm
 *   ± balance_adjustment
 *
 * Marking Betaald therefore lowers cash by the same amount the obligation
 * stops reserving — Free Spendable does not jump.
 */
export function computeTrackedCash(
  lastConfirmedActualCents: Cents,
  ledgerSinceConfirm: CalcInput["ledgerSinceConfirm"],
): Cents {
  let cash = lastConfirmedActualCents;
  for (const e of ledgerSinceConfirm) {
    if (CASH_ADJUST_TYPES.has(e.type)) {
      cash += e.amount_cents;
    } else if (CASH_IN_TYPES.has(e.type)) {
      cash += Math.abs(e.amount_cents);
    } else if (CASH_OUT_TYPES.has(e.type)) {
      cash -= Math.abs(e.amount_cents);
    }
  }
  return cash;
}

/**
 * Remaining variable budget reserve = sum of max(0, allocated − spent_in_category).
 * Overspend does not create negative reserve.
 */
export function computeRemainingBudgetReserve(
  periodBudgets: CalcInput["periodBudgets"],
  ledgerSinceConfirm: CalcInput["ledgerSinceConfirm"],
): { remainingCents: Cents; allocatedCents: Cents; spentCents: Cents } {
  const spentByCategory = new Map<string, Cents>();
  let spentTotal = 0;

  for (const e of ledgerSinceConfirm) {
    if (
      (e.type === "expense" || e.type === "payment") &&
      e.budget_category_id
    ) {
      const prev = spentByCategory.get(e.budget_category_id) ?? 0;
      const add = Math.abs(e.amount_cents);
      spentByCategory.set(e.budget_category_id, prev + add);
      spentTotal += add;
    }
  }

  let remaining = 0;
  let allocated = 0;
  for (const b of periodBudgets) {
    allocated += b.allocated_cents;
    const spent = spentByCategory.get(b.category_id) ?? 0;
    remaining += Math.max(0, b.allocated_cents - spent);
  }

  return {
    remainingCents: remaining,
    allocatedCents: allocated,
    spentCents: spentTotal,
  };
}

/**
 * Free Spendable =
 *   tracked_cash
 *   − remaining_open_obligations (fixed, klarna, debt, savings — not unpaid income)
 *   − remaining_unspent_budget_allocations
 *
 * Settled bills are not reserved again: they already reduced tracked_cash via
 * the payment ledger. Paying therefore keeps Free Spendable stable.
 */
export function computeFreeSpendable(input: CalcInput): FreeSpendableBreakdown {
  const includeExpectedIncome = input.includeExpectedIncome ?? false;

  const trackedCashCents = computeTrackedCash(
    input.lastConfirmedActualCents,
    input.ledgerSinceConfirm,
  );

  const expectedIncomeCents = includeExpectedIncome
    ? sumOpenByKinds(input.periodObligations, ["income"])
    : 0;

  const fixedOpenCents = sumOpenByKinds(input.periodObligations, [
    "fixed_expense",
    "one_time",
  ]);
  const savingsOpenCents = sumOpenByKinds(input.periodObligations, [
    "savings_contribution",
  ]);
  const klarnaOpenCents = sumOpenByKinds(input.periodObligations, [
    "klarna_installment",
  ]);
  const debtOpenCents = sumOpenByKinds(input.periodObligations, [
    "debt_payment",
  ]);

  const openObligationsCents =
    fixedOpenCents + savingsOpenCents + klarnaOpenCents + debtOpenCents;

  const budgets = computeRemainingBudgetReserve(
    input.periodBudgets,
    input.ledgerSinceConfirm,
  );

  const incomeTotalCents = input.periodObligations
    .filter((o) => o.kind === "income")
    .reduce((sum, o) => sum + o.amount_cents, 0);

  const freeSpendableCents =
    trackedCashCents +
    expectedIncomeCents -
    openObligationsCents -
    budgets.remainingCents;

  return {
    freeSpendableCents,
    trackedCashCents,
    expectedIncomeCents,
    openObligationsCents,
    remainingBudgetReserveCents: budgets.remainingCents,
    incomeTotalCents,
    fixedOpenCents,
    savingsOpenCents,
    klarnaOpenCents,
    debtOpenCents,
    variableAllocatedCents: budgets.allocatedCents,
    variableSpentCents: budgets.spentCents,
  };
}

/** Carry-over = actual − expected at period start confirmation. */
export function computeCarryOver(
  expectedCents: Cents,
  actualCents: Cents,
): Cents {
  return actualCents - expectedCents;
}
