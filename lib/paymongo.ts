import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getAppUrl,
  getPaymentMethodTypes,
  getPlanAmountCentavos,
  PLAN_NAME,
} from "@/lib/billing";

type PaymongoErrorBody = {
  errors?: Array<{ detail?: string; code?: string }>;
};

export type CheckoutSessionResult = {
  id: string;
  checkoutUrl: string;
};

function secretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured.");
  }
  return key;
}

function authHeader(key = secretKey()): string {
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export async function createCheckoutSession(input: {
  ownerId: string;
  email?: string | null;
  referenceNumber: string;
}): Promise<CheckoutSessionResult> {
  const amount = getPlanAmountCentavos();
  const appUrl = getAppUrl();

  const response = await fetch(
    "https://api.paymongo.com/v2/checkout_sessions",
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        "Idempotency-Key": input.referenceNumber,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: `${PLAN_NAME} — monthly subscription`,
            line_items: [
              {
                name: PLAN_NAME,
                description: "1 store · 30 days access",
                amount,
                currency: "PHP",
                quantity: 1,
              },
            ],
            payment_method_types: getPaymentMethodTypes(),
            success_url: `${appUrl}/account/subscription?paid=1`,
            cancel_url: `${appUrl}/account/subscription?canceled=1`,
            reference_number: input.referenceNumber,
            metadata: {
              owner_id: input.ownerId,
              plan_code: "standard",
            },
            ...(input.email
              ? {
                  customer_email: input.email,
                  billing: { email: input.email },
                }
              : {}),
          },
        },
      }),
    },
  );

  const json = (await response.json()) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
  } & PaymongoErrorBody;

  if (!response.ok || !json.data?.id || !json.data.attributes?.checkout_url) {
    const detail = json.errors?.[0]?.detail ?? "Could not start checkout.";
    throw new Error(detail);
  }

  return {
    id: json.data.id,
    checkoutUrl: json.data.attributes.checkout_url,
  };
}

export type RetrievedCheckoutSession = {
  id: string;
  paid: boolean;
  ownerId: string | null;
  referenceNumber: string | null;
  amountCentavos: number | null;
};

export async function retrieveCheckoutSession(
  sessionId: string,
): Promise<RetrievedCheckoutSession | null> {
  const response = await fetch(
    `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
    {
      headers: {
        Authorization: authHeader(),
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error("PayMongo retrieve checkout failed", await response.text());
    return null;
  }

  const json = (await response.json()) as {
    data?: {
      id?: string;
      attributes?: {
        status?: string;
        paid_at?: number | null;
        reference_number?: string | null;
        metadata?: Record<string, string> | null;
        line_items?: Array<{ amount?: number }>;
        payments?: Array<{
          attributes?: { amount?: number; status?: string };
        }>;
        payment_intent?: {
          attributes?: {
            status?: string;
            amount?: number;
            payments?: Array<{
              attributes?: { amount?: number; status?: string };
            }>;
          };
        };
      };
    };
  };

  const data = json.data;
  const attrs = data?.attributes;
  if (!data?.id || !attrs) return null;

  const payments = [
    ...(attrs.payments ?? []),
    ...(attrs.payment_intent?.attributes?.payments ?? []),
  ];
  const paidPayment = payments.find(
    (p) => p.attributes?.status?.toLowerCase() === "paid",
  );
  const intentSucceeded =
    attrs.payment_intent?.attributes?.status?.toLowerCase() === "succeeded";
  const statusPaid = ["paid", "completed", "active"].includes(
    (attrs.status ?? "").toLowerCase(),
  );
  const paid = Boolean(
    paidPayment || intentSucceeded || attrs.paid_at || statusPaid,
  );

  const amountCentavos =
    paidPayment?.attributes?.amount ??
    attrs.payment_intent?.attributes?.amount ??
    attrs.line_items?.[0]?.amount ??
    null;

  return {
    id: data.id,
    paid,
    ownerId: attrs.metadata?.owner_id ?? null,
    referenceNumber: attrs.reference_number ?? null,
    amountCentavos,
  };
}

/**
 * Verify Paymongo-Signature: `t=...,te=...,li=...`
 * Test mode uses `te`; live mode uses `li`.
 */
export function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): boolean {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((pair) => {
      const [k, v] = pair.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  );

  const timestamp = parts.t;
  const testSig = parts.te;
  const liveSig = parts.li;
  if (!timestamp || (!testSig && !liveSig)) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  const candidates = [testSig, liveSig].filter(Boolean) as string[];
  return candidates.some((candidate) => safeEqualHex(expected, candidate));
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export type PaymongoWebhookEvent = {
  id?: string;
  type?: string;
  attributes?: {
    type?: string;
    livemode?: boolean;
    data?: {
      id?: string;
      type?: string;
      attributes?: {
        reference_number?: string | null;
        metadata?: Record<string, string> | null;
        payments?: Array<{
          id?: string;
          attributes?: {
            amount?: number;
            currency?: string;
            status?: string;
          };
        }>;
        line_items?: Array<{ amount?: number; currency?: string }>;
      };
    };
  };
};

export function parsePaymongoEvent(body: unknown): {
  eventId: string | null;
  eventType: string | null;
  sessionId: string | null;
  ownerId: string | null;
  referenceNumber: string | null;
  amountCentavos: number | null;
} {
  const root = body as { data?: PaymongoWebhookEvent };
  const event = root.data ?? (body as PaymongoWebhookEvent);
  const eventType = event.attributes?.type ?? event.type ?? null;
  const session = event.attributes?.data;
  const attrs = session?.attributes;
  const metadata = attrs?.metadata ?? {};
  const paymentAmount = attrs?.payments?.[0]?.attributes?.amount;
  const lineAmount = attrs?.line_items?.[0]?.amount;

  return {
    eventId: event.id ?? null,
    eventType,
    sessionId: session?.id ?? null,
    ownerId: metadata.owner_id ?? null,
    referenceNumber: attrs?.reference_number ?? null,
    amountCentavos: paymentAmount ?? lineAmount ?? null,
  };
}
