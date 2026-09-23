"use client";

import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { confirmPeriodBalances } from "@/app/actions/balances";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/money/cents";

type AccountRow = {
  id: string;
  name: string;
  type: string;
  last_confirmed_balance_cents: number;
};

const typeLabels: Record<string, string> = {
  checking: "Betaalrekening",
  savings: "Spaarrekening",
  other: "Overig",
};

export function ConfirmBalancesForm({
  periodId,
  accounts,
}: {
  periodId: string;
  accounts: AccountRow[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      accounts.map((a) => [
        a.id,
        (a.last_confirmed_balance_cents / 100).toFixed(2).replace(".", ","),
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await confirmPeriodBalances({
        periodId,
        balances: accounts.map((a) => ({
          accountId: a.id,
          actualEuros: values[a.id] ?? "0",
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/app");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {accounts.map((a) => (
        <div
          key={a.id}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Landmark className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={`bal-${a.id}`}>{a.name}</Label>
                <span className="text-xs text-slate-500">
                  {typeLabels[a.type] ?? a.type}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Laatst bevestigd {formatEuro(a.last_confirmed_balance_cents)}
              </p>
            </div>
          </div>
          <Input
            id={`bal-${a.id}`}
            inputMode="decimal"
            value={values[a.id] ?? ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [a.id]: e.target.value }))
            }
            required
          />
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending || accounts.length === 0}>
        {pending ? "Bevestigen…" : "Saldi bevestigen"}
      </Button>
    </form>
  );
}
