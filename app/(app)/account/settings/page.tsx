import { SettingsForm } from "@/components/SettingsForm";
import { createClient } from "@/lib/supabase/server";
import { getOwnerAlertSettings } from "@/lib/queries";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [settings, profile] = await Promise.all([
    getOwnerAlertSettings(),
    user
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-teal-900">Settings</h1>
        <p className="mt-1 text-teal-800/70">
          Adjust when StockRx should flag low stock and near-expiry lots.
        </p>
      </div>
      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <SettingsForm
          settings={settings}
          fullName={profile.data?.full_name ?? null}
        />
      </div>
    </div>
  );
}
