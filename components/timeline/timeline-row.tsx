"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw, Check } from "lucide-react";

import {
  registerRefund,
  settleObligation,
} from "@/app/actions/obligations";
import { formatDateNL } from "@/lib/dates/format";
import { formatEuro, type Cents } from "@/lib/money/cents";
import type { TimelineFilter } from "@/components/timeline/timeline-filters";
import type { TimelineItemStatus } from "@/components/timeline/timeline-item";
import { cn } from "@/lib/utils";

export type TimelineEntry = {
  id: string;
  date: string;
  name: string;
  amountCents: Cents;
  status: TimelineItemStatus;
  filterKeys: TimelineFilter[];
  /** When set, this row can be settled */
  obligationId?: string;
  /** Allow Terugboeking only while the linked obligation is still settled */
  canRefund?: boolean;
};

const statusStyles: Record<
  TimelineItemStatus,
  { label: string; className: string }
> = {
  actual: {
    label: "Werkelijk",
    className: "bg-emerald-50 text-emerald-800",
  },
  planned: {
    label: "Gepland",
    className: "bg-slate-100 text-slate-600",
  },
  returned: {
    label: "Nog te betalen",
    className: "bg-amber-50 text-amber-800",
  },
  settled: {
    label: "Afgerond",
    className: "bg-accent-soft text-accent",
  },
};

export function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSettle =
    !!entry.obligationId &&
    (entry.status === "planned" || entry.status === "returned");
  const canRefund = Boolean(entry.canRefund && entry.obligationId);
  const badge = statusStyles[entry.status];

  function onSettle() {
    if (!entry.obligationId) return;
    setError(null);
    startTransition(async () => {
      const result = await settleObligation({
        obligationId: entry.obligationId!,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onRefund() {
    if (!entry.obligationId) return;
    setError(null);
    const amountEuros = (Math.abs(entry.amountCents) / 100)
      .toFixed(2)
      .replace(".", ",");
    startTransition(async () => {
      const result = await registerRefund({
        obligationId: entry.obligationId!,
        amountEuros,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border-b border-slate-100/80 last:border-0">
      <div className="flex min-h-14 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-900">
              {entry.name}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDateNL(entry.date)}
          </p>
        </div>

        <p
          className={cn(
            "shrink-0 tabular-nums text-sm font-semibold",
            entry.amountCents < 0 ? "text-slate-900" : "text-emerald-700",
          )}
        >
          {formatEuro(entry.amountCents, { sign: true })}
        </p>

        {canSettle ? (
          <button
            type="button"
            disabled={pending}
            onClick={onSettle}
            aria-label="Markeer als betaald"
            title="Betaald"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
          >
            <Check className="size-4" strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}

        {canRefund ? (
          <button
            type="button"
            disabled={pending}
            onClick={onRefund}
            aria-label="Terugboeking"
            title="Terugboeking"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="px-3 pb-2 text-xs text-rose-600 sm:px-4" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
