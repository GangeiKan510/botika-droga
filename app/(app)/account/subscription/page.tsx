import { SubscribeButton } from "@/components/SubscribeButton";
import { syncSubscriptionAfterCheckout } from "@/app/actions/billing";
import {
  formatPlanPrice,
  getPlanAmountCentavos,
  isSubscriptionActive,
  PLAN_NAME,
} from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

export default async function AccountSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let syncNote: string | null = null;
  if (user) {
    const { data: pending } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, paymongo_checkout_session_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    const needsSync =
      Boolean(pending?.paymongo_checkout_session_id) &&
      !isSubscriptionActive({
        status: pending?.status,
        current_period_end: pending?.current_period_end,
      });

    if (params.paid === "1" || needsSync) {
      const sync = await syncSubscriptionAfterCheckout();
      if (sync.synced) {
        syncNote = "Payment confirmed — your subscription is now active.";
      } else if (params.paid === "1" && sync.error) {
        syncNote = sync.error;
      } else if (params.paid === "1") {
        syncNote =
          "Payment is still processing. Refresh this page in a few seconds.";
      }
    }
  }

  const [{ data: subscription }, { data: payments }] = await Promise.all([
    user
      ? supabase
          .from("subscriptions")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("subscription_payments")
          .select("id, amount_centavos, paid_at, status, reference_number")
          .eq("owner_id", user.id)
          .order("paid_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
  ]);

  const active = isSubscriptionActive({
    status: subscription?.status,
    current_period_end: subscription?.current_period_end,
  });
  const price = formatPlanPrice(
    subscription?.amount_centavos ?? getPlanAmountCentavos(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-teal-900">Subscription</h1>
        <p className="mt-1 text-teal-800/70">
          One plan for your store. Pay with GCash, card, or QR Ph via PayMongo.
        </p>
      </div>

      {syncNote ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            active
              ? "border-teal-200 bg-teal-50 text-teal-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {syncNote}
        </div>
      ) : null}
      {params.canceled === "1" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Checkout canceled. You can try again whenever you&apos;re ready.
        </div>
      ) : null}

      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-800/70">{PLAN_NAME}</p>
            <p className="mt-1 text-3xl font-semibold text-teal-950">
              {price}
              <span className="text-base font-medium text-teal-800/70">
                /month
              </span>
            </p>
            <p className="mt-3 text-sm text-teal-800/80">
              Status:{" "}
              <span className="font-semibold text-teal-950">
                {active ? "Active" : (subscription?.status ?? "Inactive")}
              </span>
            </p>
            {subscription?.current_period_end ? (
              <p className="mt-1 text-sm text-teal-800/70">
                Current period ends{" "}
                {new Date(subscription.current_period_end).toLocaleDateString(
                  "en-PH",
                  { dateStyle: "medium" },
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-teal-800/70">
                No active billing period yet.
              </p>
            )}
          </div>
          <SubscribeButton
            label={active ? "Subscribed" : `Subscribe — ${price}/mo`}
            disabled={active}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-teal-900">Payment history</h2>
        {(payments ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-teal-800/70">No payments yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      {new Date(p.paid_at).toLocaleDateString("en-PH", {
                        dateStyle: "medium",
                      })}
                    </td>
                    <td className="font-mono text-sm">
                      {p.reference_number ?? "—"}
                    </td>
                    <td>{formatPlanPrice(p.amount_centavos)}</td>
                    <td className="capitalize">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
