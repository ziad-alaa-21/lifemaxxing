/**
 * Mind Weekly Insights Engine (Stage 7c)
 * Multi-domain cognitive correlation synthesis (7-day rolling window)
 */

export interface DailyTelemetrySummary {
  date: string;
  focusMinutes: number;
  disciplineCompleted: number;
  disciplineTotal: number;
  mathAccuracy?: number | null;
  mathAvgSpeedMs?: number | null;
  readingMinutes: number;
  screenTimeTotalMinutes?: number | null;
  sleepHours?: number | null;
  caffeineMg?: number | null;
}

export interface MindInsightItem {
  id: string;
  category: "focus_sleep" | "habits" | "math_agility" | "screen_balance";
  title: string;
  description: string;
  trend: "positive" | "neutral" | "caution";
  metricBadge: string;
}

/**
 * Generate 7-day rolling insights from multi-domain telemetry
 */
export function generateWeeklyMindInsights(
  days: DailyTelemetrySummary[]
): MindInsightItem[] {
  if (!days || days.length === 0) {
    return [
      {
        id: "zero_state",
        category: "habits",
        title: "Telemetry Accumulation",
        description: "Log focus sessions, daily commitments, and sleep to generate personalized cognitive insights.",
        trend: "neutral",
        metricBadge: "Awaiting Data",
      },
    ];
  }

  const insights: MindInsightItem[] = [];

  // 1. Focus & Sleep Correlation
  const daysWithSleepAndFocus = days.filter(
    (d) => d.sleepHours !== undefined && d.sleepHours !== null && d.focusMinutes > 0
  );

  if (daysWithSleepAndFocus.length >= 2) {
    const goodSleepDays = daysWithSleepAndFocus.filter((d) => (d.sleepHours || 0) >= 7);
    const lowSleepDays = daysWithSleepAndFocus.filter((d) => (d.sleepHours || 0) < 7);

    const avgFocusGoodSleep =
      goodSleepDays.length > 0
        ? goodSleepDays.reduce((acc, d) => acc + d.focusMinutes, 0) / goodSleepDays.length
        : 0;
    const avgFocusLowSleep =
      lowSleepDays.length > 0
        ? lowSleepDays.reduce((acc, d) => acc + d.focusMinutes, 0) / lowSleepDays.length
        : 0;

    if (goodSleepDays.length > 0 && lowSleepDays.length > 0 && avgFocusGoodSleep > avgFocusLowSleep) {
      const diffPct = Math.round(((avgFocusGoodSleep - avgFocusLowSleep) / avgFocusLowSleep) * 100);
      insights.push({
        id: "sleep_focus_boost",
        category: "focus_sleep",
        title: "Sleep & Deep Work Synergy",
        description: `Your focus duration averaged ${Math.round(avgFocusGoodSleep)} min on days with 7+ hours of sleep (${diffPct}% higher than low-sleep days).`,
        trend: "positive",
        metricBadge: `+${diffPct}% Focus`,
      });
    }
  }

  // 2. Discipline Consistency
  const totalCommitments = days.reduce((acc, d) => acc + d.disciplineTotal, 0);
  const totalCompleted = days.reduce((acc, d) => acc + d.disciplineCompleted, 0);

  if (totalCommitments > 0) {
    const completionPct = Math.round((totalCompleted / totalCommitments) * 100);
    insights.push({
      id: "discipline_streak",
      category: "habits",
      title: "Commitment Adherence",
      description: `You maintained a ${completionPct}% completion rate across all active discipline commitments over the last 7 days.`,
      trend: completionPct >= 80 ? "positive" : "neutral",
      metricBadge: `${completionPct}% Done`,
    });
  }

  // 3. Mental Math Speed
  const mathDays = days.filter((d) => d.mathAvgSpeedMs && d.mathAvgSpeedMs > 0);
  if (mathDays.length >= 2) {
    const avgSpeedSeconds = (
      mathDays.reduce((acc, d) => acc + (d.mathAvgSpeedMs || 0), 0) /
      mathDays.length /
      1000
    ).toFixed(2);

    insights.push({
      id: "math_speed",
      category: "math_agility",
      title: "Mental Calculation Velocity",
      description: `Average problem resolution speed is currently ${avgSpeedSeconds}s per item across all operations.`,
      trend: "positive",
      metricBadge: `${avgSpeedSeconds}s / item`,
    });
  }

  // Fallback if no specialized insights triggered yet
  if (insights.length === 0) {
    const totalFocusMin = days.reduce((acc, d) => acc + d.focusMinutes, 0);
    insights.push({
      id: "weekly_volume",
      category: "focus_sleep",
      title: "Weekly Deep Work Volume",
      description: `Accumulated ${totalFocusMin} minutes of active deep work across the observed period.`,
      trend: totalFocusMin > 180 ? "positive" : "neutral",
      metricBadge: `${Math.round(totalFocusMin / 60)}h ${totalFocusMin % 60}m`,
    });
  }

  return insights;
}
