"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Home,
  LayoutList,
  MoreHorizontal,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { KlarnaMark } from "@/components/brand/klarna-mark";
import { cn } from "@/lib/utils";

type Tab =
  | {
      href: string;
      label: string;
      exact?: boolean;
      kind: "lucide";
      icon: LucideIcon;
    }
  | {
      href: string;
      label: string;
      exact?: boolean;
      kind: "klarna";
    };

const tabs: Tab[] = [
  { href: "/app", label: "Home", kind: "lucide", icon: Home, exact: true },
  { href: "/app/timeline", label: "Tijdlijn", kind: "lucide", icon: LayoutList },
  {
    href: "/app/uitgaand",
    label: "Uitgaand",
    kind: "lucide",
    icon: ArrowUpRight,
  },
  { href: "/app/klarna", label: "Klarna", kind: "klarna" },
  { href: "/app/more", label: "Meer", kind: "lucide", icon: MoreHorizontal },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/app/uitgaand") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/app/debts") ||
      pathname.startsWith("/app/budgets") ||
      pathname.startsWith("/app/fixed")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3">
        <nav
          className="flex min-h-16 flex-1 items-center justify-around rounded-full bg-[#121218] px-1.5 shadow-[var(--shadow-nav)] sm:px-2"
          aria-label="Hoofdmenu"
        >
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href, tab.exact);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full transition-all sm:size-12",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                  active
                    ? "bg-accent text-white shadow-lg shadow-violet-500/40"
                    : "text-white/55 hover:text-white",
                )}
              >
                {tab.kind === "klarna" ? (
                  <KlarnaMark active={active} />
                ) : (
                  <tab.icon
                    className="size-5"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/app/expenses/new"
          aria-label="Uitgave toevoegen"
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg shadow-slate-900/15",
            "transition-transform hover:scale-[1.03] active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          )}
        >
          <Plus className="size-7" strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  );
}
