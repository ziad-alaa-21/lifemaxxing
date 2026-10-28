"use client";

import React, { useState, useEffect } from "react";
import {
  fetchWeeklyActivitySummary,
  ActivityMetric,
  ActivityRange,
  ActivitySummaryResult,
} from "@/lib/todayDisplayQueries";
import { useI18n } from "@/lib/i18n/I18nContext";

interface TodayActivityChartCardProps {
  userId: string;
  userTimezone: string;
}

export function TodayActivityChartCard({
  userId,
  userTimezone,
}: TodayActivityChartCardProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [metric, setMetric] = useState<ActivityMetric>("focus");
  const [range, setRange] = useState<ActivityRange>(7);
  const [summary, setSummary] = useState<ActivitySummaryResult | null>(null);
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      try {
        const res = await fetchWeeklyActivitySummary(
          userId,
          userTimezone,
          range,
          metric
        );
        if (!isCancelled) {
          setSummary(res);
          // Default active tooltip to today or the last bar
          const todayBar = res.bars.find((b) => b.isToday) || res.bars[res.bars.length - 1];
          if (todayBar) {
            setActiveBarKey(todayBar.key);
          }
        }
      } catch (err) {
        console.warn("Activity summary query failed:", err);
      }
    }

    if (userId) {
      loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [userId, userTimezone, range, metric]);

  const maxVal = summary
    ? Math.max(...summary.bars.map((b) => b.value), 1)
    : 1;

  // Domain gradient for active bar per metric
  const getActiveBarGradient = () => {
    if (metric === "focus") {
      return "linear-gradient(180deg, #A21CAF 0%, #7C3AED 100%)";
    }
    if (metric === "training") {
      return "linear-gradient(180deg, #4338CA 0%, #2563EB 100%)";
    }
    return "linear-gradient(180deg, #0EA5E9 0%, #2563EB 100%)";
  };

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[460px]">
      <div>
        {/* Title & Range Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-[20px] font-medium text-[#14161A]">
            {range === 7
              ? isAr
                ? "الأسبوع ده"
                : "This week"
              : range === 30
              ? isAr
                ? "الشهر ده"
                : "This month"
              : isAr
              ? "آخر ٣ شهور"
              : "Last 3 months"}
          </h2>
          <div className="inline-flex bg-[#F0F3FF] p-1 rounded-full">
            <button
              type="button"
              onClick={() => setRange(7)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                range === 7
                  ? "bg-white text-[#14161A] shadow-[0_2px_6px_rgba(40,50,120,0.08)]"
                  : "text-[#5B6270] hover:text-[#14161A]"
              }`}
            >
              {isAr ? "أسبوع" : "Week"}
            </button>
            <button
              type="button"
              onClick={() => setRange(30)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                range === 30
                  ? "bg-white text-[#14161A] shadow-[0_2px_6px_rgba(40,50,120,0.08)]"
                  : "text-[#5B6270] hover:text-[#14161A]"
              }`}
            >
              {isAr ? "شهر" : "Month"}
            </button>
            <button
              type="button"
              onClick={() => setRange(90)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                range === 90
                  ? "bg-white text-[#14161A] shadow-[0_2px_6px_rgba(40,50,120,0.08)]"
                  : "text-[#5B6270] hover:text-[#14161A]"
              }`}
            >
              {isAr ? "٣ شهور" : "3 months"}
            </button>
          </div>
        </div>

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMetric("focus")}
            className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
              metric === "focus"
                ? "bg-[#14161A] text-white"
                : "bg-[#F0F3FF] text-[#5B6270] hover:text-[#14161A]"
            }`}
          >
            {isAr ? "تركيز" : "Focus"}
          </button>
          <button
            type="button"
            onClick={() => setMetric("training")}
            className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
              metric === "training"
                ? "bg-[#14161A] text-white"
                : "bg-[#F0F3FF] text-[#5B6270] hover:text-[#14161A]"
            }`}
          >
            {isAr ? "تمرين" : "Training"}
          </button>
          <button
            type="button"
            onClick={() => setMetric("sleep")}
            className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
              metric === "sleep"
                ? "bg-[#14161A] text-white"
                : "bg-[#F0F3FF] text-[#5B6270] hover:text-[#14161A]"
            }`}
          >
            {isAr ? "نوم" : "Sleep"}
          </button>
        </div>

        {/* Large Statistic Display */}
        <div className="flex flex-col gap-1 mb-6">
          <span className="text-[32px] sm:text-[40px] font-medium text-[#14161A] tracking-tight leading-none">
            {summary?.totalFormatted || "0 m"}
          </span>
          {summary?.hasPreviousData && summary.percentVsPrevious !== null ? (
            <span className="text-[14px] text-[#5B6270]">
              {summary.percentVsPrevious >= 0 ? "+" : ""}
              {summary.percentVsPrevious}%{" "}
              {isAr ? "مقارنة بالفترة السابقة" : "vs previous period"}
            </span>
          ) : (
            <span className="text-[14px] text-[#5B6270]">
              {isAr ? "إجمالي الفترة الحالية" : "Current period total"}
            </span>
          )}
        </div>
      </div>

      {/* Histogram Bar Chart */}
      <div className="pt-4 flex flex-col gap-3">
        <div className="relative h-44 flex items-end justify-between px-2 gap-2 sm:gap-3">
          {summary?.bars.map((bar) => {
            const isSelected = bar.key === activeBarKey;
            const barHeightPct =
              maxVal > 0 ? Math.max(8, Math.round((bar.value / maxVal) * 92)) : 8;

            return (
              <div
                key={bar.key}
                onClick={() => setActiveBarKey(bar.key)}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative group cursor-pointer"
              >
                {/* Active Tooltip */}
                {isSelected && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#14161A] text-white rounded-lg text-[12px] font-medium shadow-[0_4px_12px_rgba(20,22,26,0.18)] whitespace-nowrap z-10 pointer-events-none">
                    {bar.formattedValue}
                  </div>
                )}

                {/* Bar */}
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${barHeightPct}%`,
                    background: isSelected
                      ? getActiveBarGradient()
                      : "#E2E8F9",
                  }}
                />

                <span
                  className={`text-[12px] font-medium transition-colors ${
                    isSelected ? "text-[#14161A]" : "text-[#5B6270]"
                  }`}
                >
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
