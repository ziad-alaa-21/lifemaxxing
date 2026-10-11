"use client";

import React from "react";
import { Sparkles, Brain, Info, CheckCircle2 } from "lucide-react";
import { MindScoreBreakdown } from "@/lib/mindScore";

interface MindScoreDialProps {
  scoreData: MindScoreBreakdown;
}

export function MindScoreDial({ scoreData }: MindScoreDialProps) {
  const { totalScore, label, hasActivity, focusPts, disciplinePts, mathPts, readingPts, screenTimePts } =
    scoreData;

  const scorePct = totalScore !== null ? Math.min(100, Math.max(0, totalScore)) : 0;
  const strokeDashoffset = 283 - (283 * scorePct) / 100;

  return (
    <div className="p-6 rounded-3xl bg-surface-container border border-border-subtle relative overflow-hidden space-y-4 font-mono">
      <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary-purple/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Dial & Score */}
        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-surface-container-high"
                strokeWidth="8"
                fill="transparent"
              />
              {totalScore !== null && (
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-tertiary-purple transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              )}
            </svg>

            {/* Inner text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {totalScore !== null ? (
                <>
                  <span className="text-2xl font-extrabold text-on-surface">{totalScore}</span>
                  <span className="text-[9px] uppercase text-text-muted">Score</span>
                </>
              ) : (
                <span className="text-xs text-text-muted font-bold">--</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-on-surface">Daily Mind Score</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30 font-bold">
                {label}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant max-w-sm">
              {hasActivity
                ? "Unified cognitive readiness synthesizing focus, habits, mental math, reading & screen balance."
                : "No telemetry logged today. Log focus sessions, daily habits, or reading to compute your score."}
            </p>
          </div>
        </div>
      </div>

      {/* Component Breakdown Pills */}
      {hasActivity && (
        <div className="pt-2 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">Focus Work</div>
            <div className="font-bold text-tertiary-purple">+{focusPts} pts</div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">Discipline</div>
            <div className="font-bold text-primary-lime">+{disciplinePts} pts</div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">Math Agility</div>
            <div className="font-bold text-amber-core">+{mathPts} pts</div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">Reading</div>
            <div className="font-bold text-sky-400">+{readingPts} pts</div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">Screen Balance</div>
            <div className="font-bold text-secondary-cyan">+{screenTimePts} pts</div>
          </div>
        </div>
      )}
    </div>
  );
}
