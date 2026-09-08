-- StockRx MVP schema: medications, batches, transactions, profiles, RLS, RPCs

create extension if not exists "pgcrypto";

-- Profiles (owner accounts)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner')),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  near_expiry_days integer not null default 90 check (near_expiry_days > 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Owners can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Owners can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'owner'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Medications (master catalog, per store owner)
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  sku text not null,
  ndc_gtin text,
  generic_name text not null,
  brand_name text,
  category text,
  dosage_form text,
  strength text,
  pack_size text,
  risk_level text not null default 'OTC',
  storage_requirements text,
  unit_cost_price numeric(12, 2) not null default 0 check (unit_cost_price >= 0),
  unit_selling_price numeric(12, 2) not null default 0 check (unit_selling_price >= 0),
  reorder_point integer not null default 0 check (reorder_point >= 0),
  max_stock_level integer check (max_stock_level is null or max_stock_level >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, sku)
);

create index medications_owner_id_idx on public.medications (owner_id);
create index medications_generic_name_idx on public.medications (generic_name);
create index medications_brand_name_idx on public.medications (brand_name);
create index medications_is_active_idx on public.medications (is_active);

alter table public.medications enable row level security;

create policy "Owners manage own medications"
  on public.medications for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Batches / lots
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete restrict,
  lot_number text not null,
  expiration_date date not null,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  supplier_name text,
  storage_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medication_id, lot_number)
);

create index batches_owner_id_idx on public.batches (owner_id);
create index batches_medication_id_idx on public.batches (medication_id);
create index batches_expiration_date_idx on public.batches (expiration_date);
create index batches_qoh_idx on public.batches (quantity_on_hand);

alter table public.batches enable row level security;

create policy "Owners manage own batches"
  on public.batches for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Immutable inventory transactions (audit trail)
create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete restrict,
  batch_id uuid not null references public.batches (id) on delete restrict,
  type text not null check (type in ('RECEIVED', 'DISPENSED', 'ADJUSTMENT')),
  quantity integer not null check (quantity > 0),
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_transactions_owner_id_idx
  on public.inventory_transactions (owner_id);
create index inventory_transactions_medication_id_idx
  on public.inventory_transactions (medication_id);
create index inventory_transactions_batch_id_idx
  on public.inventory_transactions (batch_id);
create index inventory_transactions_type_idx
  on public.inventory_transactions (type);
create index inventory_transactions_created_at_idx
  on public.inventory_transactions (created_at);

alter table public.inventory_transactions enable row level security;

create policy "Owners read own transactions"
  on public.inventory_transactions for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners insert own transactions"
  on public.inventory_transactions for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Prevent updates/deletes on audit trail
create policy "No update on transactions"
  on public.inventory_transactions for update
  to authenticated
  using (false);

create policy "No delete on transactions"
  on public.inventory_transactions for delete
  to authenticated
  using (false);

-- Auto-stamp owner_id from auth.uid() when omitted
create or replace function public.set_owner_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  if new.owner_id is null then
    raise exception 'owner_id required';
  end if;
  if new.owner_id <> auth.uid() and auth.uid() is not null then
    raise exception 'Cannot set owner_id for another user';
  end if;
  return new;
end;
$$;

create trigger medications_set_owner_id
  before insert on public.medications
  for each row execute function public.set_owner_id();

create trigger batches_set_owner_id
  before insert on public.batches
  for each row execute function public.set_owner_id();

create trigger inventory_transactions_set_owner_id
  before insert on public.inventory_transactions
  for each row execute function public.set_owner_id();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

create trigger batches_set_updated_at
  before update on public.batches
  for each row execute function public.set_updated_at();

-- Stock In RPC: create or increment batch + audit RECEIVED
create or replace function public.record_stock_in(
  p_medication_id uuid,
  p_lot_number text,
  p_expiration_date date,
  p_quantity integer,
  p_supplier_name text default null,
  p_storage_location text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_unit_cost numeric(12, 2);
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  if p_lot_number is null or length(trim(p_lot_number)) = 0 then
    raise exception 'Lot number is required';
  end if;

  select unit_cost_price into v_unit_cost
  from public.medications
  where id = p_medication_id
    and owner_id = v_user_id
    and is_active = true;

  if v_unit_cost is null then
    raise exception 'Medication not found or inactive';
  end if;

  select id into v_batch_id
  from public.batches
  where medication_id = p_medication_id
    and owner_id = v_user_id
    and lot_number = trim(p_lot_number)
  for update;

  if v_batch_id is null then
    insert into public.batches (
      owner_id,
      medication_id,
      lot_number,
      expiration_date,
      quantity_on_hand,
      supplier_name,
      storage_location
    )
    values (
      v_user_id,
      p_medication_id,
      trim(p_lot_number),
      p_expiration_date,
      p_quantity,
      nullif(trim(coalesce(p_supplier_name, '')), ''),
      nullif(trim(coalesce(p_storage_location, '')), '')
    )
    returning id into v_batch_id;
  else
    update public.batches
    set
      quantity_on_hand = quantity_on_hand + p_quantity,
      expiration_date = p_expiration_date,
      supplier_name = coalesce(
        nullif(trim(coalesce(p_supplier_name, '')), ''),
        supplier_name
      ),
      storage_location = coalesce(
        nullif(trim(coalesce(p_storage_location, '')), ''),
        storage_location
      )
    where id = v_batch_id
      and owner_id = v_user_id;
  end if;

  insert into public.inventory_transactions (
    owner_id,
    medication_id,
    batch_id,
    type,
    quantity,
    unit_price_snapshot,
    line_total,
    notes,
    created_by
  )
  values (
    v_user_id,
    p_medication_id,
    v_batch_id,
    'RECEIVED',
    p_quantity,
    v_unit_cost,
    round(p_quantity * v_unit_cost, 2),
    p_notes,
    v_user_id
  );

  return v_batch_id;
end;
$$;

-- Stock Out RPC: FEFO batch (or override) + audit DISPENSED with selling price snapshot
create or replace function public.record_stock_out(
  p_medication_id uuid,
  p_quantity integer,
  p_batch_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_qoh integer;
  v_unit_price numeric(12, 2);
  v_txn_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select unit_selling_price into v_unit_price
  from public.medications
  where id = p_medication_id
    and owner_id = v_user_id
    and is_active = true;

  if v_unit_price is null then
    raise exception 'Medication not found or inactive';
  end if;

  if p_batch_id is not null then
    select id, quantity_on_hand into v_batch_id, v_qoh
    from public.batches
    where id = p_batch_id
      and medication_id = p_medication_id
      and owner_id = v_user_id
    for update;

    if v_batch_id is null then
      raise exception 'Batch not found for this medication';
    end if;
  else
    -- FEFO: earliest expiration with available stock
    select id, quantity_on_hand into v_batch_id, v_qoh
    from public.batches
    where medication_id = p_medication_id
      and owner_id = v_user_id
      and quantity_on_hand > 0
    order by expiration_date asc, created_at asc
    limit 1
    for update;

    if v_batch_id is null then
      raise exception 'No stock available for this medication';
    end if;
  end if;

  if v_qoh < p_quantity then
    raise exception 'Insufficient stock on batch (available: %)', v_qoh;
  end if;

  update public.batches
  set quantity_on_hand = quantity_on_hand - p_quantity
  where id = v_batch_id
    and owner_id = v_user_id;

  insert into public.inventory_transactions (
    owner_id,
    medication_id,
    batch_id,
    type,
    quantity,
    unit_price_snapshot,
    line_total,
    notes,
    created_by
  )
  values (
    v_user_id,
    p_medication_id,
    v_batch_id,
    'DISPENSED',
    p_quantity,
    v_unit_price,
    round(p_quantity * v_unit_price, 2),
    p_notes,
    v_user_id
  )
  returning id into v_txn_id;

  return v_txn_id;
end;
$$;

grant execute on function public.record_stock_in to authenticated;
grant execute on function public.record_stock_out to authenticated;
