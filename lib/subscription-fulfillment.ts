import {
  addBillingPeriod,
  getPlanAmountCentavos,
  PLAN_CODE,
} from "@/lib/billing";
import { createServiceClient } from "@/lib/supabase/admin";

export type FulfillPaidCheckoutInput = {
  ownerId: string;
  checkoutSessionId: string;
  referenceNumber?: string | null;
  amountCentavos?: number | null;
  eventId?: string | null;
};

export type FulfillPaidCheckoutResult =
  { ok: true; duplicate?: boolean } | { ok: false; error: string };

/** Idempotent: records payment + activates/extends subscription by 30 days. */
export async function fulfillPaidCheckout(
  input: FulfillPaidCheckoutInput,
): Promise<FulfillPaidCheckoutResult> {
  const amount = input.amountCentavos ?? getPlanAmountCentavos();
  const supabase = createServiceClient();

  const { data: existingPayment } = await supabase
    .from("subscription_payments")
    .select("id")
    .eq("checkout_session_id", input.checkoutSessionId)
    .maybeSingle();

  if (existingPayment) {
    return { ok: true, duplicate: true };
  }

  const { error: paymentError } = await supabase
    .from("subscription_payments")
    .insert({
      owner_id: input.ownerId,
      checkout_session_id: input.checkoutSessionId,
      reference_number: input.referenceNumber ?? null,
      amount_centavos: amount,
      status: "paid",
      paymongo_event_id: input.eventId ?? null,
      paid_at: new Date().toISOString(),
    });

  if (paymentError) {
    console.error("Failed to insert subscription payment", paymentError);
    return { ok: false, error: "persist_failed" };
  }

  const { data: current } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  const now = new Date();
  const existingEnd = current?.current_period_end
    ? new Date(current.current_period_end)
    : null;
  const periodStart =
    existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
  const periodEnd = addBillingPeriod(periodStart);

  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      owner_id: input.ownerId,
      status: "active",
      plan_code: PLAN_CODE,
      amount_centavos: amount,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      paymongo_checkout_session_id: input.checkoutSessionId,
      updated_at: now.toISOString(),
    },
    { onConflict: "owner_id" },
  );

  if (subError) {
    console.error("Failed to activate subscription", subError);
    return { ok: false, error: "activate_failed" };
  }

  return { ok: true };
}
