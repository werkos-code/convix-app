import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import type { Insight } from "@/lib/insights/deterministic";
import { cn } from "@/lib/utils";

export interface WarningBannerProps {
  insights: Insight[];
  className?: string;
}

export function WarningBanner({ insights, className }: WarningBannerProps) {
  if (insights.length === 0) return null;

  const top = insights.slice(0, 3);

  return (
    <aside
      role="status"
      className={cn(
        "rounded-[1.5rem] border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-amber-950 shadow-sm backdrop-blur",
        className,
      )}
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <ul className="flex flex-col gap-2">
            {top.map((insight) => (
              <li key={insight.id}>
                <p className="text-sm font-semibold leading-snug">
                  {insight.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-amber-900/80">
                  {insight.message}
                </p>
              </li>
            ))}
          </ul>
          {insights.length > 0 && (
            <Link
              href="/app/insights"
              className="mt-2.5 inline-block text-xs font-semibold text-amber-800 underline-offset-2 hover:underline"
            >
              {insights.length === 1
                ? "Bekijk inzicht"
                : `Alle ${insights.length} inzichten`}
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
