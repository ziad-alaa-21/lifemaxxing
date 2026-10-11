"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Dumbbell,
  Brain,
  GraduationCap,
  ArrowRight,
  Calendar,
  Weight,
  CheckCircle2,
  Moon,
  Utensils,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getTierColor } from "@/lib/strength";
import { calculateSleepScore } from "@/lib/sleep";
import { calculateFocusScore, FOCUS_PRESETS, FocusMode } from "@/lib/mind";

export function TodayView() {
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [latestWorkoutName, setLatestWorkoutName] = useState<string | null>(null);
  const [highestRankTier, setHighestRankTier] = useState<string | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [isWeightLoggedToday, setIsWeightLoggedToday] = useState(false);
  const [todayNutrition, setTodayNutrition] = useState<{
    calories: number;
    target: number | null;
  } | null>(null);
  const [todayFocus, setTodayFocus] = useState<{
    totalMinutes: number;
    completedCount: number;
    score: number | null;
    defaultMode: FocusMode;
  } | null>(null);
  const [latestSleep, setLatestSleep] = useState<{
    score: number;
    tier: string;
    durationFormatted: string;
    hexColor: string;
  } | null>(null);
  const [todayDate, setTodayDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setTodayDate(
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    );

    // Fetch real exercise count
    supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        setExerciseCount(count ?? 0);
      });

    // Fetch real subject count
    supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .then(({ count }) => {
        setSubjectCount(count ?? 0);
      });

    // Fetch user profile and telemetry
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Fetch workout
        supabase
          .from("workouts")
          .select("name, started_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setLatestWorkoutName(data[0].name);
            }
          });

        // Fetch rank
        supabase
          .from("user_rank_history")
          .select("tier, ratio")
          .eq("user_id", user.id)
          .order("ratio", { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setHighestRankTier(data[0].tier);
            }
          });

        // Fetch weight & nutrition targets from profiles & logs
        supabase
          .from("profiles")
          .select("current_weight_kg, target_calories, timezone, daily_focus_goal_minutes, default_focus_mode")
          .eq("id", user.id)
          .single()
          .then(({ data: profData }) => {
            const prof = profData as any;
            if (prof?.current_weight_kg) {
              setCurrentWeight(Number(prof.current_weight_kg));
            }
            const tz = prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            let todayStr = new Date().toISOString().split("T")[0];
            try {
              todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
            } catch {
              // fallback
            }
            supabase
              .from("meal_logs")
              .select("calories")
              .eq("user_id", user.id)
              .eq("logged_date", todayStr)
              .is("deleted_at", null)
              .then(({ data: mealData }) => {
                if (mealData) {
                  const totalCals = mealData.reduce((sum, m) => sum + (m.calories || 0), 0);
                  setTodayNutrition({
                    calories: totalCals,
                    target: prof?.target_calories ? Number(prof.target_calories) : null,
                  });
                }
              });

            // Fetch focus telemetry for today
            supabase
              .from("focus_sessions")
              .select("*")
              .eq("user_id", user.id)
              .eq("logged_date", todayStr)
              .is("deleted_at", null)
              .then(({ data: focusData }) => {
                if (focusData) {
                  const stats = calculateFocusScore(
                    focusData as any,
                    prof?.daily_focus_goal_minutes
                  );
                  setTodayFocus({
                    totalMinutes: stats.totalActualMinutes,
                    completedCount: stats.completedCount,
                    score: stats.score,
                    defaultMode: (prof?.default_focus_mode as FocusMode) || "sprint_50",
                  });
                }
              });
          });

        supabase
          .from("weight_logs")
          .select("logged_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("logged_at", { ascending: false })
          .limit(1)
          .then(({ data: logs }) => {
            if (logs && logs.length > 0) {
              const logDate = new Date(logs[0].logged_at).toDateString();
              const nowDate = new Date().toDateString();
              setIsWeightLoggedToday(logDate === nowDate);
            }
          });

        // Fetch sleep telemetry from sleep_logs (single source of truth)
        supabase
          .from("sleep_logs")
          .select("duration_minutes, quality_rating, awakenings_count, sleep_date")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("sleep_date", { ascending: false })
          .limit(1)
          .then(({ data: sleepLogs }) => {
            if (sleepLogs && sleepLogs.length > 0) {
              const latest = sleepLogs[0];
              const scoreObj = calculateSleepScore(
                latest.duration_minutes,
                8.0,
                latest.quality_rating,
                latest.awakenings_count
              );
              const h = Math.floor(latest.duration_minutes / 60);
              const m = latest.duration_minutes % 60;
              setLatestSleep({
                score: scoreObj.score,
                tier: scoreObj.tier,
                durationFormatted: `${h}h ${m}m`,
                hexColor: scoreObj.hexColor,
              });
            }
          });
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Real Date Header */}
      <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-border-subtle">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-primary-lime" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-on-surface">
            {todayDate || "Today"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentWeight && (
            <Link
              href="/body?tab=weight"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-subtle text-[11px] font-mono text-secondary-cyan hover:border-secondary-cyan/40 transition-colors"
            >
              <Weight className="w-3.5 h-3.5" />
              <span>{currentWeight} kg</span>
              {isWeightLoggedToday && (
                <CheckCircle2 className="w-3 h-3 text-status-success ml-0.5" />
              )}
            </Link>
          )}
          <span className="text-[11px] font-mono text-text-muted">
            Active Session
          </span>
        </div>
      </div>

      {/* 3 Domain Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Physical / Body */}
        <Link
          href="/body?tab=logger"
          className="bg-surface-container border border-border-subtle hover:border-secondary-cyan/40 rounded-2xl p-5 transition-all group relative overflow-hidden block"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan">
              <Dumbbell className="w-4 h-4" />
            </div>
            {highestRankTier ? (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getTierColor(
                  highestRankTier
                )}`}
              >
                {highestRankTier} Tier
              </span>
            ) : (
              <span className="font-mono text-xs text-secondary-cyan px-2 py-0.5 rounded-full bg-secondary-cyan/10">
                {exerciseCount !== null
                  ? `${exerciseCount} Exercises`
                  : "Checking..."}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Physical & Recovery Domain
            </div>
            <div className="text-lg font-bold font-mono text-on-surface group-hover:text-secondary-cyan transition-colors">
              Body & Sleep Telemetry
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
              {latestWorkoutName
                ? `Latest Session: ${latestWorkoutName}`
                : "Active workout session logger, bodyweight progression, and Epley 1RM ranks."}
            </p>

            {/* Recovery / Sleep Score Banner */}
            {latestSleep && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-border-subtle mt-2.5">
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-[#7DD3FC]" />
                  <span className="text-[11px] font-mono text-on-surface">Sleep Score</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-bold" style={{ color: latestSleep.hexColor }}>
                    {latestSleep.score}/100
                  </span>
                  <span className="text-text-muted">({latestSleep.tier}, {latestSleep.durationFormatted})</span>
                </div>
              </div>
            )}

            {/* Nutrition / Energy Banner */}
            {todayNutrition && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-border-subtle mt-2">
                <div className="flex items-center gap-2">
                  <Utensils className="w-3.5 h-3.5 text-secondary-cyan" />
                  <span className="text-[11px] font-mono text-on-surface">Energy In</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-bold text-on-surface">
                    {todayNutrition.calories} kcal
                  </span>
                  <span className="text-text-muted">
                    {todayNutrition.target ? `/ ${todayNutrition.target} kcal` : "(No target set)"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-secondary-cyan">
            <span>{currentWeight ? `Weight: ${currentWeight} kg` : "Log Bodyweight & Sleep"}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Cognitive / Mind */}
        <Link
          href="/mind"
          className="bg-surface-container border border-border-subtle hover:border-tertiary-purple/40 rounded-2xl p-5 transition-all group relative overflow-hidden block"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple">
              <Brain className="w-4 h-4" />
            </div>
            {todayFocus && todayFocus.totalMinutes > 0 ? (
              <span className="font-mono text-[10px] text-tertiary-purple px-2 py-0.5 rounded-full bg-tertiary-purple/15 border border-tertiary-purple/30 font-bold">
                {todayFocus.totalMinutes}m Focused
              </span>
            ) : (
              <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-surface-container-high">
                {FOCUS_PRESETS[todayFocus?.defaultMode || "sprint_50"]?.badge || "50 / 10"} Sprint
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Cognitive Domain
            </div>
            <div className="text-lg font-bold font-mono text-on-surface group-hover:text-tertiary-purple transition-colors">
              Focus Engine
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
              {todayFocus && todayFocus.totalMinutes > 0
                ? `${todayFocus.completedCount} completed focus sprint${todayFocus.completedCount === 1 ? '' : 's'} logged today.`
                : "0m focused today. Start your default focus sprint to track deep work telemetry."}
            </p>

            {/* Focus Score Banner */}
            {todayFocus && todayFocus.score !== null && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-border-subtle mt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-tertiary-purple" />
                  <span className="text-[11px] font-mono text-on-surface">Focus score (from your sessions)</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-bold text-tertiary-purple">
                    {todayFocus.score}/100
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-tertiary-purple">
            <span>Start {FOCUS_PRESETS[todayFocus?.defaultMode || "sprint_50"]?.name || "Focus Sprint"}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Academic / School */}
        <Link
          href="/school"
          className="bg-surface-container border border-border-subtle hover:border-primary-lime/40 rounded-2xl p-5 transition-all group relative overflow-hidden block"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs text-primary-lime px-2 py-0.5 rounded-full bg-primary-lime/10">
              {subjectCount !== null
                ? `${subjectCount} Subjects`
                : "Checking..."}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Academic Domain
            </div>
            <div className="text-lg font-bold font-mono text-on-surface group-hover:text-primary-lime transition-colors">
              School & Subjects
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-2">
              Subjects, grades (quiz / big exam), deadlines, and mistake log.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-primary-lime">
            <span>Open School</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Honest Daily Log Note */}
      <div className="p-5 bg-surface-container-low border border-border-subtle rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-primary-lime" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface font-semibold">
            Daily Log & Routine
          </h3>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Daily bodyweight tracking is live. Sleep telemetry forms and morning check-in will be added next.
        </p>
      </div>
    </div>
  );
}
