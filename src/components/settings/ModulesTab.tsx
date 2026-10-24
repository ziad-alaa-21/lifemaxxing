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
  Layers,
  AlertCircle,
  Loader2,
  Check,
  Dumbbell,
  Utensils,
  Moon,
  Scale,
} from "lucide-react";
import {
  ModuleKey,
  ALL_MODULE_KEYS,
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

export function ModulesTab() {
  const { modules, isModuleActive, toggleModule, saveOnboarding } = useUserModules();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [togglingKey, setTogglingKey] = useState<ModuleKey | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleToggle = async (key: ModuleKey) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setTogglingKey(key);

    const currentValue = isModuleActive(key);
    const targetValue = !currentValue;

    // Safety guard: if disabling, ensure at least one remains enabled
    if (!targetValue) {
      const activeCount = ALL_MODULE_KEYS.filter((k) =>
        k === key ? false : isModuleActive(k)
      ).length;

      if (activeCount === 0) {
        setErrorMsg(
          isAr
            ? "لازم يفضل قسم واحد على الأقل مفعّل."
            : "At least one module must remain enabled."
        );
        setTogglingKey(null);
        return;
      }
    }

    const res = await toggleModule(key, targetValue);
    setTogglingKey(null);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update module");
    } else {
      setSuccessMsg(
        isAr
          ? targetValue
            ? `تم تشغيل ${MODULE_DEFINITIONS[key].labelAr}`
            : `تم إيقاف ${MODULE_DEFINITIONS[key].labelAr}`
          : targetValue
          ? `Enabled ${MODULE_DEFINITIONS[key].labelEn}`
          : `Disabled ${MODULE_DEFINITIONS[key].labelEn}`
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleEnableAll = async () => {
    setErrorMsg(null);
    const res = await saveOnboarding(ALL_MODULE_KEYS);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to enable all modules");
    } else {
      setSuccessMsg(isAr ? "تم تشغيل جميع الأقسام بنجاح" : "All modules enabled");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const bodyKeys: ModuleKey[] = [
    "module_workouts",
    "module_nutrition",
    "module_sleep",
    "module_weight",
  ];

  const mindKeys: ModuleKey[] = [
    "module_focus",
    "module_math",
    "module_checkins",
    "module_discipline",
    "module_reading",
    "module_screentime",
  ];

  const schoolKeys: ModuleKey[] = [
    "module_school",
  ];

  const renderModuleRow = (key: ModuleKey) => {
    const def = MODULE_DEFINITIONS[key];
    const active = isModuleActive(key);
    const isUpdating = togglingKey === key;
    const Icon = ICON_MAP[def.icon] || Sparkles;

    return (
      <div
        key={key}
        id={`settings-module-row-${key}`}
        className="p-4 rounded-2xl bg-surface-container/60 border border-border-subtle hover:border-border-medium transition-all flex items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              active
                ? "bg-primary-lime/10 text-primary-lime border border-primary-lime/30"
                : "bg-surface-container-high text-on-surface-variant border border-border-subtle"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold tracking-tight text-on-surface">
                {isAr ? def.labelAr : def.labelEn}
              </h4>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  active
                    ? "bg-primary-lime/20 text-primary-lime border border-primary-lime/30"
                    : "bg-surface-container-highest text-text-muted border border-border-subtle"
                }`}
              >
                {active
                  ? isAr
                    ? "مفعّل"
                    : "Active"
                  : isAr
                  ? "متوقف"
                  : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
              {isAr ? def.descriptionAr : def.descriptionEn}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          id={`settings-toggle-${key}`}
          aria-checked={active}
          disabled={isUpdating}
          onClick={() => handleToggle(key)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-lime/40 disabled:opacity-50 ${
            active ? "bg-primary-lime" : "bg-surface-container-highest"
          }`}
        >
          {isUpdating ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-surface" />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow-lg ring-0 transition duration-200 ease-in-out ${
                active ? "translate-x-5" : "translate-x-0"
              }`}
            />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-6 rounded-2xl bg-surface-container border border-border-subtle relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-primary-lime" />
              <h3 className="text-base font-bold font-mono text-on-surface">
                {isAr ? "تخصيص أقسام التطبيق" : "Module Customization"}
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
              {isAr
                ? "تقدر تظهر أو تخفي أي قسم من أقسام الجسد والعقل والدراسة في أي وقت. إيقاف أي قسم بيخفي واجهته بس، لكن كل بياناتك وسجلاتك بتفضل محفوظة بالكامل."
                : "Customize which modular features are active across Body, Mind, and School. Turning a module off hides its views and Today entries, but never deletes any of your data."}
            </p>
          </div>

          <button
            type="button"
            id="settings-enable-all-btn"
            onClick={handleEnableAll}
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-border-subtle transition-colors shrink-0 cursor-pointer"
          >
            {isAr ? "تشغيل الكل" : "Enable All"}
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-primary-lime/10 border border-primary-lime/30 text-primary-lime text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Body Modules */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase px-1">
          <Dumbbell className="w-4 h-4 text-primary-lime" />
          <span>{isAr ? "أقسام الجسد والصحة" : "Body & Health Modules"}</span>
        </div>
        <div className="space-y-2.5">{bodyKeys.map(renderModuleRow)}</div>
      </div>

      {/* Mind Modules */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase px-1">
          <Timer className="w-4 h-4 text-primary-lime" />
          <span>{isAr ? "أقسام العقل والتركيز" : "Mind & Focus Modules"}</span>
        </div>
        <div className="space-y-2.5">{mindKeys.map(renderModuleRow)}</div>
      </div>

      {/* School Modules */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-on-surface-variant uppercase px-1">
          <GraduationCap className="w-4 h-4 text-primary-lime" />
          <span>{isAr ? "أقسام الدراسة والمذاكرة" : "School & Academic Modules"}</span>
        </div>
        <div className="space-y-2.5">{schoolKeys.map(renderModuleRow)}</div>
      </div>
    </div>
  );
}
