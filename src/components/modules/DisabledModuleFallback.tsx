"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Utensils,
  Moon,
  Scale,
  Timer,
  CheckCircle2,
  BookOpen,
  Smartphone,
  Calendar,
  ListChecks,
  BookX,
  Power,
  Settings,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ModuleKey, MODULE_DEFINITIONS } from "@/lib/modules";
import { useUserModules } from "@/lib/modules/UserModulesContext";
import { useI18n } from "@/lib/i18n/I18nContext";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Dumbbell,
  Utensils,
  Moon,
  Scale,
  Timer,
  CheckCircle2,
  BookOpen,
  Smartphone,
  Calendar,
  ListChecks,
  BookX,
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
  const Icon = ICON_MAP[def.icon] || Sparkles;

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
      className="p-8 sm:p-12 rounded-3xl bg-surface-container/40 border border-border-subtle max-w-xl mx-auto my-8 text-center relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary-lime/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-border-medium flex items-center justify-center text-on-surface-variant mx-auto mb-5 shadow-xs">
        <Icon className="w-8 h-8 opacity-70" />
      </div>

      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-surface-container-highest text-on-surface-variant border border-border-subtle">
        {isAr ? "قسم غير مفعل" : "Module Off"}
      </span>

      <h3 className="text-lg sm:text-xl font-bold font-mono text-on-surface mt-3">
        {isAr
          ? `قسم ${def.labelAr} مقفول دلوقتي`
          : `${def.labelEn} is turned off`}
      </h3>

      <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
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
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-lime text-surface font-mono text-xs font-bold tracking-wide hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {isEnabling ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isAr ? "جارٍ التفعيل..." : "Enabling..."}</span>
            </>
          ) : (
            <>
              <Power className="w-4 h-4" />
              <span>{isAr ? `تشغيل ${def.labelAr}` : `Turn on ${def.labelEn}`}</span>
            </>
          )}
        </button>

        <Link
          href="/settings?tab=modules"
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs font-medium border border-border-subtle transition-colors flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4 text-on-surface-variant" />
          <span>{isAr ? "إدارة الأقسام في الإعدادات" : "Manage in Settings"}</span>
        </Link>
      </div>
    </div>
  );
}
