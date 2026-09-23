"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createQuickExpense } from "@/app/actions/expenses";
import { AmountInput } from "@/components/money/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };

export function ExpenseForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setAmount("");
    setName("");
    setCategoryId("");
    setError(null);
  }

  function submit(mode: "home" | "another") {
    setError(null);
    startTransition(async () => {
      const result = await createQuickExpense({
        amountEuros: amount,
        name,
        categoryId: categoryId || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (mode === "another") {
        resetForm();
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1600);
        return;
      }

      router.push("/app");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("home");
      }}
      className="flex flex-col gap-5"
    >
      <div className="glass-card rounded-[1.75rem] px-5 py-4">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expense-name">Waarvoor?</Label>
        <Input
          id="expense-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Koffie, boodschappen…"
          required
          autoComplete="off"
          enterKeyHint="done"
        />
      </div>

      {categories.length > 0 && (
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
      )}

      {savedFlash && (
        <p
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          role="status"
        >
          <Check className="size-4" aria-hidden />
          Opgeslagen — volgende uitgave
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

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
