"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/navigation/bottom-nav";
import { OfflineBanner } from "@/components/system/offline-banner";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/app/onboarding";

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-background">
      <OfflineBanner />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-app-atmosphere"
      />
      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-lg flex-1 px-4 pt-3 md:max-w-2xl",
          isOnboarding
            ? "pb-[calc(var(--safe-bottom)+1.5rem)]"
            : "pb-[calc(var(--nav-height)+var(--safe-bottom))] lg:max-w-3xl",
        )}
      >
        {children}
      </div>
      {!isOnboarding ? <BottomNav /> : null}
    </div>
  );
}
