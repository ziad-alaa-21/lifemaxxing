import React, { useState } from "react";
import { HeatmapResult, HeatmapDayCell } from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";

interface StudyHeatmapProps {
  heatmapData: HeatmapResult;
  firstDayOfWeek?: number;
}

const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function StudyHeatmap({ heatmapData, firstDayOfWeek = 0 }: StudyHeatmapProps) {
  const { locale } = useI18n();
  const [activeCell, setActiveCell] = useState<HeatmapDayCell | null>(null);

  const dayLabels = locale === "ar" ? DAY_LABELS_AR : DAY_LABELS_EN;

  // Group 84 days into columns (12 weeks)
  const columns: HeatmapDayCell[][] = [];
  for (let w = 0; w < 12; w++) {
    columns.push(heatmapData.days.slice(w * 7, (w + 1) * 7));
  }

  // Ordered day labels based on firstDayOfWeek
  const orderedDayLabels = Array.from({ length: 7 }, (_, i) => {
    const dayIdx = (firstDayOfWeek + i) % 7;
    return dayLabels[dayIdx];
  });

  return (
    <div className="stitch-card p-5 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
        <div>
          <h3 className="text-sm font-bold text-on-surface">
            {locale === "ar" ? "نشاط المذاكرة المستمر" : "Study Activity"}
          </h3>
          <p className="text-xs text-text-muted">
            {locale === "ar"
              ? "مبني على جلسات التركيز العميق المسجلة"
              : "Built from logged deep work focus sessions"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            🔥 {heatmapData.consistencySummary}
          </span>
        </div>
      </div>

      {/* Heatmap Matrix */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="inline-flex gap-1.5 min-w-full">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-1.5 pr-1 rtl:pr-0 rtl:pl-1 text-[10px] text-text-muted select-none">
            {orderedDayLabels.map((lbl, idx) => (
              <div key={idx} className="h-3.5 flex items-center">
                {idx % 2 === 1 ? lbl : ""}
              </div>
            ))}
          </div>

          {/* 12 Columns */}
          <div className="flex gap-1.5 flex-1">
            {columns.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5 flex-1">
                {week.map((cell) => {
                  const isSelected = activeCell?.dateStr === cell.dateStr;
                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => setActiveCell(isSelected ? null : cell)}
                      onMouseEnter={() => setActiveCell(cell)}
                      className={`h-3.5 w-full rounded-[3px] border transition-all heatmap-cell-${cell.tier} cursor-pointer ${
                        isSelected ? "ring-2 ring-amber-400 scale-110 z-10" : ""
                      }`}
                      aria-label={`${cell.dateStr}: ${cell.actualMinutes} mins`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Card on tap/hover */}
      <div className="min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-xl bg-surface-container-high/60 border border-border-subtle/50 text-xs">
        {activeCell ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-on-surface">{activeCell.dateStr}</span>
              <span className="text-text-muted">•</span>
              <span className="text-amber-700 font-bold">
                {activeCell.actualMinutes > 0
                  ? locale === "ar"
                    ? `${activeCell.actualMinutes} دقيقة مذاكرة`
                    : `${activeCell.actualMinutes} minutes studied`
                  : locale === "ar"
                  ? "مفيش مذاكرة مسجلة"
                  : "No study logged"}
              </span>
            </div>
            <span className="text-[11px] text-text-muted">
              {locale === "ar"
                ? `${activeCell.sessionCount} جلسة`
                : `${activeCell.sessionCount} session${activeCell.sessionCount === 1 ? "" : "s"}`}
            </span>
          </>
        ) : (
          <span className="text-text-muted italic text-[11px]">
            {locale === "ar"
              ? "اضغط على أي مربع لعرض تفاصيل تركيز اليوم ده"
              : "Tap any square to view daily focus telemetry"}
          </span>
        )}
      </div>

      {/* Legend & Baseline Info */}
      <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border-subtle/40">
        <div>
          {heatmapData.hasHistory ? (
            <span>
              {locale === "ar" ? "المعدل اليومي: " : "Baseline: "}
              <span className="text-on-surface font-medium">
                {heatmapData.baselineDailyMinutes} {locale === "ar" ? "د/يوم" : "m/day"}
              </span>
            </span>
          ) : (
            <span>{locale === "ar" ? "لسه مفيش بيانات سابقة" : "Zero history logged"}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span>{locale === "ar" ? "أقل" : "Less"}</span>
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-0 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-1 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-2 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-3 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-4 border" />
          <span>{locale === "ar" ? "أكتر" : "More"}</span>
        </div>
      </div>
    </div>
  );
}
