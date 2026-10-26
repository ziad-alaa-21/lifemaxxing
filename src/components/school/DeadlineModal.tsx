"use client";

import React, { useState, useEffect } from "react";
import {
  DeadlineItem,
  SubjectItem,
  DeadlineType,
  DeadlinePriority,
  parseDateToEndOfDay,
  validateDeadlineInput,
} from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";
import { X, Loader2, AlertCircle, CalendarClock } from "lucide-react";

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadline: {
    subject_id: string;
    type: DeadlineType;
    title: string;
    due_date: string;
    priority: DeadlinePriority;
    notes: string | null;
  }) => Promise<void>;
  subjects: SubjectItem[];
  preselectedSubjectId?: string;
  initialDeadline?: DeadlineItem | null;
  isBlocked?: boolean;
}

export function DeadlineModal({
  isOpen,
  onClose,
  onSave,
  subjects,
  preselectedSubjectId,
  initialDeadline,
  isBlocked = false,
}: DeadlineModalProps) {
  const { locale } = useI18n();
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState<DeadlineType>("exam");
  const [title, setTitle] = useState("");
  const [dueDateString, setDueDateString] = useState("");
  const [priority, setPriority] = useState<DeadlinePriority>("medium");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to format ISO timestamp to YYYY-MM-DD for date input
  const isoToDateInput = (iso: string) => {
    try {
      const d = new Date(iso);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (initialDeadline) {
      setSubjectId(initialDeadline.subject_id);
      setType(initialDeadline.type);
      setTitle(initialDeadline.title);
      setDueDateString(isoToDateInput(initialDeadline.due_date));
      setPriority(initialDeadline.priority || "medium");
      setNotes(initialDeadline.notes || "");
    } else {
      setSubjectId(
        preselectedSubjectId || (subjects.length > 0 ? subjects[0].id : "")
      );
      setType("exam");
      setTitle("");
      // Default to 7 days from now
      const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setDueDateString(isoToDateInput(inSevenDays.toISOString()));
      setPriority("medium");
      setNotes("");
    }
    setError(null);
  }, [initialDeadline, preselectedSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isBlocked) {
      setError("Offline: saving disabled to protect sync integrity.");
      return;
    }

    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }

    if (!dueDateString) {
      setError("Due date is required.");
      return;
    }

    // Convert date string to exact 23:59:59.999 in user timezone
    const computedDueIso = parseDateToEndOfDay(dueDateString);

    const validation = validateDeadlineInput({
      type,
      title: title.trim(),
      due_date: computedDueIso,
    });

    if (!validation.valid) {
      setError(validation.error || "Invalid deadline data.");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        subject_id: subjectId,
        type,
        title: title.trim(),
        due_date: computedDueIso,
        priority,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record deadline";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const deadlineTypes: { type: DeadlineType; label: string }[] = [
    { type: "exam", label: locale === "ar" ? "امتحان" : "Exam" },
    { type: "quiz", label: locale === "ar" ? "كويز" : "Quiz" },
    { type: "assignment", label: locale === "ar" ? "واجب / شيت" : "Assignment" },
    { type: "project", label: locale === "ar" ? "مشروع" : "Project" },
    { type: "reading", label: locale === "ar" ? "مذاكرة / قراءة" : "Reading" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div
        className="w-full max-w-md bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold font-mono text-on-surface">
              {locale === "ar"
                ? initialDeadline ? "تعديل موعد التسليم" : "إضافة موعد تسليم"
                : initialDeadline ? "Edit Deadline" : "Add Deadline"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "المادة *" : "Subject *"}
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface focus:outline-none focus:border-amber-400 transition-colors"
            >
              <option value="" disabled>
                {locale === "ar" ? "اختر المادة" : "Select subject"}
              </option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "نوع التسليم *" : "Deadline Type *"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {deadlineTypes.map((dt) => (
                <button
                  key={dt.type}
                  type="button"
                  onClick={() => setType(dt.type)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all capitalize ${
                    type === dt.type
                      ? "border-amber-400 bg-amber-400/10 text-amber-700 font-semibold shadow-sm"
                      : "border-border-subtle bg-surface-container-low text-text-muted hover:border-border-medium"
                  }`}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input with dir="auto" */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "العنوان *" : "Title *"}
            </label>
            <input
              type="text"
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "ar" ? "مثال: امتحان فاينال، شيت 4، تسليم المشروع" : "e.g. Final Exam, Problem Set 4, تسليم المشروع"}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors font-sans"
            />
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant flex items-center justify-between">
                <span>{locale === "ar" ? "تاريخ التسليم *" : "Due Date *"}</span>
                <span className="text-[10px] text-text-muted">11:59 PM</span>
              </label>
              <input
                type="date"
                value={dueDateString}
                onChange={(e) => setDueDateString(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant">
                {locale === "ar" ? "الأولوية" : "Priority"}
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as DeadlinePriority)
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono focus:outline-none focus:border-amber-400 transition-colors capitalize"
              >
                <option value="low">{locale === "ar" ? "أولوية هادية" : "Low Priority"}</option>
                <option value="medium">{locale === "ar" ? "أولوية متوسطة" : "Medium Priority"}</option>
                <option value="high">{locale === "ar" ? "أولوية عاجلة / قصوى" : "High Priority"}</option>
              </select>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "ملاحظات (اختياري)" : "Notes (Optional)"}
            </label>
            <textarea
              dir="auto"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={locale === "ar" ? "مثال: مراجعة الشباتر 4-7؛ هات الآلة الحاسبة" : "e.g. Chapters 4-7 covered; bring scientific calculator"}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors font-sans resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-mono text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving || isBlocked}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-semibold uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50 shadow-xs transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{locale === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>
                  {locale === "ar"
                    ? initialDeadline ? "تحديث الموعد" : "حفظ الموعد"
                    : initialDeadline ? "Update Deadline" : "Save Deadline"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
