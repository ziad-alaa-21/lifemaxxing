import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/components/views/SettingsView";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings • Life",
  description: "Account details and system configuration",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsView userEmail={user.email ?? null} userId={user.id} />
  );
}
