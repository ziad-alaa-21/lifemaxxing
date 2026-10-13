"use client";

import React, { useState } from "react";
import { SubjectItem, AcademicTopicItem, parseBulkTopics } from "@/lib/school";
import { X, Loader2, AlertCircle, ListPlus, Check } from "lucide-react";

interface BulkTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBulk: (subjectId: string, topicNames: string[]) => Promise<void>;
  subjects: SubjectItem[];
  existingTopics?: AcademicTopicItem[];
  preselectedSubjectId?: string;
  isBlocked?: boolean;
}

export function BulkTopicModal({
  isOpen,
  onClose,
  onSaveBulk,
  subjects,
  existingTopics = [],
  preselectedSubjectId,
  isBlocked = false,
}: BulkTopicModalProps) {
  const [subjectId, setSubjectId] = useState(
    preselectedSubjectId || (subjects.length > 0 ? subjects[0].id : "")
  );
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingNamesForSubject = React.useMemo(() => {
    return existingTopics
      .filter((t) => t.subject_id === subjectId)
      .map((t) => t.name);
  }, [existingTopics, subjectId]);

  const parsed = parseBulkTopics(rawText, existingNamesForSubject);

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

    if (!parsed.valid || parsed.topics.length === 0) {
      setError("Please enter at least one valid topic (one per line, max 120 chars).");
      return;
    }

    try {
      setSaving(true);
      await onSaveBulk(subjectId, parsed.topics);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to bulk import topics");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg-darkest/80 backdrop-blur-md">
      <div
        className="w-full max-w-lg bg-surface-container border border-border-subtle rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-on-surface">
                Bulk Add Syllabus Topics
              </h2>
              <p className="text-[11px] text-on-surface-variant font-mono">
                Paste your course topics list (one per line)
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
          {/* Subject Picker */}
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

          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Topics List (One Per Line)
              </label>
              <span className="text-[10px] text-text-muted">
                {parsed.topics.length} topic(s) detected
              </span>
            </div>
            <textarea
              dir="auto"
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g.&#10;Limits and Continuity&#10;Derivative Rules & Chain Rule&#10;Mean Value Theorem&#10;Optimization Problems&#10;Fundamental Theorem of Calculus"
              className="w-full px-3.5 py-2.5 bg-surface-container-high border border-border-subtle rounded-xl text-on-surface placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50 resize-y font-sans text-xs"
              required
            />
          </div>

          {/* Validation Errors Preview */}
          {parsed.errors.length > 0 && (
            <div className="p-3 rounded-xl bg-crimson-alert/10 border border-crimson-alert/20 text-crimson-alert text-[11px] space-y-1 max-h-24 overflow-y-auto">
              <div className="font-semibold">Validation violations:</div>
              {parsed.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          {/* Duplicates Notice */}
          {parsed.duplicates.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
              <div className="font-semibold">
                {parsed.duplicates.length} duplicate(s) automatically skipped:
              </div>
              <div className="text-[10px] text-text-muted truncate">
                {parsed.duplicates.slice(0, 3).join(" • ")}
                {parsed.duplicates.length > 3 ? ` ... (+${parsed.duplicates.length - 3} more)` : ""}
              </div>
            </div>
          )}

          {/* Parsed Topics Summary */}
          {parsed.topics.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-container-high/60 border border-border-subtle space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Ready to import {parsed.topics.length} topic(s) (unscheduled until started)</span>
              </div>
              <div className="text-[10px] text-text-muted truncate">
                Preview: {parsed.topics.slice(0, 3).join(" • ")}
                {parsed.topics.length > 3 ? ` ... (+${parsed.topics.length - 3} more)` : ""}
              </div>
            </div>
          )}

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
              disabled={saving || parsed.topics.length === 0 || parsed.errors.length > 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-500 text-surface font-semibold hover:bg-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.25)] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import {parsed.topics.length} Topics</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
