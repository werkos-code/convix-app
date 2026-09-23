"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./_result";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInWithGoogle(
  nextPath = "/app",
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = await createClient();
    const origin = await siteOrigin();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error || !data.url) {
      return fail(error?.message ?? "Google sign-in unavailable");
    }

    redirect(data.url);
  } catch (e) {
    // Next.js redirect() throws; rethrow control-flow redirects.
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return fail(e instanceof Error ? e.message : "Google sign-in failed");
  }
}

export async function signOut(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return fail(error.message);
    revalidatePath("/", "layout");
    redirect("/login");
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return fail(e instanceof Error ? e.message : "Sign out failed");
  }
}

/** Non-redirecting helper when the caller wants the OAuth URL only. */
export async function getGoogleSignInUrl(
  nextPath = "/app",
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = await createClient();
    const origin = await siteOrigin();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      return fail(error?.message ?? "Google sign-in unavailable");
    }
    return ok({ url: data.url });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Google sign-in failed");
  }
}
