# Security notes (V1)

## Row Level Security

Every user-owned table in `supabase/migrations/20250923000000_init.sql` has RLS enabled with policies of the form `auth.uid() = user_id` (profiles use `auth.uid() = id`).

Ledger events are insert + select only (no update/delete) so the money trail stays append-only.

## Secrets

| Variable | Client? |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (RLS protects data) |
| `NEXT_PUBLIC_SITE_URL` | Yes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **Never** — server / Edge / cron only |
| `VAPID_PRIVATE_KEY` | **Never** |
| `CRON_SECRET` | **Never** — protects `/api/push/dispatch` |

## HTTP headers

Set in `next.config.ts` for all routes:

- `Content-Security-Policy` (self + Supabase connect; inline scripts/styles allowed for Next/Tailwind V1)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo off)

`robots.txt` disallows `/app/` and `/api/`.

## App boundaries

- Middleware refreshes the session and redirects unauthenticated users away from `/app/*` (fail-closed if Supabase env missing).
- Mutations run as Server Actions with Zod validation (`lib/validations/schemas.ts`).
- Prefer the user-scoped Supabase client; do not ship the service role to the browser.

## Backups

Enable Supabase PITR (Pro) or scheduled logical dumps before relying on Convix for real balances.

## Audit

Financial corrections use new ledger events (including `refund_return` and `balance_adjustment`), not silent row edits.
