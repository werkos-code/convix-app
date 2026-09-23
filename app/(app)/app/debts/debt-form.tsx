"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createDebt } from "@/app/actions/debts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DebtForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [payment, setPayment] = useState("");
  const [day, setDay] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDebt({
        name,
        outstandingEuros: outstanding,
        paymentEuros: payment,
        paymentDay: Number(day),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setOutstanding("");
      setPayment("");
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
        Schuld toevoegen
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="debt-name">Naam</Label>
        <Input
          id="debt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="DUO, creditcard…"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="debt-outstanding">Openstaand saldo (€)</Label>
        <Input
          id="debt-outstanding"
          inputMode="decimal"
          value={outstanding}
          onChange={(e) => setOutstanding(e.target.value)}
          placeholder="5000"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="debt-payment">Maandelijkse aflossing (€)</Label>
          <Input
            id="debt-payment"
            inputMode="decimal"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            placeholder="150"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="debt-day">Dag (1–28)</Label>
          <Input
            id="debt-day"
            type="number"
            min={1}
            max={28}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
          />
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        De maandelijkse aflossing verschijnt in Binnenkort. Geen rente-engine —
        alleen wat jij plant.
      </p>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Schuld toevoegen"}
      </Button>
    </form>
  );
}
