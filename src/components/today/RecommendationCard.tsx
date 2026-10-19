"use client";

import React, { useState } from "react";
import { Sparkles, Info, X, ChevronRight, Moon, Dumbbell, Smartphone, GraduationCap } from "lucide-react";
import { RecommendationOutput } from "@/lib/today";
import { useI18n } from "@/lib/i18n/I18nContext";

interface RecommendationCardProps {
  recommendation: RecommendationOutput;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { locale } = useI18n();
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  const getCategoryBadge = (badge: string) => {
    if (locale !== "ar") return badge;
    if (badge.includes("Recovery")) return "تنبيه استشفاء";
    if (badge.includes("Deep Work")) return "تركيز ذهني";
    if (badge.includes("Session Prep")) return "جاهزية التمرين";
    if (badge.includes("Pillar")) return "توازن اليوم";
    return badge;
  };

  return (
    <>
      <div className="p-5 rounded-2xl bg-surface-container border border-border-subtle relative overflow-hidden space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center border text-xs"
              style={{
                borderColor: `${recommendation.accentColor}40`,
                backgroundColor: `${recommendation.accentColor}15`,
                color: recommendation.accentColor,
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span
              className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border"
              style={{
                borderColor: `${recommendation.accentColor}30`,
                backgroundColor: `${recommendation.accentColor}10`,
                color: recommendation.accentColor,
              }}
            >
              {getCategoryBadge(recommendation.categoryBadge)}
            </span>
          </div>

          <button
            onClick={() => setIsReasoningOpen(true)}
            className="text-[11px] font-mono flex items-center gap-1 text-text-muted hover:text-on-surface transition-colors cursor-pointer"
          >
            <span>{locale === "ar" ? "ليه الاقتراح ده؟" : "See reasoning"}</span>
            <ChevronRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        </div>

        <p className="text-sm font-semibold text-on-surface leading-relaxed text-start">
          {recommendation.headline}
        </p>
      </div>

      {/* "See Reasoning" Drawer / Modal */}
      {isReasoningOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg-darkest/80 backdrop-blur-md"
          onClick={() => setIsReasoningOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-surface-container border border-border-subtle rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-bold font-mono text-on-surface">
                  {locale === "ar" ? "أسباب وتفاصيل الاقتراح" : "Recommendation Reasoning"}
                </h3>
              </div>
              <button
                onClick={() => setIsReasoningOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed text-start">
              {locale === "ar"
                ? "الاقتراح ده مبني بدقة على بياناتك الحقيقية المسجلة وجدول يومك، بدون أي أرقام وهمية."
                : "This recommendation is derived deterministically from your actual telemetry and today's planned session. Zero numbers were invented."}
            </p>

            <div className="space-y-3 pt-1">
              {/* Factor 1: Sleep */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-secondary-cyan">
                  <Moon className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "نوم الليلة اللي فاتت مقارنة بمتوسط ٧ أيام" : "Last Night's Sleep vs 7-Day Average"}</span>
                </div>
                <div className="text-xs text-on-surface font-mono">
                  {recommendation.reasoning.sleepText}
                </div>
              </div>

              {/* Factor 2: Previous Load */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-secondary-cyan">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "حجم مجهود التمرين اللي فات والاستشفاء" : "Previous Session Load & Recovery"}</span>
                </div>
                <div className="text-xs text-on-surface font-mono">
                  {recommendation.reasoning.loadText}
                </div>
              </div>

              {/* Factor 3: Screen Time */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-tertiary-purple">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "معدل استخدام الشاشة والموبايل مؤخرًا" : "Recent Screen Time Telemetry"}</span>
                </div>
                <div className="text-xs text-on-surface font-mono">
                  {recommendation.reasoning.screenTimeText}
                </div>
              </div>

              {/* Factor 4: Academic Exam Countdowns */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-core">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "العد التنازلي للامتحانات" : "Exam Countdowns"}</span>
                </div>
                <div className="text-xs text-on-surface font-mono">
                  {recommendation.reasoning.examText}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsReasoningOpen(false)}
                className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                {locale === "ar" ? "تمام، قفل" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
