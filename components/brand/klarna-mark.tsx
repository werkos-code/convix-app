import { cn } from "@/lib/utils";

/**
 * Klarna-style “K” mark for navigation (not the official logo asset).
 */
export function KlarnaMark({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 items-center justify-center font-sans text-[1.05rem] font-black leading-none tracking-tight",
        active ? "text-white" : "text-[#FFA8CD]",
        className,
      )}
    >
      K
    </span>
  );
}
