import Link from "next/link";

import { signInWithGoogle } from "@/app/actions/auth";
import { ConvixWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Inloggen",
};

async function googleLoginAction() {
  "use server";
  await signInWithGoogle("/app");
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;
  const configMissing = errorParam === "config";

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-app-atmosphere" />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="glass-card rounded-[1.75rem] p-6">
          <Link href="/" className="inline-flex w-fit">
            <ConvixWordmark />
          </Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-950">
            Inloggen
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Ga verder met Google om je financiële cockpit te openen.
          </p>

          {configMissing ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Supabase is nog niet geconfigureerd. Zet URL en anon key in
              je omgeving (zie `.env.example`).
            </p>
          ) : null}

          <form action={googleLoginAction} className="mt-8">
            <Button type="submit" size="lg" className="w-full">
              Doorgaan met Google
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Terug naar home
          </Link>
        </p>
      </main>
    </div>
  );
}
