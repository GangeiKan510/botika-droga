import { StockInForm } from "@/components/StockInForm";
import { getMedications, getRecentTransactions } from "@/lib/queries";
import { formatMoney, medicationDisplayName } from "@/lib/inventory";

export default async function StockInPage() {
  const [medications, recent] = await Promise.all([
    getMedications(true),
    getRecentTransactions(10),
  ]);
  const received = recent.filter((t) => t.type === "RECEIVED");

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h1
            className="text-3xl font-semibold text-teal-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Stock In
          </h1>
          <p className="mt-1 text-teal-800/70">
            Record purchases by batch / lot from supplier or restock reports.
          </p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
          <StockInForm medications={medications} />
        </div>
      </div>
      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <h2 className="mb-3 text-lg font-semibold text-teal-900">
          Recent receipts
        </h2>
        {received.length === 0 ? (
          <p className="text-sm opacity-70">No stock-in transactions yet.</p>
        ) : (
          <ul className="divide-y divide-teal-50 text-sm">
            {received.map((txn) => {
              const med = txn.medications as {
                generic_name: string;
                brand_name: string | null;
              } | null;
              const batch = txn.batches as { lot_number: string } | null;
              return (
                <li key={txn.id} className="py-2">
                  <div className="font-medium">
                    {med
                      ? medicationDisplayName({
                          generic_name: med.generic_name,
                          brand_name: med.brand_name,
                        })
                      : "Medication"}
                  </div>
                  <div className="text-teal-800/70">
                    <span className="font-medium text-teal-700">
                      +{txn.quantity}
                    </span>
                    {batch ? ` · Lot ${batch.lot_number}` : ""} ·{" "}
                    {formatMoney(txn.line_total)} cost ·{" "}
                    {new Date(txn.created_at).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
