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
import { useI18n } from "@/lib/i18n/I18nContext";

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
  const { locale } = useI18n();

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
            {locale === "ar"
              ? `اتمسح ${deletedEntry.amount} ${deletedEntry.type === "water" ? "مل ميه" : "مجم كافيين"}`
              : `Removed ${deletedEntry.amount} ${deletedEntry.type === "water" ? "ml water" : "mg caffeine"}`}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-lime text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "تراجع" : "Undo"}</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-surface-container-lowest rounded-xl border border-border-subtle">
          <button
            onClick={() => setActiveTab("water")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeTab === "water"
                ? "bg-secondary-cyan text-on-primary font-bold shadow-sm"
                : "text-text-muted hover:text-on-surface"
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "شرب الميه" : "Water Intake"}</span>
          </button>
          <button
            onClick={() => setActiveTab("caffeine")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              activeTab === "caffeine"
                ? "bg-rank-gold text-on-primary font-bold shadow-sm"
                : "text-text-muted hover:text-on-surface"
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "متابعة الكافيين" : "Caffeine Telemetry"}</span>
          </button>
        </div>

        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="p-1.5 rounded-xl bg-surface-container-high text-text-muted hover:text-on-surface border border-border-subtle transition-colors cursor-pointer"
          title={locale === "ar" ? "كمية مخصصة" : "Custom Amount"}
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
              <span className="text-xs text-text-muted ml-1">{locale === "ar" ? "مل" : "ml"}</span>
            </div>
            <div className="text-xs text-text-muted">
              {waterTarget
                ? (locale === "ar" ? `الهدف: ${waterTarget} مل (${waterPercent}%)` : `Target: ${waterTarget} ml (${waterPercent}%)`)
                : (locale === "ar" ? "الهدف مش محدد" : "Target Unset")}
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
              className="py-2 px-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-secondary-cyan hover:bg-secondary-cyan/10 active:scale-95 transition-all text-center cursor-pointer"
            >
              <div className="font-bold text-secondary-cyan">+250 {locale === "ar" ? "مل" : "ml"}</div>
              <div className="text-[10px] text-text-muted">{locale === "ar" ? "كوباية" : "Glass"}</div>
            </button>
            <button
              onClick={() => handleQuickAdd("water", 500)}
              disabled={logging}
              className="py-2 px-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-secondary-cyan hover:bg-secondary-cyan/10 active:scale-95 transition-all text-center cursor-pointer"
            >
              <div className="font-bold text-secondary-cyan">+500 {locale === "ar" ? "مل" : "ml"}</div>
              <div className="text-[10px] text-text-muted">{locale === "ar" ? "إزازة" : "Bottle"}</div>
            </button>
            <button
              onClick={() => handleQuickAdd("water", 750)}
              disabled={logging}
              className="py-2 px-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-secondary-cyan hover:bg-secondary-cyan/10 active:scale-95 transition-all text-center cursor-pointer"
            >
              <div className="font-bold text-secondary-cyan">+750 {locale === "ar" ? "مل" : "ml"}</div>
              <div className="text-[10px] text-text-muted">{locale === "ar" ? "شيكر" : "Shaker"}</div>
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
              <span className="text-xs text-text-muted ml-1">
                {locale === "ar" ? "مجم كافيين" : "mg consumed"}
              </span>
            </div>
            <div className="text-xs text-text-muted">
              {locale === "ar" ? `الحد الأقصى: ${cutoffEval.cutoffTimeFormatted}` : `Cutoff: ${cutoffEval.cutoffTimeFormatted}`}
            </div>
          </div>

          {/* Cutoff Warning Banner if after cutoff */}
          {cutoffEval.isAfterCutoff && (
            <div className="p-3 rounded-2xl bg-rank-gold/10 border border-rank-gold/30 flex items-start gap-2.5 text-xs font-mono text-rank-gold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {locale === "ar" ? "تجاوزت وقت الكافيين: " : "Caffeine Cutoff Exceeded: "}
                </span>
                {locale === "ar"
                  ? `آخر ميعاد كان ${cutoffEval.cutoffTimeFormatted} (${caffeineCutoffHours} ساعات قبل معاد النوم ${targetBedtime}). الشرب دلوقتي هيأثر مباشرة على جودة النوم العميق!`
                  : `Cutoff was ${cutoffEval.cutoffTimeFormatted} (${caffeineCutoffHours}h before ${targetBedtime} bedtime). Intake now directly degrades slow-wave sleep!`}
              </div>
            </div>
          )}

          {/* Caffeine Quick-Add Chips */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-xs">
            <button
              onClick={() => handleQuickAdd("caffeine", 65)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center cursor-pointer"
            >
              <div className="font-bold text-rank-gold">+65 {locale === "ar" ? "مجم" : "mg"}</div>
              <div className="text-[9px] text-text-muted">{locale === "ar" ? "إسبريسو" : "Single"}</div>
            </button>
            <button
              onClick={() => handleQuickAdd("caffeine", 130)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center cursor-pointer"
            >
              <div className="font-bold text-rank-gold">+130 {locale === "ar" ? "مجم" : "mg"}</div>
              <div className="text-[9px] text-text-muted">{locale === "ar" ? "دبل" : "Double"}</div>
            </button>
            <button
              onClick={() => handleQuickAdd("caffeine", 95)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center cursor-pointer"
            >
              <div className="font-bold text-rank-gold">+95 {locale === "ar" ? "مجم" : "mg"}</div>
              <div className="text-[9px] text-text-muted">{locale === "ar" ? "فلتر" : "Filter"}</div>
            </button>
            <button
              onClick={() => handleQuickAdd("caffeine", 40)}
              disabled={logging}
              className="py-2 px-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface hover:border-rank-gold hover:bg-rank-gold/10 active:scale-95 transition-all text-center cursor-pointer"
            >
              <div className="font-bold text-rank-gold">+40 {locale === "ar" ? "مجم" : "mg"}</div>
              <div className="text-[9px] text-text-muted">{locale === "ar" ? "شاي" : "Tea/Soda"}</div>
            </button>
          </div>
        </div>
      )}

      {/* Custom Amount Drawer */}
      {showCustomInput && (
        <div className="flex items-center gap-2 pt-2 border-t border-border-subtle font-mono text-xs">
          <input
            type="number"
            placeholder={
              activeTab === "water"
                ? locale === "ar"
                  ? "الكمية (مل)"
                  : "Amount (ml)"
                : locale === "ar"
                ? "الكمية (مجم)"
                : "Amount (mg)"
            }
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface focus:outline-none"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customAmount || logging}
            className="px-4 py-2 rounded-xl bg-primary-lime text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
          >
            {locale === "ar" ? "إضافة" : "Add"}
          </button>
        </div>
      )}

      {/* Recent Entries Timeline */}
      {intakeEntries.length > 0 && (
        <div className="pt-2 border-t border-border-subtle space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted text-start">
            {locale === "ar"
              ? `سجل النهاردة (${intakeEntries.length})`
              : `Today's Logged Intakes (${intakeEntries.length})`}
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {intakeEntries.map((e) => {
              const timeStr = new Date(e.logged_at).toLocaleTimeString(locale === "ar" ? "ar-EG" : [], {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
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
                      {e.amount} {e.type === "water" ? (locale === "ar" ? "مل" : "ml") : (locale === "ar" ? "مجم" : "mg")}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {locale === "ar" ? `الساعة ${timeStr}` : `at ${timeStr}`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSoftDelete(e)}
                    className="p-1 rounded text-text-muted hover:text-[#F87171] transition-colors cursor-pointer"
                    title={locale === "ar" ? "مسح" : "Delete"}
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
