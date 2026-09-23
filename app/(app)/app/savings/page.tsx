import { PiggyBank } from "lucide-react";

import { SavingsForm } from "./savings-form";
import {
  SavingsGoalCard,
  type SavingsGoalView,
} from "./savings-goal-card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro } from "@/lib/money/cents";

export const metadata = {
  title: "Spaardoelen",
};

export default async function SavingsPage() {
  let goals: SavingsGoalView[] = [];
  let totalCurrent = 0;
  let totalScheduled = 0;

  try {
    const { user, supabase } = await requireUser();
    const { data } = await supabase
      .from("savings_goals")
      .select(
        "id, name, current_amount_cents, target_amount_cents, scheduled_amount_cents, contribution_day",
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    goals = data ?? [];
    totalCurrent = goals.reduce((s, g) => s + g.current_amount_cents, 0);
    totalScheduled = goals.reduce((s, g) => s + g.scheduled_amount_cents, 0);
  } catch {
    // empty
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Spaardoelen"
        description="Bijdragen zijn uitgaven voor Free Spendable — gespaard geld telt niet mee om uit te geven"
        icon={PiggyBank}
      />

      {goals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <p className="glass-chip rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-700">
            Totaal gespaard {formatEuro(totalCurrent)}
          </p>
          {totalScheduled > 0 && (
            <p className="glass-chip rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-700">
              Gepland / maand {formatEuro(totalScheduled)}
            </p>
          )}
        </div>
      )}

      <ul className="glass-card overflow-hidden rounded-[1.75rem]">
        {goals.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            Geen spaardoelen. Voeg er een toe — de maandelijkse bijdrage
            verschijnt in Binnenkort.
          </li>
        ) : (
          goals.map((g) => <SavingsGoalCard key={g.id} goal={g} />)
        )}
      </ul>

      <SavingsForm />
    </div>
  );
}
