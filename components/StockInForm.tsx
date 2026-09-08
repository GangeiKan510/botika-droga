"use client";

import { useActionState, useMemo, useState } from "react";

import { recordStockIn, type StockActionState } from "@/app/actions/stock";
import { medicationDisplayName } from "@/lib/inventory";
import type { Medication } from "@/lib/database.types";

const initial: StockActionState = {};

export function StockInForm({ medications }: { medications: Medication[] }) {
  const [state, action, pending] = useActionState(recordStockIn, initial);
  const [medId, setMedId] = useState(medications[0]?.id ?? "");

  const selected = useMemo(
    () => medications.find((m) => m.id === medId),
    [medications, medId],
  );

  if (medications.length === 0) {
    return (
      <p className="text-sm opacity-70">
        Add medications to the catalog before recording stock in.
      </p>
    );
  }

  return (
    <form action={action} className="grid max-w-xl gap-4">
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Medication</span>
        <select
          name="medication_id"
          className="select select-bordered w-full"
          value={medId}
          onChange={(e) => setMedId(e.target.value)}
          required
        >
          {medications.map((m) => (
            <option key={m.id} value={m.id}>
              {medicationDisplayName(m)}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="text-sm opacity-70">
          Cost reference: ₱{Number(selected.unit_cost_price).toFixed(2)} / unit
        </p>
      ) : null}
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Lot / batch number</span>
        <input
          name="lot_number"
          required
          className="input input-bordered w-full"
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Expiration date</span>
        <input
          name="expiration_date"
          type="date"
          required
          className="input input-bordered w-full"
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Quantity purchased</span>
        <input
          name="quantity"
          type="number"
          min={1}
          step={1}
          required
          className="input input-bordered w-full"
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Supplier (optional)</span>
        <input name="supplier_name" className="input input-bordered w-full" />
      </label>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">
          Storage location (optional)
        </span>
        <input
          name="storage_location"
          className="input input-bordered w-full"
          placeholder="Shelf A-3"
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Notes</span>
        <textarea
          name="notes"
          className="textarea textarea-bordered w-full"
          rows={2}
        />
      </label>
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
        {pending ? "Saving…" : "Record stock in"}
      </button>
    </form>
  );
}
