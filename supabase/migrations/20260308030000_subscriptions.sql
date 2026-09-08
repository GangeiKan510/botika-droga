-- Single-plan subscriptions + payment audit (PayMongo)

create table public.subscriptions (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'past_due', 'canceled')),
  plan_code text not null default 'standard',
  amount_centavos integer not null default 120000 check (amount_centavos > 0),
  currency text not null default 'PHP',
  current_period_start timestamptz,
  current_period_end timestamptz,
  paymongo_checkout_session_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  checkout_session_id text not null,
  reference_number text,
  amount_centavos integer not null check (amount_centavos > 0),
  currency text not null default 'PHP',
  status text not null default 'paid'
    check (status in ('paid', 'failed', 'refunded')),
  paymongo_event_id text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (checkout_session_id)
);

create index subscription_payments_owner_id_idx
  on public.subscription_payments (owner_id);

alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

create policy "Owners read own subscription"
  on public.subscriptions for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners upsert own subscription"
  on public.subscriptions for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners update own subscription"
  on public.subscriptions for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners read own subscription payments"
  on public.subscription_payments for select
  to authenticated
  using (owner_id = auth.uid());

-- Payment rows are inserted by the PayMongo webhook using the service role
