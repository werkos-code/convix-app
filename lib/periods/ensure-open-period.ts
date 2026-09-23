import { isSpendableAccountType } from "@/lib/accounts/spendable";
import type { AuthedClient } from "@/lib/auth/require-user";
import { materializeObligationsForPeriod } from "@/lib/obligations/materialize";
import {
  computeExpectedAtPeriodOpen,
  dayAfter,
} from "@/lib/periods/transition";
import {
  DEFAULT_SALARY_DAY,
  DEFAULT_TIMEZONE,
  getPeriodBounds,
  todayInTimezone,
  type ISODate,
} from "@/lib/periods/salary-period";
import type { Profile, SalaryPeriod } from "@/lib/types/domain";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PeriodRow = Database["public"]["Tables"]["salary_periods"]["Row"];

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    display_name: row.display_name,
    salary_day: row.salary_day,
    currency: "EUR",
    timezone: row.timezone,
    onboarding_completed_at: row.onboarding_completed_at,
    created_at: row.created_at,
  };
}

function toPeriod(row: PeriodRow): SalaryPeriod {
  return {
    id: row.id,
    user_id: row.user_id,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    status: row.status,
    expected_available_cents: row.expected_available_cents,
    actual_available_cents: row.actual_available_cents,
    carry_over_cents: row.carry_over_cents,
    balance_confirmed_at: row.balance_confirmed_at,
  };
}

async function ensurePeriodBudgets(
  supabase: AuthedClient,
  userId: string,
  periodId: string,
): Promise<void> {
  const { data: categories, error: catErr } = await supabase
    .from("budget_categories")
    .select("id, default_amount_cents")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (catErr) throw catErr;
  if (!categories?.length) return;

  const { data: existing, error: existingErr } = await supabase
    .from("period_budgets")
    .select("category_id")
    .eq("period_id", periodId)
    .eq("user_id", userId);

  if (existingErr) throw existingErr;

  const have = new Set((existing ?? []).map((e) => e.category_id));
  const missing = categories.filter((c) => !have.has(c.id));
  if (missing.length === 0) return;

  const { error } = await supabase.from("period_budgets").insert(
    missing.map((c) => ({
      period_id: periodId,
      category_id: c.id,
      user_id: userId,
      allocated_cents: c.default_amount_cents,
    })),
  );
  if (error) throw error;
}

/**
 * On period open: reset allocations from current category defaults
 * (unused budget does not roll over).
 */
async function resetPeriodBudgetsFromDefaults(
  supabase: AuthedClient,
  userId: string,
  periodId: string,
): Promise<void> {
  const { data: categories, error: catErr } = await supabase
    .from("budget_categories")
    .select("id, default_amount_cents")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (catErr) throw catErr;

  await supabase
    .from("period_budgets")
    .delete()
    .eq("period_id", periodId)
    .eq("user_id", userId);

  if (!categories?.length) return;

  const { error } = await supabase.from("period_budgets").insert(
    categories.map((c) => ({
      period_id: periodId,
      category_id: c.id,
      user_id: userId,
      allocated_cents: c.default_amount_cents,
    })),
  );
  if (error) throw error;
}

async function loadOrCreateProfile(
  supabase: AuthedClient,
  userId: string,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: insertErr } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single();

  if (insertErr) throw insertErr;
  return created;
}

async function sumSpendableBalances(
  supabase: AuthedClient,
  userId: string,
): Promise<number> {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("last_confirmed_balance_cents, type")
    .eq("user_id", userId)
    .eq("is_active", true);

  return (accounts ?? [])
    .filter((a) => isSpendableAccountType(a.type))
    .reduce((sum, a) => sum + a.last_confirmed_balance_cents, 0);
}

async function loadPreviousPeriodActual(
  supabase: AuthedClient,
  userId: string,
  currentStartsOn: ISODate,
): Promise<number | null> {
  const { data } = await supabase
    .from("salary_periods")
    .select("actual_available_cents, ends_on, starts_on")
    .eq("user_id", userId)
    .lt("starts_on", currentStartsOn)
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.actual_available_cents ?? null;
}

/**
 * Ensure the user has an open salary_period covering today.
 * On salary-day rollover: close previous, open current, reset budgets,
 * set expected available, and leave balances unconfirmed until the user confirms.
 */
export async function ensureOpenPeriod(
  supabase: AuthedClient,
  userId: string,
  onDate?: ISODate,
): Promise<{
  period: SalaryPeriod;
  profile: Profile;
  created: boolean;
  rolledOver: boolean;
}> {
  const profileRow = await loadOrCreateProfile(supabase, userId);
  const timezone = profileRow.timezone || DEFAULT_TIMEZONE;
  const salaryDay = profileRow.salary_day || DEFAULT_SALARY_DAY;
  const today = onDate ?? todayInTimezone(timezone);
  const bounds = getPeriodBounds(today, salaryDay);

  const { data: existing, error: findErr } = await supabase
    .from("salary_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("starts_on", bounds.startsOn)
    .maybeSingle();

  if (findErr) throw findErr;

  let periodRow = existing;
  let created = false;
  let rolledOver = false;

  const spendableBalances = await sumSpendableBalances(supabase, userId);
  const previousActual = await loadPreviousPeriodActual(
    supabase,
    userId,
    bounds.startsOn,
  );
  const expected = computeExpectedAtPeriodOpen({
    previousActualAvailableCents: previousActual,
    spendableAccountBalancesCents: spendableBalances,
  });

  if (!periodRow) {
    await supabase
      .from("salary_periods")
      .update({ status: "closed" })
      .eq("user_id", userId)
      .eq("status", "open");

    const { data: inserted, error: insertErr } = await supabase
      .from("salary_periods")
      .insert({
        user_id: userId,
        starts_on: bounds.startsOn,
        ends_on: bounds.endsOn,
        status: "open",
        expected_available_cents: expected,
        actual_available_cents: null,
        carry_over_cents: 0,
        balance_confirmed_at: null,
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;
    periodRow = inserted;
    created = true;
  } else if (periodRow.status !== "open") {
    // Pre-materialized next period becoming current (salary-day rollover).
    await supabase
      .from("salary_periods")
      .update({ status: "closed" })
      .eq("user_id", userId)
      .eq("status", "open")
      .neq("id", periodRow.id);

    const { data: reopened, error: reopenErr } = await supabase
      .from("salary_periods")
      .update({
        status: "open",
        expected_available_cents: expected,
        actual_available_cents: null,
        carry_over_cents: 0,
        balance_confirmed_at: null,
      })
      .eq("id", periodRow.id)
      .select("*")
      .single();

    if (reopenErr) throw reopenErr;
    periodRow = reopened;
    rolledOver = true;
  }

  if (created || rolledOver) {
    await resetPeriodBudgetsFromDefaults(supabase, userId, periodRow.id);
  } else {
    await ensurePeriodBudgets(supabase, userId, periodRow.id);
  }

  await materializeObligationsForPeriod(supabase, userId, periodRow.id, {
    startsOn: periodRow.starts_on,
    endsOn: periodRow.ends_on,
  });

  const nextBounds = getPeriodBounds(dayAfter(periodRow.ends_on), salaryDay);

  const { data: nextExisting } = await supabase
    .from("salary_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("starts_on", nextBounds.startsOn)
    .maybeSingle();

  let nextPeriod = nextExisting;
  if (!nextPeriod) {
    const { data: nextInserted, error: nextErr } = await supabase
      .from("salary_periods")
      .insert({
        user_id: userId,
        starts_on: nextBounds.startsOn,
        ends_on: nextBounds.endsOn,
        status: "closed",
        expected_available_cents: 0,
        actual_available_cents: null,
        carry_over_cents: 0,
        balance_confirmed_at: null,
      })
      .select("*")
      .single();
    if (nextErr) throw nextErr;
    nextPeriod = nextInserted;
  }

  await ensurePeriodBudgets(supabase, userId, nextPeriod.id);
  await materializeObligationsForPeriod(supabase, userId, nextPeriod.id, {
    startsOn: nextPeriod.starts_on,
    endsOn: nextPeriod.ends_on,
  });

  return {
    period: toPeriod(periodRow),
    profile: toProfile(profileRow),
    created,
    rolledOver,
  };
}
