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
}

export interface RingResult {
  domain: "body" | "mind" | "school";
  label: string;
  colorHex: string;
  ringPercent: number | null; // null when no_data or not_set_up
  status: RingState;
  displayText: string;
  deltaVsYesterday: number | null; // ONLY shown if both days have data
  components: RingComponentDetail[];
}

export interface BodyRingInput {
  plannedWorkoutToday?: boolean; // is a workout scheduled today in split
  isRestDayToday?: boolean; // is today designated rest day in split
  hasWorkoutSplit?: boolean; // has user configured a split
  hasLoggedWorkoutToday?: boolean;
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
}

export function calculateBodyRing(input: BodyRingInput): RingResult {
  const components: RingComponentDetail[] = [];
  let totalWeightedScore = 0;
  let totalActiveWeight = 0;

  // 1. Workout Component (Weight: 0.40)
  const wWorkout = 0.40;
  if (!input.hasWorkoutSplit && !input.hasLoggedWorkoutToday) {
    components.push({
      name: "Workout",
      plannedText: "No split configured",
      doneText: input.hasLoggedWorkoutToday ? "Session logged" : "Unlogged",
      percent: null,
      status: "not_set_up",
      weight: wWorkout,
    });
  } else if (input.isRestDayToday) {
    components.push({
      name: "Workout",
      plannedText: "Scheduled Rest Day",
      doneText: "Active Recovery",
      percent: 100,
      status: "active",
      weight: wWorkout,
    });
    totalWeightedScore += 100 * wWorkout;
    totalActiveWeight += wWorkout;
  } else {
    const workoutPct = input.hasLoggedWorkoutToday ? 100 : 0;
    components.push({
      name: "Workout",
      plannedText: "Planned session",
      doneText: input.hasLoggedWorkoutToday ? "Session completed" : "Pending",
      percent: workoutPct,
      status: "active",
      weight: wWorkout,
    });
    totalWeightedScore += workoutPct * wWorkout;
    totalActiveWeight += wWorkout;
  }

  // 2. Sleep Component (Weight: 0.35)
  const wSleep = 0.35;
  if (!input.lastNightSleep) {
    components.push({
      name: "Sleep",
      plannedText: "Target sleep",
      doneText: "No log last night",
      percent: null,
      status: "no_data",
      weight: wSleep,
    });
  } else {
    const sleepResult = calculateSleepScore(
      input.lastNightSleep.durationMinutes,
      input.lastNightSleep.targetHours || 8.0,
      input.lastNightSleep.qualityRating,
      input.lastNightSleep.awakeningsCount
    );
    const score = Math.max(0, Math.min(100, sleepResult.score));
    const h = (input.lastNightSleep.durationMinutes / 60).toFixed(1);
    components.push({
      name: "Sleep",
      plannedText: `${input.lastNightSleep.targetHours || 8.0}h target`,
      doneText: `${h}h logged (${score}/100)`,
      percent: score,
      status: "active",
      weight: wSleep,
    });
    totalWeightedScore += score * wSleep;
    totalActiveWeight += wSleep;
  }

  // 3. Nutrition Component (Weight: 0.25)
  const wNutrition = 0.25;
  const nutr = input.nutrition;
  if (!nutr || (!nutr.targetCalories && nutr.mealCount === 0)) {
    components.push({
      name: "Nutrition",
      plannedText: "Daily target",
      doneText: "Not set up",
      percent: null,
      status: "not_set_up",
      weight: wNutrition,
    });
  } else {
    // Calorie score rule: "No overeating = 100%"
    let calPct = 100;
    if (nutr.targetCalories && nutr.targetCalories > 0) {
      if (nutr.mealCount === 0) {
        calPct = 0;
      } else if (nutr.caloriesConsumed <= nutr.targetCalories) {
        calPct = 100; // No overeating = 100%
      } else {
        // Proportionally penalize surplus
        const surplus = nutr.caloriesConsumed - nutr.targetCalories;
        calPct = Math.max(0, Math.round(100 - (surplus / nutr.targetCalories) * 100));
      }
    }

    let subScoresCount = 1;
    let subScoresSum = calPct;

    if (nutr.targetProteinG && nutr.targetProteinG > 0) {
      const protPct = Math.min(100, Math.round((nutr.proteinConsumedG / nutr.targetProteinG) * 100));
      subScoresSum += protPct;
      subScoresCount++;
    }

    if (nutr.targetWaterMl && nutr.targetWaterMl > 0) {
      const waterPct = Math.min(100, Math.round((nutr.waterConsumedMl / nutr.targetWaterMl) * 100));
      subScoresSum += waterPct;
      subScoresCount++;
    }

    const nutrPct = Math.round(subScoresSum / subScoresCount);
    components.push({
      name: "Nutrition",
      plannedText: nutr.targetCalories ? `${nutr.targetCalories} kcal budget` : "Macros",
      doneText: `${nutr.caloriesConsumed} kcal logged`,
      percent: nutrPct,
      status: "active",
      weight: wNutrition,
    });
    totalWeightedScore += nutrPct * wNutrition;
    totalActiveWeight += wNutrition;
  }

  // Aggregate Ring Percent
  let ringPercent: number | null = null;
  let status: RingState = "active";
  let displayText = "0%";

  if (totalActiveWeight === 0) {
    status = "not_set_up";
    displayText = "Not set up";
  } else {
    ringPercent = Math.round(totalWeightedScore / totalActiveWeight);
    displayText = `${ringPercent}%`;
  }

  // Delta vs yesterday: ONLY when both days have data
  let deltaVsYesterday: number | null = null;
  if (ringPercent !== null && input.yesterdayScore !== null && input.yesterdayScore !== undefined) {
    deltaVsYesterday = ringPercent - input.yesterdayScore;
  }

  return {
    domain: "body",
    label: "Body",
    colorHex: "#06B6D4", // Cyan
    ringPercent,
    status,
    displayText,
    deltaVsYesterday,
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
  yesterdayScore?: number | null;
}

export function calculateMindRing(input: MindRingInput): RingResult {
  const components: RingComponentDetail[] = [];
  let totalWeightedScore = 0;
  let totalActiveWeight = 0;

  // 1. Focus Component (Weight: 0.50)
  const wFocus = 0.50;
  const goalMin = input.dailyGoalMinutes || 180;
  const focusPct = Math.min(100, Math.round((input.actualFocusMinutes / goalMin) * 100));
  components.push({
    name: "Focus Sessions",
    plannedText: `${goalMin}m goal`,
    doneText: `${input.actualFocusMinutes}m completed`,
    percent: focusPct,
    status: "active",
    weight: wFocus,
  });
  totalWeightedScore += focusPct * wFocus;
  totalActiveWeight += wFocus;

  // 2. Discipline Commitments (Weight: 0.35)
  const wDisc = 0.35;
  if (!input.discipline || input.discipline.totalCommitments === 0) {
    components.push({
      name: "Discipline",
      plannedText: "Commitments",
      doneText: "Not set up",
      percent: null,
      status: "not_set_up",
      weight: wDisc,
    });
  } else {
    const discPct = Math.round(
      (input.discipline.completedCommitments / input.discipline.totalCommitments) * 100
    );
    components.push({
      name: "Discipline",
      plannedText: `${input.discipline.totalCommitments} active commitments`,
      doneText: `${input.discipline.completedCommitments} completed`,
      percent: discPct,
      status: "active",
      weight: wDisc,
    });
    totalWeightedScore += discPct * wDisc;
    totalActiveWeight += wDisc;
  }

  // 3. State Check-in (Weight: 0.15)
  const wCheck = 0.15;
  const checkinPct = input.hasCurrentPeriodCheckin ? 100 : 0;
  components.push({
    name: "State Check-in",
    plannedText: "Current phase check-in",
    doneText: input.hasCurrentPeriodCheckin ? "Recorded" : "Pending",
    percent: checkinPct,
    status: "active",
    weight: wCheck,
  });
  totalWeightedScore += checkinPct * wCheck;
  totalActiveWeight += wCheck;

  let ringPercent: number | null = null;
  let status: RingState = "active";
  let displayText = "0%";

  if (totalActiveWeight === 0) {
    status = "not_set_up";
    displayText = "Not set up";
  } else {
    ringPercent = Math.round(totalWeightedScore / totalActiveWeight);
    displayText = `${ringPercent}%`;
  }

  let deltaVsYesterday: number | null = null;
  if (ringPercent !== null && input.yesterdayScore !== null && input.yesterdayScore !== undefined) {
    deltaVsYesterday = ringPercent - input.yesterdayScore;
  }

  return {
    domain: "mind",
    label: "Mind",
    colorHex: "#8B5CF6", // Violet
    ringPercent,
    status,
    displayText,
    deltaVsYesterday,
    components,
  };
}

export interface SchoolRingInput {
  hasSubjectsConfigured?: boolean;
  deadlinesDueWithin48h?: {
    total: number;
    completed: number;
  } | null;
  subjectStudyMinutes?: number;
  targetStudyMinutes?: number;
  yesterdayScore?: number | null;
}

export function calculateSchoolRing(input: SchoolRingInput): RingResult {
  const components: RingComponentDetail[] = [];
  let totalWeightedScore = 0;
  let totalActiveWeight = 0;

  if (!input.hasSubjectsConfigured) {
    return {
      domain: "school",
      label: "School",
      colorHex: "#F59E0B", // Amber
      ringPercent: null,
      status: "not_set_up",
      displayText: "Not set up",
      deltaVsYesterday: null,
      components: [
        {
          name: "Academic Setup",
          plannedText: "Subjects & coursework",
          doneText: "Not set up",
          percent: null,
          status: "not_set_up",
          weight: 1.0,
        },
      ],
    };
  }

  // 1. Deadlines due within 48h (Weight: 0.60)
  const wDl = 0.60;
  if (!input.deadlinesDueWithin48h || input.deadlinesDueWithin48h.total === 0) {
    // 0 deadlines due in next 48h = 100% on track
    components.push({
      name: "Deadlines (48h)",
      plannedText: "Assessments due ≤48h",
      doneText: "All clear (0 pending)",
      percent: 100,
      status: "active",
      weight: wDl,
    });
    totalWeightedScore += 100 * wDl;
    totalActiveWeight += wDl;
  } else {
    const dlPct = Math.round(
      (input.deadlinesDueWithin48h.completed / input.deadlinesDueWithin48h.total) * 100
    );
    components.push({
      name: "Deadlines (48h)",
      plannedText: `${input.deadlinesDueWithin48h.total} due within 48h`,
      doneText: `${input.deadlinesDueWithin48h.completed} completed`,
      percent: dlPct,
      status: "active",
      weight: wDl,
    });
    totalWeightedScore += dlPct * wDl;
    totalActiveWeight += wDl;
  }

  // 2. Study Session Minutes (Weight: 0.40)
  const wStudy = 0.40;
  const targetStudy = input.targetStudyMinutes || 60;
  const studyMins = input.subjectStudyMinutes || 0;
  const studyPct = Math.min(100, Math.round((studyMins / targetStudy) * 100));
  components.push({
    name: "Subject Study",
    plannedText: `${targetStudy}m target`,
    doneText: `${studyMins}m logged`,
    percent: studyPct,
    status: "active",
    weight: wStudy,
  });
  totalWeightedScore += studyPct * wStudy;
  totalActiveWeight += wStudy;

  const ringPercent = Math.round(totalWeightedScore / totalActiveWeight);
  let deltaVsYesterday: number | null = null;
  if (input.yesterdayScore !== null && input.yesterdayScore !== undefined) {
    deltaVsYesterday = ringPercent - input.yesterdayScore;
  }

  return {
    domain: "school",
    label: "School",
    colorHex: "#F59E0B", // Amber
    ringPercent,
    status: "active",
    displayText: `${ringPercent}%`,
    deltaVsYesterday,
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

  // Reasoning extraction (Honest, never hallucinates)
  const reasoning: RecommendationReasoning = {
    sleepText: input.lastNightSleep
      ? `${(input.lastNightSleep.durationMinutes / 60).toFixed(1)}h logged (Score ${input.lastNightSleep.score}/100)${
          input.sevenDayAvgSleepHours !== null
            ? ` vs ${input.sevenDayAvgSleepHours.toFixed(1)}h 7-day average`
            : " (Insufficient 7d baseline)"
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

  const planned = (input.plannedWorkoutSession || "").trim().toLowerCase();
  const sleepHours = input.lastNightSleep
    ? input.lastNightSleep.durationMinutes / 60
    : null;
  const avgSleep = input.sevenDayAvgSleepHours;
  const isSleepDeficit =
    sleepHours !== null && avgSleep !== null && sleepHours < avgSleep - 0.75;
  const isSleepSurplus =
    sleepHours !== null && avgSleep !== null && sleepHours >= avgSleep + 0.5;

  // 1. High Exam Urgency Guard (Exam in <= 3 days)
  if (input.nearestExam && input.nearestExam.daysRemaining <= 3) {
    categoryBadge = "Academic Priority";
    accentColor = "#F59E0B"; // Amber for urgent academic
    headline = `${input.nearestExam.title} is in ${input.nearestExam.daysRemaining} days. Dedicate your primary focus interval to active recall.`;
    return { headline, categoryBadge, accentColor, reasoning };
  }

  // 2. Missing Sleep Telemetry Guard
  if (!input.lastNightSleep) {
    categoryBadge = "Missing Telemetry";
    headline = planned
      ? `No sleep logged last night. Planned session: ${input.plannedWorkoutSession}. Log sleep to calibrate training volume.`
      : "No sleep logged last night. Log your sleep in Body to unlock recovery insights.";
    return { headline, categoryBadge, accentColor, reasoning };
  }

  // 3. Planned Session Matching (STRICT ANTI-BUG RULE: NEVER RECOMMEND SQUATS ON PUSH DAY)
  if (planned.includes("push")) {
    categoryBadge = "Strength & Load";
    if (isSleepDeficit) {
      headline = `Sleep deficit detected (${sleepHours?.toFixed(1)}h vs ${avgSleep?.toFixed(1)}h avg). On Push Day, cap Bench Press volume at RPE 7–8 rather than maxing out.`;
    } else if (isSleepSurplus) {
      headline = `Optimal recovery (${sleepHours?.toFixed(1)}h logged). Target top-set progression on Bench Press and Overhead Press today.`;
    } else {
      headline = `Ready for Push Day. Focus on clean bar path and controlled eccentrics on your compound presses.`;
    }
  } else if (planned.includes("pull")) {
    categoryBadge = "Strength & Load";
    if (isSleepDeficit) {
      headline = `Lower recovery baseline today. Maintain Deadlift sets at submaximal intensity to protect posterior chain pacing.`;
    } else {
      headline = `Planned session: Pull Day. Prime your lats and grip strength before heavy compound pulling.`;
    }
  } else if (planned.includes("leg") || planned.includes("lower")) {
    categoryBadge = "Strength & Load";
    if (isSleepDeficit) {
      headline = `Sleep deficit detected. On Leg Day, prioritize squat depth and form stability over aggressive load increases.`;
    } else {
      headline = `Recovery primed. Drive full depth and explosive ascent on your Squat working sets today.`;
    }
  } else if (planned.includes("rest")) {
    categoryBadge = "Recovery Anchor";
    accentColor = "#8B5CF6"; // Violet
    headline = `Designated Rest Day. Focus on hydration, low-friction mobility, and adhering to your wind-down schedule.`;
  } else if (input.plannedWorkoutSession) {
    // Custom session name
    categoryBadge = "Training Calibration";
    headline = isSleepDeficit
      ? `Sleep is below baseline for ${input.plannedWorkoutSession}. Regulate volume and avoid training to failure.`
      : `High readiness for ${input.plannedWorkoutSession}. Execute with solid intent.`;
  } else {
    // No split configured
    categoryBadge = "Protocol Setup";
    headline = "No workout split configured for today. Set your training split in settings to enable tailored load pacing.";
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
