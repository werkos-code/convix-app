# Push notifications architecture (Phase 11)

## Choice

**Web Push + VAPID**, subscriptions in Supabase (`push_subscriptions`), send via Next.js Route Handlers. Vercel Cron hits `/api/push/dispatch` daily; optional Supabase Edge Function can call the same endpoint.

No OneSignal (etc.) for V1.

## Browser / OS support

| Platform | Support |
|----------|---------|
| Android Chrome (installed PWA or browser) | Good |
| Desktop Chrome / Edge / Firefox | Good |
| iOS / iPadOS Safari | Only when added to **Home Screen**, **iOS 16.4+**, permission from standalone PWA |
| iOS Chrome / in-app browsers | Not reliable — use Safari install |

## Permission flow

1. User installs PWA (especially on iOS).
2. Settings → **Meldingen inschakelen** (never on marketing first paint).
3. Optional: toggle which event types to receive.

## Infrastructure

| Piece | Role |
|-------|------|
| Service worker (`app/sw.ts`) | Receives `push`, shows notifications |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | VAPID |
| `CRON_SECRET` | Protects fan-out |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron reads all users + writes `notification_log` |
| `POST/DELETE/PUT /api/push/subscribe` | Subscribe / unsubscribe / test |
| `GET/POST /api/push/dispatch` | Evaluate + send (cron or self-check) |
| `notification_preferences` | Per-event toggles |
| `notification_log` | Dedupe (`user_id` + `dedupe_key`) |

## Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Add to Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, plus existing Supabase keys including **service role**.

## Cron

`vercel.json` schedules `GET /api/push/dispatch` daily at 07:00 UTC. Vercel sends `Authorization: Bearer ${CRON_SECRET}` when `CRON_SECRET` is set.

## Events (deterministic)

| Pref key | When |
|----------|------|
| `period_started` | Open period `starts_on` = today |
| `confirm_balance` | Balance not confirmed (max 1×/day) |
| `large_upcoming_payment` | Insight `large_payment` / `debt_upcoming` |
| `klarna_due_soon` | Insight `klarna_upcoming` |
| `free_spendable_negative` | Free Spendable &lt; 0 |
| `budget_exceeded` | Insight `budget_exceeded` |

## Local test

1. Set VAPID + service role in `.env.local`
2. `npm run dev`, install PWA or use Chrome
3. Settings → meldingen inschakelen → Testmelding
4. “Nu controleren op meldingen” for evaluate path
