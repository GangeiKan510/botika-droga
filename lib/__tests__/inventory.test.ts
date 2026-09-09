import {
  batchStockStatus,
  effectiveLowStockThreshold,
  filterMedications,
  filterInventoryRows,
  buildDailySalesSeries,
  buildMonthlySalesSeries,
  buildYearDailySalesSeries,
  buildYearWeeklySalesSeries,
  parseSalesPeriod,
  rankBestSellers,
  salesChartLabelIndexes,
  salesPeriodSubtitle,
  getCalendarWeekRange,
  matchesMedicationSearch,
  medicationDisplayName,
  medicationStockStatus,
  nextInventorySortState,
  nextSortState,
  normalizeAlertSettings,
  pickFefoBatch,
  sortInventoryRows,
  sortMedications,
  sumLineTotals,
  toDateInputValue,
} from "../inventory";

describe("medicationDisplayName", () => {
  it("joins brand and strength without empty separators", () => {
    expect(
      medicationDisplayName({
        generic_name: "Paracetamol",
        brand_name: "Biogesic",
        strength: "500mg",
        dosage_form: "Tablet",
      }),
    ).toBe("Paracetamol (Biogesic) — 500mg Tablet");
  });

  it("returns generic alone when no brand or variant", () => {
    expect(
      medicationDisplayName({
        generic_name: "Paracetamol",
        brand_name: null,
        strength: null,
        dosage_form: null,
      }),
    ).toBe("Paracetamol");
  });
});

describe("matchesMedicationSearch", () => {
  const med = {
    sku: "AMOX-500-CAP",
    generic_name: "Amoxicillin",
    brand_name: "Amoxil",
    category: "Antibiotics",
    dosage_form: "Capsule",
    strength: "500mg",
    pack_size: "Box of 21",
    ndc_gtin: null,
  };

  it("matches empty query to everything", () => {
    expect(matchesMedicationSearch(med, "")).toBe(true);
    expect(matchesMedicationSearch(med, "   ")).toBe(true);
  });

  it("matches brand, generic, sku, and category case-insensitively", () => {
    expect(matchesMedicationSearch(med, "amox")).toBe(true);
    expect(matchesMedicationSearch(med, "AMOX-500")).toBe(true);
    expect(matchesMedicationSearch(med, "antibiotic")).toBe(true);
    expect(matchesMedicationSearch(med, "500mg")).toBe(true);
  });

  it("rejects non-matching queries", () => {
    expect(matchesMedicationSearch(med, "ibuprofen")).toBe(false);
  });
});

describe("filterMedications and sortMedications", () => {
  const rows = [
    {
      id: "1",
      sku: "PARA-500-TAB",
      generic_name: "Paracetamol",
      brand_name: "Biogesic",
      category: "Analgesics",
      unit_cost_price: 2.5,
      unit_selling_price: 5,
      reorder_point: 50,
      is_active: true,
    },
    {
      id: "2",
      sku: "AMOX-500-CAP",
      generic_name: "Amoxicillin",
      brand_name: "Amoxil",
      category: "Antibiotics",
      unit_cost_price: 8,
      unit_selling_price: 15,
      reorder_point: 30,
      is_active: true,
    },
    {
      id: "3",
      sku: "OLD-SKU",
      generic_name: "Old Drug",
      brand_name: null,
      category: "Analgesics",
      unit_cost_price: 1,
      unit_selling_price: 2,
      reorder_point: 5,
      is_active: false,
    },
  ];

  it("filters by category and status", () => {
    const filtered = filterMedications(rows, {
      query: "",
      category: "Analgesics",
      status: "active",
    });
    expect(filtered.map((r) => r.id)).toEqual(["1"]);
  });

  it("sorts by sell price ascending then descending", () => {
    const asc = sortMedications(rows, "sell", "asc");
    expect(asc.map((r) => r.id)).toEqual(["3", "1", "2"]);
    const desc = sortMedications(rows, "sell", "desc");
    expect(desc.map((r) => r.id)).toEqual(["2", "1", "3"]);
  });

  it("toggles sort direction for the same column", () => {
    expect(nextSortState("drug", "asc", "drug")).toEqual({
      key: "drug",
      direction: "desc",
    });
    expect(nextSortState("drug", "asc", "cost")).toEqual({
      key: "cost",
      direction: "asc",
    });
  });
});

describe("filterInventoryRows and sortInventoryRows", () => {
  const rows = [
    {
      id: "1",
      sku: "PARA",
      generic_name: "Paracetamol",
      brand_name: "Biogesic",
      category: "Analgesics",
      unit_selling_price: 5,
      total_qoh: 50,
      low_threshold: 50,
      status: "low" as const,
    },
    {
      id: "2",
      sku: "AMOX",
      generic_name: "Amoxicillin",
      brand_name: "Amoxil",
      category: "Antibiotics",
      unit_selling_price: 15,
      total_qoh: 67,
      low_threshold: 30,
      status: "ok" as const,
    },
    {
      id: "3",
      sku: "GONE",
      generic_name: "Gone Drug",
      brand_name: null,
      category: "Analgesics",
      unit_selling_price: 3,
      total_qoh: 0,
      low_threshold: 10,
      status: "out" as const,
    },
  ];

  it("filters by stock status and category", () => {
    const filtered = filterInventoryRows(rows, {
      query: "",
      category: "Analgesics",
      stock: "low",
    });
    expect(filtered.map((r) => r.id)).toEqual(["1"]);
  });

  it("sorts by QOH ascending", () => {
    expect(sortInventoryRows(rows, "qoh", "asc").map((r) => r.id)).toEqual([
      "3",
      "1",
      "2",
    ]);
  });

  it("toggles inventory sort state", () => {
    expect(nextInventorySortState("drug", "asc", "qoh")).toEqual({
      key: "qoh",
      direction: "asc",
    });
  });
});

describe("pickFefoBatch", () => {
  it("picks earliest expiry with stock", () => {
    const picked = pickFefoBatch([
      {
        id: "b",
        expiration_date: "2027-01-01",
        quantity_on_hand: 10,
      },
      {
        id: "a",
        expiration_date: "2026-06-01",
        quantity_on_hand: 5,
      },
      {
        id: "c",
        expiration_date: "2026-01-01",
        quantity_on_hand: 0,
      },
    ]);
    expect(picked?.id).toBe("a");
  });

  it("returns null when no stock", () => {
    expect(
      pickFefoBatch([
        { id: "a", expiration_date: "2026-01-01", quantity_on_hand: 0 },
      ]),
    ).toBeNull();
  });
});

describe("stock status", () => {
  it("flags out and low stock", () => {
    expect(medicationStockStatus(0, 10)).toBe("out");
    expect(medicationStockStatus(5, 10)).toBe("low");
    expect(medicationStockStatus(20, 10)).toBe("ok");
  });

  it("flags expired and near expiry before low", () => {
    const today = new Date("2026-03-08T00:00:00Z");
    expect(batchStockStatus(50, "2026-01-01", 10, today, 90)).toBe("expired");
    expect(batchStockStatus(50, "2026-04-01", 10, today, 90)).toBe(
      "near_expiry",
    );
    expect(batchStockStatus(50, "2026-04-01", 10, today, 20)).toBe("ok");
    expect(batchStockStatus(0, "2027-01-01", 10, today, 90)).toBe("out");
    expect(batchStockStatus(5, "2027-01-01", 10, today, 90)).toBe("low");
  });
});

describe("owner alert settings", () => {
  it("normalizes missing or invalid settings to defaults", () => {
    expect(normalizeAlertSettings(null)).toEqual({
      low_stock_threshold: 10,
      near_expiry_days: 90,
    });
    expect(
      normalizeAlertSettings({ low_stock_threshold: -1, near_expiry_days: 0 }),
    ).toEqual({
      low_stock_threshold: 10,
      near_expiry_days: 90,
    });
  });

  it("uses the global Settings threshold for low-stock alerts", () => {
    expect(effectiveLowStockThreshold(10)).toBe(10);
    expect(effectiveLowStockThreshold(30)).toBe(30);
    expect(effectiveLowStockThreshold(20)).toBe(20);
  });
});

describe("sales helpers", () => {
  it("sums line totals from dispensed rows", () => {
    expect(
      sumLineTotals([
        { line_total: 10 },
        { line_total: "15.50" },
        { line_total: 0 },
      ]),
    ).toBe(25.5);
  });

  it("returns Monday–Sunday calendar week", () => {
    // Wednesday 2026-03-11
    const { start, end } = getCalendarWeekRange(new Date(2026, 2, 11));
    expect(toDateInputValue(start)).toBe("2026-03-09");
    expect(toDateInputValue(end)).toBe("2026-03-15");
  });
});

describe("buildDailySalesSeries", () => {
  it("fills zero days and sums dispensed totals by local date", () => {
    const today = new Date(2026, 2, 11); // Wed
    const series = buildDailySalesSeries(
      [
        {
          created_at: new Date(2026, 2, 11, 10, 0, 0).toISOString(),
          line_total: 100,
        },
        {
          created_at: new Date(2026, 2, 11, 15, 0, 0).toISOString(),
          line_total: "38",
        },
        {
          created_at: new Date(2026, 2, 9, 12, 0, 0).toISOString(),
          line_total: 50,
        },
      ],
      3,
      today,
    );
    expect(series).toHaveLength(3);
    expect(series.map((p) => p.date)).toEqual([
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
    ]);
    expect(series.map((p) => p.total)).toEqual([50, 0, 138]);
  });
});

describe("parseSalesPeriod and salesPeriodSubtitle", () => {
  it("defaults invalid or missing values to monthly", () => {
    expect(parseSalesPeriod(undefined)).toBe("monthly");
    expect(parseSalesPeriod("")).toBe("monthly");
    expect(parseSalesPeriod("year")).toBe("monthly");
  });

  it("accepts daily, weekly, and monthly", () => {
    expect(parseSalesPeriod("daily")).toBe("daily");
    expect(parseSalesPeriod("weekly")).toBe("weekly");
    expect(parseSalesPeriod("monthly")).toBe("monthly");
  });

  it("assembles the analytics subtitle from the period noun", () => {
    expect(salesPeriodSubtitle("daily")).toBe("Revenue (₱) by day");
    expect(salesPeriodSubtitle("weekly")).toBe("Revenue (₱) by week");
    expect(salesPeriodSubtitle("monthly")).toBe("Revenue (₱) by month");
  });
});

describe("buildYearDailySalesSeries", () => {
  it("fills every local day in a non-leap year and ignores other years", () => {
    const series = buildYearDailySalesSeries(
      [
        {
          created_at: new Date(2026, 8, 8, 9, 0, 0).toISOString(),
          line_total: 400,
        },
        {
          created_at: new Date(2026, 8, 8, 16, 0, 0).toISOString(),
          line_total: "380",
        },
        {
          created_at: new Date(2025, 8, 8).toISOString(),
          line_total: 999,
        },
      ],
      2026,
    );
    expect(series).toHaveLength(365);
    expect(series[0]?.key).toBe("2026-01-01");
    expect(series[series.length - 1]?.key).toBe("2026-12-31");
    const sep8 = series.find((p) => p.key === "2026-09-08");
    expect(sep8?.total).toBe(780);
    expect(series.find((p) => p.key === "2026-09-07")?.total).toBe(0);
  });

  it("includes Feb 29 in a leap year", () => {
    const series = buildYearDailySalesSeries(
      [
        {
          created_at: new Date(2024, 1, 29, 12, 0, 0).toISOString(),
          line_total: 10,
        },
      ],
      2024,
    );
    expect(series).toHaveLength(366);
    expect(series.find((p) => p.key === "2024-02-29")?.total).toBe(10);
  });
});

describe("buildYearWeeklySalesSeries", () => {
  it("buckets by Monday–Sunday week and fills zeros for the year", () => {
    const series = buildYearWeeklySalesSeries(
      [
        {
          created_at: new Date(2026, 2, 11, 10, 0, 0).toISOString(),
          line_total: 100,
        },
        {
          created_at: new Date(2026, 2, 12, 8, 0, 0).toISOString(),
          line_total: "38",
        },
        {
          created_at: new Date(2025, 2, 11).toISOString(),
          line_total: 999,
        },
      ],
      2026,
    );
    expect(series).toHaveLength(53);
    expect(series[0]?.key).toBe("2025-12-29");
    expect(series[series.length - 1]?.key).toBe("2026-12-28");
    const weekOfMar9 = series.find((p) => p.key === "2026-03-09");
    expect(weekOfMar9?.total).toBe(138);
    expect(series.find((p) => p.key === "2026-03-02")?.total).toBe(0);
  });
});

describe("salesChartLabelIndexes", () => {
  it("labels the first of each month on a daily year series", () => {
    const series = buildYearDailySalesSeries([], 2026);
    const indexes = salesChartLabelIndexes(series, "daily");
    expect([...indexes].map((i) => series[i]?.key)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ]);
  });

  it("keeps the monthly chart's sparse month labels", () => {
    const series = buildMonthlySalesSeries([], 2026);
    expect([...salesChartLabelIndexes(series, "monthly")]).toEqual([
      0, 2, 4, 5, 6, 7, 8, 11,
    ]);
  });
});

describe("buildMonthlySalesSeries and rankBestSellers", () => {
  it("fills twelve months for the year", () => {
    const series = buildMonthlySalesSeries(
      [
        {
          created_at: new Date(2026, 2, 5).toISOString(),
          line_total: 100,
        },
        {
          created_at: new Date(2026, 6, 1).toISOString(),
          line_total: 250,
        },
        {
          created_at: new Date(2025, 0, 1).toISOString(),
          line_total: 999,
        },
      ],
      2026,
    );
    expect(series).toHaveLength(12);
    expect(series[2]?.total).toBe(100);
    expect(series[6]?.total).toBe(250);
    expect(series[0]?.total).toBe(0);
  });

  it("ranks medications by revenue then units", () => {
    const ranked = rankBestSellers(
      [
        {
          medication_id: "a",
          quantity: 2,
          line_total: 100,
          medications: {
            generic_name: "Amoxicillin",
            brand_name: "Amoxil",
            strength: "500mg",
            dosage_form: "Capsule",
          },
        },
        {
          medication_id: "a",
          quantity: 1,
          line_total: 50,
          medications: {
            generic_name: "Amoxicillin",
            brand_name: "Amoxil",
            strength: "500mg",
            dosage_form: "Capsule",
          },
        },
        {
          medication_id: "b",
          quantity: 10,
          line_total: 80,
          medications: {
            generic_name: "Paracetamol",
            brand_name: "Biogesic",
            strength: "500mg",
            dosage_form: "Tablet",
          },
        },
      ],
      5,
    );
    expect(ranked.map((r) => r.medication_id)).toEqual(["a", "b"]);
    expect(ranked[0]?.revenue).toBe(150);
    expect(ranked[0]?.units_sold).toBe(3);
  });
});
