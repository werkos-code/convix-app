import { Wallet } from "lucide-react";

import { IncomeForm } from "./income-form";
import { IncomeRuleActions } from "./income-rule-actions";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro } from "@/lib/money/cents";
import { DEFAULT_SALARY_DAY } from "@/lib/periods/salary-period";

export const metadata = {
  title: "Inkomsten",
};

const recurrenceLabels: Record<string, string> = {
  monthly: "Maandelijks",
  yearly: "Jaarlijks",
  once: "Eenmalig",
};

export default async function IncomePage() {
  let rules: {
    id: string;
    name: string;
    amount_cents: number;
    recurrence: string;
    day_of_month: number | null;
  }[] = [];
  let salaryDay = DEFAULT_SALARY_DAY;

  try {
    const { user, supabase } = await requireUser();
    const [{ data }, profileRes] = await Promise.all([
      supabase
        .from("income_rules")
        .select("id, name, amount_cents, recurrence, day_of_month")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("day_of_month", { ascending: true }),
      supabase
        .from("profiles")
        .select("salary_day")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    rules = data ?? [];
    if (profileRes.data?.salary_day) {
      salaryDay = profileRes.data.salary_day;
    }
  } catch {
    // empty
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inkomsten"
        description="Terugkerende en eenmalige inkomsten — tellen mee in Free Spendable"
        icon={Wallet}
      />

      <ul className="glass-card overflow-hidden rounded-[1.75rem] divide-y divide-slate-100/80">
        {rules.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            Geen inkomstenregels. Voeg je salaris toe zodat geplande inkomsten
            meetellen.
          </li>
        ) : (
          rules.map((r) => (
            <li key={r.id}>
              <ListRow
                icon={Wallet}
                title={r.name}
                subtitle={`${recurrenceLabels[r.recurrence] ?? r.recurrence} · dag ${r.day_of_month ?? "—"}`}
                trailing={
                  <div className="flex items-center gap-2">
                    <p className="tabular-nums text-sm font-semibold text-emerald-700">
                      {formatEuro(r.amount_cents)}
                    </p>
                    <IncomeRuleActions id={r.id} />
                  </div>
                }
              />
            </li>
          ))
        )}
      </ul>

      <IncomeForm defaultDay={salaryDay} />
    </div>
  );
}
