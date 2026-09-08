-- Owner notification thresholds on profiles
alter table public.profiles
  add column if not exists low_stock_threshold integer not null default 10
    check (low_stock_threshold >= 0),
  add column if not exists near_expiry_days integer not null default 90
    check (near_expiry_days > 0);
