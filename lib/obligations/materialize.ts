import type { AuthedClient } from "@/lib/auth/require-user";
import {
  clampDayOfMonth,
  isDateInPeriod,
  parseISODate,
  type ISODate,
  type PeriodBounds,
} from "@/lib/periods/salary-period";
import type { ObligationKind, Recurrence } from "@/lib/types/domain";

type SourceType =
  | "income_rule"
  | "fixed_expense_rule"
  | "savings_goal"
  | "debt_payment_rule";

interface RuleLike {
  id: string;
  name: string;
  amount_cents: number;
  recurrence: Recurrence | string;
  day_of_month: number | null;
  month_of_year?: number | null;
  account_id?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  is_active: boolean;
}

interface PlannedOccurrence {
  sourceType: SourceType;
  sourceId: string;
  kind: ObligationKind;
  name: string;
  amountCents: number;
  dueOn: ISODate;
  accountId: string | null;
}

/** Due dates for a rule that fall inside the given salary period. */
export function dueDatesInPeriod(
  recurrence: Recurrence | string,
  dayOfMonth: number | null,
  monthOfYear: number | null | undefined,
  period: PeriodBounds,
  startsOn: string | null | undefined = null,
): ISODate[] {
  const day = dayOfMonth ?? 1;

  if (recurrence === "once") {
    const date = startsOn ?? null;
    if (!date) return [];
    return isDateInPeriod(date, period) ? [date] : [];
  }

  if (recurrence === "yearly") {
    const monthIndex = (monthOfYear ?? 1) - 1;
    const start = parseISODate(period.startsOn);
    const end = parseISODate(period.endsOn);
    const years = new Set<number>([
      start.getUTCFullYear(),
      end.getUTCFullYear(),
    ]);
    const dates: ISODate[] = [];
    for (const year of years) {
      const d = clampDayOfMonth(year, monthIndex, day);
      if (isDateInPeriod(d, period)) dates.push(d);
    }
    return dates;
  }

  // monthly: clamp day into each calendar month touched by the period
  const dates: ISODate[] = [];
  const start = parseISODate(period.startsOn);
  const end = parseISODate(period.endsOn);
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth();

  while (y < endY || (y === endY && m <= endM)) {
    const d = clampDayOfMonth(y, m, day);
    if (isDateInPeriod(d, period)) dates.push(d);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return dates;
}

function ruleActiveInPeriod(rule: RuleLike, period: PeriodBounds): boolean {
  if (!rule.is_active) return false;
  if (rule.starts_on && rule.starts_on > period.endsOn) return false;
  if (rule.ends_on && rule.ends_on < period.startsOn) return false;
  return true;
}

function occurrencesFromRules(
  rules: RuleLike[],
  sourceType: SourceType,
  kind: ObligationKind,
  period: PeriodBounds,
): PlannedOccurrence[] {
  const out: PlannedOccurrence[] = [];
  for (const rule of rules) {
    if (!ruleActiveInPeriod(rule, period)) continue;
    const dues = dueDatesInPeriod(
      rule.recurrence,
      rule.day_of_month,
      rule.month_of_year ?? null,
      period,
      rule.starts_on,
    );
    // One obligation per source per period (first due if multiple)
    if (dues.length === 0) continue;
    out.push({
      sourceType,
      sourceId: rule.id,
      kind,
      name: rule.name,
      amountCents: rule.amount_cents,
      dueOn: dues[0],
      accountId: rule.account_id ?? null,
    });
  }
  return out;
}

/**
 * Materialize obligations for a salary period from active rules.
 * Skips inserts when an identical source already exists for the period.
 */
export async function materializeObligationsForPeriod(
  supabase: AuthedClient,
  userId: string,
  periodId: string,
  period: PeriodBounds,
): Promise<{ created: number }> {
  const [
    incomeRes,
    fixedRes,
    savingsRes,
    debtRulesRes,
    debtsRes,
    existingRes,
  ] = await Promise.all([
    supabase
      .from("income_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("fixed_expense_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("debt_payment_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("debts")
      .select("id, name, is_active")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("obligations")
      .select("source_type, source_id")
      .eq("user_id", userId)
      .eq("period_id", periodId)
      .not("source_id", "is", null),
  ]);

  if (incomeRes.error) throw incomeRes.error;
  if (fixedRes.error) throw fixedRes.error;
  if (savingsRes.error) throw savingsRes.error;
  if (debtRulesRes.error) throw debtRulesRes.error;
  if (debtsRes.error) throw debtsRes.error;
  if (existingRes.error) throw existingRes.error;

  const debtsById = new Map(
    (debtsRes.data ?? []).map((d) => [d.id, d] as const),
  );

  const existing = new Set(
    (existingRes.data ?? [])
      .filter((r) => r.source_type && r.source_id)
      .map((r) => `${r.source_type}:${r.source_id}`),
  );

  const planned: PlannedOccurrence[] = [
    ...occurrencesFromRules(
      (incomeRes.data ?? []) as RuleLike[],
      "income_rule",
      "income",
      period,
    ),
    ...occurrencesFromRules(
      (fixedRes.data ?? []) as RuleLike[],
      "fixed_expense_rule",
      "fixed_expense",
      period,
    ),
  ];

  for (const goal of savingsRes.data ?? []) {
    if (!goal.is_active || !goal.contribution_day) continue;
    const dues = dueDatesInPeriod(
      goal.recurrence || "monthly",
      goal.contribution_day,
      null,
      period,
    );
    if (dues.length === 0) continue;
    planned.push({
      sourceType: "savings_goal",
      sourceId: goal.id,
      kind: "savings_contribution",
      name: goal.name,
      amountCents: goal.scheduled_amount_cents,
      dueOn: dues[0],
      accountId: goal.linked_account_id,
    });
  }

  for (const rule of debtRulesRes.data ?? []) {
    const debt = debtsById.get(rule.debt_id);
    if (!debt) continue;
    const dues = dueDatesInPeriod("monthly", rule.day_of_month, null, period);
    if (dues.length === 0) continue;
    planned.push({
      sourceType: "debt_payment_rule",
      sourceId: rule.id,
      kind: "debt_payment",
      name: debt.name,
      amountCents: rule.amount_cents,
      dueOn: dues[0],
      accountId: null,
    });
  }

  const toInsert = planned.filter(
    (p) => !existing.has(`${p.sourceType}:${p.sourceId}`),
  );

  if (toInsert.length === 0) return { created: 0 };

  const { error } = await supabase.from("obligations").insert(
    toInsert.map((p) => ({
      user_id: userId,
      period_id: periodId,
      kind: p.kind,
      name: p.name,
      amount_cents: p.amountCents,
      remaining_open_cents: p.amountCents,
      status: "planned",
      due_on: p.dueOn,
      account_id: p.accountId,
      source_type: p.sourceType,
      source_id: p.sourceId,
    })),
  );

  if (error) throw error;
  return { created: toInsert.length };
}

/** Materialize for the open period and the next salary period (if present). */
export async function rematerializeUserPeriods(
  supabase: AuthedClient,
  userId: string,
  periods: Array<{ id: string; starts_on: string; ends_on: string }>,
): Promise<void> {
  for (const p of periods) {
    await materializeObligationsForPeriod(supabase, userId, p.id, {
      startsOn: p.starts_on,
      endsOn: p.ends_on,
    });
  }
}
