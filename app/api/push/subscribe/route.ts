import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isPushConfigured, sendWebPush } from "@/lib/push/send";

export const runtime = "nodejs";

/**
 * Register or refresh a Web Push subscription for the authenticated user.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: "Ongeldig abonnement" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: request.headers.get("user-agent"),
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Ensure prefs row exists
  await supabase.from("notification_preferences").upsert(
    { user_id: user.id },
    { onConflict: "user_id" },
  );

  return NextResponse.json({ ok: true });
}

/**
 * Remove a subscription endpoint for the current user.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "Endpoint ontbreekt" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Send a test push to the current user.
 */
export async function PUT(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "VAPID-sleutels ontbreken" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    url?: string;
  };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs?.length) {
    return NextResponse.json(
      { error: "Geen actief push-abonnement" },
      { status: 404 },
    );
  }

  const results: { endpoint: string; ok: boolean }[] = [];
  for (const sub of subs) {
    const result = await sendWebPush(sub, {
      title: payload.title ?? "Convix",
      body: payload.body ?? "Testmelding — push werkt.",
      url: payload.url ?? "/app",
    });
    results.push({ endpoint: sub.endpoint, ok: result.ok });

    // Gone / expired subscription
    if (!result.ok && (result.statusCode === 404 || result.statusCode === 410)) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);
    }
  }

  return NextResponse.json({ results });
}
