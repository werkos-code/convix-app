# Convix

Personal financial cockpit. Answers: **how much can I safely spend until my next salary?**

Live target: [https://convix.cloud](https://convix.cloud)

## Stack

- Next.js (App Router) + TypeScript strict + Tailwind CSS
- Supabase (Postgres, Auth Google OAuth, RLS)
- Vercel hosting + PWA (Serwist) + Web Push (VAPID)
- Money stored as **EUR cents** (integers)

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Apply the SQL migration in `supabase/migrations/` to your Supabase project before using finance features.

Full external setup (GitHub, Supabase, Google OAuth, Vercel, DNS, PWA, push):

- **Your checklist (start here):** [docs/YOUR-TODOS.md](docs/YOUR-TODOS.md)
- Click-by-click Phase 1: [docs/phase-1-setup.md](docs/phase-1-setup.md)
- Security & backups: [docs/security.md](docs/security.md)
- Architecture: [docs/architecture-v1.md](docs/architecture-v1.md)

## Production env (Vercel)

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://convix.cloud` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — push dispatch |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push |
| `CRON_SECRET` | Protects `/api/push/dispatch` |

See `.env.example` for the full list.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm test` | Unit tests (Free Spendable, periods, insights, push) |
| `npm run lint` | ESLint |

## Core concept

**Free Spendable** ≠ bank balance. It subtracts open obligations and remaining variable budget reserves from tracked cash (last confirmed balance ± ledger since confirm).

## Project map

- `app/(app)/app/*` — authenticated screens (dashboard, timeline, quick expense, Klarna, …)
- `app/actions/*` — server mutations
- `lib/calc` — Free Spendable engine
- `lib/periods` — salary period date math (24th → 23rd)
- `lib/push` — Web Push evaluate + send
- `supabase/migrations` — schema + RLS
