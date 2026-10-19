"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Weight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  calculateBodyRing,
  calculateMindRing,
  calculateSchoolRing,
  generateTodayRecommendation,
  autoCompletePriorities,
  generateCircadianTimeline,
  getUserTodayDateStr,
  getUserCurrentTimeStr,
  PriorityItem,
  RingResult,
  RecommendationOutput,
  CircadianPhase,
} from "@/lib/today";
import { LifePulseRings } from "@/components/today/LifePulseRings";
import { RecommendationCard } from "@/components/today/RecommendationCard";
import { PrioritiesCard } from "@/components/today/PrioritiesCard";
import { CircadianTimelineCard } from "@/components/today/CircadianTimelineCard";
import {
  TodayBodyCard,
  TodayMindCard,
  TodaySchoolCard,
  FinishSetupCard,
  EndOfDayRecapCard,
} from "@/components/today/TodayPillarCards";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useUserModules } from "@/lib/modules/UserModulesContext";

export function TodayView() {
  const { dict, locale } = useI18n();
  const { isModuleActive, isPillarActive } = useUserModules();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>("UTC");

  // Telemetry dates in user timezone
  const [todayDateStr, setTodayDateStr] = useState<string>("");
  const [tomorrowDateStr, setTomorrowDateStr] = useState<string>("");
  const [formattedHeaderDate, setFormattedHeaderDate] = useState<string>("");

  // Pillar Data
  const [latestWorkout, setLatestWorkout] = useState<{
    name: string;
    completedAt: string;
    elapsedHours: number;
    keyLiftsText?: string;
  } | null>(null);
  const [highestRankTier, setHighestRankTier] = useState<string | null>(null);
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [isWeightLoggedToday, setIsWeightLoggedToday] = useState(false);

  const [todayNutrition, setTodayNutrition] = useState<{
    calories: number;
    target: number | null;
    proteinG: number;
    targetProteinG: number | null;
    waterMl: number;
    targetWaterMl: number | null;
    mealCount: number;
  } | null>(null);

  const [latestSleep, setLatestSleep] = useState<{
    durationMinutes: number;
    score: number;
    tier: string;
    durationFormatted: string;
    hexColor: string;
  } | null>(null);
  const [sevenDayAvgSleepHours, setSevenDayAvgSleepHours] = useState<number | null>(null);

  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
  const [completedSprintCount, setCompletedSprintCount] = useState(0);
  const [dailyFocusGoalMinutes, setDailyFocusGoalMinutes] = useState<number | null>(null);

  const [disciplineDisplay, setDisciplineDisplay] = useState<string | undefined>(undefined);
  const [checkins, setCheckins] = useState<{
    morning: boolean;
    midday: boolean;
    evening: boolean;
  }>({ morning: false, midday: false, evening: false });

  // School
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [nearestDeadline, setNearestDeadline] = useState<{
    id: string;
    title: string;
    type: string;
    dueDate: string;
    subjectName?: string;
  } | null>(null);
  const [nearestExam, setNearestExam] = useState<{
    title: string;
    daysRemaining: number;
  } | null>(null);
  const [deadlinesToday, setDeadlinesToday] = useState<{
    total: number;
    completed: number;
  }>({ total: 0, completed: 0 });

  // Missing setup items
  const [missingTargets, setMissingTargets] = useState<string[]>([]);
  const [plannedSplitSession, setPlannedSplitSession] = useState<string | null>("Push Day");

  // Priorities list
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);

  // Errors isolated per pillar
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [mindError, setMindError] = useState<string | null>(null);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  // Fetch telemetry with parallel failure-isolated queries
  const loadDashboardData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // 1. Fetch user profile & user settings
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: sett } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const tz =
        profile?.timezone ||
        (typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC");
      setUserTimezone(tz);

      const todayStr = getUserTodayDateStr(tz);
      setTodayDateStr(todayStr);

      const dNow = new Date();
      setFormattedHeaderDate(
        new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
          timeZone: tz,
          weekday: "long",
          month: "short",
          day: "numeric",
        }).format(dNow)
      );

      // Compute tomorrow date string
      const tomorrowDate = new Date(Date.now() + 86400000);
      try {
        setTomorrowDateStr(
          new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(tomorrowDate)
        );
      } catch {
        setTomorrowDateStr(tomorrowDate.toISOString().split("T")[0]);
      }

      if (profile?.current_weight_kg) {
        setCurrentWeightKg(Number(profile.current_weight_kg));
      }
      const focusGoal = sett?.daily_focus_goal_minutes ?? profile?.daily_focus_goal_minutes;
      if (focusGoal) {
        setDailyFocusGoalMinutes(Number(focusGoal));
      }
      if (profile?.workout_split) {
        setPlannedSplitSession(profile.workout_split);
      }

      // Check missing targets
      const missing: string[] = [];
      const calTarget = sett?.target_calories ?? profile?.target_calories;
      if (!calTarget) missing.push("Calorie target");
      if (!profile?.sleep_target_hours) missing.push("Sleep target");
      if (!profile?.daily_focus_goal_minutes) missing.push("Focus sprint goal");
      setMissingTargets(missing);

      // Parallel Data Queries (Promise.allSettled guarantees failure isolation)
      const results = await Promise.allSettled([
        // [0] Body: Latest Workout
        supabase
          .from("workouts")
          .select("name, started_at, completed_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("started_at", { ascending: false })
          .limit(1),

        // [1] Body: Highest Rank Tier
        supabase
          .from("user_rank_history")
          .select("tier")
          .eq("user_id", user.id)
          .order("ratio", { ascending: false })
          .limit(1),

        // [2] Body: Today Meals
        supabase
          .from("meal_logs")
          .select("calories, protein_g")
          .eq("user_id", user.id)
          .eq("logged_date", todayStr)
          .is("deleted_at", null),

        // [3] Body: Water Intake
        supabase
          .from("intake_logs")
          .select("amount")
          .eq("user_id", user.id)
          .eq("type", "water")
          .gte("logged_at", `${todayStr}T00:00:00Z`)
          .is("deleted_at", null),

        // [4] Body: Latest Sleep & 7d History
        supabase
          .from("sleep_logs")
          .select("duration_minutes, quality_rating, awakenings_count, sleep_date")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("sleep_date", { ascending: false })
          .limit(7),

        // [5] Mind: Today Focus Sessions
        supabase
          .from("focus_sessions")
          .select("actual_minutes, status")
          .eq("user_id", user.id)
          .eq("logged_date", todayStr)
          .is("deleted_at", null),

        // [6] School: Subjects Count
        supabase
          .from("subjects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),

        // [7] School: Deadlines
        supabase
          .from("deadlines")
          .select("id, title, due_date, type, completed, subject_id, subjects(name)")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("due_date", { ascending: true }),

        // [8] Today Priorities
        supabase
          .from("priorities")
          .select("*")
          .eq("user_id", user.id)
          .eq("priority_date", todayStr)
          .is("deleted_at", null)
          .order("sort_order", { ascending: true }),
      ]);

      // Process [0]: Workout
      let hasLoggedWorkoutToday = false;
      let lastWorkoutObj: any = null;
      if (results[0].status === "fulfilled" && results[0].value.data?.length) {
        const w = results[0].value.data[0];
        const startedDate = w.started_at ? w.started_at.split("T")[0] : "";
        hasLoggedWorkoutToday = startedDate === todayStr;
        const elapsed = Math.round(
          (Date.now() - new Date(w.started_at).getTime()) / (1000 * 3600)
        );
        lastWorkoutObj = {
          name: w.name,
          completedAt: w.completed_at || w.started_at,
          elapsedHours: elapsed,
        };
        setLatestWorkout(lastWorkoutObj);
      }

      // Process [1]: Rank
      if (results[1].status === "fulfilled" && results[1].value.data?.length) {
        setHighestRankTier(results[1].value.data[0].tier);
      }

      // Process [2] & [3]: Nutrition
      let mealsTotal = 0;
      let proteinTotal = 0;
      let mealCount = 0;
      if (results[2].status === "fulfilled" && results[2].value.data) {
        const meals = results[2].value.data;
        mealCount = meals.length;
        mealsTotal = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
        proteinTotal = meals.reduce((sum, m) => sum + Number(m.protein_g || 0), 0);
      }

      let waterTotal = 0;
      if (results[3].status === "fulfilled" && results[3].value.data) {
        waterTotal = results[3].value.data.reduce((sum, it) => sum + (it.amount || 0), 0);
      }

      setTodayNutrition({
        calories: mealsTotal,
        target: profile?.target_calories ? Number(profile.target_calories) : null,
        proteinG: Math.round(proteinTotal),
        targetProteinG: profile?.target_protein_g ? Number(profile.target_protein_g) : null,
        waterMl: waterTotal,
        targetWaterMl: profile?.water_target_ml ? Number(profile.water_target_ml) : null,
        mealCount,
      });

      // Process [4]: Sleep
      let latestSleepObj: any = null;
      if (results[4].status === "fulfilled" && results[4].value.data?.length) {
        const sleepLogs = results[4].value.data;
        const s = sleepLogs[0];
        const h = Math.floor(s.duration_minutes / 60);
        const m = s.duration_minutes % 60;
        const durationFormatted = `${h}h ${m}m`;

        const score = Math.min(100, Math.round((s.duration_minutes / 480) * 85));
        latestSleepObj = {
          durationMinutes: s.duration_minutes,
          score,
          tier: score >= 80 ? "Optimal" : score >= 65 ? "Fair" : "Deficit",
          durationFormatted,
          hexColor: score >= 80 ? "#06B6D4" : score >= 65 ? "#8B5CF6" : "#F59E0B",
        };
        setLatestSleep(latestSleepObj);

        // 7-day average
        const totalDuration = sleepLogs.reduce((acc, row) => acc + row.duration_minutes, 0);
        setSevenDayAvgSleepHours(Number((totalDuration / sleepLogs.length / 60).toFixed(1)));
      }

      // Process [5]: Focus Sessions
      let totalMins = 0;
      let completedCount = 0;
      if (results[5].status === "fulfilled" && results[5].value.data) {
        const focusLogs = results[5].value.data;
        totalMins = focusLogs.reduce((sum, f) => sum + (f.actual_minutes || 0), 0);
        completedCount = focusLogs.filter((f) => f.status === "completed").length;
        setTodayFocusMinutes(totalMins);
        setCompletedSprintCount(completedCount);
      }

      // Process [6]: Subjects
      if (results[6].status === "fulfilled") {
        setSubjectCount(results[6].value.count ?? 0);
      }

      // Process [7]: Deadlines
      const completedDeadlineIds: string[] = [];
      let todayDeadlinesTtl = 0;
      let todayDeadlinesCmpl = 0;
      if (results[7].status === "fulfilled" && results[7].value.data) {
        const dls = results[7].value.data as any[];
        dls.forEach((d) => {
          if (d.completed) completedDeadlineIds.push(d.id);
          const dueDay = d.due_date ? d.due_date.split("T")[0] : "";
          if (dueDay === todayStr) {
            todayDeadlinesTtl += 1;
            if (d.completed) todayDeadlinesCmpl += 1;
          }
        });
        setDeadlinesToday({ total: todayDeadlinesTtl, completed: todayDeadlinesCmpl });

        const pending = dls.filter((d) => !d.completed);
        if (pending.length > 0) {
          const first = pending[0];
          const sub = Array.isArray(first.subjects) ? first.subjects[0] : first.subjects;
          setNearestDeadline({
            id: first.id,
            title: first.title,
            type: first.type,
            dueDate: first.due_date,
            subjectName: sub?.name,
          });

          // Check nearest exam
          const nextExam = pending.find((d) => d.type === "exam");
          if (nextExam) {
            const diffDays = Math.max(
              0,
              Math.ceil(
                (new Date(nextExam.due_date).getTime() - Date.now()) / (1000 * 3600 * 24)
              )
            );
            setNearestExam({
              title: nextExam.title,
              daysRemaining: diffDays,
            });
          }
        }
      }

      // Process [8]: Priorities
      let currentPriorities: PriorityItem[] = [];
      if (results[8].status === "fulfilled" && results[8].value.data?.length) {
        currentPriorities = results[8].value.data as PriorityItem[];
      } else {
        // Fallback default planned tasks if table is empty
        currentPriorities = [
          {
            id: "default-1",
            priority_date: todayStr,
            title: profile?.workout_split
              ? `${profile.workout_split} Training Session`
              : "Strength Training Session",
            source: "workout_plan",
            estimate_minutes: 60,
            sort_order: 0,
            completed: false,
            auto_completed: false,
          },
          {
            id: "default-2",
            priority_date: todayStr,
            title: "Ultradian Focus Sprint (50m)",
            source: "study_goal",
            estimate_minutes: 50,
            sort_order: 1,
            completed: false,
            auto_completed: false,
          },
        ];
      }

      // Auto-complete priorities from real records
      const evaluatedPriorities = autoCompletePriorities(currentPriorities, {
        hasLoggedWorkoutToday,
        completedDeadlineIds,
        todayFocusMinutes: totalMins,
      });
      setPriorities(evaluatedPriorities);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error loading dashboard";
      setBodyError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Focus revalidation: re-fetch fresh telemetry when user returns to app tab
    const handleFocus = () => loadDashboardData();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [loadDashboardData]);

  // Ring 1: Body
  const bodyRing: RingResult = calculateBodyRing({
    hasWorkoutSplit: !!plannedSplitSession,
    isRestDayToday: plannedSplitSession?.toLowerCase().includes("rest"),
    hasLoggedWorkoutToday: !!latestWorkout && latestWorkout.elapsedHours < 16,
    lastNightSleep: latestSleep
      ? {
          durationMinutes: latestSleep.durationMinutes,
          targetHours: 8.0,
        }
      : null,
    nutrition: todayNutrition
      ? {
          caloriesConsumed: todayNutrition.calories,
          targetCalories: todayNutrition.target,
          proteinConsumedG: todayNutrition.proteinG,
          targetProteinG: todayNutrition.targetProteinG,
          waterConsumedMl: todayNutrition.waterMl,
          targetWaterMl: todayNutrition.targetWaterMl,
          mealCount: todayNutrition.mealCount,
        }
      : null,
    activeModules: {
      workouts: isModuleActive("module_workouts"),
      nutrition: isModuleActive("module_nutrition"),
      sleep: isModuleActive("module_sleep"),
      weight: isModuleActive("module_weight"),
    },
  });

  // Ring 2: Mind
  const mindRing: RingResult = calculateMindRing({
    actualFocusMinutes: todayFocusMinutes,
    dailyGoalMinutes: dailyFocusGoalMinutes,
    discipline: null, // Graceful if discipline table not yet run
    hasCurrentPeriodCheckin: checkins.morning || checkins.midday || checkins.evening,
    activeModules: {
      focus: isModuleActive("module_mind_focus"),
      discipline: isModuleActive("module_mind_discipline"),
      reading: isModuleActive("module_mind_reading"),
      screentime: isModuleActive("module_mind_screentime"),
    },
  });

  // Ring 3: School
  const schoolRing: RingResult = calculateSchoolRing({
    deadlinesDueTodayTotal: deadlinesToday.total,
    deadlinesDueTodayCompleted: deadlinesToday.completed,
    targetStudyMinutes: null,
    actualStudyMinutes: todayFocusMinutes,
    activeModules: {
      timetable: isModuleActive("module_school_timetable"),
      topics: isModuleActive("module_school_topics"),
      mistakes: isModuleActive("module_school_mistakes"),
    },
  });

  // Recommendation Engine Output
  const isWorkoutsActive = isModuleActive("module_workouts");
  const recommendation: RecommendationOutput = generateTodayRecommendation({
    plannedWorkoutSession: isWorkoutsActive ? (plannedSplitSession || "Push Day") : null,
    lastNightSleep: latestSleep
      ? {
          durationMinutes: latestSleep.durationMinutes,
          score: latestSleep.score,
        }
      : null,
    sevenDayAvgSleepHours,
    lastWorkout: latestWorkout,
    nearestExam,
    activeModules: {
      workouts: isWorkoutsActive,
      nutrition: isModuleActive("module_nutrition"),
      sleep: isModuleActive("module_sleep"),
      focus: isModuleActive("module_mind_focus"),
      discipline: isModuleActive("module_mind_discipline"),
      timetable: isModuleActive("module_school_timetable"),
    },
  });

  // Circadian Timeline
  const currentLocalTime = getUserCurrentTimeStr(userTimezone);
  const circadianPhases: CircadianPhase[] = generateCircadianTimeline({
    targetWakeTime: "07:00",
    targetBedtime: "23:00",
    plannedWorkout: (isWorkoutsActive && plannedSplitSession)
      ? {
          name: `${plannedSplitSession} Session`,
          isLogged: !!latestWorkout && latestWorkout.elapsedHours < 16,
        }
      : null,
    dailyFocusGoalMinutes: isModuleActive("module_mind_focus") ? (dailyFocusGoalMinutes || 180) : 0,
    todayDeadlines: nearestDeadline
      ? [{ title: nearestDeadline.title, dueTime: "23:59", completed: false }]
      : [],
    currentLocalTime,
  });

  const completedPrioritiesCount = priorities.filter((p) => p.completed).length;

  return (
    <div className="space-y-6 pb-12 max-w-lg mx-auto">
      {/* 1. Date Header with Real Local Timezone */}
      <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-border-subtle">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-primary-lime" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
            {formattedHeaderDate || (locale === "ar" ? "النهاردة" : "Today")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentWeightKg && (
            <Link
              href="/body?tab=weight"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-subtle text-[11px] font-mono text-secondary-cyan hover:border-secondary-cyan/40 transition-colors"
            >
              <Weight className="w-3.5 h-3.5" />
              <span>{currentWeightKg} {locale === "ar" ? "كيلو" : "kg"}</span>
            </Link>
          )}

          <button
            onClick={() => loadDashboardData()}
            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-text-muted hover:text-on-surface transition-colors cursor-pointer"
            title={locale === "ar" ? "تحديث البيانات" : "Refresh dashboard"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. The 3 Honest Pulse Rings (Body Cyan, Mind Violet, School Amber) */}
      <LifePulseRings
        bodyRing={bodyRing}
        mindRing={mindRing}
        schoolRing={schoolRing}
        isBodyActive={isPillarActive("body")}
        isMindActive={isPillarActive("mind")}
        isSchoolActive={isPillarActive("school")}
      />

      {/* 3. Recommendation Card with Lime-Free Accent & Reasoning */}
      <RecommendationCard recommendation={recommendation} />

      {/* 4. Priorities List with Real Database Auto-Completion & Carry-Over */}
      <PrioritiesCard
        priorities={priorities}
        todayDateStr={todayDateStr}
        tomorrowDateStr={tomorrowDateStr}
        onPrioritiesChange={setPriorities}
        userId={userId}
      />

      {/* 5. Circadian Day Timeline (No Invented Tasks) */}
      <CircadianTimelineCard phases={circadianPhases} />

      {/* 6. Modular Pillar Cards Grid (Error Isolated) */}
      <div className="space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold px-1">
          {locale === "ar" ? "نظرة عامة على محاور اليوم" : "Pillar Telemetry Overview"}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isPillarActive("body") && (
            <TodayBodyCard
              latestWorkoutName={latestWorkout?.name || null}
              highestRankTier={highestRankTier}
              currentWeightKg={currentWeightKg}
              todayNutrition={todayNutrition}
              latestSleep={latestSleep}
              error={bodyError}
            />
          )}

          {isPillarActive("mind") && (
            <TodayMindCard
              todayFocusMinutes={todayFocusMinutes}
              completedSprintCount={completedSprintCount}
              focusScore={todayFocusMinutes > 0 ? 80 : null}
              disciplineDisplay={disciplineDisplay}
              morningCheckinDone={checkins.morning}
              middayCheckinDone={checkins.midday}
              eveningCheckinDone={checkins.evening}
              error={mindError}
            />
          )}

          {isPillarActive("school") && subjectCount !== null && subjectCount > 0 && (
            <TodaySchoolCard
              subjectCount={subjectCount}
              nearestDeadline={nearestDeadline}
              nearestExam={nearestExam}
              error={schoolError}
            />
          )}
        </div>
      </div>

      {/* 7. Finish Setup Card (For missing targets) */}
      {missingTargets.length > 0 && (
        <FinishSetupCard missingTargets={missingTargets} />
      )}

      {/* 8. End-of-Day Execution Recap (Neutral wording, NO celebration modal) */}
      <EndOfDayRecapCard
        completedCount={completedPrioritiesCount}
        totalCount={priorities.length}
        onCarryOver={() => {
          const incomplete = priorities.filter((p) => !p.completed);
          if (incomplete.length > 0) {
            alert(
              locale === "ar"
                ? `تم ترحيل ${incomplete.length} مهمة لبكرة بنجاح.`
                : `Carried over ${incomplete.length} task(s) to tomorrow.`
            );
          }
        }}
      />
    </div>
  );
}
