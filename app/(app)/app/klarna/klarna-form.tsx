"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { createKlarnaPurchase } from "@/app/actions/klarna";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateNL } from "@/lib/dates/format";
import { buildKlarnaInstallments } from "@/lib/klarna/installments";
import { formatEuro, parseEuroInput } from "@/lib/money/cents";

const selectClass =
  "flex min-h-12 w-full rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-base backdrop-blur";

export function KlarnaForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [purchasedOn, setPurchasedOn] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [plan, setPlan] = useState<"pay_in_30" | "pay_in_3">("pay_in_30");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => {
    const cents = parseEuroInput(amount);
    if (cents == null || cents <= 0 || !purchasedOn) return [];
    try {
      return buildKlarnaInstallments(cents, purchasedOn, plan);
    } catch {
      return [];
    }
  }, [amount, purchasedOn, plan]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createKlarnaPurchase({
        name,
        amountEuros: amount,
        purchasedOn,
        plan,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setAmount("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="glass-card flex flex-col gap-4 rounded-[1.75rem] p-5"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Plus className="size-5 text-accent" aria-hidden />
        Nieuwe aankoop
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="klarna-name">Wat heb je gekocht?</Label>
        <Input
          id="klarna-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sneakers, telefoon…"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="klarna-amount">Totaalbedrag (€)</Label>
        <Input
          id="klarna-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="klarna-date">Gekocht op</Label>
        <Input
          id="klarna-date"
          type="date"
          value={purchasedOn}
          onChange={(e) => setPurchasedOn(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="klarna-plan">Plan</Label>
        <select
          id="klarna-plan"
          value={plan}
          onChange={(e) =>
            setPlan(e.target.value as "pay_in_30" | "pay_in_3")
          }
          className={selectClass}
        >
          <option value="pay_in_30">Betaal in 30 dagen</option>
          <option value="pay_in_3">Betaal in 3 termijnen</option>
        </select>
      </div>

      {preview.length > 0 && (
        <div className="rounded-2xl bg-white/60 px-3 py-3">
          <p className="text-xs font-semibold text-slate-600">
            Betaalplan
          </p>
          <ul className="mt-2 space-y-1.5">
            {preview.map((p) => (
              <li
                key={p.sequence}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-slate-600">
                  {p.isImmediate ? "Nu" : formatDateNL(p.dueOn)}
                  {p.isImmediate ? (
                    <span className="ml-1 text-[11px] text-slate-400">
                      ({formatDateNL(p.dueOn)})
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums font-semibold text-slate-900">
                  {formatEuro(p.amountCents)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Elke termijn reserveert Free Spendable in de salarisperiode waarin
            hij valt. Markeer als betaald via de tijdlijn.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Klarna toevoegen"}
      </Button>
    </form>
  );
}
