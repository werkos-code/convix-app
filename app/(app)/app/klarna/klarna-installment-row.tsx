"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelKlarnaPurchase } from "@/app/actions/klarna";
import { settleObligation } from "@/app/actions/obligations";
import { splitISODate } from "@/lib/dates/format";
import { formatEuro } from "@/lib/money/cents";
import { daysUntil } from "@/lib/periods/salary-period";
import { cn } from "@/lib/utils";

export type KlarnaRowItem = {
  installmentId: string;
  purchaseId: string;
  obligationId: string | null;
  name: string;
  dueOn: string;
  amountCents: number;
  plan: "pay_in_30" | "pay_in_3" | string;
  sequence: number;
  installmentCount: number;
  purchaseStatus: string;
};

function relativeDueLabel(dueOn: string, today: string): string {
  if (dueOn < today) {
    const overdue = daysUntil(today, dueOn);
    if (overdue <= 0) return "Vandaag";
    if (overdue === 1) return "1 dag te laat";
    return `${overdue} dagen te laat`;
  }
  const days = daysUntil(dueOn, today);
  if (days === 0) return "Vandaag";
  if (days === 1) return "Morgen";
  return `In ${days} dagen`;
}

function DatePill({ iso }: { iso: string }) {
  const parts = splitISODate(iso);
  if (!parts) {
    return (
      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-100 text-[10px] font-semibold text-slate-500">
        ?
      </div>
    );
  }
  return (
    <div
      className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#121218] text-white"
      aria-label={`${parts.day} ${parts.monthShort}`}
    >
      <span className="text-[9px] font-semibold uppercase leading-none tracking-wide text-white/70">
        {parts.monthShort}
      </span>
      <span className="mt-0.5 text-sm font-bold tabular-nums leading-none">
        {parts.day}
      </span>
    </div>
  );
}

export function KlarnaInstallmentRow({
  item,
  today,
}: {
  item: KlarnaRowItem;
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPayIn3 = item.plan === "pay_in_3";
  const canCancel = item.purchaseStatus === "open";
  const canSettle = Boolean(item.obligationId);

  function onSettle() {
    if (!item.obligationId) return;
    setError(null);
    startTransition(async () => {
      const result = await settleObligation({
        obligationId: item.obligationId!,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onCancel() {
    if (!canCancel) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelKlarnaPurchase({ id: item.purchaseId });
      if (!result.ok) {
        setError(result.error ?? "Annuleren mislukt");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="border-b border-slate-100/80 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <DatePill iso={item.dueOn} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {item.name}
            {isPayIn3 ? (
              <span className="ml-1.5 text-xs font-medium text-slate-400">
                {item.sequence}/{item.installmentCount}
              </span>
            ) : null}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xs",
              item.dueOn < today ? "text-rose-600" : "text-slate-500",
            )}
          >
            {relativeDueLabel(item.dueOn, today)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="tabular-nums text-sm font-bold text-slate-900">
            {formatEuro(item.amountCents)}
          </p>
          <div className="flex items-center gap-2">
            {canSettle ? (
              <button
                type="button"
                disabled={pending}
                onClick={onSettle}
                className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                {pending ? "…" : "Betaald"}
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                disabled={pending}
                onClick={onCancel}
                className="text-[11px] font-medium text-slate-400 hover:text-rose-600 disabled:opacity-50"
              >
                Annuleren
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {error ? (
        <p className="px-4 pb-3 text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
