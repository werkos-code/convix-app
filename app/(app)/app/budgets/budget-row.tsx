"use client";

import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateBudgetCategory } from "@/app/actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro, type Cents } from "@/lib/money/cents";

export type BudgetRowData = {
  categoryId: string;
  name: string;
  allocatedCents: Cents;
  spentCents: Cents;
  remainingCents: Cents;
  overCents: Cents;
};

export function BudgetRow({
  budget,
  periodId,
}: {
  budget: BudgetRowData;
  periodId: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(
    (budget.allocatedCents / 100).toFixed(2).replace(".", ","),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pct =
    budget.allocatedCents > 0
      ? Math.min(100, (budget.spentCents / budget.allocatedCents) * 100)
      : 0;

  function saveAllocation() {
    if (!periodId) {
      setError("Geen open periode");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateBudgetCategory({
        id: budget.categoryId,
        allocatedEuros: amount,
        periodId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function deactivate() {
    setError(null);
    startTransition(async () => {
      const result = await updateBudgetCategory({
        id: budget.categoryId,
        isActive: false,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="icon-orb size-11 shrink-0">
          <Wallet className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-900">{budget.name}</span>
            {!editing && (
              <span className="tabular-nums text-sm font-medium text-slate-900">
                {formatEuro(budget.spentCents)} /{" "}
                {formatEuro(budget.allocatedCents)}
              </span>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100/80">
            <div
              className="h-full rounded-full bg-brand-gradient"
              style={{ width: `${pct}%` }}
            />
          </div>
          {budget.overCents > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Over {formatEuro(budget.overCents)} — opslaan blijft mogelijk
            </p>
          )}
          {editing ? (
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-600">
                Budget deze periode (€)
                <Input
                  className="mt-1"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <p className="text-[11px] text-slate-400">
                Alleen deze periode. Volgende periode gebruikt opnieuw het
                standaardbedrag.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={saveAllocation}
                >
                  Opslaan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setEditing(false)}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || !periodId}
                onClick={() => setEditing(true)}
              >
                Aanpassen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={deactivate}
              >
                Verwijderen
              </Button>
            </div>
          )}
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
