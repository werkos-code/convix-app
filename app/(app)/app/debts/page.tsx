import { CircleDollarSign } from "lucide-react";

import { DebtCard, type DebtView } from "./debt-card";
import { DebtForm } from "./debt-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro } from "@/lib/money/cents";

export const metadata = {
  title: "Schulden",
};

export default async function DebtsPage() {
  let debts: DebtView[] = [];
  let totalOutstanding = 0;
  let totalMonthly = 0;

  try {
    const { user, supabase } = await requireUser();
    const [{ data: debtRows }, { data: ruleRows }] = await Promise.all([
      supabase
        .from("debts")
        .select("id, name, outstanding_cents")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("debt_payment_rules")
        .select("debt_id, amount_cents, day_of_month")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    const rulesByDebt = new Map<
      string,
      { amount_cents: number; day_of_month: number }[]
    >();
    for (const r of ruleRows ?? []) {
      const list = rulesByDebt.get(r.debt_id) ?? [];
      list.push({
        amount_cents: r.amount_cents,
        day_of_month: r.day_of_month,
      });
      rulesByDebt.set(r.debt_id, list);
    }

    debts = (debtRows ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      outstanding_cents: d.outstanding_cents,
      rules: rulesByDebt.get(d.id) ?? [],
    }));

    totalOutstanding = debts.reduce((s, d) => s + d.outstanding_cents, 0);
    totalMonthly = debts.reduce(
      (s, d) => s + (d.rules[0]?.amount_cents ?? 0),
      0,
    );
  } catch {
    // empty
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Schulden"
        description="Openstaand saldo + maandelijkse aflossing — geen rente-engine in V1"
        icon={CircleDollarSign}
      />

      {debts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <p className="glass-chip rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-700">
            Totaal open {formatEuro(totalOutstanding)}
          </p>
          {totalMonthly > 0 && (
            <p className="glass-chip rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-700">
              Aflossing / maand {formatEuro(totalMonthly)}
            </p>
          )}
        </div>
      )}

      <ul className="glass-card overflow-hidden rounded-[1.75rem]">
        {debts.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            Geen schulden. Voeg er een toe — de maandelijkse aflossing
            verschijnt in Binnenkort.
          </li>
        ) : (
          debts.map((d) => <DebtCard key={d.id} debt={d} />)
        )}
      </ul>

      <DebtForm />
    </div>
  );
}
