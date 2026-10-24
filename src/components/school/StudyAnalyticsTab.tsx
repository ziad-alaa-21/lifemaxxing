"use client";

import React, { useState } from "react";
import {
  SubjectItem,
  FocusSessionTelemetry,
  HeatmapResult,
  AcademicInsightItem,
  calculateStudyHoursBreakdown,
} from "@/lib/school";
import { WeeklyTargetCard } from "./WeeklyTargetCard";
import { StudyHeatmap } from "./StudyHeatmap";
import { AcademicInsightsCard } from "./AcademicInsightsCard";
import { useI18n } from "@/lib/i18n/I18nContext";

interface StudyAnalyticsTabProps {
  subjects: SubjectItem[];
  sessions: FocusSessionTelemetry[];
  weeklyTargetMinutes: number | null;
  heatmapData: HeatmapResult;
  insights: AcademicInsightItem[];
  onUpdateTarget: (minutes: number | null) => Promise<void>;
  onNavigateTab: (tab: "practice" | "grades" | "timetable" | "stats") => void;
  firstDayOfWeek?: number;
}

export function StudyAnalyticsTab({
  subjects,
  sessions,
  weeklyTargetMinutes,
  heatmapData,
  insights,
  onUpdateTarget,
  onNavigateTab,
  firstDayOfWeek = 0,
}: StudyAnalyticsTabProps) {
  const { locale } = useI18n();
  const [showArchived, setShowArchived] = useState(false);

  const {
    totalMinutes,
    totalHoursFormatted,
    activeBreakdown,
    archivedBreakdown,
  } = calculateStudyHoursBreakdown(subjects, sessions);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Weekly Target Card */}
      <WeeklyTargetCard
        weeklyTargetMinutes={weeklyTargetMinutes}
        completedMinutes={totalMinutes}
        onUpdateTarget={onUpdateTarget}
      />

      {/* 2. Subject Study Hours Breakdown */}
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-border-subtle/50">
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              {locale === "ar" ? "توزيع ساعات المذاكرة والتركيز" : "Subject Study Breakdown"}
            </h3>
            <p className="text-xs text-text-muted">
              {locale === "ar"
                ? "توزيع جلسات التركيز العميق على المواد الدراسية النشطة"
                : "Deep work hours distribution across active coursework"}
            </p>
          </div>
          <span className="text-xs font-bold text-on-surface">
            {locale === "ar" ? `الإجمالي: ${totalHoursFormatted}` : `Total: ${totalHoursFormatted}`}
          </span>
        </div>

        {activeBreakdown.length === 0 ? (
          <p className="text-xs text-text-muted py-3 text-center">
            {locale === "ar"
              ? "لسه مفيش جلسات مذاكرة مسجلة للمواد النشطة."
              : "No study sessions logged for active subjects yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {activeBreakdown.map((item) => (
              <div key={item.subjectId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.subjectColor }}
                    />
                    <span className="font-semibold text-on-surface truncate">
                      {item.subjectName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted flex-shrink-0">
                    <span className="font-mono font-medium text-on-surface">{item.hoursFormatted}</span>
                    <span className="text-[11px]">({item.percentageOfTotal}%)</span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.percentageOfTotal}%`,
                      backgroundColor: item.subjectColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archived Subjects Section (Muted in history only) */}
        {archivedBreakdown.length > 0 && (
          <div className="pt-2 border-t border-border-subtle/40">
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs text-text-muted hover:text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{showArchived ? "▼" : "▶"}</span>
              <span>
                {locale === "ar"
                  ? `أرشيف المواد السابقة (${archivedBreakdown.length})`
                  : `Archived Courses History (${archivedBreakdown.length})`}
              </span>
            </button>

            {showArchived && (
              <div className="mt-3 space-y-2.5 pl-2 rtl:pl-0 rtl:pr-2 opacity-60">
                {archivedBreakdown.map((item) => (
                  <div key={item.subjectId} className="flex items-center justify-between text-xs">
                    <span className="truncate text-text-muted">
                      {item.subjectName} <span className="italic">{locale === "ar" ? "(مؤرشفة)" : "(Archived)"}</span>
                    </span>
                    <span className="font-mono text-text-muted">{item.hoursFormatted}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Study Activity Heatmap */}
      <StudyHeatmap heatmapData={heatmapData} firstDayOfWeek={firstDayOfWeek} />

      {/* 4. Academic Insights Card */}
      <AcademicInsightsCard insights={insights} onNavigateTab={onNavigateTab} />
    </div>
  );
}
