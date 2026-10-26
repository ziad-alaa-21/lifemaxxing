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
    if (badge.includes("Deep Work") || badge.includes("Cognitive Focus")) return "تركيز ذهني";
    if (badge.includes("Missing Telemetry") || badge.includes("Missing")) return "بيانات ناقصة";
    if (badge.includes("Baseline Calibrating")) return "معايرة الأساس";
    if (badge.includes("Session Prep") || badge.includes("Training Calibration")) return "جاهزية التمرين";
    if (badge.includes("Strength & Load")) return "أحمال التمرين";
    if (badge.includes("Academic Priority")) return "أولوية دراسية";
    if (badge.includes("Pillar")) return "توازن اليوم";
    return badge;
  };

  return (
    <>
      <div className="p-6 rounded-[20px] bg-white border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)] relative overflow-hidden space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center border text-xs"
              style={{
                borderColor: `${recommendation.accentColor}40`,
                backgroundColor: `${recommendation.accentColor}15`,
                color: recommendation.accentColor,
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <span
              className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
              style={{
                borderColor: `${recommendation.accentColor}30`,
                backgroundColor: `${recommendation.accentColor}12`,
                color: recommendation.accentColor,
              }}
            >
              {getCategoryBadge(recommendation.categoryBadge)}
            </span>
          </div>

          <button
            onClick={() => setIsReasoningOpen(true)}
            className="text-xs font-medium flex items-center gap-1 text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
          >
            <span>{locale === "ar" ? "ليه الاقتراح ده؟" : "See reasoning"}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        <p className="text-[15px] font-medium text-[#14161A] leading-relaxed text-start">
          {recommendation.headline}
        </p>
      </div>

      {/* "See Reasoning" Drawer / Modal */}
      {isReasoningOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#14161A]/40 backdrop-blur-sm"
          onClick={() => setIsReasoningOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white border border-[#E3E5F0] rounded-t-[24px] sm:rounded-[24px] p-6 shadow-[0_24px_60px_rgba(20,22,26,0.18)] relative space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[#ECEEFA]">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#5B6270]" />
                <h3 className="text-sm font-medium text-[#14161A]">
                  {locale === "ar" ? "أسباب وتفاصيل الاقتراح" : "Recommendation Reasoning"}
                </h3>
              </div>
              <button
                onClick={() => setIsReasoningOpen(false)}
                className="w-8 h-8 rounded-[10px] bg-[#F3F4FB] border border-[#E3E5F0] flex items-center justify-center text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5B6270] leading-relaxed text-start">
              {locale === "ar"
                ? "الاقتراح ده مبني بدقة على بياناتك الحقيقية المسجلة وجدول يومك، بدون أي أرقام وهمية."
                : "This recommendation is derived deterministically from your actual telemetry and today's planned session. Zero numbers were invented."}
            </p>

            <div className="space-y-3 pt-1">
              {/* Factor 1: Sleep */}
              <div className="p-3.5 rounded-[14px] bg-[#F8F9FD] border border-[#ECEEFA] space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-medium text-[#1E3A9E]">
                  <Moon className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "نوم الليلة اللي فاتت مقارنة بمتوسط ٧ أيام" : "Last Night's Sleep vs 7-Day Average"}</span>
                </div>
                <div className="text-xs text-[#14161A] tabular-nums">
                  {recommendation.reasoning.sleepText}
                </div>
              </div>

              {/* Factor 2: Previous Load */}
              <div className="p-3.5 rounded-[14px] bg-[#F8F9FD] border border-[#ECEEFA] space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-medium text-[#1E3A9E]">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "حجم مجهود التمرين اللي فات والاستشفاء" : "Previous Session Load & Recovery"}</span>
                </div>
                <div className="text-xs text-[#14161A] tabular-nums">
                  {recommendation.reasoning.loadText}
                </div>
              </div>

              {/* Factor 3: Screen Time */}
              <div className="p-3.5 rounded-[14px] bg-[#F8F9FD] border border-[#ECEEFA] space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-medium text-[#5B21B6]">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "معدل استخدام الشاشة والموبايل مؤخرًا" : "Recent Screen Time Telemetry"}</span>
                </div>
                <div className="text-xs text-[#14161A] tabular-nums">
                  {recommendation.reasoning.screenTimeText}
                </div>
              </div>

              {/* Factor 4: Academic Exam Countdowns */}
              <div className="p-3.5 rounded-[14px] bg-[#F8F9FD] border border-[#ECEEFA] space-y-1 text-start">
                <div className="flex items-center gap-2 text-xs font-medium text-[#9D174D]">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "العد التنازلي للامتحانات" : "Exam Countdowns"}</span>
                </div>
                <div className="text-xs text-[#14161A] tabular-nums">
                  {recommendation.reasoning.examText}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsReasoningOpen(false)}
                className="w-full py-2.5 rounded-[12px] bg-[#14161A] hover:bg-[#23272F] text-white text-xs font-medium transition-colors cursor-pointer"
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
