/** Single StockRx plan (centavos). Override with SUBSCRIPTION_PRICE_CENTAVOS. */
export const PLAN_CODE = "standard";
export const PLAN_NAME = "StockRx Standard";
export const PLAN_INTERVAL_DAYS = 30;

export function getPlanAmountCentavos(): number {
  const raw = process.env.SUBSCRIPTION_PRICE_CENTAVOS;
  const parsed = raw ? Number.parseInt(raw, 10) : 120_000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}

export function formatPlanPrice(centavos = getPlanAmountCentavos()): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  if (url.startsWith("http")) return url.replace(/\/$/, "");
  return `https://${url.replace(/\/$/, "")}`;
}

export function getPaymentMethodTypes(): string[] {
  const raw = process.env.PAYMONGO_PAYMENT_METHODS ?? "gcash,card,qrph";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSubscriptionActive(input: {
  status: string | null | undefined;
  current_period_end: string | null | undefined;
}): boolean {
  if (input.status !== "active") return false;
  if (!input.current_period_end) return false;
  return new Date(input.current_period_end).getTime() > Date.now();
}

export function addBillingPeriod(from: Date, days = PLAN_INTERVAL_DAYS): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
