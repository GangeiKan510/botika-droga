import { redirect } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { getAlerts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, alertsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    getAlerts(),
  ]);

  return (
    <div className="min-h-screen">
      <AppNav
        ownerName={profile?.full_name ?? user.email}
        alertCount={alertsResult.alerts.length}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
