import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  className?: string;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex items-start gap-3.5", className)}>
      <div className="icon-orb flex size-12 shrink-0 bg-white/70 shadow-sm backdrop-blur">
        <Icon className="size-5 text-accent" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}
