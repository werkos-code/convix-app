-- Convix V1 schema + RLS
-- Apply via Supabase SQL editor or `supabase db push`

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  salary_day int not null default 24 check (salary_day >= 1 and salary_day <= 28),
  currency text not null default 'EUR' check (currency = 'EUR'),
  timezone text not null default 'Europe/Amsterdam',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'other')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  last_confirmed_balance_cents bigint not null default 0,
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);
alter table public.accounts enable row level security;

create policy "accounts_all_own" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Salary periods
-- ---------------------------------------------------------------------------
create table public.salary_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  expected_available_cents bigint not null default 0,
  actual_available_cents bigint,
  carry_over_cents bigint not null default 0,
  balance_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, starts_on),
  check (ends_on >= starts_on)
);

create index salary_periods_user_status_idx on public.salary_periods (user_id, status);
alter table public.salary_periods enable row level security;

create policy "salary_periods_all_own" on public.salary_periods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.period_account_balances (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.salary_periods (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expected_cents bigint not null default 0,
  actual_cents bigint,
  carry_over_cents bigint not null default 0,
  unique (period_id, account_id)
);

alter table public.period_account_balances enable row level security;

create policy "period_account_balances_all_own" on public.period_account_balances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Income rules
-- ---------------------------------------------------------------------------
create table public.income_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  recurrence text not null check (recurrence in ('monthly', 'yearly', 'once')),
  day_of_month int check (day_of_month is null or (day_of_month >= 1 and day_of_month <= 28)),
  month_of_year int check (month_of_year is null or (month_of_year >= 1 and month_of_year <= 12)),
  account_id uuid references public.accounts (id) on delete set null,
  is_active boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

alter table public.income_rules enable row level security;
create policy "income_rules_all_own" on public.income_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Fixed expense rules
-- ---------------------------------------------------------------------------
create table public.fixed_expense_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  category text,
  recurrence text not null check (recurrence in ('monthly', 'yearly', 'once')),
  day_of_month int check (day_of_month is null or (day_of_month >= 1 and day_of_month <= 28)),
  month_of_year int check (month_of_year is null or (month_of_year >= 1 and month_of_year <= 12)),
  account_id uuid references public.accounts (id) on delete set null,
  is_active boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

alter table public.fixed_expense_rules enable row level security;
create policy "fixed_expense_rules_all_own" on public.fixed_expense_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Variable budgets
-- ---------------------------------------------------------------------------
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  default_amount_cents bigint not null default 0 check (default_amount_cents >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.budget_categories enable row level security;
create policy "budget_categories_all_own" on public.budget_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.period_budgets (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.salary_periods (id) on delete cascade,
  category_id uuid not null references public.budget_categories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  allocated_cents bigint not null default 0 check (allocated_cents >= 0),
  unique (period_id, category_id)
);

alter table public.period_budgets enable row level security;
create policy "period_budgets_all_own" on public.period_budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Obligations (materialized planned occurrences)
-- ---------------------------------------------------------------------------
create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_id uuid references public.salary_periods (id) on delete set null,
  kind text not null check (kind in (
    'income', 'fixed_expense', 'savings_contribution',
    'debt_payment', 'klarna_installment', 'one_time'
  )),
  name text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  remaining_open_cents bigint not null check (remaining_open_cents >= 0),
  status text not null default 'planned' check (status in (
    'planned', 'due', 'partially_paid', 'settled',
    'returned_open', 'cancelled', 'waived'
  )),
  due_on date not null,
  account_id uuid references public.accounts (id) on delete set null,
  budget_category_id uuid references public.budget_categories (id) on delete set null,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create index obligations_user_period_idx on public.obligations (user_id, period_id);
create index obligations_user_due_idx on public.obligations (user_id, due_on);
alter table public.obligations enable row level security;
create policy "obligations_all_own" on public.obligations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Ledger events (append-only money movements)
-- ---------------------------------------------------------------------------
create table public.ledger_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'expense', 'payment', 'income', 'refund_return',
    'savings_contribution', 'debt_payment', 'balance_adjustment'
  )),
  name text not null,
  amount_cents bigint not null,
  occurred_on date not null,
  account_id uuid references public.accounts (id) on delete set null,
  obligation_id uuid references public.obligations (id) on delete set null,
  budget_category_id uuid references public.budget_categories (id) on delete set null,
  period_id uuid references public.salary_periods (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index ledger_events_user_occurred_idx on public.ledger_events (user_id, occurred_on desc);
create index ledger_events_obligation_idx on public.ledger_events (obligation_id);
alter table public.ledger_events enable row level security;
create policy "ledger_events_select_own" on public.ledger_events
  for select using (auth.uid() = user_id);
create policy "ledger_events_insert_own" on public.ledger_events
  for insert with check (auth.uid() = user_id);
-- Updates/deletes intentionally restricted; corrections via new events

-- ---------------------------------------------------------------------------
-- Savings
-- ---------------------------------------------------------------------------
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  current_amount_cents bigint not null default 0 check (current_amount_cents >= 0),
  target_amount_cents bigint check (target_amount_cents is null or target_amount_cents >= 0),
  scheduled_amount_cents bigint not null default 0 check (scheduled_amount_cents >= 0),
  contribution_day int check (contribution_day is null or (contribution_day >= 1 and contribution_day <= 28)),
  recurrence text not null default 'monthly' check (recurrence in ('monthly', 'yearly', 'once')),
  linked_account_id uuid references public.accounts (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.savings_goals enable row level security;
create policy "savings_goals_all_own" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Debts
-- ---------------------------------------------------------------------------
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  outstanding_cents bigint not null default 0 check (outstanding_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.debts enable row level security;
create policy "debts_all_own" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.debt_payment_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  debt_id uuid not null references public.debts (id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  day_of_month int not null check (day_of_month >= 1 and day_of_month <= 28),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.debt_payment_rules enable row level security;
create policy "debt_payment_rules_all_own" on public.debt_payment_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Klarna
-- ---------------------------------------------------------------------------
create table public.klarna_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  total_cents bigint not null check (total_cents >= 0),
  purchased_on date not null,
  plan text not null check (plan in ('pay_in_30', 'pay_in_3', 'custom')),
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.klarna_purchases enable row level security;
create policy "klarna_purchases_all_own" on public.klarna_purchases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.klarna_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purchase_id uuid not null references public.klarna_purchases (id) on delete cascade,
  sequence int not null,
  due_on date not null,
  amount_cents bigint not null check (amount_cents >= 0),
  obligation_id uuid references public.obligations (id) on delete set null,
  status text not null default 'planned' check (status in (
    'planned', 'due', 'partially_paid', 'settled', 'returned_open', 'cancelled'
  )),
  unique (purchase_id, sequence)
);

alter table public.klarna_installments enable row level security;
create policy "klarna_installments_all_own" on public.klarna_installments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_all_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  period_started boolean not null default true,
  confirm_balance boolean not null default true,
  large_upcoming_payment boolean not null default true,
  klarna_due_soon boolean not null default true,
  free_spendable_negative boolean not null default true,
  budget_exceeded boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "notification_preferences_all_own" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  dedupe_key text not null,
  payload jsonb,
  sent_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table public.notification_log enable row level security;
create policy "notification_log_select_own" on public.notification_log
  for select using (auth.uid() = user_id);
