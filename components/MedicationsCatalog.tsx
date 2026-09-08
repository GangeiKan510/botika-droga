"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  filterMedications,
  formatMoney,
  medicationDisplayName,
  nextSortState,
  sortMedications,
  uniqueMedicationCategories,
  type MedicationSortDirection,
  type MedicationSortKey,
  type MedicationStatusFilter,
} from "@/lib/inventory";
import type { Medication } from "@/lib/database.types";

export function MedicationsCatalog({
  medications,
}: {
  medications: Medication[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<MedicationStatusFilter>("all");
  const [sortKey, setSortKey] = useState<MedicationSortKey>("drug");
  const [sortDirection, setSortDirection] =
    useState<MedicationSortDirection>("asc");

  const categories = useMemo(
    () => uniqueMedicationCategories(medications),
    [medications],
  );

  const visible = useMemo(() => {
    const filtered = filterMedications(medications, {
      query,
      category,
      status,
    });
    return sortMedications(filtered, sortKey, sortDirection);
  }, [medications, query, category, status, sortKey, sortDirection]);

  const hasFilters =
    query.trim() !== "" || category !== "all" || status !== "all";

  function onSort(nextKey: MedicationSortKey) {
    const next = nextSortState(sortKey, sortDirection, nextKey);
    setSortKey(next.key);
    setSortDirection(next.direction);
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStatus("all");
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
              Status
            </span>
            <select
              className="select select-bordered w-full"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as MedicationStatusFilter)
              }
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/60 text-teal-900">
                <SortableTh
                  label="Drug"
                  column="drug"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                />
                <SortableTh
                  label="SKU"
                  column="sku"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                />
                <th className="font-semibold">Variant</th>
                <SortableTh
                  label="Cost"
                  column="cost"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                />
                <SortableTh
                  label="Sell"
                  column="sell"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                />
                <SortableTh
                  label="Reorder"
                  column="reorder"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                />
                <SortableTh
                  label="Status"
                  column="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={onSort}
                />
                <th />
              </tr>
            </thead>
            <tbody>
              {medications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center opacity-70">
                    No medications yet. Add your first drug to the catalog.
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center opacity-70">
                    No medications match your search or filters.
                  </td>
                </tr>
              ) : (
                visible.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-teal-50 ${!m.is_active ? "opacity-55" : ""}`}
                  >
                    <td className="py-4">
                      <div className="font-medium text-teal-950">
                        {medicationDisplayName({
                          generic_name: m.generic_name,
                          brand_name: m.brand_name,
                        })}
                      </div>
                      {m.category ? (
                        <div className="mt-0.5 text-xs text-teal-800/60">
                          {m.category}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4 font-mono text-sm">{m.sku}</td>
                    <td className="py-4 text-sm">
                      {[m.strength, m.dosage_form, m.pack_size]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="py-4">{formatMoney(m.unit_cost_price)}</td>
                    <td className="py-4">
                      {formatMoney(m.unit_selling_price)}
                    </td>
                    <td className="py-4">{m.reorder_point}</td>
                    <td className="py-4">
                      {m.is_active ? (
                        <span className="badge badge-success badge-sm">
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/medications/${m.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {medications.length > 0 ? (
          <div className="flex items-center justify-between border-t border-teal-100 px-5 py-3 text-sm text-teal-800/70">
            <span>
              Showing {visible.length} of {medications.length}
            </span>
            <span className="text-xs">
              Sorted by {sortLabel(sortKey)} (
              {sortDirection === "asc" ? "A→Z / low→high" : "Z→A / high→low"})
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function sortLabel(key: MedicationSortKey): string {
  switch (key) {
    case "drug":
      return "Drug";
    case "sku":
      return "SKU";
    case "category":
      return "Category";
    case "cost":
      return "Cost";
    case "sell":
      return "Sell";
    case "reorder":
      return "Reorder";
    case "status":
      return "Status";
  }
}

function SortableTh({
  label,
  column,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  column: MedicationSortKey;
  activeKey: MedicationSortKey;
  direction: MedicationSortDirection;
  onSort: (key: MedicationSortKey) => void;
}) {
  const active = activeKey === column;
  return (
    <th className="font-semibold">
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-teal-100/80 ${
          active ? "text-teal-900" : "text-teal-800/80"
        }`}
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className="font-mono text-xs opacity-70" aria-hidden>
          {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
