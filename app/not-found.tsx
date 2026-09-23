import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">
        404
      </p>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        Pagina niet gevonden
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Deze URL bestaat niet in Convix.
      </p>
      <Button asChild className="mt-8" size="lg">
        <Link href="/app">Naar home</Link>
      </Button>
    </main>
  );
}
