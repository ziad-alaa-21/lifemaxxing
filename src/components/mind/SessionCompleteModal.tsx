"use client";

import React, { useState } from "react";
import {
  Brain,
  Star,
  Check,
  X,
  Sparkles,
  Tag,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  FocusMode,
  FOCUS_PRESETS,
  PRESEEDED_TAGS,
} from "@/lib/mind";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import { getLocalDateString } from "@/lib/nutrition";

interface SessionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: FocusMode;
  actualWorkMinutes: number;
  actualBreakMinutes: number;
  initialTaskName?: string;
  startedAt: string;
  userTimezone: string;
}

export function SessionCompleteModal({
  isOpen,
  onClose,
  onSaved,
  mode,
  actualWorkMinutes,
  actualBreakMinutes,
  initialTaskName = "",
  startedAt,
  userTimezone,
}: SessionCompleteModalProps) {
  const { isOnline, guardAction } = useOnlineGuard();

  const [taskName, setTaskName] = useState(initialTaskName || "Deep Work Sprint");
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const preset = FOCUS_PRESETS[mode];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!taskName.trim()) {
      setErrorMsg("Please enter a task name or session intention.");
      return;
    }

    guardAction(async () => {
      setSaving(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Please log in to record focus session.");

        const loggedDate = getLocalDateString(new Date(), userTimezone);

        const { error } = await supabase.from("focus_sessions").insert([
          {
            user_id: user.id,
            task_name: taskName.trim(),
            mode,
            work_duration_minutes: Math.max(1, actualWorkMinutes),
            break_duration_minutes: actualBreakMinutes,
            completed: true,
            rating,
            friction_tags: selectedTags,
            notes: notes.trim() || null,
            started_at: startedAt,
            ended_at: new Date().toISOString(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-on-surface">
                Session Complete & Reflection
              </h2>
              <div className="text-[11px] font-mono text-text-muted">
                {actualWorkMinutes}m Focused • {preset.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-[#F87171]/10 border border-[#F87171]/30 text-xs font-mono text-[#F87171] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4 font-mono text-xs">
          {/* Task / Intention */}
          <div className="space-y-1.5">
            <label className="text-text-muted uppercase tracking-wider text-[10px]">
              Task Intention *
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Core Algorithm Implementation"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple transition-colors"
            />
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <label className="text-text-muted uppercase tracking-wider text-[10px]">
              Flow & Depth Rating (1 - 5)
            </label>
            <div className="flex items-center gap-2 p-2 bg-surface-container-lowest rounded-xl border border-border-subtle justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1.5 rounded-lg transition-transform active:scale-90 ${
                    star <= rating ? "text-rank-gold" : "text-text-muted/30"
                  }`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Pre-seeded Cognitive & Friction Tags */}
          <div className="space-y-1.5">
            <label className="text-text-muted uppercase tracking-wider text-[10px]">
              Cognitive State & Friction Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESEEDED_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-tertiary-purple/20 text-tertiary-purple border-tertiary-purple/40 font-bold"
                        : "bg-surface-container-lowest text-text-muted border-border-subtle hover:text-on-surface"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Reflection Note */}
          <div className="space-y-1.5">
            <label className="text-text-muted uppercase tracking-wider text-[10px]">
              Reflection Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What worked? What resistance did you hit?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple transition-colors resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-text-muted hover:text-on-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-tertiary-purple text-charcoal-dark shadow-[0_0_15px_rgba(167,139,250,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Log Deep Work Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
