"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Scale,
  Droplets,
  Coffee,
  Timer,
  Smile,
  Utensils,
  GraduationCap,
  Undo2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useUserModules } from "@/lib/modules/UserModulesContext";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLogged?: () => void;
}

export function QuickActionModal({
  isOpen,
  onClose,
  onDataLogged,
}: QuickActionModalProps) {
  const router = useRouter();
  const { guardAction } = useOnlineGuard();
  const { dict, locale } = useI18n();
  const { isModuleActive } = useUserModules();

  // Settings
  const [userId, setUserId] = useState<string | null>(null);
  const [waterIncrement, setWaterIncrement] = useState(250);
  const [caffeineIncrement, setCaffeineIncrement] = useState(100);

  // Modals for sub-flows
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [moodRating, setMoodRating] = useState(3);
  const [energyRating, setEnergyRating] = useState(3);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    message: string;
    logId: string;
    table: string;
  } | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase
          .from("profiles")
          .select("water_increment_ml, caffeine_increment_mg")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.water_increment_ml) setWaterIncrement(Number(data.water_increment_ml));
            if (data?.caffeine_increment_mg) setCaffeineIncrement(Number(data.caffeine_increment_mg));
          });
      }
    });
  }, []);

  if (!isOpen) return null;

  // Trigger 5-second undo toast
  const triggerUndo = (logId: string, table: string, message: string) => {
    if (undoTimer) clearTimeout(undoTimer);
    setUndoToast({ logId, table, message });
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
    setUndoTimer(timer);
  };

  const handleExecuteUndo = async () => {
    if (!undoToast) return;
    try {
      await supabase
        .from(undoToast.table)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", undoToast.logId);
      setUndoToast(null);
      if (onDataLogged) onDataLogged();
    } catch {
      // Graceful error handling
    }
  };

  // 1. Log Water
  const handleLogWater = async () => {
    guardAction(async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("intake_logs")
        .insert({
          user_id: userId,
          type: "water",
          amount: waterIncrement,
        })
        .select("id")
        .single();

      if (data?.id) {
        triggerUndo(
          data.id,
          "intake_logs",
          locale === "ar" ? `تم تسجيل +${waterIncrement} مل ميه` : `+${waterIncrement} ml water logged`
        );
      }
      if (onDataLogged) onDataLogged();
    });
  };

  // 2. Log Caffeine
  const handleLogCaffeine = async () => {
    guardAction(async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("intake_logs")
        .insert({
          user_id: userId,
          type: "caffeine",
          amount: caffeineIncrement,
        })
        .select("id")
        .single();

      if (data?.id) {
        triggerUndo(
          data.id,
          "intake_logs",
          locale === "ar" ? `تم تسجيل +${caffeineIncrement} مجم كافيين` : `+${caffeineIncrement} mg caffeine logged`
        );
      }
      if (onDataLogged) onDataLogged();
    });
  };

  // 3. Log Weight
  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;

    guardAction(async () => {
      if (!userId) return;
      await supabase.from("weight_logs").insert({
        user_id: userId,
        weight_kg: w,
      });
      await supabase
        .from("profiles")
        .update({ current_weight_kg: w, updated_at: new Date().toISOString() })
        .eq("id", userId);

      setIsWeightOpen(false);
      setWeightInput("");
      onClose();
      if (onDataLogged) onDataLogged();
    });
  };

  // 4. Log State Check-in
  const handleSaveCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    guardAction(async () => {
      if (!userId) return;
      const now = new Date();
      const currentH = now.getHours();
      const period = currentH < 12 ? "morning" : currentH < 17 ? "midday" : "evening";
      const dateStr = now.toISOString().split("T")[0];

      try {
        await supabase.from("mind_checkins").upsert(
          {
            user_id: userId,
            logged_date: dateStr,
            period,
            mood_rating: moodRating,
            energy_rating: energyRating,
          },
          { onConflict: "user_id, logged_date, period" }
        );
      } catch {
        // Handled gracefully
      }

      setIsCheckinOpen(false);
      onClose();
      if (onDataLogged) onDataLogged();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg-darkest/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-surface-container border border-border-subtle rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold font-mono text-on-surface">
              {dict.quickAction.title}
            </h2>
            <p className="text-xs text-text-muted">{dict.quickAction.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Short List of Quick Actions (Filtered by active modules) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Action 1: Water */}
          {isModuleActive("module_nutrition") && (
            <button
              onClick={handleLogWater}
              className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary-cyan/15 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan mb-2">
                <Droplets className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-on-surface group-hover:text-secondary-cyan transition-colors">
                {dict.quickAction.logWater}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                +{waterIncrement} {locale === "ar" ? "مل (من الإعدادات)" : "ml (from settings)"}
              </div>
            </button>
          )}

          {/* Action 2: Caffeine */}
          {isModuleActive("module_nutrition") && (
            <button
              onClick={handleLogCaffeine}
              className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                <Coffee className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-on-surface group-hover:text-amber-400 transition-colors">
                {dict.quickAction.logCaffeine}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                +{caffeineIncrement} {locale === "ar" ? "مجم (من الإعدادات)" : "mg (from settings)"}
              </div>
            </button>
          )}

          {/* Action 3: Weight */}
          {isModuleActive("module_weight") && (
            <button
              onClick={() => setIsWeightOpen(true)}
              className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-lime/15 border border-primary-lime/30 flex items-center justify-center text-primary-lime mb-2">
                <Scale className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-on-surface group-hover:text-primary-lime transition-colors">
                {dict.quickAction.logWeight}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                {dict.quickAction.logWeightDesc}
              </div>
            </button>
          )}

          {/* Action 4: Focus Timer */}
          {isModuleActive("module_mind_focus") && (
            <button
              onClick={() => {
                router.push("/mind?tab=focus");
                onClose();
              }}
              className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-tertiary-purple/15 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple mb-2">
                <Timer className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-on-surface group-hover:text-tertiary-purple transition-colors">
                {dict.quickAction.focusTimer}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                {dict.quickAction.focusTimerDesc}
              </div>
            </button>
          )}

          {/* Action 5: Check-in */}
          {isModuleActive("module_mind_discipline") && (
            <button
              onClick={() => setIsCheckinOpen(true)}
              className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary-cyan/15 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan mb-2">
                <Smile className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-on-surface group-hover:text-secondary-cyan transition-colors">
                {dict.quickAction.stateCheckin}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                {dict.quickAction.stateCheckinDesc}
              </div>
            </button>
          )}

          {/* Action 6: Meal */}
          {isModuleActive("module_nutrition") && (
            <button
              onClick={() => {
                router.push("/body?tab=nutrition");
                onClose();
              }}
              className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-lime/15 border border-primary-lime/30 flex items-center justify-center text-primary-lime mb-2">
                <Utensils className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-on-surface group-hover:text-primary-lime transition-colors">
                {dict.quickAction.logMeal}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                {dict.quickAction.logMealDesc}
              </div>
            </button>
          )}

          {/* Action 7: Deadline */}
          {(isModuleActive("module_school_timetable") || isModuleActive("module_school_topics")) && (
            <button
              onClick={() => {
                router.push("/school?tab=plan");
                onClose();
              }}
              className="col-span-2 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-start transition-all cursor-pointer group flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-on-surface group-hover:text-amber-400 transition-colors">
                  {dict.quickAction.addDeadline}
                </div>
                <div className="text-[10px] font-mono text-text-muted">
                  {dict.quickAction.addDeadlineDesc}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* 5-second Undo Toast */}
        {undoToast && (
          <div className="p-3 rounded-xl bg-surface-container-highest border border-primary-lime/40 flex items-center justify-between text-xs font-mono shadow-xl animate-fade-in">
            <span className="text-on-surface">{undoToast.message}</span>
            <button
              onClick={handleExecuteUndo}
              className="flex items-center gap-1 text-primary-lime hover:underline font-bold cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "تراجع (5ث)" : "Undo (5s)"}</span>
            </button>
          </div>
        )}

        {/* Sub-Modal: Log Weight */}
        {isWeightOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-bg-darkest/90"
            onClick={() => setIsWeightOpen(false)}
          >
            <div
              className="w-full max-w-xs bg-surface-container border border-border-subtle rounded-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <span className="text-xs font-mono font-bold text-on-surface">
                  {dict.quickAction.weightModalTitle}
                </span>
                <button
                  onClick={() => setIsWeightOpen(false)}
                  className="text-text-muted hover:text-on-surface cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWeight} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">
                    {locale === "ar" ? "الوزن (كيلو)" : "Weight (kg)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder={dict.quickAction.weightPlaceholder}
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-border-subtle text-sm text-on-surface font-mono focus:outline-none focus:border-secondary-cyan"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-primary-lime text-on-primary text-xs font-mono font-bold hover:opacity-90 cursor-pointer"
                >
                  {dict.quickAction.saveWeight}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Sub-Modal: State Check-in */}
        {isCheckinOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-bg-darkest/90"
            onClick={() => setIsCheckinOpen(false)}
          >
            <div
              className="w-full max-w-xs bg-surface-container border border-border-subtle rounded-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <span className="text-xs font-mono font-bold text-on-surface">
                  {dict.quickAction.checkinTitle}
                </span>
                <button
                  onClick={() => setIsCheckinOpen(false)}
                  className="text-text-muted hover:text-on-surface cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCheckin} className="space-y-4 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>{dict.quickAction.moodLabel}</span>
                    <span className="text-on-surface font-bold">{moodRating}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={moodRating}
                    onChange={(e) => setMoodRating(Number(e.target.value))}
                    className="w-full accent-secondary-cyan"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-text-muted mb-1">
                    <span>{dict.quickAction.energyLabel}</span>
                    <span className="text-on-surface font-bold">{energyRating}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={energyRating}
                    onChange={(e) => setEnergyRating(Number(e.target.value))}
                    className="w-full accent-amber-core"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-primary-lime text-on-primary text-xs font-mono font-bold hover:opacity-90 cursor-pointer"
                >
                  {dict.quickAction.saveCheckin}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
