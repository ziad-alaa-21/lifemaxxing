"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Timer,
  Zap,
  Activity,
  CheckCircle2,
  BookOpen,
  Smartphone,
  GraduationCap,
  Power,
  Settings,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ModuleKey, MODULE_DEFINITIONS } from "@/lib/modules";
import { useUserModules } from "@/lib/modules/UserModulesContext";
import { useI18n } from "@/lib/i18n/I18nContext";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Timer,
  Zap,
  Activity,
  CheckCircle2,
  BookOpen,
  Smartphone,
  GraduationCap,
};

interface DisabledModuleFallbackProps {
  moduleKey: ModuleKey;
  onEnabled?: () => void;
}

export function DisabledModuleFallback({
  moduleKey,
  onEnabled,
}: DisabledModuleFallbackProps) {
  const { toggleModule } = useUserModules();
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [isEnabling, setIsEnabling] = useState(false);

  const def = MODULE_DEFINITIONS[moduleKey];
  const Icon = (def && ICON_MAP[def.icon]) || Sparkles;

  const handleEnable = async () => {
    setIsEnabling(true);
    const res = await toggleModule(moduleKey, true);
    setIsEnabling(false);
    if (res.success && onEnabled) {
      onEnabled();
    }
  };

  return (
    <div
      id={`disabled-fallback-${moduleKey}`}
      className="rounded-[20px] bg-white border border-[#e2e8f9] p-8 sm:p-12 max-w-xl mx-auto my-8 text-center relative overflow-hidden shadow-xs"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#0051d5]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-[#f0f3ff] border border-[#dce2f3] flex items-center justify-center text-[#0051d5] mx-auto mb-5 shadow-xs">
        <Icon className="w-8 h-8 opacity-90" />
      </div>

      <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#f8faff] text-[#45474b] border border-[#e2e8f9]">
        {isAr ? "قسم غير مفعل" : "Module Off"}
      </span>

      <h3 className="text-lg sm:text-xl font-bold text-[#151c28] mt-3">
        {isAr
          ? `قسم ${def?.labelAr || moduleKey} مقفول دلوقتي`
          : `${def?.labelEn || moduleKey} is turned off`}
      </h3>

      <p className="text-xs sm:text-sm text-[#45474b] max-w-md mx-auto mt-2 leading-relaxed">
        {isAr
          ? "تقدر تشغل القسم ده في أي لحظة. كل بياناتك القديمة محفوظة في أمان ومفيش أي حاجة اتمسحت."
          : "You can turn this module on anytime. All your past entries and history remain completely safe."}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <button
          type="button"
          id={`enable-module-btn-${moduleKey}`}
          disabled={isEnabling}
          onClick={handleEnable}
          className="w-full sm:w-auto px-5 py-2.5 rounded-[12px] bg-[#0051d5] text-white text-sm font-semibold hover:bg-[#0043b3] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          {isEnabling ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Power className="w-4 h-4 text-white" />
          )}
          <span>{isAr ? "تشغيل القسم ده" : "Turn On Module"}</span>
        </button>

        <Link
          href="/settings?tab=modules"
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f9] border border-[#dce2f3] text-[#0051d5] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Settings className="w-4 h-4 text-[#0051d5]" />
          <span>{isAr ? "إدارة كل الأقسام" : "Manage All Modules"}</span>
        </Link>
      </div>
    </div>
  );
}
