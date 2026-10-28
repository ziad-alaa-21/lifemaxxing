"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface TodayNextUpCardProps {
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
  plannedWorkoutSession: string | null;
  hasLoggedWorkoutToday: boolean;
  hadPlannedItems?: boolean;
  allPlannedItemsDone?: boolean;
}

export function TodayNextUpCard({
  nearestDeadline,
  nearestExam,
  plannedWorkoutSession,
  hasLoggedWorkoutToday,
  hadPlannedItems = false,
  allPlannedItemsDone = false,
}: TodayNextUpCardProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const items: Array<{ title: string; subtitle?: string; href: string }> = [];

  // 1. Upcoming exam or deadline
  if (nearestExam) {
    const examDays = nearestExam.daysRemaining;
    const dayText =
      examDays === 0
        ? isAr
          ? "الامتحان النهاردة"
          : "Exam today"
        : examDays === 1
        ? isAr
          ? "امتحان بكرة"
          : "Exam tomorrow"
        : isAr
        ? `امتحان بعد ${examDays} أيام`
        : `Exam in ${examDays} days`;

    items.push({
      title: `${nearestExam.title} (${dayText})`,
      subtitle: isAr ? "راجع الملخصات والتمارين" : "Review key concepts and formulas",
      href: "/school?tab=plan",
    });
  } else if (nearestDeadline) {
    items.push({
      title: `${nearestDeadline.title}${nearestDeadline.subjectName ? ` - ${nearestDeadline.subjectName}` : ""}`,
      subtitle: isAr ? "تسليم دراسي قادم" : "Upcoming assignment deadline",
      href: "/school?tab=plan",
    });
  }

  // 2. Planned workout if not yet logged today
  if (plannedWorkoutSession && !hasLoggedWorkoutToday) {
    items.push({
      title: isAr
        ? `تمرين ${plannedWorkoutSession} متخطط له`
        : `${plannedWorkoutSession}, planned workout`,
      subtitle: isAr ? "جلسة تمرين القوة في الجيم" : "Main gym training session",
      href: "/body?tab=logger",
    });
  }

  const isAllSet = items.length === 0 && hadPlannedItems && allPlannedItemsDone;

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-[#14161A]">
          {isAr ? "القادم" : "Next up"}
        </h2>
        <span className="w-2 h-2 rounded-full bg-[#0051D5]" />
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col divide-y divide-[#ECEEFA]">
          {items.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-1 group hover:opacity-85 transition-opacity"
            >
              <span className="text-[14px] font-medium text-[#14161A] group-hover:text-[#0051D5] transition-colors">
                {item.title}
              </span>
              {item.subtitle && (
                <span className="text-[12px] text-[#5B6270]">
                  {item.subtitle}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : isAllSet ? (
        <div className="py-4 flex items-center gap-3 text-[#14161A]">
          <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[14px] font-medium">
              {isAr ? "كل حاجة جاهزة النهاردة" : "All set for today"}
            </span>
            <span className="text-[12px] text-[#5B6270]">
              {isAr ? "خلصت خطتك الأساسية للنهاردة" : "You have completed your scheduled tasks"}
            </span>
          </div>
        </div>
      ) : (
        <div className="py-4 text-[14px] text-[#5B6270]">
          {isAr ? "مفيش تسليمات قادمة" : "No upcoming items scheduled"}
        </div>
      )}
    </div>
  );
}
