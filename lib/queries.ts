import {
  buildDailySalesSeries,
  buildSalesChartSeries,
  effectiveLowStockThreshold,
  formatMoney,
  getCalendarWeekRange,
  medicationStockStatus,
  normalizeAlertSettings,
  type OwnerAlertSettings,
  rankBestSellers,
  type SalesPeriod,
  sumLineTotals,
  toDateInputValue,
} from "@/lib/inventory";
import { createClient } from "@/lib/supabase/server";
import type { Batch, Medication } from "@/lib/database.types";

export async function getOwnerAlertSettings(): Promise<OwnerAlertSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return normalizeAlertSettings(null);

  const { data } = await supabase
    .from("profiles")
    .select("low_stock_threshold, near_expiry_days")
    .eq("id", user.id)
    .maybeSingle();

  return normalizeAlertSettings(data);
}

export async function getMedications(activeOnly = true) {
  const supabase = await createClient();
  let query = supabase
    .from("medications")
    .select("*")
    .order("generic_name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error("Failed to load medications");
  return data ?? [];
}

export async function getMedication(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Failed to load medication");
  return data;
}

export async function getBatchesForMedication(medicationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("medication_id", medicationId)
    .order("expiration_date", { ascending: true });
  if (error) throw new Error("Failed to load batches");
  return data ?? [];
}

export type InventoryRow = Medication & {
  total_qoh: number;
  batches: Batch[];
  status: ReturnType<typeof medicationStockStatus>;
  low_threshold: number;
};

export async function getInventoryRows(): Promise<InventoryRow[]> {
  const supabase = await createClient();
  const settings = await getOwnerAlertSettings();

  const { data: medications, error: medError } = await supabase
    .from("medications")
    .select("*")
    .eq("is_active", true)
    .order("generic_name", { ascending: true });

  if (medError) throw new Error("Failed to load inventory");

  const { data: batches, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .order("expiration_date", { ascending: true });

  if (batchError) throw new Error("Failed to load batches");

  const byMed = new Map<string, Batch[]>();
  for (const batch of batches ?? []) {
    const list = byMed.get(batch.medication_id) ?? [];
    list.push(batch);
    byMed.set(batch.medication_id, list);
  }

  return (medications ?? []).map((med) => {
    const medBatches = byMed.get(med.id) ?? [];
    const total_qoh = medBatches.reduce((s, b) => s + b.quantity_on_hand, 0);
    const low_threshold = effectiveLowStockThreshold(
      settings.low_stock_threshold,
    );
    return {
      ...med,
      total_qoh,
      batches: medBatches,
      low_threshold,
      status: medicationStockStatus(total_qoh, low_threshold),
    };
  });
}

export type AlertItem = {
  kind: "out" | "low" | "near_expiry" | "expired";
  medication_id: string;
  medication_label: string;
  detail: string;
  batch_id?: string;
  lot_number?: string;
  expiration_date?: string;
  quantity_on_hand?: number;
};

export async function getAlerts(): Promise<{
  alerts: AlertItem[];
  settings: OwnerAlertSettings;
}> {
  const [rows, settings] = await Promise.all([
    getInventoryRows(),
    getOwnerAlertSettings(),
  ]);
  const today = new Date();
  const alerts: AlertItem[] = [];

  for (const row of rows) {
    const label = `${row.generic_name}${row.brand_name ? ` (${row.brand_name})` : ""}${row.strength ? ` ${row.strength}` : ""}`;

    if (row.status === "out") {
      alerts.push({
        kind: "out",
        medication_id: row.id,
        medication_label: label,
        detail: "Out of stock across all batches",
        quantity_on_hand: 0,
      });
    } else if (row.status === "low") {
      alerts.push({
        kind: "low",
        medication_id: row.id,
        medication_label: label,
        detail: `Low stock: ${row.total_qoh} on hand (alert at ≤ ${row.low_threshold})`,
        quantity_on_hand: row.total_qoh,
      });
    }

    for (const batch of row.batches) {
      if (batch.quantity_on_hand <= 0) continue;
      const exp = new Date(`${batch.expiration_date}T00:00:00`);
      const days = Math.floor(
        (exp.getTime() -
          new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
          ).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (days < 0) {
        alerts.push({
          kind: "expired",
          medication_id: row.id,
          medication_label: label,
          detail: `Expired lot ${batch.lot_number} — ${batch.quantity_on_hand} remaining`,
          batch_id: batch.id,
          lot_number: batch.lot_number,
          expiration_date: batch.expiration_date,
          quantity_on_hand: batch.quantity_on_hand,
        });
      } else if (days <= settings.near_expiry_days) {
        alerts.push({
          kind: "near_expiry",
          medication_id: row.id,
          medication_label: label,
          detail: `Lot ${batch.lot_number} expires in ${days} day(s) (FEFO) — ${batch.quantity_on_hand} on hand`,
          batch_id: batch.id,
          lot_number: batch.lot_number,
          expiration_date: batch.expiration_date,
          quantity_on_hand: batch.quantity_on_hand,
        });
      }
    }
  }

  const order = { expired: 0, out: 1, near_expiry: 2, low: 3 } as const;
  return {
    alerts: alerts.sort((a, b) => order[a.kind] - order[b.kind]),
    settings,
  };
}

export async function getSalesForDay(date: Date) {
  const supabase = await createClient();
  const start = `${toDateInputValue(date)}T00:00:00`;
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  const end = `${toDateInputValue(endDate)}T00:00:00`;

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(
      "id, quantity, unit_price_snapshot, line_total, created_at, notes, medications(generic_name, brand_name, strength), batches(lot_number)",
    )
    .eq("type", "DISPENSED")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to load daily sales");
  const rows = data ?? [];
  return {
    rows,
    total: sumLineTotals(rows),
    formatted: formatMoney(sumLineTotals(rows)),
  };
}

export async function getSalesForWeek(date: Date) {
  const supabase = await createClient();
  const { start, end } = getCalendarWeekRange(date);

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id, quantity, line_total, created_at, medications(generic_name)")
    .eq("type", "DISPENSED")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to load weekly sales");
  const rows = data ?? [];
  return {
    rows,
    total: sumLineTotals(rows),
    formatted: formatMoney(sumLineTotals(rows)),
    start,
    end,
  };
}

export async function getSalesLastDays(days = 7, today = new Date()) {
  const supabase = await createClient();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("line_total, created_at")
    .eq("type", "DISPENSED")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error("Failed to load sales series");
  const rows = data ?? [];
  const series = buildDailySalesSeries(rows, days, today);
  return {
    series,
    total: sumLineTotals(rows),
    formatted: formatMoney(sumLineTotals(rows)),
  };
}

export async function getSalesAnalyticsForYear(
  year: number,
  period: SalesPeriod,
) {
  const supabase = await createClient();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("line_total, created_at")
    .eq("type", "DISPENSED")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error("Failed to load sales analytics");
  const rows = data ?? [];
  return {
    year,
    period,
    series: buildSalesChartSeries(rows, year, period),
    total: sumLineTotals(rows),
    formatted: formatMoney(sumLineTotals(rows)),
  };
}

export async function getBestSellingMedications(year: number, limit = 5) {
  const supabase = await createClient();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(
      "medication_id, quantity, line_total, medications(generic_name, brand_name, strength, dosage_form)",
    )
    .eq("type", "DISPENSED")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (error) throw new Error("Failed to load best sellers");
  return rankBestSellers(
    (data ?? []).map((row) => ({
      medication_id: row.medication_id,
      quantity: row.quantity,
      line_total: row.line_total,
      medications: row.medications as {
        generic_name: string;
        brand_name: string | null;
        strength: string | null;
        dosage_form: string | null;
      } | null,
    })),
    limit,
  );
}

export async function getRecentTransactions(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(
      "id, type, quantity, line_total, created_at, medications(generic_name, brand_name), batches(lot_number)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Failed to load transactions");
  return data ?? [];
}

export async function getAccountUsageSummary() {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const periodLabel = start.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const [meds, txns] = await Promise.all([
    supabase
      .from("medications")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("inventory_transactions")
      .select("type, line_total")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
  ]);

  if (meds.error) throw new Error("Failed to load usage medications");
  if (txns.error) throw new Error("Failed to load usage transactions");

  const rows = txns.data ?? [];
  const stockInCount = rows.filter((r) => r.type === "RECEIVED").length;
  const stockOutCount = rows.filter((r) => r.type === "DISPENSED").length;
  const salesTotal = rows
    .filter((r) => r.type === "DISPENSED")
    .reduce((sum, r) => sum + Number(r.line_total ?? 0), 0);

  return {
    periodLabel,
    medicationCount: meds.count ?? 0,
    stockInCount,
    stockOutCount,
    salesTotal,
    smsSent: 0,
  };
}
