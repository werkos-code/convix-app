import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
  href?: string;
  className?: string;
};

export function ListRow({
  title,
  subtitle,
  icon: Icon,
  trailing,
  href,
  className,
}: ListRowProps) {
  const content = (
    <>
      {Icon ? (
        <div className="icon-orb size-11 shrink-0">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {trailing}
      {href ? (
        <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden />
      ) : null}
    </>
  );

  const classes = cn(
    "flex min-h-14 items-center gap-3 px-4 py-3.5",
    href && "transition-colors hover:bg-white/50 active:bg-white/70",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
