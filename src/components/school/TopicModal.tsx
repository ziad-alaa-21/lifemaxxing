"use client";

import React, { useState, useEffect } from "react";
import { AcademicTopicItem, SubjectItem } from "@/lib/school";
import { X, Loader2, AlertCircle, BookmarkCheck, Star } from "lucide-react";

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (topic: {
    subject_id: string;
    name: string;
    confidence: number;
    notes: string | null;
  }) => Promise<void>;
  subjects: SubjectItem[];
  preselectedSubjectId?: string;
  initialTopic?: AcademicTopicItem | null;
  isBlocked?: boolean;
}

export function TopicModal({
  isOpen,
  onClose,
  onSave,
  subjects,
  preselectedSubjectId,
  initialTopic,
  isBlocked = false,
}: TopicModalProps) {
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [confidence, setConfidence] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopic) {
      setSubjectId(initialTopic.subject_id);
      setName(initialTopic.name || "");
      setConfidence(Number(initialTopic.confidence) || 3);
      setNotes(initialTopic.notes || "");
    } else {
      setSubjectId(preselectedSubjectId || (subjects.length > 0 ? subjects[0].id : ""));
      setName("");
      setConfidence(3);
      setNotes("");
    }
    setError(null);
  }, [initialTopic, preselectedSubjectId, subjects, isOpen]);

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

    if (!name.trim()) {
      setError("Topic name is required.");
      return;
    }

    if (name.trim().length > 120) {
      setError("Topic name cannot exceed 120 characters.");
      return;
    }

    if (notes.trim().length > 1000) {
      setError("Notes cannot exceed 1000 characters.");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        subject_id: subjectId,
        name: name.trim(),
        confidence,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save topic");
    } finally {
      setSaving(false);
    }
  }

  const confidenceLabels: Record<number, string> = {
    1: "1 - Struggling (Reset to 1d)",
    2: "2 - Low confidence (Reset to 1d)",
    3: "3 - Moderate (Keep interval)",
    4: "4 - Strong (Advance ladder)",
    5: "5 - Mastered (Advance ladder)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg-darkest/80 backdrop-blur-md">
      <div
        className="w-full max-w-lg bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-on-surface">
                {initialTopic ? "Edit Syllabus Topic" : "Add Syllabus Topic"}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-mono">
                Track topic confidence with Leitner spaced repetition
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

        {error && (
          <div className="p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Subject <span className="text-crimson-alert">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface focus:outline-none focus:border-indigo-500/50"
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Topic Name <span className="text-crimson-alert">*</span>
              </label>
              <span className="text-[10px] text-text-muted">{name.length}/120</span>
            </div>
            <input
              type="text"
              dir="auto"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Taylor Series Expansions"
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50"
              required
            />
          </div>

          {/* Confidence 1-5 */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Confidence Level: {confidenceLabels[confidence]}
            </label>
            <div className="flex items-center justify-between gap-2 p-2 bg-surface-container-high/60 rounded-xl border border-border-subtle">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isSelected = confidence === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setConfidence(lvl)}
                    className={`flex-1 py-2 px-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm"
                        : "bg-surface-container border-border-subtle text-text-muted hover:text-on-surface hover:border-border-medium"
                    }`}
                  >
                    <div className="flex items-center gap-0.5">
                      <Star
                        className={`w-3.5 h-3.5 ${
                          lvl <= confidence
                            ? "fill-amber-400 text-amber-400"
                            : "text-text-muted/40"
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono">{lvl}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Key Notes / Formulas (Optional)
              </label>
              <span className="text-[10px] text-text-muted">{notes.length}/1000</span>
            </div>
            <textarea
              dir="auto"
              rows={3}
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Formula: f(x) = sum [f^(n)(a)/n! * (x-a)^n]..."
              className="w-full px-3 py-2 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50 resize-y"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-500 text-surface font-semibold hover:bg-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.25)] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialTopic ? "Update Topic" : "Add Topic"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
