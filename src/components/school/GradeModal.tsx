"use client";

import React, { useState, useEffect } from "react";
import {
  GradeItem,
  SubjectItem,
  GradeType,
  validateGradeInput,
} from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";
import { X, Loader2, AlertCircle, Award } from "lucide-react";

interface GradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (grade: {
    subject_id: string;
    type: GradeType;
    title: string;
    mark_achieved: number;
    mark_total: number;
    weight_pct: number | null;
    entry_date: string;
    note: string | null;
  }) => Promise<void>;
  subjects: SubjectItem[];
  preselectedSubjectId?: string;
  initialGrade?: GradeItem | null;
  isBlocked?: boolean;
}

export function GradeModal({
  isOpen,
  onClose,
  onSave,
  subjects,
  preselectedSubjectId,
  initialGrade,
  isBlocked = false,
}: GradeModalProps) {
  const { locale } = useI18n();
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState<GradeType>("quiz");
  const [title, setTitle] = useState("");
  const [markAchieved, setMarkAchieved] = useState("");
  const [markTotal, setMarkTotal] = useState("100");
  const [weightPct, setWeightPct] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get local date in YYYY-MM-DD
  const getTodayLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (initialGrade) {
      setSubjectId(initialGrade.subject_id);
      setType(initialGrade.type);
      setTitle(initialGrade.title);
      setMarkAchieved(String(initialGrade.mark_achieved));
      setMarkTotal(String(initialGrade.mark_total));
      setWeightPct(
        initialGrade.weight_pct !== null && initialGrade.weight_pct !== undefined
          ? String(initialGrade.weight_pct)
          : ""
      );
      setEntryDate(initialGrade.entry_date || getTodayLocalDateStr());
      setNote(initialGrade.note || "");
    } else {
      setSubjectId(
        preselectedSubjectId ||
          (subjects.length > 0 ? subjects[0].id : "")
      );
      setType("quiz");
      setTitle("");
      setMarkAchieved("");
      setMarkTotal("100");
      setWeightPct("");
      setEntryDate(getTodayLocalDateStr());
      setNote("");
    }
    setError(null);
  }, [initialGrade, preselectedSubjectId, subjects, isOpen]);

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

    const numAchieved = parseFloat(markAchieved);
    const numTotal = parseFloat(markTotal);
    const parsedWeight =
      weightPct.trim() !== "" ? parseFloat(weightPct) : null;

    if (isNaN(numAchieved) || isNaN(numTotal)) {
      setError("Please enter valid numeric marks.");
      return;
    }

    const validation = validateGradeInput({
      type,
      title: title.trim(),
      mark_achieved: numAchieved,
      mark_total: numTotal,
      weight_pct: parsedWeight,
    });

    if (!validation.valid) {
      setError(validation.error || "Invalid grade values.");
      return;
    }

    if (!entryDate) {
      setError("Entry date is required.");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        subject_id: subjectId,
        type,
        title: title.trim(),
        mark_achieved: numAchieved,
        mark_total: numTotal,
        weight_pct: parsedWeight,
        entry_date: entryDate,
        note: note.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record grade";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const computedPct =
    !isNaN(parseFloat(markAchieved)) &&
    !isNaN(parseFloat(markTotal)) &&
    parseFloat(markTotal) > 0
      ? Math.round(
          (parseFloat(markAchieved) / parseFloat(markTotal)) * 1000
        ) / 10
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div
        className="w-full max-w-md bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold font-mono text-on-surface">
              {locale === "ar"
                ? initialGrade ? "تعديل الدرجة" : "تسجيل درجة جديدة"
                : initialGrade ? "Edit Grade Entry" : "Record Grade"}
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

          {/* Grade Type: Strictly 'quiz' vs 'big_exam' */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "نوع التقييم * (كويز أو امتحان رئيسي)" : "Assessment Type * (2 Types Only)"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("quiz")}
                className={`py-2 px-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all ${
                  type === "quiz"
                    ? "border-amber-400 bg-amber-400/10 text-amber-700 font-semibold shadow-sm"
                    : "border-border-subtle bg-surface-container-low text-text-muted hover:border-border-medium"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>{locale === "ar" ? "كويز (دائرة)" : "Quiz (Circle)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setType("big_exam")}
                className={`py-2 px-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 transition-all ${
                  type === "big_exam"
                    ? "border-indigo-400 bg-indigo-400/10 text-indigo-700 font-semibold shadow-sm"
                    : "border-border-subtle bg-surface-container-low text-text-muted hover:border-border-medium"
                }`}
              >
                <span className="w-2.5 h-2.5 rotate-45 bg-indigo-400 inline-block" />
                <span>{locale === "ar" ? "امتحان رئيسي (معين)" : "Big Exam (Diamond)"}</span>
              </button>
            </div>
          </div>

          {/* Title Input with dir="auto" */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "عنوان التقييم *" : "Assessment Title *"}
            </label>
            <input
              type="text"
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "ar" ? "مثال: كويز ميكانيكا 1، امتحان نص الترم" : "e.g. Thermodynamics Quiz 1, Midterm Exam, كويز 1"}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors font-sans"
            />
          </div>

          {/* Mark Achieved & Mark Total */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant">
                {locale === "ar" ? "الدرجة المحققة *" : "Mark Achieved *"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={markAchieved}
                onChange={(e) => setMarkAchieved(e.target.value)}
                placeholder="e.g. 18.5"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant">
                {locale === "ar" ? "الدرجة النهائية * (> 0)" : "Total Mark * (> 0)"}
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={markTotal}
                onChange={(e) => setMarkTotal(e.target.value)}
                placeholder="e.g. 20"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors"
              />
            </div>
          </div>

          {/* Computed Percentage Preview */}
          {computedPct !== null && (
            <div className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">
                {locale === "ar" ? "النسبة المئوية:" : "Score Percentage:"}
              </span>
              <span
                className={`font-bold ${
                  computedPct >= 80
                    ? "text-emerald-600"
                    : computedPct >= 60
                    ? "text-amber-600"
                    : "text-crimson-alert"
                }`}
              >
                {computedPct}%
              </span>
            </div>
          )}

          {/* Coursework Weight % & Entry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant flex items-center justify-between">
                <span>{locale === "ar" ? "الوزن النسبي %" : "Weight %"}</span>
                <span className="text-[10px] text-text-muted">
                  {locale === "ar" ? "اختياري" : "Optional"}
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={weightPct}
                onChange={(e) => setWeightPct(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono focus:outline-none focus:border-amber-400 placeholder:text-text-muted transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant">
                {locale === "ar" ? "تاريخ التقييم *" : "Entry Date *"}
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-sm text-on-surface font-mono focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant">
              {locale === "ar" ? "ملاحظات (اختياري)" : "Notes (Optional)"}
            </label>
            <textarea
              dir="auto"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={locale === "ar" ? "مثال: نقصت في الاستنتاج؛ محتاج مراجعة على الشابتر التالت" : "e.g. Lost marks on derivation; revision needed on chapter 3"}
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
                    ? initialGrade ? "تحديث الدرجة" : "حفظ الدرجة"
                    : initialGrade ? "Update Grade" : "Save Grade"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
