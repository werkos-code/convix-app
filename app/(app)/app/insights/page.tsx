import Link from "next/link";
import {
  AlertTriangle,
  ChartLine,
  CheckCircle2,
  Info,
  OctagonAlert,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { loadDashboardData } from "@/lib/data/dashboard";
import type { Insight, InsightKind } from "@/lib/insights/deterministic";

export const metadata = {
  title: "Inzichten",
};

const severityStyles: Record<Insight["severity"], string> = {
  info: "glass-card",
  warning: "border border-amber-200/80 bg-amber-50/90",
  critical: "border border-red-200/80 bg-red-50/90",
};

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  critical: OctagonAlert,
} as const;

const severityLabels: Record<Insight["severity"], string> = {
  info: "Tip",
  warning: "Let op",
  critical: "Actie nodig",
};

const kindLabels: Record<InsightKind, string> = {
  budget_exceeded: "Budget",
  negative_free_spendable: "Vrij besteedbaar",
  savings_unaffordable: "Sparen",
  klarna_upcoming: "Klarna",
  large_payment: "Betaling",
  debt_upcoming: "Schuld",
};

export default async function InsightsPage() {
  const { user } = await requireUser();
  const data = await loadDashboardData(user.id);
  const insights = data.warnings;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inzichten"
        description="Automatische checks op vrij besteedbaar, budgetten en aankomende betalingen"
        icon={ChartLine}
      />

      {data.error ? (
        <p className="glass-chip rounded-2xl px-4 py-3 text-sm text-slate-600">
          {data.error}
        </p>
      ) : null}

      {insights.length === 0 && !data.error ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-[1.75rem] px-5 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-slate-900">Alles oké</p>
          <p className="max-w-xs text-sm text-slate-500">
            Geen waarschuwingen. Check Binnenkort op de home voor je planning.
          </p>
          <Link href="/app" className="text-sm font-semibold text-accent">
            Naar home
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => {
            const Icon = severityIcons[insight.severity];
            return (
              <li
                key={insight.id}
                className={`rounded-2xl px-4 py-4 ${severityStyles[insight.severity]}`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-slate-700"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {severityLabels[insight.severity]}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        {kindLabels[insight.kind]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {insight.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
