"use client";

import React, { useState } from "react";
import {
  Timer,
  Zap,
  Activity,
  CheckCircle2,
  BookOpen,
  Smartphone,
  GraduationCap,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Dumbbell,
  Utensils,
  Moon,
  Scale,
} from "lucide-react";
import {
  ModuleKey,
  ALL_MODULE_KEYS,
  STARTER_PACK_MODULES,
  MODULE_DEFINITIONS,
} from "@/lib/modules";
import { useUserModules } from "@/lib/modules/UserModulesContext";
import { useI18n } from "@/lib/i18n/I18nContext";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Dumbbell,
  Utensils,
  Moon,
  Scale,
  Timer,
  Zap,
  Activity,
  CheckCircle2,
  BookOpen,
  Smartphone,
  GraduationCap,
};

export function ModuleOnboardingModal() {
  const { saveOnboarding, showOnboarding } = useUserModules();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  // Initially, NOTHING is selected (user makes explicit choices)
  const [selected, setSelected] = useState<ModuleKey[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!showOnboarding) return null;

  const toggleKey = (key: ModuleKey) => {
    setErrorMsg(null);
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Starter pack button ONLY selects toggles; it does NOT submit
  const handleSelectStarter = () => {
    setErrorMsg(null);
    setSelected([...STARTER_PACK_MODULES]);
  };

  const handleSelectAll = () => {
    setErrorMsg(null);
    setSelected([...ALL_MODULE_KEYS]);
  };

  const handleClearAll = () => {
    setErrorMsg(null);
    setSelected([]);
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setErrorMsg(
        isAr
          ? "اختار قسم واحد على الأقل للمتابعة."
          : "Please select at least one module to continue."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    const res = await saveOnboarding(selected);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to save choices. Please try again.");
      setIsSubmitting(false);
    }
  };

  const bodyModules: ModuleKey[] = [
    "module_workouts",
    "module_nutrition",
    "module_sleep",
    "module_weight",
  ];

  const mindModules: ModuleKey[] = [
    "module_focus",
    "module_math",
    "module_checkins",
    "module_discipline",
    "module_reading",
    "module_screentime",
  ];

  const schoolModules: ModuleKey[] = [
    "module_school",
  ];

  const renderModuleCard = (key: ModuleKey) => {
    const def = MODULE_DEFINITIONS[key];
    const isChecked = selected.includes(key);
    const Icon = ICON_MAP[def.icon] || Sparkles;

    return (
      <button
        key={key}
        type="button"
        id={`onboarding-toggle-${key}`}
        onClick={() => toggleKey(key)}
        className={`w-full text-start p-3.5 rounded-2xl border transition-all flex items-start gap-3 select-none cursor-pointer ${
          isChecked
            ? "bg-[#f0f3ff] border-[#0051d5]/40 shadow-xs ring-1 ring-[#0051d5]/20"
            : "bg-white border-[#e2e8f9] hover:border-[#cfd8ee] hover:bg-[#f8faff]"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isChecked
              ? "bg-[#0051d5] text-white font-medium"
              : "bg-[#f0f3ff] text-[#0051d5]"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[#151c28]">
              {isAr ? def.labelAr : def.labelEn}
            </h4>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                isChecked
                  ? "bg-[#0051d5] border-[#0051d5] text-white"
                  : "border-[#c0ccdf] bg-white"
              }`}
            >
              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
          <p className="text-xs text-[#45474b] mt-1 leading-relaxed">
            {isAr ? def.descriptionAr : def.descriptionEn}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div
      id="onboarding-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-xl bg-white border border-[#e2e8f9] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#e2e8f9] bg-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f0f3ff] text-[#0051d5] border border-[#dce2f3]">
              {isAr ? "مرحباً بيك" : "Welcome"}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#151c28]">
            {isAr ? "عايز تتابع إيه في يومك؟" : "What do you want to track?"}
          </h2>
          <p className="text-xs text-[#45474b] mt-1.5 leading-relaxed">
            {isAr
              ? "اختار اللي يهمك دلوقتي. تقدر تشغل أو تقفل أي قسم في أي وقت من الإعدادات بدون ما تفقد أي بيانات."
              : "Choose what matters to you right now. You can turn anything on or off anytime in Settings without losing any data."}
          </p>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#e2e8f9]">
            <button
              type="button"
              id="starter-pack-button"
              onClick={handleSelectStarter}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#f0f3ff] text-[#0051d5] border border-[#dce2f3] hover:bg-[#e2e8f9] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? "حزمة البداية المقترحة" : "Suggested Starter"}</span>
            </button>

            <button
              type="button"
              id="select-all-button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#f8faff] hover:bg-[#f0f3ff] text-[#151c28] border border-[#e2e8f9] transition-colors cursor-pointer"
            >
              {isAr ? "اختيار الكل" : "Select All"}
            </button>

            {selected.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#45474b] hover:text-[#151c28] transition-colors cursor-pointer"
              >
                {isAr ? "مسح الاختيارات" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Module List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#ffdad6]/40 border border-[#ffb4ab] text-[#ba1a1a] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Body Pillar */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#151c28] uppercase">
              <Dumbbell className="w-3.5 h-3.5 text-[#0051d5]" />
              <span>{isAr ? "الجسد والصحة" : "Body & Health"}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {bodyModules.map(renderModuleCard)}
            </div>
          </div>

          {/* Mind Pillar */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#151c28] uppercase">
              <Timer className="w-3.5 h-3.5 text-[#0051d5]" />
              <span>{isAr ? "العقل والتركيز" : "Mind & Focus"}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {mindModules.map(renderModuleCard)}
            </div>
          </div>

          {/* School Pillar */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#151c28] uppercase">
              <GraduationCap className="w-3.5 h-3.5 text-[#0051d5]" />
              <span>{isAr ? "الدراسة والمذاكرة" : "School & Academics"}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {schoolModules.map(renderModuleCard)}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-[#e2e8f9] bg-[#f8faff] flex items-center justify-between gap-4">
          <div className="text-xs text-[#45474b]">
            <span className="font-bold text-[#151c28]">{selected.length}</span> /{" "}
            {ALL_MODULE_KEYS.length} {isAr ? "أقسام مختارة" : "selected"}
          </div>

          <button
            type="button"
            id="onboarding-submit-button"
            disabled={selected.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className={`px-5 py-2.5 rounded-[12px] text-sm font-semibold transition-all flex items-center gap-2 ${
              selected.length > 0 && !isSubmitting
                ? "bg-[#0051d5] text-white hover:bg-[#0043b3] shadow-xs active:scale-[0.98] cursor-pointer"
                : "bg-[#f0f3ff] text-[#45474b] cursor-not-allowed border border-[#e2e8f9]"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? "جارٍ الحفظ..." : "Saving..."}</span>
              </>
            ) : (
              <span>{isAr ? "ابدأ دلوقتي" : "Get Started"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
