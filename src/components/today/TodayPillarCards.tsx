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
      <div className="p-5 rounded-2xl bg-surface-container border border-status-danger/30 space-y-2">
        <div className="flex items-center gap-2 text-status-danger text-xs font-mono">
          <AlertCircle className="w-4 h-4" />
          <span>{locale === "ar" ? "خطأ في بيانات الجسم" : "Body Telemetry Error"}</span>
        </div>
        <p className="text-xs text-text-muted">{error}</p>
      </div>
    );
  }

  return (
    <Link
      href="/body?tab=logger"
      className="bg-surface-container border border-border-subtle hover:border-secondary-cyan/40 rounded-2xl p-5 transition-all group relative overflow-hidden block space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan">
          <Dumbbell className="w-4 h-4" />
        </div>
        {highestRankTier ? (
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getTierColor(
              highestRankTier
            )}`}
          >
            {highestRankTier} {locale === "ar" ? "مستوى" : "Tier"}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-md bg-surface-container-high border border-border-subtle">
            {locale === "ar" ? "بدون تصنيف" : "Unranked"}
          </span>
        )}
      </div>

      <div className="space-y-1 text-start">
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
          {locale === "ar" ? "محور اللياقة والاستشفاء" : "Physical & Recovery Domain"}
        </div>
        <div className="text-base font-bold font-mono text-on-surface group-hover:text-secondary-cyan transition-colors">
          {locale === "ar" ? "بيانات الجسم والتمرين" : "Body Telemetry"}
        </div>
        <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
          {latestWorkoutName
            ? (locale === "ar" ? `آخر تمرين: ${latestWorkoutName}` : `Latest session: ${latestWorkoutName}`)
            : (locale === "ar" ? "مفيش تمارين اتسجلت لسه." : "No workout sessions recorded yet.")}
        </p>
      </div>

      {/* Sleep sub-banner */}
      {latestSleep && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-border-subtle text-xs font-mono">
          <div className="flex items-center gap-2 text-on-surface">
            <Moon className="w-3.5 h-3.5 text-[#7DD3FC]" />
            <span>{locale === "ar" ? "جودة النوم" : "Sleep Score"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold" style={{ color: latestSleep.hexColor }}>
              {latestSleep.score}/100
            </span>
            <span className="text-text-muted">({latestSleep.durationFormatted})</span>
          </div>
        </div>
      )}

      {/* Nutrition sub-banner */}
      {todayNutrition && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-border-subtle text-xs font-mono">
          <div className="flex items-center gap-2 text-on-surface">
            <Utensils className="w-3.5 h-3.5 text-secondary-cyan" />
            <span>{locale === "ar" ? "السعرات المستهلكة" : "Energy In"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-on-surface">
              {todayNutrition.calories} {locale === "ar" ? "سعرة" : "kcal"}
            </span>
            <span className="text-text-muted">
              {todayNutrition.target ? `/ ${todayNutrition.target}` : (locale === "ar" ? "(بدون هدف)" : "(No target)")}
            </span>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-secondary-cyan">
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
      <div className="p-5 rounded-2xl bg-surface-container border border-status-danger/30 space-y-2">
        <div className="flex items-center gap-2 text-status-danger text-xs font-mono">
          <AlertCircle className="w-4 h-4" />
          <span>{locale === "ar" ? "خطأ في بيانات العقل" : "Mind Telemetry Error"}</span>
        </div>
        <p className="text-xs text-text-muted">{error}</p>
      </div>
    );
  }

  return (
    <Link
      href="/mind"
      className="bg-surface-container border border-border-subtle hover:border-tertiary-purple/40 rounded-2xl p-5 transition-all group relative overflow-hidden block space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple">
          <Brain className="w-4 h-4" />
        </div>
        {todayFocusMinutes > 0 ? (
          <span className="font-mono text-[10px] text-tertiary-purple px-2 py-0.5 rounded-full bg-tertiary-purple/15 border border-tertiary-purple/30 font-bold">
            {todayFocusMinutes} {locale === "ar" ? "دقيقة تركيز" : "m Focused"}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded-md bg-surface-container-high border border-border-subtle">
            {locale === "ar" ? "0 دقيقة النهاردة" : "0m today"}
          </span>
        )}
      </div>

      <div className="space-y-1 text-start">
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
          {locale === "ar" ? "محور الذهن والعادات" : "Cognitive Domain"}
        </div>
        <div className="text-base font-bold font-mono text-on-surface group-hover:text-tertiary-purple transition-colors">
          {locale === "ar" ? "محرك التركيز والذهن" : "Mind & Focus Engine"}
        </div>
        <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
          {todayFocusMinutes > 0
            ? (locale === "ar"
                ? `نفذت ${completedSprintCount} جلسة تركيز النهاردة.`
                : `${completedSprintCount} focus sprint${completedSprintCount === 1 ? '' : 's'} completed today.`)
            : (locale === "ar" ? "مفيش جلسات تركيز اتسجلت النهاردة لسه." : "No focus sprints completed yet today.")}
        </p>
      </div>

      {/* Discipline snippet */}
      {disciplineDisplay && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-border-subtle text-xs font-mono">
          <div className="flex items-center gap-2 text-on-surface">
            <CheckSquare className="w-3.5 h-3.5 text-tertiary-purple" />
            <span>{locale === "ar" ? "الالتزام" : "Discipline"}</span>
          </div>
          <span className="font-bold text-tertiary-purple">{disciplineDisplay}</span>
        </div>
      )}

      {/* State Check-in pills */}
      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] font-mono">
        <span className="text-text-muted">{locale === "ar" ? "تسجيلات الحالة:" : "Check-ins:"}</span>
        <span
          className={`px-1.5 py-0.5 rounded border ${
            morningCheckinDone
              ? "bg-status-success/15 border-status-success/30 text-status-success font-semibold"
              : "bg-surface-container-high border-border-subtle text-text-muted"
          }`}
        >
          {locale === "ar" ? "الصبح" : "AM"}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded border ${
            middayCheckinDone
              ? "bg-status-success/15 border-status-success/30 text-status-success font-semibold"
              : "bg-surface-container-high border-border-subtle text-text-muted"
          }`}
        >
          {locale === "ar" ? "الظهر" : "NOON"}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded border ${
            eveningCheckinDone
              ? "bg-status-success/15 border-status-success/30 text-status-success font-semibold"
              : "bg-surface-container-high border-border-subtle text-text-muted"
          }`}
        >
          {locale === "ar" ? "بالليل" : "PM"}
        </span>
      </div>

      <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-tertiary-purple">
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
      <div className="p-5 rounded-2xl bg-surface-container border border-status-danger/30 space-y-2">
        <div className="flex items-center gap-2 text-status-danger text-xs font-mono">
          <AlertCircle className="w-4 h-4" />
          <span>{locale === "ar" ? "خطأ في بيانات الدراسة" : "School Telemetry Error"}</span>
        </div>
        <p className="text-xs text-text-muted">{error}</p>
      </div>
    );
  }

  return (
    <Link
      href="/school"
      className="bg-surface-container border border-border-subtle hover:border-amber-400/40 rounded-2xl p-5 transition-all group relative overflow-hidden block space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <GraduationCap className="w-4 h-4" />
        </div>
        <span className="font-mono text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          {subjectCount !== null
            ? (locale === "ar" ? `${subjectCount} مواد دراسية` : `${subjectCount} Subjects`)
            : (locale === "ar" ? "محرك الدراسة" : "School Engine")}
        </span>
      </div>

      <div className="space-y-1 text-start">
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
          {locale === "ar" ? "محور الدراسة والامتحانات" : "Academic Domain"}
        </div>
        <div className="text-base font-bold font-mono text-on-surface group-hover:text-amber-400 transition-colors">
          {locale === "ar" ? "محرك الدراسة والمتابعة" : "School Engine"}
        </div>
        <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
          {nearestDeadline
            ? (locale === "ar" ? `أقرب ميعاد: ${nearestDeadline.title}` : `Nearest due: ${nearestDeadline.title}`)
            : (locale === "ar" ? "مفيش مواعيد تسليم معلقة حاليًا." : "No active deadlines pending.")}
        </p>
      </div>

      {nearestExam && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono text-amber-400">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            <span className="font-semibold">{nearestExam.title}</span>
          </div>
          <span className="font-bold">
            {locale === "ar" ? `باقي ${nearestExam.daysRemaining} يوم` : `in ${nearestExam.daysRemaining} days`}
          </span>
        </div>
      )}

      <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-amber-400">
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
    <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-border-subtle flex items-start gap-3.5">
      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
        <HelpCircle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 text-start">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
          {locale === "ar" ? "تكملة تظبيط البروتوكول" : "Finish Protocol Setup"}
        </h4>
        <p className="text-xs text-text-muted mt-0.5">
          {locale === "ar"
            ? `الأهداف اللي محتاجة تتحدد: ${missingTargets.map(translateTarget).join("، ")}.`
            : `Unconfigured targets: ${missingTargets.join(", ")}.`}
        </p>
        <Link
          href="/settings?tab=protocol"
          className="inline-flex items-center gap-1 text-xs font-mono text-secondary-cyan hover:underline mt-1.5"
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
    <div className="p-5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
          {locale === "ar" ? "ملخص تنفيذ اليوم" : "Daily Execution Recap"}
        </span>
        <span className="text-xs font-mono text-on-surface font-bold">
          {locale === "ar"
            ? `نفذت ${completedCount} من ${totalCount}`
            : `${completedCount} of ${totalCount} completed`}
        </span>
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed text-start">
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
          className="w-full py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle flex items-center justify-between text-xs font-mono text-text-muted hover:text-on-surface transition-colors cursor-pointer"
        >
          <span>
            {locale === "ar"
              ? `ترحيل ${incompleteCount} مهمة متبقية لبكرة`
              : `Carry over ${incompleteCount} remaining to tomorrow`}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-primary-lime rtl:rotate-180" />
        </button>
      )}
    </div>
  );
}
