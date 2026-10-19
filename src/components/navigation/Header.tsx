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
    <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-xl border-b border-border-subtle pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Title & context */}
        <div>
          <h1 className="text-base sm:text-lg font-bold font-mono tracking-tight text-on-surface">
            {meta.title}
          </h1>
          <p className="text-xs text-text-muted hidden sm:block">
            {meta.subtitle}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Language quick switcher */}
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            aria-label={locale === "en" ? "تبديل إلى العربية (المصرية)" : "Switch to English"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface hover:text-primary-lime transition-all cursor-pointer shadow-xs"
            title={locale === "en" ? "العربية (مصري)" : "English"}
          >
            <Languages className="w-3.5 h-3.5 text-primary-lime" />
            <span className="font-bold text-[11px] uppercase tracking-wider">
              {locale === "en" ? "عربي" : "EN"}
            </span>
          </button>

          {/* Fast Action trigger */}
          <button
            onClick={onOpenQuickAction}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-lime text-on-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary-lime-dim shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-on-primary stroke-current" />
            <span className="hidden sm:inline">{dict.nav.fastAction}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
