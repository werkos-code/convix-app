# Your Convix to-dos

This is **your** checklist — things only you can do in GitHub, Supabase, Google Cloud, Vercel, and DNS.

Cursor builds the code. You connect the accounts and go live.

Mark items `[x]` as you finish them. Detailed click-by-click steps: [phase-1-setup.md](./phase-1-setup.md).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **You** | Waiting on you |
| **Done in code** | Already implemented in this repo |

---

## Phase 1 — Live shell on convix.cloud

Goal: open `https://convix.cloud` on your phone, install as PWA, sign in with Google.

### A. GitHub — You

- [x] Create / use GitHub account
- [x] Create **private** repo `convix-app` ([werkos-code/convix-app](https://github.com/werkos-code/convix-app))
- [x] Add remote and push this project (`main`)
- [x] Confirm `.env.local` is **not** in the repo

### B. Supabase — You

- [ ] Create project `convix-prod` (EU region recommended)
- [ ] Save DB password in password manager
- [ ] Copy Project URL → will become `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy **anon** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (never share / never commit)
- [ ] Run SQL migration: `supabase/migrations/20250923000000_init.sql` in SQL Editor
- [ ] Auth → URL config: Site URL + redirect URLs (`localhost` + `https://convix.cloud/auth/callback`)

### C. Google Cloud OAuth — You

- [ ] Create/select Google Cloud project
- [ ] Configure OAuth consent screen (app name **Convix**)
- [ ] Create OAuth Client ID (Web application)
- [ ] Authorized redirect URI = `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Paste Client ID + Secret into Supabase → Auth → Google → Enable

### D. Vercel — You

- [ ] Import GitHub `convix` repo into Vercel
- [ ] Set env vars (Production + Preview):

  | Name | From |
  |------|------|
  | `NEXT_PUBLIC_SITE_URL` | `https://convix.cloud` |
  | `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
  | `SUPABASE_SERVICE_ROLE_KEY` | Supabase |

- [ ] Deploy and open the `*.vercel.app` URL over HTTPS

### E. Domain DNS — You

- [ ] In Vercel: add domain `convix.cloud`
- [ ] At registrar: create the A/CNAME records Vercel shows
- [ ] Wait until domain = Valid, certificate = Issued
- [ ] Update Supabase Site URL to `https://convix.cloud`
- [ ] Open `https://convix.cloud` on your phone

### F. Phone / PWA verify — You

- [ ] Android: Install app / Add to Home screen
- [ ] iOS Safari: Share → Add to Home Screen
- [ ] Confirm standalone icon opens Convix
- [ ] Google login works on phone
- [ ] Session survives closing and reopening the installed app

### Phase 1 — Done in code

- [x] Next.js project + TypeScript + Tailwind
- [x] Landing page + login shell
- [x] PWA manifest + service worker (Serwist)
- [x] Icons + offline page
- [x] Security headers
- [x] Setup docs

---

## Phase 2 — Authentication & user foundation

Goal: Google login creates an isolated user profile; unauthenticated users cannot reach `/app`.

### You (depends on Phase 1 B–C)

- [ ] Google provider enabled in Supabase (see Phase 1 C)
- [ ] Test login on production URL after deploy
- [ ] Confirm a row appears in Supabase → Table Editor → `profiles` after first login

### Done in code

- [x] Supabase browser + server clients (`lib/supabase/*`)
- [x] Session middleware protecting `/app/*`
- [x] Google OAuth sign-in / sign-out actions
- [x] Auth callback → onboarding or dashboard
- [x] `profiles` table + auto-create trigger on signup
- [x] Onboarding redirect when profile incomplete
- [x] RLS policies on all tables (user owns own rows)

---

## Phase 3 — Accounts, schema & onboarding balances

Goal: multi-account model, starting balances, first salary period confirmed.

### You (in the live / local app after Phase 1–2)

- [ ] Run SQL migration if not done yet (`supabase/migrations/20250923000000_init.sql`)
- [ ] Complete onboarding: checking balance + salary day **24**
- [ ] Optional: add savings account during onboarding
- [ ] Open **Accounts** — edit a balance, deactivate/reactivate an account
- [ ] Confirm dashboard no longer asks for balance (onboarding auto-confirms first period)
- [ ] In Supabase Table Editor, verify rows in: `accounts`, `salary_periods`, `period_account_balances`, `budget_categories`, `period_budgets`

### Done in code

- [x] Full relational schema + RLS migration
- [x] Accounts CRUD (create, edit balance, activate/deactivate)
- [x] Onboarding creates accounts, seeds budgets, opens period
- [x] Onboarding auto-confirms period balances (zero carry-over on first setup)
- [x] Savings accounts excluded from Free Spendable cash basis
- [x] `period_account_balances` snapshots per account

---

## Phase 4 — Salarisperioden & Free Spendable

Goal: periodes openen/rollen, budgetten resetten, Free Spendable correct berekenen, saldo bevestigen.

### You (in de app na Phase 1–3)

- [ ] Open de app op/na salarisdag (of wacht tot 24e) → nieuwe periode
- [ ] Banner “Bevestig saldi” verschijnt
- [ ] Bevestig werkelijk banksaldo; check carry-over (verschil verwacht ↔ werkelijk)
- [ ] Check dat variabele budgetten opnieuw op default staan (geen unused rollover)
- [ ] Check dashboard “Vrij besteedbaar” na een testuitgave

### Done in code

- [x] Periode-math 24→23
- [x] Rollover: vorige sluiten, expected zetten, budgets resetten, materialiseren
- [x] Free Spendable engine + uitgebreide unit tests
- [x] `syncCurrentSalaryPeriod` action
- [x] Docs: [phase-4-periods.md](./phase-4-periods.md)

---

## Phase 5 — Snelle uitgaven & ledger

Goal: in 2 seconden een uitgave loggen; tijdlijn met afboeken en terugboekingen.

### You (in de app na Phase 1–4)

- [ ] Open **Uitgave** (of snelle uitgave) → bedrag + naam → Opslaan
- [ ] Check dashboard: Free Spendable daalt; tijdlijn toont de uitgave
- [ ] Kies een budgetcategorie-chip → Opslaan & nog een → tweede uitgave zonder de pagina te verlaten
- [ ] Op Tijdlijn: markeer een geplande vaste last als **Betaald**
- [ ] Op die betaalde regel: **Terugboeking** → verplichting heropent (status “Teruggeboekt”)
- [ ] Bevestig in Supabase → `ledger_events` dat expense / payment / refund_return rijen kloppen

### Done in code

- [x] Quick expense form (chips, opslaan & nog een, default checking)
- [x] `createQuickExpense` → ledger + periode + geen budget-blok
- [x] Timeline settle (**Betaald**) + refund (**Terugboeking**)
- [x] Nederlandse foutmeldingen
- [x] Docs: [phase-5-expenses.md](./phase-5-expenses.md)

---

## Phase 6 — Vaste lasten & variabele budgetten

Goal: vaste regels materialiseren; budgetcategorieën reserveren Free Spendable zonder overspend te blokkeren.

### You (in de app)

- [ ] Voeg vaste last toe (bijv. huur, dag 1) → check Tijdlijn “Gepland”
- [ ] Voeg jaarlijkse last toe met maand → alleen in de juiste periode
- [ ] Verwijder een vaste last → verdwijnt uit lijst en openstaande verplichting
- [ ] Voeg budgetcategorie toe (bijv. Boodschappen €400)
- [ ] Pas budget **deze periode** aan → Free Spendable verandert; volgende periode gebruikt standaard opnieuw
- [ ] Log een uitgave in die categorie boven budget → opslaan lukt; “Over …” zichtbaar
- [ ] Voeg inkomstenregel toe (salaris, salarisdag) → telt als verwachte inkomsten

### Done in code

- [x] Fixed expense CRUD (create + soft-delete) + yearly/once
- [x] Budget categories + period allocation edit + deactivate
- [x] Income rules (create + soft-delete), default = salary day
- [x] Materialisatie open + volgende periode
- [x] Docs: [phase-6-budgets.md](./phase-6-budgets.md)

---

## Phase 7 — Klarna

Goal: Klarna-aankopen plannen; termijnen reserveren Free Spendable in de juiste salarisperiode.

### You (in de app)

- [ ] Voeg **Betaal in 30** toe (€100) → check termijn +30 dagen op Tijdlijn / Klarna-kaart
- [ ] Voeg **Betaal in 3** toe → 3 termijnen (nu, +1 mnd, +2 mnd); bedragen sommeren tot totaal
- [ ] Check Free Spendable: open Klarna-termijn in huidige periode verlaagt het
- [ ] Schakel naar volgende periode op home → termijn daar zichtbaar in vooruitblik
- [ ] Markeer een termijn **Betaald** op de tijdlijn → status “Betaald”; aankoop “Afgerond” als alle termijnen klaar zijn
- [ ] Annuleer een open aankoop → verdwijnt uit openstaand / Free Spendable

### Done in code

- [x] Create purchase + installments + obligations (alle due-periodes)
- [x] Schedule preview in form
- [x] Purchase cards + cancel + paid sync
- [x] Docs: [phase-7-klarna.md](./phase-7-klarna.md)

---

## Phase 8 — Spaardoelen

Goal: spaardoelen met maandelijkse bijdragen; bijdragen verlagen Free Spendable en verhogen het doel.

### You (in de app)

- [ ] Voeg spaardoel toe (bijv. Noodfonds, €100/maand, dag 1)
- [ ] Check **Binnenkort** / Tijdlijn: spaarbijdrage gepland
- [ ] Check Free Spendable daalt door de openstaande bijdrage
- [ ] **Bijdragen** op de spaarkaart (of Betaald op tijdlijn) → doelsaldo ↑, verplichting afgerond
- [ ] Verwijder een doel → verdwijnt uit Binnenkort

### Done in code

- [x] Create goal + materialisatie
- [x] Contribute + timeline settle updates goal balance
- [x] Soft-delete + cancel open obligations
- [x] Docs: [phase-8-savings.md](./phase-8-savings.md)

---

## Phase 9 — Schulden

Goal: openstaande schulden + maandelijkse aflossing; betalen verlaagt Free Spendable en outstanding.

### You (in de app)

- [ ] Voeg schuld toe (bijv. DUO, openstaand + maandbedrag + dag)
- [ ] Check **Binnenkort**: aflossing gepland
- [ ] **Aflossen** (of Betaald op tijdlijn) → openstaand ↓
- [ ] Verwijder een schuld → verdwijnt uit Binnenkort

### Done in code

- [x] Create debt + payment rule + materialisatie
- [x] Pay + timeline settle/refund sync outstanding
- [x] Soft-delete + cancel open obligations
- [x] Docs: [phase-9-debts.md](./phase-9-debts.md)

---

## Phase 10 — Dashboard, tijdlijn & inzichten

Goal: overzicht scherp — home-waarschuwingen, gefilterde tijdlijn, leesbare inzichten.

### You (in de app)

- [ ] Home: bij overbudget of aankomende Klarna → banner met link naar Inzichten
- [ ] Tijdlijn: filter Klarna / Gepland; groepeer per datum; Betaald markeren
- [ ] Inzichten: lege staat “Alles oké” of lijst met ernst-labels
- [ ] Check dat datums DD-MM-JJJJ zijn in inzichten

### Done in code

- [x] Warning banner + insights link
- [x] Timeline grouping + period label + empty state
- [x] Deterministic insights NL + debt/Klarna windows
- [x] Docs: [phase-10-dashboard.md](./phase-10-dashboard.md)

---

## Phase 11 — Web Push

Goal: tijdige meldingen (nieuwe periode, saldo bevestigen, Klarna, negatief FS, budget).

### You

- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Add to Vercel (en lokaal `.env.local`): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Deploy zodat `vercel.json` cron actief is
- [ ] Installeer PWA op telefoon → Instellingen → Meldingen inschakelen
- [ ] (iOS) Beginscherm-app, iOS 16.4+
- [ ] Stuur **Testmelding**; optioneel **Nu controleren**

Details: [phase-11-push.md](./phase-11-push.md) · [push-notifications.md](./push-notifications.md)

### Done in code

- [x] Subscribe / unsubscribe / test API
- [x] Dispatch + evaluate + dedupe log
- [x] Instellingen UI + voorkeuren
- [x] Vercel cron + docs

---

## Phase 12 — Polish & hardening

Goal: productie-klaar — geen democijfers, nette fouten, CSP, offline-signaal, backups-notitie.

### You

- [ ] Deploy en check: niet-ingelogd → `/app` redirect naar login (geen nep-saldo)
- [ ] Offline: zet netwerk uit in DevTools → amber banner in de app
- [ ] Bevestig `https://convix.cloud/robots.txt` disallow `/app/`
- [ ] Supabase: PITR of backup-plan aanzetten wanneer je echte data gebruikt ([security.md](./security.md))

### Done in code

- [x] Demo-mode verwijderd; auth verplicht in app-pagina’s
- [x] error / loading / not-found + offline-banner
- [x] CSP, robots, sitemap, metadata
- [x] Landing CTA + docs: [phase-12-polish.md](./phase-12-polish.md)

---

## Later — data doorlopen (na live shell)

After the shell is live and periods work, walk through and tick:

### App data setup — You

- [ ] Complete onboarding (checking account + starting balance + salary day)
- [ ] Confirm first salary period opened
- [ ] Add fixed expenses (rent, insurance, joint contribution, …)
- [ ] Add variable budgets (groceries, fuel, …)
- [ ] Add income rule (salary)
- [ ] Add a Klarna purchase (30-day and/or pay-in-3)
- [ ] Add a savings goal
- [ ] Add a debt (e.g. DUO) with planned payment
- [ ] Record a quick expense from the phone
- [ ] Confirm bank balance at period start flow

---

## Local development (anytime)

```bash
cp .env.example .env.local
# paste Supabase URL + anon key (+ service role if needed)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Blockers / notes

Use this space while you work:

| Date | Note |
|------|------|
| | e.g. “Waiting on DNS propagation for convix.cloud” |
| | e.g. “Google OAuth consent still in Testing — add my Gmail as test user” |

---

## Recommended order (short)

1. GitHub push  
2. Supabase project + SQL migration  
3. Google OAuth → Supabase  
4. Vercel + env vars  
5. DNS `convix.cloud`  
6. Phone PWA + Google login  
7. Onboarding in the app  

When Phase 1 checkboxes above are done, tell Cursor — we can verify Phase 2 live and continue with any gaps.
