import { createHmac } from "node:crypto";

import {
  addBillingPeriod,
  isSmsAddonActive,
  isSubscriptionActive,
} from "@/lib/billing";
import { verifyPaymongoSignature } from "@/lib/paymongo";

describe("billing helpers", () => {
  it("treats active subscriptions with future period end as active", () => {
    expect(
      isSubscriptionActive({
        status: "active",
        current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    ).toBe(true);
  });

  it("treats expired periods as inactive", () => {
    expect(
      isSubscriptionActive({
        status: "active",
        current_period_end: new Date(Date.now() - 86_400_000).toISOString(),
      }),
    ).toBe(false);
  });

  it("treats SMS addon period independently", () => {
    expect(
      isSmsAddonActive({
        status: "active",
        current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    ).toBe(true);
  });

  it("extends billing period by 30 days", () => {
    const start = new Date("2026-03-01T00:00:00.000Z");
    expect(addBillingPeriod(start).toISOString()).toBe(
      "2026-03-31T00:00:00.000Z",
    );
  });
});

describe("verifyPaymongoSignature", () => {
  it("accepts a valid test-mode signature", () => {
    const secret = "whsec_test_secret";
    const body = '{"data":{"id":"evt_1"}}';
    const t = "1710000000";
    const te = createHmac("sha256", secret)
      .update(`${t}.${body}`)
      .digest("hex");
    expect(verifyPaymongoSignature(body, `t=${t},te=${te},li=`, secret)).toBe(
      true,
    );
  });

  it("rejects a tampered body", () => {
    const secret = "whsec_test_secret";
    const body = '{"data":{"id":"evt_1"}}';
    const t = "1710000000";
    const te = createHmac("sha256", secret)
      .update(`${t}.${body}`)
      .digest("hex");
    expect(
      verifyPaymongoSignature(
        '{"data":{"id":"evt_2"}}',
        `t=${t},te=${te},li=`,
        secret,
      ),
    ).toBe(false);
  });
});
