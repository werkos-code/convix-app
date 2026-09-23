import Link from "next/link";
import { Landmark, Scale } from "lucide-react";

import { ConfirmBalancesForm } from "./confirm-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";

export const metadata = {
  title: "Saldi bevestigen",
};

export default async function ConfirmBalancesPage() {
  let periodId = "";
  let accounts: {
    id: string;
    name: string;
    type: string;
    last_confirmed_balance_cents: number;
  }[] = [];
  let error: string | null = null;

  try {
    const { user, supabase } = await requireUser();
    const { period } = await ensureOpenPeriod(supabase, user.id);
    periodId = period.id;

    const { data } = await supabase
      .from("accounts")
      .select("id, name, type, last_confirmed_balance_cents")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    accounts = data ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Kan rekeningen niet laden";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Saldi bevestigen" icon={Scale} />

      {error ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
            Koppel Supabase en log in om live saldi te bevestigen.
          </p>
          <Button asChild variant="outline">
            <Link href="/app">Terug naar home</Link>
          </Button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Geen actieve rekeningen. Voeg er eerst een toe.
          </p>
          <Button asChild>
            <Link href="/app/accounts">
              <Landmark className="size-5" aria-hidden />
              Naar rekeningen
            </Link>
          </Button>
        </div>
      ) : (
        <ConfirmBalancesForm periodId={periodId} accounts={accounts} />
      )}
    </div>
  );
}
