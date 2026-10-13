"use client";

import React, { useState } from "react";
import { HeatmapResult, HeatmapDayCell } from "@/lib/school";

interface StudyHeatmapProps {
  heatmapData: HeatmapResult;
  firstDayOfWeek?: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function StudyHeatmap({ heatmapData, firstDayOfWeek = 0 }: StudyHeatmapProps) {
  const [activeCell, setActiveCell] = useState<HeatmapDayCell | null>(null);

  // Group 84 days into columns (12 weeks)
  const columns: HeatmapDayCell[][] = [];
  for (let w = 0; w < 12; w++) {
    columns.push(heatmapData.days.slice(w * 7, (w + 1) * 7));
  }

  // Ordered day labels based on firstDayOfWeek
  const orderedDayLabels = Array.from({ length: 7 }, (_, i) => {
    const dayIdx = (firstDayOfWeek + i) % 7;
    return DAY_LABELS[dayIdx];
  });

  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle shadow-sm space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Study Activity</h3>
          <p className="text-xs text-text-muted">
            Built from logged deep work focus sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            🔥 {heatmapData.consistencySummary}
          </span>
        </div>
      </div>

      {/* Heatmap Matrix */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="inline-flex gap-1.5 min-w-full">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-1.5 pr-1 text-[10px] text-text-muted select-none">
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
                      className={`h-3.5 w-full rounded-[3px] border transition-all heatmap-cell-${cell.tier} ${
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
              <span className="text-amber-300 font-bold">
                {activeCell.actualMinutes > 0
                  ? `${activeCell.actualMinutes} minutes studied`
                  : "No study logged"}
              </span>
            </div>
            <span className="text-[11px] text-text-muted">
              {activeCell.sessionCount} session{activeCell.sessionCount === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="text-text-muted italic text-[11px]">
            Tap any square to view daily focus telemetry
          </span>
        )}
      </div>

      {/* Legend & Baseline Info */}
      <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border-subtle/40">
        <div>
          {heatmapData.hasHistory ? (
            <span>
              Baseline: <span className="text-on-surface font-medium">{heatmapData.baselineDailyMinutes}m/day</span>
            </span>
          ) : (
            <span>Zero history logged</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-0 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-1 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-2 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-3 border" />
          <div className="w-2.5 h-2.5 rounded-[2px] heatmap-cell-4 border" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
