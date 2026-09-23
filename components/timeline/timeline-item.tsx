import { formatDateNL } from "@/lib/dates/format";
import { formatEuro, type Cents } from "@/lib/money/cents";
import { cn } from "@/lib/utils";

export type TimelineItemStatus =
  | "actual"
  | "planned"
  | "returned"
  | "settled";

export interface TimelineItemProps {
  date: string;
  name: string;
  amountCents: Cents;
  status: TimelineItemStatus;
  className?: string;
}

const statusStyles: Record<
  TimelineItemStatus,
  { label: string; className: string }
> = {
  actual: {
    label: "Werkelijk",
    className: "bg-emerald-50 text-emerald-800",
  },
  planned: {
    label: "Gepland",
    className: "bg-slate-100 text-slate-600",
  },
  returned: {
    label: "Teruggeboekt",
    className: "bg-sky-50 text-sky-800",
  },
  settled: {
    label: "Afgerond",
    className: "bg-accent-soft text-accent",
  },
};

export function TimelineItem({
  date,
  name,
  amountCents,
  status,
  className,
}: TimelineItemProps) {
  const badge = statusStyles[status];

  return (
    <article
      className={cn(
        "flex min-h-14 items-center justify-between gap-3 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{formatDateNL(date)}</p>
      </div>
      <p
        className={cn(
          "shrink-0 tabular-nums text-sm font-semibold",
          amountCents < 0 ? "text-slate-900" : "text-emerald-700",
        )}
      >
        {formatEuro(amountCents, { sign: true })}
      </p>
    </article>
  );
}
