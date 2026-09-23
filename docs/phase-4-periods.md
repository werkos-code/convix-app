# Phase 4 — Salarisperioden & Free Spendable engine

## Done in code

1. **Salary period math** — 24e → 23e volgende maand (`lib/periods/salary-period.ts`)
2. **Period open / rollover** — `ensureOpenPeriod`:
   - opent huidige periode
   - sluit vorige
   - zet `expected_available` (vorige actual of rekening-saldi)
   - reset variabele budgetten (geen unused rollover)
   - materialiseert verplichtingen voor huidige + volgende periode
   - laat `balance_confirmed_at` leeg tot de gebruiker bevestigt
3. **Free Spendable engine** — pure calc + unit tests (`lib/calc/free-spendable.ts`)
4. **Sync action** — `syncCurrentSalaryPeriod` in `app/actions/periods.ts`

## Your verify steps

Zie [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 4.

Op salarisdag (of door de datum in tests):

1. App openen → nieuwe periode start
2. Banner “Bevestig saldi” verschijnt
3. Verwacht bedrag vs werkelijk → carry-over zichtbaar
4. Budgetten opnieuw op default-bedragen
