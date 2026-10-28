/**
 * todayDisplayQueries.ts
 *
 * Approved read-only display queries for the rebuilt Stitch Today screen.
 * Strictly adheres to existing RLS policies and table schemas.
 * Contains ZERO mutations (no insert/update/delete/upsert).
 */

import { supabase as defaultClient } from "@/lib/supabase/client";
import { calculateSubjectGradeAverage, GradeItem } from "@/lib/school";

export type ActivityMetric = "focus" | "training" | "sleep";
export type ActivityRange = 7 | 30 | 90;

export interface ActivityBarItem {
  key: string;
  label: string;
  fullDate: string;
  value: number;
  formattedValue: string;
  isToday: boolean;
}

export interface ActivitySummaryResult {
  metric: ActivityMetric;
  rangeDays: ActivityRange;
  totalFormatted: string;
  totalMinutes: number;
  totalHours: number;
  bars: ActivityBarItem[];
  percentVsPrevious: number | null;
  hasPreviousData: boolean;
}

export interface TodaySubjectDisplayItem {
  id: string;
  name: string;
  color: string;
  statusLine: string | null;
  deadlineTitle?: string;
  daysToDeadline?: number;
  averagePct?: number | null;
}

/**
 * Formats a duration in minutes to e.g. "14 h 20 m" or "45 m"
 */
export function formatActivityDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h} h ${m} m`;
  if (h > 0) return `${h} h`;
  return `${m} m`;
}

/**
 * Fetches activity summary for the 7 / 30 / 90 day histogram on Today.
 * - Grouped in user timezone.
 * - Focus: completed and ended_early sessions only, summing actual_minutes.
 * - Training: total workout minutes of completed workouts.
 * - Sleep: hours from sleep_logs.
 * - Week: 7 daily bars; Month: 30 daily bars; 3 months: 12 weekly bars.
 * - percentVsPrevious: strictly null unless previous period has data > 0.
 */
export async function fetchWeeklyActivitySummary(
  userId: string,
  timezone: string = "UTC",
  rangeDays: ActivityRange = 7,
  metric: ActivityMetric = "focus",
  client = defaultClient
): Promise<ActivitySummaryResult> {
  const now = new Date();

  // Helper to format Date to YYYY-MM-DD in user timezone
  const formatDateInTz = (d: Date): string => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
    } catch {
      return d.toISOString().split("T")[0];
    }
  };

  const todayStr = formatDateInTz(now);

  // Calculate start of current period and previous period
  const currentStart = new Date(now.getTime() - rangeDays * 86400000);
  const currentStartStr = formatDateInTz(currentStart);
  const previousStart = new Date(currentStart.getTime() - rangeDays * 86400000);
  const previousStartStr = formatDateInTz(previousStart);

  let currentTotalMins = 0;
  let previousTotalMins = 0;

  // Day-by-day mapping for current range
  const dailyValues = new Map<string, number>();

  // Pre-seed all days in current range with 0
  for (let i = rangeDays - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const dayKey = formatDateInTz(day);
    dailyValues.set(dayKey, 0);
  }

  // Mock fixtures for screenshot validation and testing without production mutations
  if (userId === "fixture-seeded") {
    if (metric === "focus") {
      const bars: ActivityBarItem[] = [
        { key: "1", label: "Mon", fullDate: "2026-10-20", value: 120, formattedValue: "2 h 00 m", isToday: false },
        { key: "2", label: "Tue", fullDate: "2026-10-21", value: 155, formattedValue: "2 h 35 m", isToday: false },
        { key: "3", label: "Wed", fullDate: "2026-10-22", value: 185, formattedValue: "3 h 05 m", isToday: true },
        { key: "4", label: "Thu", fullDate: "2026-10-23", value: 135, formattedValue: "2 h 15 m", isToday: false },
        { key: "5", label: "Fri", fullDate: "2026-10-24", value: 175, formattedValue: "2 h 55 m", isToday: false },
        { key: "6", label: "Sat", fullDate: "2026-10-25", value: 95, formattedValue: "1 h 35 m", isToday: false },
        { key: "7", label: "Sun", fullDate: "2026-10-26", value: 65, formattedValue: "1 h 05 m", isToday: false },
      ];
      return {
        metric: "focus",
        rangeDays: 7,
        totalFormatted: "14 h 20 m",
        totalMinutes: 860,
        totalHours: 14.3,
        bars,
        percentVsPrevious: 12,
        hasPreviousData: true,
      };
    } else if (metric === "training") {
      const bars: ActivityBarItem[] = [
        { key: "1", label: "Mon", fullDate: "2026-10-20", value: 60, formattedValue: "1 h 00 m", isToday: false },
        { key: "2", label: "Tue", fullDate: "2026-10-21", value: 0, formattedValue: "0 m", isToday: false },
        { key: "3", label: "Wed", fullDate: "2026-10-22", value: 75, formattedValue: "1 h 15 m", isToday: true },
        { key: "4", label: "Thu", fullDate: "2026-10-23", value: 0, formattedValue: "0 m", isToday: false },
        { key: "5", label: "Fri", fullDate: "2026-10-24", value: 60, formattedValue: "1 h 00 m", isToday: false },
        { key: "6", label: "Sat", fullDate: "2026-10-25", value: 45, formattedValue: "45 m", isToday: false },
        { key: "7", label: "Sun", fullDate: "2026-10-26", value: 0, formattedValue: "0 m", isToday: false },
      ];
      return {
        metric: "training",
        rangeDays: 7,
        totalFormatted: "4 h 00 m",
        totalMinutes: 240,
        totalHours: 4.0,
        bars,
        percentVsPrevious: 8,
        hasPreviousData: true,
      };
    } else {
      const bars: ActivityBarItem[] = [
        { key: "1", label: "Mon", fullDate: "2026-10-20", value: 7.5, formattedValue: "7.5 h", isToday: false },
        { key: "2", label: "Tue", fullDate: "2026-10-21", value: 8.0, formattedValue: "8.0 h", isToday: false },
        { key: "3", label: "Wed", fullDate: "2026-10-22", value: 7.5, formattedValue: "7.5 h", isToday: true },
        { key: "4", label: "Thu", fullDate: "2026-10-23", value: 7.0, formattedValue: "7.0 h", isToday: false },
        { key: "5", label: "Fri", fullDate: "2026-10-24", value: 8.2, formattedValue: "8.2 h", isToday: false },
        { key: "6", label: "Sat", fullDate: "2026-10-25", value: 8.5, formattedValue: "8.5 h", isToday: false },
        { key: "7", label: "Sun", fullDate: "2026-10-26", value: 7.8, formattedValue: "7.8 h", isToday: false },
      ];
      return {
        metric: "sleep",
        rangeDays: 7,
        totalFormatted: "54.5 h",
        totalMinutes: 3270,
        totalHours: 54.5,
        bars,
        percentVsPrevious: 4,
        hasPreviousData: true,
      };
    }
  }

  if (userId === "fixture-empty") {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const bars: ActivityBarItem[] = dayNames.map((d, i) => ({
      key: String(i),
      label: d,
      fullDate: `2026-10-${20 + i}`,
      value: 0,
      formattedValue: "0 m",
      isToday: i === 2,
    }));
    return {
      metric,
      rangeDays,
      totalFormatted: "0 m",
      totalMinutes: 0,
      totalHours: 0,
      bars,
      percentVsPrevious: null,
      hasPreviousData: false,
    };
  }

  if (metric === "focus") {
    // Focus: completed and ended_early sessions only, sum actual_minutes
    const { data } = await client
      .from("focus_sessions")
      .select("logged_date, actual_minutes, status")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("status", ["completed", "ended_early"])
      .gte("logged_date", previousStartStr)
      .lte("logged_date", todayStr);

    if (data) {
      data.forEach((row) => {
        const d = row.logged_date;
        const mins = Number(row.actual_minutes) || 0;
        if (d >= currentStartStr && d <= todayStr) {
          currentTotalMins += mins;
          dailyValues.set(d, (dailyValues.get(d) || 0) + mins);
        } else if (d >= previousStartStr && d < currentStartStr) {
          previousTotalMins += mins;
        }
      });
    }
  } else if (metric === "training") {
    // Training: total minutes of completed workouts
    const { data } = await client
      .from("workouts")
      .select("started_at, completed_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("completed_at", "is", null)
      .gte("started_at", previousStart.toISOString())
      .lte("started_at", now.toISOString());

    if (data) {
      data.forEach((w) => {
        if (!w.started_at || !w.completed_at) return;
        const start = new Date(w.started_at);
        const end = new Date(w.completed_at);
        const diffMins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
        const dayStr = formatDateInTz(start);

        if (dayStr >= currentStartStr && dayStr <= todayStr) {
          currentTotalMins += diffMins;
          dailyValues.set(dayStr, (dailyValues.get(dayStr) || 0) + diffMins);
        } else if (dayStr >= previousStartStr && dayStr < currentStartStr) {
          previousTotalMins += diffMins;
        }
      });
    }
  } else if (metric === "sleep") {
    // Sleep: hours from sleep_logs
    const { data } = await client
      .from("sleep_logs")
      .select("sleep_date, duration_minutes")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("sleep_date", previousStartStr)
      .lte("sleep_date", todayStr);

    if (data) {
      data.forEach((row) => {
        const d = row.sleep_date;
        const mins = Number(row.duration_minutes) || 0;
        if (d >= currentStartStr && d <= todayStr) {
          currentTotalMins += mins;
          dailyValues.set(d, (dailyValues.get(d) || 0) + mins);
        } else if (d >= previousStartStr && d < currentStartStr) {
          previousTotalMins += mins;
        }
      });
    }
  }

  // Construct bar items
  const bars: ActivityBarItem[] = [];

  if (rangeDays === 7) {
    // Daily bars for 7 days
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dailyValues.forEach((val, dateKey) => {
      const parts = dateKey.split("-");
      const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const shortDay = dayNames[dObj.getDay()] || dateKey;
      const isToday = dateKey === todayStr;

      bars.push({
        key: dateKey,
        label: shortDay,
        fullDate: dateKey,
        value: metric === "sleep" ? Number((val / 60).toFixed(1)) : val,
        formattedValue:
          metric === "sleep"
            ? `${(val / 60).toFixed(1)} h`
            : formatActivityDuration(val),
        isToday,
      });
    });
  } else if (rangeDays === 30) {
    // Daily bars for 30 days
    dailyValues.forEach((val, dateKey) => {
      const dayNum = dateKey.split("-")[2] || "";
      const isToday = dateKey === todayStr;
      bars.push({
        key: dateKey,
        label: dayNum,
        fullDate: dateKey,
        value: metric === "sleep" ? Number((val / 60).toFixed(1)) : val,
        formattedValue:
          metric === "sleep"
            ? `${(val / 60).toFixed(1)} h`
            : formatActivityDuration(val),
        isToday,
      });
    });
  } else {
    // 90 days: 12 weekly aggregated bars
    const sortedDays = Array.from(dailyValues.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const weekChunks: { label: string; dateKey: string; totalMins: number; hasToday: boolean }[] = [];

    for (let i = 0; i < sortedDays.length; i += 7) {
      const chunk = sortedDays.slice(i, i + 7);
      const chunkTotal = chunk.reduce((acc, c) => acc + c[1], 0);
      const firstDate = chunk[0][0];
      const hasToday = chunk.some((c) => c[0] === todayStr);
      weekChunks.push({
        label: `W${weekChunks.length + 1}`,
        dateKey: firstDate,
        totalMins: chunkTotal,
        hasToday,
      });
    }

    weekChunks.forEach((w) => {
      bars.push({
        key: w.dateKey,
        label: w.label,
        fullDate: w.dateKey,
        value: metric === "sleep" ? Number((w.totalMins / 60).toFixed(1)) : w.totalMins,
        formattedValue:
          metric === "sleep"
            ? `${(w.totalMins / 60).toFixed(1)} h`
            : formatActivityDuration(w.totalMins),
        isToday: w.hasToday,
      });
    });
  }

  // Calculate percent difference vs previous period
  let percentVsPrevious: number | null = null;
  const hasPreviousData = previousTotalMins > 0;

  if (hasPreviousData) {
    percentVsPrevious = Math.round(
      ((currentTotalMins - previousTotalMins) / previousTotalMins) * 100
    );
  }

  const totalHours = Number((currentTotalMins / 60).toFixed(1));

  return {
    metric,
    rangeDays,
    totalFormatted:
      metric === "sleep"
        ? `${(currentTotalMins / 60).toFixed(1)} h`
        : formatActivityDuration(currentTotalMins),
    totalMinutes: currentTotalMins,
    totalHours,
    bars,
    percentVsPrevious,
    hasPreviousData,
  };
}

/**
 * Fetches up to 3 active subjects for the Today Subjects card.
 * - Excludes archived subjects and soft-deleted subjects.
 * - Excludes completed and soft-deleted deadlines.
 * - Computes grade average using calculateSubjectGradeAverage from school.ts.
 * - Strictly respects existing RLS policies and tables.
 */
export async function fetchTodayActiveSubjects(
  userId: string,
  client = defaultClient
): Promise<TodaySubjectDisplayItem[]> {
  if (userId === "fixture-seeded") {
    return [
      { id: "sub-1", name: "Physics", color: "#3B82F6", statusLine: "Exam in 3 days", daysToDeadline: 3 },
      { id: "sub-2", name: "Calculus", color: "#10B981", statusLine: "Average 91%", averagePct: 91 },
      { id: "sub-3", name: "Chemistry", color: "#F59E0B", statusLine: "2 topics to review", daysToDeadline: 5 },
    ];
  }
  if (userId === "fixture-empty") {
    return [];
  }

  // 1. Fetch top 3 active subjects
  const { data: subjectsData } = await client
    .from("subjects")
    .select("id, name, color, archived")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .neq("archived", true)
    .order("created_at", { ascending: true })
    .limit(3);

  if (!subjectsData || subjectsData.length === 0) {
    return [];
  }

  const subjectIds = subjectsData.map((s) => s.id);

  // 2. Fetch pending deadlines for these subjects
  const { data: deadlinesData } = await client
    .from("deadlines")
    .select("id, subject_id, title, due_date, type, completed")
    .eq("user_id", userId)
    .in("subject_id", subjectIds)
    .eq("completed", false)
    .is("deleted_at", null)
    .order("due_date", { ascending: true });

  // 3. Fetch grades for these subjects to calculate average
  const { data: gradesData } = await client
    .from("grades")
    .select("id, subject_id, mark_achieved, mark_total, weight_pct, deleted_at")
    .eq("user_id", userId)
    .in("subject_id", subjectIds)
    .is("deleted_at", null);

  const nowMs = Date.now();

  return subjectsData.map((subj) => {
    // Find nearest deadline for this subject
    const subjDeadlines = (deadlinesData || []).filter((d) => d.subject_id === subj.id);
    const nearestDl = subjDeadlines[0] || null;

    let daysToDl: number | undefined;
    if (nearestDl?.due_date) {
      daysToDl = Math.max(
        0,
        Math.ceil((new Date(nearestDl.due_date).getTime() - nowMs) / (1000 * 3600 * 24))
      );
    }

    // Calculate grade average via existing school.ts function
    const subjGrades = (gradesData || []).filter((g) => g.subject_id === subj.id) as GradeItem[];
    const avgResult = calculateSubjectGradeAverage(subjGrades);

    let statusLine: string | null = null;
    if (nearestDl && daysToDl !== undefined) {
      if (nearestDl.type === "exam") {
        statusLine = daysToDl === 0 ? "Exam today" : `Exam in ${daysToDl} day${daysToDl === 1 ? "" : "s"}`;
      } else {
        statusLine = daysToDl === 0 ? "Due today" : `Due in ${daysToDl} day${daysToDl === 1 ? "" : "s"}`;
      }
    } else if (avgResult.hasGrades && avgResult.averagePct !== null) {
      statusLine = `Average ${Math.round(avgResult.averagePct)}%`;
    }

    return {
      id: subj.id,
      name: subj.name,
      color: subj.color,
      statusLine,
      deadlineTitle: nearestDl?.title,
      daysToDeadline: daysToDl,
      averagePct: avgResult.averagePct,
    };
  });
}
