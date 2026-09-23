# Phase 3 — Financial data model (accounts & onboarding)

## Done in this phase

1. **Schema** — `supabase/migrations/20250923000000_init.sql` (profiles, accounts, periods, balances, budgets, obligations, ledger, Klarna, savings, debts, push).
2. **Accounts** — create / edit balance / activate / deactivate; checking+other are spendable; savings excluded from Free Spendable.
3. **Onboarding** — salary day default **24**, optional savings account, seeds Groceries/Fuel/Entertainment budgets, opens current salary period, **auto-confirms** starting balances into `period_account_balances`.

## Your verify steps

See [YOUR-TODOS.md](./YOUR-TODOS.md) → Phase 3.

## Key files

| File | Role |
|------|------|
| `app/actions/onboarding.ts` | Finish setup |
| `app/actions/accounts.ts` | Account mutations |
| `app/actions/balances.ts` | Period balance confirm |
| `lib/accounts/confirm-period-balances.ts` | Snapshot helper |
| `lib/periods/ensure-open-period.ts` | Open/materialize period |
