import { AddBudgetForm } from "@/app/(app)/app/budgets/add-budget-form";
import { BudgetRow } from "@/app/(app)/app/budgets/budget-row";
import { requireUser } from "@/lib/auth/require-user";
import { loadDashboardData } from "@/lib/data/dashboard";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";

export async function BudgetsPanel() {
  let budgets: Awaited<ReturnType<typeof loadDashboardData>>["budgets"] = [];
  let periodId: string | null = null;

  try {
    const { user, supabase } = await requireUser();
    const data = await loadDashboardData(user.id);
    budgets = data.budgets;
    periodId = data.period?.id ?? null;
    await ensureOpenPeriod(supabase, user.id);
  } catch {
    budgets = [];
  }

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
