import { Suspense } from "react";
import { Bell, Clock, Settings } from "lucide-react";
import { revalidatePath } from "next/cache";

import { NotificationPrefsForm } from "@/components/notifications/notification-prefs-form";
import { PushEnableButton } from "@/components/notifications/push-enable-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import { DEFAULT_SALARY_DAY } from "@/lib/periods/salary-period";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type PushPrefKey,
} from "@/lib/push/evaluate";

export const metadata = {
  title: "Instellingen",
};

async function updateSalaryDay(formData: FormData) {
  "use server";
  const day = Number(formData.get("salaryDay"));
  if (!Number.isInteger(day) || day < 1 || day > 28) return;

  const { user, supabase } = await requireUser();
  await supabase.from("profiles").update({ salary_day: day }).eq("id", user.id);
  revalidatePath("/app/settings");
  revalidatePath("/app");
}

async function updateNotificationPrefs(
  prefs: NotificationPreferences,
): Promise<{ error?: string }> {
  "use server";
  try {
    const { user, supabase } = await requireUser();
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        period_started: prefs.period_started,
        confirm_balance: prefs.confirm_balance,
        large_upcoming_payment: prefs.large_upcoming_payment,
        klarna_due_soon: prefs.klarna_due_soon,
        free_spendable_negative: prefs.free_spendable_negative,
        budget_exceeded: prefs.budget_exceeded,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { error: error.message };
    revalidatePath("/app/settings");
    return {};
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Opslaan mislukt",
    };
  }
}

async function SettingsContent() {
  let salaryDay = DEFAULT_SALARY_DAY;
  let timezone = "Europe/Amsterdam";
  const prefs: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };

  try {
    const { user, supabase } = await requireUser();
    const { data } = await supabase
      .from("profiles")
      .select("salary_day, timezone")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      salaryDay = data.salary_day;
      timezone = data.timezone;
    }

    const { data: prefsRow } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefsRow) {
      const keys: PushPrefKey[] = [
        "period_started",
        "confirm_balance",
        "large_upcoming_payment",
        "klarna_due_soon",
        "free_spendable_negative",
        "budget_exceeded",
      ];
      for (const key of keys) {
        prefs[key] = prefsRow[key];
      }
    }
  } catch {
    // defaults
  }

  return (
    <>
      <form
        action={updateSalaryDay}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="salaryDay" className="flex items-center gap-2">
            <Clock className="size-4 text-accent" aria-hidden />
            Salarisdag
          </Label>
          <Input
            id="salaryDay"
            name="salaryDay"
            type="number"
            min={1}
            max={28}
            defaultValue={salaryDay}
            required
          />
          <p className="text-xs text-slate-500">
            Dag van de maand waarop je salarisperiode reset (1–28). Standaard is
            de 24e.
          </p>
        </div>
        <Button type="submit">Salarisdag opslaan</Button>
      </form>

      <section className="rounded-2xl border border-border bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Clock className="size-5 text-accent" aria-hidden />
          Tijdzone
        </h2>
        <p className="mt-2 text-sm text-slate-600">{timezone}</p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Bell className="size-5 text-accent" aria-hidden />
          Meldingen
        </h2>
        <PushEnableButton />
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Welke meldingen?
          </h3>
          <NotificationPrefsForm
            initial={prefs}
            action={updateNotificationPrefs}
          />
        </div>
      </section>
    </>
  );
}

function SettingsFallback() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-40 bg-white/60" />
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Instellingen" icon={Settings} />
      <Suspense fallback={<SettingsFallback />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
