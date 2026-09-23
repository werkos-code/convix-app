"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createQuickExpense } from "@/app/actions/expenses";
import { createDebt } from "@/app/actions/debts";
import { createFixedExpenseRule } from "@/app/actions/fixed";
import { createKlarnaPurchase } from "@/app/actions/klarna";
import {
  contributeToSavings,
  createSavingsGoal,
} from "@/app/actions/savings";
import { AmountInput } from "@/components/money/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ExpenseKind =
  | "expense"
  | "subscription"
  | "debt"
  | "savings"
  | "klarna";

type Category = { id: string; name: string };
type GoalOption = { id: string; name: string; suggestedEuros: string };

const KINDS: { id: ExpenseKind; label: string }[] = [
  { id: "expense", label: "Uitgave" },
  { id: "subscription", label: "Abonnement" },
  { id: "debt", label: "Schuld" },
  { id: "savings", label: "Sparen" },
  { id: "klarna", label: "Klarna" },
];

export function ExpenseForm({
  categories = [],
  savingsGoals = [],
  defaultDay,
  today,
}: {
  categories?: Category[];
  savingsGoals?: GoalOption[];
  defaultDay: number;
  today: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ExpenseKind>("expense");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState(String(defaultDay));
  const [newDebtOutstanding, setNewDebtOutstanding] = useState("");
  const [goalId, setGoalId] = useState(savingsGoals[0]?.id ?? "");
  const [klarnaPlan, setKlarnaPlan] = useState<"pay_in_30" | "pay_in_3">(
    "pay_in_30",
  );
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  const creatingNewGoal = kind === "savings" && savingsGoals.length === 0;

  function resetForm() {
    setAmount("");
    setName("");
    setCategoryId("");
    setNewDebtOutstanding("");
    setError(null);
  }

  function submit(mode: "home" | "another") {
    setError(null);
    startTransition(async () => {
      let result: { ok: true } | { ok: false; error: string };

      if (kind === "expense") {
        result = await createQuickExpense({
          amountEuros: amount,
          name,
          categoryId: categoryId || null,
        });
      } else if (kind === "subscription") {
        result = await createFixedExpenseRule({
          name,
          amountEuros: amount,
          recurrence: "monthly",
          dayOfMonth: Number(dayOfMonth) || defaultDay,
        });
      } else if (kind === "debt") {
        result = await createDebt({
          name,
          outstandingEuros: newDebtOutstanding || amount,
          paymentEuros: amount,
          paymentDay: Number(dayOfMonth) || defaultDay,
        });
      } else if (kind === "savings") {
        if (creatingNewGoal) {
          result = await createSavingsGoal({
            name,
            scheduledAmountEuros: amount,
            contributionDay: Number(dayOfMonth) || defaultDay,
            currentAmountEuros: "0",
          });
        } else {
          if (!goalId) {
            setError("Kies een spaardoel");
            return;
          }
          result = await contributeToSavings({
            goalId,
            amountEuros: amount,
          });
        }
      } else {
        result = await createKlarnaPurchase({
          name,
          amountEuros: amount,
          purchasedOn: today,
          plan: klarnaPlan,
        });
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (mode === "another") {
        resetForm();
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1600);
        router.refresh();
        return;
      }

      router.push("/app");
      router.refresh();
    });
  }

  const nameLabel =
    kind === "expense"
      ? "Waarvoor?"
      : kind === "subscription"
        ? "Naam abonnement"
        : kind === "debt"
          ? "Naam schuld"
          : kind === "savings" && creatingNewGoal
            ? "Naam spaardoel"
            : kind === "klarna"
              ? "Wat gekocht?"
              : "Omschrijving";

  const nameRequired =
    kind === "expense" ||
    kind === "subscription" ||
    kind === "klarna" ||
    kind === "debt" ||
    creatingNewGoal;

  const showName =
    kind === "expense" ||
    kind === "subscription" ||
    kind === "klarna" ||
    kind === "debt" ||
    creatingNewGoal;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("home");
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label>Type</Label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {KINDS.map((k) => {
            const selected = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-all",
                  selected
                    ? "bg-brand-gradient text-white shadow-md shadow-violet-500/25"
                    : "glass-chip text-slate-600",
                )}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-[1.75rem] px-5 py-4">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
        {kind === "debt" ? (
          <p className="mt-2 text-center text-xs text-slate-500">
            Dit is je maandelijkse aflossing
          </p>
        ) : null}
        {kind === "savings" && creatingNewGoal ? (
          <p className="mt-2 text-center text-xs text-slate-500">
            Maandelijkse spaarbijdrage
          </p>
        ) : null}
      </div>

      {kind === "savings" && !creatingNewGoal ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="goal-id">Spaardoel</Label>
          <select
            id="goal-id"
            className="min-h-12 w-full rounded-2xl border border-white/70 bg-white/70 px-4 text-base text-slate-900 shadow-sm backdrop-blur"
            value={goalId}
            onChange={(e) => {
              setGoalId(e.target.value);
              const g = savingsGoals.find((x) => x.id === e.target.value);
              if (g && !amount) setAmount(g.suggestedEuros);
            }}
            required
          >
            {savingsGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showName ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="expense-name">{nameLabel}</Label>
          <Input
            id="expense-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              kind === "klarna"
                ? "Schoenen, headset…"
                : kind === "subscription"
                  ? "Netflix, Spotify…"
                  : kind === "debt"
                    ? "DUO, creditcard…"
                    : "Koffie, boodschappen…"
            }
            required={nameRequired}
            autoComplete="off"
            enterKeyHint="done"
          />
        </div>
      ) : null}

      {kind === "debt" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="debt-outstanding">Openstaand totaal (€)</Label>
          <Input
            id="debt-outstanding"
            inputMode="decimal"
            value={newDebtOutstanding}
            onChange={(e) => setNewDebtOutstanding(e.target.value)}
            placeholder={amount || "0,00"}
          />
          <p className="text-xs text-slate-500">
            Leeg laten = zelfde als maandbedrag (voor kleine schulden).
          </p>
        </div>
      ) : null}

      {(kind === "subscription" || kind === "debt" || creatingNewGoal) && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="day-of-month">Dag van de maand (1–28)</Label>
          <Input
            id="day-of-month"
            type="number"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            required
          />
        </div>
      )}

      {kind === "klarna" ? (
        <div className="flex flex-col gap-2">
          <Label>Plan</Label>
          <div className="flex gap-2">
            {(
              [
                { id: "pay_in_30" as const, label: "30 dagen" },
                { id: "pay_in_3" as const, label: "3 termijnen" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setKlarnaPlan(p.id)}
                className={cn(
                  "min-h-11 flex-1 rounded-full px-4 text-sm font-semibold transition-all",
                  klarnaPlan === p.id
                    ? "bg-[#121218] text-white"
                    : "glass-chip text-slate-600",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {kind === "expense" && categories.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>Categorie (optioneel)</Label>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-all",
                !categoryId
                  ? "bg-[#121218] text-white"
                  : "glass-chip text-slate-600",
              )}
            >
              Geen
            </button>
            {categories.map((c) => {
              const selected = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-all",
                    selected
                      ? "bg-brand-gradient text-white shadow-md shadow-violet-500/25"
                      : "glass-chip text-slate-600",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Overschrijding van budget blokkeert nooit het opslaan.
          </p>
        </div>
      ) : null}

      {savedFlash ? (
        <p
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          role="status"
        >
          <Check className="size-4" aria-hidden />
          Opgeslagen — volgende
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => submit("another")}
        >
          <Plus className="size-5" aria-hidden />
          Opslaan & nog een
        </Button>
      </div>
    </form>
  );
}
