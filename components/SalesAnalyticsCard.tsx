import Link from "next/link";

import { SalesAreaChart } from "@/components/SalesAreaChart";
import { YearSelect } from "@/components/YearSelect";
import type { MonthlySalesPoint } from "@/lib/inventory";

export function SalesAnalyticsCard({
  year,
  years,
  series,
  totalFormatted,
}: {
  year: number;
  years: number[];
  series: MonthlySalesPoint[];
  totalFormatted: string;
}) {
  return (
    <section className="rounded-2xl border border-teal-100 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-teal-900">Analytics</h2>
          <p className="mt-1 text-sm text-teal-800/65">Revenue (₱) by month</p>
        </div>
        <YearSelect year={year} years={years} />
      </div>

      <SalesAreaChart series={series} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-teal-50 pt-3 text-sm">
        <span className="text-teal-800/65">
          Year total:{" "}
          <span className="font-semibold text-teal-950">{totalFormatted}</span>
        </span>
        <Link href="/sales" className="link link-primary">
          Open sales report
        </Link>
      </div>
    </section>
  );
}
