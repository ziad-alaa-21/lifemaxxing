"use client";

import React, { useState } from "react";
import { MistakeItem, SubjectItem, RedoResult } from "@/lib/school";
import {
  X,
  Eye,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Check,
  History,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface MistakeRedoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistake: MistakeItem;
  subject?: SubjectItem;
  onLogRedo: (
    mistakeId: string,
    result: RedoResult,
    scratchpadNotes?: string
  ) => Promise<void>;
}

export function MistakeRedoModal({
  isOpen,
  onClose,
  mistake,
  subject,
  onLogRedo,
}: MistakeRedoModalProps) {
  const { locale } = useI18n();
  const [revealed, setRevealed] = useState(false);
  const [userScratchpad, setUserScratchpad] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleRedoResult(result: RedoResult) {
    try {
      setSubmitting(true);
      setError(null);
      await onLogRedo(mistake.id, result, userScratchpad.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حصل خطأ أثناء تسجيل محاولة الإعادة"
          : "Failed to record redo attempt"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const causeColors: Record<string, string> = {
    concept: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
    careless: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    time: "bg-stone-500/15 border-stone-500/30 text-stone-300",
    memory: "bg-teal-500/15 border-teal-500/30 text-teal-300",
  };

  const causeLabels: Record<string, string> = {
    concept: locale === "ar" ? "سوء فهم نظري" : "concept",
    careless: locale === "ar" ? "تسرع وسهو" : "careless",
    time: locale === "ar" ? "ضيق وقت" : "time",
    memory: locale === "ar" ? "نسيان القانون" : "memory",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg-darkest/85 backdrop-blur-md">
      <div
        className="w-full max-w-xl bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: subject?.color || "#F59E0B" }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3
                  dir="auto"
                  className="text-base font-bold font-mono text-on-surface truncate max-w-[260px] sm:max-w-xs"
                >
                  {locale === "ar" ? `إعادة حل: ${mistake.topic}` : `Redo: ${mistake.topic}`}
                </h3>
                {subject && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle text-amber-300">
                    {subject.name}
                  </span>
                )}
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${
                    causeColors[mistake.cause] || causeColors.concept
                  }`}
                >
                  {causeLabels[mistake.cause] || mistake.cause}
                </span>
              </div>
            </div>
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

        {/* Question Context Card */}
        <div className="p-4 rounded-xl bg-surface-container-high/60 border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant font-semibold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>{locale === "ar" ? "نص المسألة أو سياق السؤال" : "Problem Statement / Context"}</span>
            </div>
            {mistake.redo_history && mistake.redo_history.length > 0 && (
              <span className="text-[10px] text-text-muted flex items-center gap-1 lowercase">
                <History className="w-3 h-3" />
                {locale === "ar"
                  ? `${mistake.redo_history.length} محاولة سابقة`
                  : `${mistake.redo_history.length} prior redo(s)`}
              </span>
            )}
          </div>
          <p
            dir="auto"
            className="text-sm font-sans text-on-surface leading-relaxed whitespace-pre-wrap"
          >
            {mistake.question_context}
          </p>
        </div>

        {/* User Scratchpad (Attempt Redo) */}
        {!revealed && (
          <div className="space-y-2">
            <label className="text-xs font-mono text-on-surface-variant flex items-center justify-between">
              <span>{locale === "ar" ? "جرب تحل المسألة هنا (مسودة تفكير)" : "Attempt Redo Solution (Mental / Scratchpad)"}</span>
              <span className="text-[10px] text-text-muted">
                {locale === "ar" ? "حل بنفسك قبل ما تشوف الإجابة" : "Solve before revealing solution"}
              </span>
            </label>
            <textarea
              dir="auto"
              value={userScratchpad}
              onChange={(e) => setUserScratchpad(e.target.value)}
              placeholder={
                locale === "ar"
                  ? "اكتب خطوات تفكيرك أو حلك النهائي هنا..."
                  : "Work through your derivation or final answer here..."
              }
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-border-medium text-xs font-sans text-on-surface focus:outline-none focus:border-amber-400 placeholder:text-text-muted resize-y text-start"
            />
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold uppercase flex items-center justify-center gap-2 hover:bg-amber-500/25 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{locale === "ar" ? "أظهر الحل الصح وقارن حلك" : "Reveal Correct Solution & Compare"}</span>
            </button>
          </div>
        )}

        {/* Revealed Solution & Flaw Analysis */}
        {revealed && (
          <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">
            {/* Student Scratchpad vs Flaw */}
            {userScratchpad && (
              <div className="p-3 rounded-xl bg-surface-container-high border border-border-subtle space-y-1">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                  {locale === "ar" ? "محاولتك في المسودة:" : "Your Scratchpad Attempt:"}
                </span>
                <p dir="auto" className="text-xs text-on-surface font-sans leading-relaxed whitespace-pre-wrap">
                  {userScratchpad}
                </p>
              </div>
            )}

            {/* The Flaw Made */}
            <div className="p-3.5 rounded-xl bg-crimson-alert/10 border border-crimson-alert/25 space-y-1">
              <span className="text-[11px] font-mono text-crimson-alert font-bold uppercase tracking-wider block">
                {locale === "ar" ? "الخطأ أو السهو الأصلي" : "The Original Error / Flaw"}
              </span>
              <p dir="auto" className="text-xs text-on-surface font-sans leading-relaxed">
                {mistake.error_made}
              </p>
            </div>

            {/* The Correct Solution */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
              <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                {locale === "ar" ? "الحل النموذجي المعتمد" : "Verified Correct Solution"}
              </span>
              <p
                dir="auto"
                className="text-xs text-on-surface font-sans leading-relaxed whitespace-pre-wrap"
              >
                {mistake.correct_solution}
              </p>
            </div>

            {/* Redo Self-Rating Actions */}
            <div className="p-4 rounded-xl bg-surface-container-high/60 border border-border-subtle text-center space-y-3">
              <h4 className="text-xs font-mono text-on-surface font-semibold">
                {locale === "ar" ? "هل حليت المسألة دي صح المرة دي؟" : "Did you re-solve this problem correctly?"}
              </h4>
              <p className="text-[10px] font-mono text-text-muted">
                {locale === "ar"
                  ? "لو حليت صح هتتسجل محلولة وتترحل لموعد أبعد. لو لسه غلط هتفضل مستحقة الإعادة النهاردة."
                  : "Correct will mark it resolved and advance the next redo interval. Wrong will keep it in \"Redo today\"."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRedoResult("wrong")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-mono text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>{locale === "ar" ? "لسه غلط (إعادة بعد يوم)" : "Still Wrong (1 Day)"}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRedoResult("correct")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-on-primary text-xs font-mono font-bold uppercase hover:bg-emerald-400 transition-all cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.25)] disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>{locale === "ar" ? "حليتها صح تمام (تم الحل)" : "Got it Correct (Resolved)"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
