"use server";

import { redirect } from "next/navigation";

import { getPlanAmountCentavos, PLAN_CODE } from "@/lib/billing";
import { createCheckoutSession, retrieveCheckoutSession } from "@/lib/paymongo";
import { fulfillPaidCheckout } from "@/lib/subscription-fulfillment";
import { createClient } from "@/lib/supabase/server";

export type BillingActionState = {
  error?: string;
};

export async function startSubscriptionCheckout(
  _prev: BillingActionState,
  _formData: FormData,
): Promise<BillingActionState> {
  void _prev;
  void _formData;
  if (!process.env.PAYMONGO_SECRET_KEY) {
    return {
      error:
        "Payments are not configured yet. Add PAYMONGO_SECRET_KEY to the server environment.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const amount = getPlanAmountCentavos();
  const referenceNumber = `sub_${user.id.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;

  let checkout: { id: string; checkoutUrl: string };
  try {
    checkout = await createCheckoutSession({
      ownerId: user.id,
      email: user.email,
      referenceNumber,
    });
  } catch (err) {
    console.error("PayMongo checkout failed", err);
    return { error: "Could not start payment. Try again in a moment." };
  }

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan_code: PLAN_CODE,
        amount_centavos: amount,
        paymongo_checkout_session_id: checkout.id,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", user.id);
    if (error) {
      return { error: "Could not prepare subscription." };
    }
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      owner_id: user.id,
      status: "inactive",
      plan_code: PLAN_CODE,
      amount_centavos: amount,
      paymongo_checkout_session_id: checkout.id,
    });
    if (error) {
      return { error: "Could not prepare subscription." };
    }
  }

  redirect(checkout.checkoutUrl);
}

/** Sync a paid checkout when webhooks can't reach localhost. */
export async function syncSubscriptionAfterCheckout(): Promise<{
  synced: boolean;
  error?: string;
}> {
  if (!process.env.PAYMONGO_SECRET_KEY) {
    return { synced: false, error: "PayMongo is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { synced: false, error: "Not signed in." };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("paymongo_checkout_session_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const sessionId = subscription?.paymongo_checkout_session_id;
  if (!sessionId) {
    return { synced: false, error: "No checkout session to sync." };
  }

  const session = await retrieveCheckoutSession(sessionId);
  if (!session) {
    return { synced: false, error: "Could not load checkout from PayMongo." };
  }
  if (!session.paid) {
    return { synced: false };
  }
  if (session.ownerId && session.ownerId !== user.id) {
    return { synced: false, error: "Checkout does not match this account." };
  }

  const result = await fulfillPaidCheckout({
    ownerId: user.id,
    checkoutSessionId: session.id,
    referenceNumber: session.referenceNumber,
    amountCentavos: session.amountCentavos ?? getPlanAmountCentavos(),
  });

  if (!result.ok) {
    return { synced: false, error: "Could not activate subscription." };
  }

  return { synced: true };
}
