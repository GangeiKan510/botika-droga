# Deploy checklist — StockRx MVP

## Supabase

- [ ] Create Supabase project
- [ ] Run `supabase/migrations/20260308000000_init.sql` in SQL Editor
- [ ] Optionally run `supabase/seed.sql` for demo medications
- [ ] Confirm Email auth is enabled
- [ ] Disable public email signups (Auth → Providers → Email)
- [ ] Create users manually in Authentication → Users
- [ ] Copy Project URL + anon key into Vercel / `.env.local`
- [ ] Smoke-test login → Stock In → Stock Out → Sales / Alerts

## Vercel

- [ ] Connect GitHub repo
- [ ] Framework preset: Next.js
- [ ] Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Deploy production
- [ ] Add production URL to Supabase Auth redirect allow-list
- [ ] Log in with a manually created user and smoke-test Stock In → Stock Out → Sales / Alerts

## Smoke test

1. Add or use seeded medication
2. Stock In: lot + future expiry + qty
3. Stock Out: FEFO lot selected, qty ≤ QOH
4. Dashboard shows today's sales = qty × selling price
5. Lower reorder point or zero QOH → Alerts page lists low/out
6. Batch with expiry ≤ 90 days → near expiry alert

## PayMongo (subscription)

- [ ] Add `PAYMONGO_SECRET_KEY` (test first) and `NEXT_PUBLIC_APP_URL`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY`) for webhooks
- [ ] Run migration `20260308030000_subscriptions.sql`
- [ ] Dashboard → Developers → Webhooks → URL `https://YOUR_DOMAIN/api/webhooks/paymongo`
- [ ] Subscribe to `checkout_session.payment.paid`; save webhook secret as `PAYMONGO_WEBHOOK_SECRET`
- [ ] Enable payment methods you need (GCash, card, QR Ph) to match `PAYMONGO_PAYMENT_METHODS`
- [ ] Smoke-test Account → Subscription → Subscribe with test keys
