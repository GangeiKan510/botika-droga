"use server";

import { redirect } from "next/navigation";

import {
  getPlanAmountCentavos,
  getSmsAddonAmountCentavos,
  isSubscriptionActive,
  PLAN_CODE,
  SMS_ADDON_CODE,
} from "@/lib/billing";
import { createCheckoutSession, retrieveCheckoutSession } from "@/lib/paymongo";
import {
  fulfillPaidCheckout,
  fulfillSmsAddonCheckout,
} from "@/lib/subscription-fulfillment";
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
      product: PLAN_CODE,
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

export async function startSmsAddonCheckout(
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

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (
    !isSubscriptionActive({
      status: subscription?.status,
      current_period_end: subscription?.current_period_end,
    })
  ) {
    return {
      error: "An active StockRx subscription is required before adding SMS.",
    };
  }

  const amount = getSmsAddonAmountCentavos();
  const referenceNumber = `sms_${user.id.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;

  let checkout: { id: string; checkoutUrl: string };
  try {
    checkout = await createCheckoutSession({
      ownerId: user.id,
      email: user.email,
      referenceNumber,
      product: SMS_ADDON_CODE,
    });
  } catch (err) {
    console.error("PayMongo SMS checkout failed", err);
    return { error: "Could not start payment. Try again in a moment." };
  }

  const { data: existing } = await supabase
    .from("sms_addons")
    .select("owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("sms_addons")
      .update({
        amount_centavos: amount,
        paymongo_checkout_session_id: checkout.id,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", user.id);
    if (error) {
      return { error: "Could not prepare SMS add-on." };
    }
  } else {
    const { error } = await supabase.from("sms_addons").insert({
      owner_id: user.id,
      status: "inactive",
      amount_centavos: amount,
      paymongo_checkout_session_id: checkout.id,
    });
    if (error) {
      return { error: "Could not prepare SMS add-on." };
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

export async function syncSmsAddonAfterCheckout(): Promise<{
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

  const { data: addon } = await supabase
    .from("sms_addons")
    .select("paymongo_checkout_session_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const sessionId = addon?.paymongo_checkout_session_id;
  if (!sessionId) {
    return { synced: false, error: "No SMS checkout session to sync." };
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

  const result = await fulfillSmsAddonCheckout({
    ownerId: user.id,
    checkoutSessionId: session.id,
    referenceNumber: session.referenceNumber,
    amountCentavos: session.amountCentavos ?? getSmsAddonAmountCentavos(),
  });

  if (!result.ok) {
    return { synced: false, error: "Could not activate SMS add-on." };
  }

  return { synced: true };
}
