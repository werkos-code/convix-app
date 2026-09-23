import { formatEuro, type Cents } from "@/lib/money/cents";
import { cn } from "@/lib/utils";

export interface BreakdownRowProps {
  label: string;
  amountCents: Cents;
  className?: string;
  emphasize?: boolean;
}

export function BreakdownRow({
  label,
  amountCents,
  className,
  emphasize = false,
}: BreakdownRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-4 py-2",
        className,
      )}
    >
      <span
        className={cn(
          "text-sm text-stone-600",
          emphasize && "font-medium text-stone-900",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums text-sm text-stone-900",
          emphasize && "font-semibold",
          amountCents < 0 && "text-red-700",
        )}
      >
        {formatEuro(amountCents, { sign: true })}
      </span>
    </div>
  );
}
