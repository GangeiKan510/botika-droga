import { NextResponse } from "next/server";

import {
  getPlanAmountCentavos,
  getSmsAddonAmountCentavos,
  SMS_ADDON_CODE,
} from "@/lib/billing";
import { parsePaymongoEvent, verifyPaymongoSignature } from "@/lib/paymongo";
import {
  fulfillPaidCheckout,
  fulfillSmsAddonCheckout,
} from "@/lib/subscription-fulfillment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (webhookSecret) {
    const valid = verifyPaymongoSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parsePaymongoEvent(body);
  if (parsed.eventType !== "checkout_session.payment.paid") {
    return NextResponse.json({ received: true });
  }

  if (!parsed.sessionId || !parsed.ownerId) {
    console.error("PayMongo webhook missing session or owner_id", parsed);
    return NextResponse.json({ received: true });
  }

  const isSms = parsed.planCode === SMS_ADDON_CODE;
  const result = isSms
    ? await fulfillSmsAddonCheckout({
        ownerId: parsed.ownerId,
        checkoutSessionId: parsed.sessionId,
        referenceNumber: parsed.referenceNumber,
        amountCentavos: parsed.amountCentavos ?? getSmsAddonAmountCentavos(),
        eventId: parsed.eventId,
      })
    : await fulfillPaidCheckout({
        ownerId: parsed.ownerId,
        checkoutSessionId: parsed.sessionId,
        referenceNumber: parsed.referenceNumber,
        amountCentavos: parsed.amountCentavos ?? getPlanAmountCentavos(),
        eventId: parsed.eventId,
      });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    duplicate: result.duplicate ?? false,
  });
}
