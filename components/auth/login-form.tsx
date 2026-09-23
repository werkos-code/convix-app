"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  signInWithPassword,
  signUpWithPassword,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/app/actions/_result";

const initialSignIn: ActionResult | null = null;
const initialSignUp: ActionResult<{ needsConfirm?: boolean }> | null = null;

export function LoginForm({
  configMissing,
  authError,
}: {
  configMissing?: boolean;
  authError?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialSignIn,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    initialSignUp,
  );

  const pending = signInPending || signUpPending;
  const state = mode === "login" ? signInState : signUpState;
  const needsConfirm =
    mode === "signup" &&
    signUpState?.ok === true &&
    Boolean(signUpState.data?.needsConfirm);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {mode === "login" ? "Inloggen" : "Account aanmaken"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {mode === "login"
            ? "Log in met je e-mailadres en wachtwoord."
            : "Maak een account om je financiële cockpit te openen."}
        </p>
      </div>

      {configMissing ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Supabase is nog niet geconfigureerd. Zet URL en anon key in je
          omgeving (zie `.env.example`).
        </p>
      ) : null}

      {authError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Inloggen mislukt. Probeer opnieuw.
        </p>
      ) : null}

      {needsConfirm ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Account aangemaakt. Bevestig je e-mail via de link die Supabase
          stuurt, of zet “Confirm email” uit in Supabase → Authentication →
          Providers → Email (handig voor lokaal testen).
        </p>
      ) : null}

      {state && !state.ok ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {state.error}
        </p>
      ) : null}

      <form
        action={mode === "login" ? signInAction : signUpAction}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="jij@voorbeeld.nl"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Wachtwoord</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
            placeholder="Minstens 8 tekens"
            disabled={pending}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? "Bezig…"
            : mode === "login"
              ? "Inloggen"
              : "Account aanmaken"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? (
          <>
            Nog geen account?{" "}
            <button
              type="button"
              className="font-semibold text-accent underline-offset-2 hover:underline"
              onClick={() => setMode("signup")}
            >
              Maak er een
            </button>
          </>
        ) : (
          <>
            Al een account?{" "}
            <button
              type="button"
              className="font-semibold text-accent underline-offset-2 hover:underline"
              onClick={() => setMode("login")}
            >
              Log in
            </button>
          </>
        )}
      </p>

      <p className="text-center text-sm text-slate-500">
        <Link href="/" className="underline-offset-2 hover:underline">
          Terug naar home
        </Link>
      </p>
    </div>
  );
}
