"use client";

import { useActionState } from "react";

import {
  startSmsAddonCheckout,
  startSubscriptionCheckout,
  type BillingActionState,
} from "@/app/actions/billing";

const initial: BillingActionState = {};

export function SubscribeButton({
  label,
  disabled = false,
  product = "standard",
}: {
  label: string;
  disabled?: boolean;
  product?: "standard" | "sms_addon";
}) {
  const action =
    product === "sms_addon" ? startSmsAddonCheckout : startSubscriptionCheckout;
  const [state, formAction, pending] = useActionState(action, initial);

  if (disabled) {
    return (
      <button type="button" className="btn btn-primary" disabled>
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Redirecting…" : label}
      </button>
      {state.error ? (
        <p className="text-sm text-rose-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
