import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { redirect } from "next/navigation";
import { provisionFirstLogin } from "@/lib/authProvisioning";

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

  // Fallback provisioning: ensures a user who confirmed their email but skipped
  // callback/confirm provisioning still receives idempotent first-login records on first load.
  try {
    await provisionFirstLogin(supabase, user);
  } catch (err) {
    console.error("Fallback first-login provisioning error in AppLayout:", err);
  }

  return (
    <AppShell userEmail={user.email ?? ""} userId={user.id}>
      {children}
    </AppShell>
  );
}
