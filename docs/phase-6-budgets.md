# Phase 6 — Vaste lasten & variabele budgetten

## Done in code

1. **Vaste lasten** (`/app/fixed`)
   - Maandelijks / jaarlijks (met maand) / eenmalig
   - Materialiseert verplichtingen voor open + volgende periode
   - Soft-delete: **Verwijderen** → `is_active=false` + openstaande obligations → `cancelled`
   - Eenmalig plant op dag in huidige periode (`starts_on`)

2. **Variabele budgetten** (`/app/budgets`)
   - Categorie + standaardbedrag per salarisperiode
   - **Aanpassen** = alleen allocatie deze periode (geen unused rollover)
   - **Verwijderen** = categorie uit; allocatie open periode → 0
   - Overschrijding blokkeert nooit uitgaven
   - Progress + overspend-waarschuwing

3. **Inkomsten** (`/app/income`) — meegenomen in deze fase
   - Default dag = salarisdag van profiel
   - Jaarlijkse maand + soft-delete zoals vaste lasten

4. Nederlandse validatie; glass UI op lijsten/forms

## Your verify steps

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 6.
