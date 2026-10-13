"use client";

import React, { useState } from "react";
import { calculateWeeklyStudyProgress } from "@/lib/school";

interface WeeklyTargetCardProps {
  weeklyTargetMinutes: number | null;
  completedMinutes: number;
  onUpdateTarget: (minutes: number | null) => Promise<void>;
}

export function WeeklyTargetCard({
  weeklyTargetMinutes,
  completedMinutes,
  onUpdateTarget,
}: WeeklyTargetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetHoursInput, setTargetHoursInput] = useState<string>(
    weeklyTargetMinutes ? (weeklyTargetMinutes / 60).toString() : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = calculateWeeklyStudyProgress(weeklyTargetMinutes, [
    {
      id: "summary",
      actual_minutes: completedMinutes,
      status: "completed",
      started_at: new Date().toISOString(),
    },
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!targetHoursInput.trim()) {
        await onUpdateTarget(null);
        setIsEditing(false);
        return;
      }

      const hours = parseFloat(targetHoursInput);
      if (isNaN(hours) || hours <= 0) {
        setError("Target must be a positive number.");
        setSaving(false);
        return;
      }

      const minutes = Math.round(hours * 60);
      if (minutes < 30 || minutes > 10080) {
        setError("Target must be between 0.5 hours (30m) and 168 hours.");
        setSaving(false);
        return;
      }

      await onUpdateTarget(minutes);
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update target");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onUpdateTarget(null);
      setTargetHoursInput("");
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Weekly Study Target</h3>
            <p className="text-xs text-text-muted">Total deep work focus across all subjects</p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => {
              setTargetHoursInput(weeklyTargetMinutes ? (weeklyTargetMinutes / 60).toString() : "");
              setIsEditing(true);
            }}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors px-2.5 py-1 rounded-lg hover:bg-amber-500/10"
          >
            {weeklyTargetMinutes ? "Edit" : "Set Target"}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="mt-3 pt-3 border-t border-border-subtle/40">
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            Target Study Hours per Week
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="168"
              value={targetHoursInput}
              onChange={(e) => setTargetHoursInput(e.target.value)}
              placeholder="e.g. 15"
              autoFocus
              className="flex-1 px-3 py-2 bg-surface-container-high rounded-xl border border-border-subtle text-sm text-on-surface focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs text-text-muted">hrs/week</span>
          </div>

          {error && <p className="text-xs text-status-negative mt-1.5">{error}</p>}

          <div className="flex items-center justify-end gap-2 mt-3">
            {weeklyTargetMinutes && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="text-xs text-status-negative hover:underline px-2 py-1 mr-auto"
              >
                Clear Target
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-on-surface hover:bg-surface-container-high"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-surface transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Target"}
            </button>
          </div>
        </form>
      ) : weeklyTargetMinutes === null ? (
        <div className="mt-2 py-3 px-3.5 bg-surface-container-low rounded-xl border border-border-subtle/50 flex items-center justify-between">
          <div className="text-xs text-text-muted">
            <span className="text-on-surface font-medium">{progress.completedHoursFormatted}</span> studied this week
          </div>
          <span className="text-xs text-text-muted italic">No target defined</span>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <div>
              <span className="text-base font-bold text-on-surface">{progress.completedHoursFormatted}</span>
              <span className="text-text-muted"> / {progress.targetHoursFormatted}</span>
            </div>
            <div className="font-semibold text-amber-400">
              {progress.isCompleted ? "Goal Reached! 🎉" : `${progress.progressPct}%`}
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.isCompleted ? "bg-amber-400" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, progress.progressPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
            <span>
              {progress.isCompleted
                ? progress.isOverTarget
                  ? `Over target by ${(progress.completedMinutes / 60 - progress.targetMinutes! / 60).toFixed(1)}h`
                  : "Target fulfilled"
                : `${progress.remainingHoursFormatted} remaining`}
            </span>
            <span>Week active</span>
          </div>
        </div>
      )}
    </div>
  );
}
