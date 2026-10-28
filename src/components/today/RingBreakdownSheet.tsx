"use client";

import React from "react";
import { X } from "lucide-react";
import { RingResult } from "@/lib/today";
import { useI18n } from "@/lib/i18n/I18nContext";

interface RingBreakdownSheetProps {
  ring: RingResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RingBreakdownSheet({ ring, isOpen, onClose }: RingBreakdownSheetProps) {
  const { locale } = useI18n();
  if (!isOpen || !ring) return null;

  const getDomainTitle = (domain: string, fallback: string) => {
    if (locale !== "ar") return `${fallback} Ring Breakdown`;
    if (domain === "body") return "تفاصيل حلقة الجسم";
    if (domain === "mind") return "تفاصيل حلقة العقل";
    if (domain === "school") return "تفاصيل حلقة الدراسة";
    return `تفاصيل حلقة ${fallback}`;
  };

  const getStatusSubtitle = () => {
    if (locale === "ar") {
      if (ring.status === "not_set_up") return "الأهداف مش متظبطة في الإعدادات لسه";
      if (ring.status === "no_data") return "مفيش بيانات اتسجلت للنهاردة لسه";
      return "معدل تنفيذك للنهاردة قصاد الأهداف";
    }
    if (ring.status === "not_set_up") return "Protocol targets not configured";
    if (ring.status === "no_data") return "No telemetry logged today";
    return "Daily execution vs targets";
  };

  const formatComponentName = (name: string) => {
    if (locale !== "ar") return name;
    if (name.includes("Log last night's sleep") || name.toLowerCase().includes("sleep")) return "تسجيل نوم امبارح";
    if (name.includes("Food logged today") || name.toLowerCase().includes("food") || name.toLowerCase().includes("meal")) return "سجلت أكلك النهاردة";
    if (name.includes("Water target reached") || name.toLowerCase().includes("water")) return "وصلت لهدف المية";
    if (name.includes("Workout planned") || name.toLowerCase().includes("workout")) return "التمرين المتخطط له";
    if (name.includes("Daily check-in") || name.toLowerCase().includes("check-in")) return "تسجيل الحالة اليومية";
    if (name.includes("Hit focus time goal") || name.toLowerCase().includes("focus")) return "حققت وقت التركيز";
    if (name.includes("Complete daily habits") || name.toLowerCase().includes("habits") || name.toLowerCase().includes("discipline")) return "العادات اليومية";
    if (name.includes("Deadlines due today") || name.toLowerCase().includes("deadline")) return "تسليمات النهاردة";
    if (name.includes("Daily study target") || name.toLowerCase().includes("study")) return "هدف المذاكرة اليومي";
    return name;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#14161A]/40 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white border border-[#E3E5F0] rounded-t-[24px] sm:rounded-[24px] p-6 shadow-[0_24px_60px_rgba(20,22,26,0.18)] relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#ECEEFA] mb-5">
          <div className="flex items-center gap-3">
            <div
              className="px-3 py-1.5 rounded-[12px] flex flex-col items-center justify-center border font-medium tabular-nums text-xs"
              style={{
                borderColor: `${ring.colorHex}40`,
                backgroundColor: `${ring.colorHex}15`,
                color: ring.colorHex,
              }}
            >
              <span>{ring.displayText}</span>
              {ring.ringPercent !== null && (
                <span className="text-[10px] opacity-75 font-normal">
                  {ring.ringPercent}%
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-medium text-[#14161A]">
                {getDomainTitle(ring.domain, ring.label)}
              </h3>
              <p className="text-xs text-[#5B6270]">
                {getStatusSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[10px] bg-[#F3F4FB] border border-[#E3E5F0] flex items-center justify-center text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Components List */}
        <div className="space-y-3.5">
          {ring.components.map((comp, idx) => {
            const isUnconfigured = comp.status === "not_set_up";

            return (
              <div
                key={idx}
                className="p-4 rounded-[14px] bg-[#F8F9FD] border border-[#ECEEFA] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#14161A]">
                    {formatComponentName(comp.name)}
                  </span>
                  <span
                    className="text-xs font-medium tabular-nums"
                    style={{
                      color:
                        comp.percent !== null
                          ? ring.colorHex
                          : "#5B6270",
                    }}
                  >
                    {comp.percent !== null
                      ? `${comp.percent}%`
                      : isUnconfigured
                      ? (locale === "ar" ? "مش متحدد" : "Not set up")
                      : (locale === "ar" ? "مفيش داتا" : "No data")}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#ECEEFA] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${comp.percent ?? 0}%`,
                      backgroundColor:
                        comp.percent !== null
                          ? ring.colorHex
                          : "transparent",
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] tabular-nums text-[#5B6270] pt-0.5">
                  <span>{locale === "ar" ? "الهدف:" : "Target:"} {comp.plannedText}</span>
                  <span className="text-[#14161A] font-medium">
                    {comp.doneText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delta note */}
        {ring.deltaVsYesterday !== null && (
          <div className="mt-5 p-3.5 rounded-[14px] bg-[#F8F9FD] border border-[#ECEEFA] flex items-center justify-between text-xs tabular-nums">
            <span className="text-[#5B6270]">{locale === "ar" ? "مقارنة بإمبارح:" : "vs Yesterday:"}</span>
            <span
              className={
                ring.deltaVsYesterday >= 0
                  ? "text-[#15803D] font-medium"
                  : "text-[#5B6270] font-medium"
              }
            >
              {ring.deltaVsYesterday > 0
                ? `+${ring.deltaVsYesterday}%`
                : `${ring.deltaVsYesterday}%`}
            </span>
          </div>
        )}

        {/* Section Link */}
        <div className="mt-5">
          <a
            href={ring.domain === "body" ? "/body" : ring.domain === "mind" ? "/mind" : "/school"}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-[12px] bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#2563EB] text-xs font-medium transition-colors"
          >
            <span>{locale === "ar" ? "افتح القسم ده" : `Open ${ring.label || ring.domain} section`}</span>
          </a>
        </div>

        {/* Close Button */}
        <div className="mt-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-[12px] bg-[#14161A] hover:bg-[#23272F] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            {locale === "ar" ? "قفل التفاصيل" : "Close Breakdown"}
          </button>
        </div>
      </div>
    </div>
  );
}
