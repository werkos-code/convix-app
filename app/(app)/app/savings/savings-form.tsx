"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createSavingsGoal } from "@/app/actions/savings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SavingsForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("0");
  const [target, setTarget] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [day, setDay] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSavingsGoal({
        name,
        currentAmountEuros: current,
        targetAmountEuros: target || null,
        scheduledAmountEuros: scheduled,
        contributionDay: Number(day),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setScheduled("");
      setTarget("");
      setCurrent("0");
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
        Nieuw spaardoel
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="savings-name">Naam</Label>
        <Input
          id="savings-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Noodfonds, vakantie…"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="savings-current">Al gespaard (€)</Label>
          <Input
            id="savings-current"
            inputMode="decimal"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="savings-target">Doel (€)</Label>
          <Input
            id="savings-target"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Optioneel"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="savings-scheduled">Per maand (€)</Label>
          <Input
            id="savings-scheduled"
            inputMode="decimal"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            placeholder="100"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="savings-day">Dag (1–28)</Label>
          <Input
            id="savings-day"
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
        De maandelijkse bijdrage verschijnt in Binnenkort en verlaagt Free
        Spendable tot je hem als betaald markeert (of hier bijdraagt).
      </p>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Doel toevoegen"}
      </Button>
    </form>
  );
}
