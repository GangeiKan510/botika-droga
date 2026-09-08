"use client";

import { useActionState } from "react";

import {
  createMedication,
  updateMedication,
  type ActionState,
} from "@/app/actions/medications";
import type { Medication } from "@/lib/database.types";

const RISK_LEVELS = [
  "OTC",
  "Rx-Only",
  "Non-controlled",
  "Schedule II",
  "Schedule III",
  "Schedule IV",
  "Schedule V",
];

const initial: ActionState = {};

type Props = {
  medication?: Medication;
};

export function MedicationForm({ medication }: Props) {
  const action = medication
    ? updateMedication.bind(null, medication.id)
    : createMedication;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <Field
        label="SKU / System ID"
        name="sku"
        required
        defaultValue={medication?.sku}
      />
      <Field
        label="NDC / GTIN (optional)"
        name="ndc_gtin"
        defaultValue={medication?.ndc_gtin ?? ""}
      />
      <Field
        label="Generic name"
        name="generic_name"
        required
        defaultValue={medication?.generic_name}
      />
      <Field
        label="Brand name"
        name="brand_name"
        defaultValue={medication?.brand_name ?? ""}
      />
      <Field
        label="Category"
        name="category"
        defaultValue={medication?.category ?? ""}
        placeholder="Analgesics"
      />
      <Field
        label="Dosage form"
        name="dosage_form"
        defaultValue={medication?.dosage_form ?? ""}
        placeholder="Tablet"
      />
      <Field
        label="Strength / variant"
        name="strength"
        defaultValue={medication?.strength ?? ""}
        placeholder="500mg"
      />
      <Field
        label="Pack size"
        name="pack_size"
        defaultValue={medication?.pack_size ?? ""}
        placeholder="Box of 20"
      />
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Risk level</span>
        <select
          name="risk_level"
          className="select select-bordered w-full"
          defaultValue={medication?.risk_level ?? "OTC"}
        >
          {RISK_LEVELS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Storage requirements"
        name="storage_requirements"
        defaultValue={medication?.storage_requirements ?? ""}
        placeholder="Room Temperature"
      />
      <Field
        label="Unit cost price (₱)"
        name="unit_cost_price"
        type="number"
        step="0.01"
        min="0"
        required
        defaultValue={String(medication?.unit_cost_price ?? "0")}
      />
      <Field
        label="Unit selling price (₱)"
        name="unit_selling_price"
        type="number"
        step="0.01"
        min="0"
        required
        defaultValue={String(medication?.unit_selling_price ?? "0")}
      />
      <Field
        label="Reorder point (min stock)"
        name="reorder_point"
        type="number"
        min="0"
        required
        defaultValue={String(medication?.reorder_point ?? "0")}
      />
      <Field
        label="Max stock level"
        name="max_stock_level"
        type="number"
        min="0"
        defaultValue={
          medication?.max_stock_level != null
            ? String(medication.max_stock_level)
            : ""
        }
      />
      {state.error ? (
        <p className="text-error text-sm md:col-span-2" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="md:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending
            ? "Saving…"
            : medication
              ? "Update medication"
              : "Add medication"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="form-control w-full">
      <span className="label-text mb-1 font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        min={min}
        className="input input-bordered w-full"
      />
    </label>
  );
}
