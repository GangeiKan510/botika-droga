"use client";

import { useActionState } from "react";

import {
  updateAlertSettings,
  type SettingsActionState,
} from "@/app/actions/settings";
import type { OwnerAlertSettings } from "@/lib/inventory";

const initial: SettingsActionState = {};

export function SettingsForm({
  settings,
  fullName,
}: {
  settings: OwnerAlertSettings;
  fullName: string | null;
}) {
  const [state, action, pending] = useActionState(updateAlertSettings, initial);

  return (
    <form action={action} className="grid max-w-lg gap-5">
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Display name</span>
        <input
          name="full_name"
          type="text"
          defaultValue={fullName ?? ""}
          className="input input-bordered w-full"
        />
      </label>

      <fieldset className="rounded-xl border border-teal-100 p-4">
        <legend className="px-1 text-sm font-semibold text-teal-900">
          Alert thresholds
        </legend>
        <p className="mb-4 text-sm opacity-70">
          Low stock alerts use this global unit threshold for all medications.
          Near expiry uses your day window for all lots. Per-medication reorder
          points on the catalog are for planning only.
        </p>
        <div className="grid gap-4">
          <label className="form-control w-full">
            <span className="label-text mb-1 font-medium">
              Low stock threshold (units)
            </span>
            <input
              name="low_stock_threshold"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={settings.low_stock_threshold}
              className="input input-bordered w-full"
            />
            <span className="label-text-alt mt-1 opacity-60">
              Notify when quantity on hand is at or below this number.
            </span>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1 font-medium">
              Near expiry window (days)
            </span>
            <input
              name="near_expiry_days"
              type="number"
              min={1}
              max={3650}
              step={1}
              required
              defaultValue={settings.near_expiry_days}
              className="input input-bordered w-full"
            />
            <span className="label-text-alt mt-1 opacity-60">
              Notify when a lot expires within this many days (FEFO).
            </span>
          </label>
        </div>
      </fieldset>

      {state.error ? (
        <p className="text-error text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-success text-sm" role="status">
          {state.success}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
