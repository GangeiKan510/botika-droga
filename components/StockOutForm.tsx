"use client";

import { useActionState, useMemo, useState } from "react";

import { recordStockOut, type StockActionState } from "@/app/actions/stock";
import { medicationDisplayName, pickFefoBatch } from "@/lib/inventory";
import type { Batch, Medication } from "@/lib/database.types";

const initial: StockActionState = {};

export function StockOutForm({
  medications,
  batches,
}: {
  medications: Medication[];
  batches: Batch[];
}) {
  const [state, action, pending] = useActionState(recordStockOut, initial);
  const [medId, setMedId] = useState(medications[0]?.id ?? "");

  const availableBatches = useMemo(
    () =>
      batches
        .filter((b) => b.medication_id === medId && b.quantity_on_hand > 0)
        .slice()
        .sort((a, b) => a.expiration_date.localeCompare(b.expiration_date)),
    [batches, medId],
  );

  const fefo = useMemo(
    () => pickFefoBatch(availableBatches),
    [availableBatches],
  );

  const [batchId, setBatchId] = useState(fefo?.id ?? "");

  const selected = useMemo(
    () => medications.find((m) => m.id === medId),
    [medications, medId],
  );

  function onMedicationChange(nextId: string) {
    setMedId(nextId);
    const nextBatches = batches
      .filter((b) => b.medication_id === nextId && b.quantity_on_hand > 0)
      .slice()
      .sort((a, b) => a.expiration_date.localeCompare(b.expiration_date));
    setBatchId(pickFefoBatch(nextBatches)?.id ?? "");
  }

  if (medications.length === 0) {
    return (
      <p className="text-sm opacity-70">
        Add medications before recording stock out.
      </p>
    );
  }

  const selectValue =
    batchId && availableBatches.some((b) => b.id === batchId)
      ? batchId
      : (fefo?.id ?? "");

  return (
    <form action={action} className="grid max-w-xl gap-4">
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Medication</span>
        <select
          name="medication_id"
          className="select select-bordered w-full"
          value={medId}
          onChange={(e) => onMedicationChange(e.target.value)}
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
          Selling price: ₱{Number(selected.unit_selling_price).toFixed(2)} /
          unit (snapshotted on save)
        </p>
      ) : null}
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">
          Batch (FEFO suggested)
        </span>
        <select
          name="batch_id"
          className="select select-bordered w-full"
          value={selectValue}
          onChange={(e) => setBatchId(e.target.value)}
          disabled={availableBatches.length === 0}
        >
          {availableBatches.length === 0 ? (
            <option value="">No batches with stock</option>
          ) : (
            availableBatches.map((b) => (
              <option key={b.id} value={b.id}>
                Lot {b.lot_number} · exp {b.expiration_date} · QOH{" "}
                {b.quantity_on_hand}
                {fefo?.id === b.id ? " (FEFO)" : ""}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Quantity out</span>
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
        <span className="label-text mb-1 font-medium">
          Notes (cashier report ref)
        </span>
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
      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || availableBatches.length === 0}
      >
        {pending ? "Saving…" : "Record stock out"}
      </button>
    </form>
  );
}
