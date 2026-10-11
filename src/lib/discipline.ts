/**
 * Discipline & Commitments Engine (Stage 7b)
 * Explicit non-prefilled commitments, daily snapshots, and honest progress display
 */

export interface DisciplineCommitment {
  id: string;
  user_id?: string;
  text: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
  deleted_at?: string | null;
}

export interface DisciplineSnapshotItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface DisciplineDailyLog {
  id?: string;
  user_id?: string;
  logged_date: string;
  items: DisciplineSnapshotItem[];
  total_count: number;
  completed_count: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Suggestions for users to pick from when configuring commitments.
 * NEVER pre-filled: user must explicitly choose or write their own.
 */
export const DISCIPLINE_SUGGESTIONS: string[] = [
  "No phone for first 30 mins after waking",
  "No social media before noon",
  "No snacking after 8:00 PM",
  "Drink 2.5L water today",
  "Read 10 pages of a physical book",
  "Cold shower or 10m morning mobility",
  "Zero mindless short-form video (Reels/TikTok)",
  "Evening screen wind-down by 10:30 PM",
  "No snooze button when alarm sounds",
  "Daily journaling / honest self-reflection",
];

/**
 * Create a daily snapshot from active commitments.
 * Ensures editing future commitments will NEVER rewrite past history.
 */
export function createDisciplineDailySnapshot(
  commitments: DisciplineCommitment[],
  existingItems?: DisciplineSnapshotItem[]
): DisciplineSnapshotItem[] {
  const activeList = commitments.filter((c) => c.active && !c.deleted_at);

  if (activeList.length === 0) {
    return [];
  }

  const existingMap = new Map<string, boolean>();
  if (existingItems) {
    for (const item of existingItems) {
      existingMap.set(item.id, item.completed);
    }
  }

  return activeList.map((c) => ({
    id: c.id,
    text: c.text,
    completed: existingMap.get(c.id) ?? false,
  }));
}

/**
 * Primary display formatting:
 * Always show "4 of 5 done" as the main display.
 * Optional percentage is hidden by default.
 */
export function formatDisciplineProgress(
  completedCount: number,
  totalCount: number
): {
  mainDisplay: string;
  percentageDisplay: string;
  isAllCompleted: boolean;
  hasCommitments: boolean;
} {
  if (totalCount === 0) {
    return {
      mainDisplay: "Set your commitments",
      percentageDisplay: "0%",
      isAllCompleted: false,
      hasCommitments: false,
    };
  }

  const pct = Math.round((completedCount / totalCount) * 100);
  return {
    mainDisplay: `${completedCount} of ${totalCount} done`,
    percentageDisplay: `${pct}%`,
    isAllCompleted: completedCount >= totalCount && totalCount > 0,
    hasCommitments: true,
  };
}
