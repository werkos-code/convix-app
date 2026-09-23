import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthedClient = SupabaseClient<Database>;

export class AuthError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Returns the authenticated user and Supabase client.
 * Redirects to /login when there is no session (default for server actions / RSC).
 * Pass `{ redirect: false }` to throw AuthError instead.
 */
export async function requireUser(options?: {
  redirect?: boolean;
}): Promise<{ user: User; supabase: AuthedClient }> {
  const shouldRedirect = options?.redirect !== false;

  let supabase: AuthedClient;
  try {
    supabase = await createClient();
  } catch (err) {
    if (shouldRedirect) redirect("/login");
    throw err instanceof Error ? err : new AuthError("Supabase unavailable");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (shouldRedirect) redirect("/login");
    throw new AuthError(error?.message ?? "Not authenticated");
  }

  return { user, supabase };
}
