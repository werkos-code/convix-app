# Phase 9 — Schulden

## Done in code

1. **Schuld + betalingsregel** (`/app/debts`)
   - Naam, openstaand saldo, maandelijkse aflossing + dag
   - Materialiseert `debt_payment`-obligations (open + volgende periode)
   - Totalen: openstaand + aflossing/maand

2. **Aflossen**
   - Knop **Aflossen** → ledger `debt_payment` + outstanding ↓ + obligation settle
   - Of via Tijdlijn **Betaald** →zelfde outstanding-update
   - Terugboeking verhoogt outstanding weer

3. **Verwijderen**
   - Soft-delete schuld + regels; openstaande obligations → `cancelled`

4. Geen rente-engine (V1); Nederlandse validatie; glass UI

## Your verify steps

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 9.
