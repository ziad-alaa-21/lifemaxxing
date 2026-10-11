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
  Coffee,
  Sparkles,
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
      <div className="p-8 rounded-3xl bg-surface-container border border-border-subtle text-center space-y-3 font-mono">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-container-high flex items-center justify-center text-text-muted">
          <Brain className="w-6 h-6" />
        </div>
        <div className="text-sm font-bold text-on-surface">
          No Focus Sprints Logged Today
        </div>
        <p className="text-xs text-text-muted max-w-sm mx-auto">
          Start your first 90-minute ultradian cycle or sprint above to record deep work telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Undo Toast */}
      {deletedSession && (
        <div className="p-3 rounded-2xl bg-surface-container-high border border-primary-lime/40 flex items-center justify-between text-xs text-on-surface animate-fade-in">
          <span>Deleted &ldquo;{deletedSession.name}&rdquo;</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-lime text-charcoal-dark font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      <div className="p-4 md:p-6 rounded-3xl bg-surface-container border border-border-subtle space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-tertiary-purple" />
            <span className="font-bold uppercase tracking-wider text-on-surface">
              Completed Focus Sprints ({sessions.length})
            </span>
          </div>
          <span className="text-text-muted text-[11px]">
            {sessions.reduce((s, item) => s + item.work_duration_minutes, 0)}m Total
          </span>
        </div>

        <div className="space-y-2.5">
          {sessions.map((s) => {
            const timeStr = new Date(s.ended_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const preset = FOCUS_PRESETS[s.mode] || FOCUS_PRESETS.ultradian_90;

            return (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-surface-container-lowest border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-on-surface truncate">
                      {s.task_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30 font-bold">
                      {preset.badge}
                    </span>
                    {s.rating && (
                      <span className="flex items-center gap-1 text-[11px] text-rank-gold font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{s.rating}/5</span>
                      </span>
                    )}
                  </div>

                  {/* Friction and Cognitive State Tags */}
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
                      {s.work_duration_minutes}m work
                    </span>
                    {s.break_duration_minutes > 0 && (
                      <span>+ {s.break_duration_minutes}m rest</span>
                    )}
                    <span>at {timeStr}</span>
                  </div>

                  <button
                    onClick={() => handleSoftDelete(s)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-[#F87171] hover:bg-surface-container-high transition-colors cursor-pointer"
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
