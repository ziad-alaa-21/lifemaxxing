"use client";

import React, { useState } from "react";
import { SleepEntry, calculateSleepScore } from "@/lib/sleep";
import { Moon, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface SleepTrendChartProps {
  entries: SleepEntry[];
  targetHours?: number;
}

type RangeOption = "7D" | "30D" | "90D" | "ALL";

export function SleepTrendChart({ entries, targetHours = 8.0 }: SleepTrendChartProps) {
  const { locale } = useI18n();
  const [range, setRange] = useState<RangeOption>("7D");

  const filteredEntries = React.useMemo(() => {
    const active = (entries || []).filter((e) => !e.deleted_at);
    if (range === "ALL") return active;

    const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    return active.filter((e) => e.sleep_date >= cutoffStr);
  }, [entries, range]);

  // Reverse chronological to chronological for the chart
  const chronEntries = [...filteredEntries].reverse();

  const maxDuration = Math.max(600, ...chronEntries.map((e) => e.duration_minutes));

  return (
    <div className="stitch-card p-6 space-y-4">
      {/* Header with Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary-cyan/10 border border-secondary-cyan/20 flex items-center justify-center text-secondary-cyan">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "مسار مدة وجودة النوم" : "Sleep Duration & Architecture Trend"}
            </h3>
            <p className="text-[11px] text-on-surface-variant font-mono">
              {locale === "ar"
                ? `المدة اليومية مقابل خط الهدف ${targetHours} ساعات`
                : `Daily duration vs ${targetHours}h target line`}
            </p>
          </div>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center bg-surface-container-highest p-1 rounded-xl border border-border-subtle font-mono text-xs">
          {(["7D", "30D", "90D", "ALL"] as RangeOption[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                range === r
                  ? "bg-secondary-cyan text-on-primary shadow-xs"
                  : "text-text-muted hover:text-on-surface"
              }`}
            >
              {r === "7D" && locale === "ar" ? "٧ أيام" : r === "30D" && locale === "ar" ? "٣٠ يوم" : r === "90D" && locale === "ar" ? "٩٠ يوم" : r === "ALL" && locale === "ar" ? "الكل" : r}
            </button>
          ))}
        </div>
      </div>

      {chronEntries.length === 0 ? (
        <div className="py-12 border border-dashed border-border-subtle rounded-xl flex flex-col items-center justify-center text-center p-4">
          <Calendar className="w-8 h-8 text-text-muted mb-2 stroke-1" />
          <p className="text-xs font-mono text-text-muted">
            {locale === "ar"
              ? `مفيش بيانات نوم مسجلة في فترة ${range === "7D" ? "٧ أيام" : range === "30D" ? "٣٠ يوم" : range === "90D" ? "٩٠ يوم" : "الكل"}.`
              : `No sleep logs recorded in this ${range} window.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {/* Visual Bars Container */}
          <div className="h-44 w-full flex items-end gap-1.5 sm:gap-2.5 pt-4 pb-2 border-b border-border-subtle overflow-x-auto">
            {chronEntries.map((e) => {
              const heightPct = Math.min(100, (e.duration_minutes / maxDuration) * 100);
              const scoreObj = calculateSleepScore(
                e.duration_minutes,
                targetHours,
                e.quality_rating,
                e.awakenings_count
              );
              const hours = (e.duration_minutes / 60).toFixed(1);

              return (
                <div
                  key={e.id}
                  className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center gap-1 group relative h-full justify-end"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-highest border border-border-subtle rounded-lg px-2 py-1 text-[10px] font-mono pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    {e.sleep_date}: {hours}{locale === "ar" ? "س" : "h"} | {locale === "ar" ? "التقييم" : "Score"} {scoreObj.score}
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full rounded-t-md transition-all duration-300 relative group-hover:brightness-125"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: scoreObj.hexColor,
                      opacity: 0.85,
                    }}
                  />

                  {/* Date label */}
                  <span className="text-[9px] font-mono text-text-muted truncate w-full text-center">
                    {e.sleep_date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-text-muted pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-ink" />
                <span>{locale === "ar" ? "ممتاز (≥85)" : "Strong (\u226585)"}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-cyan" />
                <span>{locale === "ar" ? "جيد (50-84)" : "Good (50-84)"}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]" />
                <span>{locale === "ar" ? "ضعيف (<50)" : "Poor (<50)"}</span>
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant">
              {locale === "ar"
                ? `الهدف: ${targetHours} ساعات لكل ليلة`
                : `Target: ${targetHours}h per night`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
