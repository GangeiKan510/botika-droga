import Link from "next/link";

import { BestSellingProducts } from "@/components/BestSellingProducts";
import { SalesAnalyticsCard } from "@/components/SalesAnalyticsCard";
import {
  getAlerts,
  getBestSellingMedications,
  getInventoryRows,
  getRecentTransactions,
  getSalesAnalyticsForYear,
  getSalesForDay,
  getSalesForWeek,
} from "@/lib/queries";
import {
  formatMoney,
  medicationDisplayName,
  parseSalesPeriod,
} from "@/lib/inventory";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const today = new Date();
  const params = await searchParams;
  const currentYear = today.getFullYear();
  const requestedYear = Number(params.year);
  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= 2020 &&
    requestedYear <= currentYear + 1
      ? requestedYear
      : currentYear;
  const period = parseSalesPeriod(params.period);
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const [
    daily,
    weekly,
    alertsResult,
    inventory,
    recent,
    analytics,
    bestSellers,
  ] = await Promise.all([
    getSalesForDay(today),
    getSalesForWeek(today),
    getAlerts(),
    getInventoryRows(),
    getRecentTransactions(8),
    getSalesAnalyticsForYear(year, period),
    getBestSellingMedications(year, 5),
  ]);

  const alerts = alertsResult.alerts;
  const outCount = alerts.filter((a) => a.kind === "out").length;
  const lowCount = alerts.filter((a) => a.kind === "low").length;
  const expiryCount = alerts.filter(
    (a) => a.kind === "near_expiry" || a.kind === "expired",
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-teal-900">Dashboard</h1>
        <p className="mt-2 text-teal-800/70">
          Enter cashier reports as stock in/out; sales and alerts update
          automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's sales" value={daily.formatted} href="/sales" />
        <StatCard
          label="This week (Mon–Sun)"
          value={weekly.formatted}
          href="/sales"
        />
        <StatCard
          label="Stock alerts"
          value={`${outCount} out · ${lowCount} low`}
          href="/alerts"
        />
        <StatCard
          label="Expiry alerts"
          value={String(expiryCount)}
          href="/alerts"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <SalesAnalyticsCard
          year={year}
          years={years}
          period={period}
          series={analytics.series}
          totalFormatted={analytics.formatted}
        />
        <BestSellingProducts items={bestSellers} year={year} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-teal-100 bg-white/80 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-teal-900">
              Quick actions
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/stock/in" className="btn btn-primary btn-sm">
              Stock In
            </Link>
            <Link href="/stock/out" className="btn btn-secondary btn-sm">
              Stock Out
            </Link>
            <Link href="/medications/new" className="btn btn-outline btn-sm">
              Add medication
            </Link>
            <Link href="/inventory" className="btn btn-ghost btn-sm">
              View inventory
            </Link>
          </div>
          <p className="mt-4 text-sm opacity-70">
            Catalog items: {inventory.length} active medications
          </p>
        </section>

        <section className="rounded-2xl border border-teal-100 bg-white/80 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-teal-900">
              Recent movements
            </h2>
            <Link href="/sales" className="link link-primary text-sm">
              Sales
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm opacity-70">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-teal-50">
              {recent.map((txn) => {
                const med = txn.medications as {
                  generic_name: string;
                  brand_name: string | null;
                } | null;
                return (
                  <li
                    key={txn.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div>
                      <span className="badge badge-ghost badge-sm mr-2">
                        {txn.type}
                      </span>
                      {med
                        ? medicationDisplayName({
                            generic_name: med.generic_name,
                            brand_name: med.brand_name,
                          })
                        : "Medication"}
                      <span className="opacity-60"> ×{txn.quantity}</span>
                    </div>
                    <span className="font-medium">
                      {txn.type === "DISPENSED"
                        ? formatMoney(txn.line_total)
                        : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-teal-100 bg-white/80 p-4 transition hover:border-teal-300"
    >
      <p className="text-sm text-teal-800/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-teal-950">{value}</p>
    </Link>
  );
}
