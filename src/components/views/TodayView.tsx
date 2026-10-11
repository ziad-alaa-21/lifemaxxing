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
  Award,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getTierColor } from "@/lib/strength";

export function TodayView() {
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [latestWorkoutName, setLatestWorkoutName] = useState<string | null>(null);
  const [highestRankTier, setHighestRankTier] = useState<string | null>(null);
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

    // Fetch user's latest workout and best rank tier
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
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
        <span className="text-[11px] font-mono text-text-muted">
          Active Session
        </span>
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
              Physical Domain
            </div>
            <div className="text-lg font-bold font-mono text-on-surface group-hover:text-secondary-cyan transition-colors">
              Strength & Lifts
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-2">
              {latestWorkoutName
                ? `Latest Session: ${latestWorkoutName}`
                : "Active workout session logger, set tracking, and Epley 1RM PR rank standards."}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-secondary-cyan">
            <span>{latestWorkoutName ? "Start New Session" : "Open Workout Logger"}</span>
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
            <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-surface-container-high">
              Coming Soon
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Cognitive Domain
            </div>
            <div className="text-lg font-bold font-mono text-on-surface group-hover:text-tertiary-purple transition-colors">
              Mind Architecture
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-2">
              Sleep telemetry and focus session tracking will be wired in upcoming stages.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-tertiary-purple">
            <span>View Architecture</span>
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
          Daily telemetry logging, morning/evening check-in forms, and habit rings will be fully connected in the upcoming vertical slices.
        </p>
      </div>
    </div>
  );
}
