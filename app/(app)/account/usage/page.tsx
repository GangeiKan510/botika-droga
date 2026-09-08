import { formatMoney } from "@/lib/inventory";
import { getAccountUsageSummary } from "@/lib/queries";

export default async function AccountUsagePage() {
  const usage = await getAccountUsageSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-teal-900">Usage</h1>
        <p className="mt-1 text-teal-800/70">
          Activity for {usage.periodLabel}. SMS usage will appear here when
          alerts by text are enabled.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Medications" value={String(usage.medicationCount)} />
        <Stat label="Stock in" value={String(usage.stockInCount)} />
        <Stat label="Stock out" value={String(usage.stockOutCount)} />
        <Stat label="Sales (period)" value={formatMoney(usage.salesTotal)} />
      </div>

      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-teal-900">SMS alerts</h2>
        <p className="mt-1 text-sm text-teal-800/70">
          Optional add-on later — about ₱3 per message when enabled.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-teal-800/70">Messages sent</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-950">
              {usage.smsSent}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-teal-800/70">Included</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-950">0</dd>
          </div>
          <div>
            <dt className="text-sm text-teal-800/70">On-demand</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-950">
              ₱{usage.smsSent * 3}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-white/80 p-4">
      <p className="text-sm text-teal-800/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-teal-950">{value}</p>
    </div>
  );
}
