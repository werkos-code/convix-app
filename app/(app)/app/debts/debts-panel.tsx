import { DebtCard, type DebtView } from "@/app/(app)/app/debts/debt-card";
import { DebtForm } from "@/app/(app)/app/debts/debt-form";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro } from "@/lib/money/cents";

export async function DebtsPanel({ expandForm = false }: { expandForm?: boolean }) {
  let debts: DebtView[] = [];
  let totalOutstanding = 0;
  let totalMonthly = 0;

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

  return (
    <div className="flex flex-col gap-6">
      {debts.length > 0 && (
        <section
          className="glass-card rounded-[1.75rem] px-5 py-5"
          aria-label="Totaal schulden"
        >
          <p className="text-xs font-medium text-slate-500">
            Aflossing per maand
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
            {formatEuro(totalMonthly)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <p className="rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600">
              {debts.length} {debts.length === 1 ? "schuld" : "schulden"}
            </p>
            <p className="rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600">
              Totaal open {formatEuro(totalOutstanding)}
            </p>
          </div>
        </section>
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

      <DebtForm expandByDefault={expandForm} />
    </div>
  );
}
