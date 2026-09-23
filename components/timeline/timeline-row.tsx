"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw, CheckCircle2 } from "lucide-react";

import {
  registerRefund,
  settleObligation,
} from "@/app/actions/obligations";
import { Button } from "@/components/ui/button";
import { formatEuro, type Cents } from "@/lib/money/cents";
import type { TimelineFilter } from "@/components/timeline/timeline-filters";
import type { TimelineItemStatus } from "@/components/timeline/timeline-item";
import { TimelineItem } from "@/components/timeline/timeline-item";

export type TimelineEntry = {
  id: string;
  date: string;
  name: string;
  amountCents: Cents;
  status: TimelineItemStatus;
  filterKeys: TimelineFilter[];
  /** When set, this row can be settled and/or refunded */
  obligationId?: string;
};

export function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState(
    (Math.abs(entry.amountCents) / 100).toFixed(2).replace(".", ","),
  );

  const canSettle =
    !!entry.obligationId &&
    (entry.status === "planned" || entry.status === "returned");
  const canRefund =
    !!entry.obligationId &&
    (entry.status === "settled" || entry.status === "actual");

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
    startTransition(async () => {
      const result = await registerRefund({
        obligationId: entry.obligationId!,
        amountEuros: refundAmount,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowRefund(false);
      router.refresh();
    });
  }

  return (
    <div className="border-b border-slate-100/80 last:border-0">
      <TimelineItem
        date={entry.date}
        name={entry.name}
        amountCents={entry.amountCents}
        status={entry.status}
        className="px-2"
      />

      {(canSettle || canRefund) && (
        <div className="flex flex-wrap items-center gap-2 px-2 pb-3">
          {canSettle && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={onSettle}
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Betaald
            </Button>
          )}
          {canRefund && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setShowRefund((v) => !v)}
            >
              <RotateCcw className="size-4" aria-hidden />
              Terugboeking
            </Button>
          )}
        </div>
      )}

      {showRefund && canRefund && (
        <div className="mx-2 mb-3 flex flex-col gap-2 rounded-2xl bg-white/60 p-3">
          <p className="text-xs text-slate-500">
            Een terugboeking heropent de verplichting — die verdwijnt niet
            automatisch.
          </p>
          <label className="text-xs font-medium text-slate-600">
            Bedrag
            <input
              className="mt-1 min-h-11 w-full rounded-xl border border-white/70 bg-white/80 px-3 text-sm"
              inputMode="decimal"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </label>
          <p className="text-[11px] text-slate-400">
            Voorstel: {formatEuro(Math.abs(entry.amountCents))}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={onRefund}
            className="self-start"
          >
            {pending ? "Opslaan…" : "Terugboeking opslaan"}
          </Button>
        </div>
      )}

      {error && (
        <p className="px-2 pb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
