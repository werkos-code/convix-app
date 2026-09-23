import { CalendarDays } from "lucide-react";

import { formatEuro, type Cents } from "@/lib/money/cents";
import { cn } from "@/lib/utils";

export interface FreeSpendableHeroProps {
  amountCents: Cents;
  daysUntilSalary: number;
  /** When true, amount is a projection for the next period. */
  isPreview?: boolean;
  className?: string;
}

export function FreeSpendableHero({
  amountCents,
  daysUntilSalary,
  isPreview = false,
  className,
}: FreeSpendableHeroProps) {
  const daysLabel = isPreview
    ? daysUntilSalary <= 0
      ? "Start van die periode"
      : daysUntilSalary === 1
        ? "Periode van 1 dag"
        : `Periode van ${daysUntilSalary} dagen`
    : daysUntilSalary <= 0
      ? "Salarisdag"
      : daysUntilSalary === 1
        ? "Nog 1 dag tot salaris"
        : `Nog ${daysUntilSalary} dagen tot salaris`;

  return (
    <section
      className={cn(
        "glass-card relative overflow-hidden rounded-[1.75rem] px-5 py-6",
        className,
      )}
      aria-label={isPreview ? "Geschat vrij besteedbaar" : "Vrij besteedbaar"}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-violet-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-8 size-36 rounded-full bg-sky-300/25 blur-3xl"
      />

      <p className="relative text-sm font-medium text-slate-500">
        {isPreview ? "Geschat vrij besteedbaar" : "Vrij besteedbaar"}
      </p>
      <p
        className={cn(
          "relative mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl",
          amountCents < 0 ? "text-red-500" : "text-slate-950",
        )}
      >
        {formatEuro(amountCents)}
      </p>
      <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-600">
        <CalendarDays className="size-3.5 text-accent" aria-hidden />
        {daysLabel}
      </p>
    </section>
  );
}
