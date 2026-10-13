"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  Moon,
  Brain,
  Droplets,
  Scale,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  UserProfile,
  UserSettings,
  SexOption,
  GoalType,
  CaloriePacing,
  checkCalorieSafeFloor,
  checkMacroCalorieMismatch,
  deriveSleepDurationHours,
  checkSleepDurationTolerance,
  getPacingDetails,
  kgToLbs,
  lbsToKg,
  saveUserProfileRow,
  saveUserSettingsRow,
} from "@/lib/settings";
import { supabase } from "@/lib/supabase/client";

interface ProtocolTabProps {
  initialProfile: UserProfile | null;
  initialSettings: UserSettings | null;
  onRefresh: () => void;
}

export function ProtocolTab({
  initialProfile,
  initialSettings,
  onRefresh,
}: ProtocolTabProps) {
  // Biometrics & Goals (Profiles)
  const [sex, setSex] = useState<SexOption | null>(initialProfile?.sex ?? null);
  const [birthYear, setBirthYear] = useState<number | null>(initialProfile?.birth_year ?? null);
  const [heightCm, setHeightCm] = useState<number | null>(initialProfile?.height_cm ?? null);
  const [goalType, setGoalType] = useState<GoalType | null>(initialProfile?.goal_type ?? null);
  const [targetWeightDisplay, setTargetWeightDisplay] = useState<string>(
    initialProfile?.target_weight_kg
      ? initialProfile.weight_unit === "lbs"
        ? String(kgToLbs(initialProfile.target_weight_kg))
        : String(initialProfile.target_weight_kg)
      : ""
  );

  // Targets (UserSettings - All Nullable, NO invented defaults)
  const [targetCalories, setTargetCalories] = useState<string>(
    initialSettings?.target_calories ? String(initialSettings.target_calories) : ""
  );
  const [targetProtein, setTargetProtein] = useState<string>(
    initialSettings?.target_protein_g ? String(initialSettings.target_protein_g) : ""
  );
  const [targetCarbs, setTargetCarbs] = useState<string>(
    initialSettings?.target_carbs_g ? String(initialSettings.target_carbs_g) : ""
  );
  const [targetFats, setTargetFats] = useState<string>(
    initialSettings?.target_fats_g ? String(initialSettings.target_fats_g) : ""
  );
  const [waterTarget, setWaterTarget] = useState<string>(
    initialSettings?.water_target_ml ? String(initialSettings.water_target_ml) : ""
  );
  const [caloriePacing, setCaloriePacing] = useState<CaloriePacing | null>(
    initialSettings?.calorie_pacing ?? null
  );

  // Sleep Anchors & Duration
  const [bedtime, setBedtime] = useState<string>(initialSettings?.bedtime_target ?? "");
  const [wakeTime, setWakeTime] = useState<string>(initialSettings?.wake_time_target ?? "");
  const [targetSleepHours, setTargetSleepHours] = useState<string>(
    initialSettings?.target_sleep_hours ? String(initialSettings.target_sleep_hours) : ""
  );
  const [caffeineCutoff, setCaffeineCutoff] = useState<string>(
    initialSettings?.caffeine_cutoff_hours ? String(initialSettings.caffeine_cutoff_hours) : ""
  );
  const [screenCutoff, setScreenCutoff] = useState<string>(
    initialSettings?.screen_cutoff_minutes ? String(initialSettings.screen_cutoff_minutes) : ""
  );

  // Focus Goal
  const [dailyFocusGoal, setDailyFocusGoal] = useState<string>(
    initialSettings?.daily_focus_goal_minutes
      ? String(initialSettings.daily_focus_goal_minutes)
      : ""
  );

  // Feedback states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const unit = initialProfile?.weight_unit ?? "kg";

  // Real-time validations
  const calNum = targetCalories ? parseInt(targetCalories, 10) : null;
  const pNum = targetProtein ? parseInt(targetProtein, 10) : null;
  const cNum = targetCarbs ? parseInt(targetCarbs, 10) : null;
  const fNum = targetFats ? parseInt(targetFats, 10) : null;
  const sleepHoursNum = targetSleepHours ? parseFloat(targetSleepHours) : null;

  // 1. Safe calorie floor check (warning only, never silent clamp)
  const floorCheck = checkCalorieSafeFloor(calNum, sex);

  // 2. Macro-vs-Calorie consistency (warning only, non-blocking)
  const macroCheck = checkMacroCalorieMismatch(calNum, pNum, cNum, fNum);

  // 3. Circadian sleep derivation
  const derivedSleep = bedtime && wakeTime ? deriveSleepDurationHours(bedtime, wakeTime) : null;
  const sleepTolerance =
    sleepHoursNum !== null && derivedSleep !== null
      ? checkSleepDurationTolerance(sleepHoursNum, derivedSleep)
      : null;

  // Auto-sync sleep duration to derived value if user taps button
  const handleSyncDerivedSleep = () => {
    if (derivedSleep !== null) {
      setTargetSleepHours(String(derivedSleep));
    }
  };

  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialProfile?.id) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Calculate target weight in kg for internal storage
      let targetWeightKg: number | null = null;
      if (targetWeightDisplay.trim()) {
        const val = parseFloat(targetWeightDisplay);
        if (!isNaN(val) && val > 0) {
          targetWeightKg = unit === "lbs" ? lbsToKg(val) : val;
        }
      }

      // 2. Save Biometrics & Goals to profiles
      await saveUserProfileRow(supabase, initialProfile.id, {
        sex,
        birth_year: birthYear ? Number(birthYear) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        goal_type: goalType,
        target_weight_kg: targetWeightKg,
      });

      // 3. Save Targets to user_settings
      await saveUserSettingsRow(supabase, initialProfile.id, {
        target_calories: calNum,
        target_protein_g: pNum,
        target_carbs_g: cNum,
        target_fats_g: fNum,
        water_target_ml: waterTarget ? parseInt(waterTarget, 10) : null,
        calorie_pacing: caloriePacing,
        bedtime_target: bedtime || null,
        wake_time_target: wakeTime || null,
        target_sleep_hours: sleepHoursNum,
        caffeine_cutoff_hours: caffeineCutoff ? parseFloat(caffeineCutoff) : null,
        screen_cutoff_minutes: screenCutoff ? parseInt(screenCutoff, 10) : null,
        daily_focus_goal_minutes: dailyFocusGoal ? parseInt(dailyFocusGoal, 10) : null,
      });

      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save protocol targets.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveProtocol} className="space-y-6">
      {/* Biometrics & Goals Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <Scale className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Biometrics & Goals</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Biological Sex</label>
            <select
              value={sex || ""}
              onChange={(e) => setSex((e.target.value as SexOption) || null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer_not_to_say">Prefer not to say (Neutral)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Birth Year</label>
            <input
              type="number"
              placeholder="e.g. 1998"
              value={birthYear ?? ""}
              onChange={(e) => setBirthYear(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Height (cm)</label>
            <input
              type="number"
              placeholder="e.g. 180"
              value={heightCm ?? ""}
              onChange={(e) => setHeightCm(e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Goal Type</label>
            <select
              value={goalType || ""}
              onChange={(e) => setGoalType((e.target.value as GoalType) || null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="">Not set</option>
              <option value="cut">Cut (Fat Loss)</option>
              <option value="bulk">Bulk (Muscle Hypertrophy)</option>
              <option value="recomp">Recomp (Body Recomposition)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              Target Weight ({unit})
            </label>
            <input
              type="number"
              step="0.1"
              placeholder={unit === "lbs" ? "e.g. 165" : "e.g. 75"}
              value={targetWeightDisplay}
              onChange={(e) => setTargetWeightDisplay(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
            <p className="text-[10px] text-text-muted mt-1">Stored internally in kg.</p>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Weekly Pacing</label>
            <select
              value={caloriePacing || ""}
              onChange={(e) => setCaloriePacing((e.target.value as CaloriePacing) || null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="">Not set</option>
              <option value="conservative">Conservative (~0.25 kg/wk)</option>
              <option value="optimal">Optimal (~0.50 kg/wk)</option>
              <option value="aggressive">Aggressive (~0.85 kg/wk)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Nutrition Targets Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-core" />
            <h3 className="text-sm font-bold font-mono text-on-surface">Nutrition Targets</h3>
          </div>
          <span className="text-[10px] font-mono text-text-muted">Unset targets show &ldquo;Not set&rdquo;</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Calories (kcal)</label>
            <input
              type="number"
              placeholder="Not set"
              value={targetCalories}
              onChange={(e) => setTargetCalories(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Protein (g)</label>
            <input
              type="number"
              placeholder="Not set"
              value={targetProtein}
              onChange={(e) => setTargetProtein(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Carbs (g)</label>
            <input
              type="number"
              placeholder="Not set"
              value={targetCarbs}
              onChange={(e) => setTargetCarbs(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Fats (g)</label>
            <input
              type="number"
              placeholder="Not set"
              value={targetFats}
              onChange={(e) => setTargetFats(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Water (ml)</label>
            <input
              type="number"
              placeholder="Not set"
              value={waterTarget}
              onChange={(e) => setWaterTarget(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>
        </div>

        {/* Non-blocking Safe Floor Warning */}
        {floorCheck.isBelowFloor && floorCheck.warning && (
          <div className="p-3 bg-amber-core/10 border border-amber-core/20 rounded-xl flex items-start gap-2.5 text-xs font-mono text-amber-core">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{floorCheck.warning}</div>
          </div>
        )}

        {/* Non-blocking Macro-vs-Calorie Discrepancy Notice */}
        {macroCheck.isDiscrepant && macroCheck.warning && (
          <div className="p-3 bg-tertiary-purple/10 border border-tertiary-purple/20 rounded-xl flex items-start gap-2.5 text-xs font-mono text-tertiary-purple">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{macroCheck.warning}</div>
          </div>
        )}
      </div>

      {/* Circadian & Sleep Targets Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-tertiary-purple" />
            <h3 className="text-sm font-bold font-mono text-on-surface">Circadian & Sleep Anchors</h3>
          </div>
          {derivedSleep !== null && (
            <span className="text-[11px] font-mono text-primary-lime">
              Derived: {derivedSleep}h sleep
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Bedtime Anchor</label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Wake Time Anchor</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Target Sleep (Hours)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Not set"
              value={targetSleepHours}
              onChange={(e) => setTargetSleepHours(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Caffeine Cutoff (h)</label>
            <input
              type="number"
              placeholder="e.g. 10"
              value={caffeineCutoff}
              onChange={(e) => setCaffeineCutoff(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Screen Cutoff (min)</label>
            <input
              type="number"
              placeholder="e.g. 60"
              value={screenCutoff}
              onChange={(e) => setScreenCutoff(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>
        </div>

        {/* Tolerance Discrepancy Prompt */}
        {sleepTolerance && sleepTolerance.isDiscrepant && sleepTolerance.warning && (
          <div className="p-3 bg-amber-core/10 border border-amber-core/20 rounded-xl flex items-center justify-between gap-3 text-xs font-mono text-amber-core">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{sleepTolerance.warning}</span>
            </div>
            <button
              type="button"
              onClick={handleSyncDerivedSleep}
              className="px-2.5 py-1 rounded-lg bg-amber-core text-surface font-bold text-[11px] hover:bg-amber-core/90 cursor-pointer"
            >
              Sync to {derivedSleep}h
            </button>
          </div>
        )}
      </div>

      {/* Mind / Focus Target Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <Brain className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Cognitive Focus Target</h3>
        </div>

        <div className="max-w-xs">
          <label className="text-[11px] font-mono text-text-muted uppercase">
            Daily Focus Goal (Minutes)
          </label>
          <input
            type="number"
            placeholder="Not set"
            value={dailyFocusGoal}
            onChange={(e) => setDailyFocusGoal(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
          />
          <p className="text-[10px] text-text-muted mt-1">
            Powers the Mind Score volume progress ring.
          </p>
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl text-xs font-mono text-crimson-alert">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-success/10 border border-emerald-success/20 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Protocol targets saved successfully!</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-primary-lime text-surface text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.25)] cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Protocol"}
        </button>
      </div>
    </form>
  );
}
