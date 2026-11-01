"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Sparkles, Plus } from "lucide-react";
import { PriorityItem } from "@/lib/today";
import { useI18n } from "@/lib/i18n/I18nContext";

interface TodayPlanGridProps {
  plannedWorkoutSession: string | null;
  nearestDeadlineTitle?: string | null;
  todayFocusMinutes: number;
  priorities: PriorityItem[];
  onAddPlanClick: () => void;
  onViewAllClick?: () => void;
}

export function TodayPlanGrid({
  plannedWorkoutSession,
  nearestDeadlineTitle,
  todayFocusMinutes,
  priorities: _priorities,
  onAddPlanClick,
  onViewAllClick,
}: TodayPlanGridProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const workoutName = plannedWorkoutSession || (isAr ? "تمرين القوة" : "Strength Training");
  const studyTitle = nearestDeadlineTitle || (isAr ? "مراجعة المنهج الدراسي" : "Study & Review Session");
  const focusTitle = todayFocusMinutes > 0
    ? isAr ? "جلسة تركيز منجزة" : "Completed focus session"
    : isAr ? "جلسة تركيز ٥٠ دقيقة" : "Focus sprint (50m)";

  return (
    <section className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-medium text-[#14161A]">
          {isAr ? "خطة النهاردة" : "Today's plan"}
        </h2>
        {onViewAllClick && (
          <button
            type="button"
            onClick={onViewAllClick}
            className="text-[14px] font-medium text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
          >
            {isAr ? "عرض الكل" : "View all"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Body Gradient Card */}
        <Link
          href="/body?tab=logger"
          className="rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group hover:opacity-95 transition-opacity"
          style={{ background: "linear-gradient(135deg, #2563EB, #4338CA)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-white/90">
              {isAr ? "٥:٣٠ م" : "5:30 pm"}
            </span>
            <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white backdrop-blur-md">
              {isAr ? "الجسم" : "Body"}
            </span>
          </div>

          <div className="flex flex-col gap-1 my-3">
            <span className="text-[16px] font-medium text-white">
              {workoutName}
            </span>
            <span className="text-[14px] text-white/80">
              {isAr ? "تمرين القوة ورفع الأوزان الأساسي" : "Main resistance training block"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-white/90">
              {isAr ? "جلسة تمرين اليوم" : "Scheduled session"}
            </span>
            {/* Purely decorative barbell SVG with aria-hidden, no numbers, no weights */}
            <svg
              className="w-8 h-8 text-white/80 shrink-0"
              fill="none"
              viewBox="0 0 40 40"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect fill="currentColor" height="2" rx="1" width="36" x="2" y="19" />
              <rect fill="currentColor" height="14" rx="1.5" width="3" x="7" y="13" />
              <rect fill="currentColor" height="20" rx="1.5" width="3" x="11" y="10" />
              <rect fill="currentColor" height="20" rx="1.5" width="3" x="26" y="10" />
              <rect fill="currentColor" height="14" rx="1.5" width="3" x="30" y="13" />
            </svg>
          </div>
        </Link>

        {/* 2. School Gradient Card */}
        <Link
          href="/school"
          className="rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group hover:opacity-95 transition-opacity"
          style={{ background: "linear-gradient(135deg, #DB2777, #C2410C)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-white/90">
              {isAr ? "٨:٠٠ م" : "8:00 pm"}
            </span>
            <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white backdrop-blur-md">
              {isAr ? "الدراسة" : "School"}
            </span>
          </div>

          <div className="flex flex-col gap-1 my-3">
            <span className="text-[16px] font-medium text-white">
              {studyTitle}
            </span>
            <span className="text-[14px] text-white/80">
              {isAr ? "مذاكرة مركزة وحل تمارين" : "Targeted study sprint"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-white/90">
              {isAr ? "مفاهيم المنهج" : "Syllabus review"}
            </span>
            <BookOpen className="w-5 h-5 text-white/80 shrink-0" aria-hidden="true" />
          </div>
        </Link>

        {/* 3. Mind Gradient Card */}
        <Link
          href="/mind"
          className="rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group hover:opacity-95 transition-opacity"
          style={{ background: "linear-gradient(135deg, #7C3AED, #A21CAF)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-white/90">
              {isAr ? "٩:٣٠ م" : "9:30 pm"}
            </span>
            <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white backdrop-blur-md">
              {isAr ? "العقل" : "Mind"}
            </span>
          </div>

          <div className="flex flex-col gap-1 my-3">
            <span className="text-[16px] font-medium text-white">
              {focusTitle}
            </span>
            <span className="text-[14px] text-white/80">
              {isAr ? "فترة صفاء ذهني وقراءة" : "Deep work & evening reflection"}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-white/90">
              {todayFocusMinutes > 0
                ? isAr ? `${todayFocusMinutes} دقيقة مسجلة` : `${todayFocusMinutes}m completed`
                : isAr ? "استرجاع الهدوء" : "Mental clarity"}
            </span>
            <Sparkles className="w-5 h-5 text-white/80 shrink-0" aria-hidden="true" />
          </div>
        </Link>

        {/* 4. Dashed Add Plan Card */}
        <button
          type="button"
          onClick={() => {
            if (onAddPlanClick) {
              onAddPlanClick();
            } else {
              document.querySelector<HTMLButtonElement>("#priorities-section button")?.click();
            }
          }}
          className="group rounded-[20px] p-6 min-h-[220px] flex flex-col items-center justify-center gap-3 transition-all hover:bg-[#F0F3FF]/60 active:scale-[0.98] border-2 border-dashed border-[#C7CAD9] bg-transparent text-[#14161A] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-[#F0F3FF] flex items-center justify-center group-hover:bg-white transition-colors shadow-sm">
            <Plus className="w-5 h-5 text-[#14161A]" />
          </div>
          <span className="text-[14px] font-medium text-[#14161A]">
            {isAr ? "أضف خطة" : "Add plan"}
          </span>
        </button>
      </div>
    </section>
  );
}
