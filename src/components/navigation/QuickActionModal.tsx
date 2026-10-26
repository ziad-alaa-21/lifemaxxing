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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#14161A]/35 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white border border-[#E3E5F0] rounded-t-[20px] sm:rounded-[20px] p-6 shadow-md relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#ECEEFA]">
          <div>
            <h2 className="text-[20px] leading-[28px] font-medium text-[#14161A]">
              {dict.quickAction.title}
            </h2>
            <p className="text-[12px] leading-[16px] text-[#5B6270]">{dict.quickAction.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[12px] bg-[#F0F3FF] border border-[#E3E5F0] flex items-center justify-center text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Short List of Quick Actions (Filtered by active modules) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Action 1: Water */}
          <button
            onClick={handleLogWater}
            className="p-4 rounded-[12px] bg-[#F9F9FF] hover:bg-[#F0F3FF] border border-[#E3E5F0] text-start transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-[12px] bg-[#E6EEFF] flex items-center justify-center text-[#1E3A9E] mb-2">
              <Droplets className="w-4 h-4" />
            </div>
            <div className="text-[14px] leading-[20px] font-medium text-[#14161A] group-hover:text-[#1E3A9E] transition-colors">
              {dict.quickAction.logWater}
            </div>
            <div className="text-[12px] leading-[16px] text-[#5B6270] mt-0.5">
              +{waterIncrement} {locale === "ar" ? "مل (من الإعدادات)" : "ml (from settings)"}
            </div>
          </button>

          {/* Action 2: Caffeine */}
          <button
            onClick={handleLogCaffeine}
            className="p-4 rounded-[12px] bg-[#F9F9FF] hover:bg-[#F0F3FF] border border-[#E3E5F0] text-start transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-[12px] bg-[#E6EEFF] flex items-center justify-center text-[#1E3A9E] mb-2">
              <Coffee className="w-4 h-4" />
            </div>
            <div className="text-[14px] leading-[20px] font-medium text-[#14161A] group-hover:text-[#1E3A9E] transition-colors">
              {dict.quickAction.logCaffeine}
            </div>
            <div className="text-[12px] leading-[16px] text-[#5B6270] mt-0.5">
              +{caffeineIncrement} {locale === "ar" ? "مجم (من الإعدادات)" : "mg (from settings)"}
            </div>
          </button>

          {/* Action 3: Weight */}
          {isModuleActive("module_weight") && (
            <button
              onClick={() => setIsWeightOpen(true)}
              className="p-4 rounded-[12px] bg-[#F9F9FF] hover:bg-[#F0F3FF] border border-[#E3E5F0] text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-[12px] bg-[#E6EEFF] flex items-center justify-center text-[#1E3A9E] mb-2">
                <Scale className="w-4 h-4" />
              </div>
              <div className="text-[14px] leading-[20px] font-medium text-[#14161A] group-hover:text-[#1E3A9E] transition-colors">
                {dict.quickAction.logWeight}
              </div>
              <div className="text-[12px] leading-[16px] text-[#5B6270] mt-0.5">
                {dict.quickAction.logWeightDesc}
              </div>
            </button>
          )}

          {/* Action 4: Focus Timer */}
          {isModuleActive("module_focus") && (
            <button
              onClick={() => {
                router.push("/mind?tab=focus");
                onClose();
              }}
              className="p-4 rounded-[12px] bg-[#F9F9FF] hover:bg-[#F0F3FF] border border-[#E3E5F0] text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-[12px] bg-[#F1E8FF] flex items-center justify-center text-[#5B21B6] mb-2">
                <Timer className="w-4 h-4" />
              </div>
              <div className="text-[14px] leading-[20px] font-medium text-[#14161A] group-hover:text-[#5B21B6] transition-colors">
                {dict.quickAction.focusTimer}
              </div>
              <div className="text-[12px] leading-[16px] text-[#5B6270] mt-0.5">
                {dict.quickAction.focusTimerDesc}
              </div>
            </button>
          )}

          {/* Action 5: Check-in */}
          {isModuleActive("module_checkins") && (
            <button
              onClick={() => setIsCheckinOpen(true)}
              className="p-4 rounded-[12px] bg-[#F9F9FF] hover:bg-[#F0F3FF] border border-[#E3E5F0] text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-[12px] bg-[#F1E8FF] flex items-center justify-center text-[#5B21B6] mb-2">
                <Smile className="w-4 h-4" />
              </div>
              <div className="text-[14px] leading-[20px] font-medium text-[#14161A] group-hover:text-[#5B21B6] transition-colors">
                {dict.quickAction.stateCheckin}
              </div>
              <div className="text-[12px] leading-[16px] text-[#5B6270] mt-0.5">
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
              className="p-4 rounded-[12px] bg-[#F9F9FF] hover:bg-[#F0F3FF] border border-[#E3E5F0] text-start transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-[12px] bg-[#E6EEFF] flex items-center justify-center text-[#1E3A9E] mb-2">
                <Utensils className="w-4 h-4" />
              </div>
              <div className="text-[14px] leading-[20px] font-medium text-[#14161A] group-hover:text-[#1E3A9E] transition-colors">
                {dict.quickAction.logMeal}
              </div>
              <div className="text-[12px] leading-[16px] text-[#5B6270] mt-0.5">
                {dict.quickAction.logMealDesc}
              </div>
            </button>
          )}

          {/* Action 7: Deadline */}
          {isModuleActive("module_school") && (
            <button
              onClick={() => {
                router.push("/school?tab=plan");
                onClose();
              }}
              className="col-span-2 p-4 rounded-[12px] bg-[#F9F9FF] hover:bg-[#F0F3FF] border border-[#E3E5F0] text-start transition-all cursor-pointer group flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-[12px] bg-[#FDE7F1] flex items-center justify-center text-[#9D174D] shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[14px] leading-[20px] font-medium text-[#14161A] group-hover:text-[#9D174D] transition-colors">
                  {dict.quickAction.addDeadline}
                </div>
                <div className="text-[12px] leading-[16px] text-[#5B6270]">
                  {dict.quickAction.addDeadlineDesc}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* 5-second Undo Toast */}
        {undoToast && (
          <div className="p-3.5 rounded-[12px] bg-[#F0F3FF] border border-[#E3E5F0] flex items-center justify-between text-[14px] leading-[20px] shadow-sm animate-fade-in">
            <span className="text-[#14161A]">{undoToast.message}</span>
            <button
              onClick={handleExecuteUndo}
              className="flex items-center gap-1 text-[#2563EB] hover:underline font-medium cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "تراجع (5ث)" : "Undo (5s)"}</span>
            </button>
          </div>
        )}

        {/* Sub-Modal: Log Weight */}
        {isWeightOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#14161A]/40"
            onClick={() => setIsWeightOpen(false)}
          >
            <div
              className="w-full max-w-xs bg-white border border-[#E3E5F0] rounded-[20px] p-5 shadow-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#ECEEFA]">
                <span className="text-[16px] leading-[24px] font-medium text-[#14161A]">
                  {dict.quickAction.weightModalTitle}
                </span>
                <button
                  onClick={() => setIsWeightOpen(false)}
                  className="text-[#5B6270] hover:text-[#14161A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWeight} className="space-y-3">
                <div>
                  <label className="text-[12px] leading-[16px] font-medium text-[#5B6270] block mb-1">
                    {locale === "ar" ? "الوزن (كيلو)" : "Weight (kg)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder={dict.quickAction.weightPlaceholder}
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full h-11 px-4 rounded-[12px] bg-white border border-[#E3E5F0] text-[14px] text-[#14161A] placeholder:text-[#5B6270] focus:outline-none focus:border-[#14161A]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-[12px] bg-[#14161A] text-white text-[14px] font-medium hover:bg-[#2A313D] cursor-pointer"
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
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#14161A]/40"
            onClick={() => setIsCheckinOpen(false)}
          >
            <div
              className="w-full max-w-xs bg-white border border-[#E3E5F0] rounded-[20px] p-5 shadow-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#ECEEFA]">
                <span className="text-[16px] leading-[24px] font-medium text-[#14161A]">
                  {dict.quickAction.checkinTitle}
                </span>
                <button
                  onClick={() => setIsCheckinOpen(false)}
                  className="text-[#5B6270] hover:text-[#14161A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCheckin} className="space-y-4 text-[14px]">
                <div>
                  <div className="flex justify-between text-[#5B6270] mb-1">
                    <span>{dict.quickAction.moodLabel}</span>
                    <span className="text-[#14161A] font-medium">{moodRating}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={moodRating}
                    onChange={(e) => setMoodRating(Number(e.target.value))}
                    className="w-full accent-[#7C3AED]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[#5B6270] mb-1">
                    <span>{dict.quickAction.energyLabel}</span>
                    <span className="text-[#14161A] font-medium">{energyRating}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={energyRating}
                    onChange={(e) => setEnergyRating(Number(e.target.value))}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-[12px] bg-[#14161A] text-white text-[14px] font-medium hover:bg-[#2A313D] cursor-pointer"
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
