# Phase 7 — Klarna

## Done in code

1. **Aankoop aanmaken** (`/app/klarna`)
   - Plan: **Betaal in 30** (1 termijn, +30 dagen) of **Betaal in 3** (nu + +1 mnd + +2 mnd)
   - Live preview van het betaalplan in het formulier
   - Elke termijn → `klarna_installments` + `obligations` (`klarna_installment`)
   - Periode voor elke due-date wordt automatisch aangemaakt (ook voorbij “volgende”)

2. **Overzicht**
   - Openstaand totaal
   - Uitklapbare aankoopkaarten met termijnen + status
   - **Annuleren** → open termijnen/obligations cancelled

3. **Afronden**
   - Betaald markeren via Tijdlijn (**Betaald**)
   - Als alle termijnen settled → aankoopstatus `paid`
   - Terugboeking heropent verplichting + sync status

4. Nederlandse validatie; glass UI

## Your verify steps

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 7.
