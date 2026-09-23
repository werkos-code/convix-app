# Phase 1 — Live deployment checklist (convix.cloud)

> **Prefer the living checklist:** [YOUR-TODOS.md](./YOUR-TODOS.md) — tick boxes there as you go.  
> This page has the detailed click-by-click steps.

Follow these steps in order. The app code is already in this repository.

## 1. GitHub

1. Create a GitHub account (if needed) and a **private** repository named `convix`.
2. From this project folder:

```bash
git remote add origin https://github.com/YOUR_USER/convix.git
git branch -M main
git add .
git commit -m "Initial Convix shell and finance foundation"
git push -u origin main
```

3. Do **not** commit `.env.local` or any secrets.
4. Branch strategy: `main` = production; use `feat/*` for larger changes. Vercel preview deploys PRs automatically.

## 2. Supabase

1. Go to [https://supabase.com](https://supabase.com) → New project.
2. Name: `convix-prod`. Region: **EU (Frankfurt or Amsterdam)** if you are in NL/EU.
3. Save the database password in a password manager.
4. Project Settings → API:
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
5. SQL Editor → New query → paste entire contents of  
   `supabase/migrations/20250923000000_init.sql` → Run.
6. Authentication → Providers → **Google** → Enable (fill Client ID/Secret after Google Cloud step).
7. Authentication → URL configuration:
   - Site URL: `https://convix.cloud` (use `http://localhost:3000` until DNS is live)
   - Redirect URLs:  
     `http://localhost:3000/auth/callback`  
     `https://convix.cloud/auth/callback`

## 3. Google Cloud OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. APIs & Services → OAuth consent screen → External (or Internal if Workspace) → App name **Convix**.
3. Credentials → Create Credentials → OAuth client ID → Application type **Web application**.
4. Authorized redirect URIs — **exactly** the Supabase callback:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

5. Copy Client ID and Client Secret into Supabase → Auth → Google.
6. Authorized JavaScript origins (optional): `https://convix.cloud`, `http://localhost:3000`.

## 4. Vercel

1. [vercel.com](https://vercel.com) → Add New Project → Import the GitHub `convix` repo.
2. Framework: Next.js (auto-detected).
3. Environment Variables (Production + Preview):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://convix.cloud` |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase |

4. Deploy. Confirm the `*.vercel.app` URL loads over HTTPS.

## 5. Domain DNS (convix.cloud)

1. In Vercel → Project → Settings → Domains → Add `convix.cloud`.
2. At your domain registrar, create the DNS records Vercel shows (usually A / CNAME).
3. Wait until status is **Valid** and certificate is **Issued**.
4. Update Supabase Site URL to `https://convix.cloud`.
5. Open `https://convix.cloud` on your phone.

## 6. PWA install (phone)

### Android (Chrome)
1. Open `https://convix.cloud`.
2. Menu → **Install app** / **Add to Home screen**.
3. Open the installed Convix icon (standalone, no browser chrome).

### iOS (Safari, iOS 16.4+)
1. Open `https://convix.cloud` in **Safari** (not Chrome).
2. Share → **Add to Home Screen**.
3. Open from the Home Screen for PWA mode (required later for push).

## 7. Google login on phone

1. Tap Login → Continue with Google.
2. Complete OAuth.
3. You should land on `/app` (or `/app/onboarding` if incomplete).
4. Confirm the session survives closing and reopening the installed PWA.

## 8. Local development

```bash
cp .env.example .env.local
# fill Supabase keys
npm install
npm run dev
```

Open `http://localhost:3000`.

## Phase 1 success criteria

- [ ] `https://convix.cloud` loads with HTTPS
- [ ] PWA installable on your phone
- [ ] Google authentication works
- [ ] You can open the authenticated shell

Finance features work after the migration is applied and you complete onboarding.
