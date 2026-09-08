"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  filterInventoryRows,
  formatMoney,
  medicationDisplayName,
  nextInventorySortState,
  sortInventoryRows,
  uniqueMedicationCategories,
  type InventorySortKey,
  type InventoryStockFilter,
  type MedicationSortDirection,
} from "@/lib/inventory";
import type { Batch, Medication } from "@/lib/database.types";

export type InventoryListItem = Medication & {
  total_qoh: number;
  batches: Batch[];
  status: "ok" | "low" | "out";
  low_threshold: number;
};

const statusBadge: Record<string, string> = {
  ok: "badge-success",
  low: "badge-warning",
  out: "badge-error",
};

const statusLabel: Record<string, string> = {
  ok: "OK",
  low: "Low",
  out: "Out",
};

export function InventoryCatalog({ rows }: { rows: InventoryListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<InventoryStockFilter>("all");
  const [sortKey, setSortKey] = useState<InventorySortKey>("drug");
  const [sortDirection, setSortDirection] =
    useState<MedicationSortDirection>("asc");

  const categories = useMemo(() => uniqueMedicationCategories(rows), [rows]);

  const visible = useMemo(() => {
    const filtered = filterInventoryRows(rows, { query, category, stock });
    return sortInventoryRows(filtered, sortKey, sortDirection);
  }, [rows, query, category, stock, sortKey, sortDirection]);

  const hasFilters =
    query.trim() !== "" || category !== "all" || stock !== "all";

  function onSort(nextKey: InventorySortKey) {
    const next = nextInventorySortState(sortKey, sortDirection, nextKey);
    setSortKey(next.key);
    setSortDirection(next.direction);
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStock("all");
  }

  if (rows.length === 0) {
    return (
      <p className="opacity-70">
        No active medications.{" "}
        <Link href="/medications/new" className="link link-primary">
          Add one
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-100 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="form-control w-full flex-1">
            <span className="label-text mb-1.5 text-sm font-medium text-teal-900">
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, brand, SKU, category…"
              className="input input-bordered w-full"
              autoComplete="off"
            />
          </label>
          <label className="form-control w-full lg:w-52">
            <span className="label-text mb-1.5 text-sm font-medium text-teal-900">
              Category
            </span>
            <select
              className="select select-bordered w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full lg:w-44">
            <span className="label-text mb-1.5 text-sm font-medium text-teal-900">
              Stock
            </span>
            <select
              className="select select-bordered w-full"
              value={stock}
              onChange={(e) => setStock(e.target.value as InventoryStockFilter)}
            >
              <option value="all">All</option>
              <option value="ok">OK</option>
              <option value="low">Low</option>
              <option value="out">Out</option>
            </select>
          </label>
          {hasFilters ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearFilters}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white/90 shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-teal-100 bg-teal-50/60 px-4 py-3">
          <SortChip
            label="Drug"
            column="drug"
            activeKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
          <SortChip
            label="QOH"
            column="qoh"
            activeKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
          <SortChip
            label="Alert"
            column="alert"
            activeKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
          <SortChip
            label="Sell"
            column="sell"
            activeKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
          <SortChip
            label="Status"
            column="status"
            activeKey={sortKey}
            direction={sortDirection}
            onSort={onSort}
          />
        </div>

        <div className="divide-y divide-teal-50">
          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm opacity-70">
              No inventory rows match your search or filters.
            </p>
          ) : (
            visible.map((row) => {
              const full = rows.find((r) => r.id === row.id)!;
              return (
                <details
                  key={row.id}
                  className="group px-5 py-4 open:bg-teal-50/30"
                >
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_auto_repeat(3,minmax(4.5rem,1fr))_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="font-medium text-teal-950">
                          {medicationDisplayName(row)}
                        </div>
                        {row.category ? (
                          <div className="mt-0.5 text-xs text-teal-800/60">
                            {row.category}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={`badge badge-sm justify-self-start ${statusBadge[row.status]}`}
                      >
                        {statusLabel[row.status]}
                      </span>
                      <div className="text-sm text-teal-900">
                        <div className="text-xs uppercase tracking-wide opacity-50">
                          QOH
                        </div>
                        <div className="font-medium">{row.total_qoh}</div>
                      </div>
                      <div className="text-sm text-teal-900">
                        <div className="text-xs uppercase tracking-wide opacity-50">
                          Alert ≤
                        </div>
                        <div className="font-medium">{row.low_threshold}</div>
                      </div>
                      <div className="text-sm text-teal-900">
                        <div className="text-xs uppercase tracking-wide opacity-50">
                          Sell
                        </div>
                        <div className="font-medium">
                          {formatMoney(row.unit_selling_price)}
                        </div>
                      </div>
                      <span
                        className="justify-self-end text-teal-700/70 transition group-open:rotate-180"
                        aria-hidden
                      >
                        ▾
                      </span>
                    </div>
                  </summary>
                  <div className="mt-4 rounded-xl border border-teal-100 bg-white p-4">
                    {full.batches.length === 0 ? (
                      <p className="text-sm opacity-70">
                        No batches yet — use Stock In.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Lot</th>
                              <th>Expiry</th>
                              <th>QOH</th>
                              <th>Supplier</th>
                              <th>Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {full.batches.map((b) => (
                              <tr key={b.id}>
                                <td className="font-mono">{b.lot_number}</td>
                                <td>{b.expiration_date}</td>
                                <td>{b.quantity_on_hand}</td>
                                <td>{b.supplier_name ?? "—"}</td>
                                <td>{b.storage_location ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-teal-100 px-5 py-3 text-sm text-teal-800/70">
          <span>
            Showing {visible.length} of {rows.length}
          </span>
          <span className="text-xs">
            Sorted by {inventorySortLabel(sortKey)} (
            {sortDirection === "asc" ? "A→Z / low→high" : "Z→A / high→low"})
          </span>
        </div>
      </div>
    </div>
  );
}

function inventorySortLabel(key: InventorySortKey): string {
  switch (key) {
    case "drug":
      return "Drug";
    case "qoh":
      return "QOH";
    case "alert":
      return "Alert";
    case "sell":
      return "Sell";
    case "status":
      return "Status";
  }
}

function SortChip({
  label,
  column,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  column: InventorySortKey;
  activeKey: InventorySortKey;
  direction: MedicationSortDirection;
  onSort: (key: InventorySortKey) => void;
}) {
  const active = activeKey === column;
  return (
    <button
      type="button"
      className={`btn btn-xs ${active ? "btn-primary" : "btn-ghost"}`}
      onClick={() => onSort(column)}
      aria-label={`Sort by ${label}`}
    >
      {label} {active ? (direction === "asc" ? "↑" : "↓") : ""}
    </button>
  );
}
