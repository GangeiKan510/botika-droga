/** Defaults used when profile settings are missing. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const DEFAULT_NEAR_EXPIRY_DAYS = 90;

/** @deprecated Prefer DEFAULT_NEAR_EXPIRY_DAYS / owner settings. */
export const NEAR_EXPIRY_DAYS = DEFAULT_NEAR_EXPIRY_DAYS;

export type OwnerAlertSettings = {
  low_stock_threshold: number;
  near_expiry_days: number;
};

export function normalizeAlertSettings(
  settings?: Partial<OwnerAlertSettings> | null,
): OwnerAlertSettings {
  const low = settings?.low_stock_threshold;
  const near = settings?.near_expiry_days;
  return {
    low_stock_threshold:
      typeof low === "number" && Number.isFinite(low) && low >= 0
        ? Math.floor(low)
        : DEFAULT_LOW_STOCK_THRESHOLD,
    near_expiry_days:
      typeof near === "number" && Number.isFinite(near) && near > 0
        ? Math.floor(near)
        : DEFAULT_NEAR_EXPIRY_DAYS,
  };
}

/**
 * Low-stock alert threshold from Settings.
 * Medication reorder_point is planning metadata only and does not raise alerts.
 */
export function effectiveLowStockThreshold(globalThreshold: number): number {
  return globalThreshold;
}

export function formatMoney(
  amount: number | string | null | undefined,
): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(n)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(n);
}

export function medicationDisplayName(med: {
  generic_name: string;
  brand_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
}): string {
  const brand = med.brand_name?.trim();
  const base = brand ? `${med.generic_name} (${brand})` : med.generic_name;
  const parts = [med.strength, med.dosage_form].filter((p): p is string =>
    Boolean(p?.trim()),
  );
  if (parts.length === 0) return base;
  return `${base} — ${parts.join(" ")}`;
}

/** Case-insensitive match across catalog fields (name, SKU, variant, category). */
export function matchesMedicationSearch(
  med: {
    sku: string;
    generic_name: string;
    brand_name?: string | null;
    category?: string | null;
    dosage_form?: string | null;
    strength?: string | null;
    pack_size?: string | null;
    ndc_gtin?: string | null;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    med.sku,
    med.generic_name,
    med.brand_name,
    med.category,
    med.dosage_form,
    med.strength,
    med.pack_size,
    med.ndc_gtin,
  ]
    .filter((v): v is string => Boolean(v?.trim()))
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export type MedicationStatusFilter = "all" | "active" | "inactive";

export type MedicationSortKey =
  "drug" | "sku" | "category" | "cost" | "sell" | "reorder" | "status";

export type MedicationSortDirection = "asc" | "desc";

export type MedicationCatalogItem = {
  id: string;
  sku: string;
  generic_name: string;
  brand_name?: string | null;
  category?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  pack_size?: string | null;
  ndc_gtin?: string | null;
  unit_cost_price: number;
  unit_selling_price: number;
  reorder_point: number;
  is_active: boolean;
};

export function uniqueMedicationCategories(
  medications: { category?: string | null }[],
): string[] {
  const set = new Set<string>();
  for (const med of medications) {
    const c = med.category?.trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterMedications(
  medications: MedicationCatalogItem[],
  options: {
    query: string;
    category: string;
    status: MedicationStatusFilter;
  },
): MedicationCatalogItem[] {
  return medications.filter((med) => {
    if (!matchesMedicationSearch(med, options.query)) return false;
    if (options.category !== "all") {
      if ((med.category?.trim() || "") !== options.category) return false;
    }
    if (options.status === "active" && !med.is_active) return false;
    if (options.status === "inactive" && med.is_active) return false;
    return true;
  });
}

function compareNullableString(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
}

export function sortMedications(
  medications: MedicationCatalogItem[],
  key: MedicationSortKey,
  direction: MedicationSortDirection,
): MedicationCatalogItem[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...medications].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "drug":
        cmp = compareNullableString(a.generic_name, b.generic_name);
        if (cmp === 0) cmp = compareNullableString(a.brand_name, b.brand_name);
        break;
      case "sku":
        cmp = a.sku.localeCompare(b.sku, undefined, { sensitivity: "base" });
        break;
      case "category":
        cmp = compareNullableString(a.category, b.category);
        break;
      case "cost":
        cmp = Number(a.unit_cost_price) - Number(b.unit_cost_price);
        break;
      case "sell":
        cmp = Number(a.unit_selling_price) - Number(b.unit_selling_price);
        break;
      case "reorder":
        cmp = a.reorder_point - b.reorder_point;
        break;
      case "status":
        cmp = Number(b.is_active) - Number(a.is_active);
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) {
      cmp = a.sku.localeCompare(b.sku);
    }
    return cmp * dir;
  });
}

export function nextSortState(
  currentKey: MedicationSortKey,
  currentDirection: MedicationSortDirection,
  nextKey: MedicationSortKey,
): { key: MedicationSortKey; direction: MedicationSortDirection } {
  if (currentKey === nextKey) {
    return {
      key: currentKey,
      direction: currentDirection === "asc" ? "desc" : "asc",
    };
  }
  return { key: nextKey, direction: "asc" };
}

export type InventoryStockFilter = "all" | "ok" | "low" | "out";

export type InventorySortKey = "drug" | "qoh" | "alert" | "sell" | "status";

export type InventoryCatalogItem = {
  id: string;
  sku: string;
  generic_name: string;
  brand_name?: string | null;
  category?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  pack_size?: string | null;
  ndc_gtin?: string | null;
  unit_selling_price: number;
  total_qoh: number;
  low_threshold: number;
  status: "ok" | "low" | "out";
};

export function filterInventoryRows(
  rows: InventoryCatalogItem[],
  options: {
    query: string;
    category: string;
    stock: InventoryStockFilter;
  },
): InventoryCatalogItem[] {
  return rows.filter((row) => {
    if (!matchesMedicationSearch(row, options.query)) return false;
    if (options.category !== "all") {
      if ((row.category?.trim() || "") !== options.category) return false;
    }
    if (options.stock !== "all" && row.status !== options.stock) return false;
    return true;
  });
}

export function sortInventoryRows(
  rows: InventoryCatalogItem[],
  key: InventorySortKey,
  direction: MedicationSortDirection,
): InventoryCatalogItem[] {
  const dir = direction === "asc" ? 1 : -1;
  const statusRank = { out: 0, low: 1, ok: 2 } as const;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "drug":
        cmp = compareNullableString(a.generic_name, b.generic_name);
        if (cmp === 0) cmp = compareNullableString(a.brand_name, b.brand_name);
        break;
      case "qoh":
        cmp = a.total_qoh - b.total_qoh;
        break;
      case "alert":
        cmp = a.low_threshold - b.low_threshold;
        break;
      case "sell":
        cmp = Number(a.unit_selling_price) - Number(b.unit_selling_price);
        break;
      case "status":
        cmp = statusRank[a.status] - statusRank[b.status];
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) {
      cmp = a.sku.localeCompare(b.sku);
    }
    return cmp * dir;
  });
}

export function nextInventorySortState(
  currentKey: InventorySortKey,
  currentDirection: MedicationSortDirection,
  nextKey: InventorySortKey,
): { key: InventorySortKey; direction: MedicationSortDirection } {
  if (currentKey === nextKey) {
    return {
      key: currentKey,
      direction: currentDirection === "asc" ? "desc" : "asc",
    };
  }
  return { key: nextKey, direction: "asc" };
}

export function daysUntil(dateIso: string, today = new Date()): number {
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00Z`);
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const diffMs = target.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export type StockStatus = "ok" | "low" | "out" | "expired" | "near_expiry";

export function batchStockStatus(
  quantityOnHand: number,
  expirationDate: string,
  reorderPoint: number,
  today = new Date(),
  nearExpiryDays = DEFAULT_NEAR_EXPIRY_DAYS,
): StockStatus {
  const days = daysUntil(expirationDate, today);
  if (days < 0) return "expired";
  if (quantityOnHand <= 0) return "out";
  if (days <= nearExpiryDays) return "near_expiry";
  if (quantityOnHand <= reorderPoint) return "low";
  return "ok";
}

export function medicationStockStatus(
  totalQoh: number,
  reorderPoint: number,
): Exclude<StockStatus, "expired" | "near_expiry"> {
  if (totalQoh <= 0) return "out";
  if (totalQoh <= reorderPoint) return "low";
  return "ok";
}

/** Monday 00:00:00 local → Sunday end, for calendar week containing `date`. */
export function getCalendarWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DailySalesPoint = {
  date: string; // yyyy-mm-dd
  label: string;
  total: number;
};

export type SalesChartPoint = {
  key: string;
  label: string;
  total: number;
};

export type MonthlySalesPoint = SalesChartPoint;

export const SALES_PERIODS = ["daily", "weekly", "monthly"] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

export function parseSalesPeriod(
  value: string | undefined | null,
): SalesPeriod {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }
  return "monthly";
}

export function salesPeriodSubtitle(period: SalesPeriod): string {
  if (period === "daily") return "Revenue (₱) by day";
  if (period === "weekly") return "Revenue (₱) by week";
  return "Revenue (₱) by month";
}

function addLineTotal(
  totals: Map<string, number>,
  key: string,
  lineTotal: number | string,
) {
  const n = typeof lineTotal === "string" ? Number(lineTotal) : lineTotal;
  totals.set(key, (totals.get(key) ?? 0) + (Number.isFinite(n) ? n : 0));
}

export type BestSeller = {
  medication_id: string;
  generic_name: string;
  brand_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  revenue: number;
  units_sold: number;
};

/** Build last N local calendar days with summed DISPENSED line totals (zeros filled). */
export function buildDailySalesSeries(
  rows: { created_at: string; line_total: number | string }[],
  days: number,
  today = new Date(),
): DailySalesPoint[] {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  const totals = new Map<string, number>();
  for (const row of rows) {
    addLineTotal(
      totals,
      toDateInputValue(new Date(row.created_at)),
      row.line_total,
    );
  }

  const series: DailySalesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = toDateInputValue(d);
    series.push({
      date: key,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      total: totals.get(key) ?? 0,
    });
  }
  return series;
}

/** Every local calendar day in `year`, summing DISPENSED line totals (zeros filled). */
export function buildYearDailySalesSeries(
  rows: { created_at: string; line_total: number | string }[],
  year: number,
): SalesChartPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.created_at);
    if (d.getFullYear() !== year) continue;
    addLineTotal(totals, toDateInputValue(d), row.line_total);
  }

  const series: SalesChartPoint[] = [];
  const cursor = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  while (cursor.getTime() <= end.getTime()) {
    const key = toDateInputValue(cursor);
    series.push({
      key,
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      total: totals.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

/** Monday–Sunday weeks overlapping `year`, summing that year's DISPENSED totals. */
export function buildYearWeeklySalesSeries(
  rows: { created_at: string; line_total: number | string }[],
  year: number,
): SalesChartPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.created_at);
    if (d.getFullYear() !== year) continue;
    const { start } = getCalendarWeekRange(d);
    addLineTotal(totals, toDateInputValue(start), row.line_total);
  }

  const series: SalesChartPoint[] = [];
  const cursor = getCalendarWeekRange(new Date(year, 0, 1)).start;
  const lastMonday = getCalendarWeekRange(new Date(year, 11, 31)).start;
  while (cursor.getTime() <= lastMonday.getTime()) {
    const key = toDateInputValue(cursor);
    series.push({
      key,
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      total: totals.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return series;
}

/** Jan–Dec for `year`, summing DISPENSED line totals by month (zeros filled). */
export function buildMonthlySalesSeries(
  rows: { created_at: string; line_total: number | string }[],
  year: number,
): MonthlySalesPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.created_at);
    if (d.getFullYear() !== year) continue;
    const key = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    addLineTotal(totals, key, row.line_total);
  }

  const series: MonthlySalesPoint[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const labelDate = new Date(year, month - 1, 1);
    series.push({
      key,
      label: labelDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      total: totals.get(key) ?? 0,
    });
  }
  return series;
}

export function buildSalesChartSeries(
  rows: { created_at: string; line_total: number | string }[],
  year: number,
  period: SalesPeriod,
): SalesChartPoint[] {
  if (period === "daily") return buildYearDailySalesSeries(rows, year);
  if (period === "weekly") return buildYearWeeklySalesSeries(rows, year);
  return buildMonthlySalesSeries(rows, year);
}

export function salesChartLabelIndexes(
  series: { key: string }[],
  period: SalesPeriod,
): Set<number> {
  if (period === "daily") {
    return new Set(
      series.flatMap((point, i) => (point.key.endsWith("-01") ? [i] : [])),
    );
  }
  if (period === "weekly") {
    const indexes = new Set<number>();
    const seenMonths = new Set<string>();
    series.forEach((point, i) => {
      const monthKey = point.key.slice(0, 7);
      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        indexes.add(i);
      }
    });
    if (series.length > 0) {
      indexes.add(0);
      indexes.add(series.length - 1);
    }
    return indexes;
  }
  return new Set([0, 2, 4, 5, 6, 7, 8, 11].filter((i) => i < series.length));
}

export function rankBestSellers(
  rows: {
    medication_id: string;
    quantity: number;
    line_total: number | string;
    medications: {
      generic_name: string;
      brand_name: string | null;
      strength: string | null;
      dosage_form: string | null;
    } | null;
  }[],
  limit = 5,
): BestSeller[] {
  const byMed = new Map<string, BestSeller>();
  for (const row of rows) {
    const revenue =
      typeof row.line_total === "string"
        ? Number(row.line_total)
        : row.line_total;
    const safeRevenue = Number.isFinite(revenue) ? revenue : 0;
    const existing = byMed.get(row.medication_id);
    if (existing) {
      existing.revenue += safeRevenue;
      existing.units_sold += row.quantity;
      continue;
    }
    byMed.set(row.medication_id, {
      medication_id: row.medication_id,
      generic_name: row.medications?.generic_name ?? "Medication",
      brand_name: row.medications?.brand_name ?? null,
      strength: row.medications?.strength ?? null,
      dosage_form: row.medications?.dosage_form ?? null,
      revenue: safeRevenue,
      units_sold: row.quantity,
    });
  }

  return [...byMed.values()]
    .sort((a, b) => {
      const byRevenue = b.revenue - a.revenue;
      if (byRevenue !== 0) return byRevenue;
      return b.units_sold - a.units_sold;
    })
    .slice(0, limit);
}

export function formatCompactMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "₱0";
  if (Math.abs(amount) >= 1000) {
    return `₱${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`;
  }
  return formatMoney(amount);
}

export function sumLineTotals(rows: { line_total: number | string }[]): number {
  return rows.reduce((sum, row) => {
    const n =
      typeof row.line_total === "string"
        ? Number(row.line_total)
        : row.line_total;
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** Pick FEFO batch: earliest expiration among batches with QOH > 0. */
export function pickFefoBatch<
  T extends { id: string; expiration_date: string; quantity_on_hand: number },
>(batches: T[]): T | null {
  const available = batches.filter((b) => b.quantity_on_hand > 0);
  if (available.length === 0) return null;
  return [...available].sort((a, b) => {
    const byExpiry = a.expiration_date.localeCompare(b.expiration_date);
    if (byExpiry !== 0) return byExpiry;
    return a.id.localeCompare(b.id);
  })[0];
}
