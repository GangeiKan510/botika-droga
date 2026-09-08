"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type StockActionState = {
  error?: string;
  success?: string;
};

const stockInSchema = z.object({
  medication_id: z.string().uuid(),
  lot_number: z.string().trim().min(1, "Lot number is required"),
  expiration_date: z.string().min(1, "Expiration date is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  supplier_name: z.string().trim().optional(),
  storage_location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const stockOutSchema = z.object({
  medication_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  batch_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});

export async function recordStockIn(
  _prev: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const parsed = stockInSchema.safeParse({
    medication_id: formData.get("medication_id"),
    lot_number: formData.get("lot_number"),
    expiration_date: formData.get("expiration_date"),
    quantity: formData.get("quantity"),
    supplier_name: formData.get("supplier_name"),
    storage_location: formData.get("storage_location"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_stock_in", {
    p_medication_id: data.medication_id,
    p_lot_number: data.lot_number,
    p_expiration_date: data.expiration_date,
    p_quantity: data.quantity,
    p_supplier_name: data.supplier_name || null,
    p_storage_location: data.storage_location || null,
    p_notes: data.notes || null,
  });

  if (error) {
    return { error: error.message || "Could not record stock in." };
  }

  revalidatePath("/inventory");
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/stock/in");
  return { success: "Stock received and batch updated." };
}

export async function recordStockOut(
  _prev: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const parsed = stockOutSchema.safeParse({
    medication_id: formData.get("medication_id"),
    quantity: formData.get("quantity"),
    batch_id: formData.get("batch_id"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  const batchId = !data.batch_id || data.batch_id === "" ? null : data.batch_id;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_stock_out", {
    p_medication_id: data.medication_id,
    p_quantity: data.quantity,
    p_batch_id: batchId,
    p_notes: data.notes || null,
  });

  if (error) {
    return { error: error.message || "Could not record stock out." };
  }

  revalidatePath("/inventory");
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  revalidatePath("/stock/out");
  return { success: "Stock out recorded as a sale line." };
}
