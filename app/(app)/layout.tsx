import { headers } from "next/headers";

import { BottomNav } from "@/components/navigation/bottom-nav";
import { OfflineBanner } from "@/components/system/offline-banner";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-convix-pathname") ?? "";
  const isOnboarding = pathname === "/app/onboarding";

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-background">
      <OfflineBanner />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-app-atmosphere"
      />
      <div
        className={
          isOnboarding
            ? "relative z-10 mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(var(--safe-bottom)+1.5rem)] pt-3 md:max-w-2xl"
            : "relative z-10 mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(var(--nav-height)+var(--safe-bottom))] pt-3 md:max-w-2xl lg:max-w-3xl"
        }
      >
        {children}
      </div>
      {!isOnboarding ? <BottomNav /> : null}
    </div>
  );
}
