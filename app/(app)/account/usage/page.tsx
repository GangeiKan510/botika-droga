import { SubscribeButton } from "@/components/SubscribeButton";
import { syncSmsAddonAfterCheckout } from "@/app/actions/billing";
import {
  formatPlanPrice,
  getSmsAddonAmountCentavos,
  isSmsAddonActive,
  isSubscriptionActive,
  SMS_ADDON_MESSAGES,
  SMS_ADDON_NAME,
} from "@/lib/billing";
import { formatMoney } from "@/lib/inventory";
import { getAccountUsageSummary } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AccountUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ sms_paid?: string; sms_canceled?: string }>;
}) {
  const params = await searchParams;
  const usage = await getAccountUsageSummary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let syncNote: string | null = null;
  let mainActive = false;

  if (user) {
    const [{ data: sub }, { data: pendingSms }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase
        .from("sms_addons")
        .select(
          "status, current_period_end, paymongo_checkout_session_id, messages_included, messages_used",
        )
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

    mainActive = isSubscriptionActive({
      status: sub?.status,
      current_period_end: sub?.current_period_end,
    });

    const needsSmsSync =
      Boolean(pendingSms?.paymongo_checkout_session_id) &&
      !isSmsAddonActive({
        status: pendingSms?.status,
        current_period_end: pendingSms?.current_period_end,
      });

    if (params.sms_paid === "1" || needsSmsSync) {
      const sync = await syncSmsAddonAfterCheckout();
      if (sync.synced) {
        syncNote = "SMS pack confirmed — active for 30 days from purchase.";
      } else if (params.sms_paid === "1" && sync.error) {
        syncNote = sync.error;
      } else if (params.sms_paid === "1") {
        syncNote =
          "Payment is still processing. Refresh this page in a few seconds.";
      }
    }
  }

  const { data: smsAddon } = user
    ? await supabase
        .from("sms_addons")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle()
    : { data: null };

  const smsActive = isSmsAddonActive({
    status: smsAddon?.status,
    current_period_end: smsAddon?.current_period_end,
  });
  const smsPrice = formatPlanPrice(getSmsAddonAmountCentavos());
  const included = smsActive
    ? (smsAddon?.messages_included ?? SMS_ADDON_MESSAGES)
    : 0;
  const used = smsActive ? (smsAddon?.messages_used ?? 0) : usage.smsSent;
  const remaining = Math.max(0, included - used);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-teal-900">Usage</h1>
        <p className="mt-1 text-teal-800/70">
          Activity for {usage.periodLabel}. SMS packs run 30 days from purchase
          and do not end with your StockRx subscription date.
        </p>
      </div>

      {syncNote ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            smsActive
              ? "border-teal-200 bg-teal-50 text-teal-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {syncNote}
        </div>
      ) : null}
      {params.sms_canceled === "1" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          SMS checkout canceled. You can add it anytime while subscribed.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Medications" value={String(usage.medicationCount)} />
        <Stat label="Stock in" value={String(usage.stockInCount)} />
        <Stat label="Stock out" value={String(usage.stockOutCount)} />
        <Stat label="Sales (period)" value={formatMoney(usage.salesTotal)} />
      </div>

      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-teal-900">
              {SMS_ADDON_NAME}
            </h2>
            <p className="mt-1 text-sm text-teal-800/70">
              {smsPrice}/mo · {SMS_ADDON_MESSAGES} messages · starts the day you
              pay (separate from StockRx billing).
            </p>
            <p className="mt-3 text-sm text-teal-800/80">
              Status:{" "}
              <span className="font-semibold text-teal-950">
                {smsActive ? "Active" : "Not active"}
              </span>
            </p>
            {smsAddon?.current_period_end ? (
              <p className="mt-1 text-sm text-teal-800/70">
                Pack ends{" "}
                {new Date(smsAddon.current_period_end).toLocaleDateString(
                  "en-PH",
                  { dateStyle: "medium" },
                )}
              </p>
            ) : null}
            {!mainActive ? (
              <p className="mt-2 text-sm text-amber-800">
                Activate your StockRx subscription first to buy SMS.
              </p>
            ) : null}
          </div>
          <SubscribeButton
            product="sms_addon"
            label={
              smsActive ? `Renew SMS — ${smsPrice}` : `Add SMS — ${smsPrice}/mo`
            }
            disabled={!mainActive}
          />
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-teal-800/70">Messages sent</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-950">
              {used}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-teal-800/70">Included</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-950">
              {included}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-teal-800/70">Remaining</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-950">
              {remaining}
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
