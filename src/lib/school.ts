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
  archived: boolean;
  actualMinutes: number;
  totalMinutes: number;
  hoursFormatted: string;
  totalHours: number;
  percentageOfTotal: number;
  sessionCount: number;
}

export interface FocusSessionTelemetry {
  id: string;
  user_id?: string;
  subject_id?: string | null;
  task_name?: string;
  actual_minutes: number;
  status: "completed" | "ended_early" | "abandoned" | "cancelled";
  started_at: string;
  ended_at?: string | null;
  logged_date?: string;
  deleted_at?: string | null;
}

/**
 * Calculates study hours breakdown across subjects.
 * Counts status completed and ended_early, summing actual_minutes. Excludes abandoned.
 * Separates active vs archived subjects.
 */
export function calculateStudyHoursBreakdown(
  subjects: SubjectItem[],
  sessions: FocusSessionTelemetry[],
  windowStart?: Date,
  windowEnd?: Date
): {
  totalMinutes: number;
  totalStudyMinutes: number;
  totalHoursFormatted: string;
  totalStudyHours: number;
  totalSessions: number;
  bySubject: SubjectStudyBreakdown[];
  activeBreakdown: SubjectStudyBreakdown[];
  archivedBreakdown: SubjectStudyBreakdown[];
} {
  const eligibleSessions = sessions.filter((s) => {
    if (s.deleted_at) return false;
    if (s.status !== "completed" && s.status !== "ended_early") return false;
    if (!s.started_at && !s.logged_date) return false;
    if (windowStart || windowEnd) {
      const started = new Date(s.started_at || s.logged_date!).getTime();
      if (windowStart && started < windowStart.getTime()) return false;
      if (windowEnd && started > windowEnd.getTime()) return false;
    }
    return true;
  });

  const subjectMap = new Map<string, SubjectItem>();
  subjects.forEach((sub) => subjectMap.set(sub.id, sub));

  const statsBySubject = new Map<string, { minutes: number; count: number }>();
  let totalMinutes = 0;
  let totalSessions = 0;

  for (const session of eligibleSessions) {
    const mins = Number(session.actual_minutes) || 0;
    if (mins <= 0) continue;

    totalMinutes += mins;
    totalSessions += 1;

    if (session.subject_id) {
      const current = statsBySubject.get(session.subject_id) || { minutes: 0, count: 0 };
      current.minutes += mins;
      current.count += 1;
      statsBySubject.set(session.subject_id, current);
    }
  }

  const activeBreakdown: SubjectStudyBreakdown[] = [];
  const archivedBreakdown: SubjectStudyBreakdown[] = [];

  for (const [subId, stats] of statsBySubject.entries()) {
    const sub = subjectMap.get(subId);
    if (!sub || sub.deleted_at) continue;

    const percentage = totalMinutes > 0 ? Math.round((stats.minutes / totalMinutes) * 1000) / 10 : 0;
    const hoursNum = round1(stats.minutes / 60);

    const item: SubjectStudyBreakdown = {
      subjectId: sub.id,
      subjectName: sub.name,
      subjectColor: sub.color || "#F59E0B",
      archived: !!sub.archived,
      actualMinutes: stats.minutes,
      totalMinutes: stats.minutes,
      hoursFormatted: `${hoursNum}h`,
      totalHours: hoursNum,
      percentageOfTotal: percentage,
      sessionCount: stats.count,
    };

    if (sub.archived) {
      archivedBreakdown.push(item);
    } else {
      activeBreakdown.push(item);
    }
  }

  activeBreakdown.sort((a, b) => b.actualMinutes - a.actualMinutes);
  archivedBreakdown.sort((a, b) => b.actualMinutes - a.actualMinutes);
  const bySubject = [...activeBreakdown, ...archivedBreakdown];
  const totalHoursNum = round1(totalMinutes / 60);

  return {
    totalMinutes,
    totalStudyMinutes: totalMinutes,
    totalHoursFormatted: `${totalHoursNum}h`,
    totalStudyHours: totalHoursNum,
    totalSessions,
    bySubject,
    activeBreakdown,
    archivedBreakdown,
  };
}

export interface WeeklyStudyProgress {
  targetMinutes: number | null;
  targetHoursFormatted: string | null;
  completedMinutes: number;
  completedHoursFormatted: string;
  progressPct: number;
  remainingMinutes: number | null;
  remainingHoursFormatted: string | null;
  isCompleted: boolean;
  isOverTarget: boolean;
}

/**
 * Normalizes time string to standard HH:MM (e.g. "9:00" -> "09:00", "09:00:00" -> "09:00")
 */
export function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return "00:00";
  const parts = timeStr.trim().split(":");
  const h = parts[0] ? parts[0].padStart(2, "0") : "00";
  const m = parts[1] ? parts[1].padStart(2, "0") : "00";
  return `${h}:${m}`;
}

/**
 * Parses time string into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  const normalized = normalizeTimeString(timeStr);
  const [h, m] = normalized.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats minutes from midnight into 24h HH:MM string.
 */
export function formatMinutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(clamped / 60).toString().padStart(2, "0");
  const m = (clamped % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Pure advisory overlap check comparing parsed minutes.
 * Boundary check: adjacent sessions (e.g. 08:59-09:00 and 09:00-10:00) return false (no clash).
 */
export function checkSessionOverlap(
  a: { day_of_week: number; start_time: string; end_time: string },
  b: { day_of_week: number; start_time: string; end_time: string }
): boolean {
  if (a.day_of_week !== b.day_of_week) return false;
  const aStart = parseTimeToMinutes(a.start_time);
  const aEnd = parseTimeToMinutes(a.end_time);
  const bStart = parseTimeToMinutes(b.start_time);
  const bEnd = parseTimeToMinutes(b.end_time);

  return aStart < bEnd && aEnd > bStart;
}

/**
 * Computes dynamic week boundaries from user's first_day_of_week setting.
 * firstDayOfWeek: 0=Sun, 1=Mon, 6=Sat (defaults to 0 Sunday if unset)
 */
export function getWeekStartEnd(
  referenceDate: Date = new Date(),
  firstDayOfWeek: number = 0
): { weekStart: Date; weekEnd: Date } {
  const d = new Date(referenceDate);
  const currentDay = d.getDay(); // 0=Sun .. 6=Sat
  const normalizedSetting = (firstDayOfWeek >= 0 && firstDayOfWeek <= 6) ? firstDayOfWeek : 0;
  const diff = (currentDay - normalizedSetting + 7) % 7;
  
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { weekStart: start, weekEnd: end };
}

/**
 * Calculates current week's study progress against weekly_study_target_minutes.
 */
export function calculateWeeklyStudyProgress(
  weeklyTargetMinutes: number | null | undefined,
  sessions: FocusSessionTelemetry[],
  referenceDate: Date = new Date(),
  firstDayOfWeek: number = 0
): WeeklyStudyProgress {
  const { weekStart, weekEnd } = getWeekStartEnd(referenceDate, firstDayOfWeek);
  const { totalMinutes } = calculateStudyHoursBreakdown([], sessions, weekStart, weekEnd);

  if (weeklyTargetMinutes === null || weeklyTargetMinutes === undefined || weeklyTargetMinutes <= 0) {
    return {
      targetMinutes: null,
      targetHoursFormatted: null,
      completedMinutes: totalMinutes,
      completedHoursFormatted: `${(totalMinutes / 60).toFixed(1)}h`,
      progressPct: 0,
      remainingMinutes: null,
      remainingHoursFormatted: null,
      isCompleted: false,
      isOverTarget: false,
    };
  }

  const target = weeklyTargetMinutes;
  const progressPct = Math.min(100, Math.round((totalMinutes / target) * 100));
  const remaining = Math.max(0, target - totalMinutes);

  return {
    targetMinutes: target,
    targetHoursFormatted: `${(target / 60).toFixed(1)}h`,
    completedMinutes: totalMinutes,
    completedHoursFormatted: `${(totalMinutes / 60).toFixed(1)}h`,
    progressPct,
    remainingMinutes: remaining,
    remainingHoursFormatted: remaining > 0 ? `${(remaining / 60).toFixed(1)}h` : "0h",
    isCompleted: totalMinutes >= target,
    isOverTarget: totalMinutes > target,
  };
}

export interface HeatmapDayCell {
  date: string; // YYYY-MM-DD
  dateStr: string;
  dayOfWeek: number; // 0..6
  actualMinutes: number;
  minutes: number;
  sessionCount: number;
  gradeCount?: number;
  tier: 0 | 1 | 2 | 3 | 4;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapResult {
  days: HeatmapDayCell[];
  weeksCount: number;
  activeDaysLast7: number;
  consistencySummary: string; // "X of the last 7 days studied"
  baselineDailyMinutes: number;
  hasHistory: boolean;
}

/**
 * Generates 12-week study density heatmap with relative tiers based on user baseline.
 * If zero study history: returns empty grid with all tier 0 (no fallback 60m).
 */
export function generate12WeekStudyHeatmap(
  sessions: FocusSessionTelemetry[],
  weeklyTargetMinutes: number | null | undefined,
  referenceDate: Date = new Date(),
  firstDayOfWeek: number = 0,
  userTimeZone: string = "Africa/Cairo"
): HeatmapResult {
  const eligibleSessions = sessions.filter(
    (s) => !s.deleted_at && (s.status === "completed" || s.status === "ended_early") && (s.started_at || s.logged_date)
  );

  const minutesByDateStr = new Map<string, { minutes: number; count: number }>();
  for (const session of eligibleSessions) {
    const rawDate = session.started_at ? new Date(session.started_at) : new Date(session.logged_date!);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateStr = formatter.format(rawDate);
    const cur = minutesByDateStr.get(dateStr) || { minutes: 0, count: 0 };
    cur.minutes += session.actual_minutes || 0;
    cur.count += 1;
    minutesByDateStr.set(dateStr, cur);
  }

  const { weekEnd } = getWeekStartEnd(referenceDate, firstDayOfWeek);
  const totalDays = 84;
  const startDate = new Date(weekEnd);
  startDate.setDate(weekEnd.getDate() - (totalDays - 1));
  startDate.setHours(0, 0, 0, 0);

  let baseline = 0;
  let hasHistory = false;

  if (weeklyTargetMinutes && weeklyTargetMinutes > 0) {
    baseline = weeklyTargetMinutes / 7;
    hasHistory = true;
  } else {
    const nonZeroMinutes: number[] = [];
    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: userTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const dStr = formatter.format(cur);
      const dayData = minutesByDateStr.get(dStr);
      if (dayData && dayData.minutes > 0) {
        nonZeroMinutes.push(dayData.minutes);
      }
    }

    if (nonZeroMinutes.length > 0) {
      hasHistory = true;
      nonZeroMinutes.sort((a, b) => a - b);
      const mid = Math.floor(nonZeroMinutes.length / 2);
      baseline = nonZeroMinutes.length % 2 !== 0 ? nonZeroMinutes[mid] : (nonZeroMinutes[mid - 1] + nonZeroMinutes[mid]) / 2;
    } else {
      baseline = 0; // ZERO history -> no invented fallback
    }
  }

  const cells: HeatmapDayCell[] = [];
  let activeDaysLast7 = 0;

  const last7Cutoff = new Date(referenceDate);
  last7Cutoff.setDate(referenceDate.getDate() - 6);
  last7Cutoff.setHours(0, 0, 0, 0);

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(startDate);
    cur.setDate(startDate.getDate() + i);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dStr = formatter.format(cur);
    const dayData = minutesByDateStr.get(dStr) || { minutes: 0, count: 0 };
    const dayOfWeek = cur.getDay();

    let tier: 0 | 1 | 2 | 3 | 4 = 0;
    if (dayData.minutes > 0 && baseline > 0) {
      if (dayData.minutes < 0.5 * baseline) tier = 1;
      else if (dayData.minutes < 1.0 * baseline) tier = 2;
      else if (dayData.minutes < 1.5 * baseline) tier = 3;
      else tier = 4;
    }

    if (cur >= last7Cutoff && cur <= referenceDate && dayData.minutes > 0) {
      activeDaysLast7++;
    }

    cells.push({
      date: dStr,
      dateStr: dStr,
      dayOfWeek,
      actualMinutes: dayData.minutes,
      minutes: dayData.minutes,
      sessionCount: dayData.count,
      tier,
      level: tier,
    });
  }

  return {
    days: cells,
    weeksCount: 12,
    activeDaysLast7,
    consistencySummary: `${activeDaysLast7} of the last 7 days studied`,
    baselineDailyMinutes: Math.round(baseline),
    hasHistory,
  };
}

export interface AcademicInsightItem {
  id: string;
  ruleKey: "exam_readiness" | "target_grade_drift" | "study_imbalance";
  title: string;
  explanation: string;
  whySeeingThis: string;
  actionText: string;
  actionTab: "practice" | "grades" | "timetable" | "stats";
}

/**
 * Generates respectful academic insights with softened tone ("Worth a look", "Observation").
 * Exam readiness requires >= 3 topics tracked.
 * Study imbalance requires >= 7 full days of focus session history.
 * Strictly no cross-domain sleep claims.
 */
export function generateAcademicInsights(data: {
  subjects: SubjectItem[];
  grades: GradeItem[];
  deadlines: DeadlineItem[];
  topics: AcademicTopicItem[];
  sessions: FocusSessionTelemetry[];
  referenceDate?: Date;
  userTimeZone?: string;
}): AcademicInsightItem[] {
  const {
    subjects,
    grades,
    deadlines,
    topics,
    sessions,
    referenceDate = new Date(),
    userTimeZone = "Africa/Cairo",
  } = data;

  const insights: AcademicInsightItem[] = [];
  const activeSubjects = subjects.filter((s) => !s.deleted_at && !s.archived);
  const nowMs = referenceDate.getTime();

  // 1. Exam Readiness Check
  for (const sub of activeSubjects) {
    const subTopics = topics.filter((t) => !t.deleted_at && t.subject_id === sub.id);
    if (subTopics.length < 3) continue; // Threshold: requires >= 3 topics tracked

    const lowConfidenceTopics = subTopics.filter((t) => t.confidence <= 2);
    const overdueTopics = subTopics.filter((t) => t.next_review_at && new Date(t.next_review_at).getTime() <= nowMs);
    const needsReviewCount = new Set([...lowConfidenceTopics.map((t) => t.id), ...overdueTopics.map((t) => t.id)]).size;

    if (needsReviewCount === 0) continue;

    const upcomingAssessment = deadlines.find((d) => {
      if (d.deleted_at || d.completed || d.subject_id !== sub.id) return false;
      if (d.type !== "exam" && d.type !== "quiz") return false;
      const dueMs = new Date(d.due_date).getTime();
      const diffDays = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });

    if (upcomingAssessment) {
      const diffDays = Math.max(1, Math.round((new Date(upcomingAssessment.due_date).getTime() - nowMs) / (1000 * 60 * 60 * 24)));
      insights.push({
        id: `exam_readiness_${sub.id}`,
        ruleKey: "exam_readiness",
        title: `Worth a look: ${sub.name} Assessment Preparation`,
        explanation: `You have an upcoming ${upcomingAssessment.type} in ${sub.name} in ${diffDays} day${diffDays === 1 ? "" : "s"}, and ${needsReviewCount} tracked topic${needsReviewCount === 1 ? "" : "s"} currently have low confidence or overdue review.`,
        whySeeingThis: `Triggered because ${sub.name} has ${subTopics.length} tracked topics and an assessment due in ${diffDays} days.`,
        actionText: "Review Topics",
        actionTab: "practice",
      });
    }
  }

  // 2. Target Grade Drift
  for (const sub of activeSubjects) {
    if (sub.target_grade === null || sub.target_grade === undefined) continue;
    const subGrades = grades.filter((g) => !g.deleted_at && g.subject_id === sub.id);
    if (subGrades.length < 2) continue;

    const stats = calculateSubjectGradeAverage(subGrades);
    if (stats.averagePct === null) continue;

    const drift = sub.target_grade - stats.averagePct;
    if (drift >= 5.0) {
      insights.push({
        id: `target_drift_${sub.id}`,
        ruleKey: "target_grade_drift",
        title: `Observation: ${sub.name} Grade Variance`,
        explanation: `Based on ${subGrades.length} recorded assessments, ${sub.name} is currently at ${stats.averagePct.toFixed(1)}%, which is ${drift.toFixed(1)}% below your ${sub.target_grade.toFixed(1)}% target.`,
        whySeeingThis: `Triggered because ${sub.name} has ${subGrades.length} graded entries and the average is ${drift.toFixed(1)}% below target.`,
        actionText: "View Grades",
        actionTab: "grades",
      });
    }
  }

  // 3. Study Imbalance (requires >= 7 full days of history)
  const eligibleSessions = sessions.filter(
    (s) => !s.deleted_at && (s.status === "completed" || s.status === "ended_early") && (s.started_at || s.logged_date)
  );

  const sessionDates = new Set(
    eligibleSessions.map((s) => {
      const d = s.started_at ? new Date(s.started_at) : new Date(s.logged_date!);
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: userTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return fmt.format(d);
    })
  );

  if (sessionDates.size >= 7) {
    const sevenDaysAgo = new Date(referenceDate);
    sevenDaysAgo.setDate(referenceDate.getDate() - 7);
    const { totalMinutes, activeBreakdown } = calculateStudyHoursBreakdown(
      activeSubjects,
      eligibleSessions,
      sevenDaysAgo,
      referenceDate
    );

    if (totalMinutes >= 60) {
      for (const sub of activeSubjects) {
        const soonDeadline = deadlines.find((d) => {
          if (d.deleted_at || d.completed || d.subject_id !== sub.id) return false;
          const dueMs = new Date(d.due_date).getTime();
          const diffDays = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 5;
        });

        if (soonDeadline) {
          const subBreakdown = activeBreakdown.find((b) => b.subjectId === sub.id);
          const subMinutes = subBreakdown?.actualMinutes || 0;
          const pct = Math.round((subMinutes / totalMinutes) * 100);

          if (pct < 10) {
            const daysLeft = Math.max(1, Math.round((new Date(soonDeadline.due_date).getTime() - nowMs) / (1000 * 60 * 60 * 24)));
            insights.push({
              id: `study_imbalance_${sub.id}`,
              ruleKey: "study_imbalance",
              title: `Worth a look: ${sub.name} Study Allocation`,
              explanation: `Based on logged focus sessions over the past 7 days, ${sub.name} has a deadline in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${soonDeadline.title}), but accounted for only ${pct}% of your recorded study time (${subMinutes}m of ${Math.round(totalMinutes)}m).`,
              whySeeingThis: `Triggered based on ${sessionDates.size} days of study history, an upcoming deadline in ${daysLeft} days, and under 10% study allocation.`,
              actionText: "Start Focus Session",
              actionTab: "timetable",
            });
          }
        }
      }
    }
  }

  return insights;
}

/**
 * Finds upcoming class today across IANA timezone boundaries (Africa/Cairo DST-safe).
 */
export function getNextClassToday(
  schedule: ScheduleItem[],
  subjects: SubjectItem[],
  now: Date = new Date(),
  timeZone: string = "Africa/Cairo"
): { nextClass: ScheduleItem; subject: SubjectItem; startsInMinutes: number } | null {
  const activeSubjects = new Map(subjects.filter((s) => !s.deleted_at && !s.archived).map((s) => [s.id, s]));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const currentMinutesFromMidnight = hour * 60 + minute;

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDayOfWeek = dayMap[weekdayStr] ?? now.getDay();

  const todayClasses = schedule.filter((item) => {
    if (item.deleted_at) return false;
    if (item.day_of_week !== currentDayOfWeek) return false;
    if (!activeSubjects.has(item.subject_id)) return false;
    const startMin = parseTimeToMinutes(item.start_time);
    return startMin > currentMinutesFromMidnight;
  });

  if (todayClasses.length === 0) return null;

  todayClasses.sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  const nextClass = todayClasses[0];
  const subject = activeSubjects.get(nextClass.subject_id)!;
  const startsInMinutes = parseTimeToMinutes(nextClass.start_time) - currentMinutesFromMidnight;

  return { nextClass, subject, startsInMinutes };
}

