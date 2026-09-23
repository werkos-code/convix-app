import Link from "next/link";
import { Building2, PiggyBank } from "lucide-react";

import { AddBudgetForm } from "./add-budget-form";
import { BudgetRow } from "./budget-row";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { formatEuro } from "@/lib/money/cents";
import { requireUser } from "@/lib/auth/require-user";
import { loadDashboardData } from "@/lib/data/dashboard";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";

export const metadata = {
  title: "Budgetten",
};

export default async function BudgetsPage() {
  let budgets: Awaited<ReturnType<typeof loadDashboardData>>["budgets"] = [];
  let periodId: string | null = null;
  let fixed: {
    id: string;
    name: string;
    amount_cents: number;
    day_of_month: number | null;
  }[] = [];

  try {
    const { user, supabase } = await requireUser();
    const data = await loadDashboardData(user.id);
    budgets = data.budgets;
    periodId = data.period?.id ?? null;

    const { data: fixedRules } = await supabase
      .from("fixed_expense_rules")
      .select("id, name, amount_cents, day_of_month")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("day_of_month", { ascending: true });
    fixed = fixedRules ?? [];

    await ensureOpenPeriod(supabase, user.id);
  } catch {
    budgets = [
      {
        categoryId: "d1",
        name: "Boodschappen",
        allocatedCents: 40_000,
        spentCents: 22_500,
        remainingCents: 17_500,
        overCents: 0,
      },
    ];
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Budgetten"
        description="Variabele categorieën deze periode — overschrijden blokkeert nooit"
        icon={PiggyBank}
      />

      <ul className="glass-card overflow-hidden rounded-[1.75rem] divide-y divide-slate-100/80">
        {budgets.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            Nog geen categorieën. Voeg boodschappen, brandstof of vrije tijd toe.
          </li>
        ) : (
          budgets.map((b) => (
            <BudgetRow key={b.categoryId} budget={b} periodId={periodId} />
          ))
        )}
      </ul>

      <AddBudgetForm />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Building2 className="size-5 text-accent" aria-hidden />
            Vaste lasten
          </h2>
          <Link
            href="/app/fixed"
            className="text-sm font-semibold text-accent"
          >
            Beheren
          </Link>
        </div>
        <ul className="glass-card overflow-hidden rounded-[1.75rem] divide-y divide-slate-100/80">
          {fixed.length === 0 ? (
            <li className="px-5 py-4 text-sm text-slate-500">
              Nog geen vaste lasten.{" "}
              <Link href="/app/fixed" className="font-semibold text-accent">
                Toevoegen
              </Link>
            </li>
          ) : (
            fixed.map((f) => (
              <li key={f.id}>
                <ListRow
                  icon={Building2}
                  title={f.name}
                  subtitle={`Dag ${f.day_of_month ?? "—"}`}
                  trailing={
                    <p className="tabular-nums text-sm font-semibold text-slate-900">
                      {formatEuro(f.amount_cents)}
                    </p>
                  }
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
