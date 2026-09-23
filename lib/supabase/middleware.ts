import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function nextWithPath(request: NextRequest, path: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-convix-pathname", path);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function isPublicPath(path: string) {
  return (
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/icons") ||
    path.startsWith("/brand") ||
    path === "/manifest.webmanifest" ||
    path === "/sw.js" ||
    path === "/offline" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = nextWithPath(request, request.nextUrl.pathname);
  const path = request.nextUrl.pathname;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed for the private app when env is missing.
  if ((!url || !key) && path.startsWith("/app")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    redirectUrl.searchParams.set("error", "config");
    return NextResponse.redirect(redirectUrl);
  }

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = nextWithPath(request, request.nextUrl.pathname);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(path) && path.startsWith("/app")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    const needsOnboarding = !profile?.onboarding_completed_at;
    const onOnboarding = path === "/app/onboarding";

    if (path === "/login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = needsOnboarding ? "/app/onboarding" : "/app";
      return NextResponse.redirect(redirectUrl);
    }

    if (needsOnboarding && path.startsWith("/app") && !onOnboarding) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app/onboarding";
      return NextResponse.redirect(redirectUrl);
    }

    if (!needsOnboarding && onOnboarding) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
