"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { needsBalanceConfirmation } from "@/lib/periods/transition";
import {
  daysUntil,
  nextSalaryDate,
  todayInTimezone,
} from "@/lib/periods/salary-period";
import { fail, ok, type ActionResult } from "./_result";

export async function syncCurrentSalaryPeriod(): Promise<
  ActionResult<{
    periodId: string;
    startsOn: string;
    endsOn: string;
    rolledOver: boolean;
    needsBalanceConfirm: boolean;
    daysUntilSalary: number;
    expectedAvailableCents: number;
  }>
> {
  try {
    const { user, supabase } = await requireUser();
    const { period, profile, rolledOver } = await ensureOpenPeriod(
      supabase,
      user.id,
    );
    const today = todayInTimezone(profile.timezone);
    const next = nextSalaryDate(today, profile.salary_day);

    revalidatePath("/app");
    return ok({
      periodId: period.id,
      startsOn: period.starts_on,
      endsOn: period.ends_on,
      rolledOver,
      needsBalanceConfirm: needsBalanceConfirmation(period),
      daysUntilSalary: daysUntil(next, today),
      expectedAvailableCents: period.expected_available_cents,
    });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Kon salarisperiode niet synchroniseren",
    );
  }
}
