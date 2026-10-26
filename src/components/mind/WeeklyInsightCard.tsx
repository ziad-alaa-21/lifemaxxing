"use client";

import React from "react";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { MindInsightItem } from "@/lib/mindInsights";

interface WeeklyInsightCardProps {
  insights: MindInsightItem[];
}

export function WeeklyInsightCard({ insights }: WeeklyInsightCardProps) {
  return (
    <div className="stitch-card p-5 space-y-4 font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-core/10 border border-amber-core/30 flex items-center justify-center text-amber-core">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Weekly Cognitive Insights</h3>
            <p className="text-[10px] text-on-surface-variant">7-day multi-domain synthesis</p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold text-amber-core px-2.5 py-1 rounded-full bg-amber-core/10 border border-amber-core/20">
          Rolling Synthesis
        </span>
      </div>

      <div className="space-y-2.5">
        {insights.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">{item.title}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  item.trend === "positive"
                    ? "bg-emerald-success/15 text-emerald-success border border-emerald-success/30"
                    : item.trend === "caution"
                    ? "bg-amber-core/15 text-amber-core border border-amber-core/30"
                    : "bg-surface-container-high text-text-muted border border-border-subtle"
                }`}
              >
                {item.metricBadge}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
