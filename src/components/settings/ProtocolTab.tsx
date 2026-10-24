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
import { useI18n } from "@/lib/i18n/I18nContext";

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
  const { locale, dict } = useI18n();
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
      setSaveError(
        err.message ||
          (locale === "ar"
            ? "فشل حفظ أهداف البروتوكول."
            : "Failed to save protocol targets.")
      );
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
          <h3 className="text-sm font-bold font-mono text-on-surface">
            {locale === "ar" ? "القياسات الحيوية والأهداف" : "Biometrics & Goals"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "الجنس البيولوجي" : "Biological Sex"}
            </label>
            <select
              value={sex || ""}
              onChange={(e) => setSex((e.target.value as SexOption) || null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="">{locale === "ar" ? "غير محدد" : "Not set"}</option>
              <option value="male">{locale === "ar" ? "ذكر" : "Male"}</option>
              <option value="female">{locale === "ar" ? "أنثى" : "Female"}</option>
              <option value="prefer_not_to_say">
                {locale === "ar" ? "أفضل عدم التحديد (محايد)" : "Prefer not to say (Neutral)"}
              </option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "سنة الميلاد" : "Birth Year"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "مثال: 1998" : "e.g. 1998"}
              value={birthYear ?? ""}
              onChange={(e) => setBirthYear(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "الطول (سم)" : "Height (cm)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "مثال: 180" : "e.g. 180"}
              value={heightCm ?? ""}
              onChange={(e) => setHeightCm(e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "نوع الهدف" : "Goal Type"}
            </label>
            <select
              value={goalType || ""}
              onChange={(e) => setGoalType((e.target.value as GoalType) || null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="">{locale === "ar" ? "غير محدد" : "Not set"}</option>
              <option value="cut">
                {locale === "ar" ? "تنشيف (خسارة دهون)" : "Cut (Fat Loss)"}
              </option>
              <option value="bulk">
                {locale === "ar" ? "تضخيم (زيادة عضلية)" : "Bulk (Muscle Hypertrophy)"}
              </option>
              <option value="recomp">
                {locale === "ar" ? "إعادة تشكيل الجسم (بناء وحرق معاً)" : "Recomp (Body Recomposition)"}
              </option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar"
                ? `الوزن المستهدف (${unit === "lbs" ? "رطل" : "كجم"})`
                : `Target Weight (${unit})`}
            </label>
            <input
              type="number"
              step="0.1"
              placeholder={
                unit === "lbs"
                  ? locale === "ar"
                    ? "مثال: 165"
                    : "e.g. 165"
                  : locale === "ar"
                  ? "مثال: 75"
                  : "e.g. 75"
              }
              value={targetWeightDisplay}
              onChange={(e) => setTargetWeightDisplay(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
            <p className="text-[10px] text-text-muted mt-1">
              {locale === "ar" ? "يتم الحفظ داخلياً بوحدة الكيلوجرام." : "Stored internally in kg."}
            </p>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "وتيرة التقدم الأسبوعي" : "Weekly Pacing"}
            </label>
            <select
              value={caloriePacing || ""}
              onChange={(e) => setCaloriePacing((e.target.value as CaloriePacing) || null)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="">{locale === "ar" ? "غير محدد" : "Not set"}</option>
              <option value="conservative">
                {locale === "ar" ? "هادئ / محافظ (~0.25 كجم/أسبوع)" : "Conservative (~0.25 kg/wk)"}
              </option>
              <option value="optimal">
                {locale === "ar" ? "مثالي / متوازن (~0.50 كجم/أسبوع)" : "Optimal (~0.50 kg/wk)"}
              </option>
              <option value="aggressive">
                {locale === "ar" ? "سريع / مكثف (~0.85 كجم/أسبوع)" : "Aggressive (~0.85 kg/wk)"}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Nutrition Targets Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-core" />
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "أهداف التغذية والسعرات" : "Nutrition Targets"}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-text-muted">
            {locale === "ar" ? "غير المحدد يظهر كـ \"غير محدد\"" : "Unset targets show \"Not set\""}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "السعرات (سعرة)" : "Calories (kcal)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "غير محدد" : "Not set"}
              value={targetCalories}
              onChange={(e) => setTargetCalories(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "البروتين (جرام)" : "Protein (g)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "غير محدد" : "Not set"}
              value={targetProtein}
              onChange={(e) => setTargetProtein(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "الكربوهيدرات (جرام)" : "Carbs (g)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "غير محدد" : "Not set"}
              value={targetCarbs}
              onChange={(e) => setTargetCarbs(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "الدهون (جرام)" : "Fats (g)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "غير محدد" : "Not set"}
              value={targetFats}
              onChange={(e) => setTargetFats(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "الماء (مل)" : "Water (ml)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "غير محدد" : "Not set"}
              value={waterTarget}
              onChange={(e) => setWaterTarget(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>
        </div>

        {/* Non-blocking Safe Floor Warning */}
        {floorCheck.isBelowFloor && (
          <div className="p-3 bg-amber-core/10 border border-amber-core/20 rounded-xl flex items-start gap-2.5 text-xs font-mono text-amber-core">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {locale === "ar"
                ? `هدف السعرات (${calNum} سعرة) أقل من الحد الفسيولوجي الآمن الموصى به (${floorCheck.floor} سعرة). العجز الشديد والمستمر قد يسبب هدم الكتلة العضلية والإرهاق.`
                : floorCheck.warning}
            </div>
          </div>
        )}

        {/* Non-blocking Macro-vs-Calorie Discrepancy Notice */}
        {macroCheck.isDiscrepant && (
          <div className="p-3 bg-tertiary-purple/10 border border-tertiary-purple/20 rounded-xl flex items-start gap-2.5 text-xs font-mono text-tertiary-purple">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {locale === "ar"
                ? `مجموع الماكروز (${macroCheck.macroCalories} سعرة) يختلف بمقدار (${macroCheck.diff} سعرة) عن هدف السعرات البالغ (${calNum} سعرة).`
                : macroCheck.warning}
            </div>
          </div>
        )}
      </div>

      {/* Circadian & Sleep Targets Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-tertiary-purple" />
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "مواعيد النوم والساعة البيولوجية" : "Circadian & Sleep Anchors"}
            </h3>
          </div>
          {derivedSleep !== null && (
            <span className="text-[11px] font-mono text-primary-lime">
              {locale === "ar"
                ? `المحسوب: ${derivedSleep} س نوم`
                : `Derived: ${derivedSleep}h sleep`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "ميعاد النوم المستهدف" : "Bedtime Anchor"}
            </label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "ميعاد الاستيقاظ" : "Wake Time Anchor"}
            </label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "ساعات النوم المستهدفة" : "Target Sleep (Hours)"}
            </label>
            <input
              type="number"
              step="0.1"
              placeholder={locale === "ar" ? "غير محدد" : "Not set"}
              value={targetSleepHours}
              onChange={(e) => setTargetSleepHours(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "إيقاف الكافيين (ساعات قبل النوم)" : "Caffeine Cutoff (h)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "مثال: 10" : "e.g. 10"}
              value={caffeineCutoff}
              onChange={(e) => setCaffeineCutoff(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              {locale === "ar" ? "إيقاف الشاشات (دقائق قبل النوم)" : "Screen Cutoff (min)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "مثال: 60" : "e.g. 60"}
              value={screenCutoff}
              onChange={(e) => setScreenCutoff(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            />
          </div>
        </div>

        {/* Tolerance Discrepancy Prompt */}
        {sleepTolerance && sleepTolerance.isDiscrepant && (
          <div className="p-3 bg-amber-core/10 border border-amber-core/20 rounded-xl flex items-center justify-between gap-3 text-xs font-mono text-amber-core">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {locale === "ar"
                  ? `المدة المحسوبة من المواعيد هي ${derivedSleep?.toFixed(1)} س (تختلف عن الساعات اليدوية ${sleepHoursNum?.toFixed(1)} س بفارق ${sleepTolerance.diffMinutes} دقيقة).`
                  : sleepTolerance.warning}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncDerivedSleep}
              className="px-2.5 py-1 rounded-lg bg-amber-core text-on-primary font-bold text-[11px] hover:bg-amber-core/90 cursor-pointer"
            >
              {locale === "ar" ? `ضبط على ${derivedSleep} س` : `Sync to ${derivedSleep}h`}
            </button>
          </div>
        )}
      </div>

      {/* Mind / Focus Target Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <Brain className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            {locale === "ar" ? "هدف التركيز الذهني اليومي" : "Cognitive Focus Target"}
          </h3>
        </div>

        <div className="max-w-xs">
          <label className="text-[11px] font-mono text-text-muted uppercase">
            {locale === "ar" ? "هدف التركيز اليومي (بالدقائق)" : "Daily Focus Goal (Minutes)"}
          </label>
          <input
            type="number"
            placeholder={locale === "ar" ? "غير محدد" : "Not set"}
            value={dailyFocusGoal}
            onChange={(e) => setDailyFocusGoal(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
          />
          <p className="text-[10px] text-text-muted mt-1">
            {locale === "ar"
              ? "يغذي مؤشر حجم الإنجاز في حلقة تقييم العقل."
              : "Powers the Mind Score volume progress ring."}
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
          <span>
            {locale === "ar"
              ? "تم حفظ أهداف البروتوكول بنجاح!"
              : "Protocol targets saved successfully!"}
          </span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-primary-lime text-on-primary text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-lime-dim shadow-xs cursor-pointer disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed"
        >
          {saving
            ? locale === "ar"
              ? "جاري الحفظ..."
              : "Saving..."
            : locale === "ar"
            ? "حفظ البروتوكول"
            : "Save Protocol"}
        </button>
      </div>
    </form>
  );
}
