import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <WifiOff className="size-7" aria-hidden />
      </div>
      <p className="mt-6 font-display text-3xl font-semibold text-slate-900">
        Convix
      </p>
      <h1 className="mt-6 text-xl font-semibold text-slate-900">
        Je bent offline
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Controleer je verbinding en probeer opnieuw. Gecachte pagina&apos;s
        werken mogelijk nog.
      </p>
      <Button asChild className="mt-8" size="lg">
        <Link href="/app">Opnieuw proberen</Link>
      </Button>
    </main>
  );
}
