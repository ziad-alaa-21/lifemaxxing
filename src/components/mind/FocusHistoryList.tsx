"use client";

import React, { useState } from "react";
import {
  Brain,
  Trash2,
  Undo2,
  Clock,
  Star,
  CheckCircle2,
  Tag,
  AlertCircle,
  Pause,
} from "lucide-react";
import { FocusSession, FOCUS_PRESETS } from "@/lib/mind";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";

interface FocusHistoryListProps {
  sessions: FocusSession[];
  onSessionsUpdated: () => void;
  userTimezone: string;
}

export function FocusHistoryList({
  sessions,
  onSessionsUpdated,
  userTimezone,
}: FocusHistoryListProps) {
  const { isOnline, guardAction } = useOnlineGuard();

  const [deletedSession, setDeletedSession] = useState<{ id: string; name: string } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo_undo") === "true") {
      setDeletedSession({ id: "demo-undo-id", name: "Deep Work Sprint (Algorithms Practice)" });
    }
  }, []);

  const handleSoftDelete = async (session: FocusSession) => {
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("focus_sessions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", session.id);

        if (error) throw error;

        setDeletedSession({ id: session.id, name: session.task_name });
        if (undoTimeout) clearTimeout(undoTimeout);
        const timer = setTimeout(() => {
          setDeletedSession(null);
        }, 8000);
        setUndoTimeout(timer);

        onSessionsUpdated();
      } catch (err: any) {
        console.error("Failed to delete focus session:", err);
      }
    });
  };

  const handleUndo = async () => {
    if (!deletedSession) return;
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("focus_sessions")
          .update({ deleted_at: null })
          .eq("id", deletedSession.id);

        if (error) throw error;
        setDeletedSession(null);
        if (undoTimeout) clearTimeout(undoTimeout);
        onSessionsUpdated();
      } catch (err: any) {
        console.error("Failed to undo focus session delete:", err);
      }
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="stitch-card p-8 text-center space-y-3 font-mono">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-container-high flex items-center justify-center text-text-muted">
          <Brain className="w-6 h-6" />
        </div>
        <div className="text-sm font-bold text-on-surface">
          No Sessions Logged Today
        </div>
        <p className="text-xs text-text-muted max-w-sm mx-auto">
          Start your first 50-minute focus sprint above to record deep work telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Undo Toast */}
      {deletedSession && (
        <div className="p-3 rounded-2xl bg-surface-container-high border border-primary-ink/40 flex items-center justify-between text-xs text-on-surface animate-fade-in">
          <span>Deleted &ldquo;{deletedSession.name}&rdquo;</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-ink text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      <div className="p-4 md:stitch-card p-6 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-tertiary-purple" />
            <span className="font-bold uppercase tracking-wider text-on-surface">
              Today&apos;s Focus Sessions ({sessions.length})
            </span>
          </div>
          <span className="text-text-muted text-[11px]">
            {sessions.reduce((s, item) => s + (item.actual_minutes || 0), 0)}m Total
          </span>
        </div>

        <div className="space-y-2.5">
          {sessions.map((s) => {
            const timeStr = new Date(s.ended_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: userTimezone,
            });
            const preset = FOCUS_PRESETS[s.mode] || FOCUS_PRESETS.sprint_50;

            return (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category pill */}
                    <span className="px-2 py-0.5 rounded-lg text-[10px] bg-surface-container-high text-on-surface border border-border-subtle font-bold">
                      {s.task_category || "General"}
                    </span>

                    <span className="font-bold text-on-surface truncate">
                      {s.task_name}
                    </span>

                    <span className="px-2 py-0.5 rounded-lg text-[10px] bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30 font-bold">
                      {preset.badge}
                    </span>

                    {/* Status badge */}
                    {s.status === "ended_early" && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-amber-500/15 text-amber-700 border border-amber-500/30">
                        Ended Early
                      </span>
                    )}

                    {s.rating && (
                      <span className="flex items-center gap-1 text-[11px] text-rank-gold font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{s.rating}/5</span>
                      </span>
                    )}
                  </div>

                  {/* Friction and Flow Tags */}
                  {s.friction_tags && s.friction_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.friction_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-surface-container-high text-text-muted border border-border-subtle"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {s.notes && (
                    <p className="text-[11px] text-text-muted italic line-clamp-1">
                      &ldquo;{s.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle text-text-muted">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-on-surface">
                      {s.actual_minutes}m active
                    </span>
                    {s.paused_seconds > 0 && (
                      <span className="text-text-muted">
                        ({Math.round(s.paused_seconds / 60)}m paused)
                      </span>
                    )}
                    <span>at {timeStr}</span>
                  </div>

                  <button
                    onClick={() => handleSoftDelete(s)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-crimson-alert hover:bg-surface-container-high transition-colors cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
