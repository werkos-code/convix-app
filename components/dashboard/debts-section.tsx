import Link from "next/link";
import { CircleDollarSign, Plus } from "lucide-react";

import { formatEuro, type Cents } from "@/lib/money/cents";

export type DashboardDebt = {
  id: string;
  name: string;
  outstandingCents: Cents;
  monthlyCents: Cents;
};

export function DebtsSection({ debts }: { debts: DashboardDebt[] }) {
  return (
    <section className="glass-card overflow-hidden rounded-[1.75rem]">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-sm font-bold text-slate-900">Schulden</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/app/uitgaand?tab=schulden"
            className="text-xs font-semibold text-accent"
          >
            Alles
          </Link>
          <Link
            href="/app/uitgaand?tab=schulden&nieuw=1"
            aria-label="Schuld toevoegen"
            className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-violet-100"
          >
            <Plus className="size-5" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <CircleDollarSign className="size-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-slate-800">Nog geen schulden</p>
          <p className="text-xs text-slate-500">
            Voeg DUO, creditcard of andere aflossingen toe.
          </p>
          <Link
            href="/app/uitgaand?tab=schulden&nieuw=1"
            className="mt-1 text-sm font-semibold text-accent"
          >
            Schuld toevoegen
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100/80 px-2 py-2">
          {debts.map((d) => (
            <li key={d.id}>
              <Link
                href="/app/uitgaand?tab=schulden"
                className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {d.name}
                  </p>
                  {d.monthlyCents > 0 ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatEuro(d.monthlyCents)} / maand
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 tabular-nums text-sm font-bold text-slate-900">
                  {formatEuro(d.outstandingCents)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
