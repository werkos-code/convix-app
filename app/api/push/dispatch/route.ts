import { NextResponse } from "next/server";

import { loadDashboardData } from "@/lib/data/dashboard";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  evaluatePushCandidates,
  type NotificationPreferences,
  type PushPrefKey,
} from "@/lib/push/evaluate";
import { isPushConfigured, sendWebPush } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/periods/salary-period";

export const runtime = "nodejs";

/**
 * Evaluate + send pending push notifications.
 *
 * Auth:
 * - `Authorization: Bearer ${CRON_SECRET}` → all users with subscriptions
 * - logged-in user session → only that user (self-check)
 *
 * Vercel Cron uses GET; clients may POST.
 */
async function dispatch(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "VAPID-sleutels ontbreken" },
      { status: 503 },
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron =
    Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  let userIds: string[] = [];
  let admin;

  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY ontbreekt" },
      { status: 503 },
    );
  }

  if (isCron) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("user_id");
    userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }
    userIds = [user.id];
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    try {
      const data = await loadDashboardData(userId, { supabase: admin });
      if (data.demo || data.error) {
        skipped += 1;
        continue;
      }

      const today =
        data.today ??
        todayInTimezone(data.profile?.timezone ?? "Europe/Amsterdam");

      const { data: prefsRow } = await admin
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const preferences: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(prefsRow
          ? {
              period_started: prefsRow.period_started,
              confirm_balance: prefsRow.confirm_balance,
              large_upcoming_payment: prefsRow.large_upcoming_payment,
              klarna_due_soon: prefsRow.klarna_due_soon,
              free_spendable_negative: prefsRow.free_spendable_negative,
              budget_exceeded: prefsRow.budget_exceeded,
            }
          : {}),
      };

      const { data: logs } = await admin
        .from("notification_log")
        .select("dedupe_key")
        .eq("user_id", userId);

      const alreadySentKeys = new Set((logs ?? []).map((l) => l.dedupe_key));

      const periodStartedToday = data.openPeriod?.starts_on === today;

      const candidates = evaluatePushCandidates({
        userId,
        today,
        balanceConfirmed: data.balanceConfirmed,
        periodStartedToday,
        freeSpendableCents: data.breakdown.freeSpendableCents,
        insights: data.warnings,
        preferences,
        alreadySentKeys,
      });

      if (candidates.length === 0) {
        skipped += 1;
        continue;
      }

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (!subs?.length) {
        skipped += 1;
        continue;
      }

      for (const candidate of candidates) {
        let anyOk = false;
        for (const sub of subs) {
          const result = await sendWebPush(sub, {
            title: candidate.title,
            body: candidate.body,
            url: candidate.url,
          });
          if (result.ok) {
            anyOk = true;
            sent += 1;
          } else if (
            result.statusCode === 404 ||
            result.statusCode === 410
          ) {
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }

        if (anyOk) {
          await admin.from("notification_log").upsert(
            {
              user_id: userId,
              event_type: candidate.eventType as PushPrefKey,
              dedupe_key: candidate.dedupeKey,
              payload: {
                title: candidate.title,
                body: candidate.body,
                url: candidate.url,
              },
            },
            { onConflict: "user_id,dedupe_key" },
          );
        }
      }
    } catch (e) {
      errors.push(
        `${userId}: ${e instanceof Error ? e.message : "onbekende fout"}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    users: userIds.length,
    sent,
    skipped,
    errors,
  });
}

export async function GET(request: Request) {
  return dispatch(request);
}

export async function POST(request: Request) {
  return dispatch(request);
}
