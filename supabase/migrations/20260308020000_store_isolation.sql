-- Per-store isolation: each authenticated user owns their own inventory data

-- Medications
alter table public.medications
  add column if not exists owner_id uuid references public.profiles (id) on delete cascade;

-- Batches
alter table public.batches
  add column if not exists owner_id uuid references public.profiles (id) on delete cascade;

-- Transactions
alter table public.inventory_transactions
  add column if not exists owner_id uuid references public.profiles (id) on delete cascade;

-- Backfill: assign orphaned rows to the oldest profile (demo/single-store upgrade path)
do $$
declare
  v_owner uuid;
begin
  select id into v_owner
  from public.profiles
  order by created_at asc
  limit 1;

  if v_owner is not null then
    update public.medications set owner_id = v_owner where owner_id is null;
    update public.batches b
    set owner_id = coalesce(b.owner_id, m.owner_id, v_owner)
    from public.medications m
    where b.medication_id = m.id
      and b.owner_id is null;
    update public.inventory_transactions t
    set owner_id = coalesce(t.owner_id, m.owner_id, v_owner)
    from public.medications m
    where t.medication_id = m.id
      and t.owner_id is null;
  end if;
end $$;

-- Drop rows that still have no owner (no profiles exist)
delete from public.inventory_transactions where owner_id is null;
delete from public.batches where owner_id is null;
delete from public.medications where owner_id is null;

alter table public.medications
  alter column owner_id set not null;

alter table public.batches
  alter column owner_id set not null;

alter table public.inventory_transactions
  alter column owner_id set not null;

-- SKU unique per store (owner), not globally
alter table public.medications drop constraint if exists medications_sku_key;
alter table public.medications
  add constraint medications_owner_id_sku_key unique (owner_id, sku);

create index if not exists medications_owner_id_idx on public.medications (owner_id);
create index if not exists batches_owner_id_idx on public.batches (owner_id);
create index if not exists inventory_transactions_owner_id_idx
  on public.inventory_transactions (owner_id);

-- Replace open RLS with owner-scoped policies
drop policy if exists "Authenticated owners manage medications" on public.medications;
create policy "Owners manage own medications"
  on public.medications for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Authenticated owners manage batches" on public.batches;
create policy "Owners manage own batches"
  on public.batches for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Authenticated owners read transactions" on public.inventory_transactions;
drop policy if exists "Authenticated owners insert transactions" on public.inventory_transactions;
drop policy if exists "No update on transactions" on public.inventory_transactions;
drop policy if exists "No delete on transactions" on public.inventory_transactions;

create policy "Owners read own transactions"
  on public.inventory_transactions for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners insert own transactions"
  on public.inventory_transactions for insert
  to authenticated
  with check (owner_id = auth.uid());

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

drop trigger if exists medications_set_owner_id on public.medications;
create trigger medications_set_owner_id
  before insert on public.medications
  for each row execute function public.set_owner_id();

drop trigger if exists batches_set_owner_id on public.batches;
create trigger batches_set_owner_id
  before insert on public.batches
  for each row execute function public.set_owner_id();

drop trigger if exists inventory_transactions_set_owner_id on public.inventory_transactions;
create trigger inventory_transactions_set_owner_id
  before insert on public.inventory_transactions
  for each row execute function public.set_owner_id();

-- Stock In RPC: owner-scoped
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

-- Stock Out RPC: owner-scoped FEFO
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
