# Phase 8 — Spaardoelen

## Done in code

1. **Doelen** (`/app/savings`)
   - Naam, al gespaard, optioneel doelbedrag, maandelijkse bijdrage + dag
   - Materialiseert `savings_contribution`-obligations (open + volgende periode)
   - Progressbalk bij doelbedrag
   - Totalen: gespaard + gepland per maand

2. **Bijdragen**
   - Knop **Bijdragen** op de kaart → ledger `savings_contribution` + goal ↑ + obligation settle
   - Of via Tijdlijn **Betaald** → zelfde goal-update
   - Terugboeking verlaagt goal-saldo weer

3. **Verwijderen**
   - Soft-delete + openstaande spaarverplichtingen → `cancelled`

4. Nederlandse validatie; glass UI

## Your verify steps

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 8.
