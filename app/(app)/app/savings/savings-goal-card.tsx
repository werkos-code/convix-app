"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PiggyBank } from "lucide-react";

import {
  contributeToSavings,
  deactivateSavingsGoal,
} from "@/app/actions/savings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/money/cents";

export type SavingsGoalView = {
  id: string;
  name: string;
  current_amount_cents: number;
  target_amount_cents: number | null;
  scheduled_amount_cents: number;
  contribution_day: number | null;
};

export function SavingsGoalCard({ goal }: { goal: SavingsGoalView }) {
  const router = useRouter();
  const [showContribute, setShowContribute] = useState(false);
  const [amount, setAmount] = useState(
    (goal.scheduled_amount_cents / 100).toFixed(2).replace(".", ","),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasTarget = goal.target_amount_cents != null && goal.target_amount_cents > 0;
  const pct = hasTarget
    ? Math.min(
        100,
        Math.round(
          (goal.current_amount_cents / goal.target_amount_cents!) * 100,
        ),
      )
    : null;
  const remaining = hasTarget
    ? Math.max(0, goal.target_amount_cents! - goal.current_amount_cents)
    : null;

  function onContribute() {
    setError(null);
    startTransition(async () => {
      const result = await contributeToSavings({
        goalId: goal.id,
        amountEuros: amount,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowContribute(false);
      router.refresh();
    });
  }

  function onDeactivate() {
    setError(null);
    startTransition(async () => {
      const result = await deactivateSavingsGoal({ id: goal.id });
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
          <PiggyBank className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {goal.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatEuro(goal.scheduled_amount_cents)} / maand · dag{" "}
                {goal.contribution_day ?? "—"}
              </p>
            </div>
            <p className="shrink-0 text-right tabular-nums text-sm font-bold text-slate-900">
              {formatEuro(goal.current_amount_cents)}
              {hasTarget && (
                <span className="block text-[11px] font-medium text-slate-400">
                  van {formatEuro(goal.target_amount_cents!)}
                </span>
              )}
            </p>
          </div>

          {pct != null && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100/80">
                <div
                  className="h-full rounded-full bg-brand-gradient"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {pct}% bereikt
                {remaining != null && remaining > 0
                  ? ` · nog ${formatEuro(remaining)}`
                  : remaining === 0
                    ? " · doel gehaald"
                    : null}
              </p>
            </div>
          )}

          {showContribute ? (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white/60 p-3">
              <p className="text-xs text-slate-500">
                Bijdrage verlaagt Free Spendable en verhoogt dit spaardoel.
              </p>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Bijdragebedrag"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={onContribute}
                >
                  {pending ? "Opslaan…" : "Bijdragen"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setShowContribute(false)}
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
                onClick={() => setShowContribute(true)}
              >
                Bijdragen
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
