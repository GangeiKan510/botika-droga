-- Sample medications for demo (assigns to the oldest profile if one exists).
-- Create a user in Auth first, then run seed / db reset.

do $$
declare
  v_owner uuid;
begin
  select id into v_owner
  from public.profiles
  order by created_at asc
  limit 1;

  if v_owner is null then
    raise notice 'No profiles found — skipped medication seed. Create a user in Auth, then re-run seed.';
    return;
  end if;

  insert into public.medications (
    owner_id,
    sku,
    generic_name,
    brand_name,
    category,
    dosage_form,
    strength,
    pack_size,
    risk_level,
    storage_requirements,
    unit_cost_price,
    unit_selling_price,
    reorder_point,
    max_stock_level
  )
  values
    (
      v_owner,
      'PARA-500-TAB',
      'Paracetamol',
      'Biogesic',
      'Analgesics',
      'Tablet',
      '500mg',
      'Box of 20',
      'OTC',
      'Room Temperature',
      2.50,
      5.00,
      50,
      500
    ),
    (
      v_owner,
      'AMOX-500-CAP',
      'Amoxicillin',
      'Amoxil',
      'Antibiotics',
      'Capsule',
      '500mg',
      'Box of 21',
      'Rx-Only',
      'Room Temperature',
      8.00,
      15.00,
      30,
      200
    ),
    (
      v_owner,
      'LORAT-10-TAB',
      'Loratadine',
      'Claritin',
      'Antihistamines',
      'Tablet',
      '10mg',
      'Box of 10',
      'OTC',
      'Room Temperature',
      4.00,
      8.50,
      20,
      150
    ),
    (
      v_owner,
      'IBUP-400-TAB',
      'Ibuprofen',
      'Advil',
      'Analgesics',
      'Tablet',
      '400mg',
      'Box of 20',
      'OTC',
      'Room Temperature',
      3.25,
      7.00,
      40,
      300
    ),
    (
      v_owner,
      'METF-500-TAB',
      'Metformin',
      'Glucophage',
      'Antidiabetics',
      'Tablet',
      '500mg',
      'Bottle of 100',
      'Rx-Only',
      'Room Temperature',
      6.00,
      12.00,
      25,
      200
    )
  on conflict (owner_id, sku) do nothing;
end $$;
