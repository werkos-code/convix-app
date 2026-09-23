"use client";

import Link from "next/link";

import {
  UITGAAND_TABS,
  type UitgaandTab,
} from "@/lib/uitgaand/tabs";
import { cn } from "@/lib/utils";

export function UitgaandTabs({
  active,
  nieuw,
}: {
  active: UitgaandTab;
  nieuw?: boolean;
}) {
  return (
    <div
      className="flex w-full rounded-full bg-white/60 p-1 backdrop-blur"
      role="tablist"
      aria-label="Uitgaand"
    >
      {UITGAAND_TABS.map((tab) => {
        const isActive = tab.id === active;
        const href =
          tab.id === "schulden" && nieuw
            ? `/app/uitgaand?tab=${tab.id}&nieuw=1`
            : `/app/uitgaand?tab=${tab.id}`;
        return (
          <Link
            key={tab.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex-1 rounded-full px-2 py-2.5 text-center text-[11px] font-semibold transition-all sm:text-xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              isActive
                ? "bg-[#121218] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
