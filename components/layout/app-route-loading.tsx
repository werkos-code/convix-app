"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { ConvixMark } from "@/components/brand/logo";
import {
  FormPageSkeleton,
  HomePageSkeleton,
  ListPageSkeleton,
} from "@/components/layout/page-loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveAppPageMeta } from "@/lib/navigation/app-page-meta";

function HomeRouteLoading() {
  return (
    <div
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Home wordt geladen"
    >
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 pt-1">
        <Link href="/app" className="justify-self-start" aria-label="Convix home">
          <ConvixMark className="size-8" />
        </Link>
        <div className="flex justify-center justify-self-center">
          <Skeleton className="h-9 w-40 rounded-full bg-white/60" />
        </div>
        <Link
          href="/app/settings"
          className="flex size-11 shrink-0 items-center justify-center justify-self-end rounded-full bg-white/70 text-slate-700 shadow-sm ring-1 ring-white/80 backdrop-blur"
          aria-label="Instellingen"
        >
          <Settings className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
      </header>
      <HomePageSkeleton showChrome={false} />
    </div>
  );
}

export function AppRouteLoading() {
  const pathname = usePathname();
  const meta = resolveAppPageMeta(pathname);

  if (!meta || meta.variant === "home") {
    return <HomeRouteLoading />;
  }

  if (meta.variant === "form") {
    return <FormPageSkeleton title={meta.title} icon={meta.icon} />;
  }

  return (
    <ListPageSkeleton
      title={meta.title}
      icon={meta.icon}
      withTabs={pathname === "/app/uitgaand"}
    />
  );
}
