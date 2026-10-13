"use client";

import React, { useState, useMemo } from "react";
import {
  ScheduleItem,
  SubjectItem,
  getNextClassToday,
  normalizeTimeString,
} from "@/lib/school";
import { SessionModal } from "./SessionModal";

interface TimetableGridProps {
  schedule: ScheduleItem[];
  subjects: SubjectItem[];
  onAddSession: (session: any) => Promise<void>;
  onEditSession: (id: string, session: any) => Promise<void>;
  onDeleteSession: (id: string) => void;
  userTimeZone?: string;
}

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export function TimetableGrid({
  schedule,
  subjects,
  onAddSession,
  onEditSession,
  onDeleteSession,
  userTimeZone = "Africa/Cairo",
}: TimetableGridProps) {
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDay());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ScheduleItem | null>(null);

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
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-sm">
              ⏳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Next Class Today
                </span>
                <span className="text-[11px] text-text-muted">
                  in {Math.floor(nextClassInfo.startsInMinutes / 60)}h {nextClassInfo.startsInMinutes % 60}m
                </span>
              </div>
              <h4 className="text-sm font-bold text-on-surface">
                {nextClassInfo.subject.name}
              </h4>
              <p className="text-xs text-text-muted">
                {normalizeTimeString(nextClassInfo.nextClass.start_time)} –{" "}
                {normalizeTimeString(nextClassInfo.nextClass.end_time)}
                {nextClassInfo.nextClass.location && (
                  <span dir="auto" className="ml-1.5 text-on-surface-variant font-medium">
                    • {nextClassInfo.nextClass.location}
                  </span>
                )}
              </p>
            </div>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border session-${nextClassInfo.nextClass.session_type}`}>
            {nextClassInfo.nextClass.session_type}
          </span>
        </div>
      )}

      {/* Header controls & Add Button */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-on-surface">Weekly Timetable</h3>
        <button
          onClick={() => handleOpenAdd(selectedDay)}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-surface text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <span>+</span>
          <span>Add Class</span>
        </button>
      </div>

      {/* Mobile Day Switcher (Scrollable Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.map((d) => {
          const isSelected = selectedDay === d.value;
          const count = activeSchedule.filter((s) => s.day_of_week === d.value).length;
          return (
            <button
              key={d.value}
              onClick={() => setSelectedDay(d.value)}
              className={`flex-1 min-w-[56px] py-2 px-1 rounded-xl text-center border transition-all ${
                isSelected
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-sm"
                  : "bg-surface-container border-border-subtle/50 text-text-muted hover:text-on-surface"
              }`}
            >
              <div className="text-[11px] font-medium leading-none">{d.short}</div>
              <div className="text-[10px] mt-1 text-text-muted">
                {count > 0 ? `${count}` : "—"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day Schedule Cards */}
      <div className="space-y-2.5">
        {daySessions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-container/60 border border-border-subtle text-center space-y-2">
            <p className="text-sm text-text-muted">No classes scheduled for {DAYS[selectedDay].label}</p>
            <button
              onClick={() => handleOpenAdd(selectedDay)}
              className="text-xs text-amber-400 hover:underline font-medium"
            >
              + Add a session for {DAYS[selectedDay].label}
            </button>
          </div>
        ) : (
          daySessions.map((item) => {
            const sub = activeSubjectsMap.get(item.subject_id);
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-surface-container border border-border-subtle hover:border-border-medium transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-2.5 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: sub?.color || "#F59E0B" }}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-on-surface">
                        {normalizeTimeString(item.start_time)} – {normalizeTimeString(item.end_time)}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border session-${item.session_type}`}>
                        {item.session_type}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-on-surface truncate">
                      {sub?.name || "Unknown Subject"}
                    </h4>
                    {item.location && (
                      <p dir="auto" className="text-xs text-text-muted truncate">
                        📍 {item.location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-text-muted hover:text-amber-300 hover:bg-surface-container-high rounded-lg transition-colors"
                    title="Edit Session"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDeleteSession(item.id)}
                    className="p-1.5 text-text-muted hover:text-status-negative hover:bg-surface-container-high rounded-lg transition-colors"
                    title="Delete Session"
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
