"use client";

import { Landmark, PiggyBank } from "lucide-react";
import { useState, useTransition } from "react";

import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const [displayName, setDisplayName] = useState("");
  const [accountName, setAccountName] = useState("Hoofdrekening");
  const [balance, setBalance] = useState("");
  const [includeSavings, setIncludeSavings] = useState(false);
  const [savingsName, setSavingsName] = useState("Spaarrekening");
  const [savingsBalance, setSavingsBalance] = useState("0");
  const [salaryDay, setSalaryDay] = useState("24");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const accounts: Array<{
        name: string;
        type: "checking" | "savings" | "other";
        balanceEuros: string;
      }> = [
        {
          name: accountName,
          type: "checking",
          balanceEuros: balance,
        },
      ];

      if (includeSavings) {
        accounts.push({
          name: savingsName,
          type: "savings",
          balanceEuros: savingsBalance || "0",
        });
      }

      const result = await completeOnboarding({
        displayName: displayName || null,
        salaryDay: Number(salaryDay),
        seedDefaults: true,
        accounts,
      });
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="display-name">Je naam (optioneel)</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="salary-day">Salarisdag</Label>
        <Input
          id="salary-day"
          type="number"
          min={1}
          max={28}
          value={salaryDay}
          onChange={(e) => setSalaryDay(e.target.value)}
          required
        />
        <p className="text-xs text-slate-500">
          Periode loopt van deze dag tot de dag vóór dezelfde datum volgende
          maand. Standaard is de 24e.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Landmark className="size-5 text-accent" aria-hidden />
          Betaalrekening
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Je belangrijkste besteedbare saldo — Vrij besteedbaar start hier.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-name">Rekeningnaam</Label>
            <Input
              id="account-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-balance">Huidig saldo (€)</Label>
            <Input
              id="account-balance"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
        </div>
      </div>

      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3">
        <input
          type="checkbox"
          className="size-5 accent-blue-600"
          checked={includeSavings}
          onChange={(e) => setIncludeSavings(e.target.checked)}
        />
        <span className="text-sm text-slate-800">
          Ook een spaarrekening toevoegen
        </span>
      </label>

      {includeSavings ? (
        <div className="rounded-2xl border border-border bg-white p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <PiggyBank className="size-5 text-accent" aria-hidden />
            Spaarrekening
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Apart bijgehouden — telt niet mee in Vrij besteedbaar.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="savings-name">Rekeningnaam</Label>
              <Input
                id="savings-name"
                value={savingsName}
                onChange={(e) => setSavingsName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="savings-balance">Huidig saldo (€)</Label>
              <Input
                id="savings-balance"
                inputMode="decimal"
                value={savingsBalance}
                onChange={(e) => setSavingsBalance(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>
      ) : null}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Instellen…" : "Setup afronden"}
      </Button>
    </form>
  );
}
