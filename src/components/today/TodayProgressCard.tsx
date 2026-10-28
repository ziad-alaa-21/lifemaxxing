"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { RingResult } from "@/lib/today";
import { RingBreakdownSheet } from "./RingBreakdownSheet";
import { useI18n } from "@/lib/i18n/I18nContext";

interface TodayProgressCardProps {
  bodyRing: RingResult;
  mindRing: RingResult;
  schoolRing: RingResult;
  isBodyActive: boolean;
  isMindActive: boolean;
  isSchoolActive: boolean;
}

export function TodayProgressCard({
  bodyRing,
  mindRing,
  schoolRing,
  isBodyActive,
  isMindActive,
  isSchoolActive,
}: TodayProgressCardProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [selectedRing, setSelectedRing] = useState<RingResult | null>(null);

  const renderPillarRow = (
    labelEn: string,
    labelAr: string,
    ring: RingResult,
    gradient: string,
    isActive: boolean
  ) => {
    if (!isActive) return null;

    // Calculate completed vs total components from ring result
    const completed = ring.completedCount;
    const total = ring.totalPlannedCount;

    let progressText = "";
    if (completed === 0) {
      progressText = isAr ? `${total} فاضل` : `${total} to do`;
    } else {
      progressText = isAr
        ? `${completed} من ${total} خلصوا`
        : `${completed} of ${total} done`;
    }

    const pct = ring.ringPercent !== null ? Math.min(100, Math.max(0, ring.ringPercent)) : 0;

    return (
      <button
        type="button"
        onClick={() => setSelectedRing(ring)}
        className="w-full flex flex-col gap-2 group cursor-pointer text-left rtl:text-right transition-opacity hover:opacity-90"
        aria-label={`${isAr ? labelAr : labelEn}: ${progressText}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-[#14161A]">
              {isAr ? labelAr : labelEn}
            </span>
            <span className="text-[12px] font-medium text-[#5B6270]">
              {progressText}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#5B6270] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-transform" />
        </div>
        <div className="w-full bg-[#ECEEFA] h-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: gradient,
            }}
          />
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-[#14161A]">
            {isAr ? "تقدم النهاردة" : "Today's progress"}
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {renderPillarRow(
            "Body",
            "الجسم",
            bodyRing,
            "linear-gradient(90deg, #2563EB, #4338CA)",
            isBodyActive
          )}
          {renderPillarRow(
            "Mind",
            "العقل",
            mindRing,
            "linear-gradient(90deg, #7C3AED, #A21CAF)",
            isMindActive
          )}
          {renderPillarRow(
            "School",
            "الدراسة",
            schoolRing,
            "linear-gradient(90deg, #DB2777, #C2410C)",
            isSchoolActive
          )}
        </div>
      </div>

      <RingBreakdownSheet
        ring={selectedRing}
        isOpen={selectedRing !== null}
        onClose={() => setSelectedRing(null)}
      />
    </>
  );
}
