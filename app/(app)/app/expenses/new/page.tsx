import { Receipt } from "lucide-react";

import { ExpenseForm } from "./expense-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { todayInTimezone } from "@/lib/periods/salary-period";

export const metadata = {
  title: "Uitgave",
};

export default async function NewExpensePage() {
  const { user, supabase } = await requireUser();

  const [{ data: categories }, { data: goals }, { data: profile }] =
    await Promise.all([
      supabase
        .from("budget_categories")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("savings_goals")
        .select("id, name, scheduled_amount_cents")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("profiles")
        .select("salary_day, timezone")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const today = todayInTimezone(profile?.timezone ?? "Europe/Amsterdam");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Uitgave" icon={Receipt} />
      <ExpenseForm
        categories={categories ?? []}
        savingsGoals={(goals ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          suggestedEuros: (g.scheduled_amount_cents / 100)
            .toFixed(2)
            .replace(".", ","),
        }))}
        defaultDay={profile?.salary_day ?? 1}
        today={today}
      />
    </div>
  );
}
