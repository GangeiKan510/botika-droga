"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

const settingsSchema = z.object({
  low_stock_threshold: z.coerce
    .number()
    .int()
    .min(0, "Low stock threshold must be 0 or greater"),
  near_expiry_days: z.coerce
    .number()
    .int()
    .min(1, "Near expiry must be at least 1 day")
    .max(3650, "Near expiry must be 3650 days or fewer"),
  full_name: z.string().trim().optional(),
});

export async function updateAlertSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = settingsSchema.safeParse({
    low_stock_threshold: formData.get("low_stock_threshold"),
    near_expiry_days: formData.get("near_expiry_days"),
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      low_stock_threshold: parsed.data.low_stock_threshold,
      near_expiry_days: parsed.data.near_expiry_days,
      full_name: parsed.data.full_name?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save settings." };
  }

  revalidatePath("/account/settings");
  revalidatePath("/alerts");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: "Settings saved." };
}
