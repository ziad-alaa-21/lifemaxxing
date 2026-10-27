"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Flame,
  Plus,
  Sparkles,
  Settings2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Loader2,
  TrendingUp,
  Bookmark,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  MealLogEntry,
  IntakeLogEntry,
  getLocalDateString,
  GoalPhase,
  CaloriePacing,
  SavedMealItem,
  MealType,
} from "@/lib/nutrition";
import { collapseDailyWeights, calculateRateOfChange } from "@/lib/weight";
import { ConfirmFoodModal } from "./ConfirmFoodModal";
import { ManualFoodModal } from "./ManualFoodModal";
import { TargetSettingsModal } from "./TargetSettingsModal";
import { HydrationCard } from "./HydrationCard";
import { MealTimeline } from "./MealTimeline";
import { FrequentFoodsBar } from "./FrequentFoodsBar";
import { SavedMealsDrawer } from "./SavedMealsDrawer";
import { WeeklyAnalyticsCard } from "./WeeklyAnalyticsCard";
import { useI18n } from "@/lib/i18n/I18nContext";

export function NutritionDashboard() {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User Profile & Settings
  const [userProfile, setUserProfile] = useState<{
    weightKg: number | null;
    heightCm: number | null;
    birthYear: number | null;
    sex: "male" | "female" | null;
    goalType: GoalPhase | null;
    caloriePacing: CaloriePacing | null;
    targetCalories: number | null;
    targetProteinG: number | null;
    targetCarbsG: number | null;
    targetFatsG: number | null;
    waterTargetMl: number | null;
    timezone: string;
    targetBedtime: string;
    caffeineCutoffHours: number;
    hideAdherenceScores: boolean;
  }>({
    weightKg: null,
    heightCm: null,
    birthYear: null,
    sex: null,
    goalType: "cut",
    caloriePacing: "optimal",
    targetCalories: null,
    targetProteinG: null,
    targetCarbsG: null,
    targetFatsG: null,
    waterTargetMl: null,
    timezone: "UTC",
    targetBedtime: "23:00",
    caffeineCutoffHours: 10,
    hideAdherenceScores: false,
  });

  // Selected date (defaults to today in user's timezone)
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Telemetry data
  const [meals, setMeals] = useState<MealLogEntry[]>([]);
  const [intakeEntries, setIntakeEntries] = useState<IntakeLogEntry[]>([]);
  const [weeklyDaysData, setWeeklyDaysData] = useState<
    Array<{
      date: string;
      calories: number;
      proteinG: number;
      carbsG: number;
      fatsG: number;
      mealCount: number;
    }>
  >([]);
  const [realWeightTrend, setRealWeightTrend] = useState<number | null>(null);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavedMealsOpen, setIsSavedMealsOpen] = useState(false);
  const [prefillTemplate, setPrefillTemplate] = useState<{
    name: string;
    meal_type: MealType;
    items: SavedMealItem[];
  } | null>(null);

  // Fetch initial profile
  const fetchProfileAndData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: sett } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profErr && profErr.code !== "PGRST116") {
        console.error("Profile load warning:", profErr);
      }

      const tz = prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const initialDate = getLocalDateString(new Date(), tz);
      setSelectedDate(initialDate);

      const targetCal = sett?.target_calories ?? prof?.target_calories;
      const targetP = sett?.target_protein_g ?? prof?.target_protein_g;
      const targetC = sett?.target_carbs_g ?? prof?.target_carbs_g;
      const targetF = sett?.target_fats_g ?? prof?.target_fats_g;
      const targetWater = sett?.water_target_ml ?? prof?.water_target_ml;
      const pacing = sett?.calorie_pacing ?? prof?.calorie_pacing;

      setUserProfile({
        weightKg: prof?.current_weight_kg ? Number(prof.current_weight_kg) : null,
        heightCm: prof?.height_cm ? Number(prof.height_cm) : null,
        birthYear: prof?.birth_year ? Number(prof.birth_year) : null,
        sex: prof?.sex || null,
        goalType: prof?.goal_type || "cut",
        caloriePacing: pacing || "optimal",
        targetCalories: targetCal ? Number(targetCal) : null,
        targetProteinG: targetP ? Number(targetP) : null,
        targetCarbsG: targetC ? Number(targetC) : null,
        targetFatsG: targetF ? Number(targetF) : null,
        waterTargetMl: targetWater ? Number(targetWater) : null,
        timezone: tz,
        targetBedtime: sett?.bedtime_target || prof?.target_bedtime || "23:00",
        caffeineCutoffHours: sett?.caffeine_cutoff_hours ?? prof?.caffeine_cutoff_hours ?? 10,
        hideAdherenceScores: sett?.hide_adherence_scores ?? prof?.hide_adherence_scores ?? false,
      });

      // Load meals for initial date
      await loadDayLogs(user.id, initialDate, tz);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize nutrition telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDayLogs = async (userId: string, dateStr: string, tzParam?: string) => {
    const tz = tzParam || userProfile.timezone;
    try {
      // 1. Fetch meals for selected day
      const { data: mealData, error: mealErr } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("logged_date", dateStr)
        .is("deleted_at", null)
        .order("logged_at", { ascending: true });

      if (mealErr) {
        if (mealErr.message.includes("Could not find the table")) {
          setErrorMsg(
            "Database table 'meal_logs' not found. Please apply migration 004_nutrition_and_intake.sql."
          );
        } else {
          console.error("Meal fetch error:", mealErr);
        }
      } else {
        setMeals(mealData || []);
      }

      // 2. Fetch intake logs (all non-deleted for this day)
      const { data: intakeData, error: intakeErr } = await supabase
        .from("intake_logs")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("logged_at", { ascending: false });

      if (intakeErr) {
        if (intakeErr.message.includes("Could not find the table")) {
          setErrorMsg(
            "Database table 'intake_logs' not found. Please apply migration 004_nutrition_and_intake.sql."
          );
        } else {
          console.error("Intake fetch error:", intakeErr);
        }
      } else {
        const dayIntakes = (intakeData || []).filter((item: IntakeLogEntry) => {
          return getLocalDateString(item.logged_at, tz) === dateStr;
        });
        setIntakeEntries(dayIntakes);
      }

      // 3. Compute 7 calendar days ending at dateStr for WeeklyAnalyticsCard
      const days: string[] = [];
      const [y, m, d] = dateStr.split("-").map(Number);
      const refDate = new Date(Date.UTC(y, m - 1, d));
      for (let i = 6; i >= 0; i--) {
        const cur = new Date(refDate);
        cur.setUTCDate(cur.getUTCDate() - i);
        days.push(cur.toISOString().split("T")[0]);
      }
      const startDate = days[0];

      const { data: weekMeals } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_date", startDate)
        .lte("logged_date", dateStr)
        .is("deleted_at", null);

      const daysData = days.map((day) => {
        const dayMeals = (weekMeals || []).filter((item: MealLogEntry) => item.logged_date === day);
        return {
          date: day,
          calories: dayMeals.reduce((s, item) => s + (item.calories || 0), 0),
          proteinG: Math.round(dayMeals.reduce((s, item) => s + (item.protein_g || 0), 0) * 10) / 10,
          carbsG: Math.round(dayMeals.reduce((s, item) => s + (item.carbs_g || 0), 0) * 10) / 10,
          fatsG: Math.round(dayMeals.reduce((s, item) => s + (item.fats_g || 0), 0) * 10) / 10,
          mealCount: dayMeals.length,
        };
      });
      setWeeklyDaysData(daysData);

      // 4. Fetch weight_logs to compute Stage 4 OLS slope for real trend headline (Item 3)
      const { data: weightLogs } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("logged_at", { ascending: true });

      if (weightLogs && weightLogs.length >= 4) {
        const collapsed = collapseDailyWeights(weightLogs);
        const roc = calculateRateOfChange(collapsed, 14);
        setRealWeightTrend(roc.rateKgPerWeek);
      } else {
        setRealWeightTrend(null);
      }
    } catch (err: any) {
      console.error("Logs load error:", err);
    }
  };

  useEffect(() => {
    fetchProfileAndData();
  }, [fetchProfileAndData]);

  const handleRefresh = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && selectedDate) {
      await loadDayLogs(user.id, selectedDate);
    }
  };

  // Consumed sums
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = Math.round(meals.reduce((sum, m) => sum + (m.protein_g || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0) * 10) / 10;
  const totalFats = Math.round(meals.reduce((sum, m) => sum + (m.fats_g || 0), 0) * 10) / 10;

  // Intakes sums
  const totalWater = intakeEntries
    .filter((i) => i.type === "water")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalCaffeine = intakeEntries
    .filter((i) => i.type === "caffeine")
    .reduce((sum, i) => sum + i.amount, 0);

  // Targets
  const targetCals = userProfile.targetCalories;
  const targetProt = userProfile.targetProteinG;
  const targetCarbs = userProfile.targetCarbsG;
  const targetFats = userProfile.targetFatsG;

  const caloriesRemaining = targetCals !== null ? targetCals - totalCalories : null;
  const calPercent = targetCals && targetCals > 0 ? Math.min(100, Math.round((totalCalories / targetCals) * 100)) : 0;
  const protPercent = targetProt && targetProt > 0 ? Math.min(100, Math.round((totalProtein / targetProt) * 100)) : 0;
  const carbsPercent = targetCarbs && targetCarbs > 0 ? Math.min(100, Math.round((totalCarbs / targetCarbs) * 100)) : 0;
  const fatsPercent = targetFats && targetFats > 0 ? Math.min(100, Math.round((totalFats / targetFats) * 100)) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-secondary-cyan" />
        <span className="text-xs text-text-muted">
          {locale === "ar" ? "بنحمّل محرك التغذية..." : "Loading Nutrition Engine..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-status-danger/10 border border-status-danger/30 flex items-start gap-3 text-xs font-mono text-status-danger">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">{locale === "ar" ? "تنبيه النظام" : "Schema Notice"}</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Date Header & Target Settings Button */}
      <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-border-subtle">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-secondary-cyan" />
          <span className="text-xs font-mono font-bold text-on-surface">
            {selectedDate === getLocalDateString(new Date(), userProfile.timezone)
              ? (locale === "ar" ? `النهاردة (${selectedDate})` : `Today (${selectedDate})`)
              : selectedDate}
          </span>
        </div>

        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-text-muted hover:text-on-surface hover:border-secondary-cyan transition-colors cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5 text-secondary-cyan" />
          <span>{locale === "ar" ? "إعدادات الأهداف" : "Target Settings"}</span>
        </button>
      </div>

      {/* Energy & Macro Gauge Card */}
      {targetCals === null ? (
        /* Honest Unconfigured State */
        <div className="stitch-card p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan">
            <Flame className="w-6 h-6" />
          </div>
          <div className="font-mono text-base font-bold text-on-surface">
            {locale === "ar" ? "حدد أهداف التغذية الخاصة بيك" : "Set Your Nutritional Targets"}
          </div>
          <p className="font-mono text-xs text-text-muted max-w-md mx-auto">
            {locale === "ar"
              ? "مفيش أرقام افتراضية بنخترعها. دخل وزنك وطولك وسنة ميلادك لحساب أهداف تقديرية، أو حط أهداف مخصصة بنفسك."
              : "No default numbers are invented. Provide your bodyweight, height, and birth year to compute estimated targets, or set custom targets manually."}
          </p>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-secondary-cyan text-on-primary shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            {locale === "ar" ? "حدد أهدافك دلوقتي" : "Configure Targets Now"}
          </button>
        </div>
      ) : (
        /* Configured Energy Telemetry */
        <div className="stitch-card p-6 space-y-6">
          <div className="flex items-start justify-between font-mono">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted">
                {locale === "ar" ? "توازن السعرات" : "Energy Balance"}
              </div>
              <div className="text-3xl font-extrabold text-on-surface mt-1 flex items-baseline gap-2">
                <span>{totalCalories}</span>
                <span className="text-sm font-medium text-text-muted">
                  / {targetCals} {locale === "ar" ? "سعرة" : "kcal"}
                </span>
              </div>
            </div>

            <div className="text-end">
              <div className="text-[11px] uppercase tracking-wider text-text-muted">
                {caloriesRemaining !== null && caloriesRemaining >= 0
                  ? locale === "ar"
                    ? "المتبقي"
                    : "Remaining"
                  : locale === "ar"
                  ? "تجاوزت الهدف"
                  : "Over Budget"}
              </div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  caloriesRemaining !== null && caloriesRemaining >= 0
                    ? "text-secondary-cyan"
                    : "text-status-danger"
                }`}
              >
                {caloriesRemaining !== null ? Math.abs(caloriesRemaining) : 0} {locale === "ar" ? "سعرة" : "kcal"}
              </div>
            </div>
          </div>

          {/* Calorie Progress Bar */}
          <div className="w-full h-3 bg-surface-container-lowest rounded-full overflow-hidden border border-border-subtle">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                caloriesRemaining !== null && caloriesRemaining < 0
                  ? "bg-[#F87171]"
                  : "bg-secondary-cyan"
              }`}
              style={{ width: `${Math.min(100, calPercent)}%` }}
            />
          </div>

          {/* 3 Macro Gauges */}
          <div className="grid grid-cols-3 gap-3 font-mono pt-2">
            {/* Protein */}
            <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-ink font-bold">
                  {locale === "ar" ? "بروتين" : "Protein"}
                </span>
                <span className="text-text-muted text-[11px]">
                  {targetProt ? `${totalProtein}/${targetProt}g` : `${totalProtein}g`}
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-ink rounded-full transition-all duration-500"
                  style={{ width: `${protPercent}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-cyan font-bold">
                  {locale === "ar" ? "كارب" : "Carbs"}
                </span>
                <span className="text-text-muted text-[11px]">
                  {targetCarbs ? `${totalCarbs}/${targetCarbs}g` : `${totalCarbs}g`}
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary-cyan rounded-full transition-all duration-500"
                  style={{ width: `${carbsPercent}%` }}
                />
              </div>
            </div>

            {/* Fats */}
            <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rank-gold font-bold">
                  {locale === "ar" ? "دهون" : "Fats"}
                </span>
                <span className="text-text-muted text-[11px]">
                  {targetFats ? `${totalFats}/${targetFats}g` : `${totalFats}g`}
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-rank-gold rounded-full transition-all duration-500"
                  style={{ width: `${fatsPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Frequent Foods 1-Tap Bar (Item 7) */}
      <FrequentFoodsBar
        onFoodLogged={handleRefresh}
        userTimezone={userProfile.timezone}
      />

      {/* Action Bar */}
      <div className="space-y-2.5 font-mono text-xs">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-primary-ink text-on-primary font-bold shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{locale === "ar" ? "تحليل وجبة بالذكاء الاصطناعي" : "Parse Meal with AI"}</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-surface-container border border-border-subtle text-on-surface font-semibold hover:border-secondary-cyan hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-secondary-cyan" />
            <span>{locale === "ar" ? "+ تسجيل أكل يدوي" : "+ Manual Food Entry"}</span>
          </button>
        </div>

        <button
          onClick={() => {
            setPrefillTemplate(null);
            setIsSavedMealsOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-surface-container border border-border-subtle text-on-surface font-semibold hover:border-secondary-cyan hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer"
        >
          <Bookmark className="w-4 h-4 text-secondary-cyan" />
          <span>{locale === "ar" ? "الوجبات المحفوظة والقوالب" : "Saved Meals & Templates"}</span>
        </button>
      </div>

      {/* Weekly Nutrition Analytics & Projections (Items 2, 3, 5) */}
      <WeeklyAnalyticsCard
        daysData={weeklyDaysData}
        targets={
          userProfile.targetCalories && userProfile.targetProteinG
            ? {
                calories: userProfile.targetCalories,
                proteinGrams: userProfile.targetProteinG,
                carbsGrams: userProfile.targetCarbsG || 0,
                fatsGrams: userProfile.targetFatsG || 0,
                waterTargetMl: userProfile.waterTargetMl || 3000,
                isEstimated: false,
                calorieFloorApplied: false,
              }
            : null
        }
        realWeightTrendKgPerWk={realWeightTrend}
        hideAdherenceScoresDefault={userProfile.hideAdherenceScores}
        onOpenTargetSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Hydration & Caffeine Telemetry Section */}
      <HydrationCard
        waterToday={totalWater}
        waterTarget={userProfile.waterTargetMl}
        caffeineToday={totalCaffeine}
        intakeEntries={intakeEntries}
        targetBedtime={userProfile.targetBedtime}
        caffeineCutoffHours={userProfile.caffeineCutoffHours}
        userTimezone={userProfile.timezone}
        onIntakeUpdated={handleRefresh}
      />

      {/* Meals Timeline with Protein per Meal guideline & Template saving (Item 4 & 6) */}
      <MealTimeline
        meals={meals}
        onMealsUpdated={handleRefresh}
        userTimezone={userProfile.timezone}
        currentWeightKg={userProfile.weightKg}
        onSaveAsTemplate={(mealType, items) => {
          setPrefillTemplate({
            name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Template`,
            meal_type: mealType,
            items: items.map((m) => ({
              food_name: m.food_name,
              quantity: m.quantity,
              unit: m.unit,
              calories: m.calories,
              protein_g: m.protein_g,
              carbs_g: m.carbs_g,
              fats_g: m.fats_g,
              source: m.source || "manual",
            })),
          });
          setIsSavedMealsOpen(true);
        }}
      />

      {/* Modals & Drawers */}
      <SavedMealsDrawer
        isOpen={isSavedMealsOpen}
        onClose={() => {
          setIsSavedMealsOpen(false);
          setPrefillTemplate(null);
        }}
        onMealLogged={handleRefresh}
        userTimezone={userProfile.timezone}
        prefillTemplate={prefillTemplate}
      />

      {/* Modals */}
      <ConfirmFoodModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onLogged={handleRefresh}
        userTimezone={userProfile.timezone}
      />

      <ManualFoodModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onLogged={handleRefresh}
        userTimezone={userProfile.timezone}
      />

      <TargetSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentProfile={userProfile}
        onSaved={fetchProfileAndData}
      />
    </div>
  );
}
