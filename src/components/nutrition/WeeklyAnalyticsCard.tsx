"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
} from "lucide-react";
import {
  calculateWeeklyNutritionAnalytics,
  MacroTargets,
} from "@/lib/nutrition";
import { supabase } from "@/lib/supabase/client";

interface DayNutritionData {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  mealCount: number;
  isMarkedComplete?: boolean;
}

interface WeeklyAnalyticsCardProps {
  daysData: DayNutritionData[];
  targets: MacroTargets | null;
  realWeightTrendKgPerWk: number | null;
  hideAdherenceScoresDefault?: boolean;
  onOpenTargetSettings?: () => void;
}

export function WeeklyAnalyticsCard({
  daysData,
  targets,
  realWeightTrendKgPerWk,
  hideAdherenceScoresDefault = false,
  onOpenTargetSettings,
}: WeeklyAnalyticsCardProps) {
  const [hideScores, setHideScores] = useState(hideAdherenceScoresDefault);
  const [isUpdatingPref, setIsUpdatingPref] = useState(false);

  // Compute analytics using pure library engine
  const analytics = calculateWeeklyNutritionAnalytics(
    daysData,
    targets,
    realWeightTrendKgPerWk
  );

  const toggleHideScores = async () => {
    const nextVal = !hideScores;
    setHideScores(nextVal);
    setIsUpdatingPref(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ hide_adherence_scores: nextVal })
          .eq("id", user.id);
      }
    } catch (e) {
      console.warn("Failed to persist hide_adherence_scores pref:", e);
    } finally {
      setIsUpdatingPref(false);
    }
  };

  // If targets are unconfigured
  if (!analytics.hasTargets) {
    return (
      <div className="p-6 rounded-3xl bg-surface-container border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle font-mono">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-secondary-cyan" />
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Weekly Nutrition Analytics
            </span>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-border-subtle text-center space-y-3 font-mono">
          <AlertCircle className="w-8 h-8 mx-auto text-secondary-cyan/70" />
          <div className="text-sm font-bold text-on-surface">
            Set Your Targets
          </div>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Weekly adherence and caloric deficit projections require configured nutritional targets.
          </p>
          {onOpenTargetSettings && (
            <button
              onClick={onOpenTargetSettings}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary-cyan text-charcoal-dark hover:brightness-110 active:scale-95 transition-all"
            >
              Configure Targets
            </button>
          )}
        </div>
      </div>
    );
  }

  const targetCals = targets?.calories || 2000;
  const maxBarCals = Math.max(targetCals * 1.3, ...daysData.map((d) => d.calories), 1000);

  return (
    <div className="p-5 md:p-6 rounded-3xl bg-surface-container border border-border-subtle space-y-5">
      {/* Header & Score Visibility Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle font-mono">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-secondary-cyan" />
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Weekly Nutrition Analytics
          </span>
        </div>

        <button
          onClick={toggleHideScores}
          disabled={isUpdatingPref}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-high border border-border-subtle text-[11px] text-text-muted hover:text-on-surface transition-colors"
          title="Toggle numerical adherence score visibility"
        >
          {hideScores ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-text-muted" />
              <span>Scores Hidden</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-secondary-cyan" />
              <span>Show Scores</span>
            </>
          )}
        </button>
      </div>

      {/* Item 3: Headline Trend - Real Weight Trend Takes Precedence Beside Caloric Estimate */}
      <div className="p-4 rounded-2xl bg-surface-container-lowest border border-border-subtle space-y-2 font-mono">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-text-muted">
          <span>Weekly Trajectory</span>
          <span className="flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-secondary-cyan" />
            {analytics.headlineTrend.source === "weigh_in"
              ? "Real Scale Trend (Primary)"
              : "Caloric Intake Estimate"}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <div className="text-2xl font-extrabold text-on-surface">
            {analytics.headlineTrend.valueFormatted}
          </div>

          {/* Show caloric estimate beside the real trend if both exist */}
          {analytics.headlineTrend.source === "weigh_in" &&
            analytics.projectedWeightChangeKgPerWk !== null && (
              <div className="text-xs text-text-muted bg-surface-container-high px-2.5 py-1 rounded-lg border border-border-subtle">
                Caloric intake estimate:{" "}
                <span className="font-semibold text-on-surface">
                  {analytics.projectedWeightChangeKgPerWk > 0 ? "+" : ""}
                  {analytics.projectedWeightChangeKgPerWk.toFixed(2)} kg/wk
                </span>
              </div>
            )}
        </div>

        <p className="text-[11px] text-text-muted leading-relaxed">
          {analytics.headlineTrend.description}
        </p>
      </div>

      {/* Adherence Score & Qualifying Days Status */}
      {!analytics.hasEnoughDays ? (
        /* Honest Insufficient Logged Days State (Item 2) */
        <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-border-subtle space-y-2 font-mono text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-container border border-border-subtle text-xs font-bold text-text-muted">
            <AlertCircle className="w-3.5 h-3.5 text-rank-gold" />
            <span>Not enough logged days</span>
          </div>
          <p className="text-xs text-text-muted">
            Based on <span className="text-on-surface font-bold">{analytics.qualifyingDaysCount} of 7 logged days</span>.
            <br />
            Minimum 4 qualifying days (&ge; 40% target or 3+ meals) required to compute weekly adherence.
          </p>
        </div>
      ) : (
        /* Configured & Qualifying Adherence Telemetry */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
          {/* Adherence Score Box */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-border-subtle space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted uppercase tracking-wider text-[11px]">
                Macro Adherence
              </span>
              <span className="text-[11px] font-semibold text-primary-lime">
                {analytics.adherenceLabel}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              {hideScores ? (
                <div className="text-xl font-bold text-on-surface">
                  {analytics.adherenceLabel}
                </div>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-on-surface">
                    {analytics.adherenceScore}%
                  </span>
                  <span className="text-xs text-text-muted">adherence</span>
                </>
              )}
            </div>

            <div className="text-[11px] text-text-muted">
              Based on{" "}
              <span className="text-on-surface font-semibold">
                {analytics.qualifyingDaysCount} of 7 logged days
              </span>
            </div>
          </div>

          {/* Average Intake Box */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-border-subtle space-y-2">
            <div className="text-xs text-text-muted uppercase tracking-wider text-[11px]">
              Daily Averages (Qualifying)
            </div>
            <div className="text-xl font-bold text-on-surface">
              {analytics.averageCalories} kcal
            </div>
            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span className="text-primary-lime">
                {analytics.averageProteinG}g P
              </span>
              <span className="text-secondary-cyan">
                {analytics.averageCarbsG}g C
              </span>
              <span className="text-rank-gold">
                {analytics.averageFatsG}g F
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Intake Bar Chart vs Target Baseline */}
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>7-Day Daily Caloric Intake</span>
          <span className="text-[11px]">
            Target: <span className="text-secondary-cyan font-bold">{targetCals} kcal</span>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2 pt-4 pb-2 items-end min-h-[140px] bg-surface-container-lowest p-3 rounded-2xl border border-border-subtle">
          {daysData.map((d, idx) => {
            const dayScoreObj = analytics.dailyScores.find((s) => s.date === d.date);
            const isQualifying = dayScoreObj?.qualifying ?? false;
            const heightPercent = Math.min(100, Math.round((d.calories / maxBarCals) * 100));
            const dayName = new Date(d.date + "T12:00:00Z").toLocaleDateString(undefined, {
              weekday: "narrow",
            });

            return (
              <div key={d.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                {/* Bar Value Tooltip */}
                <span className="text-[9px] text-text-muted text-center font-bold">
                  {d.calories > 0 ? `${Math.round(d.calories / 100) * 100}` : "0"}
                </span>

                {/* Bar Container */}
                <div className="w-full max-w-[28px] h-20 bg-surface-container rounded-lg overflow-hidden flex flex-col justify-end relative">
                  {/* Target reference indicator */}
                  <div
                    className="absolute w-full border-b border-dashed border-secondary-cyan/40 z-10"
                    style={{ bottom: `${Math.round((targetCals / maxBarCals) * 100)}%` }}
                    title={`Target: ${targetCals} kcal`}
                  />

                  {/* Filled bar */}
                  <div
                    className={`w-full rounded-b-lg transition-all duration-300 ${
                      isQualifying
                        ? d.calories > targetCals * 1.15
                          ? "bg-rank-gold"
                          : "bg-secondary-cyan"
                        : "bg-surface-container-highest"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Day Label & Qualifying Indicator */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-on-surface uppercase">
                    {dayName}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isQualifying ? "bg-primary-lime" : "bg-text-muted/30"
                    }`}
                    title={isQualifying ? "Qualifying day" : "Partial / Unlogged day"}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-lime" />
              <span>Qualifying day</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-text-muted/30" />
              <span>Partial / Non-qualifying</span>
            </span>
          </div>
          <span className="italic">Min 4 qualifying days needed</span>
        </div>
      </div>
    </div>
  );
}
