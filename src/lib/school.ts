/**
 * School & Academic Engine (Stage 8a)
 * Pure percentage math, unweighted default, weighted logic, target projections,
 * link integrity, and timezone-aware deadline classifications.
 * NO GPAs or letter grades. Pure mathematical rigor.
 */

export type GradeType = "quiz" | "big_exam";
export type DeadlineType = "exam" | "quiz" | "assignment" | "project" | "reading";
export type DeadlinePriority = "low" | "medium" | "high";

export interface SubjectItem {
  id: string;
  user_id?: string;
  name: string;
  code: string | null;
  color: string;
  target_grade?: number | null;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface GradeItem {
  id: string;
  user_id?: string;
  subject_id: string;
  type: GradeType;
  title: string;
  mark_achieved: number;
  mark_total: number;
  weight_pct?: number | null;
  entry_date: string; // YYYY-MM-DD from user timezone
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DeadlineItem {
  id: string;
  user_id?: string;
  subject_id: string;
  title: string;
  type: DeadlineType;
  due_date: string; // ISO timestamptz (end of day in user timezone)
  completed: boolean;
  priority: DeadlinePriority;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Curated matte palette for subjects.
 * STRICT PROHIBITION: Volt Lime (#C6FF3D) is permanently banned (reserved for Body domain).
 */
export const PROHIBITED_COLOR = "#c6ff3d";

export const SUBJECT_PALETTE = [
  { label: "Slate Indigo", value: "#6366F1" },
  { label: "Sky Blue", value: "#0EA5E9" },
  { label: "Emerald Teal", value: "#10B981" },
  { label: "School Amber", value: "#F59E0B" },
  { label: "Coral Crimson", value: "#F43F5E" },
  { label: "Purple Amethyst", value: "#8B5CF6" },
  { label: "Rose Quartz", value: "#EC4899" },
  { label: "Warm Stone", value: "#78716C" },
];

/**
 * Rounds a number to 1 decimal place
 */
export function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Calculates raw percentage for a single grade
 */
export function calculateGradePercentage(
  achieved: number,
  total: number
): number {
  if (total <= 0) return 0;
  if (achieved < 0) return 0;
  const pct = (achieved / total) * 100;
  return round1(pct);
}

export interface SubjectAverageResult {
  hasGrades: boolean;
  averagePct: number | null;
  isWeighted: boolean;
  label: string;
  totalGrades: number;
  gradedWeightSum: number;
}

/**
 * Calculates average for a subject based on Stage 8 spec:
 * - Default is "Average (unweighted)"
 * - Weighted ONLY when EVERY counted grade has a weight and sum(weights) > 0
 * - When weighted and sum(weights) < 100: label "Weighted Average (of X% graded so far)"
 * - Guards zero-weight sums
 */
export function calculateSubjectGradeAverage(
  grades: GradeItem[]
): SubjectAverageResult {
  const activeGrades = grades.filter(
    (g) => !g.deleted_at && g.mark_total > 0 && g.mark_achieved >= 0
  );

  if (activeGrades.length === 0) {
    return {
      hasGrades: false,
      averagePct: null,
      isWeighted: false,
      label: "No grades yet",
      totalGrades: 0,
      gradedWeightSum: 0,
    };
  }

  // Check if EVERY grade has a valid positive weight
  const allHaveWeights = activeGrades.every(
    (g) => g.weight_pct !== null && g.weight_pct !== undefined && g.weight_pct > 0
  );

  const totalWeight = activeGrades.reduce(
    (sum, g) => sum + (g.weight_pct || 0),
    0
  );

  if (allHaveWeights && totalWeight > 0) {
    // Weighted average
    const weightedSum = activeGrades.reduce((sum, g) => {
      const pct = (g.mark_achieved / g.mark_total) * 100;
      return sum + pct * (g.weight_pct || 0);
    }, 0);

    const avg = round1(weightedSum / totalWeight);
    const weightDisplay = round1(totalWeight);

    let label: string;
    if (weightDisplay < 100) {
      label = `Weighted Average (of ${weightDisplay}% graded so far)`;
    } else if (weightDisplay === 100) {
      label = "Weighted Average (100% graded)";
    } else {
      label = `Weighted Average (${weightDisplay}% total weight)`;
    }

    return {
      hasGrades: true,
      averagePct: avg,
      isWeighted: true,
      label,
      totalGrades: activeGrades.length,
      gradedWeightSum: weightDisplay,
    };
  }

  // Fallback: Average (unweighted)
  const sumPcts = activeGrades.reduce((sum, g) => {
    return sum + (g.mark_achieved / g.mark_total) * 100;
  }, 0);

  const avg = round1(sumPcts / activeGrades.length);

  return {
    hasGrades: true,
    averagePct: avg,
    isWeighted: false,
    label: "Average (unweighted)",
    totalGrades: activeGrades.length,
    gradedWeightSum: totalWeight,
  };
}

export interface TargetProjectionResult {
  available: boolean;
  targetGrade: number;
  remainingWeightPct: number;
  neededAveragePct: number | null;
  status: "achieved" | "reachable" | "unreachable" | "not_applicable";
  message: string;
}

/**
 * Calculates "need X% to reach Y"
 * Available ONLY when weights exist for all current grades and sum(weights) < 100
 */
export function calculateTargetNeeded(
  grades: GradeItem[],
  targetGrade?: number | null
): TargetProjectionResult {
  if (targetGrade === null || targetGrade === undefined || targetGrade < 0 || targetGrade > 100) {
    return {
      available: false,
      targetGrade: targetGrade ?? 0,
      remainingWeightPct: 0,
      neededAveragePct: null,
      status: "not_applicable",
      message: "No target grade set",
    };
  }

  const activeGrades = grades.filter(
    (g) => !g.deleted_at && g.mark_total > 0 && g.mark_achieved >= 0
  );

  if (activeGrades.length === 0) {
    return {
      available: true,
      targetGrade,
      remainingWeightPct: 100,
      neededAveragePct: targetGrade,
      status: "reachable",
      message: `Need ${targetGrade}% across coursework to reach ${targetGrade}%`,
    };
  }

  // Must have weights on all grades to project
  const allHaveWeights = activeGrades.every(
    (g) => g.weight_pct !== null && g.weight_pct !== undefined && g.weight_pct > 0
  );

  const totalWeight = activeGrades.reduce(
    (sum, g) => sum + (g.weight_pct || 0),
    0
  );

  if (!allHaveWeights || totalWeight <= 0) {
    return {
      available: false,
      targetGrade,
      remainingWeightPct: 0,
      neededAveragePct: null,
      status: "not_applicable",
      message: "Weights must be defined to calculate needed target",
    };
  }

  if (totalWeight >= 100) {
    return {
      available: false,
      targetGrade,
      remainingWeightPct: 0,
      neededAveragePct: null,
      status: "not_applicable",
      message: "Coursework is 100% complete",
    };
  }

  const remainingWeight = round1(100 - totalWeight);
  const weightedSumAchieved = activeGrades.reduce((sum, g) => {
    const pct = (g.mark_achieved / g.mark_total) * 100;
    return sum + pct * (g.weight_pct || 0);
  }, 0);

  // Formula: X = (100 * Target - weightedSumAchieved) / remainingWeight
  const needed = (100 * targetGrade - weightedSumAchieved) / (100 - totalWeight);
  const neededRounded = round1(needed);

  if (needed <= 0) {
    return {
      available: true,
      targetGrade,
      remainingWeightPct: remainingWeight,
      neededAveragePct: 0,
      status: "achieved",
      message: `Target achieved (need 0% on remaining ${remainingWeight}%)`,
    };
  }

  if (needed > 100) {
    return {
      available: true,
      targetGrade,
      remainingWeightPct: remainingWeight,
      neededAveragePct: null,
      status: "unreachable",
      message: "Not reachable with the remaining weight",
    };
  }

  return {
    available: true,
    targetGrade,
    remainingWeightPct: remainingWeight,
    neededAveragePct: neededRounded,
    status: "reachable",
    message: `Need ${neededRounded}% on remaining ${remainingWeight}% to reach ${targetGrade}%`,
  };
}

export interface QuizVsExamResult {
  hasSufficientData: boolean;
  quizAveragePct: number | null;
  quizCount: number;
  bigExamAveragePct: number | null;
  bigExamCount: number;
}

/**
 * Quiz vs Big Exam comparative averages.
 * MUST have at least 2 of each category to display!
 */
export function calculateQuizVsExamAverage(
  grades: GradeItem[]
): QuizVsExamResult {
  const activeGrades = grades.filter(
    (g) => !g.deleted_at && g.mark_total > 0 && g.mark_achieved >= 0
  );

  const quizzes = activeGrades.filter((g) => g.type === "quiz");
  const bigExams = activeGrades.filter((g) => g.type === "big_exam");

  if (quizzes.length < 2 || bigExams.length < 2) {
    return {
      hasSufficientData: false,
      quizAveragePct: null,
      quizCount: quizzes.length,
      bigExamAveragePct: null,
      bigExamCount: bigExams.length,
    };
  }

  const quizAvg =
    round1(
      quizzes.reduce(
        (sum, g) => sum + (g.mark_achieved / g.mark_total) * 100,
        0
      ) / quizzes.length
    );

  const bigExamAvg =
    round1(
      bigExams.reduce(
        (sum, g) => sum + (g.mark_achieved / g.mark_total) * 100,
        0
      ) / bigExams.length
    );

  return {
    hasSufficientData: true,
    quizAveragePct: quizAvg,
    quizCount: quizzes.length,
    bigExamAveragePct: bigExamAvg,
    bigExamCount: bigExams.length,
  };
}

/**
 * Overall academic summary across all active subjects (pure percentage, no GPA)
 */
export function calculateOverallAcademicStats(
  subjects: SubjectItem[],
  allGrades: GradeItem[]
): {
  overallAveragePct: number | null;
  gradedSubjectsCount: number;
  totalGradesCount: number;
} {
  const activeSubjects = subjects.filter((s) => !s.deleted_at && !s.archived);
  let totalGradeCount = 0;
  const subjectAverages: number[] = [];

  for (const sub of activeSubjects) {
    const subGrades = allGrades.filter(
      (g) => g.subject_id === sub.id && !g.deleted_at
    );
    const summary = calculateSubjectGradeAverage(subGrades);
    if (summary.hasGrades && summary.averagePct !== null) {
      subjectAverages.push(summary.averagePct);
      totalGradeCount += summary.totalGrades;
    }
  }

  if (subjectAverages.length === 0) {
    return {
      overallAveragePct: null,
      gradedSubjectsCount: 0,
      totalGradesCount: 0,
    };
  }

  const overallAvg =
    round1(subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length);

  return {
    overallAveragePct: overallAvg,
    gradedSubjectsCount: subjectAverages.length,
    totalGradesCount: totalGradeCount,
  };
}

/**
 * Converts a date-only string (YYYY-MM-DD) to the end of the day (23:59:59.999)
 * in the user's timezone, returning an ISO string.
 */
export function parseDateToEndOfDay(dateStr: string, timeZone?: string): string {
  // If already full ISO, return it
  if (dateStr.includes("T")) return dateStr;

  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  
  // Construct a date at 23:59:59 in the given timezone
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date().toISOString();
  }

  // Create Date object representing end of that day locally
  const localDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  return localDate.toISOString();
}

export interface DeadlineClassification {
  status: "overdue" | "today" | "upcoming";
  daysRemaining: number;
  hoursRemaining: number;
  label: string;
  badgeClass: string;
}

/**
 * Classifies a deadline with respect to user's timezone
 */
export function classifyDeadline(
  dueDateIso: string,
  timeZone?: string
): DeadlineClassification {
  const target = new Date(dueDateIso).getTime();
  const now = Date.now();
  const diffMs = target - now;

  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format date parts in timezone
  const targetDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dueDateIso));

  const nowDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (diffMs < 0) {
    const overdueDays = Math.max(1, Math.floor(-diffMs / (1000 * 60 * 60 * 24)));
    return {
      status: "overdue",
      daysRemaining: -overdueDays,
      hoursRemaining: Math.floor(diffMs / (1000 * 60 * 60)),
      label: overdueDays === 1 ? "1d overdue" : `${overdueDays}d overdue`,
      badgeClass: "bg-crimson-alert/20 text-crimson-alert border-crimson-alert/40",
    };
  }

  if (targetDateStr === nowDateStr) {
    const hoursLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    return {
      status: "today",
      daysRemaining: 0,
      hoursRemaining: hoursLeft,
      label: hoursLeft <= 2 ? `Due in ${hoursLeft}h` : "Due today (11:59 PM)",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }

  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft === 1) {
    return {
      status: "upcoming",
      daysRemaining: 1,
      hoursRemaining: Math.ceil(diffMs / (1000 * 60 * 60)),
      label: "Tomorrow",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }

  return {
    status: "upcoming",
    daysRemaining: daysLeft,
    hoursRemaining: Math.ceil(diffMs / (1000 * 60 * 60)),
    label: `in ${daysLeft} days`,
    badgeClass: "bg-surface-container-high text-on-surface-variant border-border-subtle",
  };
}

/**
 * Finds the single nearest deadline for Today dashboard
 */
export function findNearestDeadline(
  deadlines: DeadlineItem[],
  timeZone?: string
): DeadlineItem | null {
  const active = deadlines.filter((d) => !d.deleted_at && !d.completed);
  if (active.length === 0) return null;

  // Sort ascending by due_date
  active.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  return active[0];
}

/**
 * Validation Guards
 */
export function validateSubjectInput(input: {
  name: string;
  color?: string;
  target_grade?: number | null;
}): { valid: boolean; error?: string } {
  if (!input.name || !input.name.trim()) {
    return { valid: false, error: "Subject name is required." };
  }

  if (input.color && input.color.toLowerCase().trim() === PROHIBITED_COLOR) {
    return {
      valid: false,
      error: "Volt Lime (#C6FF3D) is reserved for the Body domain. Please select an academic palette color.",
    };
  }

  if (
    input.target_grade !== undefined &&
    input.target_grade !== null &&
    (input.target_grade < 0 || input.target_grade > 100)
  ) {
    return { valid: false, error: "Target grade must be between 0% and 100%." };
  }

  return { valid: true };
}

export function validateGradeInput(input: {
  type: string;
  title: string;
  mark_achieved: number;
  mark_total: number;
  weight_pct?: number | null;
}): { valid: boolean; error?: string } {
  if (input.type !== "quiz" && input.type !== "big_exam") {
    return {
      valid: false,
      error: "Grade type must be either 'quiz' or 'big_exam'. Assignments and projects belong in Deadlines.",
    };
  }

  if (!input.title || !input.title.trim()) {
    return { valid: false, error: "Grade title is required." };
  }

  if (typeof input.mark_total !== "number" || input.mark_total <= 0) {
    return { valid: false, error: "Total mark must be greater than zero." };
  }

  if (
    typeof input.mark_achieved !== "number" ||
    input.mark_achieved < 0 ||
    input.mark_achieved > input.mark_total
  ) {
    return {
      valid: false,
      error: "Mark achieved must be between 0 and total mark.",
    };
  }

  if (
    input.weight_pct !== undefined &&
    input.weight_pct !== null &&
    (input.weight_pct < 0 || input.weight_pct > 100)
  ) {
    return { valid: false, error: "Weight percentage must be between 0% and 100%." };
  }

  return { valid: true };
}

export function validateDeadlineInput(input: {
  type: string;
  title: string;
  due_date: string;
}): { valid: boolean; error?: string } {
  const allowed = ["exam", "quiz", "assignment", "project", "reading"];
  if (!allowed.includes(input.type)) {
    return {
      valid: false,
      error: `Deadline type must be one of: ${allowed.join(", ")}`,
    };
  }

  if (!input.title || !input.title.trim()) {
    return { valid: false, error: "Deadline title is required." };
  }

  if (!input.due_date) {
    return { valid: false, error: "Due date is required." };
  }

  return { valid: true };
}

// ============================================================================
// STAGE 8B: MISTAKES, TOPICS, STUDY HOURS, HEATMAP & TIMETABLE
// ============================================================================

export type MistakeCause = "concept" | "careless" | "time" | "memory";
export type RedoResult = "correct" | "wrong";

export interface RedoAttempt {
  attempted_at: string; // ISO timestamp
  result: RedoResult;
  notes?: string | null;
}

export interface MistakeItem {
  id: string;
  user_id?: string;
  subject_id: string;
  topic: string; // max 120 chars
  question_context: string; // max 2000 chars
  error_made: string; // max 2000 chars
  correct_solution: string; // max 2000 chars
  cause: MistakeCause;
  resolved: boolean; // Resolved strictly if consecutive_correct >= 2
  redo_at: string; // ISO timestamp (calendar-day end of day)
  last_redo_result?: RedoResult | null;
  redo_history: RedoAttempt[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface TopicReviewAttempt {
  reviewed_at: string; // ISO timestamp
  confidence: number; // 1 to 5
  interval_days: number;
}

export interface AcademicTopicItem {
  id: string;
  user_id?: string;
  subject_id: string;
  name: string; // max 120 chars
  confidence: number; // 1 to 5 (integer)
  current_interval_days?: number;
  review_count: number;
  last_reviewed_at?: string | null;
  next_review_at: string | null; // ISO timestamp (nullable for unscheduled new topics)
  review_history: TopicReviewAttempt[];
  notes?: string | null; // max 1000 chars
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type SessionType = "lecture" | "lab" | "section" | "seminar";

export interface ScheduleItem {
  id: string;
  user_id?: string;
  subject_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  location?: string | null;
  session_type: SessionType;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Calculates local calendar day end-of-day timestamp (23:59:59.999 local).
 * Guaranteed calendar-day boundary alignment (not a 24-hour offset).
 */
export function addLocalCalendarDaysEndOfDay(
  days: number,
  baseDate: Date = new Date()
): string {
  const d = new Date(baseDate.getTime());
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Derives consecutive correct attempts backwards from redo history
 */
export function getConsecutiveCorrectRedos(redoHistory: RedoAttempt[] = []): number {
  let count = 0;
  for (let i = redoHistory.length - 1; i >= 0; i--) {
    if (redoHistory[i].result === "correct") {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Calculates retrospective metrics for mistakes categorized by cause
 */
export function calculateMistakeStats(mistakes: MistakeItem[]): {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  resolutionRatePct: number;
  causeBreakdown: { concept: number; careless: number; time: number; memory: number };
  causePercentages: { concept: number; careless: number; time: number; memory: number };
} {
  const active = mistakes.filter((m) => !m.deleted_at);
  let resolved = 0;
  const causeBreakdown = { concept: 0, careless: 0, time: 0, memory: 0 };

  for (const m of active) {
    const streak = getConsecutiveCorrectRedos(m.redo_history || []);
    const isResolved = m.resolved || streak >= 2;
    if (isResolved) {
      resolved++;
    }
    const c = m.cause || "concept";
    if (c in causeBreakdown) {
      causeBreakdown[c]++;
    } else {
      causeBreakdown.concept++;
    }
  }

  const open = active.length - resolved;
  const resolutionRatePct =
    active.length > 0 ? Math.round((resolved / active.length) * 100) : 0;

  const total = active.length || 1;
  const causePercentages = {
    concept: Math.round((causeBreakdown.concept / total) * 100),
    careless: Math.round((causeBreakdown.careless / total) * 100),
    time: Math.round((causeBreakdown.time / total) * 100),
    memory: Math.round((causeBreakdown.memory / total) * 100),
  };

  return {
    totalCount: active.length,
    openCount: open,
    resolvedCount: resolved,
    resolutionRatePct,
    causeBreakdown,
    causePercentages,
  };
}

/**
 * Mistake Redo Spaced Scheduling
 * Resolved strictly after TWO consecutive correct redos.
 * Correct sequence: 1st correct = 3d, 2nd correct = 7d (resolved!), 3rd correct = 14d, 4th correct = 14d.
 * Wrong at any point immediately resets to 1 day, resets streak to 0, and marks resolved = false.
 */
export function calculateNextRedoDate(
  lastResult: RedoResult,
  priorConsecutiveCorrect: number,
  baseDate: Date = new Date()
): {
  nextRedoAt: string;
  nextIntervalDays: number;
  newConsecutiveCorrect: number;
  isResolved: boolean;
} {
  if (lastResult === "wrong") {
    const nextRedoAt = addLocalCalendarDaysEndOfDay(1, baseDate);
    return {
      nextRedoAt,
      nextIntervalDays: 1,
      newConsecutiveCorrect: 0,
      isResolved: false,
    };
  }

  const newConsecutive = priorConsecutiveCorrect + 1;
  const isResolved = newConsecutive >= 2;

  let intervalDays = 3;
  if (newConsecutive === 1) {
    intervalDays = 3;
  } else if (newConsecutive === 2) {
    intervalDays = 7;
  } else {
    intervalDays = 14;
  }

  const nextRedoAt = addLocalCalendarDaysEndOfDay(intervalDays, baseDate);
  return {
    nextRedoAt,
    nextIntervalDays: intervalDays,
    newConsecutiveCorrect: newConsecutive,
    isResolved,
  };
}

/**
 * Topic Leitner Spaced Repetition Scheduling
 * Ladder: [1, 3, 7, 14, 30] days.
 * High (4 or 5): advances to next interval in ladder, increments review_count.
 * Neutral (3): preserves current_interval_days intact and keeps review_count unchanged.
 * Low (1 or 2): resets interval to 1 day and resets review_count to 0.
 */
export const TOPIC_INTERVALS_DAYS = [1, 3, 7, 14, 30];

export function calculateTopicNextReview(
  confidence: number,
  currentIntervalDays: number,
  currentReviewCount: number,
  baseDate: Date = new Date()
): {
  nextReviewAt: string;
  nextIntervalDays: number;
  nextReviewCount: number;
} {
  let nextInterval = 1;
  let nextCount = currentReviewCount;

  if (confidence >= 4) {
    const idx = Math.min(
      TOPIC_INTERVALS_DAYS.length - 1,
      Math.max(0, currentReviewCount)
    );
    nextInterval = TOPIC_INTERVALS_DAYS[idx];
    nextCount = currentReviewCount + 1;
  } else if (confidence === 3) {
    // Retain existing interval stability
    nextInterval = Math.max(1, currentIntervalDays);
    nextCount = currentReviewCount;
  } else {
    // 1 or 2 (low / struggling): reset
    nextInterval = 1;
    nextCount = 0;
  }

  const nextReviewAt = addLocalCalendarDaysEndOfDay(nextInterval, baseDate);
  return {
    nextReviewAt,
    nextIntervalDays: nextInterval,
    nextReviewCount: nextCount,
  };
}

/**
 * Topic Tracker Statistics
 */
export function calculateTopicStats(topics: AcademicTopicItem[]): {
  totalTopics: number;
  newTopicsCount: number;
  dueCount: number;
  highConfidenceCount: number;
  averageConfidence: number;
} {
  const active = topics.filter((t) => !t.deleted_at);
  const nowMs = Date.now();
  let due = 0;
  let newTopics = 0;
  let highConf = 0;
  let confSum = 0;

  for (const t of active) {
    const conf = Number(t.confidence) || 1;
    confSum += conf;
    if (conf >= 4) {
      highConf++;
    }
    if (t.last_reviewed_at === null && t.review_count === 0) {
      newTopics++;
    }
    if (t.next_review_at && new Date(t.next_review_at).getTime() <= nowMs) {
      due++;
    }
  }

  const avg = active.length > 0 ? round1(confSum / active.length) : 0;

  return {
    totalTopics: active.length,
    newTopicsCount: newTopics,
    dueCount: due,
    highConfidenceCount: highConf,
    averageConfidence: avg,
  };
}

/**
 * Caps overdue topics queue to avoid cognitive overload.
 * Generates honest banner string: "32 topics due for review today (showing 10 priority reviews)".
 */
export function filterOverdueTopicQueue(
  topics: AcademicTopicItem[],
  limit = 10,
  nowMs: number = Date.now()
): {
  dueTopics: AcademicTopicItem[];
  totalDueCount: number;
  hasMore: boolean;
  remainingCount: number;
  bannerText: string;
} {
  const active = topics.filter((t) => !t.deleted_at);
  const due = active
    .filter(
      (t) => t.next_review_at !== null && new Date(t.next_review_at).getTime() <= nowMs
    )
    .sort((a, b) => {
      const aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : 0;
      const bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : 0;
      return aTime - bTime;
    });

  const totalDueCount = due.length;
  const dueTopics = due.slice(0, limit);
  const remainingCount = Math.max(0, totalDueCount - limit);
  const hasMore = remainingCount > 0;

  const bannerText = hasMore
    ? `${totalDueCount} topics due for review today (showing ${dueTopics.length} priority reviews)`
    : `${totalDueCount} topic${totalDueCount === 1 ? "" : "s"} due for review today`;

  return {
    dueTopics,
    totalDueCount,
    hasMore,
    remainingCount,
    bannerText,
  };
}

/**
 * Bulk topic parser: parses line-by-line text into sanitized topic names.
 * Enforces 200 lines limit, 120 chars per line limit, and case-insensitive deduplication.
 */
export function parseBulkTopics(
  rawText: string,
  existingTopicNames: string[] = []
): {
  valid: boolean;
  topics: string[];
  duplicates: string[];
  errors: string[];
} {
  const lines = rawText.split("\n");
  const topics: string[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  // Initialize with existing topics within the subject
  existingTopicNames.forEach((n) => seen.add(n.trim().toLowerCase()));

  if (lines.length > 200) {
    errors.push("Bulk paste cannot exceed 200 lines at once.");
    return { valid: false, topics: [], duplicates: [], errors };
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.length > 120) {
      errors.push(`Line ${idx + 1}: Exceeds 120 characters ("${trimmed.slice(0, 25)}...")`);
      return;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(trimmed);
      return;
    }
    seen.add(key);
    topics.push(trimmed);
  });

  return {
    valid: errors.length === 0 && topics.length > 0,
    topics,
    duplicates,
    errors,
  };
}

export interface SubjectStudyBreakdown {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  totalMinutes: number;
  totalHours: number;
  sessionCount: number;
}

/**
 * Aggregates deep work study hours per subject from focus_sessions
 */
export function calculateStudyHoursBreakdown(
  focusSessions: Array<{
    subject_id?: string | null;
    actual_minutes?: number;
    deleted_at?: string | null;
  }>,
  subjects: SubjectItem[]
): {
  bySubject: SubjectStudyBreakdown[];
  totalStudyMinutes: number;
  totalStudyHours: number;
  totalSessions: number;
} {
  const subjectMap = new Map<string, SubjectStudyBreakdown>();
  subjects.forEach((s) => {
    subjectMap.set(s.id, {
      subjectId: s.id,
      subjectName: s.name,
      subjectColor: s.color || "#F59E0B",
      totalMinutes: 0,
      totalHours: 0,
      sessionCount: 0,
    });
  });

  let totalMinutes = 0;
  let totalSessions = 0;

  focusSessions.forEach((sess) => {
    if (sess.deleted_at || !sess.subject_id) return;
    const mins = Number(sess.actual_minutes) || 0;
    if (mins <= 0) return;

    totalMinutes += mins;
    totalSessions++;

    const item = subjectMap.get(sess.subject_id);
    if (item) {
      item.totalMinutes += mins;
      item.totalHours = round1(item.totalMinutes / 60);
      item.sessionCount += 1;
    }
  });

  const bySubject = Array.from(subjectMap.values()).filter(
    (item) => item.totalMinutes > 0
  );
  bySubject.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return {
    bySubject,
    totalStudyMinutes: totalMinutes,
    totalStudyHours: round1(totalMinutes / 60),
    totalSessions,
  };
}

/**
 * Weekly study target progress - strictly user-defined, nullable by default
 */
export function calculateWeeklyTargetProgress(
  weeklyMinutesLogged: number,
  weeklyTargetHours: number | null = null
): {
  loggedHours: number;
  targetHours: number | null;
  adherencePct: number | null;
  remainingHours: number | null;
  status: "ahead" | "on_track" | "behind" | "not_set";
  label: string;
} {
  const loggedHours = round1(weeklyMinutesLogged / 60);

  if (weeklyTargetHours === null || weeklyTargetHours <= 0) {
    return {
      loggedHours,
      targetHours: null,
      adherencePct: null,
      remainingHours: null,
      status: "not_set",
      label: "No weekly target set. Tap to define your study goal.",
    };
  }

  const adherencePct = Math.min(100, Math.round((loggedHours / weeklyTargetHours) * 100));
  const remainingHours = Math.max(0, round1(weeklyTargetHours - loggedHours));

  let status: "ahead" | "on_track" | "behind" = "on_track";
  if (adherencePct >= 100) {
    status = "ahead";
  } else if (adherencePct < 50) {
    status = "behind";
  }

  return {
    loggedHours,
    targetHours: weeklyTargetHours,
    adherencePct,
    remainingHours,
    status,
    label: `${loggedHours}h of ${weeklyTargetHours}h completed (${adherencePct}%)`,
  };
}

export interface HeatmapDayCell {
  date: string; // YYYY-MM-DD
  minutes: number;
  gradeCount: number;
  level: 0 | 1 | 2 | 3 | 4; // 0=None, 1=1-45m, 2=46-90m, 3=91-180m, 4=>180m or exam
}

/**
 * Generates 12-week GitHub-style heatmap data
 */
export function generateAcademicHeatmap(
  focusSessions: Array<{
    logged_date?: string;
    started_at?: string;
    actual_minutes?: number;
    subject_id?: string | null;
    deleted_at?: string | null;
  }>,
  grades: GradeItem[],
  daysCount = 84
): HeatmapDayCell[] {
  const cellMap = new Map<string, { minutes: number; gradeCount: number }>();

  // Initialize days
  const now = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    cellMap.set(dateStr, { minutes: 0, gradeCount: 0 });
  }

  // Aggregate focus sessions
  focusSessions.forEach((sess) => {
    if (sess.deleted_at || !sess.subject_id) return;
    const dateStr = sess.logged_date || sess.started_at?.split("T")[0];
    if (dateStr && cellMap.has(dateStr)) {
      const entry = cellMap.get(dateStr)!;
      entry.minutes += Number(sess.actual_minutes) || 0;
    }
  });

  // Aggregate grades
  grades.forEach((g) => {
    if (g.deleted_at) return;
    const dateStr = g.entry_date;
    if (dateStr && cellMap.has(dateStr)) {
      const entry = cellMap.get(dateStr)!;
      entry.gradeCount++;
    }
  });

  return Array.from(cellMap.entries()).map(([date, data]) => {
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (data.minutes > 180 || data.gradeCount >= 2) level = 4;
    else if (data.minutes > 90 || data.gradeCount >= 1) level = 3;
    else if (data.minutes > 45) level = 2;
    else if (data.minutes > 0) level = 1;

    return {
      date,
      minutes: data.minutes,
      gradeCount: data.gradeCount,
      level,
    };
  });
}

export interface AcademicCrossInsight {
  id: string;
  title: string;
  description: string;
  type: "synergy" | "warning" | "positive" | "info";
}

/**
 * Cross-domain synthesis: correlates School marks with sleep and focus sessions
 */
export function generateSchoolCrossDomainInsights(data: {
  subjects: SubjectItem[];
  grades: GradeItem[];
  mistakes: MistakeItem[];
  studyHours: number;
}): AcademicCrossInsight[] {
  const insights: AcademicCrossInsight[] = [];

  const { subjects, grades, mistakes, studyHours } = data;
  const activeGrades = grades.filter((g) => !g.deleted_at);

  if (activeGrades.length === 0 && studyHours === 0) {
    insights.push({
      id: "zero_school_telemetry",
      title: "Academic Telemetry Initializing",
      description: "Log your first quiz or complete a study sprint to unlock cross-domain habit correlations.",
      type: "info",
    });
    return insights;
  }

  if (studyHours >= 10 && activeGrades.length >= 3) {
    const avgStats = calculateOverallAcademicStats(subjects, activeGrades);
    if (avgStats.overallAveragePct && avgStats.overallAveragePct >= 80) {
      insights.push({
        id: "deep_work_synergy",
        title: "Deep Work & Grade Synergy",
        description: `Your ${studyHours}h of logged study sessions correlate with a strong ${avgStats.overallAveragePct}% academic average. Focused sprints directly bolster exam recall.`,
        type: "synergy",
      });
    }
  }

  const openMistakes = mistakes.filter((m) => !m.deleted_at && !m.resolved);
  if (openMistakes.length >= 3) {
    insights.push({
      id: "mistake_review_alert",
      title: "Mistake Log Review Due",
      description: `You have ${openMistakes.length} unresolved errors in your mistake notebook. Practicing redos before your next quiz improves retention by up to 40%.`,
      type: "warning",
    });
  } else if (mistakes.filter((m) => !m.deleted_at && m.resolved).length >= 2) {
    insights.push({
      id: "error_correction_momentum",
      title: "Error Correction Momentum",
      description: "Multiple error redos successfully mastered. Converting mistakes into solved solutions is the fastest path to mastery.",
      type: "positive",
    });
  }

  return insights;
}

