"use client";

import React, { useState } from "react";
import {
  Droplet,
  Coffee,
  Plus,
  AlertTriangle,
  Trash2,
  Undo2,
  Check,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  IntakeLogEntry,
  evaluateCaffeineCutoff,
} from "@/lib/nutrition";

interface HydrationCardProps {
  waterToday: number;
  waterTarget: number | null;
  caffeineToday: number;
  intakeEntries: IntakeLogEntry[];
  targetBedtime?: string;
  caffeineCutoffHours?: number;
  userTimezone: string;
  onIntakeUpdated: () => void;
}

export function HydrationCard({
  waterToday,
  waterTarget,
  caffeineToday,
  intakeEntries,
  targetBedtime = "23:00",
  caffeineCutoffHours = 10,
  userTimezone,
  onIntakeUpdated,
}: HydrationCardProps) {
  const { isOnline, guardAction } = useOnlineGuard();

  const [activeTab, setActiveTab] = useState<"water" | "caffeine">("water");
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [logging, setLogging] = useState(false);
  const [deletedEntry, setDeletedEntry] = useState<{ id: string; type: string; amount: number } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);

  // Caffeine cutoff evaluation
  const cutoffEval = evaluateCaffeineCutoff(
    new Date().toISOString(),
    targetBedtime,
    caffeineCutoffHours,
    userTimezone
  );

  const waterPercent = waterTarget && waterTarget > 0 ? Math.min(100, Math.round((waterToday / waterTarget) * 100)) : 0;

  const handleQuickAdd = async (type: "water" | "caffeine", amount: number) => {
    guardAction(async () => {
      setLogging(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Auth required");

        const { error } = await supabase.from("intake_logs").insert([
          {
            user_id: user.id,
            type,
            amount,
            logged_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
        onIntakeUpdated();
      } catch (err: any) {
        console.error("Failed to log intake:", err);
      } finally {
        setLogging(false);
      }
    });
  };

  const handleCustomSubmit = async () => {
    const amt = parseInt(customAmount);
    if (isNaN(amt) || amt <= 0) return;
    await handleQuickAdd(activeTab, amt);
    setCustomAmount("");
    setShowCustomInput(false);
  };

  const handleSoftDelete = async (entry: IntakeLogEntry) => {
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("intake_logs")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entry.id);

        if (error) throw error;

        // Trigger undo toast
        setDeletedEntry({ id: entry.id, type: entry.type, amount: entry.amount });
        if (undoTimeout) clearTimeout(undoTimeout);
        const timer = setTimeout(() => {
          setDeletedEntry(null);
        }, 8000);
        setUndoTimeout(timer);

        onIntakeUpdated();
      } catch (err: any) {
        console.error("Failed to soft-delete intake:", err);
      }
    });
  };

  const handleUndo = async () => {
    if (!deletedEntry) return;
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("intake_logs")
          .update({ deleted_at: null })
          .eq("id", deletedEntry.id);

        if (error) throw error;
        setDeletedEntry(null);
        if (undoTimeout) clearTimeout(undoTimeout);
        onIntakeUpdated();
      } catch (err: any) {
        console.error("Failed to undo delete:", err);
      }
    });
  };

  return (
    <div className="bg-surface-container border border-border-subtle rounded-3xl p-5 space-y-4">
      {/* Undo Toast */}
      {deletedEntry && (
        <div className="p-3 rounded-2xl bg-surface-container-high border border-primary-lime/40 flex items-center justify-between text-xs font-mono text-on-surface animate-fade-in">
          <span>
            Removed {deletedEntry.amount} {deletedEntry.type === "water" ? "ml water" : "mg caffeine"}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-lime text-charcoal-dark font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-surface-container-lowest rounded-xl border border-border-subtle">
          <button
            onClick={() => setActiveTab("water")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === "water"
                ? "bg-secondary-cyan text-charcoal-dark font-bold shadow-sm"
                : "text-text-muted hover:text-on-surface"
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Water Intake</span>
          </button>
          <button
            onClick={() => setActiveTab("caffeine")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === "caffeine"
                ? "bg-rank-gold text-charcoal-dark font-bold shadow-sm"
                : "text-text-muted hover:text-on-surface"
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Caffeine Telemetry</span>
          </button>
        </div>

        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="p-1.5 rounded-xl bg-surface-container-high text-text-muted hover:text-on-surface border border-border-subtle transition-colors"
          title="Custom Amount"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Water Panel */}
      {activeTab === "water" && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between font-mono">
            <div>
              <span className="text-2xl font-bold text-secondary-cyan">{waterToday}</span>
              <span className="text-xs text-text-muted ml-1">ml</span>
            </div>
            <div className="text-xs text-text-muted">
              {waterTarget ? `Target: ${waterTarget} ml (${waterPercent}%)` : "Target Unset"}
            </div>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full h-2.5 bg-surface-container-lowest rounded-full overflow-hidden border border-border-subtle">
            <div
              className="h-full bg-secondary-cyan rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(93,230,255,0.4)]"
              style={{ width: `${waterPercent}%` }}
            />
          </div>

          {/* Quick-Add Chips */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
            <button
              onClick={() => handleQuickAdd("water", 250)}
              disabled={logging}
              className="py-2 px-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-secondary-cyan hover:bg-secondary-cyan/10 active:scale-95 transition-all text-center"
            >
              <div className="font-bold text-secondary-cyan">+250 ml</div>
              <div className="text-[10px] text-text-muted">Glass</div>
            </button>
            <button
              onClick={() => handleQuickAdd("water", 500)}
              disabled={logging}
              className="py-2 px-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-secondary-cyan hover:bg-secondary-cyan/10 active:scale-95 transition-all text-center"
            >
              <div className="font-bold text-secondary-cyan">+500 ml</div>
              <div className="text-[10px] text-text-muted">Bottle</div>
            </button>
            <button
              onClick={() => handleQuickAdd("water", 750)}
              disabled={logging}
              className="py-2 px-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-secondary-cyan hover:bg-secondary-cyan/10 active:scale-95 transition-all text-center"
            >
              <div className="font-bold text-secondary-cyan">+750 ml</div>
              <div className="text-[10px] text-text-muted">Shaker</div>
            </button>
          </div>
        </div>
      )}

      {/* Caffeine Panel */}
      {activeTab === "caffeine" && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between font-mono">
            <div>
              <span className="text-2xl font-bold text-rank-gold">{caffeineToday}</span>
              <span className="text-xs text-text-muted ml-1">mg consumed</span>
            </div>
            <div className="text-xs text-text-muted">
              Cutoff: {cutoffEval.cutoffTimeFormatted}
            </div>
          </div>

          {/* Cutoff Warning Banner if after cutoff */}
          {cutoffEval.isAfterCutoff && (
            <div className="p-3 rounded-2xl bg-rank-gold/10 border border-rank-gold/30 flex items-start gap-2.5 text-xs font-mono text-rank-gold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Caffeine Cutoff Exceeded:</span> Cutoff was {cutoffEval.cutoffTimeFormatted} ({caffeineCutoffHours}h before {targetBedtime} bedtime). Intake now directly degrades slow-wave sleep!
              </div>
            </div>
          )}

          {/* Caffeine Quick-Add Chips */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-xs">
            <button
              onClick={() => handleQuickAdd("caffeine", 65)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center"
            >
              <div className="font-bold text-rank-gold">+65 mg</div>
              <div className="text-[9px] text-text-muted">Single</div>
            </button>
            <button
              onClick={() => handleQuickAdd("caffeine", 130)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center"
            >
              <div className="font-bold text-rank-gold">+130 mg</div>
              <div className="text-[9px] text-text-muted">Double</div>
            </button>
            <button
              onClick={() => handleQuickAdd("caffeine", 95)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center"
            >
              <div className="font-bold text-rank-gold">+95 mg</div>
              <div className="text-[9px] text-text-muted">Filter</div>
            </button>
            <button
              onClick={() => handleQuickAdd("caffeine", 40)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center"
            >
              <div className="font-bold text-rank-gold">+40 mg</div>
              <div className="text-[9px] text-text-muted">Tea/Soda</div>
            </button>
          </div>
        </div>
      )}

      {/* Custom Amount Drawer */}
      {showCustomInput && (
        <div className="flex items-center gap-2 pt-2 border-t border-border-subtle font-mono text-xs">
          <input
            type="number"
            placeholder={activeTab === "water" ? "Amount (ml)" : "Amount (mg)"}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface focus:outline-none"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customAmount || logging}
            className="px-4 py-2 rounded-xl bg-primary-lime text-charcoal-dark font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {/* Recent Entries Timeline */}
      {intakeEntries.length > 0 && (
        <div className="pt-2 border-t border-border-subtle space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Today's Logged Intakes ({intakeEntries.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {intakeEntries.map((e) => {
              const timeStr = new Date(e.logged_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    {e.type === "water" ? (
                      <Droplet className="w-3.5 h-3.5 text-secondary-cyan" />
                    ) : (
                      <Coffee className="w-3.5 h-3.5 text-rank-gold" />
                    )}
                    <span className="font-bold text-on-surface">
                      {e.amount} {e.type === "water" ? "ml" : "mg"}
                    </span>
                    <span className="text-[10px] text-text-muted">at {timeStr}</span>
                  </div>
                  <button
                    onClick={() => handleSoftDelete(e)}
                    className="p-1 rounded text-text-muted hover:text-[#F87171] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
