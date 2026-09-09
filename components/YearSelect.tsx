"use client";

import { useRouter } from "next/navigation";

import type { SalesPeriod } from "@/lib/inventory";

export function YearSelect({
  year,
  years,
  period,
}: {
  year: number;
  years: number[];
  period: SalesPeriod;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Year</span>
      <select
        className="select select-bordered select-sm min-w-24"
        value={String(year)}
        onChange={(e) => {
          const next = e.target.value;
          router.push(`/dashboard?year=${next}&period=${period}`);
        }}
        aria-label="Select analytics year"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
