"use client";

import React from "react";
import { Sparkles, Brain, Info, CheckCircle2 } from "lucide-react";
import { MindScoreBreakdown } from "@/lib/mindScore";
import { useI18n } from "@/lib/i18n/I18nContext";

interface MindScoreDialProps {
  scoreData: MindScoreBreakdown;
}

export function MindScoreDial({ scoreData }: MindScoreDialProps) {
  const { locale } = useI18n();
  const { totalScore, label, hasActivity, focusPts, disciplinePts, mathPts, readingPts, screenTimePts } =
    scoreData;

  const scorePct = totalScore !== null ? Math.min(100, Math.max(0, totalScore)) : 0;
  const strokeDashoffset = 283 - (283 * scorePct) / 100;

  return (
    <div className="stitch-card p-6 relative overflow-hidden space-y-4 font-mono">
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
                  <span className="text-[9px] uppercase text-text-muted">
                    {locale === "ar" ? "الدرجة" : "Score"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-text-muted font-bold">--</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-on-surface">
                {locale === "ar" ? "مؤشر الجاهزية الذهنية اليومي" : "Daily Mind Score"}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30 font-bold">
                {label}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant max-w-sm">
              {hasActivity
                ? locale === "ar"
                  ? "تقييم ذهني موحد بيجمع بين التركيز، العادات، الحساب الذهني، القراءة، وتوازن وقت الشاشة."
                  : "Unified cognitive readiness synthesizing focus, habits, mental math, reading & screen balance."
                : locale === "ar"
                ? "مفيش بيانات اتسجلت للنهاردة لسه. سجل جلسة تركيز أو عادات أو قراءة عشان نحسب نتيجتك."
                : "No telemetry logged today. Log focus sessions, daily habits, or reading to compute your score."}
            </p>
          </div>
        </div>
      </div>

      {/* Component Breakdown Pills */}
      {hasActivity && (
        <div className="pt-2 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">
              {locale === "ar" ? "جلسات التركيز" : "Focus Work"}
            </div>
            <div className="font-bold text-tertiary-purple">
              +{focusPts} {locale === "ar" ? "نقطة" : "pts"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">
              {locale === "ar" ? "الالتزامات" : "Discipline"}
            </div>
            <div className="font-bold text-primary-ink">
              +{disciplinePts} {locale === "ar" ? "نقطة" : "pts"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">
              {locale === "ar" ? "الحساب الذهني" : "Math Agility"}
            </div>
            <div className="font-bold text-amber-core">
              +{mathPts} {locale === "ar" ? "نقطة" : "pts"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">
              {locale === "ar" ? "القراءة" : "Reading"}
            </div>
            <div className="font-bold text-secondary-cyan">
              +{readingPts} {locale === "ar" ? "نقطة" : "pts"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-0.5">
            <div className="text-[10px] text-text-muted uppercase">
              {locale === "ar" ? "توازن الشاشة" : "Screen Balance"}
            </div>
            <div className="font-bold text-secondary-cyan">
              +{screenTimePts} {locale === "ar" ? "نقطة" : "pts"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
