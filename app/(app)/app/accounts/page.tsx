import { Landmark, Wallet } from "lucide-react";

import { AccountForm } from "./account-form";
import { AccountRowActions } from "./account-row-actions";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import type { Account } from "@/lib/types/domain";

export const metadata = {
  title: "Rekeningen",
};

const typeLabels: Record<Account["type"], string> = {
  checking: "Betaalrekening",
  savings: "Spaarrekening",
  other: "Overig",
};

export default async function AccountsPage() {
  const { user, supabase } = await requireUser();
  let accounts: Account[] = [];
  let error: string | null = null;

  const { data, error: qErr } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (qErr) error = qErr.message;
  accounts = (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    is_active: row.is_active,
    sort_order: row.sort_order,
    last_confirmed_balance_cents: row.last_confirmed_balance_cents,
    last_confirmed_at: row.last_confirmed_at,
    created_at: row.created_at,
  }));

  const active = accounts.filter((a) => a.is_active);
  const inactive = accounts.filter((a) => !a.is_active);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rekeningen"
        description="Alleen persoonlijke rekeningen — geen banksync in V1. Betaal-/overig tellen mee voor Vrij besteedbaar; spaarrekeningen apart."
        icon={Landmark}
      />

      {error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Actief</h2>
        <ul className="overflow-hidden rounded-2xl border border-border bg-white divide-y divide-slate-100">
          {active.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              Nog geen actieve rekeningen.
            </li>
          ) : (
            active.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Wallet className="size-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">
                      {a.type === "savings"
                        ? `${typeLabels[a.type]} · niet in Vrij besteedbaar`
                        : typeLabels[a.type]}
                    </p>
                  </div>
                </div>
                <AccountRowActions account={a} />
              </li>
            ))
          )}
        </ul>
      </section>

      {inactive.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-500">Inactief</h2>
          <ul className="overflow-hidden rounded-2xl border border-border bg-slate-50 divide-y divide-slate-100 opacity-80">
            {inactive.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Wallet className="size-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{a.name}</p>
                    <p className="text-xs text-slate-500">{typeLabels[a.type]}</p>
                  </div>
                </div>
                <AccountRowActions account={a} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AccountForm />
    </div>
  );
}
