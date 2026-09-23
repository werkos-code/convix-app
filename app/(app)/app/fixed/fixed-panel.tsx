import { Building2 } from "lucide-react";

import { FixedForm } from "@/app/(app)/app/fixed/fixed-form";
import { FixedRuleActions } from "@/app/(app)/app/fixed/fixed-rule-actions";
import { ListRow } from "@/components/ui/list-row";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro, type Cents } from "@/lib/money/cents";

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

function monthlyEquivalentCents(
  amountCents: number,
  recurrence: string,
): Cents {
  if (recurrence === "yearly") {
    return Math.round(amountCents / 12) as Cents;
  }
  if (recurrence === "monthly") {
    return amountCents as Cents;
  }
  return 0 as Cents;
}

export async function FixedPanel() {
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

  const monthlyTotal = rules.reduce(
    (sum, r) => sum + monthlyEquivalentCents(r.amount_cents, r.recurrence),
    0,
  ) as Cents;
  const yearlyOnlyTotal = rules
    .filter((r) => r.recurrence === "yearly")
    .reduce((sum, r) => sum + r.amount_cents, 0) as Cents;
  const onceTotal = rules
    .filter((r) => r.recurrence === "once")
    .reduce((sum, r) => sum + r.amount_cents, 0) as Cents;
  const monthlyCount = rules.filter((r) => r.recurrence === "monthly").length;

  return (
    <div className="flex flex-col gap-6">
      {rules.length > 0 && (
        <section
          className="glass-card rounded-[1.75rem] px-5 py-5"
          aria-label="Totaal vaste lasten"
        >
          <p className="text-xs font-medium text-slate-500">Per maand</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-slate-950">
            {formatEuro(monthlyTotal)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <p className="rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600">
              {rules.length} {rules.length === 1 ? "last" : "lasten"}
            </p>
            {monthlyCount > 0 && (
              <p className="rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600">
                {monthlyCount} maandelijks
              </p>
            )}
            {yearlyOnlyTotal > 0 && (
              <p className="rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600">
                Jaarlijks {formatEuro(yearlyOnlyTotal)}
              </p>
            )}
            {onceTotal > 0 && (
              <p className="rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-600">
                Eenmalig {formatEuro(onceTotal)}
              </p>
            )}
          </div>
        </section>
      )}

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
