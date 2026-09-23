import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatDateRangeNL } from "@/lib/dates/format";
import { cn } from "@/lib/utils";

type PeriodSwitcherProps = {
  currentLabel: string;
  nextLabel: string | null;
  view: "current" | "next";
  className?: string;
};

export function PeriodSwitcher({
  currentLabel,
  nextLabel,
  view,
  className,
}: PeriodSwitcherProps) {
  const showingNext = view === "next" && !!nextLabel;
  const label = showingNext ? nextLabel! : currentLabel;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-white/60 p-0.5 backdrop-blur",
        className,
      )}
      role="group"
      aria-label="Salarisperiode"
    >
      {showingNext ? (
        <Link
          href="/app"
          className="flex size-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white/80"
          aria-label="Huidige periode"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className="size-8" aria-hidden />
      )}

      <div className="flex min-w-0 flex-col items-center px-1 py-1 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {showingNext ? "Volgende periode" : "Deze periode"}
        </p>
        <p className="max-w-[9.5rem] truncate text-[11px] font-medium text-slate-600">
          {label}
        </p>
      </div>

      {nextLabel && !showingNext ? (
        <Link
          href="/app?periode=volgende"
          className="flex size-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white/80"
          aria-label="Volgende periode"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : showingNext ? (
        <span className="size-8" aria-hidden />
      ) : (
        <span className="size-8" aria-hidden />
      )}
    </div>
  );
}

/** Helper for server pages that already have ISO dates. */
export function periodRangeLabel(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
): string {
  return formatDateRangeNL(startsOn, endsOn);
}
