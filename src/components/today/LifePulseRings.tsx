"use client";

import React, { useState } from "react";
import { RingResult } from "@/lib/today";
import { RingBreakdownSheet } from "./RingBreakdownSheet";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface LifePulseRingsProps {
  bodyRing: RingResult;
  mindRing: RingResult;
  schoolRing: RingResult;
  isBodyActive?: boolean;
  isMindActive?: boolean;
  isSchoolActive?: boolean;
}

export function LifePulseRings({
  bodyRing,
  mindRing,
  schoolRing,
  isBodyActive = true,
  isMindActive = true,
  isSchoolActive = true,
}: LifePulseRingsProps) {
  const { locale } = useI18n();
  const [selectedRing, setSelectedRing] = useState<RingResult | null>(null);

  // SVG parameters
  const size = 180;
  const strokeWidth = 10;
  const gap = 6;

  // Radii
  const rBody = 76;
  const rMind = rBody - strokeWidth - gap; // 60
  const rSchool = rMind - strokeWidth - gap; // 44

  const circumference = (r: number) => 2 * Math.PI * r;

  const renderRingCircle = (
    r: number,
    colorHex: string,
    percent: number | null,
    onClick: () => void
  ) => {
    const c = circumference(r);
    const validPct = percent !== null ? Math.max(0, Math.min(100, percent)) : 0;
    const strokeDashoffset = c - (validPct / 100) * c;

    return (
      <g className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={onClick}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-container-highest/40"
          fill="none"
        />
        {/* Active progress */}
        {percent !== null && percent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colorHex}
            strokeWidth={strokeWidth}
            strokeDasharray={c}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-700 ease-out"
          />
        )}
      </g>
    );
  };

  const ringsList = [
    { ring: bodyRing, key: "body", active: isBodyActive },
    { ring: mindRing, key: "mind", active: isMindActive },
    { ring: schoolRing, key: "school", active: isSchoolActive },
  ].filter((item) => item.active);

  const activeRingsCount = ringsList.length;

  const getDomainLabel = (domain: string, fallback: string) => {
    if (locale !== "ar") return fallback;
    if (domain === "body") return "الجسم";
    if (domain === "mind") return "العقل";
    if (domain === "school") return "الدراسة";
    return fallback;
  };

  const getDomainSubtext = (domain: string) => {
    if (locale === "ar") {
      if (domain === "body") return "تمرين، نوم، وتغذية";
      if (domain === "mind") return "تركيز والتزام";
      return "مذاكرة ومواعيد";
    }
    if (domain === "body") return "Workout, Sleep, Nutr";
    if (domain === "mind") return "Focus & Discipline";
    return "Deadlines & Study";
  };

  const formatComponentSummary = (comp: { name: string; percent: number | null; doneText: string }) => {
    let name = comp.name;
    if (locale === "ar") {
      if (name.toLowerCase().includes("workout")) name = "التمرين";
      else if (name.toLowerCase().includes("sleep")) name = "النوم";
      else if (name.toLowerCase().includes("nutrition") || name.toLowerCase().includes("calories")) name = "التغذية";
      else if (name.toLowerCase().includes("focus")) name = "التركيز";
      else if (name.toLowerCase().includes("discipline") || name.toLowerCase().includes("habits")) name = "الالتزام";
      else if (name.toLowerCase().includes("grade")) name = "الدرجات";
      else if (name.toLowerCase().includes("deadline")) name = "المواعيد";
      else if (name.toLowerCase().includes("practice") || name.toLowerCase().includes("review")) name = "المراجعة";
    }
    return `${name}: ${comp.percent !== null ? `${comp.percent}%` : comp.doneText}`;
  };

  return (
    <>
      <div className="p-5 rounded-2xl bg-surface-container border border-border-subtle flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Interactive Concentric SVG */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg width={size} height={size} className="overflow-visible">
            {isBodyActive &&
              renderRingCircle(rBody, bodyRing.colorHex, bodyRing.ringPercent, () =>
                setSelectedRing(bodyRing)
              )}
            {isMindActive &&
              renderRingCircle(rMind, mindRing.colorHex, mindRing.ringPercent, () =>
                setSelectedRing(mindRing)
              )}
            {isSchoolActive &&
              renderRingCircle(rSchool, schoolRing.colorHex, schoolRing.ringPercent, () =>
                setSelectedRing(schoolRing)
              )}
          </svg>

          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {locale === "ar" ? "نبض الإنجاز" : "Life Pulse"}
            </span>
            <span className="text-sm font-mono font-bold text-on-surface">
              {locale === "ar"
                ? `${activeRingsCount} ${activeRingsCount === 1 ? "حلقة" : activeRingsCount === 2 ? "حلقتين" : "حلقات"}`
                : `${activeRingsCount} ${activeRingsCount === 1 ? "Ring" : "Rings"}`}
            </span>
          </div>
        </div>

        {/* Right: Legend & Interactive Summary Cards */}
        <div className="w-full flex-1 space-y-2.5">
          {ringsList.map(({ ring }) => (
            <button
              key={ring.domain}
              onClick={() => setSelectedRing(ring)}
              className="w-full p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle hover:border-border-default transition-all flex items-center justify-between group cursor-pointer text-start"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: ring.colorHex }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold font-mono text-on-surface flex items-center gap-1.5">
                    <span>{getDomainLabel(ring.domain, ring.label)}</span>
                    <span className="text-[10px] text-text-muted font-normal">
                      ({getDomainSubtext(ring.domain)})
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {ring.components
                      .filter((c) => c.status !== "not_set_up")
                      .map(formatComponentSummary)
                      .join(" • ") || (locale === "ar" && ring.displayText.includes("MISSING") ? "بيانات ناقصة للنهاردة" : ring.displayText)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-end">
                  <span
                    className="text-xs font-mono font-bold block"
                    style={{
                      color:
                        ring.ringPercent !== null
                          ? ring.colorHex
                          : "var(--text-muted)",
                    }}
                  >
                    {locale === "ar" && ring.displayText === "MISSING TELEMETRY"
                      ? "بيانات ناقصة"
                      : ring.displayText}
                  </span>
                  {/* Delta vs yesterday ONLY when both days have data */}
                  {ring.deltaVsYesterday !== null && (
                    <span
                      className={`text-[9px] font-mono flex items-center justify-end ${
                        ring.deltaVsYesterday >= 0
                          ? "text-status-success"
                          : "text-text-muted"
                      }`}
                    >
                      {ring.deltaVsYesterday >= 0 ? "+" : ""}
                      {ring.deltaVsYesterday}% {locale === "ar" ? "عن إمبارح" : "vs yday"}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-on-surface transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Breakdown Sheet */}
      <RingBreakdownSheet
        ring={selectedRing}
        isOpen={selectedRing !== null}
        onClose={() => setSelectedRing(null)}
      />
    </>
  );
}
