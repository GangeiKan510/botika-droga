import Link from "next/link";

import { formatMoney, toDateInputValue } from "@/lib/inventory";
import { getSalesForDay, getSalesForWeek } from "@/lib/queries";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const dateStr = params.date ?? toDateInputValue(new Date());
  const date = new Date(`${dateStr}T12:00:00`);

  const [daily, weekly] = await Promise.all([
    getSalesForDay(date),
    getSalesForWeek(date),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-semibold text-teal-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Sales
          </h1>
          <p className="mt-1 text-teal-800/70">
            Totals derived from stock-out (DISPENSED) lines — no separate sales
            entry.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <label className="form-control">
            <span className="label-text mb-1 text-sm">Day</span>
            <input
              type="date"
              name="date"
              defaultValue={dateStr}
              className="input input-bordered input-sm"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-sm">
            View
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
          <p className="text-sm text-teal-800/70">Daily total</p>
          <p className="mt-2 text-3xl font-semibold text-teal-950">
            {daily.formatted}
          </p>
          <p className="mt-1 text-sm opacity-60">{dateStr}</p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
          <p className="text-sm text-teal-800/70">Week total (Mon–Sun)</p>
          <p className="mt-2 text-3xl font-semibold text-teal-950">
            {weekly.formatted}
          </p>
          <p className="mt-1 text-sm opacity-60">
            {toDateInputValue(weekly.start)} → {toDateInputValue(weekly.end)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <h2 className="mb-3 text-lg font-semibold text-teal-900">
          Dispensed lines for {dateStr}
        </h2>
        {daily.rows.length === 0 ? (
          <p className="text-sm opacity-70">
            No outs recorded this day.{" "}
            <Link href="/stock/out" className="link link-primary">
              Record stock out
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Medication</th>
                  <th>Lot</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {daily.rows.map((row) => {
                  const med = row.medications as {
                    generic_name: string;
                    brand_name: string | null;
                    strength: string | null;
                  } | null;
                  const batch = row.batches as { lot_number: string } | null;
                  return (
                    <tr key={row.id}>
                      <td className="text-sm">
                        {new Date(row.created_at).toLocaleTimeString()}
                      </td>
                      <td>
                        {med
                          ? `${med.generic_name}${med.brand_name ? ` (${med.brand_name})` : ""}${med.strength ? ` ${med.strength}` : ""}`
                          : "—"}
                      </td>
                      <td className="font-mono text-sm">
                        {batch?.lot_number ?? "—"}
                      </td>
                      <td>{row.quantity}</td>
                      <td>{formatMoney(row.unit_price_snapshot)}</td>
                      <td className="font-medium">
                        {formatMoney(row.line_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-medium">
                    Daily total
                  </td>
                  <td className="font-semibold">{daily.formatted}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
