"use client";

import React from "react";
import Link from "next/link";
import { formatActivityDuration } from "@/lib/todayDisplayQueries";
import { useI18n } from "@/lib/i18n/I18nContext";

interface TodayFocusCardProps {
  todayFocusMinutes: number;
  dailyFocusGoalMinutes: number | null;
}

export function TodayFocusCard({
  todayFocusMinutes,
  dailyFocusGoalMinutes,
}: TodayFocusCardProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const goalMins = dailyFocusGoalMinutes || null;
  const hasGoal = goalMins !== null && goalMins > 0;

  const pct = hasGoal
    ? Math.min(100, Math.round((todayFocusMinutes / goalMins) * 100))
    : todayFocusMinutes > 0
    ? 100
    : 0;

  const remainingMins = hasGoal ? Math.max(0, goalMins - todayFocusMinutes) : 0;

  return (
    <Link
      href="/mind?tab=focus"
      className="bg-white rounded-[20px] p-6 border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col gap-5 group hover:border-[#7C3AED]/40 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-[#14161A]">
          {isAr ? "التركيز النهاردة" : "Focus today"}
        </h2>
        <span className="text-[12px] font-medium text-[#5B6270] whitespace-nowrap">
          {hasGoal
            ? isAr
              ? `الهدف: ${formatActivityDuration(goalMins)}`
              : `Goal: ${formatActivityDuration(goalMins)}`
            : isAr
            ? "حدد هدف"
            : "Set a goal"}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[32px] sm:text-[40px] font-medium text-[#14161A] tracking-tight leading-none whitespace-nowrap">
          {todayFocusMinutes > 0
            ? formatActivityDuration(todayFocusMinutes)
            : isAr
            ? "0 دقيقة"
            : "0 m"}
        </span>
        <span className="text-[14px] text-[#5B6270]">
          {todayFocusMinutes === 0
            ? isAr
              ? "مفيش جلسات لسه"
              : "No sessions yet"
            : hasGoal
            ? isAr
              ? `${pct}% مكتمل`
              : `${pct}% completed`
            : isAr
            ? "جلسات تركيز مسجلة"
            : "Logged focus sessions"}
        </span>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div className="w-full bg-[#ECEEFA] h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #7C3AED, #A21CAF)",
            }}
          />
        </div>
        <div className="flex justify-between items-center text-[#5B6270] text-[12px] font-medium">
          <span>
            {todayFocusMinutes > 0
              ? isAr
                ? `${pct}% منجز`
                : `${pct}% completed`
              : isAr
              ? "ابدأ جلسة تركيز"
              : "Start a focus sprint"}
          </span>
          {hasGoal && remainingMins > 0 && (
            <span>
              {isAr
                ? `فاضل ${formatActivityDuration(remainingMins)}`
                : `${formatActivityDuration(remainingMins)} remaining`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
