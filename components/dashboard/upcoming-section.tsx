import Link from "next/link";
import {
  Building2,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { formatDateNL } from "@/lib/dates/format";
import { formatEuro, type Cents } from "@/lib/money/cents";
import { daysUntil } from "@/lib/periods/salary-period";
import type { Obligation, ObligationKind } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  ObligationKind,
  { label: string; icon: LucideIcon }
> = {
  income: { label: "Inkomen", icon: Wallet },
  fixed_expense: { label: "Vaste last", icon: Building2 },
  one_time: { label: "Eenmalig", icon: Building2 },
  klarna_installment: { label: "Klarna", icon: CreditCard },
  savings_contribution: { label: "Sparen", icon: PiggyBank },
  debt_payment: { label: "Schuld", icon: CircleDollarSign },
};

function relativeDueLabel(dueOn: string, today: string): string {
  const days = daysUntil(dueOn, today);
  if (dueOn < today) {
    const overdue = daysUntil(today, dueOn);
    if (overdue === 0) return "Vandaag";
    if (overdue === 1) return "1 dag te laat";
    return `${overdue} dagen te laat`;
  }
  if (days === 0) return "Vandaag";
  if (days === 1) return "Morgen";
  if (days <= 7) return `Over ${days} dagen`;
  return formatDateNL(dueOn);
}

function groupByDate(items: Obligation[]): { date: string; items: Obligation[] }[] {
  const map = new Map<string, Obligation[]>();
  for (const o of items) {
    const list = map.get(o.due_on) ?? [];
    list.push(o);
    map.set(o.due_on, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, group]) => ({ date, items: group }));
}

export function UpcomingSection({
  items,
  today,
}: {
  items: Obligation[];
  today: string;
}) {
  const sorted = [...items].sort((a, b) =>
    a.due_on < b.due_on ? -1 : a.due_on > b.due_on ? 1 : 0,
  );
  const groups = groupByDate(sorted);

  const outgoingCents = sorted
    .filter((o) => o.kind !== "income")
    .reduce((sum, o) => sum + Math.abs(o.remaining_open_cents), 0) as Cents;
  const incomingCents = sorted
    .filter((o) => o.kind === "income")
    .reduce((sum, o) => sum + Math.abs(o.remaining_open_cents), 0) as Cents;

  return (
    <section className="glass-card overflow-hidden rounded-[1.75rem]">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-sm font-bold text-slate-900">Binnenkort</h2>
        <Link
          href="/app/timeline"
          className="shrink-0 text-xs font-semibold text-accent"
        >
          Tijdlijn
        </Link>
      </div>

      {sorted.length > 0 && (
        <div className="mx-5 mt-4 flex flex-wrap gap-2">
          {outgoingCents > 0 && (
            <p className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
              Nog te betalen {formatEuro(outgoingCents)}
            </p>
          )}
          {incomingCents > 0 && (
            <p className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              Nog te ontvangen {formatEuro(incomingCents)}
            </p>
          )}
          <p className="rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600">
            {sorted.length} {sorted.length === 1 ? "item" : "items"}
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500">
          Niets openstaands deze periode. Nieuwe vaste lasten, Klarna of
          inkomsten verschijnen hier automatisch.
        </p>
      ) : (
        <div className="mt-2 pb-2">
          {groups.map(({ date, items: dayItems }) => (
            <div key={date} className="border-t border-slate-100/80 first:border-0">
              <div className="flex items-baseline justify-between gap-2 px-5 pt-3 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {relativeDueLabel(date, today)}
                </p>
                <p className="text-[11px] tabular-nums text-slate-400">
                  {formatDateNL(date)}
                </p>
              </div>
              <ul>
                {dayItems.map((o) => {
                  const isIncome = o.kind === "income";
                  const returnedOpen =
                    o.status === "returned_open" && !isIncome;
                  const meta = returnedOpen
                    ? KIND_META.debt_payment
                    : (KIND_META[o.kind] ?? KIND_META.one_time);
                  const Icon = meta.icon;
                  const amount = isIncome
                    ? Math.abs(o.remaining_open_cents)
                    : -Math.abs(o.remaining_open_cents);
                  const overdue = o.due_on < today && !isIncome;

                  return (
                    <li
                      key={o.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <div className="icon-orb size-11 shrink-0">
                        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {o.name}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-xs",
                            overdue || returnedOpen
                              ? "font-medium text-rose-600"
                              : "text-slate-500",
                          )}
                        >
                          {returnedOpen
                            ? "Schuld · mislukte afschrijving"
                            : meta.label}
                          {!returnedOpen && o.status === "partially_paid"
                            ? " · deels betaald"
                            : null}
                          {overdue ? " · te laat" : null}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "shrink-0 tabular-nums text-sm font-bold",
                          isIncome ? "text-emerald-700" : "text-slate-900",
                        )}
                      >
                        {formatEuro(amount, { sign: true })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
