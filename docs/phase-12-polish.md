# Phase 12 — Polish & hardening

## Done in code

1. **Geen democijfers meer** — home / tijdlijn / inzichten / rekeningen / onboarding vereisen auth; lege of foutstaten i.p.v. nep-geld
2. **Error / loading / 404** — NL recovery UI + skeleton in de app-shell
3. **Offline-banner** — sticky melding wanneer `navigator.onLine` false is
4. **Middleware** — `/app` fail-closed zonder Supabase-env; `/brand`, robots, sitemap publiek
5. **CSP + headers** — Content-Security-Policy naast bestaande frame/nosniff policies
6. **robots.ts / sitemap.ts** — `/app` en `/api` niet indexeren
7. **Metadata** — `metadataBase`, Open Graph / Twitter
8. **Landing** — één CTA (Google login), install-hint; geen “App openen” zonder sessie
9. **Scaffold-SVG’s** verwijderd uit `public/`

## Backups (jouw actie)

Zie [security.md](./security.md): schakel Supabase PITR (Pro) of geplande dumps in zodra er echte saldi staan.

## E2E

V1 dekt unit tests (Free Spendable, periods, insights, push evaluate). Volledige Playwright-suite is optioneel post-V1; smoke = login redirect + `/app` gated via middleware.

## Your verify

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 12.
