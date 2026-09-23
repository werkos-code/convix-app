"use client";

import { useMemo, useState } from "react";

import {
  TimelineFilters,
  type TimelineFilter,
} from "@/components/timeline/timeline-filters";
import {
  TimelineRow,
  type TimelineEntry,
} from "@/components/timeline/timeline-row";
import { formatDateNL } from "@/lib/dates/format";

export type { TimelineEntry };

function groupByDate(entries: TimelineEntry[]) {
  const map = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return [...map.entries()].sort(([a], [b]) =>
    a < b ? 1 : a > b ? -1 : 0,
  );
}

export function TimelineClient({
  entries,
  periodLabel,
}: {
  entries: TimelineEntry[];
  periodLabel?: string | null;
}) {
  const [filter, setFilter] = useState<TimelineFilter>("Alles");

  const visible = useMemo(() => {
    if (filter === "Alles") return entries;
    return entries.filter((e) => e.filterKeys.includes(filter));
  }, [entries, filter]);

  const groups = useMemo(() => groupByDate(visible), [visible]);

  return (
    <div className="flex flex-col gap-4">
      {periodLabel ? (
        <p className="px-1 text-xs font-medium text-slate-500">
          Periode {periodLabel}
        </p>
      ) : null}

      <TimelineFilters value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <div className="glass-card rounded-[1.75rem] px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Geen items
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {filter === "Alles"
              ? "Nog geen uitgaven of geplande posten in deze periode."
              : `Niets onder “${filter}”. Probeer een ander filter.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(([date, items]) => (
            <section
              key={date}
              className="glass-card overflow-hidden rounded-[1.75rem]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100/80 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {formatDateNL(date)}
                </p>
                <p className="text-[11px] tabular-nums text-slate-400">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="px-1">
                {items.map((entry) => (
                  <TimelineRow key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
