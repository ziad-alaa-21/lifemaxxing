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
    if (name.toLowerCase().includes("workout")) return "التمرين";
    if (name.toLowerCase().includes("sleep")) return "النوم";
    if (name.toLowerCase().includes("nutrition") || name.toLowerCase().includes("calories")) return "التغذية";
    if (name.toLowerCase().includes("focus")) return "التركيز";
    if (name.toLowerCase().includes("discipline") || name.toLowerCase().includes("habits")) return "الالتزام";
    if (name.toLowerCase().includes("grade")) return "الدرجات";
    if (name.toLowerCase().includes("deadline")) return "المواعيد";
    if (name.toLowerCase().includes("practice") || name.toLowerCase().includes("review")) return "المراجعة";
    return name;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg-darkest/80 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-surface-container border border-border-subtle rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border font-mono font-bold text-sm"
              style={{
                borderColor: `${ring.colorHex}40`,
                backgroundColor: `${ring.colorHex}15`,
                color: ring.colorHex,
              }}
            >
              {ring.ringPercent !== null ? `${ring.ringPercent}%` : "--"}
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-on-surface">
                {getDomainTitle(ring.domain, ring.label)}
              </h3>
              <p className="text-xs text-text-muted">
                {getStatusSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
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
                className="p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface">
                    {formatComponentName(comp.name)}
                  </span>
                  <span
                    className="text-xs font-mono font-bold"
                    style={{
                      color:
                        comp.percent !== null
                          ? ring.colorHex
                          : "var(--text-muted)",
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
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
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

                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted pt-0.5">
                  <span>{locale === "ar" ? "الهدف:" : "Target:"} {comp.plannedText}</span>
                  <span className="text-on-surface-variant font-medium">
                    {comp.doneText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delta note */}
        {ring.deltaVsYesterday !== null && (
          <div className="mt-5 p-3 rounded-xl bg-surface-container-high/60 border border-border-subtle flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">{locale === "ar" ? "مقارنة بإمبارح:" : "vs Yesterday:"}</span>
            <span
              className={
                ring.deltaVsYesterday >= 0
                  ? "text-status-success font-bold"
                  : "text-text-muted font-bold"
              }
            >
              {ring.deltaVsYesterday > 0
                ? `+${ring.deltaVsYesterday}%`
                : `${ring.deltaVsYesterday}%`}
            </span>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            {locale === "ar" ? "قفل التفاصيل" : "Close Breakdown"}
          </button>
        </div>
      </div>
    </div>
  );
}
