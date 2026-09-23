import type { AuthedClient } from "@/lib/auth/require-user";
import {
  DEFAULT_SALARY_DAY,
  getPeriodBounds,
  type ISODate,
} from "@/lib/periods/salary-period";

/**
 * Ensure a salary_periods row exists for the period containing `onDate`.
 * Future periods are created as `closed` shells (budgets not required here).
 */
export async function ensurePeriodContainingDate(
  supabase: AuthedClient,
  userId: string,
  onDate: ISODate,
  salaryDay: number = DEFAULT_SALARY_DAY,
): Promise<{ id: string; starts_on: string; ends_on: string }> {
  const bounds = getPeriodBounds(onDate, salaryDay);

  const { data: existing, error: findErr } = await supabase
    .from("salary_periods")
    .select("id, starts_on, ends_on")
    .eq("user_id", userId)
    .eq("starts_on", bounds.startsOn)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: inserted, error: insertErr } = await supabase
    .from("salary_periods")
    .insert({
      user_id: userId,
      starts_on: bounds.startsOn,
      ends_on: bounds.endsOn,
      status: "closed",
      expected_available_cents: 0,
      actual_available_cents: null,
      carry_over_cents: 0,
      balance_confirmed_at: null,
    })
    .select("id, starts_on, ends_on")
    .single();

  if (insertErr) throw insertErr;
  return inserted;
}
