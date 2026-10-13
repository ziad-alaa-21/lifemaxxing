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
      neededAveragePct: neededRounded,
      status: "unreachable",
      message: `Mathematically unreachable (requires ${neededRounded}% on remaining ${remainingWeight}%)`,
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
