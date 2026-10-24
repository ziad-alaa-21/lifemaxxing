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
        className={`w-full text-start p-3.5 rounded-2xl border transition-all flex items-start gap-3 select-none ${
          isChecked
            ? "bg-surface-container-highest/80 border-primary-lime/60 shadow-[0_0_12px_rgba(198,255,61,0.12)] ring-1 ring-primary-lime/30"
            : "bg-surface-container/60 border-border-subtle hover:border-border-medium hover:bg-surface-container"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isChecked
              ? "bg-primary-lime text-surface font-bold"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`text-sm font-semibold tracking-tight ${
                isChecked ? "text-primary-lime" : "text-on-surface"
              }`}
            >
              {isAr ? def.labelAr : def.labelEn}
            </h4>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                isChecked
                  ? "bg-primary-lime border-primary-lime text-surface"
                  : "border-border-medium bg-surface-container"
              }`}
            >
              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            {isAr ? def.descriptionAr : def.descriptionEn}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div
      id="onboarding-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-xl bg-surface border border-border-medium rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border-subtle bg-surface-container/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-primary-lime/20 text-primary-lime border border-primary-lime/30">
              {isAr ? "مرحباً بيك" : "Welcome"}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-on-surface">
            {isAr ? "عايز تتابع إيه في يومك؟" : "What do you want to track?"}
          </h2>
          <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
            {isAr
              ? "اختار اللي يهمك دلوقتي. تقدر تشغل أو تقفل أي قسم في أي وقت من الإعدادات بدون ما تفقد أي بيانات."
              : "Choose what matters to you right now. You can turn anything on or off anytime in Settings without losing any data."}
          </p>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border-subtle/60">
            <button
              type="button"
              id="starter-pack-button"
              onClick={handleSelectStarter}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-primary-lime/10 text-primary-lime border border-primary-lime/30 hover:bg-primary-lime/20 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? "حزمة البداية المقترحة" : "Suggested Starter"}</span>
            </button>

            <button
              type="button"
              id="select-all-button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface border border-border-subtle transition-colors"
            >
              {isAr ? "اختيار الكل" : "Select All"}
            </button>

            {selected.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-on-surface transition-colors"
              >
                {isAr ? "مسح الاختيارات" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Module List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Body Pillar */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase">
              <Dumbbell className="w-3.5 h-3.5 text-primary-lime" />
              <span>{isAr ? "الجسد والصحة" : "Body & Health"}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {bodyModules.map(renderModuleCard)}
            </div>
          </div>

          {/* Mind Pillar */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase">
              <Timer className="w-3.5 h-3.5 text-primary-lime" />
              <span>{isAr ? "العقل والتركيز" : "Mind & Focus"}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {mindModules.map(renderModuleCard)}
            </div>
          </div>

          {/* School Pillar */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase">
              <GraduationCap className="w-3.5 h-3.5 text-primary-lime" />
              <span>{isAr ? "الدراسة والمذاكرة" : "School & Academics"}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {schoolModules.map(renderModuleCard)}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-border-subtle bg-surface-container/50 flex items-center justify-between gap-4">
          <div className="text-xs font-mono text-on-surface-variant">
            <span className="font-bold text-on-surface">{selected.length}</span> /{" "}
            {ALL_MODULE_KEYS.length} {isAr ? "أقسام مختارة" : "selected"}
          </div>

          <button
            type="button"
            id="onboarding-submit-button"
            disabled={selected.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
              selected.length > 0 && !isSubmitting
                ? "bg-primary-lime text-surface hover:brightness-110 shadow-md active:scale-95 cursor-pointer"
                : "bg-surface-container-highest text-text-muted cursor-not-allowed border border-border-subtle"
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
