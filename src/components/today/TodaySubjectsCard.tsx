"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchTodayActiveSubjects,
  TodaySubjectDisplayItem,
} from "@/lib/todayDisplayQueries";
import { useI18n } from "@/lib/i18n/I18nContext";

interface TodaySubjectsCardProps {
  userId: string;
}

export function TodaySubjectsCard({ userId }: TodaySubjectsCardProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [subjects, setSubjects] = useState<TodaySubjectDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      try {
        const res = await fetchTodayActiveSubjects(userId);
        if (!isCancelled) {
          setSubjects(res);
        }
      } catch (err) {
        console.warn("Active subjects query failed:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    if (userId) {
      loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const formatStatus = (s: TodaySubjectDisplayItem) => {
    if (!s.statusLine) return null;
    if (isAr) {
      if (s.daysToDeadline !== undefined) {
        if (s.daysToDeadline === 0) return "امتحان أو تسليم النهاردة";
        if (s.daysToDeadline === 1) return "امتحان بكرة";
        return `امتحان بعد ${s.daysToDeadline} أيام`;
      }
      if (s.averagePct !== null && s.averagePct !== undefined) {
        return `المتوسط ${Math.round(s.averagePct)}%`;
      }
    }
    return s.statusLine;
  };

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-[#14161A]">
          {isAr ? "المواد الدراسية" : "Subjects"}
        </h2>
        {subjects.length > 0 && (
          <span className="text-[12px] font-medium text-[#5B6270]">
            {isAr
              ? `${subjects.length} مواد نشطة`
              : `${subjects.length} active`}
          </span>
        )}
      </div>

      {subjects.length > 0 ? (
        <div className="flex flex-col divide-y divide-[#ECEEFA]">
          {subjects.map((sub) => {
            const statusText = formatStatus(sub);
            return (
              <Link
                key={sub.id}
                href="/school"
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between group hover:opacity-85 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color || "#6366F1" }}
                  />
                  <span className="text-[14px] font-medium text-[#14161A] group-hover:text-[#0051D5] transition-colors">
                    {sub.name}
                  </span>
                </div>
                {statusText && (
                  <span className="text-[12px] text-[#5B6270]">
                    {statusText}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : loading ? (
        <div className="py-4 text-[12px] text-[#5B6270]">
          {isAr ? "جاري التحميل..." : "Loading subjects..."}
        </div>
      ) : (
        <div className="py-4 text-[14px] text-[#5B6270]">
          {isAr ? "مفيش مواد متسجلة لسه" : "No subjects added yet"}
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/school"
          className="w-full text-left rtl:text-right text-[14px] font-medium text-[#14161A] hover:text-[#0051D5] py-1 transition-colors block"
        >
          {isAr ? "+ إضافة مادة" : "+ Add subject"}
        </Link>
      </div>
    </div>
  );
}
