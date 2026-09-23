"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createIncomeRule } from "@/app/actions/income";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_SALARY_DAY } from "@/lib/periods/salary-period";

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

export function IncomeForm({
  defaultDay = DEFAULT_SALARY_DAY,
}: {
  defaultDay?: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<"monthly" | "yearly" | "once">(
    "monthly",
  );
  const [day, setDay] = useState(String(defaultDay));
  const [month, setMonth] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createIncomeRule({
        name,
        amountEuros: amount,
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
        Inkomsten toevoegen
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="income-name">Naam</Label>
        <Input
          id="income-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Salaris"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="income-amount">Bedrag (€)</Label>
        <Input
          id="income-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="income-recurrence">Herhaling</Label>
          <select
            id="income-recurrence"
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
          <Label htmlFor="income-day">Dag (1–28)</Label>
          <Input
            id="income-day"
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
          <Label htmlFor="income-month">Maand</Label>
          <select
            id="income-month"
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
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Inkomsten toevoegen"}
      </Button>
    </form>
  );
}
