"use client";

import React, { useState, useMemo } from "react";
import {
  ScheduleItem,
  SubjectItem,
  getNextClassToday,
  normalizeTimeString,
} from "@/lib/school";
import { formatTimeRange12h } from "@/lib/time";
import { SessionModal } from "./SessionModal";
import { useI18n } from "@/lib/i18n/I18nContext";

interface TimetableGridProps {
  schedule: ScheduleItem[];
  subjects: SubjectItem[];
  onAddSession: (session: any) => Promise<void>;
  onEditSession: (id: string, session: any) => Promise<void>;
  onDeleteSession: (id: string) => void;
  userTimeZone?: string;
}

const DAYS_EN = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const DAYS_AR = [
  { value: 0, label: "الأحد", short: "أحد" },
  { value: 1, label: "الإثنين", short: "إثنين" },
  { value: 2, label: "الثلاثاء", short: "ثلاثاء" },
  { value: 3, label: "الأربعاء", short: "أربعاء" },
  { value: 4, label: "الخميس", short: "خميس" },
  { value: 5, label: "الجمعة", short: "جمعة" },
  { value: 6, label: "السبت", short: "سبت" },
];

const SESSION_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  lecture: { en: "Lecture", ar: "محاضرة" },
  lab: { en: "Lab", ar: "معمل" },
  section: { en: "Section", ar: "سكشن" },
  seminar: { en: "Seminar", ar: "سيمنار" },
};

export function TimetableGrid({
  schedule,
  subjects,
  onAddSession,
  onEditSession,
  onDeleteSession,
  userTimeZone = "Africa/Cairo",
}: TimetableGridProps) {
  const { locale } = useI18n();
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDay());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ScheduleItem | null>(null);

  const daysList = locale === "ar" ? DAYS_AR : DAYS_EN;
  const currentDayObj = daysList.find((d) => d.value === selectedDay) || daysList[0];

  const activeSubjectsMap = useMemo(
    () => new Map(subjects.filter((s) => !s.deleted_at).map((s) => [s.id, s])),
    [subjects]
  );

  const activeSchedule = useMemo(
    () =>
      schedule.filter((item) => {
        if (item.deleted_at) return false;
        const sub = activeSubjectsMap.get(item.subject_id);
        return sub && !sub.archived;
      }),
    [schedule, activeSubjectsMap]
  );

  const nextClassInfo = useMemo(
    () => getNextClassToday(schedule, subjects, new Date(), userTimeZone),
    [schedule, subjects, userTimeZone]
  );

  const daySessions = useMemo(() => {
    return activeSchedule
      .filter((item) => item.day_of_week === selectedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [activeSchedule, selectedDay]);

  const handleOpenAdd = (day: number) => {
    setSelectedDay(day);
    setEditingSession(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (session: ScheduleItem) => {
    setEditingSession(session);
    setModalOpen(true);
  };

  const handleSaveModal = async (payload: any) => {
    if (editingSession) {
      await onEditSession(editingSession.id, payload);
    } else {
      await onAddSession(payload);
    }
  };

  return (
    <div className="space-y-6">
      {(() => {
        const totalWeeklyMinutes = activeSchedule.reduce((acc, item) => {
          const [sh, sm] = item.start_time.split(":").map(Number);
          const [eh, em] = item.end_time.split(":").map(Number);
          const mins = eh * 60 + em - (sh * 60 + sm);
          return acc + (mins > 0 ? mins : 60);
        }, 0);
        const weeklyHoursStr = (totalWeeklyMinutes / 60).toFixed(1);
        const labSessionsCount = activeSchedule.filter((s) => s.session_type === "lab").length;
        const timeSlots = ["08:00", "09:00", "11:00", "12:00", "14:00", "16:00"];

        return (
          <>
      {/* Hero Next Class Banner */}
      {nextClassInfo && (
        <div className="relative overflow-hidden rounded-[20px] bg-white border border-[#e2e8f9] p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#e7eeff] flex items-center justify-center shrink-0 text-[#0051d5]">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="inline-flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e7eeff] text-[#0051d5]">
                    {locale === "ar" ? "تبدأ قريباً" : "Starting soon"}
                  </span>
                  {nextClassInfo.nextClass.location && (
                    <span className="text-xs text-[#45474b]">
                      {nextClassInfo.nextClass.location}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[#151c28]">
                  {locale === "ar"
                    ? `الحصة القادمة: ${nextClassInfo.subject.name}، خلال ${Math.floor(nextClassInfo.startsInMinutes / 60)}س و${nextClassInfo.startsInMinutes % 60}د`
                    : `Next class: ${nextClassInfo.subject.name}, in ${Math.floor(nextClassInfo.startsInMinutes / 60)}h ${nextClassInfo.startsInMinutes % 60}m`}
                </h2>
                <p className="text-xs text-[#45474b] mt-0.5">
                  {SESSION_TYPE_LABELS[nextClassInfo.nextClass.session_type]?.[locale] || nextClassInfo.nextClass.session_type},{" "}
                  {formatTimeRange12h(nextClassInfo.nextClass.start_time, nextClassInfo.nextClass.end_time, { locale })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex flex-col items-start lg:items-end">
                <span className="text-[11px] text-[#717784]">
                  {locale === "ar" ? "الفترة الحالية" : "Current period"}
                </span>
                <span className="text-xs font-semibold text-[#151c28]">
                  {locale === "ar" ? "تحضير ومراجعة" : "Preparation & review"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAdd(selectedDay)}
                className="h-10 px-4 bg-[#e7eeff] text-[#151c28] rounded-xl text-xs font-semibold hover:bg-[#e2e8f9] transition-colors cursor-pointer"
              >
                {locale === "ar" ? "+ حصة جديدة" : "+ Add class"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Section */}
      <div className="rounded-[20px] bg-white border border-[#e2e8f9] shadow-xs p-5 sm:p-6 flex flex-col gap-5">
        {/* Header of Timetable */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous week"
                onClick={() => setSelectedDay((prev) => (prev === 0 ? 6 : prev - 1))}
                className="w-9 h-9 rounded-lg bg-[#f0f3ff] flex items-center justify-center text-[#151c28] hover:bg-[#e7eeff] transition-colors cursor-pointer"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next week"
                onClick={() => setSelectedDay((prev) => (prev === 6 ? 0 : prev + 1))}
                className="w-9 h-9 rounded-lg bg-[#f0f3ff] flex items-center justify-center text-[#151c28] hover:bg-[#e7eeff] transition-colors cursor-pointer"
              >
                ›
              </button>
            </div>
            <span className="text-sm font-bold text-[#151c28]">
              {locale === "ar" ? `الجدول الدراسي الأسبوعي • ${currentDayObj.label}` : `Weekly Academic Schedule • ${currentDayObj.label}`}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[#45474b] text-xs font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5]" />
              <span>{locale === "ar" ? "محاضرات" : "Lectures"}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9863ff]" />
              <span>{locale === "ar" ? "معامل وسكاشن" : "Labs & Sections"}</span>
            </span>
            <button
              onClick={() => handleOpenAdd(selectedDay)}
              className="ml-auto sm:ml-2 px-3.5 py-1.5 rounded-xl bg-black text-white hover:bg-[#1a1c20] text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              {locale === "ar" ? "إضافة حصة" : "Add class"}
            </button>
          </div>
        </div>

        {/* Day Switcher for Mobile / Compact */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-[#f0f3ff] p-1 rounded-full border border-[#e2e8f9]">
          {daysList.map((d) => {
            const isSelected = selectedDay === d.value;
            const count = activeSchedule.filter((s) => s.day_of_week === d.value).length;
            const isToday = new Date().getDay() === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDay(d.value)}
                className={`flex-1 min-w-[56px] py-2 px-2 rounded-full text-center border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-[#e2e8f9] text-[#151c28] font-bold shadow-xs"
                    : isToday
                    ? "bg-[#e7eeff] border-transparent text-[#0051d5] font-semibold"
                    : "bg-transparent border-transparent text-[#717784] hover:text-[#151c28]"
                }`}
              >
                <div className="text-[11px] font-medium leading-none">{d.short}</div>
                <div className="text-[10px] mt-1 text-[#717784]">
                  {count > 0 ? `${count}` : "—"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Day Schedule Cards */}
        <div className="space-y-2.5">
          {daySessions.length === 0 ? (
            <div className="p-8 rounded-[20px] bg-[#f9f9ff] border border-dashed border-[#e2e8f9] text-center space-y-2">
              <p className="text-sm text-[#717784]">
                {locale === "ar"
                  ? `مفيش حصص أو محاضرات مجدولة يوم ${currentDayObj.label}`
                  : `No classes scheduled for ${currentDayObj.label}`}
              </p>
              <button
                type="button"
                onClick={() => handleOpenAdd(selectedDay)}
                className="text-xs text-[#0051d5] hover:underline font-semibold cursor-pointer"
              >
                {locale === "ar"
                  ? `+ إضافة حصة ليوم ${currentDayObj.label}`
                  : `+ Add a session for ${currentDayObj.label}`}
              </button>
            </div>
          ) : (
            daySessions.map((item) => {
              const sub = activeSubjectsMap.get(item.subject_id);
              const isLab = item.session_type === "lab" || item.session_type === "section";
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-[18px] bg-white border border-[#e2e8f9] hover:border-[#0051d5]/40 transition-all flex items-center justify-between gap-3 group shadow-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-2.5 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub?.color || (isLab ? "#9863ff" : "#0051d5") }}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#151c28]" dir="auto">
                          {formatTimeRange12h(item.start_time, item.end_time, { locale })}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isLab
                              ? "bg-[#eaddff] text-[#25005a]"
                              : "bg-[#e7eeff] text-[#0051d5]"
                          }`}
                        >
                          {SESSION_TYPE_LABELS[item.session_type]?.[locale] || item.session_type}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#151c28] truncate">
                        {sub?.name || (locale === "ar" ? "مادة غير معروفة" : "Unknown Subject")}
                      </h4>
                      {item.location && (
                        <p dir="auto" className="text-xs text-[#717784] truncate">
                          📍 {item.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-[#717784] hover:text-[#0051d5] hover:bg-[#f0f3ff] rounded-lg transition-colors cursor-pointer"
                      title={locale === "ar" ? "تعديل الحصة" : "Edit Session"}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(item.id)}
                      className="p-1.5 text-[#717784] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 rounded-lg transition-colors cursor-pointer"
                      title={locale === "ar" ? "حذف الحصة" : "Delete Session"}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Weekly Overview Summary Cards (from Stitch) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#45474b]">
              {locale === "ar" ? "ساعات الحصص الأسبوعية" : "Weekly lecture hours"}
            </span>
            <span className="text-xl font-bold text-[#151c28] mt-1">
              {weeklyHoursStr} {locale === "ar" ? "ساعة" : "hrs"}
            </span>
            <span className="text-xs font-semibold text-[#0051d5] mt-0.5">
              {activeSchedule.length} {locale === "ar" ? "حصة مجدولة" : "sessions scheduled"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#151c28]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
        </div>

        <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#45474b]">
              {locale === "ar" ? "جلسات المعامل والسكاشن" : "Laboratory & Sections"}
            </span>
            <span className="text-xl font-bold text-[#151c28] mt-1">
              {labSessionsCount} {locale === "ar" ? "جلسات" : "sessions"}
            </span>
            <span className="text-xs text-[#45474b] mt-0.5">
              {locale === "ar" ? "تطبيقات عملية" : "Practical lab work"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#6929c4]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
        </div>

        <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#45474b]">
              {locale === "ar" ? "المواد المسجلة في الجدول" : "Enrolled active courses"}
            </span>
            <span className="text-xl font-bold text-[#151c28] mt-1">
              {subjects.filter((s) => !s.deleted_at && !s.archived).length} {locale === "ar" ? "مواد" : "courses"}
            </span>
            <span className="text-xs font-semibold text-[#15803d] mt-0.5">
              {locale === "ar" ? "جدول نشط ومتناسق" : "Synchronized routine"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#15803d]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <SessionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        subjects={subjects}
        existingSessions={schedule}
        initialData={editingSession}
        initialDayOfWeek={selectedDay}
      />
          </>
        );
      })()}
    </div>
  );
}
