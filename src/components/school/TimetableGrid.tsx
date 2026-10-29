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
    <div className="space-y-4">
      {/* Next Class Today Banner */}
      {nextClassInfo && (
        <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f0f3ff] border border-[#dce2f3] flex items-center justify-center text-[#0051d5] font-bold text-sm">
              ⏳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0051d5] uppercase tracking-wider">
                  {locale === "ar" ? "المحاضرة / الحصة القادمة النهاردة" : "Next Class Today"}
                </span>
                <span className="text-[11px] text-[#717784]">
                  {locale === "ar"
                    ? `خلال ${Math.floor(nextClassInfo.startsInMinutes / 60)}س و${nextClassInfo.startsInMinutes % 60}د`
                    : `in ${Math.floor(nextClassInfo.startsInMinutes / 60)}h ${nextClassInfo.startsInMinutes % 60}m`}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#151c28]">
                {nextClassInfo.subject.name}
              </h4>
              <p className="text-xs text-[#717784]">
                {formatTimeRange12h(nextClassInfo.nextClass.start_time, nextClassInfo.nextClass.end_time, { locale })}
                {nextClassInfo.nextClass.location && (
                  <span dir="auto" className="ml-1.5 text-[#45474b] font-medium">
                    • {nextClassInfo.nextClass.location}
                  </span>
                )}
              </p>
            </div>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border session-${nextClassInfo.nextClass.session_type}`}>
            {SESSION_TYPE_LABELS[nextClassInfo.nextClass.session_type]?.[locale] || nextClassInfo.nextClass.session_type}
          </span>
        </div>
      )}

      {/* Header controls & Add Button */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-[#151c28]">
          {locale === "ar" ? "الجدول الأسبوعي" : "Weekly Schedule"}
        </h3>
        <button
          onClick={() => handleOpenAdd(selectedDay)}
          className="px-4 py-2.5 rounded-xl bg-[#0051d5] hover:bg-[#003ea8] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <span>+</span>
          <span>{locale === "ar" ? "إضافة حصة" : "Add Class"}</span>
        </button>
      </div>

      {/* Mobile Day Switcher (Scrollable Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-[#f0f3ff] p-1 rounded-full border border-[#e2e8f9]">
        {daysList.map((d) => {
          const isSelected = selectedDay === d.value;
          const count = activeSchedule.filter((s) => s.day_of_week === d.value).length;
          return (
            <button
              key={d.value}
              onClick={() => setSelectedDay(d.value)}
              className={`flex-1 min-w-[56px] py-2 px-2 rounded-full text-center border transition-all cursor-pointer ${
                isSelected
                  ? "bg-white border-[#e2e8f9] text-[#151c28] font-bold shadow-xs"
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
          <div className="p-8 rounded-[20px] bg-white border border-[#e2e8f9] text-center space-y-2 shadow-xs">
            <p className="text-sm text-[#717784]">
              {locale === "ar"
                ? `مفيش حصص أو محاضرات مجدولة يوم ${currentDayObj.label}`
                : `No classes scheduled for ${currentDayObj.label}`}
            </p>
            <button
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
            return (
              <div
                key={item.id}
                className="p-4 rounded-[18px] bg-white border border-[#e2e8f9] hover:border-[#0051d5]/40 transition-all flex items-center justify-between gap-3 group shadow-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-2.5 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: sub?.color || "#0051d5" }}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#151c28]" dir="auto">
                        {formatTimeRange12h(item.start_time, item.end_time, { locale })}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border session-${item.session_type}`}>
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
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-[#717784] hover:text-[#0051d5] hover:bg-[#f0f3ff] rounded-lg transition-colors cursor-pointer"
                    title={locale === "ar" ? "تعديل الحصة" : "Edit Session"}
                  >
                    ✏️
                  </button>
                  <button
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

      <SessionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        subjects={subjects}
        existingSessions={schedule}
        initialData={editingSession}
        initialDayOfWeek={selectedDay}
      />
    </div>
  );
}
