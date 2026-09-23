import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatDateRangeShortNL } from "@/lib/dates/format";
import { cn } from "@/lib/utils";

type PeriodSwitcherProps = {
  label: string;
  eyebrow: string;
  /** Omit or null to hide the previous control. */
  prevHref?: string | null;
  /** Omit or null to hide the next control. */
  nextHref?: string | null;
  className?: string;
  /** Tighter chrome for headers. */
  compact?: boolean;
};

export function PeriodSwitcher({
  label,
  eyebrow,
  prevHref = null,
  nextHref = null,
  className,
  compact = false,
}: PeriodSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 rounded-full bg-white/60 p-0.5 backdrop-blur",
        className,
      )}
      role="group"
      aria-label="Salarisperiode"
    >
      {prevHref ? (
        <Link
          href={prevHref}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white/80"
          aria-label="Vorige periode"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className="size-8 shrink-0" aria-hidden />
      )}

      <div
        className={cn(
          "flex min-w-0 flex-col items-center px-1 py-1 text-center",
          compact ? "max-w-[10.5rem]" : "max-w-[11rem]",
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {eyebrow}
        </p>
        <p
          className={cn(
            "truncate font-medium text-slate-700",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {label}
        </p>
      </div>

      {nextHref ? (
        <Link
          href={nextHref}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white/80"
          aria-label="Volgende periode"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className="size-8 shrink-0" aria-hidden />
      )}
    </div>
  );
}

/** Helper for server pages that already have ISO dates. */
export function periodRangeLabel(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
): string {
  return formatDateRangeShortNL(startsOn, endsOn);
}
