import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  PiggyBank,
  Settings,
  Wallet,
} from "lucide-react";

import { ConvixMark } from "@/components/brand/logo";
import { DebtsSection } from "@/components/dashboard/debts-section";
import { PeriodSwitcher } from "@/components/dashboard/period-switcher";
import { UpcomingSection } from "@/components/dashboard/upcoming-section";
import { WarningBanner } from "@/components/dashboard/warning-banner";
import { HomePageSkeleton } from "@/components/layout/page-loading-skeleton";
import { FreeSpendableHero } from "@/components/money/free-spendable-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import {
  loadDashboardData,
  type DashboardPeriodView,
} from "@/lib/data/dashboard";
import { formatDateRangeShortNL } from "@/lib/dates/format";
import { formatEuro, type Cents } from "@/lib/money/cents";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Home",
};

function StatChip({
  label,
  amountCents,
  icon: Icon,
  tone,
}: {
  label: string;
  amountCents: Cents;
  icon: typeof Wallet;
  tone: "income" | "expense" | "savings";
}) {
  const toneClass =
    tone === "income"
      ? "text-emerald-600 bg-emerald-50"
      : tone === "expense"
        ? "text-rose-500 bg-rose-50"
        : "text-accent bg-accent-soft";

  return (
    <div className="glass-chip flex min-w-0 flex-1 flex-col gap-2 rounded-3xl px-3 py-3.5">
      <div className={cn("flex size-8 items-center justify-center rounded-full", toneClass)}>
        <Icon className="size-4" strokeWidth={2} aria-hidden />
      </div>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="truncate text-sm font-bold tabular-nums text-slate-900">
        {formatEuro(amountCents)}
      </p>
    </div>
  );
}

function parsePeriodView(
  params: Record<string, string | string[] | undefined>,
): DashboardPeriodView {
  const periodeParam = Array.isArray(params.periode)
    ? params.periode[0]
    : params.periode;
  return periodeParam === "volgende" ? "next" : "current";
}

async function DashboardPeriodSwitcher({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const periodView = parsePeriodView(params);
  const { user } = await requireUser();
  const data = await loadDashboardData(user.id, { periodView });

  const currentRange = data.openPeriod
    ? formatDateRangeShortNL(data.openPeriod.starts_on, data.openPeriod.ends_on)
    : data.period
      ? formatDateRangeShortNL(data.period.starts_on, data.period.ends_on)
      : "";
  const nextRange = data.nextPeriod
    ? formatDateRangeShortNL(data.nextPeriod.starts_on, data.nextPeriod.ends_on)
    : null;

  if (!currentRange) return <span />;

  const showingNext = data.periodView === "next" && !!nextRange;

  return (
    <PeriodSwitcher
      label={showingNext ? nextRange! : currentRange}
      eyebrow={showingNext ? "Volgende periode" : "Deze periode"}
      prevHref={showingNext ? "/app" : null}
      nextHref={!showingNext && nextRange ? "/app?periode=volgende" : null}
      compact
    />
  );
}

async function DashboardBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const periodView = parsePeriodView(params);

  const { user, supabase } = await requireUser();
  const data = await loadDashboardData(user.id, { periodView });
  const b = data.breakdown;

  const [{ data: debtRows }, { data: ruleRows }] = await Promise.all([
    supabase
      .from("debts")
      .select("id, name, outstanding_cents")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("debt_payment_rules")
      .select("debt_id, amount_cents")
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  const monthlyByDebt = new Map<string, number>();
  for (const r of ruleRows ?? []) {
    monthlyByDebt.set(
      r.debt_id,
      (monthlyByDebt.get(r.debt_id) ?? 0) + r.amount_cents,
    );
  }

  const debts = (debtRows ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    outstandingCents: d.outstanding_cents as Cents,
    monthlyCents: (monthlyByDebt.get(d.id) ?? 0) as Cents,
  }));

  return (
    <>
      {data.error ? (
        <p className="glass-chip rounded-2xl px-4 py-3 text-sm text-slate-600">
          {data.error.includes("Missing NEXT_PUBLIC_SUPABASE")
            ? "Supabase is niet geconfigureerd. Voeg je project-URL en anon key toe."
            : data.error}
        </p>
      ) : null}

      {!data.balanceConfirmed && !data.isPreview && data.openPeriod && (
        <Link
          href="/app/balances/confirm"
          className="glass-chip flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-white/80"
        >
          <CircleAlert className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="flex-1">
            Nieuwe salarisperiode — bevestig je banksaldo
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              Verwacht: {formatEuro(data.openPeriod.expected_available_cents)}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden />
        </Link>
      )}

      <FreeSpendableHero
        amountCents={b.freeSpendableCents}
        daysUntilSalary={data.daysUntilSalary}
        isPreview={data.isPreview}
      />

      <div className="flex gap-2.5">
        <StatChip
          label="Inkomsten"
          amountCents={b.incomeTotalCents}
          icon={ArrowDownLeft}
          tone="income"
        />
        <StatChip
          label="Uitgaven"
          amountCents={b.expenseTotalCents}
          icon={ArrowUpRight}
          tone="expense"
        />
        <StatChip
          label="Sparen"
          amountCents={data.savingsTotalCents}
          icon={PiggyBank}
          tone="savings"
        />
      </div>

      <UpcomingSection
        items={data.upcoming}
        today={data.today ?? new Date().toISOString().slice(0, 10)}
      />

      <WarningBanner insights={data.warnings} />

      {data.budgets.length > 0 && (
        <section className="glass-card overflow-hidden rounded-[1.75rem]">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-sm font-bold text-slate-900">Budgetten</h2>
            <Link
              href="/app/uitgaand?tab=budgetten"
              className="text-xs font-semibold text-accent"
            >
              Alles
            </Link>
          </div>
          <ul className="space-y-3 px-5 py-4">
            {data.budgets.slice(0, 4).map((budget) => {
              const pct = Math.min(
                100,
                Math.round(
                  (budget.spentCents / Math.max(1, budget.allocatedCents)) * 100,
                ),
              );
              return (
                <li key={budget.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {budget.name}
                    </span>
                    <span className="tabular-nums text-xs font-semibold text-slate-500">
                      {formatEuro(budget.spentCents)} /{" "}
                      {formatEuro(budget.allocatedCents)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100/80">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        budget.overCents > 0
                          ? "bg-rose-400"
                          : "bg-brand-gradient",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <DebtsSection debts={debts} />
    </>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 pt-1">
        <Link href="/app" className="justify-self-start" aria-label="Convix home">
          <ConvixMark className="size-8" />
        </Link>
        <div className="flex justify-center justify-self-center">
          <Suspense
            fallback={<Skeleton className="h-9 w-40 rounded-full bg-white/60" />}
          >
            <DashboardPeriodSwitcher searchParams={searchParams} />
          </Suspense>
        </div>
        <Link
          href="/app/settings"
          className="flex size-11 shrink-0 items-center justify-center justify-self-end rounded-full bg-white/70 text-slate-700 shadow-sm ring-1 ring-white/80 backdrop-blur transition-colors hover:bg-white hover:text-accent"
          aria-label="Instellingen"
        >
          <Settings className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
      </header>

      <Suspense fallback={<HomePageSkeleton showChrome={false} />}>
        <DashboardBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
