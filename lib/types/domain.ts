import type { Cents } from "@/lib/money/cents";
import type { ISODate } from "@/lib/periods/salary-period";

export type AccountType = "checking" | "savings" | "other";

export type ObligationKind =
  | "income"
  | "fixed_expense"
  | "savings_contribution"
  | "debt_payment"
  | "klarna_installment"
  | "one_time";

export type ObligationStatus =
  | "planned"
  | "due"
  | "partially_paid"
  | "settled"
  | "returned_open"
  | "cancelled"
  | "waived";

export type LedgerEventType =
  | "expense"
  | "payment"
  | "income"
  | "refund_return"
  | "savings_contribution"
  | "debt_payment"
  | "balance_adjustment";

export type Recurrence = "monthly" | "yearly" | "once";

export type KlarnaPlan = "pay_in_30" | "pay_in_3" | "custom";

export type PeriodStatus = "open" | "closed";

export interface Profile {
  id: string;
  display_name: string | null;
  salary_day: number;
  currency: "EUR";
  timezone: string;
  onboarding_completed_at: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  is_active: boolean;
  sort_order: number;
  last_confirmed_balance_cents: Cents;
  last_confirmed_at: string | null;
  created_at: string;
}

export interface SalaryPeriod {
  id: string;
  user_id: string;
  starts_on: ISODate;
  ends_on: ISODate;
  status: PeriodStatus;
  expected_available_cents: Cents;
  actual_available_cents: Cents | null;
  carry_over_cents: Cents;
  balance_confirmed_at: string | null;
}

export interface Obligation {
  id: string;
  user_id: string;
  period_id: string | null;
  kind: ObligationKind;
  name: string;
  amount_cents: Cents;
  remaining_open_cents: Cents;
  status: ObligationStatus;
  due_on: ISODate;
  account_id: string | null;
  budget_category_id: string | null;
  source_type: string | null;
  source_id: string | null;
}

export interface LedgerEvent {
  id: string;
  user_id: string;
  type: LedgerEventType;
  name: string;
  amount_cents: Cents;
  occurred_on: ISODate;
  account_id: string | null;
  obligation_id: string | null;
  budget_category_id: string | null;
  period_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  default_amount_cents: Cents;
  is_active: boolean;
}

export interface PeriodBudget {
  id: string;
  period_id: string;
  category_id: string;
  allocated_cents: Cents;
}

export interface FreeSpendableBreakdown {
  freeSpendableCents: Cents;
  trackedCashCents: Cents;
  expectedIncomeCents: Cents;
  openObligationsCents: Cents;
  remainingBudgetReserveCents: Cents;
  incomeTotalCents: Cents;
  /** All period bills + snelle uitgaven (paid and open), for the Uitgaven chip. */
  expenseTotalCents: Cents;
  fixedOpenCents: Cents;
  savingsOpenCents: Cents;
  klarnaOpenCents: Cents;
  debtOpenCents: Cents;
  variableAllocatedCents: Cents;
  variableSpentCents: Cents;
}
