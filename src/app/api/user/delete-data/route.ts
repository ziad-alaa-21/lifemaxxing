import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";
import { verifyDeletionReauth } from "@/lib/authConfig";

const TELEMETRY_TABLES = [
  "weight_logs",
  "sleep_logs",
  "meal_logs",
  "intake_logs",
  "saved_meals",
  "workout_sets",
  "workout_exercises",
  "workouts",
  "user_rank_history",
  "focus_sessions",
  "reading_logs",
  "reading_books",
  "screen_time_logs",
  "academic_schedule",
  "academic_topics",
  "grades",
  "mistakes",
  "deadlines",
  "subjects",
  "priorities",
  "tip_deliveries",
  "math_attempts",
  "math_sessions",
  "discipline_logs",
  "discipline_commitments",
  "mind_checkins",
  "ai_rate_limits",
];

export async function POST(request: NextRequest) {
  try {
    let supabase = await createServerSupabase();
    let authUser = (await supabase.auth.getUser()).data.user;

    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (!authUser && authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      const token = match ? match[1].trim() : authHeader.trim();
      const direct = createDirectClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        }
      );
      const res = await direct.auth.getUser(token);
      if (res.data?.user) {
        supabase = direct as unknown as typeof supabase;
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

    // 2. Re-authenticate by account identity provider (email/password vs Google OAuth), independent of AUTH_MODE
    const reauthCheck = await verifyDeletionReauth(
      authUser,
      password,
      async (emailToVerify, passwordToVerify) => {
        const authVerifyClient = createDirectClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
        );
        return authVerifyClient.auth.signInWithPassword({
          email: emailToVerify,
          password: passwordToVerify,
        });
      }
    );

    if (!reauthCheck.ok) {
      return NextResponse.json(
        {
          error: reauthCheck.error,
          ...(reauthCheck.requiresReauth ? { requiresReauth: true } : {}),
        },
        { status: reauthCheck.status || 403 }
      );
    }

    const userId = authUser.id;

    // 3. Try PostgreSQL RPC first
    const { error: rpcErr } = await supabase.rpc("delete_own_user_data");

    // 4. Ensure complete coverage for tables created in subsequent migrations (e.g. priorities, tip_deliveries)
    await Promise.all(
      TELEMETRY_TABLES.map(async (table) => {
        try {
          await supabase.from(table).delete().eq("user_id", userId);
        } catch {}
      })
    );

    if (rpcErr) {

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete data";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
