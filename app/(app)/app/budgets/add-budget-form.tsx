"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBudgetCategory } from "@/app/actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddBudgetForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBudgetCategory({
        name,
        defaultAmountEuros: amount,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setAmount("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-5" aria-hidden />
        Categorie toevoegen
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="glass-card flex flex-col gap-4 rounded-[1.75rem] p-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="budget-name">Naam</Label>
        <Input
          id="budget-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Boodschappen"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="budget-amount">Standaardbedrag per periode (€)</Label>
        <Input
          id="budget-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="400"
          required
        />
        <p className="text-xs text-slate-500">
          Wordt elke salarisperiode opnieuw gezet — ongebruikt budget loopt niet
          over.
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
