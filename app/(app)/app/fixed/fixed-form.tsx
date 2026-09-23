"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createFixedExpenseRule } from "@/app/actions/fixed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maart" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Augustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

const selectClass =
  "flex min-h-12 w-full rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-base backdrop-blur";

export function FixedForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [recurrence, setRecurrence] = useState<"monthly" | "yearly" | "once">(
    "monthly",
  );
  const [day, setDay] = useState("1");
  const [month, setMonth] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createFixedExpenseRule({
        name,
        amountEuros: amount,
        category: category || undefined,
        recurrence,
        dayOfMonth: Number(day),
        monthOfYear: recurrence === "yearly" ? Number(month) : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setAmount("");
      setCategory("");
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
        Vaste last toevoegen
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fixed-name">Naam</Label>
        <Input
          id="fixed-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Huur"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fixed-amount">Bedrag (€)</Label>
        <Input
          id="fixed-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="850"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fixed-category">Label (optioneel)</Label>
        <Input
          id="fixed-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Wonen"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fixed-recurrence">Herhaling</Label>
          <select
            id="fixed-recurrence"
            value={recurrence}
            onChange={(e) =>
              setRecurrence(e.target.value as "monthly" | "yearly" | "once")
            }
            className={selectClass}
          >
            <option value="monthly">Maandelijks</option>
            <option value="yearly">Jaarlijks</option>
            <option value="once">Eenmalig</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fixed-day">Dag (1–28)</Label>
          <Input
            id="fixed-day"
            type="number"
            min={1}
            max={28}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
          />
        </div>
      </div>
      {recurrence === "yearly" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="fixed-month">Maand</Label>
          <select
            id="fixed-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={selectClass}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {recurrence === "once" && (
        <p className="text-xs text-slate-500">
          Eenmalig: plant op deze dag in de huidige salarisperiode.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Vaste last toevoegen"}
      </Button>
    </form>
  );
}
