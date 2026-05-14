-- LandlordLedger — Staging Schema
-- Run this in the Supabase SQL editor on a fresh project.
-- Enable Email Auth and Google OAuth in the Supabase Auth settings after running.

-- ── businesses ────────────────────────────────────────────────────────────────
create table businesses (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  trial_ends_at  timestamptz default (now() + interval '30 days'),
  created_at     timestamptz default now()
);

alter table businesses enable row level security;
create policy "owner access" on businesses
  for all using (auth.uid() = owner_id);

-- ── properties ────────────────────────────────────────────────────────────────
create table properties (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  name           text not null,
  address        text,
  property_type  text default 'Residential',
  note           text,
  archived       boolean default false,
  created_at     timestamptz default now()
);

alter table properties enable row level security;
create policy "business access" on properties
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── transactions ──────────────────────────────────────────────────────────────
create table transactions (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  property_id      uuid references properties(id) on delete set null,
  transaction_date date not null,
  description      text,
  category         text,
  amount           numeric not null,
  type             text,
  source           text default 'manual',
  created_at       timestamptz default now()
);

alter table transactions enable row level security;
create policy "business access" on transactions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── recurring_transactions ────────────────────────────────────────────────────
create table recurring_transactions (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  property_id    uuid references properties(id) on delete set null,
  description    text,
  amount         numeric not null,
  type           text,
  category       text,
  frequency      text default 'monthly',
  day_of_month   integer default 1,
  next_due_date  date,
  end_date       date,
  active         boolean default true,
  created_at     timestamptz default now()
);

alter table recurring_transactions enable row level security;
create policy "business access" on recurring_transactions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── notes ─────────────────────────────────────────────────────────────────────
create table notes (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  property_id  uuid references properties(id) on delete cascade,
  content      text,
  created_at   timestamptz default now()
);

alter table notes enable row level security;
create policy "business access" on notes
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- ── subscriptions ─────────────────────────────────────────────────────────────
create table subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null unique references businesses(id) on delete cascade,
  status             text default 'free',
  stripe_customer_id text,
  created_at         timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "business access" on subscriptions
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
