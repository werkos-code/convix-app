"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateAccount } from "@/app/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/money/cents";
import type { Account } from "@/lib/types/domain";

export function AccountRowActions({ account }: { account: Account }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [balance, setBalance] = useState(
    (account.last_confirmed_balance_cents / 100).toFixed(2).replace(".", ","),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveBalance() {
    setError(null);
    startTransition(async () => {
      const result = await updateAccount({
        id: account.id,
        balanceEuros: balance,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await updateAccount({
        id: account.id,
        isActive: !account.is_active,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing ? (
          <>
            <Input
              className="w-28"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              aria-label="Saldo"
            />
            <Button
              type="button"
              size="sm"
              onClick={saveBalance}
              disabled={pending}
            >
              Opslaan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Annuleren
            </Button>
          </>
        ) : (
          <>
            <p className="tabular-nums text-sm font-medium text-slate-900">
              {formatEuro(account.last_confirmed_balance_cents)}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              disabled={pending}
            >
              Bewerken
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={toggleActive}
              disabled={pending}
            >
              {account.is_active ? "Deactiveren" : "Activeren"}
            </Button>
          </>
        )}
      </div>
      {error ? (
        <p className="text-right text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
