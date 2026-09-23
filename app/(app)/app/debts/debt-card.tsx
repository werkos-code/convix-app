"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleDollarSign } from "lucide-react";

import { deactivateDebt, payDebt } from "@/app/actions/debts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/money/cents";

export type DebtView = {
  id: string;
  name: string;
  outstanding_cents: number;
  rules: { amount_cents: number; day_of_month: number }[];
};

export function DebtCard({ debt }: { debt: DebtView }) {
  const router = useRouter();
  const rule = debt.rules[0];
  const [showPay, setShowPay] = useState(false);
  const [amount, setAmount] = useState(
    rule
      ? (rule.amount_cents / 100).toFixed(2).replace(".", ",")
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPay() {
    setError(null);
    startTransition(async () => {
      const result = await payDebt({
        debtId: debt.id,
        amountEuros: amount,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowPay(false);
      router.refresh();
    });
  }

  function onDeactivate() {
    setError(null);
    startTransition(async () => {
      const result = await deactivateDebt({ id: debt.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="border-b border-slate-100/80 px-4 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="icon-orb size-11 shrink-0">
          <CircleDollarSign className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {debt.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {rule
                  ? `${formatEuro(rule.amount_cents)} / maand · dag ${rule.day_of_month}`
                  : "Geen betalingsregel"}
              </p>
            </div>
            <p className="shrink-0 text-right tabular-nums text-sm font-bold text-slate-900">
              {formatEuro(debt.outstanding_cents)}
              <span className="block text-[11px] font-medium text-slate-400">
                openstaand
              </span>
            </p>
          </div>

          {showPay ? (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white/60 p-3">
              <p className="text-xs text-slate-500">
                Aflossing verlaagt Free Spendable en het openstaande saldo.
              </p>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Aflossingsbedrag"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={onPay}
                >
                  {pending ? "Opslaan…" : "Aflossen"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setShowPay(false)}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setShowPay(true)}
              >
                Aflossen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={onDeactivate}
              >
                Verwijderen
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
