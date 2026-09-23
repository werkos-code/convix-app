"use client";

import { cn } from "@/lib/utils";

export const TIMELINE_FILTERS = [
  "Alles",
  "Inkomsten",
  "Uitgaven",
  "Gepland",
  "Klarna",
  "Sparen",
  "Schuld",
] as const;

export type TimelineFilter = (typeof TIMELINE_FILTERS)[number];

export interface TimelineFiltersProps {
  value: TimelineFilter;
  onChange: (value: TimelineFilter) => void;
  className?: string;
}

export function TimelineFilters({
  value,
  onChange,
  className,
}: TimelineFiltersProps) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="Tijdlijnfilters"
    >
      {TIMELINE_FILTERS.map((filter) => {
        const selected = value === filter;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(filter)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              selected
                ? "bg-[#121218] text-white shadow-md shadow-slate-900/20"
                : "glass-chip text-slate-600 hover:bg-white/80",
            )}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
