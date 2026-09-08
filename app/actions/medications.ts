"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
};

const medicationSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required"),
  generic_name: z.string().trim().min(1, "Generic name is required"),
  brand_name: z.string().trim().optional(),
  category: z.string().trim().optional(),
  dosage_form: z.string().trim().optional(),
  strength: z.string().trim().optional(),
  pack_size: z.string().trim().optional(),
  risk_level: z.string().trim().default("OTC"),
  storage_requirements: z.string().trim().optional(),
  unit_cost_price: z.coerce.number().min(0),
  unit_selling_price: z.coerce.number().min(0),
  reorder_point: z.coerce.number().int().min(0),
  max_stock_level: z.union([z.literal(""), z.coerce.number().int().min(0)]),
  ndc_gtin: z.string().trim().optional(),
});

function emptyToNull(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

export async function createMedication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = medicationSchema.safeParse({
    sku: formData.get("sku"),
    generic_name: formData.get("generic_name"),
    brand_name: formData.get("brand_name"),
    category: formData.get("category"),
    dosage_form: formData.get("dosage_form"),
    strength: formData.get("strength"),
    pack_size: formData.get("pack_size"),
    risk_level: formData.get("risk_level") || "OTC",
    storage_requirements: formData.get("storage_requirements"),
    unit_cost_price: formData.get("unit_cost_price"),
    unit_selling_price: formData.get("unit_selling_price"),
    reorder_point: formData.get("reorder_point"),
    max_stock_level: formData.get("max_stock_level"),
    ndc_gtin: formData.get("ndc_gtin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  const maxStock =
    data.max_stock_level === "" || data.max_stock_level === undefined
      ? null
      : Number(data.max_stock_level);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase.from("medications").insert({
    owner_id: user.id,
    sku: data.sku,
    generic_name: data.generic_name,
    brand_name: emptyToNull(data.brand_name),
    category: emptyToNull(data.category),
    dosage_form: emptyToNull(data.dosage_form),
    strength: emptyToNull(data.strength),
    pack_size: emptyToNull(data.pack_size),
    risk_level: data.risk_level,
    storage_requirements: emptyToNull(data.storage_requirements),
    unit_cost_price: data.unit_cost_price,
    unit_selling_price: data.unit_selling_price,
    reorder_point: data.reorder_point,
    max_stock_level: maxStock,
    ndc_gtin: emptyToNull(data.ndc_gtin),
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "A medication with this SKU already exists in your store.",
      };
    }
    return { error: "Could not save medication." };
  }

  revalidatePath("/medications");
  redirect("/medications");
}

export async function updateMedication(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = medicationSchema.safeParse({
    sku: formData.get("sku"),
    generic_name: formData.get("generic_name"),
    brand_name: formData.get("brand_name"),
    category: formData.get("category"),
    dosage_form: formData.get("dosage_form"),
    strength: formData.get("strength"),
    pack_size: formData.get("pack_size"),
    risk_level: formData.get("risk_level") || "OTC",
    storage_requirements: formData.get("storage_requirements"),
    unit_cost_price: formData.get("unit_cost_price"),
    unit_selling_price: formData.get("unit_selling_price"),
    reorder_point: formData.get("reorder_point"),
    max_stock_level: formData.get("max_stock_level"),
    ndc_gtin: formData.get("ndc_gtin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  const maxStock =
    data.max_stock_level === "" || data.max_stock_level === undefined
      ? null
      : Number(data.max_stock_level);

  const supabase = await createClient();
  const { error } = await supabase
    .from("medications")
    .update({
      sku: data.sku,
      generic_name: data.generic_name,
      brand_name: emptyToNull(data.brand_name),
      category: emptyToNull(data.category),
      dosage_form: emptyToNull(data.dosage_form),
      strength: emptyToNull(data.strength),
      pack_size: emptyToNull(data.pack_size),
      risk_level: data.risk_level,
      storage_requirements: emptyToNull(data.storage_requirements),
      unit_cost_price: data.unit_cost_price,
      unit_selling_price: data.unit_selling_price,
      reorder_point: data.reorder_point,
      max_stock_level: maxStock,
      ndc_gtin: emptyToNull(data.ndc_gtin),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "A medication with this SKU already exists in your store.",
      };
    }
    return { error: "Could not update medication." };
  }

  revalidatePath("/medications");
  revalidatePath(`/medications/${id}`);
  redirect("/medications");
}

export async function deactivateMedication(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("medications")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return { error: "Could not deactivate medication." };
  }

  revalidatePath("/medications");
  return { success: "Medication deactivated." };
}
