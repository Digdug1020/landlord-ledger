-- Staging schema migration: bring da-rentals project in line with production
-- Run this in the Supabase SQL editor on the staging project (lfkmgorcoojkcuvhraeo)
-- Safe to run multiple times — uses IF NOT EXISTS / IF EXISTS guards throughout

-- ── businesses: add missing columns ──────────────────────────────────────────
alter table businesses
  add column if not exists owner_id       uuid references auth.users(id) on delete cascade,
  add column if not exists trial_ends_at  timestamptz default (now() + interval '30 days');

-- RLS
alter table businesses enable row level security;
drop policy if exists "owner access" on businesses;
create policy "owner access" on businesses
  for all using (auth.uid() = owner_id);

-- ── properties: drop extra column not in production ───────────────────────────
alter table properties
  drop column if exists active;

-- RLS
alter table properties enable row level security;
drop policy if exists "business access" on properties;
create policy "business access" on properties
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── transactions: drop extra columns not in production ────────────────────────
alter table transactions
  drop column if exists vendor,
  drop column if exists payment_method,
  drop column if exists notes,
  drop column if exists created_by;

-- RLS
alter table transactions enable row level security;
drop policy if exists "business access" on transactions;
create policy "business access" on transactions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── recurring_transactions: RLS only (schema already matches) ─────────────────
alter table recurring_transactions enable row level security;
drop policy if exists "business access" on recurring_transactions;
create policy "business access" on recurring_transactions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── notes: RLS only (schema already matches) ──────────────────────────────────
alter table notes enable row level security;
drop policy if exists "business access" on notes;
create policy "business access" on notes
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── subscriptions: create from scratch ────────────────────────────────────────
create table if not exists subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null unique references businesses(id) on delete cascade,
  status             text default 'free',
  stripe_customer_id text,
  created_at         timestamptz default now()
);

alter table subscriptions enable row level security;
drop policy if exists "business access" on subscriptions;
create policy "business access" on subscriptions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
