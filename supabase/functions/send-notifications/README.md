# Optional: Supabase Edge Function → Convix dispatch

Preferred production path is **Vercel Cron** → `GET /api/push/dispatch`.

If you prefer Supabase cron, deploy a thin function that calls your Next app:

```ts
// supabase/functions/send-notifications/index.ts
Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  const site = Deno.env.get("CONVIX_SITE_URL"); // https://convix.cloud
  if (!secret || !site) {
    return new Response("Missing CRON_SECRET or CONVIX_SITE_URL", { status: 500 });
  }

  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const res = await fetch(`${site}/api/push/dispatch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});
```

Secrets: `CRON_SECRET`, `CONVIX_SITE_URL`.

Schedule in Supabase Dashboard → Edge Functions → Cron, or `pg_cron` calling the function URL.
