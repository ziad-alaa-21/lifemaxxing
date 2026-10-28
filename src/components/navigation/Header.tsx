"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Plus, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface HeaderProps {
  onOpenQuickAction: () => void;
}

export function Header({ onOpenQuickAction }: HeaderProps) {
  const pathname = usePathname();
  const { locale, setLocale, dict } = useI18n();

  const getMeta = () => {
    if (pathname.startsWith("/today")) {
      return { title: dict.nav.today, subtitle: dict.nav.todaySubtitle };
    }
    if (pathname.startsWith("/body")) {
      return { title: dict.nav.body, subtitle: dict.nav.bodySubtitle };
    }
    if (pathname.startsWith("/mind")) {
      return { title: dict.nav.mind, subtitle: dict.nav.mindSubtitle };
    }
    if (pathname.startsWith("/school")) {
      return { title: dict.nav.school, subtitle: dict.nav.schoolSubtitle };
    }
    if (pathname.startsWith("/settings")) {
      return { title: dict.nav.settings, subtitle: dict.nav.settingsSubtitle };
    }
    return { title: "Life", subtitle: dict.nav.brandTag };
  };

  const meta = getMeta();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.06)] pt-safe">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        {/* Left: Title & context */}
        <div>
          <h1 className="text-[20px] leading-[28px] font-medium text-[#14161A]">
            {meta.title}
          </h1>
          <p className="text-[12px] leading-[16px] text-[#5B6270] hidden sm:block">
            {pathname.startsWith("/mind")
              ? (locale === "ar" ? "جلسات التركيز والعادات والأدوات" : "Focus sessions, habits and tools")
              : pathname.startsWith("/body")
              ? (locale === "ar" ? "التمارين، التغذية، النوم والمكتبة" : "Workouts, nutrition, sleep and library")
              : meta.subtitle}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Language quick switcher */}
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            aria-label={locale === "en" ? "تبديل إلى العربية (المصرية)" : "Switch to English"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-white hover:bg-[#F0F3FF] border border-[#E3E5F0] text-[12px] leading-[16px] font-medium text-[#14161A] transition-colors cursor-pointer shadow-[0_2px_8px_rgba(40,50,120,0.04)]"
            title={locale === "en" ? "العربية (مصري)" : "English"}
          >
            <Languages className="w-4 h-4 text-[#2563EB]" />
            <span className="font-medium text-[12px]">
              {locale === "en" ? "عربي" : "EN"}
            </span>
          </button>

          {/* Fast Action trigger */}
          <button
            onClick={onOpenQuickAction}
            className="flex items-center gap-2 px-[18px] py-[10px] rounded-[12px] bg-[#14161A] text-white text-[14px] leading-[20px] font-medium hover:bg-[#2A313D] shadow-[0_4px_12px_rgba(20,22,26,0.15)] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2] text-white stroke-current" />
            <span className="hidden sm:inline">{dict.nav.fastAction}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
