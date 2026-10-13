"use client";

import React, { useState } from "react";
import { AcademicInsightItem } from "@/lib/school";

interface AcademicInsightsCardProps {
  insights: AcademicInsightItem[];
  onNavigateTab: (tab: "practice" | "grades" | "timetable" | "stats") => void;
}

export function AcademicInsightsCard({
  insights,
  onNavigateTab,
}: AcademicInsightsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (insights.length === 0) {
    return (
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle shadow-sm">
        <h3 className="text-sm font-bold text-on-surface mb-1">Academic Insights</h3>
        <p className="text-xs text-text-muted">
          All study patterns and assessments are balanced. Insights will appear as coursework progresses.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-border-subtle/50">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Academic Observations</h3>
          <p className="text-xs text-text-muted">
            Telemetry-driven suggestions based on your logged sessions and topics
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-amber-300 border border-border-subtle">
          {insights.length} note{insights.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-surface-container-high/50 border border-border-subtle/70 space-y-2.5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">💡</span>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action & Why Toggle */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="text-[11px] text-text-muted hover:text-on-surface hover:underline"
                >
                  {isExpanded ? "Hide details" : "Why am I seeing this?"}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab(item.actionTab)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors"
                >
                  {item.actionText} →
                </button>
              </div>

              {isExpanded && (
                <div className="p-2.5 rounded-lg bg-surface-container border border-border-subtle text-[11px] text-text-muted">
                  <span className="font-semibold text-on-surface">Data rationale:</span>{" "}
                  {item.whySeeingThis}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
