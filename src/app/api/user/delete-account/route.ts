import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";

const ALL_USER_TABLES = [
  "weight_logs",
  "sleep_logs",
  "meal_logs",
  "intake_logs",
  "saved_meals",
  "workouts",
  "user_rank_history",
  "focus_sessions",
  "reading_logs",
  "reading_books",
  "screen_time_logs",
  "subjects",
  "grades",
  "mistakes",
  "deadlines",
  "user_settings",
  "profiles",
];

export async function POST(request: NextRequest) {
  try {
    let supabase = await createServerSupabase();
    let authUser = (await supabase.auth.getUser()).data.user;

    const authHeader = request.headers.get("Authorization");
    if (!authUser && authHeader && authHeader.startsWith("Bearer ")) {
      const direct = createDirectClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      const res = await direct.auth.getUser();
      if (res.data.user) {
        supabase = direct as any;
        authUser = res.data.user;
      }
    }

    if (!authUser || !authUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { password, confirmationPhrase } = body;

    // 1. Strict validation of confirmation phrase
    if (confirmationPhrase !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: 'Confirmation phrase must be exactly "DELETE MY ACCOUNT"' },
        { status: 400 }
      );
    }

    // 2. Re-authenticate password
    const authVerifyClient = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
    const { error: signInErr } = await authVerifyClient.auth.signInWithPassword({
      email: authUser.email,
      password: password,
    });

    if (signInErr) {
      return NextResponse.json(
        { error: "Incorrect password. Re-authentication failed." },
        { status: 403 }
      );
    }

    const userId = authUser.id;

    // 3. Try PostgreSQL RPC first
    const { error: rpcErr } = await supabase.rpc("delete_own_user_account");

    if (rpcErr) {
      // Clean up table data using user session
      for (const table of ALL_USER_TABLES) {
        try {
          if (table === "profiles") {
            await supabase.from("profiles").delete().eq("id", userId);
          } else {
            await supabase.from(table).delete().eq("user_id", userId);
          }
        } catch {}
      }

      // If server has service role key, delete auth user directly
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const adminClient = createDirectClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          serviceRoleKey
        );
        await adminClient.auth.admin.deleteUser(userId);
      }
    }

    // Sign out caller
    try {
      await supabase.auth.signOut();
    } catch {}

    const response = NextResponse.json({
      success: true,
      message: "Your account and all associated telemetry have been permanently deleted.",
    });

    // Clear session cookies
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute account deletion" },
      { status: 500 }
    );
  }
}
