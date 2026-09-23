import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/app";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", user.id)
            .maybeSingle();

          if (!profile?.onboarding_completed_at) {
            return NextResponse.redirect(`${origin}/app/onboarding`);
          }
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // Fall through to login error redirect.
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
