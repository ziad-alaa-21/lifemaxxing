"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Settings,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import {
  DisciplineCommitment,
  DisciplineDailyLog,
  DisciplineSnapshotItem,
  DISCIPLINE_SUGGESTIONS,
  createDisciplineDailySnapshot,
  formatDisciplineProgress,
} from "@/lib/discipline";
import { supabase } from "@/lib/supabase/client";
import { feedbackManager } from "@/lib/telemetryFeedback";

interface DisciplineCardProps {
  selectedDate: string;
}

export function DisciplineCard({ selectedDate }: DisciplineCardProps) {
  const [commitments, setCommitments] = useState<DisciplineCommitment[]>([]);
  const [dailyLog, setDailyLog] = useState<DisciplineDailyLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isManageOpen, setIsManageOpen] = useState<boolean>(false);
  const [newText, setNewText] = useState<string>("");
  const [savingLog, setSavingLog] = useState<boolean>(false);

  // Load commitments and today's log
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch user commitments
        const { data: commData } = await supabase
          .from("discipline_commitments")
          .select("*")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("sort_order", { ascending: true });

        const userCommitments = (commData || []) as DisciplineCommitment[];
        setCommitments(userCommitments);

        // 2. Fetch daily log for selectedDate
        const { data: logData } = await supabase
          .from("discipline_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null)
          .maybeSingle();

        if (logData) {
          setDailyLog(logData as DisciplineDailyLog);
        } else {
          // If no log exists for today, initialize snapshot from active commitments
          const items = createDisciplineDailySnapshot(userCommitments);
          setDailyLog({
            logged_date: selectedDate,
            items,
            total_count: items.length,
            completed_count: items.filter((i) => i.completed).length,
          });
        }
      } catch (err) {
        console.warn("Could not load discipline data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDate]);

  // Toggle item in daily snapshot
  const toggleItem = async (itemId: string) => {
    if (!dailyLog) return;

    const nextItems = dailyLog.items.map((i) => {
      if (i.id === itemId) {
        const nextCompleted = !i.completed;
        if (nextCompleted) {
          feedbackManager.playCorrect();
        } else {
          feedbackManager.triggerHaptic("light");
        }
        return { ...i, completed: nextCompleted };
      }
      return i;
    });

    const completedCount = nextItems.filter((i) => i.completed).length;
    const totalCount = nextItems.length;

    const updatedLog: DisciplineDailyLog = {
      ...dailyLog,
      items: nextItems,
      total_count: totalCount,
      completed_count: completedCount,
      updated_at: new Date().toISOString(),
    };

    setDailyLog(updatedLog);

    // Persist to Supabase
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("discipline_logs").upsert(
        {
          user_id: user.id,
          logged_date: selectedDate,
          items: nextItems,
          total_count: totalCount,
          completed_count: completedCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,logged_date" }
      );
    } catch (err) {
      console.warn("Failed to persist discipline check:", err);
    }
  };

  // Add commitment
  const addCommitment = async (text: string) => {
    if (!text.trim()) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newComm = {
        user_id: user.id,
        text: text.trim(),
        active: true,
        sort_order: commitments.length,
      };

      const { data, error } = await supabase
        .from("discipline_commitments")
        .insert([newComm])
        .select()
        .single();

      if (error) throw error;

      const nextList = [...commitments, data as DisciplineCommitment];
      setCommitments(nextList);
      setNewText("");

      // Update current day snapshot if daily log has 0 items
      if (dailyLog && dailyLog.total_count === 0) {
        const nextItems = createDisciplineDailySnapshot(nextList);
        setDailyLog({
          ...dailyLog,
          items: nextItems,
          total_count: nextItems.length,
          completed_count: 0,
        });
      }
    } catch (err) {
      console.warn("Could not add commitment:", err);
    }
  };

  // Delete commitment
  const deleteCommitment = async (id: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("discipline_commitments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      setCommitments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.warn("Could not delete commitment:", err);
    }
  };

  const progress = formatDisciplineProgress(
    dailyLog?.completed_count || 0,
    dailyLog?.total_count || 0
  );

  return (
    <div className="p-5 rounded-3xl bg-surface-container border border-border-subtle space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-on-surface">Daily Commitments</h3>
            <p className="text-[10px] font-mono text-on-surface-variant">Dopamine control</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main display: "4 of 5 done" */}
          <span className="text-xs font-mono font-bold text-primary-lime px-2.5 py-1 rounded-full bg-primary-lime/10 border border-primary-lime/20">
            {progress.mainDisplay}
          </span>
          <button
            onClick={() => setIsManageOpen(true)}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface bg-surface-container-high border border-border-subtle cursor-pointer transition-colors"
            title="Manage Commitments"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Items Checklist */}
      {loading ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        </div>
      ) : !progress.hasCommitments ? (
        <div className="p-6 rounded-2xl bg-surface-container-low border border-dashed border-border-subtle text-center space-y-2">
          <p className="text-xs font-mono text-text-muted">
            No commitments active for today.
          </p>
          <button
            onClick={() => setIsManageOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary-lime/15 border border-primary-lime/30 text-primary-lime font-mono text-xs font-bold hover:bg-primary-lime/25 cursor-pointer transition-colors"
          >
            Set your commitments
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {dailyLog?.items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                item.completed
                  ? "bg-surface-container-low/60 border-border-subtle/50 text-text-muted line-through"
                  : "bg-surface-container-low border-border-subtle text-on-surface hover:border-border-default"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-success shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-text-muted shrink-0" />
              )}
              <span className="text-xs font-mono select-none flex-1">{item.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* MANAGE COMMITMENTS MODAL */}
      {isManageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-dim/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-container-low">
              <div>
                <h3 className="text-sm font-bold font-mono text-on-surface">
                  Configure Commitments
                </h3>
                <p className="text-[10px] font-mono text-on-surface-variant">
                  Changes take effect for future logs; past history is preserved
                </p>
              </div>
              <button
                onClick={() => setIsManageOpen(false)}
                className="p-2 rounded-xl text-text-muted hover:text-on-surface bg-surface-container-high border border-border-subtle cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
              {/* Add Custom Commitment */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                  Add New Commitment
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCommitment(newText);
                    }}
                    placeholder="e.g. No phone in bed"
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-border-subtle text-xs text-on-surface font-mono placeholder:text-text-muted focus:outline-none focus:border-primary-lime/50"
                  />
                  <button
                    onClick={() => addCommitment(newText)}
                    disabled={!newText.trim()}
                    className="px-4 rounded-2xl bg-primary-lime text-surface font-mono font-bold text-xs uppercase disabled:opacity-40 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Suggestions List (Click to Add) */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-core" />
                  <span>Suggestions (Tap to Pick)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DISCIPLINE_SUGGESTIONS.map((sug) => {
                    const alreadyAdded = commitments.some((c) => c.text === sug);
                    return (
                      <button
                        key={sug}
                        onClick={() => !alreadyAdded && addCommitment(sug)}
                        disabled={alreadyAdded}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono text-left cursor-pointer transition-all ${
                          alreadyAdded
                            ? "bg-surface-container-low border-border-subtle text-text-muted opacity-50 cursor-not-allowed"
                            : "bg-surface-container-low hover:bg-surface-container-high border-border-subtle text-on-surface"
                        }`}
                      >
                        + {sug}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Active Commitments */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                  Active Commitments ({commitments.length})
                </label>
                {commitments.length === 0 ? (
                  <p className="text-xs text-text-muted font-mono italic">
                    None configured yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {commitments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-2xl bg-surface-container-low border border-border-subtle flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-mono text-on-surface truncate">
                          {c.text}
                        </span>
                        <button
                          onClick={() => deleteCommitment(c.id)}
                          className="p-1.5 text-text-muted hover:text-crimson-alert transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border-subtle bg-surface-container-low">
              <button
                onClick={() => setIsManageOpen(false)}
                className="w-full py-3 rounded-2xl bg-primary-lime text-surface font-mono font-bold text-xs uppercase cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
