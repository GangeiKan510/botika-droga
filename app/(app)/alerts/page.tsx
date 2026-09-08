import Link from "next/link";

import { getAlerts } from "@/lib/queries";

const kindLabel = {
  out: "Out of stock",
  low: "Low stock",
  near_expiry: "Near expiry",
  expired: "Expired",
} as const;

const kindClass = {
  out: "badge-error",
  low: "badge-warning",
  near_expiry: "badge-warning",
  expired: "badge-error",
} as const;

export default async function AlertsPage() {
  const { alerts, settings } = await getAlerts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-teal-900">Alerts</h1>
          <p className="mt-1 text-teal-800/70">
            Out of stock, low stock (≤ {settings.low_stock_threshold} units),
            and near expiry (≤ {settings.near_expiry_days} days).
          </p>
        </div>
        <Link href="/settings" className="btn btn-outline btn-sm">
          Edit thresholds
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
          <p className="text-success">No stock or expiry alerts right now.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert, i) => (
            <li
              key={`${alert.kind}-${alert.medication_id}-${alert.batch_id ?? i}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-teal-100 bg-white/80 p-4"
            >
              <div>
                <span className={`badge badge-sm ${kindClass[alert.kind]}`}>
                  {kindLabel[alert.kind]}
                </span>
                <p className="mt-2 font-medium text-teal-950">
                  {alert.medication_label}
                </p>
                <p className="text-sm opacity-70">{alert.detail}</p>
              </div>
              <div className="flex gap-2">
                {(alert.kind === "out" || alert.kind === "low") && (
                  <Link href="/stock/in" className="btn btn-primary btn-sm">
                    Restock
                  </Link>
                )}
                {(alert.kind === "near_expiry" || alert.kind === "expired") && (
                  <Link href="/stock/out" className="btn btn-outline btn-sm">
                    Dispense (FEFO)
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
