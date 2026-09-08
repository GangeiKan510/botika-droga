-- SMS add-on: ₱99 / 100 messages / 30 days from purchase (independent of main sub)

create table public.sms_addons (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'expired')),
  messages_included integer not null default 100 check (messages_included >= 0),
  messages_used integer not null default 0 check (messages_used >= 0),
  amount_centavos integer not null default 9900 check (amount_centavos > 0),
  currency text not null default 'PHP',
  current_period_start timestamptz,
  current_period_end timestamptz,
  paymongo_checkout_session_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.subscription_payments
  add column if not exists product_code text not null default 'standard';

alter table public.subscription_payments
  drop constraint if exists subscription_payments_product_code_check;

alter table public.subscription_payments
  add constraint subscription_payments_product_code_check
  check (product_code in ('standard', 'sms_addon'));

alter table public.sms_addons enable row level security;

create policy "Owners read own sms addon"
  on public.sms_addons for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners insert own sms addon"
  on public.sms_addons for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners update own sms addon"
  on public.sms_addons for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
