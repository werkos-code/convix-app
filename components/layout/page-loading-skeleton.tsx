import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function HomePageSkeleton({
  className,
  showChrome = true,
}: {
  className?: string;
  showChrome?: boolean;
}) {
  return (
    <div
      className={cn("flex flex-col gap-5", className)}
      aria-busy="true"
      aria-label="Home wordt geladen"
    >
      {showChrome ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 pt-1">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex justify-center">
            <Skeleton className="h-9 w-40 rounded-full bg-white/60" />
          </div>
          <Skeleton className="size-11 justify-self-end rounded-full" />
        </div>
      ) : null}
      <Skeleton className="mx-auto h-10 w-48 rounded-full bg-white/50" />
      <Skeleton className="h-40 rounded-[1.75rem]" />
      <div className="flex gap-2.5">
        <Skeleton className="h-24 flex-1 rounded-3xl bg-white/60" />
        <Skeleton className="h-24 flex-1 rounded-3xl bg-white/60" />
        <Skeleton className="h-24 flex-1 rounded-3xl bg-white/60" />
      </div>
      <Skeleton className="h-48 rounded-[1.75rem]" />
      <span className="sr-only">Laden…</span>
    </div>
  );
}

export function ListPageSkeleton({
  title,
  icon,
  withTabs = false,
  rows = 5,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  withTabs?: boolean;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      aria-busy="true"
      aria-label="Pagina wordt geladen"
    >
      {title && icon ? (
        <PageHeader title={title} icon={icon} />
      ) : (
        <div className="flex items-start gap-3.5">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-52 bg-white/50" />
          </div>
        </div>
      )}

      {withTabs ? (
        <Skeleton className="h-12 w-full rounded-full bg-white/60" />
      ) : null}

      <div className="glass-card overflow-hidden rounded-[1.75rem]">
        <div className="divide-y divide-slate-100/80">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-5 py-4"
            >
              <Skeleton className="size-10 shrink-0 rounded-full bg-white/60" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48 max-w-full bg-white/50" />
              </div>
              <Skeleton className="h-4 w-14 shrink-0 bg-white/60" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Laden…</span>
    </div>
  );
}

export function FormPageSkeleton({
  title,
  icon,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      aria-busy="true"
      aria-label="Pagina wordt geladen"
    >
      {title && icon ? (
        <PageHeader title={title} icon={icon} />
      ) : (
        <div className="flex items-start gap-3.5">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <Skeleton className="mt-1 h-7 w-40" />
        </div>
      )}
      <div className="glass-card space-y-4 rounded-[1.75rem] p-5">
        <Skeleton className="h-4 w-24 bg-white/50" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-4 w-28 bg-white/50" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="mt-2 h-12 w-full rounded-full" />
      </div>
      <span className="sr-only">Laden…</span>
    </div>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Inhoud wordt geladen"
    >
      <div className="glass-card overflow-hidden rounded-[1.75rem]">
        <div className="divide-y divide-slate-100/80">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="size-10 shrink-0 rounded-full bg-white/60" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-40 max-w-full bg-white/50" />
              </div>
              <Skeleton className="h-4 w-14 shrink-0 bg-white/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
