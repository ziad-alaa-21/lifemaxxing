import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  calculateMathSessionScore,
  MathAttempt,
  MathDifficulty,
  MathMode,
  MathOperation,
} from "@/lib/mathTrainer";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in route handlers if response is already streaming
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required to submit math session" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      mode,
      operation,
      difficulty,
      started_at,
      ended_at,
      attempts,
    }: {
      mode: MathMode;
      operation: MathOperation;
      difficulty: MathDifficulty;
      started_at: string;
      ended_at: string;
      attempts: MathAttempt[];
    } = body;

    if (!mode || !operation || !difficulty || !started_at || !ended_at || !Array.isArray(attempts)) {
      return NextResponse.json(
        { error: "Invalid payload: Missing required session fields or attempts array" },
        { status: 400 }
      );
    }

    // 1. Server-side trust computation & validation
    const verification = calculateMathSessionScore(
      mode,
      operation,
      difficulty,
      started_at,
      ended_at,
      attempts
    );

    if (!verification.valid || !verification.summary) {
      return NextResponse.json(
        { error: verification.error || "Session verification failed" },
        { status: 400 }
      );
    }

    const s = verification.summary;

    // 2. Attempt atomic submission via submit_math_session RPC if available
    const { data: rpcSessionId, error: rpcErr } = await supabase.rpc(
      "submit_math_session",
      {
        p_mode: s.mode,
        p_operation: s.operation,
        p_difficulty: s.difficulty,
        p_started_at: s.started_at,
        p_ended_at: s.ended_at,
        p_attempts: attempts,
      }
    );

    if (!rpcErr && rpcSessionId) {
      return NextResponse.json({
        success: true,
        sessionId: rpcSessionId,
        summary: s,
      });
    }

    // Fallback: Direct table insertion with rollback integrity
    const { data: sessionData, error: sessionErr } = await supabase
      .from("math_sessions")
      .insert([
        {
          user_id: user.id,
          mode: s.mode,
          operation: s.operation,
          difficulty: s.difficulty,
          started_at: s.started_at,
          ended_at: s.ended_at,
          duration_seconds: s.duration_seconds,
          score: s.score,
          accuracy_pct: s.accuracy_pct,
          avg_response_time_ms: s.avg_response_time_ms,
          total_questions: s.total_questions,
          correct_answers: s.correct_answers,
        },
      ])
      .select("id")
      .single();

    if (sessionErr) {
      console.error("Database error saving math session:", sessionErr);
      return NextResponse.json(
        { error: `Database error: ${sessionErr.message}` },
        { status: 500 }
      );
    }

    const sessionId = sessionData.id;

    // 3. Insert attempts into math_attempts table
    const attemptsToInsert = attempts.map((a) => ({
      session_id: sessionId,
      user_id: user.id,
      operation: a.operation,
      question: a.question,
      answer: a.answer,
      user_answer: a.user_answer,
      correct: a.correct,
      response_time_ms: a.response_time_ms,
    }));

    const { error: attemptsErr } = await supabase
      .from("math_attempts")
      .insert(attemptsToInsert);

    if (attemptsErr) {
      console.error("Failed to record attempts breakdown:", attemptsErr.message);
      // Clean up orphaned session
      await supabase.from("math_sessions").delete().eq("id", sessionId);
      return NextResponse.json(
        { error: `Failed to record attempts breakdown: ${attemptsErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      summary: s,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
