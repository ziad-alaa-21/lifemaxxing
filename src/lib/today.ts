/**
 * Stage 10: Today Command Center Engine
 * Deterministic mathematical synthesis, 3 honest pulse rings,
 * rule-based recommendation engine with input reasoning,
 * priorities auto-completion & carry-over, and circadian timeline without invented tasks.
 */

import { calculateSleepScore } from "@/lib/sleep";
import { formatTimeTo12h } from "./time";

// ==============================================================================
// 1. Ring Types & Calculations
// ==============================================================================

export type RingState = "active" | "no_data" | "not_set_up";

export interface RingComponentDetail {
  name: string;
  plannedText: string;
  doneText: string;
  percent: number | null;
  status: RingState;
  weight: number;
  isCompleted?: boolean;
}

export interface RingResult {
  domain: "body" | "mind" | "school";
  label: string;
  colorHex: string;
  ringPercent: number | null; // null when no_data or not_set_up
  status: RingState;
  displayText: string; // "X of Y"
  completedCount: number;
  totalPlannedCount: number;
  deltaVsYesterday: number | null; // ONLY shown if both days have data
  components: RingComponentDetail[];
}

export interface BodyRingInput {
  plannedWorkoutToday?: boolean; // is a workout scheduled today in split
  isRestDayToday?: boolean; // is today designated rest day in split
  hasWorkoutSplit?: boolean; // has user configured a split
  hasLoggedWorkoutToday?: boolean;
  hasLastNightSleep?: boolean;
  lastNightSleep?: {
    durationMinutes: number;
    targetHours?: number;
    qualityRating?: number;
    awakeningsCount?: number;
  } | null;
  nutrition?: {
    caloriesConsumed: number;
    targetCalories: number | null;
    proteinConsumedG: number;
    targetProteinG: number | null;
    waterConsumedMl: number;
    targetWaterMl: number | null;
    mealCount: number;
  } | null;
  yesterdayScore?: number | null;
  activeModules?: {
    workouts?: boolean;
    nutrition?: boolean;
    sleep?: boolean;
    weight?: boolean;
  };
}

export function calculateBodyRing(input: BodyRingInput): RingResult {
  const components: RingComponentDetail[] = [];
  let totalPlanned = 0;
  let completed = 0;

  const workoutsActive = input.activeModules?.workouts !== false;
  const nutritionActive = input.activeModules?.nutrition !== false;
  const sleepActive = input.activeModules?.sleep !== false;

  // 1. Sleep: "Sleep logged" is labeled "Log last night's sleep" and is done when last night's entry exists
  if (sleepActive) {
    totalPlanned += 1;
    const isSleepDone = Boolean(
      input.hasLastNightSleep ||
      (input.lastNightSleep && input.lastNightSleep.durationMinutes > 0)
    );
    if (isSleepDone) completed += 1;
    components.push({
      name: "Log last night's sleep",
      plannedText: "1 entry",
      doneText: isSleepDone ? "Logged" : "Pending",
      percent: isSleepDone ? 100 : 0,
      status: isSleepDone ? "active" : "no_data",
      weight: 1,
      isCompleted: isSleepDone,
    });
  }

  // 2. Nutrition: "food logged today" = at least one meal logged; no calorie-hit item.
  if (nutritionActive) {
    totalPlanned += 1;
    const hasFood = Boolean(input.nutrition && input.nutrition.mealCount >= 1);
    if (hasFood) completed += 1;
    components.push({
      name: "Food logged today",
      plannedText: "At least 1 meal",
      doneText: hasFood ? `${input.nutrition?.mealCount} meals logged` : "No meals logged",
      percent: hasFood ? 100 : 0,
      status: hasFood ? "active" : "no_data",
      weight: 1,
      isCompleted: hasFood,
    });

    // "water target reached" ONLY when a water target is set
    const waterTarget = input.nutrition?.targetWaterMl;
    if (waterTarget && waterTarget > 0) {
      totalPlanned += 1;
      const waterConsumed = input.nutrition?.waterConsumedMl || 0;
      const isWaterReached = waterConsumed >= waterTarget;
      if (isWaterReached) completed += 1;
      const waterPct = Math.min(100, Math.round((waterConsumed / waterTarget) * 100));
      components.push({
        name: "Water target reached",
        plannedText: `${waterTarget} ml`,
        doneText: `${waterConsumed} ml (${waterPct}%)`,
        percent: waterPct,
        status: "active",
        weight: 1,
        isCompleted: isWaterReached,
      });
    }
  }

  // 3. Workouts: "Workout planned" comes from the user's split (profiles.workout_split); no split = 0 planned (not a rest day).
  if (workoutsActive) {
    if (!input.hasWorkoutSplit) {
      // No split = 0 planned (not a rest day)
      components.push({
        name: "Workout planned",
        plannedText: "No split configured",
        doneText: input.hasLoggedWorkoutToday ? "Session logged" : "None planned",
        percent: input.hasLoggedWorkoutToday ? 100 : null,
        status: "not_set_up",
        weight: 1,
        isCompleted: Boolean(input.hasLoggedWorkoutToday),
      });
      if (input.hasLoggedWorkoutToday) {
        totalPlanned += 1;
        completed += 1;
      }
    } else if (input.isRestDayToday) {
      // Rest day: 0 planned (not an item to fail)
      components.push({
        name: "Workout planned",
        plannedText: "Rest Day",
        doneText: input.hasLoggedWorkoutToday ? "Active session logged" : "Scheduled rest",
        percent: 100,
        status: "active",
        weight: 1,
        isCompleted: true,
      });
    } else {
      // Planned workout today
      totalPlanned += 1;
      const isWorkoutDone = Boolean(input.hasLoggedWorkoutToday);
      if (isWorkoutDone) completed += 1;
      components.push({
        name: "Workout planned",
        plannedText: "1 planned session",
        doneText: isWorkoutDone ? "Session completed" : "Pending",
        percent: isWorkoutDone ? 100 : 0,
        status: "active",
        weight: 1,
        isCompleted: isWorkoutDone,
      });
    }
  }

  const ringPercent = totalPlanned > 0 ? Math.min(100, Math.round((completed / totalPlanned) * 100)) : null;
  const status: RingState = totalPlanned > 0 ? "active" : "no_data";
  const displayText =
    totalPlanned > 0
      ? completed === 0
        ? `${totalPlanned} to do`
        : `${completed} of ${totalPlanned}`
      : input.isRestDayToday
      ? "Rest day"
      : "All clear today";

  return {
    domain: "body",
    label: "Body",
    colorHex: "#06B6D4",
    ringPercent,
    status,
    displayText,
    completedCount: completed,
    totalPlannedCount: totalPlanned,
    deltaVsYesterday: null,
    components,
  };
}

export interface MindRingInput {
  actualFocusMinutes: number;
  dailyGoalMinutes: number | null;
  discipline?: {
    totalCommitments: number;
    completedCommitments: number;
  } | null;
  hasCurrentPeriodCheckin?: boolean;
  hasCheckinToday?: boolean;
  yesterdayScore?: number | null;
  activeModules?: {
    focus?: boolean;
    discipline?: boolean;
    reading?: boolean;
    screentime?: boolean;
  };
}

export function calculateMindRing(input: MindRingInput): RingResult {
  const components: RingComponentDetail[] = [];
  let totalPlanned = 0;
  let completed = 0;

  const focusActive = input.activeModules?.focus !== false;
  const disciplineActive = input.activeModules?.discipline !== false;

  // 1. Check-in: "one check-in per day satisfies the check-in item (I want one per day for the ring)"
  if (disciplineActive) {
    totalPlanned += 1;
    const isCheckinDone = Boolean(input.hasCheckinToday || input.hasCurrentPeriodCheckin);
    if (isCheckinDone) completed += 1;
    components.push({
      name: "Daily check-in",
      plannedText: "1 check-in",
      doneText: isCheckinDone ? "Completed" : "Pending",
      percent: isCheckinDone ? 100 : 0,
      status: isCheckinDone ? "active" : "no_data",
      weight: 1,
      isCompleted: isCheckinDone,
    });

    // 2. Discipline habits
    if (input.discipline && input.discipline.totalCommitments > 0) {
      const habitsCount = input.discipline.totalCommitments;
      const habitsDone = input.discipline.completedCommitments;
      totalPlanned += habitsCount;
      completed += Math.min(habitsCount, habitsDone);
      components.push({
        name: "Complete daily habits",
        plannedText: `${habitsCount} habits`,
        doneText: `${habitsDone} completed`,
        percent: Math.round((habitsDone / habitsCount) * 100),
        status: "active",
        weight: 1,
        isCompleted: habitsDone >= habitsCount,
      });
    }
  }

  // 3. Focus: "Focus counts only when a focus goal is set."
  if (focusActive) {
    if (input.dailyGoalMinutes && input.dailyGoalMinutes > 0) {
      totalPlanned += 1;
      const goalMin = input.dailyGoalMinutes;
      const isFocusReached = input.actualFocusMinutes >= goalMin;
      if (isFocusReached) completed += 1;
      const focusPct = Math.min(100, Math.round((input.actualFocusMinutes / goalMin) * 100));
      components.push({
        name: "Hit focus time goal",
        plannedText: `${goalMin}m goal`,
        doneText: `${input.actualFocusMinutes}m completed (${focusPct}%)`,
        percent: focusPct,
        status: "active",
        weight: 1,
        isCompleted: isFocusReached,
      });
    } else {
      components.push({
        name: "Hit focus time goal",
        plannedText: "No goal set",
        doneText: `${input.actualFocusMinutes}m logged`,
        percent: null,
        status: "not_set_up",
        weight: 1,
        isCompleted: false,
      });
    }
  }

  const ringPercent = totalPlanned > 0 ? Math.min(100, Math.round((completed / totalPlanned) * 100)) : null;
  const status: RingState = totalPlanned > 0 ? "active" : "no_data";
  const displayText =
    totalPlanned > 0
      ? completed === 0
        ? `${totalPlanned} to do`
        : `${completed} of ${totalPlanned}`
      : "All clear today";

  return {
    domain: "mind",
    label: "Mind",
    colorHex: "#8B5CF6",
    ringPercent,
    status,
    displayText,
    completedCount: completed,
    totalPlannedCount: totalPlanned,
    deltaVsYesterday: null,
    components,
  };
}

export interface SchoolRingInput {
  deadlinesDueTodayTotal?: number; // Y counts only deadlines due TODAY in the user's timezone
  deadlinesDueTodayCompleted?: number;
  deadlinesDueWithin48h?: {
    total: number;
    completed: number;
  } | null;
  targetStudyMinutes?: number | null; // plus a study target if user set one
  actualStudyMinutes?: number;
  yesterdayScore?: number | null;
  activeModules?: {
    timetable?: boolean;
    topics?: boolean;
    mistakes?: boolean;
  };
}

export function calculateSchoolRing(input: SchoolRingInput): RingResult {
  const components: RingComponentDetail[] = [];
  let totalPlanned = 0;
  let completed = 0;

  // 1. Deadlines due TODAY in user's timezone
  const todayDeadlines = input.deadlinesDueTodayTotal ?? 0;
  const todayCompleted = input.deadlinesDueTodayCompleted ?? 0;

  if (todayDeadlines > 0) {
    totalPlanned += todayDeadlines;
    completed += Math.min(todayDeadlines, todayCompleted);
    components.push({
      name: "Deadlines due today",
      plannedText: `${todayDeadlines} due today`,
      doneText: `${todayCompleted} completed`,
      percent: Math.round((todayCompleted / todayDeadlines) * 100),
      status: "active",
      weight: 1,
      isCompleted: todayCompleted >= todayDeadlines,
    });
  } else {
    components.push({
      name: "Deadlines due today",
      plannedText: "0 due today",
      doneText: "All clear",
      percent: 100,
      status: "active",
      weight: 1,
      isCompleted: true,
    });
  }

  // 2. Study target if user set one
  if (input.targetStudyMinutes && input.targetStudyMinutes > 0) {
    totalPlanned += 1;
    const targetMin = input.targetStudyMinutes;
    const actualMin = input.actualStudyMinutes || 0;
    const isStudyDone = actualMin >= targetMin;
    if (isStudyDone) completed += 1;
    const studyPct = Math.min(100, Math.round((actualMin / targetMin) * 100));
    components.push({
      name: "Daily study target",
      plannedText: `${targetMin}m goal`,
      doneText: `${actualMin}m (${studyPct}%)`,
      percent: studyPct,
      status: "active",
      weight: 1,
      isCompleted: isStudyDone,
    });
  }

  const ringPercent = totalPlanned > 0 ? Math.min(100, Math.round((completed / totalPlanned) * 100)) : null;
  const status: RingState = totalPlanned > 0 ? "active" : "no_data";
  const displayText =
    totalPlanned > 0
      ? completed === 0
        ? `${totalPlanned} to do`
        : `${completed} of ${totalPlanned}`
      : "All clear today";

  return {
    domain: "school",
    label: "School",
    colorHex: "#F59E0B",
    ringPercent,
    status,
    displayText,
    completedCount: completed,
    totalPlannedCount: totalPlanned,
    deltaVsYesterday: null,
    components,
  };
}

// ==============================================================================
// 2. Recommendation Engine (Lime-Free Accent + Planned Session Match)
// ==============================================================================

export interface RecommendationInput {
  plannedWorkoutSession: string | null; // e.g. "Push Day", "Pull Day", "Leg Day", "Rest Day"
  lastNightSleep: {
    durationMinutes: number;
    score: number;
  } | null;
  sevenDayAvgSleepHours: number | null;
  sleepHistoryCount?: number; // Total nights logged in history (requires >= 3 nights for baseline)
  lastWorkout: {
    name: string;
    completedAt: string;
    elapsedHours: number;
    keyLiftsText?: string;
  } | null;
  recentScreenTime?: {
    totalMinutes: number;
    productivePct: number;
  } | null;
  nearestExam?: {
    title: string;
    subjectName?: string;
    daysRemaining: number;
  } | null;
  activeModules?: {
    workouts?: boolean;
    nutrition?: boolean;
    sleep?: boolean;
    focus?: boolean;
    discipline?: boolean;
    timetable?: boolean;
  };
}

export interface RecommendationReasoning {
  sleepText: string;
  loadText: string;
  screenTimeText: string;
  examText: string;
}

export interface RecommendationOutput {
  headline: string;
  categoryBadge: string;
  accentColor: string; // Lime-free accent (Slate Indigo #6366F1 or Violet #8B5CF6)
  reasoning: RecommendationReasoning;
}

export function generateTodayRecommendation(
  input: RecommendationInput
): RecommendationOutput {
  // Lime-free accent: Slate Indigo default, Violet for high cognitive states
  let accentColor = "#6366F1"; // Slate Indigo (never lime)
  let categoryBadge = "Daily Calibration";
  let headline = "";

  const sleepHours = input.lastNightSleep
    ? input.lastNightSleep.durationMinutes / 60
    : null;

  // Baseline Definition: Rolling average sleep duration over up to 7 nights.
  // Rule: A minimum of 3 logged nights is required to establish a valid personal baseline.
  const historyCount =
    typeof input.sleepHistoryCount === "number"
      ? input.sleepHistoryCount
      : input.sevenDayAvgSleepHours !== null
      ? 7
      : input.lastNightSleep
      ? 1
      : 0;
  const hasValidBaseline = historyCount >= 3 && input.sevenDayAvgSleepHours !== null;
  const avgSleep = hasValidBaseline ? input.sevenDayAvgSleepHours : null;

  // STRICT ANTI-HALLUCINATION RULE: With fewer than 3 nights, NEVER claim a deficit
  const isSleepDeficit =
    hasValidBaseline && sleepHours !== null && avgSleep !== null && sleepHours < avgSleep - 0.75;
  const isSleepSurplus =
    hasValidBaseline && sleepHours !== null && avgSleep !== null && sleepHours >= avgSleep + 0.5;

  // Reasoning extraction (Honest, never hallucinates)
  const reasoning: RecommendationReasoning = {
    sleepText: input.lastNightSleep
      ? `${(input.lastNightSleep.durationMinutes / 60).toFixed(1)}h logged${
          hasValidBaseline && avgSleep !== null
            ? ` vs ${avgSleep.toFixed(1)}h baseline avg (${historyCount} nights)`
            : ` (insufficient baseline: ${historyCount} night${historyCount === 1 ? "" : "s"} logged, need 3+)`
        }`
      : "No sleep logged last night",
    loadText: input.lastWorkout
      ? `${input.lastWorkout.name} • ${input.lastWorkout.elapsedHours}h recovery elapsed${
          input.lastWorkout.keyLiftsText ? ` (${input.lastWorkout.keyLiftsText})` : ""
        }`
      : "No previous workout recorded",
    screenTimeText: input.recentScreenTime
      ? `${Math.floor(input.recentScreenTime.totalMinutes / 60)}h ${
          input.recentScreenTime.totalMinutes % 60
        }m yesterday (${input.recentScreenTime.productivePct}% productive)`
      : "No screen time telemetry logged",
    examText: input.nearestExam
      ? `${input.nearestExam.title}${
          input.nearestExam.subjectName ? ` (${input.nearestExam.subjectName})` : ""
        } in ${input.nearestExam.daysRemaining} days`
      : "No upcoming exams scheduled",
  };

  const workoutsActive = input.activeModules?.workouts !== false;
  const planned = workoutsActive ? (input.plannedWorkoutSession || "").trim().toLowerCase() : "";

  // 1. High Exam Urgency Guard (Exam in <= 3 days)
  if (input.nearestExam && input.nearestExam.daysRemaining <= 3) {
    categoryBadge = "Academic Priority";
    accentColor = "#F59E0B"; // Amber for urgent academic
    headline = `${input.nearestExam.title} is in ${input.nearestExam.daysRemaining} days. Dedicate your primary focus interval to active recall.`;
    return { headline, categoryBadge, accentColor, reasoning };
  }

  // 2. STATE: NO SLEEP (0 nights logged)
  // "Optimal readiness" MUST NEVER appear when sleep telemetry is missing.
  if (!input.lastNightSleep) {
    categoryBadge = "Missing Telemetry";
    headline = planned
      ? `No sleep logged last night. Planned session: ${input.plannedWorkoutSession}. Log sleep to calibrate training volume.`
      : "No sleep logged last night. Log your sleep in Body to unlock recovery insights and readiness calibration.";
    return { headline, categoryBadge, accentColor, reasoning };
  }

  // 3. STATE: FEWER THAN 3 NIGHTS LOGGED (Calibrating Baseline - Never claim a deficit)
  if (!hasValidBaseline && sleepHours !== null && sleepHours < 7.0) {
    categoryBadge = "Baseline Calibrating";
    headline = planned
      ? `Sleep duration recorded (${sleepHours.toFixed(1)}h logged). Planned session: ${input.plannedWorkoutSession}. Log at least 3 nights to establish your recovery baseline.`
      : `Sleep duration recorded (${sleepHours.toFixed(1)}h logged). Log at least 3 nights to calibrate your personal baseline.`;
    return { headline, categoryBadge, accentColor, reasoning };
  }

  // 4. If Workouts module is OFF, tailor recommendation to cognitive & recovery priorities
  if (!workoutsActive) {
    categoryBadge = "Cognitive Focus";
    accentColor = "#8B5CF6"; // Violet
    // STATE: SLEEP DEFICIT vs SLEEP GOOD
    headline = isSleepDeficit
      ? `Sleep deficit detected (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h baseline avg). Protect cognitive pacing and cap deep work sprints at 45 minutes.`
      : `Optimal readiness (${sleepHours?.toFixed(1)}h logged). Dedicate your primary focus interval to your highest-leverage deep work today.`;
    return { headline, categoryBadge, accentColor, reasoning };
  }

  // 5. Workouts Active - Planned Session Matching
  if (planned.includes("push")) {
    categoryBadge = "Strength & Load";
    if (isSleepDeficit) {
      headline = `Sleep deficit detected (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h baseline avg). On Push Day, cap Bench Press volume at RPE 7–8 rather than maxing out.`;
    } else {
      headline = `Optimal readiness (${sleepHours?.toFixed(1)}h logged). Ready for Push Day. Target clean bar path and controlled eccentrics on compound presses.`;
    }
  } else if (planned.includes("pull")) {
    categoryBadge = "Strength & Load";
    if (isSleepDeficit) {
      headline = `Sleep deficit detected (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h baseline avg). Lower recovery baseline; maintain Deadlift sets at submaximal intensity.`;
    } else {
      headline = `Optimal readiness (${sleepHours?.toFixed(1)}h logged). Ready for Pull Day. Prime lats and grip strength before heavy compound pulling.`;
    }
  } else if (planned.includes("leg") || planned.includes("lower")) {
    categoryBadge = "Strength & Load";
    if (isSleepDeficit) {
      headline = `Sleep deficit detected (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h baseline avg). On Leg Day, prioritize squat depth and form stability over aggressive load increases.`;
    } else {
      headline = `Optimal readiness (${sleepHours?.toFixed(1)}h logged). Recovery primed. Drive full depth and explosive ascent on your Squat working sets today.`;
    }
  } else if (planned.includes("rest")) {
    categoryBadge = "Recovery Anchor";
    accentColor = "#8B5CF6"; // Violet
    headline = isSleepDeficit
      ? `Designated Rest Day with sleep deficit (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h baseline avg). Prioritize hydration, low-friction mobility, and early sleep tonight.`
      : `Optimal readiness (${sleepHours?.toFixed(1)}h logged) on a designated Rest Day. Focus on active recovery and adhering to your wind-down schedule.`;
  } else if (input.plannedWorkoutSession) {
    categoryBadge = "Training Calibration";
    headline = isSleepDeficit
      ? `Sleep deficit detected (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h baseline avg) for ${input.plannedWorkoutSession}. Regulate volume and avoid training to failure.`
      : `Optimal readiness (${sleepHours?.toFixed(1)}h logged) for ${input.plannedWorkoutSession}. Execute with solid intent.`;
  } else {
    // No split configured
    categoryBadge = "Protocol Setup";
    headline = isSleepDeficit
      ? `Sleep deficit detected (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h baseline avg). Prioritize low-stress mobility or configure your split to pace volume.`
      : `Optimal readiness (${sleepHours?.toFixed(1)}h logged). Configure your training split or log a session to pace volume.`;
  }

  return {
    headline,
    categoryBadge,
    accentColor,
    reasoning,
  };
}

// ==============================================================================
// 3. Priorities Engine (Data Types, Auto-Completion, Carry-Over)
// ==============================================================================

export type PrioritySource = "workout_plan" | "deadline" | "study_goal" | "custom";

export interface PriorityItem {
  id: string;
  user_id?: string;
  priority_date: string; // YYYY-MM-DD
  title: string;
  source: PrioritySource;
  source_id?: string | null;
  estimate_minutes?: number | null;
  sort_order: number;
  completed: boolean;
  completed_at?: string | null;
  auto_completed: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

export interface RealRecordsTelemetry {
  hasLoggedWorkoutToday?: boolean;
  loggedWorkoutName?: string | null;
  completedDeadlineIds?: string[];
  todayFocusMinutes?: number;
  todayCheckinLogged?: boolean;
}

/**
 * Evaluates priority items against real telemetry records.
 * Real records automatically mark system tasks complete.
 * Manual checking is preserved only for 'custom' tasks.
 */
export function autoCompletePriorities(
  priorities: PriorityItem[],
  records: RealRecordsTelemetry
): PriorityItem[] {
  const nowIso = new Date().toISOString();

  return priorities.map((p) => {
    if (p.completed) return p;

    // 1. Workout Plan auto-completion
    if (p.source === "workout_plan" && records.hasLoggedWorkoutToday) {
      return {
        ...p,
        completed: true,
        completed_at: p.completed_at || nowIso,
        auto_completed: true,
      };
    }

    // 2. Deadline auto-completion
    if (
      p.source === "deadline" &&
      p.source_id &&
      records.completedDeadlineIds?.includes(p.source_id)
    ) {
      return {
        ...p,
        completed: true,
        completed_at: p.completed_at || nowIso,
        auto_completed: true,
      };
    }

    // 3. Study Goal auto-completion
    if (p.source === "study_goal" && records.todayFocusMinutes) {
      const target = p.estimate_minutes || 60;
      if (records.todayFocusMinutes >= target) {
        return {
          ...p,
          completed: true,
          completed_at: p.completed_at || nowIso,
          auto_completed: true,
        };
      }
    }

    return p;
  });
}

/**
 * Shifts or copies incomplete priorities to tomorrow's date
 */
export function carryOverPriorities(
  priorities: PriorityItem[],
  tomorrowDateStr: string
): PriorityItem[] {
  const incomplete = priorities.filter((p) => !p.completed && !p.deleted_at);
  return incomplete.map((p, idx) => ({
    ...p,
    id: `carryover-${Date.now()}-${idx}`,
    priority_date: tomorrowDateStr,
    completed: false,
    completed_at: null,
    auto_completed: false,
    sort_order: idx,
  }));
}

// ==============================================================================
// 4. Circadian Day Timeline (No Invented Tasks)
// ==============================================================================

export interface CircadianPhase {
  id: string;
  label: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isActive: boolean;
  events: Array<{
    title: string;
    detail?: string;
    source: "wake" | "workout" | "focus" | "deadline" | "sleep";
    isCompleted?: boolean;
  }>;
}

export interface CircadianTimelineInput {
  targetWakeTime?: string; // default "07:00"
  targetBedtime?: string; // default "23:00"
  caffeineCutoffHours?: number; // default 10h before bed
  plannedWorkout?: {
    name: string;
    time?: string; // default "17:00"
    isLogged?: boolean;
  } | null;
  dailyFocusGoalMinutes?: number;
  todayDeadlines?: Array<{
    title: string;
    dueTime?: string;
    completed: boolean;
  }>;
  currentLocalTime?: string; // HH:MM
}

export function generateCircadianTimeline(
  input: CircadianTimelineInput
): CircadianPhase[] {
  const wake = input.targetWakeTime || "07:00";
  const bed = input.targetBedtime || "23:00";
  const now = input.currentLocalTime || "12:00";

  function toMins(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  const nowMins = toMins(now);
  const wakeMins = toMins(wake);
  const bedMins = toMins(bed);

  // Phase 1: Morning Anchor
  const phase1Start = wake;
  const phase1End = "10:00";
  const p1Active = nowMins >= wakeMins && nowMins < toMins(phase1End);

  // Phase 2: Deep Work & Focus Window
  const phase2Start = "10:00";
  const phase2End = "14:00";
  const p2Active = nowMins >= toMins(phase2Start) && nowMins < toMins(phase2End);

  // Phase 3: Midday & Physical Training
  const phase3Start = "14:00";
  const phase3End = "19:00";
  const p3Active = nowMins >= toMins(phase3Start) && nowMins < toMins(phase3End);

  // Phase 4: Evening Wind-Down & Sleep Anchor
  const phase4Start = "19:00";
  const phase4End = bed;
  const p4Active = nowMins >= toMins(phase4Start) || nowMins < wakeMins;

  const phases: CircadianPhase[] = [
    {
      id: "morning",
      label: "Morning Calibration",
      startTime: phase1Start,
      endTime: phase1End,
      isActive: p1Active,
      events: [
        {
          title: `Wake Anchor (${formatTimeTo12h(wake)})`,
          detail: "Circadian light exposure & morning state check-in",
          source: "wake",
        },
      ],
    },
    {
      id: "deep_work",
      label: "Deep Work Window",
      startTime: phase2Start,
      endTime: phase2End,
      isActive: p2Active,
      events: [
        {
          title: input.dailyFocusGoalMinutes
            ? `${input.dailyFocusGoalMinutes}m Focus Goal Interval`
            : "Primary Deep Work Block",
          detail: "Ultradian focus sprint",
          source: "focus",
        },
      ],
    },
    {
      id: "training",
      label: "Physical Training Window",
      startTime: phase3Start,
      endTime: phase3End,
      isActive: p3Active,
      events: input.plannedWorkout
        ? [
            {
              title: input.plannedWorkout.name,
              detail: input.plannedWorkout.isLogged
                ? "Session completed"
                : "Scheduled training block",
              source: "workout",
              isCompleted: input.plannedWorkout.isLogged,
            },
          ]
        : [
            {
              title: "Physical Activity / Recovery",
              detail: "Active movement & mobility",
              source: "workout",
            },
          ],
    },
    {
      id: "evening",
      label: "Wind-Down & Sleep Anchor",
      startTime: phase4Start,
      endTime: phase4End,
      isActive: p4Active,
      events: [
        ...(input.todayDeadlines?.map((d) => ({
          title: `Deadline: ${d.title}`,
          detail: d.dueTime ? `Due ${d.dueTime}` : "Due by midnight",
          source: "deadline" as const,
          isCompleted: d.completed,
        })) || []),
        {
          title: `Bedtime Anchor (${bed})`,
          detail: "Circadian wind-down & sleep tracking",
          source: "sleep",
        },
      ],
    },
  ];

  return phases;
}

// ==============================================================================
// 5. Timezone Helpers
// ==============================================================================

/**
 * Returns formatted YYYY-MM-DD for user's specific timezone
 */
export function getUserTodayDateStr(userTimezone?: string): string {
  const tz =
    userTimezone ||
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Returns formatted HH:MM in user's timezone
 */
export function getUserCurrentTimeStr(userTimezone?: string): string {
  const tz =
    userTimezone ||
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    return parts;
  } catch {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}
