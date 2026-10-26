"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Star,
  Check,
  X,
  Sparkles,
  Tag,
  AlertCircle,
  Loader2,
  Folder,
} from "lucide-react";
import {
  FocusMode,
  SessionStatus,
  FOCUS_PRESETS,
  TASK_CATEGORIES,
  FRICTION_TAGS,
  deriveSessionLoggedDate,
} from "@/lib/mind";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import { useI18n } from "@/lib/i18n/I18nContext";

interface SubjectOption {
  id: string;
  name: string;
  color: string;
}

interface SessionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: FocusMode;
  plannedMinutes: number;
  actualMinutes: number;
  pausedSeconds: number;
  status: SessionStatus;
  initialCategory?: string;
  initialTaskName?: string;
  initialSubjectId?: string | null;
  startedAt: string;
  endedAt: string;
  userTimezone: string;
}

export function SessionCompleteModal({
  isOpen,
  onClose,
  onSaved,
  mode,
  plannedMinutes,
  actualMinutes,
  pausedSeconds,
  status,
  initialCategory = "Coding",
  initialTaskName = "",
  initialSubjectId = null,
  startedAt,
  endedAt,
  userTimezone,
}: SessionCompleteModalProps) {
  const { isOnline, guardAction } = useOnlineGuard();
  const { locale } = useI18n();

  const [taskCategory, setTaskCategory] = useState<string>(initialCategory);
  const [taskName, setTaskName] = useState(initialTaskName);
  const [subjectId, setSubjectId] = useState<string | null>(initialSubjectId);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [rating, setRating] = useState<number | null>(5);
  const [selectedFrictionTags, setSelectedFrictionTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch subjects for optional school tagging
  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from("subjects")
      .select("id, name, color")
      .is("deleted_at", null)
      .order("name")
      .then(({ data }) => {
        if (data) setSubjects(data);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const preset = FOCUS_PRESETS[mode] || FOCUS_PRESETS.sprint_50;

  const toggleFrictionTag = (tag: string) => {
    setSelectedFrictionTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const t = customTagInput.trim();
    if (t && !selectedFrictionTags.includes(t)) {
      setSelectedFrictionTags((prev) => [...prev, t]);
      setCustomTagInput("");
    }
  };

  const handleSave = async () => {
    guardAction(async () => {
      setSaving(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Please log in to record focus session.");

        const finalTaskName = taskName.trim() || taskCategory;
        const loggedDate = deriveSessionLoggedDate(startedAt, userTimezone);

        const { error } = await supabase.from("focus_sessions").insert([
          {
            user_id: user.id,
            subject_id: subjectId || null,
            task_category: taskCategory,
            task_name: finalTaskName,
            mode,
            planned_minutes: Math.max(1, plannedMinutes),
            actual_minutes: Math.max(1, Math.min(600, actualMinutes)),
            paused_seconds: Math.max(0, pausedSeconds),
            status,
            rating,
            friction_tags: selectedFrictionTags,
            notes: notes.trim() || null,
            started_at: startedAt,
            ended_at: endedAt,
            logged_date: loggedDate,
          },
        ]);

        if (error) {
          if (error.message.includes("Could not find the table")) {
            throw new Error(
              "Database table 'focus_sessions' not found. Please apply migration 006_mind_and_focus_engine.sql."
            );
          }
          throw error;
        }

        onSaved();
        onClose();
      } catch (err: any) {
        console.error("Save focus session error:", err);
        setErrorMsg(err.message || "Failed to log focus session.");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-fade-in font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple">
              <Brain className="w-4 h-4" />
            </div>
            <div className="text-start">
              <h2 className="text-sm font-bold text-on-surface">
                {status === "ended_early"
                  ? (locale === "ar" ? "الجلسة انتهت بدري • تسجيل الملاحظات" : "Session Ended Early • Reflection")
                  : (locale === "ar" ? "انتهت جلسة التركيز • تسجيل الملاحظات" : "Session Complete • Reflection")}
              </h2>
              <div className="text-[11px] text-text-muted mt-0.5">
                {actualMinutes} {locale === "ar" ? "دقيقة تركيز فعلي" : "m Active Focus"} • {preset.name}
                {pausedSeconds > 0 && ` (${Math.round(pausedSeconds / 60)} ${locale === "ar" ? "دقيقة توقف مؤقت" : "m paused"})`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-crimson-alert/10 border border-crimson-alert/30 text-crimson-alert flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4">
          {/* Task Category Selection */}
          <div className="space-y-1.5 text-start">
            <label className="text-text-muted uppercase tracking-wider text-[10px]">
              {locale === "ar" ? "تصنيف المهمة *" : "Task Category *"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TASK_CATEGORIES.map((cat) => {
                const catLabels: Record<string, string> = {
                  Coding: "برمجة",
                  Study: "مذاكرة",
                  Reading: "قراءة",
                  Writing: "كتابة",
                  "Deep Work": "عمل عميق",
                  Admin: "إداريات",
                  Planning: "تخطيط",
                };
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTaskCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      taskCategory === cat
                        ? "bg-tertiary-purple text-on-primary font-bold border-tertiary-purple shadow-xs"
                        : "bg-surface-container-low text-text-muted border-border-subtle hover:text-on-surface"
                    }`}
                  >
                    {locale === "ar" ? (catLabels[cat] || cat) : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task / Intention (defaults to Category if blank) */}
          <div className="space-y-1.5 text-start">
            <div className="flex justify-between items-center text-[10px]">
              <label className="text-text-muted uppercase tracking-wider">
                {locale === "ar" ? "وصف الجلسة / اسم المهمة" : "Session Description / Task Name"}
              </label>
              <span className="text-text-muted italic">
                {locale === "ar"
                  ? `(هيتسجل باسم "${taskCategory}" لو سبته فاضي)`
                  : `(Defaults to "${taskCategory}" if empty)`}
              </span>
            </div>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder={locale === "ar" ? `مثال: جلسة ${taskCategory}` : `e.g. ${taskCategory} Sprint`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted/60 focus:outline-none focus:border-tertiary-purple transition-colors text-start"
            />
          </div>

          {/* Optional Subject Link (reused for School) */}
          {subjects.length > 0 && (
            <div className="space-y-1.5 text-start">
              <label className="text-text-muted uppercase tracking-wider text-[10px]">
                {locale === "ar" ? "ربط بمادة دراسية (اختياري)" : "Link to Academic Subject (Optional)"}
              </label>
              <select
                value={subjectId || ""}
                onChange={(e) => setSubjectId(e.target.value || null)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface focus:outline-none focus:border-tertiary-purple text-start"
              >
                <option value="">{locale === "ar" ? "غير مربوط بمادة" : "No subject linked"}</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rating */}
          <div className="space-y-1.5 text-start">
            <div className="flex justify-between items-center text-[10px]">
              <label className="text-text-muted uppercase tracking-wider">
                {locale === "ar" ? "تقييم جودة الجلسة" : "Session Rating"}
              </label>
              <span className="text-text-muted">
                {rating ? `${rating} / 5` : (locale === "ar" ? "بدون تقييم" : "Unrated")}
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-surface-container-low rounded-xl border border-border-subtle justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className={`p-1.5 rounded-lg transition-transform active:scale-90 cursor-pointer ${
                    rating && star <= rating
                      ? "text-rank-gold"
                      : "text-text-muted/30"
                  }`}
                  title={`${star} star`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Friction Tags (Neutral Wording) */}
          <div className="space-y-1.5 text-start">
            <label className="text-text-muted uppercase tracking-wider text-[10px]">
              {locale === "ar" ? "ملاحظات التشتت وسريان التركيز" : "Friction & Flow Tags"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FRICTION_TAGS.map((tag) => {
                const isSelected = selectedFrictionTags.includes(tag);
                const tagLabels: Record<string, string> = {
                  "Phone Distraction": "تشتت بالموبايل",
                  "Low Energy": "طاقة قليلة",
                  "Deep Flow": "تركيز عميق (فلو)",
                  "Overthinking": "تفكير زايد",
                  "Environment Noise": "دوشة حواليا",
                  "Clear Goal": "هدف واضح ومباشر",
                };
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFrictionTag(tag)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-tertiary-purple/20 text-tertiary-purple border-tertiary-purple/40 font-bold"
                        : "bg-surface-container-low text-text-muted border-border-subtle hover:text-on-surface"
                    }`}
                  >
                    {locale === "ar" ? (tagLabels[tag] || tag) : tag}
                  </button>
                );
              })}
              {selectedFrictionTags
                .filter((t) => !FRICTION_TAGS.includes(t as any))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFrictionTag(tag)}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] bg-tertiary-purple/20 text-tertiary-purple border border-tertiary-purple/40 font-bold cursor-pointer"
                  >
                    {tag} ✕
                  </button>
                ))}
            </div>

            {/* Custom Tag Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder={locale === "ar" ? "+ أضف وسماً خاصاً..." : "+ Add custom tag..."}
                className="flex-1 px-3 py-1.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface text-[11px] placeholder:text-text-muted/60 focus:outline-none focus:border-tertiary-purple text-start"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-text-muted hover:text-on-surface text-[11px] cursor-pointer"
              >
                {locale === "ar" ? "إضافة" : "Add"}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5 text-start">
            <label className="text-text-muted uppercase tracking-wider text-[10px]">
              {locale === "ar" ? "ملاحظات وانطباعات (اختياري)" : "Reflection Notes (Optional)"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={locale === "ar" ? "إيه اللي ساعدك تركز؟ وإيه الصعوبة اللي ظهرت؟" : "What worked? What resistance did you hit?"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple transition-colors resize-none text-start"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-text-muted hover:text-on-surface transition-colors cursor-pointer"
          >
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-tertiary-purple text-on-primary shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{locale === "ar" ? "حفظ الجلسة" : "Log Session"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
