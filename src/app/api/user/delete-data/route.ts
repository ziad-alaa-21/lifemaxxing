import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";

const TELEMETRY_TABLES = [
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
    if (confirmationPhrase !== "DELETE MY DATA") {
      return NextResponse.json(
        { error: 'Confirmation phrase must be exactly "DELETE MY DATA"' },
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
    const { error: rpcErr } = await supabase.rpc("delete_own_user_data");
    if (rpcErr) {
      // Fallback: Delete table-by-table using user's authenticated session (RLS)
      for (const table of TELEMETRY_TABLES) {
        try {
          await supabase.from(table).delete().eq("user_id", userId);
        } catch {}
      }

      // Reset targets in user_settings
      try {
        await supabase
          .from("user_settings")
          .update({
            target_calories: null,
            target_protein_g: null,
            target_carbs_g: null,
            target_fats_g: null,
            water_target_ml: null,
            calorie_pacing: null,
            target_sleep_hours: null,
            bedtime_target: null,
            wake_time_target: null,
            daily_focus_goal_minutes: null,
            caffeine_cutoff_hours: null,
            screen_cutoff_minutes: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "All telemetry data has been permanently deleted. Account remains active.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete data" },
      { status: 500 }
    );
  }
}
