"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { UserProfile, UserSettings } from "@/lib/settings";
import { AccountTab } from "@/components/settings/AccountTab";
import { ModulesTab } from "@/components/settings/ModulesTab";
import { ProtocolTab } from "@/components/settings/ProtocolTab";
import { PreferencesTab } from "@/components/settings/PreferencesTab";
import { DataTab } from "@/components/settings/DataTab";
import { PrivacyTab } from "@/components/settings/PrivacyTab";
import { DeviceTab } from "@/components/settings/DeviceTab";
import { ModuleOnboardingModal } from "@/components/modules/ModuleOnboardingModal";

type SettingsTab = "account" | "modules" | "targets" | "preferences" | "data-privacy" | "onboarding";

const SEEDED_PROFILE: UserProfile = {
  id: "u1",
  birth_year: 2002,
  sex: "male",
  height_cm: 180,
  weight_unit: "kg",
  timezone: "Africa/Cairo",
  goal_type: "recomp",
  target_weight_kg: 78,
  locale: "en",
};

const SEEDED_SETTINGS: UserSettings = {
  user_id: "u1",
  target_calories: 2500,
  target_protein_g: 160,
  target_carbs_g: 280,
  target_fats_g: 70,
  water_target_ml: 3500,
  calorie_pacing: "optimal",
  target_sleep_hours: 8.0,
  bedtime_target: "23:00",
  wake_time_target: "07:00",
  daily_focus_goal_minutes: 120,
  caffeine_cutoff_hours: 8,
  screen_cutoff_minutes: 60,
  default_focus_mode: "sprint_50",
  sound_chime_enabled: true,
  sound_volume: 80,
  vibration_enabled: true,
  hide_adherence_scores: false,
};

export default function DevSettingsPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab") as SettingsTab;
      if (["account", "modules", "targets", "preferences", "data-privacy", "onboarding"].includes(tab)) return tab;
    }
    return "data-privacy";
  });
  const [fixtureMode, setFixtureMode] = useState<"seeded" | "empty">(() => {
    if (typeof window !== "undefined") {
      const fix = new URLSearchParams(window.location.search).get("fixture");
      if (fix === "empty" || fix === "seeded") return fix;
    }
    return "seeded";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const l = new URLSearchParams(window.location.search).get("lang") || new URLSearchParams(window.location.search).get("locale");
      if (l === "ar" || l === "en") {
        setLocale(l);
      }
    }
  }, [setLocale]);

  const isAr = locale === "ar";
  const isEmpty = fixtureMode === "empty";

  const profile = isEmpty ? null : SEEDED_PROFILE;
  const settings = isEmpty ? null : SEEDED_SETTINGS;
  const userEmail = isEmpty ? null : "demo@example.com";
  const userId = isEmpty ? null : "u1";

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c28] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Dev Preview Switcher Toolbar */}
      <div className="bg-white rounded-2xl border border-[#e2e8f9] p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#151c28]">
            {isAr ? "معاينة الإعدادات (Settings Dev Preview)" : "Settings Dev Preview"}
          </span>
          <span className="text-[10px] bg-[#dbe1ff] text-[#003ea8] px-2 py-0.5 rounded-full font-bold">
            Real Injected Components
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#f0f3ff] rounded-xl p-0.5 border border-[#e2e8f9]">
            <button
              onClick={() => setFixtureMode("seeded")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                fixtureMode === "seeded" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#45474b] hover:text-[#151c28]"
              }`}
            >
              {isAr ? "بيانات حقيقية (Seeded)" : "Seeded"}
            </button>
            <button
              onClick={() => setFixtureMode("empty")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                fixtureMode === "empty" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#45474b] hover:text-[#151c28]"
              }`}
            >
              {isAr ? "حالة فارغة (Empty)" : "Empty"}
            </button>
          </div>

          {/* Lang Switcher */}
          <div className="flex items-center bg-[#f0f3ff] rounded-xl p-0.5 border border-[#e2e8f9]">
            <button
              onClick={() => setLocale("en")}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                locale === "en" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#45474b] hover:text-[#151c28]"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("ar")}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                locale === "ar" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#45474b] hover:text-[#151c28]"
              }`}
            >
              AR (مصري)
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="bg-white rounded-[20px] border border-[#e2e8f9] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider font-medium text-[#45474b]">
              System configuration
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-[#151c28]">
              {isAr ? "الإعدادات" : "Settings"}
            </h1>
          </div>

          {/* Navigation */}
          <nav aria-label="Settings sections" className="flex items-center p-1 bg-[#f0f3ff] rounded-xl overflow-x-auto">
            {(["account", "modules", "targets", "preferences", "data-privacy", "onboarding"] as SettingsTab[]).map((tab) => {
              const labels: Record<SettingsTab, { en: string; ar: string }> = {
                account: { en: "Account", ar: "حسابك" },
                modules: { en: "Modules", ar: "الأقسام" },
                targets: { en: "Targets", ar: "أهدافك" },
                preferences: { en: "Preferences", ar: "التفضيلات" },
                "data-privacy": { en: "Data and privacy", ar: "البيانات والخصوصية" },
                onboarding: { en: "Onboarding Modal", ar: "مودال البداية" },
              };
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#151c28] shadow-xs font-bold"
                      : "text-[#45474b] hover:text-[#151c28]"
                  }`}
                >
                  {isAr ? labels[tab].ar : labels[tab].en}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Real Injected Component Renders */}
        {activeTab === "account" && (
          <AccountTab
            userEmail={userEmail}
            userId={userId}
          />
        )}

        {activeTab === "modules" && (
          <ModulesTab />
        )}

        {activeTab === "targets" && (
          <ProtocolTab
            initialProfile={profile}
            initialSettings={settings}
            onRefresh={() => {}}
          />
        )}

        {activeTab === "preferences" && (
          <PreferencesTab
            initialProfile={profile}
            initialSettings={settings}
            onRefresh={() => {}}
          />
        )}

        {activeTab === "data-privacy" && (
          <div className="space-y-6">
            <DataTab
              userEmail={userEmail}
            />
            <div className="pt-6 border-t border-[#e2e8f9] space-y-4">
              <h3 className="font-semibold text-base text-[#151c28]">
                {isAr ? "ذاكرة الجهاز والتخزين المؤقت" : "Device storage & offline status"}
              </h3>
              <DeviceTab />
            </div>
            <div className="pt-6 border-t border-[#e2e8f9] space-y-4">
              <PrivacyTab />
            </div>
          </div>
        )}

        {activeTab === "onboarding" && (
          <div className="p-8 text-center space-y-4 bg-[#f0f3ff] rounded-2xl">
            <ModuleOnboardingModal />
          </div>
        )}
      </div>
    </div>
  );
}
