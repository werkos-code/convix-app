import { formatDateNL } from "@/lib/dates/format";
import { formatEuro, type Cents } from "@/lib/money/cents";
import type { Insight } from "@/lib/insights/deterministic";

/** Matches notification_preferences columns. */
export type PushPrefKey =
  | "period_started"
  | "confirm_balance"
  | "large_upcoming_payment"
  | "klarna_due_soon"
  | "free_spendable_negative"
  | "budget_exceeded";

export type NotificationPreferences = Record<PushPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  period_started: true,
  confirm_balance: true,
  large_upcoming_payment: true,
  klarna_due_soon: true,
  free_spendable_negative: true,
  budget_exceeded: true,
};

export interface PushCandidate {
  eventType: PushPrefKey;
  dedupeKey: string;
  title: string;
  body: string;
  url: string;
}

export interface EvaluatePushInput {
  userId: string;
  today: string;
  balanceConfirmed: boolean;
  periodStartedToday?: boolean;
  freeSpendableCents: Cents;
  insights: Insight[];
  preferences: NotificationPreferences;
  alreadySentKeys: Set<string>;
}

/**
 * Build push candidates from dashboard/insights state.
 * Respects preferences and skip keys already in notification_log.
 */
export function evaluatePushCandidates(
  input: EvaluatePushInput,
): PushCandidate[] {
  const {
    today,
    balanceConfirmed,
    periodStartedToday,
    freeSpendableCents,
    insights,
    preferences,
    alreadySentKeys,
  } = input;

  const out: PushCandidate[] = [];

  function add(c: PushCandidate) {
    if (!preferences[c.eventType]) return;
    if (alreadySentKeys.has(c.dedupeKey)) return;
    out.push(c);
  }

  if (periodStartedToday) {
    add({
      eventType: "period_started",
      dedupeKey: `period_started:${today}`,
      title: "Nieuwe salarisperiode",
      body: "Je nieuwe periode is gestart. Bevestig je banksaldo wanneer je kunt.",
      url: "/app",
    });
  }

  if (!balanceConfirmed) {
    add({
      eventType: "confirm_balance",
      dedupeKey: `confirm_balance:${today}`,
      title: "Bevestig je banksaldo",
      body: "Zonder bevestiging blijft de carry-over schatting onzeker.",
      url: "/app/balances/confirm",
    });
  }

  if (freeSpendableCents < 0) {
    add({
      eventType: "free_spendable_negative",
      dedupeKey: `free_spendable_negative:${today}`,
      title: "Vrij besteedbaar is negatief",
      body: `Nu op ${formatEuro(freeSpendableCents)}. Bekijk Binnenkort en schaaf bij.`,
      url: "/app",
    });
  }

  for (const insight of insights) {
    if (insight.kind === "budget_exceeded") {
      add({
        eventType: "budget_exceeded",
        dedupeKey: insight.id,
        title: insight.title,
        body: insight.message,
        url: "/app/budgets",
      });
    }
    if (insight.kind === "klarna_upcoming") {
      add({
        eventType: "klarna_due_soon",
        dedupeKey: insight.id,
        title: insight.title,
        body: insight.message,
        url: "/app/klarna",
      });
    }
    if (insight.kind === "large_payment" || insight.kind === "debt_upcoming") {
      add({
        eventType: "large_upcoming_payment",
        dedupeKey: insight.id,
        title: insight.title,
        body: insight.message,
        url: "/app/timeline",
      });
    }
  }

  return out;
}

export function preferenceLabels(): Record<PushPrefKey, string> {
  return {
    period_started: "Nieuwe salarisperiode",
    confirm_balance: "Saldo bevestigen",
    large_upcoming_payment: "Grote aankomende betaling",
    klarna_due_soon: "Klarna bijna verschuldigd",
    free_spendable_negative: "Negatief vrij besteedbaar",
    budget_exceeded: "Budget overschreden",
  };
}

/** Format helper kept for tests / SW payload consistency. */
export function formatPushDue(iso: string): string {
  return formatDateNL(iso);
}
