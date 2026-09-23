"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isNextControlFlowError } from "@/lib/auth/control-flow";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./_result";

const credentialsSchema = z.object({
  email: z.string().trim().email("Vul een geldig e-mailadres in"),
  password: z.string().min(8, "Wachtwoord minstens 8 tekens"),
});

async function redirectAfterAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  revalidatePath("/", "layout");
  redirect(profile?.onboarding_completed_at ? "/app" : "/app/onboarding");
}

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signInWithPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const parsed = parseCredentials(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return fail(
        error.message === "Invalid login credentials"
          ? "Onjuist e-mailadres of wachtwoord"
          : error.message,
      );
    }

    await redirectAfterAuth();
    return ok();
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return fail(e instanceof Error ? e.message : "Inloggen mislukt");
  }
}

export async function signUpWithPassword(
  _prev: ActionResult<{ needsConfirm?: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ needsConfirm?: boolean }>> {
  try {
    const parsed = parseCredentials(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Ongeldige invoer");
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return fail(error.message);
    }

    // Email confirmation enabled → no session yet
    if (!data.session) {
      return ok({ needsConfirm: true });
    }

    await redirectAfterAuth();
    return ok({ needsConfirm: false });
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return fail(e instanceof Error ? e.message : "Account aanmaken mislukt");
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
    if (isNextControlFlowError(e)) throw e;
    return fail(e instanceof Error ? e.message : "Uitloggen mislukt");
  }
}
