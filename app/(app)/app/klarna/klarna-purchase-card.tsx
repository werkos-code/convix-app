"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";

import { cancelKlarnaPurchase } from "@/app/actions/klarna";
import { Button } from "@/components/ui/button";
import { formatDateNL } from "@/lib/dates/format";
import { formatEuro } from "@/lib/money/cents";
import { cn } from "@/lib/utils";

export type KlarnaInstallmentView = {
  id: string;
  sequence: number;
  due_on: string;
  amount_cents: number;
  status: string;
};

export type KlarnaPurchaseView = {
  id: string;
  name: string;
  total_cents: number;
  plan: string;
  status: string;
  purchased_on: string;
  installments: KlarnaInstallmentView[];
};

const planLabels: Record<string, string> = {
  pay_in_30: "Betaal in 30",
  pay_in_3: "Betaal in 3",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  paid: "Afgerond",
  cancelled: "Geannuleerd",
  planned: "Gepland",
  due: "Verschuldigd",
  partially_paid: "Deels betaald",
  settled: "Betaald",
  returned_open: "Teruggeboekt",
};

export function KlarnaPurchaseCard({
  purchase,
}: {
  purchase: KlarnaPurchaseView;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(purchase.status === "open");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openCents = purchase.installments
    .filter((i) =>
      ["planned", "due", "partially_paid", "returned_open"].includes(i.status),
    )
    .reduce((sum, i) => sum + i.amount_cents, 0);

  function onCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelKlarnaPurchase({ id: purchase.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="border-b border-slate-100/80 last:border-0">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="icon-orb size-11 shrink-0">
          <CreditCard className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {purchase.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDateNL(purchase.purchased_on)} ·{" "}
            {planLabels[purchase.plan] ?? purchase.plan} ·{" "}
            {statusLabels[purchase.status] ?? purchase.status}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular-nums text-sm font-semibold text-slate-900">
            {formatEuro(purchase.total_cents)}
          </p>
          {purchase.status === "open" && openCents > 0 && (
            <p className="text-[11px] text-slate-500">
              Open {formatEuro(openCents)}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ul className="overflow-hidden rounded-2xl bg-white/60">
            {purchase.installments.map((inst) => (
              <li
                key={inst.id}
                className="flex items-center justify-between gap-3 border-b border-slate-100/60 px-3 py-2.5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Termijn {inst.sequence}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDateNL(inst.due_on)} ·{" "}
                    {statusLabels[inst.status] ?? inst.status}
                  </p>
                </div>
                <p
                  className={cn(
                    "tabular-nums text-sm font-semibold",
                    inst.status === "settled"
                      ? "text-emerald-700"
                      : "text-slate-900",
                  )}
                >
                  {formatEuro(inst.amount_cents)}
                </p>
              </li>
            ))}
          </ul>

          {purchase.status === "open" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={onCancel}
              >
                {pending ? "…" : "Annuleren"}
              </Button>
              <p className="text-[11px] text-slate-400">
                Betaald markeren doe je op de tijdlijn.
              </p>
            </div>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
