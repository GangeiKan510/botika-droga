import Link from "next/link";

import { SalesAreaChart } from "@/components/SalesAreaChart";
import { YearSelect } from "@/components/YearSelect";
import {
  SALES_PERIODS,
  salesPeriodSubtitle,
  type SalesChartPoint,
  type SalesPeriod,
} from "@/lib/inventory";

const PERIOD_LABELS: Record<SalesPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function SalesAnalyticsCard({
  year,
  years,
  period,
  series,
  totalFormatted,
}: {
  year: number;
  years: number[];
  period: SalesPeriod;
  series: SalesChartPoint[];
  totalFormatted: string;
}) {
  return (
    <section className="rounded-2xl border border-teal-100 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-teal-900">Analytics</h2>
          <p className="mt-1 text-sm text-teal-800/65">
            {salesPeriodSubtitle(period)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="join" role="group" aria-label="Revenue grouping">
            {SALES_PERIODS.map((option) => (
              <Link
                key={option}
                href={`/dashboard?year=${year}&period=${option}`}
                className={`btn btn-sm join-item ${
                  period === option ? "btn-primary" : "btn-ghost"
                }`}
                aria-current={period === option ? "page" : undefined}
              >
                {PERIOD_LABELS[option]}
              </Link>
            ))}
          </div>
          <YearSelect year={year} years={years} period={period} />
        </div>
      </div>

      <SalesAreaChart series={series} period={period} />

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
