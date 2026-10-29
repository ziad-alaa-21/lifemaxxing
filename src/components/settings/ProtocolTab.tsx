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
    <form onSubmit={handleSaveProtocol} className="flex flex-col gap-6 font-sans">
      {/* 1. Daily physiological targets (Body) */}
      <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(40,50,120,0.06)] p-6 md:p-8 border border-[#e2e8f9] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] flex items-center justify-center text-[#0051d5]">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#151c28] tracking-tight">
                {locale === "ar" ? "الأهداف الفسيولوجية اليومية" : "Daily physiological targets"}
              </h2>
              <p className="text-xs text-[#45474b] mt-0.5">
                {locale === "ar"
                  ? "معدلات الوقود الأيضي وعتبات التعافي البدني المستمر"
                  : "Sustained metabolic fuel and recovery thresholds"}
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-[#dbe1ff] text-[#00174b] text-xs font-semibold">
            {locale === "ar" ? "الجسد" : "Body"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Calories */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="calories">
              {locale === "ar" ? "السعرات الحرارية" : "Calories"}
            </label>
            <div className="relative">
              <input
                id="calories"
                name="calories"
                type="number"
                placeholder={locale === "ar" ? "غير محدد" : "Not set"}
                value={targetCalories}
                onChange={(e) => setTargetCalories(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium">
                kcal
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar"
                ? "الهدف اليومي لاستهلاك السعرات (مثال: 2,400 kcal)"
                : "Daily calorie expenditure target (e.g. 2,400 kcal)"}
            </p>
          </div>

          {/* Protein */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="protein">
              {locale === "ar" ? "البروتين" : "Protein"}
            </label>
            <div className="relative">
              <input
                id="protein"
                name="protein"
                type="number"
                placeholder={locale === "ar" ? "غير محدد" : "Not set"}
                value={targetProtein}
                onChange={(e) => setTargetProtein(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium">
                g
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar"
                ? "هدف البروتين اليومي بالجرام (مثال: 150 g)"
                : "Daily protein intake target in grams (e.g. 150 g)"}
            </p>
          </div>

          {/* Water */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="water">
              {locale === "ar" ? "الماء" : "Water"}
            </label>
            <div className="relative">
              <input
                id="water"
                name="water"
                type="number"
                placeholder={locale === "ar" ? "غير محدد" : "Not set"}
                value={waterTarget}
                onChange={(e) => setWaterTarget(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-[#0051d5]" />
                <span>ml</span>
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar"
                ? "الهدف اليومي للسوائل بالمليلتر (مثال: 3000 ml)"
                : "Daily fluid intake target in ml (e.g. 3000 ml)"}
            </p>
          </div>

          {/* Sleep hours */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="sleep_hours">
              {locale === "ar" ? "ساعات النوم" : "Sleep hours"}
            </label>
            <div className="relative">
              <input
                id="sleep_hours"
                name="sleep_hours"
                type="number"
                step="0.1"
                placeholder={locale === "ar" ? "غير محدد" : "Not set"}
                value={targetSleepHours}
                onChange={(e) => setTargetSleepHours(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium">
                h
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar"
                ? "المدة الإجمالية المستهدفة للنوم ليلاً (مثال: 8.0 h)"
                : "Target duration of total sleep per night (e.g. 8.0 h)"}
            </p>
          </div>

          {/* Bedtime */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="bedtime">
              {locale === "ar" ? "موعد النوم" : "Bedtime"}
            </label>
            <div className="relative">
              <input
                id="bedtime"
                name="bedtime"
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <Moon className="w-4 h-4 text-[#45474b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar" ? "موعد النوم المجدول (مثال: 10:30 م)" : "Scheduled sleep time (e.g. 10:30 pm)"}
            </p>
          </div>

          {/* Wake time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="wake_time">
              {locale === "ar" ? "موعد الاستيقاظ" : "Wake time"}
            </label>
            <div className="relative">
              <input
                id="wake_time"
                name="wake_time"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <Clock className="w-4 h-4 text-[#45474b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar" ? "منبه الاستيقاظ المجدول (مثال: 6:30 ص)" : "Scheduled wake-up alarm (e.g. 6:30 am)"}
            </p>
          </div>

          {/* Carbs */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="carbs">
              {locale === "ar" ? "الكربوهيدرات" : "Carbohydrates"}
            </label>
            <div className="relative">
              <input
                id="carbs"
                name="carbs"
                type="number"
                placeholder={locale === "ar" ? "غير محدد" : "Not set"}
                value={targetCarbs}
                onChange={(e) => setTargetCarbs(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium">
                g
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar" ? "الهدف اليومي للكربوهيدرات بالجرام" : "Daily carbohydrates target in grams"}
            </p>
          </div>

          {/* Fats */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="fats">
              {locale === "ar" ? "الدهون الصحية" : "Healthy fats"}
            </label>
            <div className="relative">
              <input
                id="fats"
                name="fats"
                type="number"
                placeholder={locale === "ar" ? "غير محدد" : "Not set"}
                value={targetFats}
                onChange={(e) => setTargetFats(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium">
                g
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar" ? "الهدف اليومي للدهون بالجرام" : "Daily dietary fats target in grams"}
            </p>
          </div>

          {/* Caffeine Cutoff */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="caffeine">
              {locale === "ar" ? "إيقاف الكافيين (ساعات قبل النوم)" : "Caffeine Cutoff (h)"}
            </label>
            <div className="relative">
              <input
                id="caffeine"
                type="number"
                placeholder={locale === "ar" ? "مثال: 10" : "e.g. 10"}
                value={caffeineCutoff}
                onChange={(e) => setCaffeineCutoff(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium">
                h
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar" ? "ساعات التوقف عن الكافيين قبل موعد النوم" : "Hours before bedtime to halt caffeine intake"}
            </p>
          </div>

          {/* Screen Cutoff */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="screen">
              {locale === "ar" ? "إيقاف الشاشات (دقائق قبل النوم)" : "Screen Cutoff (min)"}
            </label>
            <div className="relative">
              <input
                id="screen"
                type="number"
                placeholder={locale === "ar" ? "مثال: 60" : "e.g. 60"}
                value={screenCutoff}
                onChange={(e) => setScreenCutoff(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45474b] text-xs font-medium">
                min
              </div>
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar" ? "دقائق التوقف عن الشاشات الرقمية قبل النوم" : "Minutes before bedtime to turn off screens"}
            </p>
          </div>
        </div>

        {/* Validation warnings */}
        {floorCheck.isBelowFloor && (
          <div className="p-4 bg-[#ffdad6]/40 border border-[#ffdad6] rounded-xl flex items-start gap-3 text-xs text-[#93000a]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {locale === "ar"
                ? `هدف السعرات (${calNum} سعرة) أقل من الحد الفسيولوجي الآمن الموصى به (${floorCheck.floor} سعرة). العجز الشديد والمستمر قد يسبب هدم الكتلة العضلية والإرهاق.`
                : floorCheck.warning}
            </div>
          </div>
        )}

        {macroCheck.isDiscrepant && (
          <div className="p-4 bg-[#eaddff]/40 border border-[#eaddff] rounded-xl flex items-start gap-3 text-xs text-[#25005a]">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {locale === "ar"
                ? `مجموع الماكروز (${macroCheck.macroCalories} سعرة) يختلف بمقدار (${macroCheck.diff} سعرة) عن هدف السعرات البالغ (${calNum} سعرة).`
                : macroCheck.warning}
            </div>
          </div>
        )}

        {sleepTolerance && sleepTolerance.isDiscrepant && (
          <div className="p-4 bg-[#ffdad6]/30 border border-[#ffdad6] rounded-xl flex items-center justify-between gap-3 text-xs text-[#93000a]">
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
              className="px-3 py-1.5 rounded-lg bg-[#000000] text-white font-semibold text-xs hover:bg-[#1a1c20] cursor-pointer whitespace-nowrap"
            >
              {locale === "ar" ? `ضبط على ${derivedSleep} س` : `Sync to ${derivedSleep}h`}
            </button>
          </div>
        )}
      </div>

      {/* 2. Biometrics & Physical Baseline (Profile) */}
      <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(40,50,120,0.06)] p-6 md:p-8 border border-[#e2e8f9] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e2e8f9] flex items-center justify-center text-[#151c28]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#151c28] tracking-tight">
                {locale === "ar" ? "القياسات الحيوية والأساس البدني" : "Biometrics & physical baseline"}
              </h2>
              <p className="text-xs text-[#45474b] mt-0.5">
                {locale === "ar"
                  ? "القياسات الأساسية لحساب السعرات والأهداف الوزنية"
                  : "Foundational measurements for calculating metabolic & weight objectives"}
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-[#e2e8f9] text-[#151c28] text-xs font-semibold">
            {locale === "ar" ? "الملف الشخصي" : "Profile"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sex */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]">
              {locale === "ar" ? "الجنس البيولوجي" : "Biological sex"}
            </label>
            <select
              value={sex || ""}
              onChange={(e) => setSex((e.target.value as SexOption) || null)}
              className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
            >
              <option value="">{locale === "ar" ? "غير محدد" : "Not set"}</option>
              <option value="male">{locale === "ar" ? "ذكر" : "Male"}</option>
              <option value="female">{locale === "ar" ? "أنثى" : "Female"}</option>
              <option value="prefer_not_to_say">
                {locale === "ar" ? "أفضل عدم التحديد (محايد)" : "Prefer not to say (Neutral)"}
              </option>
            </select>
          </div>

          {/* Birth Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]">
              {locale === "ar" ? "سنة الميلاد" : "Birth year"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "مثال: 1998" : "e.g. 1998"}
              value={birthYear ?? ""}
              onChange={(e) => setBirthYear(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
            />
          </div>

          {/* Height */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]">
              {locale === "ar" ? "الطول (سم)" : "Height (cm)"}
            </label>
            <input
              type="number"
              placeholder={locale === "ar" ? "مثال: 180" : "e.g. 180"}
              value={heightCm ?? ""}
              onChange={(e) => setHeightCm(e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
            />
          </div>

          {/* Goal Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]">
              {locale === "ar" ? "نوع الهدف البدني" : "Body goal type"}
            </label>
            <select
              value={goalType || ""}
              onChange={(e) => setGoalType((e.target.value as GoalType) || null)}
              className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
            >
              <option value="">{locale === "ar" ? "غير محدد" : "Not set"}</option>
              <option value="cut">{locale === "ar" ? "تنشيف (خسارة دهون)" : "Cut (Fat Loss)"}</option>
              <option value="bulk">{locale === "ar" ? "تضخيم (زيادة عضلية)" : "Bulk (Hypertrophy)"}</option>
              <option value="recomp">
                {locale === "ar" ? "إعادة تشكيل الجسم (بناء وحرق معاً)" : "Recomp (Body Recomposition)"}
              </option>
            </select>
          </div>

          {/* Target Weight */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]">
              {locale === "ar"
                ? `الوزن المستهدف (${unit === "lbs" ? "رطل" : "كجم"})`
                : `Target weight (${unit})`}
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
              className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
            />
          </div>

          {/* Weekly Pacing */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]">
              {locale === "ar" ? "وتيرة التقدم الأسبوعي" : "Weekly pacing"}
            </label>
            <select
              value={caloriePacing || ""}
              onChange={(e) => setCaloriePacing((e.target.value as CaloriePacing) || null)}
              className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
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

      {/* 3. Cognitive & academic objectives (Mind & School) */}
      <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(40,50,120,0.06)] p-6 md:p-8 border border-[#e2e8f9] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eaddff] flex items-center justify-center text-[#25005a]">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#151c28] tracking-tight">
                {locale === "ar" ? "الأهداف المعرفية والدراسية" : "Cognitive & academic objectives"}
              </h2>
              <p className="text-xs text-[#45474b] mt-0.5">
                {locale === "ar"
                  ? "عتبات ساعات العمل العميق المركز والتحصيل الأكاديمي"
                  : "Thresholds for concentrated deep work and study"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-[#eaddff] text-[#25005a] text-xs font-semibold">
              {locale === "ar" ? "العقل" : "Mind"}
            </span>
            <span className="px-3.5 py-1 rounded-full bg-[#e2e8f9] text-[#45474b] text-xs font-semibold">
              {locale === "ar" ? "الدراسة" : "School"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Daily focus goal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#151c28]" htmlFor="focus_goal">
              {locale === "ar" ? "هدف التركيز اليومي" : "Daily focus goal"}
            </label>
            <div className="relative">
              <input
                id="focus_goal"
                name="focus_goal"
                type="number"
                placeholder={locale === "ar" ? "غير محدد" : "Not set"}
                value={dailyFocusGoal}
                onChange={(e) => setDailyFocusGoal(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] placeholder:text-[#45474b]/60 text-sm focus:bg-white focus:ring-2 focus:ring-[#000000] outline-none transition-all border border-[#dce2f3]"
              />
              <Clock className="w-4 h-4 text-[#45474b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#45474b]">
              {locale === "ar"
                ? "المدة اليومية المستهدفة لجلسات العمل العميق بالدقائق (مثال: 120 دقيقة = ساعتان)"
                : "Target uninterrupted deep work duration per day in minutes (e.g. 120 min = 2h)"}
            </p>
          </div>
        </div>
      </div>

      {/* Save feedback notices */}
      {saveError && (
        <div className="p-4 bg-[#ffdad6]/40 border border-[#ffdad6] rounded-xl text-xs text-[#93000a]">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            {locale === "ar"
              ? "تم حفظ أهداف وبروتوكول النظام بنجاح!"
              : "System protocol and targets saved successfully!"}
          </span>
        </div>
      )}

      {/* 4. Action Panel & Status Notes */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#f0f3ff] p-5 rounded-[20px] border border-[#e2e8f9]">
        <div className="flex items-center gap-2 text-[#45474b]">
          <Info className="w-4 h-4 text-[#0051d5] shrink-0" />
          <p className="text-xs">
            {locale === "ar"
              ? "يمكن تعديل الأهداف والحدود التقديرية في أي وقت."
              : "Estimated targets can be edited at any time."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSex(initialProfile?.sex ?? null);
              setBirthYear(initialProfile?.birth_year ?? null);
              setHeightCm(initialProfile?.height_cm ?? null);
              setGoalType(initialProfile?.goal_type ?? null);
              setTargetWeightDisplay(
                initialProfile?.target_weight_kg
                  ? initialProfile.weight_unit === "lbs"
                    ? String(kgToLbs(initialProfile.target_weight_kg))
                    : String(initialProfile.target_weight_kg)
                  : ""
              );
              setTargetCalories(
                initialSettings?.target_calories ? String(initialSettings.target_calories) : ""
              );
              setTargetProtein(
                initialSettings?.target_protein_g ? String(initialSettings.target_protein_g) : ""
              );
              setTargetCarbs(
                initialSettings?.target_carbs_g ? String(initialSettings.target_carbs_g) : ""
              );
              setTargetFats(
                initialSettings?.target_fats_g ? String(initialSettings.target_fats_g) : ""
              );
              setWaterTarget(
                initialSettings?.water_target_ml ? String(initialSettings.water_target_ml) : ""
              );
              setCaloriePacing(initialSettings?.calorie_pacing ?? null);
              setBedtime(initialSettings?.bedtime_target ?? "");
              setWakeTime(initialSettings?.wake_time_target ?? "");
              setTargetSleepHours(
                initialSettings?.target_sleep_hours ? String(initialSettings.target_sleep_hours) : ""
              );
              setCaffeineCutoff(
                initialSettings?.caffeine_cutoff_hours ? String(initialSettings.caffeine_cutoff_hours) : ""
              );
              setScreenCutoff(
                initialSettings?.screen_cutoff_minutes ? String(initialSettings.screen_cutoff_minutes) : ""
              );
              setDailyFocusGoal(
                initialSettings?.daily_focus_goal_minutes
                  ? String(initialSettings.daily_focus_goal_minutes)
                  : ""
              );
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-[#151c28] border border-[#dce2f3] text-xs font-semibold shadow-xs hover:bg-[#e2e8f9] transition-colors cursor-pointer"
          >
            {locale === "ar" ? "إعادة تعيين" : "Reset"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#000000] text-white text-xs font-semibold shadow-xs hover:bg-[#1a1c20] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving
              ? locale === "ar"
                ? "جاري الحفظ..."
                : "Saving..."
              : locale === "ar"
              ? "حفظ الأهداف"
              : "Save targets"}
          </button>
        </div>
      </div>
    </form>
  );
}
