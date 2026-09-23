import Link from "next/link";
import { redirect } from "next/navigation";

import { ConvixWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/app");
  } catch {
    // Geen Supabase — toon landing.
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-app-atmosphere" />

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <ConvixWordmark className="text-2xl [&_svg]:size-11" />
        <h1 className="sr-only">Convix</h1>
        <p className="mt-8 max-w-sm text-lg font-medium leading-relaxed text-slate-600">
          Hoeveel kun je veilig uitgeven tot je volgende salaris?
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">Inloggen</Link>
          </Button>
        </div>
        <p className="mt-6 max-w-sm text-xs leading-relaxed text-slate-500">
          Privé PWA — voeg Convix toe aan je beginscherm voor de beste ervaring
          (vereist op iPhone voor meldingen). Geen banksync in V1.
        </p>
      </main>
    </div>
  );
}
