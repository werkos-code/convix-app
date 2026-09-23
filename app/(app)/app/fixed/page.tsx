import { Building2 } from "lucide-react";

import { FixedForm } from "./fixed-form";
import { FixedRuleActions } from "./fixed-rule-actions";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro } from "@/lib/money/cents";

export const metadata = {
  title: "Vaste lasten",
};

const recurrenceLabels: Record<string, string> = {
  monthly: "Maandelijks",
  yearly: "Jaarlijks",
  once: "Eenmalig",
};

const monthLabels = [
  "",
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

export default async function FixedPage() {
  let rules: {
    id: string;
    name: string;
    amount_cents: number;
    category: string | null;
    recurrence: string;
    day_of_month: number | null;
    month_of_year: number | null;
  }[] = [];

  try {
    const { user, supabase } = await requireUser();
    const { data } = await supabase
      .from("fixed_expense_rules")
      .select(
        "id, name, amount_cents, category, recurrence, day_of_month, month_of_year",
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("day_of_month", { ascending: true });
    rules = data ?? [];
  } catch {
    // empty
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vaste lasten"
        description="Terugkerende rekeningen en abonnementen — reserveren Free Spendable"
        icon={Building2}
      />

      <ul className="glass-card overflow-hidden rounded-[1.75rem] divide-y divide-slate-100/80">
        {rules.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            Geen vaste lasten. Voeg huur, verzekering of een gezamenlijke
            bijdrage toe.
          </li>
        ) : (
          rules.map((r) => {
            const when =
              r.recurrence === "yearly" && r.month_of_year
                ? `${r.day_of_month ?? "—"} ${monthLabels[r.month_of_year]}`
                : `dag ${r.day_of_month ?? "—"}`;
            return (
              <li key={r.id}>
                <ListRow
                  icon={Building2}
                  title={r.name}
                  subtitle={[
                    recurrenceLabels[r.recurrence] ?? r.recurrence,
                    when,
                    r.category,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={
                    <div className="flex items-center gap-2">
                      <p className="tabular-nums text-sm font-semibold text-slate-900">
                        {formatEuro(r.amount_cents)}
                      </p>
                      <FixedRuleActions id={r.id} />
                    </div>
                  }
                />
              </li>
            );
          })
        )}
      </ul>

      <FixedForm />
    </div>
  );
}
