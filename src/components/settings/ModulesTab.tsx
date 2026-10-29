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
  Lock,
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
        className="p-4 rounded-xl bg-[#f0f3ff] border border-[#e2e8f9] hover:bg-[#e7eeff]/60 transition-all flex items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              active
                ? "bg-white text-[#0051d5] border border-[#dce2f3] shadow-xs"
                : "bg-[#e2e8f9] text-[#45474b] border border-transparent"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold tracking-tight text-[#151c28]">
                {isAr ? def.labelAr : def.labelEn}
              </h4>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  active
                    ? "bg-[#dbe1ff] text-[#00174b]"
                    : "bg-[#e2e8f9] text-[#45474b]"
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
            <p className="text-xs text-[#45474b] mt-0.5 leading-relaxed">
              {isAr ? def.descriptionAr : def.descriptionEn}
            </p>
          </div>
        </div>

        {/* Stitch Toggle Switch */}
        <button
          type="button"
          role="switch"
          id={`settings-toggle-${key}`}
          aria-checked={active}
          disabled={isUpdating}
          onClick={() => handleToggle(key)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            active ? "bg-[#000000]" : "bg-[#dce2f3]"
          }`}
        >
          {isUpdating ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                active ? "translate-x-5" : "translate-x-0"
              }`}
            />
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      {(() => {
        const activeTotal = ALL_MODULE_KEYS.filter((k) => isModuleActive(k)).length;
        const bodyActiveCount = bodyKeys.filter((k) => isModuleActive(k)).length;
        const mindActiveCount = mindKeys.filter((k) => isModuleActive(k)).length;
        const schoolActiveCount = schoolKeys.filter((k) => isModuleActive(k)).length;

        return (
          <div className="flex flex-col gap-6 font-sans">
            {/* Notifications */}
            {errorMsg && (
              <div className="p-4 bg-[#ffdad6]/40 border border-[#ffdad6] rounded-xl text-xs text-[#93000a] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 12-Column Grid matching Stitch Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Module Categories */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Body Modules Group */}
          <section className="bg-white rounded-[20px] p-6 md:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#dbe1ff] flex items-center justify-center text-[#00174b]">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#151c28]">
                    {isAr ? "أقسام الجسد والتعافي" : "Body & Recovery"}
                  </h3>
                  <span className="text-[11px] text-[#45474b]">
                    {bodyActiveCount} / {bodyKeys.length} {isAr ? "مفعّل" : "active"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnableAll}
                className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
              >
                {isAr ? "تفعيل الكل" : "Enable all"}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {bodyKeys.map((k) => renderModuleRow(k))}
            </div>
          </section>

          {/* Mind Modules Group */}
          <section className="bg-white rounded-[20px] p-6 md:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#eaddff] flex items-center justify-center text-[#25005a]">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#151c28]">
                    {isAr ? "أقسام العقل والتركيز" : "Mind & Focus"}
                  </h3>
                  <span className="text-[11px] text-[#45474b]">
                    {mindActiveCount} / {mindKeys.length} {isAr ? "مفعّل" : "active"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnableAll}
                className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
              >
                {isAr ? "تفعيل الكل" : "Enable all"}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {mindKeys.map((k) => renderModuleRow(k))}
            </div>
          </section>

          {/* School Module Group */}
          <section className="bg-white rounded-[20px] p-6 md:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e2e8f9] flex items-center justify-center text-[#151c28]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#151c28]">
                    {isAr ? "القسم الأكاديمي والدراسة" : "School & Academics"}
                  </h3>
                  <span className="text-[11px] text-[#45474b]">
                    {schoolActiveCount} / {schoolKeys.length} {isAr ? "مفعّل" : "active"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {schoolKeys.map((k) => renderModuleRow(k))}
            </div>
          </section>
        </div>

        {/* Right Sidebar (4 cols): Stitch Info & Summary Cards */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Dashboard Density Card */}
          <div className="bg-white rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#151c28] uppercase tracking-wider">
                {isAr ? "كثافة لوحة التحكم" : "Dashboard Density"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f0f3ff] text-[#0051d5] text-xs font-semibold">
                {activeTotal} / {ALL_MODULE_KEYS.length}
              </span>
            </div>
            <p className="text-xs text-[#45474b] leading-relaxed">
              {isAr
                ? "يتم تكييف تخطيط الشاشة الرئيسية ديناميكياً بناءً على الأقسام النشطة لديك دون ازدحام بصري."
                : "Active modules determine which telemetry cards, habits, and logs appear on your Today dashboard."}
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t border-[#e2e8f9]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#45474b]">{isAr ? "الجسد" : "Body"}</span>
                <span className="font-semibold text-[#151c28]">{bodyActiveCount} / 4</span>
              </div>
              <div className="w-full h-1.5 bg-[#f0f3ff] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0051d5] rounded-full transition-all"
                  style={{ width: `${(bodyActiveCount / 4) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#45474b]">{isAr ? "العقل" : "Mind"}</span>
                <span className="font-semibold text-[#151c28]">{mindActiveCount} / 6</span>
              </div>
              <div className="w-full h-1.5 bg-[#f0f3ff] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5b21b6] rounded-full transition-all"
                  style={{ width: `${(mindActiveCount / 6) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#45474b]">{isAr ? "الدراسة" : "School"}</span>
                <span className="font-semibold text-[#151c28]">{schoolActiveCount} / 1</span>
              </div>
              <div className="w-full h-1.5 bg-[#f0f3ff] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#000000] rounded-full transition-all"
                  style={{ width: `${(schoolActiveCount / 1) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Safe Archival Notice */}
          <div className="bg-white rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9] flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#0051d5] shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[#151c28]">
                {isAr ? "أرشفة آمنة للبيانات" : "Safe archival"}
              </span>
              <p className="text-xs text-[#45474b] leading-relaxed">
                {isAr
                  ? "إيقاف أي قسم لا يحذف بياناتك السابقة مطلقاً. يمكنك إعادة تفعيله في أي وقت دون فقدان سجلاتك."
                  : "Disabling a module hides its controls but never deletes historical records. All past data remains preserved."}
              </p>
            </div>
          </div>

          {/* Modular Architecture Callout */}
          <div className="bg-[#f0f3ff] rounded-[20px] p-6 border border-[#e2e8f9] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#0051d5]">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {isAr ? "بنية معيارية" : "Modular architecture"}
              </span>
            </div>
            <p className="text-xs text-[#45474b] leading-relaxed">
              {isAr
                ? "صُمم Lifemaxxing ليتكيف مع أهدافك المتغيرة. فعّل ما تحتاجه الآن وأوقف الباقي لتركيز ذهني مطلق."
                : "Lifemaxxing adapts to your evolving priorities. Enable what drives your current season and mute the rest."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
})()}
    </>
  );
}
