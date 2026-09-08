import { StockOutForm } from "@/components/StockOutForm";
import { createClient } from "@/lib/supabase/server";
import { getMedications, getRecentTransactions } from "@/lib/queries";
import { formatMoney, medicationDisplayName } from "@/lib/inventory";

export default async function StockOutPage() {
  const supabase = await createClient();
  const [medications, recent, batchesResult] = await Promise.all([
    getMedications(true),
    getRecentTransactions(10),
    supabase
      .from("batches")
      .select("*")
      .gt("quantity_on_hand", 0)
      .order("expiration_date", { ascending: true }),
  ]);
  const batches = batchesResult.data ?? [];
  const dispensed = recent.filter((t) => t.type === "DISPENSED");

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h1
            className="text-3xl font-semibold text-teal-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Stock Out
          </h1>
          <p className="mt-1 text-teal-800/70">
            Enter outs from cashier reports. Sales totals are derived from
            quantity × selling price. FEFO picks the earliest-expiring batch.
          </p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
          <StockOutForm medications={medications} batches={batches} />
        </div>
      </div>
      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <h2 className="mb-3 text-lg font-semibold text-teal-900">
          Recent outs (sales)
        </h2>
        {dispensed.length === 0 ? (
          <p className="text-sm opacity-70">No stock-out transactions yet.</p>
        ) : (
          <ul className="divide-y divide-teal-50 text-sm">
            {dispensed.map((txn) => {
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
                    <span className="font-medium text-rose-600">
                      −{txn.quantity}
                    </span>
                    {batch ? ` · Lot ${batch.lot_number}` : ""} ·{" "}
                    {formatMoney(txn.line_total)} ·{" "}
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
