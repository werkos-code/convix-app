import { formatDateNL } from "@/lib/dates/format";
import { formatEuro, type Cents } from "@/lib/money/cents";
import type { FreeSpendableBreakdown, ObligationKind } from "@/lib/types/domain";
import type { ISODate } from "@/lib/periods/salary-period";

export type InsightSeverity = "info" | "warning" | "critical";

export type InsightKind =
  | "budget_exceeded"
  | "negative_free_spendable"
  | "savings_unaffordable"
  | "klarna_upcoming"
  | "large_payment"
  | "debt_upcoming";

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  message: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface BudgetSpendStatus {
  categoryId: string;
  name: string;
  allocatedCents: Cents;
  spentCents: Cents;
}

export interface UpcomingObligationInsight {
  id: string;
  name: string;
  kind: ObligationKind;
  amountCents: Cents;
  remainingOpenCents: Cents;
  dueOn: ISODate;
}

export interface DeterministicInsightInput {
  breakdown: FreeSpendableBreakdown;
  budgets: BudgetSpendStatus[];
  upcomingObligations: UpcomingObligationInsight[];
  largePaymentThresholdCents?: Cents;
  upcomingDays?: number;
  today?: ISODate;
}

function daysBetween(from: ISODate, to: ISODate): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function buildDeterministicInsights(
  input: DeterministicInsightInput,
): Insight[] {
  const insights: Insight[] = [];
  const {
    breakdown,
    budgets,
    upcomingObligations,
    largePaymentThresholdCents = 50_000,
    upcomingDays = 14,
    today,
  } = input;

  for (const b of budgets) {
    if (b.spentCents > b.allocatedCents) {
      const over = b.spentCents - b.allocatedCents;
      insights.push({
        id: `budget_exceeded:${b.categoryId}`,
        kind: "budget_exceeded",
        severity: "warning",
        title: `${b.name} over budget`,
        message: `Je hebt ${formatEuro(over)} meer uitgegeven dan gepland. Opslaan blijft mogelijk.`,
        meta: {
          categoryId: b.categoryId,
          allocatedCents: b.allocatedCents,
          spentCents: b.spentCents,
          overCents: over,
        },
      });
    }
  }

  if (breakdown.freeSpendableCents < 0) {
    insights.push({
      id: "negative_free_spendable",
      kind: "negative_free_spendable",
      severity: "critical",
      title: "Vrij besteedbaar is negatief",
      message:
        "Verplichtingen en budgetten zijn hoger dan je huidige saldo. Bekijk Binnenkort en schaaf bij.",
      meta: { freeSpendableCents: breakdown.freeSpendableCents },
    });
  }

  if (
    breakdown.savingsOpenCents > 0 &&
    breakdown.savingsOpenCents > Math.max(0, breakdown.freeSpendableCents)
  ) {
    insights.push({
      id: "savings_unaffordable",
      kind: "savings_unaffordable",
      severity: "warning",
      title: "Spaarbijdrage lijkt te hoog",
      message: `Openstaande spaarbijdragen (${formatEuro(breakdown.savingsOpenCents)}) zijn hoger dan je vrij besteedbaar bedrag.`,
      meta: {
        savingsOpenCents: breakdown.savingsOpenCents,
        freeSpendableCents: breakdown.freeSpendableCents,
      },
    });
  }

  for (const k of upcomingObligations) {
    if (k.remainingOpenCents <= 0) continue;
    const days =
      today != null ? daysBetween(today, k.dueOn) : Number.POSITIVE_INFINITY;
    if (days < 0 || days > upcomingDays) continue;

    if (k.kind === "klarna_installment") {
      insights.push({
        id: `klarna_upcoming:${k.id}`,
        kind: "klarna_upcoming",
        severity: days <= 3 ? "warning" : "info",
        title:
          days === 0
            ? "Klarna vandaag verschuldigd"
            : `Klarna over ${days} ${days === 1 ? "dag" : "dagen"}`,
        message: `${k.name} · ${formatEuro(k.remainingOpenCents)} · ${formatDateNL(k.dueOn)}`,
        meta: {
          obligationId: k.id,
          dueOn: k.dueOn,
          amountCents: k.remainingOpenCents,
          daysUntil: days,
        },
      });
    }

    if (k.kind === "debt_payment") {
      insights.push({
        id: `debt_upcoming:${k.id}`,
        kind: "debt_upcoming",
        severity: days <= 3 ? "warning" : "info",
        title:
          days === 0
            ? "Aflossing vandaag"
            : `Aflossing over ${days} ${days === 1 ? "dag" : "dagen"}`,
        message: `${k.name} · ${formatEuro(k.remainingOpenCents)} · ${formatDateNL(k.dueOn)}`,
        meta: {
          obligationId: k.id,
          dueOn: k.dueOn,
          amountCents: k.remainingOpenCents,
          daysUntil: days,
        },
      });
    }
  }

  const largePayments = upcomingObligations.filter(
    (o) =>
      (o.kind === "fixed_expense" || o.kind === "one_time") &&
      o.remainingOpenCents >= largePaymentThresholdCents,
  );
  for (const a of largePayments) {
    insights.push({
      id: `large_payment:${a.id}`,
      kind: "large_payment",
      severity: "info",
      title: "Grote aankomende betaling",
      message: `${a.name} · ${formatEuro(a.remainingOpenCents)} op ${formatDateNL(a.dueOn)}`,
      meta: {
        obligationId: a.id,
        amountCents: a.remainingOpenCents,
        dueOn: a.dueOn,
      },
    });
  }

  const severityOrder: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return insights.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}
