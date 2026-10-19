"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Locale, TranslationDictionary, translations } from "./translations";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isRTL: boolean;
  t: (path: string, fallback?: string) => string;
  dict: TranslationDictionary;
}

const STORAGE_KEY = "lifemaxxing_locale";

const I18nContext = createContext<I18nContextType | null>(null);

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = obj;
  for (const segment of segments) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Initial locale detection from localStorage or cookie
    let initialLocale: Locale = "en";
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "ar" || stored === "en") {
        initialLocale = stored;
      } else {
        // Fallback: check document cookies
        const match = document.cookie.match(/(?:^|;\s*)lifemaxxing_locale=([^;]+)/);
        if (match && (match[1] === "ar" || match[1] === "en")) {
          initialLocale = match[1] as Locale;
        }
      }
    } catch {
      // In private browsing or storage disabled
    }

    setLocaleState(initialLocale);
    setMounted(true);

    // Apply dir and lang to html element
    const isRtl = initialLocale === "ar";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = initialLocale;
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    const isRtl = newLocale === "ar";
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `lifemaxxing_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // storage quota or private mode
    }

    if (typeof document !== "undefined") {
      document.documentElement.dir = isRtl ? "rtl" : "ltr";
      document.documentElement.lang = newLocale;
    }
  };

  const isRTL = locale === "ar";
  const dict = useMemo(() => translations[locale] || translations.en, [locale]);

  const t = (path: string, fallback?: string): string => {
    const val = resolvePath(dict as unknown as Record<string, unknown>, path);
    if (typeof val === "string") return val;

    // Fallback to English dictionary
    const fallbackVal = resolvePath(translations.en as unknown as Record<string, unknown>, path);
    if (typeof fallbackVal === "string") return fallbackVal;

    return fallback ?? path;
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        isRTL,
        t,
        dict,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g. testing or isolated preview)
    const fallbackDict = translations.en;
    return {
      locale: "en",
      setLocale: () => {},
      isRTL: false,
      t: (path: string, fallback?: string) => {
        const val = resolvePath(fallbackDict as unknown as Record<string, unknown>, path);
        return typeof val === "string" ? val : fallback ?? path;
      },
      dict: fallbackDict,
    };
  }
  return context;
}
