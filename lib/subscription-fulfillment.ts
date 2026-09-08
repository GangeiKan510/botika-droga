import {
  addBillingPeriod,
  getPlanAmountCentavos,
  getSmsAddonAmountCentavos,
  PLAN_CODE,
  SMS_ADDON_CODE,
  SMS_ADDON_MESSAGES,
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
      product_code: PLAN_CODE,
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

/**
 * SMS pack: 30 days from purchase (independent of main sub).
 * Top up remaining messages if renewing early.
 */
export async function fulfillSmsAddonCheckout(
  input: FulfillPaidCheckoutInput,
): Promise<FulfillPaidCheckoutResult> {
  const amount = input.amountCentavos ?? getSmsAddonAmountCentavos();
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
      product_code: SMS_ADDON_CODE,
      status: "paid",
      paymongo_event_id: input.eventId ?? null,
      paid_at: new Date().toISOString(),
    });

  if (paymentError) {
    console.error("Failed to insert SMS addon payment", paymentError);
    return { ok: false, error: "persist_failed" };
  }

  const { data: current } = await supabase
    .from("sms_addons")
    .select("messages_included, messages_used, current_period_end, status")
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  const now = new Date();
  const stillActive =
    current?.status === "active" &&
    current.current_period_end &&
    new Date(current.current_period_end).getTime() > now.getTime();

  const remaining = stillActive
    ? Math.max(
        0,
        (current?.messages_included ?? 0) - (current?.messages_used ?? 0),
      )
    : 0;

  const periodStart = now;
  const periodEnd = addBillingPeriod(now);

  const { error: addonError } = await supabase.from("sms_addons").upsert(
    {
      owner_id: input.ownerId,
      status: "active",
      messages_included: remaining + SMS_ADDON_MESSAGES,
      messages_used: 0,
      amount_centavos: amount,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      paymongo_checkout_session_id: input.checkoutSessionId,
      updated_at: now.toISOString(),
    },
    { onConflict: "owner_id" },
  );

  if (addonError) {
    console.error("Failed to activate SMS addon", addonError);
    return { ok: false, error: "activate_failed" };
  }

  return { ok: true };
}
