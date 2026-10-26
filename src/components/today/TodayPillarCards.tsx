"use client";

import React from "react";
import Link from "next/link";
import {
  Dumbbell,
  Brain,
  GraduationCap,
  ArrowRight,
  Moon,
  Utensils,
  CalendarClock,
  AlertCircle,
  HelpCircle,
  CheckSquare,
} from "lucide-react";
import { getTierColor } from "@/lib/strength";
import { useI18n } from "@/lib/i18n/I18nContext";

// ==============================================================================
// 1. Body Card
// ==============================================================================

export interface TodayBodyCardProps {
  latestWorkoutName: string | null;
  highestRankTier: string | null;
  currentWeightKg: number | null;
  todayNutrition: {
    calories: number;
    target: number | null;
  } | null;
  latestSleep: {
    score: number;
    tier: string;
    durationFormatted: string;
    hexColor: string;
  } | null;
  isLoading?: boolean;
  error?: string | null;
}

export function TodayBodyCard({
  latestWorkoutName,
  highestRankTier,
  currentWeightKg,
  todayNutrition,
  latestSleep,
  error,
}: TodayBodyCardProps) {
  const { locale } = useI18n();

  if (error) {
    return (
      <div className="p-5 rounded-[20px] bg-white border border-[#DC2626]/30 space-y-2">
        <div className="flex items-center gap-2 text-[#DC2626] text-xs font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>{locale === "ar" ? "خطأ في بيانات الجسم" : "Body Telemetry Error"}</span>
        </div>
        <p className="text-xs text-[#5B6270]">{error}</p>
      </div>
    );
  }

  return (
    <Link
      href="/body?tab=logger"
      className="bg-white border border-[#E3E5F0] hover:border-[#2563EB]/40 rounded-[20px] p-6 shadow-sm transition-all group relative overflow-hidden block space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-[12px] bg-[linear-gradient(135deg,#2563EB_0%,#4338CA_100%)] flex items-center justify-center text-white shadow-sm">
          <Dumbbell className="w-4 h-4" />
        </div>
        {highestRankTier ? (
          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getTierColor(
              highestRankTier
            )}`}
          >
            {highestRankTier} {locale === "ar" ? "مستوى" : "Tier"}
          </span>
        ) : (
          <span className="text-[11px] text-[#5B6270] px-2.5 py-0.5 rounded-full bg-[#F3F4FB] border border-[#E3E5F0] font-medium">
            {locale === "ar" ? "بدون تصنيف" : "Unranked"}
          </span>
        )}
      </div>

      <div className="space-y-1 text-start">
        <div className="text-[11px] uppercase tracking-[0.06em] text-[#5B6270] font-medium">
          {locale === "ar" ? "محور اللياقة والاستشفاء" : "Physical & Recovery Domain"}
        </div>
        <div className="text-base font-medium text-[#14161A] group-hover:text-[#1E3A9E] transition-colors">
          {locale === "ar" ? "بيانات الجسم والتمرين" : "Body Telemetry"}
        </div>
        <p className="text-xs text-[#5B6270] line-clamp-1 mt-0.5">
          {latestWorkoutName
            ? (locale === "ar" ? `آخر تمرين: ${latestWorkoutName}` : `Latest session: ${latestWorkoutName}`)
            : (locale === "ar" ? "مفيش تمارين اتسجلت لسه." : "No workout sessions recorded yet.")}
        </p>
      </div>

      {/* Sleep sub-banner */}
      {latestSleep && (
        <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#F8F9FD] border border-[#ECEEFA] text-xs tabular-nums">
          <div className="flex items-center gap-2 text-[#14161A] font-medium">
            <Moon className="w-3.5 h-3.5 text-[#1E3A9E]" />
            <span>{locale === "ar" ? "جودة النوم" : "Sleep Score"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium" style={{ color: latestSleep.hexColor }}>
              {latestSleep.score}/100
            </span>
            <span className="text-[#5B6270]">({latestSleep.durationFormatted})</span>
          </div>
        </div>
      )}

      {/* Nutrition sub-banner */}
      {todayNutrition && (
        <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#F8F9FD] border border-[#ECEEFA] text-xs tabular-nums">
          <div className="flex items-center gap-2 text-[#14161A] font-medium">
            <Utensils className="w-3.5 h-3.5 text-[#1E3A9E]" />
            <span>{locale === "ar" ? "السعرات المستهلكة" : "Energy In"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[#14161A]">
              {todayNutrition.calories} {locale === "ar" ? "سعرة" : "kcal"}
            </span>
            <span className="text-[#5B6270]">
              {todayNutrition.target ? `/ ${todayNutrition.target}` : (locale === "ar" ? "(بدون هدف)" : "(No target)")}
            </span>
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-[#ECEEFA] flex items-center justify-between text-xs font-medium text-[#1E3A9E]">
        <span>
          {currentWeightKg
            ? (locale === "ar" ? `الوزن الحالي: ${currentWeightKg} كيلو` : `Weight: ${currentWeightKg} kg`)
            : (locale === "ar" ? "فتح لوحة الجسم" : "Open Body Dashboard")}
        </span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}

// ==============================================================================
// 2. Mind Card
// ==============================================================================

export interface TodayMindCardProps {
  todayFocusMinutes: number;
  completedSprintCount: number;
  focusScore: number | null;
  disciplineDisplay?: string;
  morningCheckinDone?: boolean;
  middayCheckinDone?: boolean;
  eveningCheckinDone?: boolean;
  error?: string | null;
}

export function TodayMindCard({
  todayFocusMinutes,
  completedSprintCount,
  disciplineDisplay,
  morningCheckinDone,
  middayCheckinDone,
  eveningCheckinDone,
  error,
}: TodayMindCardProps) {
  const { locale } = useI18n();

  if (error) {
    return (
      <div className="p-5 rounded-[20px] bg-white border border-[#DC2626]/30 space-y-2">
        <div className="flex items-center gap-2 text-[#DC2626] text-xs font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>{locale === "ar" ? "خطأ في بيانات العقل" : "Mind Telemetry Error"}</span>
        </div>
        <p className="text-xs text-[#5B6270]">{error}</p>
      </div>
    );
  }

  return (
    <Link
      href="/mind"
      className="bg-white border border-[#E3E5F0] hover:border-[#7C3AED]/40 rounded-[20px] p-6 shadow-sm transition-all group relative overflow-hidden block space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-[12px] bg-[linear-gradient(135deg,#7C3AED_0%,#A21CAF_100%)] flex items-center justify-center text-white shadow-sm">
          <Brain className="w-4 h-4" />
        </div>
        {todayFocusMinutes > 0 ? (
          <span className="text-[11px] tabular-nums text-[#5B21B6] px-2.5 py-0.5 rounded-full bg-[#F1E8FF] border border-[#7C3AED]/20 font-medium">
            {todayFocusMinutes} {locale === "ar" ? "دقيقة تركيز" : "m Focused"}
          </span>
        ) : (
          <span className="text-[11px] tabular-nums text-[#5B6270] px-2.5 py-0.5 rounded-full bg-[#F3F4FB] border border-[#E3E5F0] font-medium">
            {locale === "ar" ? "0 دقيقة النهاردة" : "0m today"}
          </span>
        )}
      </div>

      <div className="space-y-1 text-start">
        <div className="text-[11px] uppercase tracking-[0.06em] text-[#5B6270] font-medium">
          {locale === "ar" ? "محور الذهن والعادات" : "Cognitive Domain"}
        </div>
        <div className="text-base font-medium text-[#14161A] group-hover:text-[#5B21B6] transition-colors">
          {locale === "ar" ? "محرك التركيز والذهن" : "Mind & Focus Engine"}
        </div>
        <p className="text-xs text-[#5B6270] line-clamp-1 mt-0.5">
          {todayFocusMinutes > 0
            ? (locale === "ar"
                ? `نفذت ${completedSprintCount} جلسة تركيز النهاردة.`
                : `${completedSprintCount} focus sprint${completedSprintCount === 1 ? '' : 's'} completed today.`)
            : (locale === "ar" ? "مفيش جلسات تركيز اتسجلت النهاردة لسه." : "No focus sprints completed yet today.")}
        </p>
      </div>

      {/* Discipline snippet */}
      {disciplineDisplay && (
        <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#F8F9FD] border border-[#ECEEFA] text-xs tabular-nums">
          <div className="flex items-center gap-2 text-[#14161A] font-medium">
            <CheckSquare className="w-3.5 h-3.5 text-[#5B21B6]" />
            <span>{locale === "ar" ? "الالتزام" : "Discipline"}</span>
          </div>
          <span className="font-medium text-[#5B21B6]">{disciplineDisplay}</span>
        </div>
      )}

      {/* State Check-in pills */}
      <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
        <span className="text-[#5B6270]">{locale === "ar" ? "تسجيلات الحالة:" : "Check-ins:"}</span>
        <span
          className={`px-2 py-0.5 rounded-full border ${
            morningCheckinDone
              ? "bg-[#DCFCE7] border-[#15803D]/20 text-[#15803D] font-medium"
              : "bg-[#F3F4FB] border-[#E3E5F0] text-[#5B6270]"
          }`}
        >
          {locale === "ar" ? "الصبح" : "AM"}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full border ${
            middayCheckinDone
              ? "bg-[#DCFCE7] border-[#15803D]/20 text-[#15803D] font-medium"
              : "bg-[#F3F4FB] border-[#E3E5F0] text-[#5B6270]"
          }`}
        >
          {locale === "ar" ? "الظهر" : "NOON"}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full border ${
            eveningCheckinDone
              ? "bg-[#DCFCE7] border-[#15803D]/20 text-[#15803D] font-medium"
              : "bg-[#F3F4FB] border-[#E3E5F0] text-[#5B6270]"
          }`}
        >
          {locale === "ar" ? "بالليل" : "PM"}
        </span>
      </div>

      <div className="pt-3 border-t border-[#ECEEFA] flex items-center justify-between text-xs font-medium text-[#5B21B6]">
        <span>{locale === "ar" ? "ابدأ جلسة تركيز عميق" : "Start Deep Work Sprint"}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}

// ==============================================================================
// 3. School Card
// ==============================================================================

export interface TodaySchoolCardProps {
  subjectCount: number | null;
  nearestDeadline: {
    id: string;
    title: string;
    type: string;
    dueDate: string;
    subjectName?: string;
  } | null;
  nearestExam: {
    title: string;
    daysRemaining: number;
  } | null;
  error?: string | null;
}

export function TodaySchoolCard({
  subjectCount,
  nearestDeadline,
  nearestExam,
  error,
}: TodaySchoolCardProps) {
  const { locale } = useI18n();

  if (error) {
    return (
      <div className="p-5 rounded-[20px] bg-white border border-[#DC2626]/30 space-y-2">
        <div className="flex items-center gap-2 text-[#DC2626] text-xs font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>{locale === "ar" ? "خطأ في بيانات الدراسة" : "School Telemetry Error"}</span>
        </div>
        <p className="text-xs text-[#5B6270]">{error}</p>
      </div>
    );
  }

  return (
    <Link
      href="/school"
      className="bg-white border border-[#E3E5F0] hover:border-[#DB2777]/40 rounded-[20px] p-6 shadow-sm transition-all group relative overflow-hidden block space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-[12px] bg-[linear-gradient(135deg,#DB2777_0%,#C2410C_100%)] flex items-center justify-center text-white shadow-sm">
          <GraduationCap className="w-4 h-4" />
        </div>
        <span className="text-[11px] tabular-nums text-[#9D174D] px-2.5 py-0.5 rounded-full bg-[#FDE7F1] border border-[#DB2777]/20 font-medium">
          {subjectCount !== null
            ? (locale === "ar" ? `${subjectCount} مواد دراسية` : `${subjectCount} Subjects`)
            : (locale === "ar" ? "محرك الدراسة" : "School Engine")}
        </span>
      </div>

      <div className="space-y-1 text-start">
        <div className="text-[11px] uppercase tracking-[0.06em] text-[#5B6270] font-medium">
          {locale === "ar" ? "محور الدراسة والامتحانات" : "Academic Domain"}
        </div>
        <div className="text-base font-medium text-[#14161A] group-hover:text-[#9D174D] transition-colors">
          {locale === "ar" ? "محرك الدراسة والمتابعة" : "School Engine"}
        </div>
        <p className="text-xs text-[#5B6270] line-clamp-1 mt-0.5">
          {nearestDeadline
            ? (locale === "ar" ? `أقرب ميعاد: ${nearestDeadline.title}` : `Nearest due: ${nearestDeadline.title}`)
            : (locale === "ar" ? "مفيش مواعيد تسليم معلقة حاليًا." : "No active deadlines pending.")}
        </p>
      </div>

      {nearestExam && (
        <div className="p-3 rounded-[12px] bg-[#FDE7F1]/70 border border-[#DB2777]/25 flex items-center justify-between text-xs tabular-nums text-[#9D174D]">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            <span className="font-medium">{nearestExam.title}</span>
          </div>
          <span className="font-medium">
            {locale === "ar" ? `باقي ${nearestExam.daysRemaining} يوم` : `in ${nearestExam.daysRemaining} days`}
          </span>
        </div>
      )}

      <div className="pt-3 border-t border-[#ECEEFA] flex items-center justify-between text-xs font-medium text-[#9D174D]">
        <span>{locale === "ar" ? "فتح لوحة الدراسة" : "Open School Dashboard"}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}

// ==============================================================================
// 4. Finish Setup Card
// ==============================================================================

interface FinishSetupCardProps {
  missingTargets: string[];
}

export function FinishSetupCard({ missingTargets }: FinishSetupCardProps) {
  const { locale } = useI18n();
  if (missingTargets.length === 0) return null;

  const translateTarget = (t: string) => {
    if (locale !== "ar") return t;
    if (t.includes("calories")) return "السعرات اليومية";
    if (t.includes("protein")) return "البروتين اليومي";
    if (t.includes("water")) return "الميه اليومية";
    if (t.includes("sleep")) return "ساعات النوم";
    if (t.includes("focus")) return "هدف التركيز";
    return t;
  };

  return (
    <div className="p-5 rounded-[20px] bg-white border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.06)] flex items-start gap-3.5">
      <div className="w-9 h-9 rounded-[12px] bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-[#4A3400] shrink-0 mt-0.5">
        <HelpCircle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 text-start">
        <h4 className="text-xs font-medium uppercase tracking-wider text-[#14161A]">
          {locale === "ar" ? "تكملة تظبيط البروتوكول" : "Finish Protocol Setup"}
        </h4>
        <p className="text-xs text-[#5B6270] mt-0.5">
          {locale === "ar"
            ? `الأهداف اللي محتاجة تتحدد: ${missingTargets.map(translateTarget).join("، ")}.`
            : `Unconfigured targets: ${missingTargets.join(", ")}.`}
        </p>
        <Link
          href="/settings?tab=protocol"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A9E] hover:underline mt-1.5"
        >
          <span>{locale === "ar" ? "تحديد الأهداف في الإعدادات" : "Configure targets in settings"}</span>
          <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}

// ==============================================================================
// 5. End-of-Day Recap Card (Neutral wording, NO celebration modal)
// ==============================================================================

interface EndOfDayRecapCardProps {
  completedCount: number;
  totalCount: number;
  onCarryOver: () => void;
}

export function EndOfDayRecapCard({
  completedCount,
  totalCount,
  onCarryOver,
}: EndOfDayRecapCardProps) {
  const { locale } = useI18n();
  if (totalCount === 0) return null;

  const incompleteCount = totalCount - completedCount;

  return (
    <div className="p-6 rounded-[20px] bg-white border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.06)] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.06em] text-[#5B6270] font-medium">
          {locale === "ar" ? "ملخص تنفيذ اليوم" : "Daily Execution Recap"}
        </span>
        <span className="text-xs tabular-nums text-[#14161A] font-medium">
          {locale === "ar"
            ? `نفذت ${completedCount} من ${totalCount}`
            : `${completedCount} of ${totalCount} completed`}
        </span>
      </div>

      <p className="text-xs text-[#5B6270] leading-relaxed text-start">
        {incompleteCount === 0
          ? (locale === "ar"
              ? "كل الأولويات المجدولة للنهاردة اتنفذت بنجاح. يومك مظبوط!"
              : "All scheduled priorities for today have been executed.")
          : (locale === "ar"
              ? `نفذت ${completedCount} من ${totalCount} أولويات. متبقي ${incompleteCount} مهمة.`
              : `${completedCount} of ${totalCount} priorities completed. ${incompleteCount} task${
                  incompleteCount === 1 ? "" : "s"
                } remaining.`)}
      </p>

      {incompleteCount > 0 && (
        <button
          onClick={onCarryOver}
          className="w-full py-2.5 px-3.5 rounded-[12px] bg-[#F8F9FD] hover:bg-[#F3F4FB] border border-[#E3E5F0] flex items-center justify-between text-xs font-medium text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
        >
          <span>
            {locale === "ar"
              ? `ترحيل ${incompleteCount} مهمة متبقية لبكرة`
              : `Carry over ${incompleteCount} remaining to tomorrow`}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#14161A] rtl:rotate-180" />
        </button>
      )}
    </div>
  );
}
