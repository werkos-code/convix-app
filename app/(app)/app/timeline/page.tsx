import { Suspense } from "react";
import { LayoutList } from "lucide-react";

import {
  TimelineClient,
  type TimelineEntry,
} from "./timeline-client";
import { PanelSkeleton } from "@/components/layout/page-loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import type { TimelineFilter } from "@/components/timeline/timeline-filters";
import type { TimelineItemStatus } from "@/components/timeline/timeline-item";
import { isNextControlFlowError } from "@/lib/auth/control-flow";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateRangeNL } from "@/lib/dates/format";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { todayInTimezone } from "@/lib/periods/salary-period";

export const metadata = {
  title: "Tijdlijn",
};

function statusFromObligation(status: string): TimelineItemStatus {
  if (status === "settled") return "settled";
  if (status === "returned_open") return "returned";
  return "planned";
}

function filtersForKind(
  kind: string,
  type?: string,
  options?: { returnedOpen?: boolean },
): TimelineFilter[] {
  const keys: TimelineFilter[] = [];
  if (kind === "income" || type === "income") keys.push("Inkomsten");
  if (
    kind === "fixed_expense" ||
    kind === "one_time" ||
    type === "expense" ||
    type === "payment"
  ) {
    keys.push("Uitgaven");
  }
  if (kind === "klarna_installment") keys.push("Klarna");
  if (kind === "savings_contribution" || type === "savings_contribution") {
    keys.push("Sparen");
  }
  if (kind === "debt_payment" || type === "debt_payment") keys.push("Schuld");
  if (type === "refund_return") keys.push("Uitgaven");
  /** Failed debit / returned payment is still owed → Schuld */
  if (options?.returnedOpen && kind !== "income") {
    if (!keys.includes("Schuld")) keys.push("Schuld");
  }
  return keys;
}

function statusIsPlanned(status: string) {
  return ["planned", "due", "partially_paid", "returned_open"].includes(status);
}

async function TimelineContent() {
  const { user, supabase } = await requireUser();

  let entries: TimelineEntry[] = [];
  let periodLabel: string | null = null;
  let today: string | null = null;
  let loadError: string | null = null;

  try {
    const { period, profile } = await ensureOpenPeriod(supabase, user.id);
    periodLabel = formatDateRangeNL(period.starts_on, period.ends_on);
    today = todayInTimezone(profile.timezone);

    const [ledgerRes, obligationsRes] = await Promise.all([
      supabase
        .from("ledger_events")
        .select("id, name, amount_cents, occurred_on, type, obligation_id")
        .eq("user_id", user.id)
        .eq("period_id", period.id)
        .order("occurred_on", { ascending: false }),
      supabase
        .from("obligations")
        .select("id, name, remaining_open_cents, due_on, kind, status")
        .eq("user_id", user.id)
        .eq("period_id", period.id)
        .order("due_on", { ascending: true }),
    ]);

    if (ledgerRes.error) throw ledgerRes.error;
    if (obligationsRes.error) throw obligationsRes.error;

    const obligations = obligationsRes.data ?? [];
    const oblById = new Map(obligations.map((o) => [o.id, o]));

    const ledgerEntries: TimelineEntry[] = (ledgerRes.data ?? [])
      .filter(
        (e) => e.type !== "refund_return" && e.type !== "balance_adjustment",
      )
      .map((e) => {
        const sign = e.type === "income" ? 1 : -1;
        const linked = e.obligation_id
          ? oblById.get(e.obligation_id)
          : undefined;
        const filterKeys = filtersForKind("", e.type);
        const canRefund =
          Boolean(e.obligation_id) && linked?.status === "settled";
        return {
          id: `ledger-${e.id}`,
          date: e.occurred_on,
          name: e.name,
          amountCents: sign * Math.abs(e.amount_cents),
          status: "actual" as const,
          filterKeys: filterKeys.length
            ? filterKeys
            : (["Uitgaven"] as TimelineFilter[]),
          obligationId: e.obligation_id ?? undefined,
          canRefund,
        };
      });

    const obligationEntries: TimelineEntry[] = obligations
      .filter((o) => statusIsPlanned(o.status))
      .map((o) => {
        const isIncome = o.kind === "income";
        const returnedOpen = o.status === "returned_open";
        const filterKeys: TimelineFilter[] = [
          "Gepland",
          ...filtersForKind(o.kind, undefined, { returnedOpen }),
        ];
        return {
          id: `obl-${o.id}`,
          date: o.due_on,
          name: o.name,
          amountCents: isIncome
            ? Math.abs(o.remaining_open_cents)
            : -Math.abs(o.remaining_open_cents),
          status: statusFromObligation(o.status),
          filterKeys,
          obligationId: o.id,
        };
      });

    entries = [...ledgerEntries, ...obligationEntries].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
    );
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    loadError = e instanceof Error ? e.message : "Tijdlijn kon niet laden";
  }

  return (
    <>
      {loadError ? (
        <p className="glass-chip rounded-2xl px-4 py-3 text-sm text-slate-600">
          {loadError}
        </p>
      ) : null}
      <TimelineClient
        entries={entries}
        periodLabel={periodLabel}
        today={today}
      />
    </>
  );
}

export default function TimelinePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Tijdlijn" icon={LayoutList} />
      <Suspense fallback={<PanelSkeleton rows={6} />}>
        <TimelineContent />
      </Suspense>
    </div>
  );
}
