# Phase 11 — Web Push

## Done in code

1. **Subscribe API** (`/api/push/subscribe`)
   - `POST` — opslaan abonnement + prefs-rij
   - `DELETE` — uitschakelen
   - `PUT` — testmelding naar eigen devices

2. **Dispatch** (`/api/push/dispatch`)
   - `GET` (Vercel Cron) / `POST` (zelf-check vanuit Instellingen)
   - Cron: `Authorization: Bearer ${CRON_SECRET}`
   - Evalueert Free Spendable + inzichten → stuurt push → `notification_log` dedupe
   - Service role client voor fan-out

3. **Libs**
   - `lib/push/evaluate.ts` — kandidaten + voorkeuren
   - `lib/push/send.ts` — web-push / VAPID
   - `lib/supabase/admin.ts` — service-role client

4. **UI** (Instellingen → Meldingen)
   - In-/uitschakelen, testmelding, “Nu controleren”
   - Toggles per eventtype

5. **Service worker** — Nederlandse fallbacktekst

6. **Cron** — `vercel.json` dagelijks 07:00 UTC

## Your verify steps

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 11. Details: [push-notifications.md](./push-notifications.md).
