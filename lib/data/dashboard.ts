import { cache } from "react";

import type { AuthedClient } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { isSpendableAccountType } from "@/lib/accounts/spendable";
import { computeFreeSpendable } from "@/lib/calc/free-spendable";
import {
  buildDeterministicInsights,
  type Insight,
  type BudgetSpendStatus,
} from "@/lib/insights/deterministic";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import {
  daysUntil,
  nextSalaryDate,
  todayInTimezone,
} from "@/lib/periods/salary-period";
import { dayAfter } from "@/lib/periods/transition";
import type {
  FreeSpendableBreakdown,
  LedgerEvent,
  Obligation,
  ObligationKind,
  ObligationStatus,
  Profile,
  SalaryPeriod,
} from "@/lib/types/domain";
import type { Cents } from "@/lib/money/cents";

export type DashboardPeriodView = "current" | "next";

export interface DashboardBudgetStatus extends BudgetSpendStatus {
  remainingCents: Cents;
  overCents: Cents;
}

export interface DashboardData {
  profile: Profile | null;
  /** Period whose numbers are shown (current open or next preview). */
  period: SalaryPeriod | null;
  /** Always the live open salary period. */
  openPeriod: SalaryPeriod | null;
  nextPeriod: SalaryPeriod | null;
  periodView: DashboardPeriodView;
  /** True when viewing the upcoming (not-yet-open) period. */
  isPreview: boolean;
  daysUntilSalary: number;
  nextSalaryOn: string | null;
  /** Today in the user timezone (YYYY-MM-DD), for relative due labels. */
  today: string | null;
  balanceConfirmed: boolean;
  breakdown: FreeSpendableBreakdown;
  upcoming: Obligation[];
  budgets: DashboardBudgetStatus[];
  warnings: Insight[];
  klarnaOutstandingCents: Cents;
  savingsTotalCents: Cents;
  demo: boolean;
  error?: string;
}

const EMPTY_BREAKDOWN: FreeSpendableBreakdown = {
  freeSpendableCents: 0,
  trackedCashCents: 0,
  expectedIncomeCents: 0,
  openObligationsCents: 0,
  remainingBudgetReserveCents: 0,
  incomeTotalCents: 0,
  fixedOpenCents: 0,
  savingsOpenCents: 0,
  klarnaOpenCents: 0,
  debtOpenCents: 0,
  variableAllocatedCents: 0,
  variableSpentCents: 0,
};

function emptyDashboard(partial?: Partial<DashboardData>): DashboardData {
  return {
    profile: null,
    period: null,
    openPeriod: null,
    nextPeriod: null,
    periodView: "current",
    isPreview: false,
    daysUntilSalary: 0,
    nextSalaryOn: null,
    today: null,
    balanceConfirmed: false,
    breakdown: EMPTY_BREAKDOWN,
    upcoming: [],
    budgets: [],
    warnings: [],
    klarnaOutstandingCents: 0,
    savingsTotalCents: 0,
    demo: true,
    ...partial,
  };
}

function mapObligations(
  rows: Array<Record<string, unknown>>,
): Obligation[] {
  return rows.map((o) => ({
    id: o.id as string,
    user_id: o.user_id as string,
    period_id: (o.period_id as string | null) ?? null,
    kind: o.kind as ObligationKind,
    name: o.name as string,
    amount_cents: o.amount_cents as number,
    remaining_open_cents: o.remaining_open_cents as number,
    status: o.status as ObligationStatus,
    due_on: o.due_on as string,
    account_id: (o.account_id as string | null) ?? null,
    budget_category_id: (o.budget_category_id as string | null) ?? null,
    source_type: (o.source_type as string | null) ?? null,
    source_id: (o.source_id as string | null) ?? null,
  }));
}

/**
 * Aggregate dashboard payload for a user.
 * `periodView: "next"` shows a projection for the upcoming salary period.
 * Pass `supabase` (e.g. service-role) for cron / admin fan-out.
 * Cached per request so shell + body Suspense boundaries share one fetch.
 */
export const loadDashboardData = cache(async function loadDashboardData(
  userId: string,
  options: {
    periodView?: DashboardPeriodView;
    supabase?: AuthedClient;
  } = {},
): Promise<DashboardData> {
  const periodView: DashboardPeriodView =
    options.periodView === "next" ? "next" : "current";

  if (!userId) {
    return emptyDashboard({
      error: "Not authenticated",
      periodView,
      isPreview: periodView === "next",
    });
  }

  let supabase = options.supabase;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch (e) {
      return emptyDashboard({
        error:
          e instanceof Error
            ? e.message
            : "Supabase unavailable — showing empty dashboard",
        periodView,
        isPreview: periodView === "next",
      });
    }
  }

  try {
    const { period: openPeriod, profile } = await ensureOpenPeriod(
      supabase,
      userId,
    );
    const today = todayInTimezone(profile.timezone);
    const nextSalary = nextSalaryDate(today, profile.salary_day);
    const days = daysUntil(nextSalary, today);

    const { data: nextPeriodRow } = await supabase
      .from("salary_periods")
      .select("*")
      .eq("user_id", userId)
      .eq("starts_on", dayAfter(openPeriod.ends_on))
      .maybeSingle();

    const nextPeriod: SalaryPeriod | null = nextPeriodRow
      ? {
          id: nextPeriodRow.id,
          user_id: nextPeriodRow.user_id,
          starts_on: nextPeriodRow.starts_on,
          ends_on: nextPeriodRow.ends_on,
          status: nextPeriodRow.status,
          expected_available_cents: nextPeriodRow.expected_available_cents,
          actual_available_cents: nextPeriodRow.actual_available_cents,
          carry_over_cents: nextPeriodRow.carry_over_cents,
          balance_confirmed_at: nextPeriodRow.balance_confirmed_at,
        }
      : null;

    const viewingNext = periodView === "next" && nextPeriod != null;
    const viewPeriod = viewingNext ? nextPeriod : openPeriod;

    const [
      accountsRes,
      openObligationsRes,
      viewObligationsRes,
      openBudgetsRes,
      viewBudgetsRes,
      categoriesRes,
      ledgerRes,
      klarnaRes,
      savingsRes,
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("id, type, last_confirmed_balance_cents, last_confirmed_at")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("obligations")
        .select("*")
        .eq("user_id", userId)
        .eq("period_id", openPeriod.id)
        .order("due_on", { ascending: true }),
      supabase
        .from("obligations")
        .select("*")
        .eq("user_id", userId)
        .eq("period_id", viewPeriod.id)
        .order("due_on", { ascending: true }),
      supabase
        .from("period_budgets")
        .select("category_id, allocated_cents")
        .eq("period_id", openPeriod.id)
        .eq("user_id", userId),
      supabase
        .from("period_budgets")
        .select("category_id, allocated_cents")
        .eq("period_id", viewPeriod.id)
        .eq("user_id", userId),
      supabase
        .from("budget_categories")
        .select("id, name, is_active")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("ledger_events")
        .select("type, amount_cents, budget_category_id, created_at, occurred_on")
        .eq("user_id", userId)
        .eq("period_id", openPeriod.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("klarna_installments")
        .select("amount_cents, status")
        .eq("user_id", userId)
        .in("status", ["planned", "due", "partially_paid", "returned_open"]),
      supabase
        .from("savings_goals")
        .select("current_amount_cents")
        .eq("user_id", userId)
        .eq("is_active", true),
    ]);

    if (accountsRes.error) throw accountsRes.error;
    if (openObligationsRes.error) throw openObligationsRes.error;
    if (viewObligationsRes.error) throw viewObligationsRes.error;
    if (openBudgetsRes.error) throw openBudgetsRes.error;
    if (viewBudgetsRes.error) throw viewBudgetsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (ledgerRes.error) throw ledgerRes.error;

    const spendableConfirmed = (accountsRes.data ?? [])
      .filter((a) => isSpendableAccountType(a.type))
      .reduce((sum, a) => sum + a.last_confirmed_balance_cents, 0);

    /**
     * Cash basis = sum of spendable account balances (source of truth).
     * Only snelle uitgaven after the latest confirm adjust cash; Betaald /
     * Terugboeking on the timeline do not invent bank money.
     */
    const latestAccountConfirm = (accountsRes.data ?? [])
      .map((a) => a.last_confirmed_at)
      .filter((t): t is string => Boolean(t))
      .sort()
      .at(-1);

    const lastConfirmedActualCents = spendableConfirmed;
    const confirmCutoff =
      latestAccountConfirm ?? openPeriod.balance_confirmed_at;

    const ledgerSinceConfirm = (ledgerRes.data ?? [])
      .filter((e) => {
        if (!confirmCutoff) return true;
        return e.created_at >= confirmCutoff;
      })
      .map((e) => ({
        type: e.type as LedgerEvent["type"],
        amount_cents: e.amount_cents,
        budget_category_id: e.budget_category_id,
      }));

    const activeCategoryIds = new Set(
      (categoriesRes.data ?? []).map((c) => c.id),
    );

    const openPeriodObligations = (openObligationsRes.data ?? []).map((o) => ({
      kind: o.kind as ObligationKind,
      status: o.status as ObligationStatus,
      remaining_open_cents: o.remaining_open_cents,
      amount_cents: o.amount_cents,
    }));

    const openPeriodBudgets = (openBudgetsRes.data ?? [])
      .filter((b) => activeCategoryIds.has(b.category_id))
      .map((b) => ({
        category_id: b.category_id,
        allocated_cents: b.allocated_cents,
      }));

    const currentBreakdown = computeFreeSpendable({
      lastConfirmedActualCents,
      ledgerSinceConfirm,
      periodObligations: openPeriodObligations,
      periodBudgets: openPeriodBudgets,
    });

    const viewObligations = (viewObligationsRes.data ?? []).map((o) => ({
      kind: o.kind as ObligationKind,
      status: o.status as ObligationStatus,
      remaining_open_cents: o.remaining_open_cents,
      amount_cents: o.amount_cents,
    }));

    const viewBudgets = (viewBudgetsRes.data ?? [])
      .filter((b) => activeCategoryIds.has(b.category_id))
      .map((b) => ({
        category_id: b.category_id,
        allocated_cents: b.allocated_cents,
      }));

    /**
     * Next-period projection starts from current tracked cash (bank ± ledger),
     * then adds that period's expected income and subtracts its open obligations.
     * Do NOT start from current Free Spendable — that already reserved the
     * current period's bills and would double-count them against next period.
     */
    const breakdown = viewingNext
      ? computeFreeSpendable({
          lastConfirmedActualCents: currentBreakdown.trackedCashCents,
          ledgerSinceConfirm: [],
          periodObligations: viewObligations,
          periodBudgets: viewBudgets,
          includeExpectedIncome: true,
        })
      : currentBreakdown;

    const categoryNames = new Map(
      (categoriesRes.data ?? []).map((c) => [c.id, c.name]),
    );

    const spentByCategory = new Map<string, number>();
    if (!viewingNext) {
      for (const e of ledgerSinceConfirm) {
        if (
          (e.type === "expense" || e.type === "payment") &&
          e.budget_category_id
        ) {
          const prev = spentByCategory.get(e.budget_category_id) ?? 0;
          spentByCategory.set(
            e.budget_category_id,
            prev + Math.abs(e.amount_cents),
          );
        }
      }
    }

    const budgets: DashboardBudgetStatus[] = viewBudgets.map((b) => {
      const spent = spentByCategory.get(b.category_id) ?? 0;
      return {
        categoryId: b.category_id,
        name: categoryNames.get(b.category_id) ?? "Budget",
        allocatedCents: b.allocated_cents,
        spentCents: spent,
        remainingCents: Math.max(0, b.allocated_cents - spent),
        overCents: Math.max(0, spent - b.allocated_cents),
      };
    });

    const upcoming: Obligation[] = mapObligations(
      (viewObligationsRes.data ?? []).filter((o) =>
        ["planned", "due", "partially_paid", "returned_open"].includes(
          o.status,
        ),
      ),
    );

    const warnings = viewingNext
      ? []
      : buildDeterministicInsights({
          breakdown,
          budgets,
          upcomingObligations: upcoming.map((o) => ({
            id: o.id,
            name: o.name,
            kind: o.kind,
            amountCents: o.amount_cents,
            remainingOpenCents: o.remaining_open_cents,
            dueOn: o.due_on,
          })),
          today,
        });

    const klarnaOutstandingCents = (klarnaRes.data ?? []).reduce(
      (sum, i) => sum + i.amount_cents,
      0,
    );
    const savingsTotalCents = (savingsRes.data ?? []).reduce(
      (sum, g) => sum + g.current_amount_cents,
      0,
    );

    return {
      profile,
      period: viewPeriod,
      openPeriod,
      nextPeriod,
      periodView: viewingNext ? "next" : "current",
      isPreview: viewingNext,
      daysUntilSalary: viewingNext
        ? daysUntil(dayAfter(viewPeriod.ends_on), viewPeriod.starts_on)
        : days,
      nextSalaryOn: viewingNext
        ? dayAfter(viewPeriod.ends_on)
        : nextSalary,
      today,
      balanceConfirmed: openPeriod.balance_confirmed_at != null,
      breakdown,
      upcoming,
      budgets,
      warnings,
      klarnaOutstandingCents,
      savingsTotalCents,
      demo: false,
    };
  } catch (e) {
    return emptyDashboard({
      error: e instanceof Error ? e.message : "Failed to load dashboard",
      periodView,
      isPreview: periodView === "next",
    });
  }
});
