"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createAccount } from "@/app/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"checking" | "savings" | "other">("checking");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAccount({
        name,
        type,
        balanceEuros: balance,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setBalance("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Plus className="size-5 text-accent" aria-hidden />
        Rekening toevoegen
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-name">Naam</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-type">Soort</Label>
        <select
          id="account-type"
          value={type}
          onChange={(e) =>
            setType(e.target.value as "checking" | "savings" | "other")
          }
          className="flex min-h-12 w-full rounded-xl border border-border bg-white px-4 py-3 text-base"
        >
          <option value="checking">Betaalrekening</option>
          <option value="savings">Spaarrekening</option>
          <option value="other">Overig</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="account-balance">Saldo (€)</Label>
        <Input
          id="account-balance"
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0,00"
          required
        />
      </div>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : "Rekening toevoegen"}
      </Button>
    </form>
  );
}
