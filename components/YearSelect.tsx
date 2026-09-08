"use client";

import { useRouter } from "next/navigation";

export function YearSelect({ year, years }: { year: number; years: number[] }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Year</span>
      <select
        className="select select-bordered select-sm min-w-24"
        value={String(year)}
        onChange={(e) => {
          const next = e.target.value;
          router.push(`/dashboard?year=${next}`);
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
