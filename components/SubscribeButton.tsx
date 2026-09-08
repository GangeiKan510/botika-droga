"use client";

import { useActionState } from "react";

import {
  startSubscriptionCheckout,
  type BillingActionState,
} from "@/app/actions/billing";

const initial: BillingActionState = {};

export function SubscribeButton({
  label,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    startSubscriptionCheckout,
    initial,
  );

  if (disabled) {
    return (
      <button type="button" className="btn btn-primary" disabled>
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2">
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
