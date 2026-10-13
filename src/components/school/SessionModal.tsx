"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ScheduleItem,
  SubjectItem,
  SessionType,
  checkSessionOverlap,
  parseTimeToMinutes,
  normalizeTimeString,
} from "@/lib/school";

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: {
    subject_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location?: string | null;
    session_type: SessionType;
  }) => Promise<void>;
  subjects: SubjectItem[];
  existingSessions: ScheduleItem[];
  initialData?: ScheduleItem | null;
  initialDayOfWeek?: number;
}

const SESSION_TYPES: { type: SessionType; label: string; tokenClass: string }[] = [
  { type: "lecture", label: "Lecture", tokenClass: "session-lecture" },
  { type: "lab", label: "Lab", tokenClass: "session-lab" },
  { type: "section", label: "Section", tokenClass: "session-section" },
  { type: "seminar", label: "Seminar", tokenClass: "session-seminar" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function SessionModal({
  isOpen,
  onClose,
  onSave,
  subjects,
  existingSessions,
  initialData,
  initialDayOfWeek = 0,
}: SessionModalProps) {
  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.deleted_at && !s.archived),
    [subjects]
  );

  const [subjectId, setSubjectId] = useState<string>("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialDayOfWeek);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:30");
  const [location, setLocation] = useState<string>("");
  const [sessionType, setSessionType] = useState<SessionType>("lecture");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setSubjectId(initialData.subject_id);
      setDayOfWeek(initialData.day_of_week);
      setStartTime(normalizeTimeString(initialData.start_time));
      setEndTime(normalizeTimeString(initialData.end_time));
      setLocation(initialData.location || "");
      setSessionType(initialData.session_type);
    } else {
      setSubjectId(activeSubjects[0]?.id || "");
      setDayOfWeek(initialDayOfWeek);
      setStartTime("09:00");
      setEndTime("10:30");
      setLocation("");
      setSessionType("lecture");
    }
    setError(null);
  }, [initialData, initialDayOfWeek, activeSubjects, isOpen]);

  // Pure advisory collision check
  const advisoryConflict = useMemo(() => {
    if (!startTime || !endTime) return null;
    const currentCandidate = {
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    };

    const conflictingSession = existingSessions.find((sess) => {
      if (sess.deleted_at) return false;
      if (initialData && sess.id === initialData.id) return false; // ignore self
      // Exclude archived subjects
      const sub = subjects.find((s) => s.id === sess.subject_id);
      if (!sub || sub.archived || sub.deleted_at) return false;

      return checkSessionOverlap(currentCandidate, {
        day_of_week: sess.day_of_week,
        start_time: sess.start_time,
        end_time: sess.end_time,
      });
    });

    if (conflictingSession) {
      const sub = subjects.find((s) => s.id === conflictingSession.subject_id);
      return {
        subjectName: sub?.name || "Existing Class",
        start: normalizeTimeString(conflictingSession.start_time),
        end: normalizeTimeString(conflictingSession.end_time),
      };
    }
    return null;
  }, [dayOfWeek, startTime, endTime, existingSessions, initialData, subjects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }

    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);

    if (endMins <= startMins) {
      setError("End time must be strictly after start time.");
      return;
    }

    const durationMins = endMins - startMins;
    if (durationMins < 15) {
      setError("Session duration must be at least 15 minutes.");
      return;
    }
    if (durationMins > 720) {
      setError("Session duration cannot exceed 12 hours.");
      return;
    }

    if (location.trim().length > 100) {
      setError("Location cannot exceed 100 characters.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        subject_id: subjectId,
        day_of_week: dayOfWeek,
        start_time: normalizeTimeString(startTime),
        end_time: normalizeTimeString(endTime),
        location: location.trim() || null,
        session_type: sessionType,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save schedule session.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-surface-container w-full max-w-md rounded-2xl border border-border-subtle p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle/50">
          <h2 className="text-base font-bold text-on-surface">
            {initialData ? "Edit Class Session" : "Add Class Session"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject Picker */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-high rounded-xl border border-border-subtle text-sm text-on-surface focus:outline-none focus:border-amber-400"
            >
              {activeSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Day of Week</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-surface-container-high rounded-xl border border-border-subtle text-sm text-on-surface focus:outline-none focus:border-amber-400"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-high rounded-xl border border-border-subtle text-sm text-on-surface focus:outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-high rounded-xl border border-border-subtle text-sm text-on-surface focus:outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>
          </div>

          {/* Advisory Collision Warning */}
          {advisoryConflict && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <span className="font-semibold">Advisory Overlap:</span> Overlaps with{" "}
                <span className="font-medium text-amber-200">{advisoryConflict.subjectName}</span> (
                {advisoryConflict.start} – {advisoryConflict.end}). You can still save if intentional.
              </div>
            </div>
          )}

          {/* Session Type Pills */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Session Type</label>
            <div className="grid grid-cols-4 gap-2">
              {SESSION_TYPES.map(({ type, label, tokenClass }) => {
                const isSelected = sessionType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSessionType(type)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? `${tokenClass} ring-2 ring-amber-400/40 shadow-sm`
                        : "bg-surface-container-high/60 border-border-subtle text-text-muted hover:text-on-surface"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location with dir="auto" */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Location / Room <span className="text-[11px] text-text-muted">(Supports Arabic)</span>
            </label>
            <input
              type="text"
              dir="auto"
              maxLength={100}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hall 302, مبنى الهندسة"
              className="w-full px-3 py-2 bg-surface-container-high rounded-xl border border-border-subtle text-sm text-on-surface focus:outline-none focus:border-amber-400"
            />
          </div>

          {error && <p className="text-xs text-status-negative">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle/40">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-surface transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : initialData ? "Save Changes" : "Add to Timetable"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
