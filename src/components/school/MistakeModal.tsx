"use client";

import React, { useState, useEffect } from "react";
import { MistakeItem, SubjectItem, MistakeCause } from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";
import { X, Loader2, AlertCircle, BookX } from "lucide-react";

interface MistakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mistake: {
    subject_id: string;
    topic: string;
    question_context: string;
    error_made: string;
    correct_solution: string;
    cause: MistakeCause;
  }) => Promise<void>;
  subjects: SubjectItem[];
  preselectedSubjectId?: string;
  initialMistake?: MistakeItem | null;
  isBlocked?: boolean;
}

const CAUSE_OPTIONS: Array<{
  value: MistakeCause;
  label: string;
  desc: string;
  color: string;
}> = [
  {
    value: "concept",
    label: "Concept",
    desc: "Theory or core principle misunderstood",
    color: "border-indigo-500/40 text-indigo-300 bg-indigo-500/10",
  },
  {
    value: "careless",
    label: "Careless",
    desc: "Arithmetic slip, misread question, or sign error",
    color: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
  {
    value: "time",
    label: "Time",
    desc: "Rushed or ran out of time on the question",
    color: "border-stone-500/40 text-stone-300 bg-stone-500/10",
  },
  {
    value: "memory",
    label: "Memory",
    desc: "Forgot a formula, definition, or identity",
    color: "border-teal-500/40 text-teal-300 bg-teal-500/10",
  },
];

export function MistakeModal({
  isOpen,
  onClose,
  onSave,
  subjects,
  preselectedSubjectId,
  initialMistake,
  isBlocked = false,
}: MistakeModalProps) {
  const { locale } = useI18n();
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [questionContext, setQuestionContext] = useState("");
  const [errorMade, setErrorMade] = useState("");
  const [correctSolution, setCorrectSolution] = useState("");
  const [cause, setCause] = useState<MistakeCause>("concept");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const causeOptions: Array<{
    value: MistakeCause;
    label: string;
    desc: string;
    color: string;
  }> = [
    {
      value: "concept",
      label: locale === "ar" ? "سوء فهم نظري" : "Concept",
      desc: locale === "ar" ? "فهم خاطئ للنظرية أو المبدأ الأساسي" : "Theory or core principle misunderstood",
      color: "border-indigo-500/40 text-indigo-300 bg-indigo-500/10",
    },
    {
      value: "careless",
      label: locale === "ar" ? "تسرع وسهو" : "Careless",
      desc: locale === "ar" ? "غلطة حسابية، عدم قراءة السؤال بدقة، أو إشارة" : "Arithmetic slip, misread question, or sign error",
      color: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    },
    {
      value: "time",
      label: locale === "ar" ? "ضيق وقت" : "Time",
      desc: locale === "ar" ? "ارتباك أو الوقت خلص قبل ما تكمل السؤال" : "Rushed or ran out of time on the question",
      color: "border-stone-500/40 text-stone-300 bg-stone-500/10",
    },
    {
      value: "memory",
      label: locale === "ar" ? "نسيان القانون" : "Memory",
      desc: locale === "ar" ? "نسيت قانون أو تعريف رياضي أساسي" : "Forgot a formula, definition, or identity",
      color: "border-teal-500/40 text-teal-300 bg-teal-500/10",
    },
  ];

  useEffect(() => {
    if (initialMistake) {
      setSubjectId(initialMistake.subject_id);
      setTopic(initialMistake.topic || "");
      setQuestionContext(initialMistake.question_context || "");
      setErrorMade(initialMistake.error_made || "");
      setCorrectSolution(initialMistake.correct_solution || "");
      setCause(initialMistake.cause || "concept");
    } else {
      setSubjectId(preselectedSubjectId || (subjects.length > 0 ? subjects[0].id : ""));
      setTopic("");
      setQuestionContext("");
      setErrorMade("");
      setCorrectSolution("");
      setCause("concept");
    }
    setError(null);
  }, [initialMistake, preselectedSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isBlocked) {
      setError(locale === "ar" ? "غير متصل بالإنترنت: تم إيقاف الحفظ لمنع تعارض البيانات." : "Offline: saving disabled to protect sync integrity.");
      return;
    }

    if (!subjectId) {
      setError(locale === "ar" ? "من فضلك اختر المادة." : "Please select a subject.");
      return;
    }

    if (!topic.trim()) {
      setError(locale === "ar" ? "عنوان الموضوع مطلوب." : "Topic is required.");
      return;
    }

    if (topic.trim().length > 120) {
      setError(locale === "ar" ? "عنوان الموضوع لا يمكن أن يتجاوز 120 حرفاً." : "Topic name cannot exceed 120 characters.");
      return;
    }

    if (!questionContext.trim()) {
      setError(locale === "ar" ? "سياق ونص السؤال مطلوب." : "Question context is required.");
      return;
    }

    if (questionContext.trim().length > 2000) {
      setError(locale === "ar" ? "سياق السؤال لا يمكن أن يتجاوز 2000 حرف." : "Question context cannot exceed 2000 characters.");
      return;
    }

    if (!errorMade.trim()) {
      setError(locale === "ar" ? "من فضلك حدد طبيعة الخطأ الذي وقعت فيه." : "Please specify the error made.");
      return;
    }

    if (errorMade.trim().length > 2000) {
      setError(locale === "ar" ? "توضيح الخطأ لا يمكن أن يتجاوز 2000 حرف." : "Error explanation cannot exceed 2000 characters.");
      return;
    }

    if (!correctSolution.trim()) {
      setError(locale === "ar" ? "الحل الصحيح والخطوات مطلوب." : "Correct solution is required.");
      return;
    }

    if (correctSolution.trim().length > 2000) {
      setError(locale === "ar" ? "الحل الصحيح لا يمكن أن يتجاوز 2000 حرف." : "Correct solution cannot exceed 2000 characters.");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        subject_id: subjectId,
        topic: topic.trim(),
        question_context: questionContext.trim(),
        error_made: errorMade.trim(),
        correct_solution: correctSolution.trim(),
        cause,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (locale === "ar" ? "فشل تسجيل الخطأ" : "Failed to record mistake"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40">
      <div
        className="w-full max-w-xl bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <BookX className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-on-surface">
                {locale === "ar"
                  ? initialMistake ? "تعديل الخطأ الأكاديمي" : "تسجيل خطأ جديد في الكشكول"
                  : initialMistake ? "Edit Academic Mistake" : "Log Mistake in Notebook"}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-mono">
                {locale === "ar"
                  ? "توثيق سبب الخطأ والحل الصحيح لإعادة حله بالاسترجاع النشط"
                  : "Catalog error cause and solution for active-recall redo"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Subject Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              {locale === "ar" ? "المادة" : "Subject"} <span className="text-crimson-alert">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface focus:outline-none focus:border-amber-500/50"
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {locale === "ar" ? "الموضوع / عنوان المسألة" : "Topic / Problem Area"} <span className="text-crimson-alert">*</span>
              </label>
              <span className="text-[10px] text-text-muted">
                {topic.length}/120
              </span>
            </div>
            <input
              type="text"
              dir="auto"
              value={topic}
              maxLength={120}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={locale === "ar" ? "مثال: التكامل بالتجزيء، قانون حفظ كمية الحركة" : "e.g. Integration by Parts, Conservation of Momentum"}
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface placeholder:text-text-muted focus:outline-none focus:border-amber-500/50"
              required
            />
          </div>

          {/* Cause Selector Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              {locale === "ar" ? "تصنيف سبب الخطأ" : "Root Cause Taxonomy"} <span className="text-crimson-alert">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {causeOptions.map((opt) => {
                const isSelected = cause === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCause(opt.value)}
                    className={`p-2.5 rounded-xl border text-start transition-all ${
                      isSelected
                        ? `${opt.color} ring-1 ring-amber-400/40 shadow-sm font-semibold`
                        : "bg-surface-container-high border-border-subtle text-text-muted hover:border-border-medium"
                    }`}
                  >
                    <div className="text-xs capitalize font-bold">{opt.label}</div>
                    <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Context */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {locale === "ar" ? "سياق ونص المسألة / المعطيات" : "Problem Statement / Context"} <span className="text-crimson-alert">*</span>
              </label>
              <span className="text-[10px] text-text-muted">
                {questionContext.length}/2000
              </span>
            </div>
            <textarea
              dir="auto"
              rows={3}
              value={questionContext}
              maxLength={2000}
              onChange={(e) => setQuestionContext(e.target.value)}
              placeholder={locale === "ar" ? "اكتب رأس السؤال والمعطيات بدقة..." : "State the prompt, setup, or parameters of the question exactly..."}
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface placeholder:text-text-muted focus:outline-none focus:border-amber-500/50 resize-y"
              required
            />
          </div>

          {/* Error Made */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {locale === "ar" ? "إيه الغلطة اللي وقعت فيها؟" : "Error Made / Misconception"} <span className="text-crimson-alert">*</span>
              </label>
              <span className="text-[10px] text-text-muted">
                {errorMade.length}/2000
              </span>
            </div>
            <textarea
              dir="auto"
              rows={2}
              value={errorMade}
              maxLength={2000}
              onChange={(e) => setErrorMade(e.target.value)}
              placeholder={locale === "ar" ? "الغلطة كانت فين؟ مثال: نسيت أغير إشارة الأس السالب..." : "What went wrong? e.g. Dropped the negative sign in the exponent..."}
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface placeholder:text-text-muted focus:outline-none focus:border-amber-500/50 resize-y"
              required
            />
          </div>

          {/* Correct Solution */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {locale === "ar" ? "خطوات الحل الصحيح" : "Correct Solution & Steps"} <span className="text-crimson-alert">*</span>
              </label>
              <span className="text-[10px] text-text-muted">
                {correctSolution.length}/2000
              </span>
            </div>
            <textarea
              dir="auto"
              rows={3}
              value={correctSolution}
              maxLength={2000}
              onChange={(e) => setCorrectSolution(e.target.value)}
              placeholder={locale === "ar" ? "اكتب خطوات الحل السليمة خطوة بخطوة عشان لما ترجع تحلها تاني..." : "Write the full, verified derivation or explanation step by step..."}
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface placeholder:text-text-muted focus:outline-none focus:border-amber-500/50 resize-y"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-on-primary font-semibold hover:bg-amber-400 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{locale === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>
                  {locale === "ar"
                    ? initialMistake ? "تحديث الخطأ" : "تسجيل الخطأ"
                    : initialMistake ? "Update Mistake" : "Log Mistake"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
