# Phase 5 — Snelle uitgaven & ledger

## Done in code

1. **Snelle uitgave** (`/app/expenses/new`)
   - Bedrag-first formulier
   - Categorie als horizontale chips (optioneel)
   - **Opslaan** → terug naar dashboard
   - **Opslaan & nog een** → form reset, blijft op de pagina
   - Default rekening = eerste actieve **checking**-account
   - Overbudget blokkeert nooit het opslaan
   - Nederlandse validatie-/foutmeldingen

2. **Ledger + tijdlijn**
   - Uitgaven landen in `ledger_events` (type `expense`) gekoppeld aan open periode
   - Tijdlijn toont werkelijke events + openstaande verplichtingen
   - **Betaald** op geplande/teruggeboekte verplichtingen → `settleObligation`
   - **Terugboeking** op ledger-rijen met `obligation_id` → `registerRefund` (heropent verplichting)

3. Actions: `app/actions/expenses.ts`, `app/actions/obligations.ts`

## Your verify steps

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 5.
