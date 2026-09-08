# StockRx

Owner-only pharmacy inventory and sales tracker. Each login is an isolated store: medications, batches, stock movements, and sales belong only to that account.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + DaisyUI
- Supabase (Postgres, Auth, RLS, RPCs)
- Vercel (recommended deploy)

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run in order:
   - [`supabase/migrations/20260308000000_init.sql`](supabase/migrations/20260308000000_init.sql)
   - [`supabase/seed.sql`](supabase/seed.sql) (optional demo catalog)
3. Authentication → Providers → Email enabled.
4. Authentication → Providers → Email → **disable “Enable sign ups”** (accounts are created manually).
5. Copy **Project URL** and **anon public** key.

### 2. Local app

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with an account you created in Supabase Auth (Authentication → Users → Add user). Public signup is disabled.

Then:

1. Review seeded medications (or add your own)
2. **Stock In** — lot, expiry, quantity purchased
3. **Stock Out** — from cashier report; FEFO batch suggested
4. Check **Dashboard**, **Alerts**, **Sales**

### 3. Vercel deploy

1. Push this repo to GitHub.
2. Import in Vercel; set the same `NEXT_PUBLIC_SUPABASE_*` env vars.
3. In Supabase Auth → URL configuration, add your Vercel URL to Site URL / Redirect URLs.

## Scripts

| Command           | Purpose                                     |
| ----------------- | ------------------------------------------- |
| `yarn dev`        | Local development                           |
| `yarn build`      | Production build                            |
| `yarn test`       | Unit tests (FEFO, sales week, stock status) |
| `yarn type-check` | TypeScript                                  |
| `yarn lint`       | ESLint                                      |

## Domain notes

- **Sales** = sum of `DISPENSED` transaction `line_total` (qty × selling price snapshot).
- **FEFO** = earliest `expiration_date` among batches with QOH &gt; 0.
- **Near expiry** = within 90 days.
- Audit trail rows are insert-only (no update/delete via RLS).

## Out of scope (MVP)

Multi-store, cashier accounts, barcode scanning, push/email notifications, auto POs.
