"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  User,
  Layers,
  Flame,
  Sliders,
  ShieldCheck,
  Download,
  Trash2,
  HardDrive,
  RefreshCw,
  Sparkles,
  Smartphone,
  Lock,
  Mail,
  Check,
} from "lucide-react";

type SettingsTab = "account" | "modules" | "targets" | "preferences" | "data-privacy" | "onboarding" | "login";

export default function DevSettingsPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab") as SettingsTab;
      if (["account", "modules", "targets", "preferences", "data-privacy", "onboarding", "login"].includes(tab)) return tab;
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

  // Stitch Screen ID Mapping
  const STITCH_SCREENS: Record<SettingsTab, { desktop: string; phone: string; title: string }> = {
    "account": {
      desktop: "415f52c7a5284a9da2b6e5e5dd89ae7e",
      phone: "e28242f23cfc451694ceceb0d5f2e717",
      title: "Settings - Account",
    },
    "modules": {
      desktop: "7dac4ad98dd2406fb00a7859a898adb7",
      phone: "1a27605099624650988ab9640a4fa3aa",
      title: "Settings - Modules",
    },
    "targets": {
      desktop: "74b29d2633c14b5688a3f5540740ae37",
      phone: "33c0367b836b411383084d7ea2a2b3c7",
      title: "Settings - Targets",
    },
    "preferences": {
      desktop: "415f52c7a5284a9da2b6e5e5dd89ae7e",
      phone: "e28242f23cfc451694ceceb0d5f2e717",
      title: "Settings - Preferences",
    },
    "data-privacy": {
      desktop: "415f52c7a5284a9da2b6e5e5dd89ae7e",
      phone: "e28242f23cfc451694ceceb0d5f2e717",
      title: "Settings - Data and Privacy",
    },
    "onboarding": {
      desktop: "91c57e0779464367909c63b9eea804db",
      phone: "71b7e534d4d7426490ad81312021001a",
      title: "Choose What to Track",
    },
    "login": {
      desktop: "1afc595a0afc45ee87207c7c1490cf71",
      phone: "1937ee3355444dd286d644f015cf2628",
      title: "Login",
    },
  };

  const currentStitch = STITCH_SCREENS[activeTab];

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c28] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Dev Preview Switcher Toolbar */}
      <div className="bg-white rounded-2xl border border-[#e2e8f9] p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#151c28]">
            {isAr ? "معاينة الإعدادات والأمان (Settings Dev Preview)" : "Settings & Auth Dev Preview"}
          </span>
          <span className="text-[10px] bg-[#dbe1ff] text-[#003ea8] px-2 py-0.5 rounded-full font-bold">
            Stitch Stage C
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#f0f3ff] rounded-xl p-0.5 border border-[#e2e8f9]">
            <button
              onClick={() => setFixtureMode("seeded")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                fixtureMode === "seeded" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#76777b] hover:text-[#151c28]"
              }`}
            >
              {isAr ? "بيانات حقيقية (Seeded)" : "Seeded"}
            </button>
            <button
              onClick={() => setFixtureMode("empty")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                fixtureMode === "empty" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#76777b] hover:text-[#151c28]"
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
                locale === "en" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#76777b] hover:text-[#151c28]"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("ar")}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                locale === "ar" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#76777b] hover:text-[#151c28]"
              }`}
            >
              AR (مصري)
            </button>
          </div>

          {/* Stitch Reference Badge */}
          <div className="bg-[#f0f3ff] border border-[#e2e8f9] px-2.5 py-1 rounded-xl text-[#45474b] font-mono text-[11px] flex items-center gap-1.5">
            <span className="text-[#0051d5] font-bold">Stitch:</span>
            <span>{currentStitch.title}</span>
            <span className="text-[#76777b]">({currentStitch.desktop.slice(0, 8)})</span>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="bg-white rounded-[20px] border border-[#e2e8f9] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] space-y-6">
        {/* Settings Header Context */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider font-medium text-[#45474b]">
              System configuration
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-[#151c28]">
              {isAr ? "الإعدادات" : "Settings"}
            </h1>
          </div>

          {/* Segmented Navigation Bar */}
          <nav aria-label="Settings sections" className="flex items-center p-1 bg-[#f0f3ff] rounded-xl overflow-x-auto">
            {(["account", "modules", "targets", "preferences", "data-privacy", "onboarding", "login"] as SettingsTab[]).map((tab) => {
              const labels: Record<SettingsTab, { en: string; ar: string }> = {
                account: { en: "Account", ar: "حسابك" },
                modules: { en: "Modules", ar: "الأقسام" },
                targets: { en: "Targets", ar: "أهدافك" },
                preferences: { en: "Preferences", ar: "التفضيلات" },
                "data-privacy": { en: "Data and privacy", ar: "البيانات والخصوصية" },
                onboarding: { en: "Onboarding", ar: "البداية" },
                login: { en: "Login", ar: "الدخول" },
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

        {/* Tab: Data and Privacy */}
        {activeTab === "data-privacy" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Rail (4 cols): Data Sovereignty */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-xs space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#e2e8f9] flex items-center justify-center text-[#0051d5]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[#151c28]">
                    {isAr ? "بياناتك ملكك لوحدك" : "Data sovereignty"}
                  </h2>
                  <p className="text-xs text-[#45474b]">
                    {isAr
                      ? "تسجيلات تمرينك، نومك، دراستك، وملاحظاتك خاصة بيك ومستحيل نبيعها لأي حد. تقدر تنزلها أو تمسحها بالكامل في أي وقت."
                      : "Your logs across focus sessions, workouts, and sleep schedules are privately stored and never commercialized. You have unrestricted access to your data history."}
                  </p>
                </div>
                <div className="bg-[#f0f3ff] rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-[#45474b] font-medium block">
                    {isAr ? "إجمالي السجلات المتزامنة" : "Active database footprint"}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-[#151c28]">{isEmpty ? "0" : "14,280"}</span>
                    <span className="text-xs text-[#0051d5] font-semibold">{isAr ? "متزامن" : "Synchronized"}</span>
                  </div>
                  <p className="text-[10px] text-[#76777b]">
                    {isAr ? "إجمالي الأحداث المسجلة منذ إنشاء الحساب" : "Total events recorded since account inception"}
                  </p>
                </div>
              </div>

              <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-4 shadow-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#0051d5] shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <span className="font-semibold block text-[#151c28]">{isAr ? "مفيش بيع لبياناتك" : "Zero cloud resale"}</span>
                  <p className="text-[#45474b] text-[11px]">
                    {isAr
                      ? "البيانات بتستخدم حصرياً داخل حسابك وعلى جهازك."
                      : "Telemetry is strictly restricted to diagnostic reliability and local caching."}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Rail (8 cols): Actions */}
            <div className="lg:col-span-8 space-y-4">
              {/* Card 1: Export Data */}
              <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#151c28] shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-[#151c28]">{isAr ? "تنزيل نسخة من بياناتك" : "Export your data"}</h3>
                      <p className="text-xs text-[#45474b]">
                        {isAr
                          ? "نزّل أرشيف كامل لكل تمريناتك، تغذيتك، نومك، جلسات تركيزك، ودرجاتك."
                          : "Download a full archive of all your logged workouts, nutrition, sleep, focus sessions, and grades."}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#dbe1ff] text-[#003ea8] text-xs font-medium">
                    {isAr ? "جاهز للتصدير" : "Archive ready"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="h-10 px-4 rounded-xl bg-white border border-[#e2e8f9] hover:bg-[#f0f3ff] text-xs font-semibold text-[#151c28] flex items-center gap-1.5 shadow-xs cursor-pointer">
                    <Download className="w-3.5 h-3.5 text-[#45474b]" />
                    <span>Download JSON</span>
                  </button>
                  <button className="h-10 px-4 rounded-xl bg-white border border-[#e2e8f9] hover:bg-[#f0f3ff] text-xs font-semibold text-[#151c28] flex items-center gap-1.5 shadow-xs cursor-pointer">
                    <Download className="w-3.5 h-3.5 text-[#45474b]" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Delete Data */}
              <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-6 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#45474b] shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-[#151c28]">{isAr ? "مسح سجلاتي فقط" : "Delete my data"}</h3>
                    <p className="text-xs text-[#45474b]">
                      {isAr
                        ? "بيمسح كل التسجيلات بس بيسيب حسابك وإعداداتك."
                        : "Removes your logs but keeps your account and settings."}
                    </p>
                  </div>
                </div>
                <button className="h-10 px-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f9] text-xs font-semibold text-[#151c28] cursor-pointer">
                  {isAr ? "مسح سجلاتي" : "Delete my data"}
                </button>
              </div>

              {/* Card 3: Delete Account */}
              <div className="rounded-[20px] bg-white border border-[#ffdad6] p-6 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a] shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-[#ba1a1a]">{isAr ? "حذف حسابي بالكامل" : "Delete my account"}</h3>
                    <p className="text-xs text-[#45474b]">
                      {isAr
                        ? "بيمسح الحساب وكل البيانات نهائياً ومبيترجعش."
                        : "Removes everything permanently."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#45474b] block">
                    {isAr ? "اكتب DELETE MY ACCOUNT للتأكيد:" : "Type DELETE MY ACCOUNT to confirm:"}
                  </label>
                  <input
                    type="text"
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full max-w-sm h-10 px-3 rounded-xl bg-[#f0f3ff] text-xs text-[#151c28] border-none outline-none"
                  />
                </div>
                <button disabled className="h-10 px-4 rounded-xl bg-[#f0f3ff] text-[#ba1a1a] text-xs font-semibold opacity-50 cursor-not-allowed">
                  {isAr ? "حذف حسابي نهائياً" : "Delete my account"}
                </button>
              </div>

              {/* Storage & Device Diagnostics (DeviceTab Reachability) */}
              <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#151c28]">
                    <HardDrive className="w-4 h-4 text-[#0051d5]" />
                    <span>{isAr ? "ذاكرة الجهاز والتشغيل بدون نت" : "Device storage & offline cache"}</span>
                  </div>
                  <span className="text-[11px] text-[#76777b]">
                    {isAr ? "آخر مزامنة: الآن" : "Last sync: Just now"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-9 px-3.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-xs font-semibold text-[#151c28] flex items-center gap-1.5 cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5 text-[#45474b]" />
                    <span>{isAr ? "تفريغ الذاكرة المؤقتة" : "Clear local cache"}</span>
                  </button>
                  <button className="h-9 px-3.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-xs font-semibold text-[#151c28] flex items-center gap-1.5 cursor-pointer">
                    <Smartphone className="w-3.5 h-3.5 text-[#45474b]" />
                    <span>{isAr ? "تثبيت الأبلكيشن (PWA)" : "Install as app"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Modules */}
        {activeTab === "modules" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#151c28]">{isAr ? "الأقسام الشغالة في التطبيق" : "Active tracking modules"}</h2>
              <p className="text-xs text-[#45474b]">{isAr ? "شغّل أو اقفل أي قسم حسب احتياجاتك" : "Toggle modules on or off according to your focus"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: "workouts", en: "Workouts", ar: "التمارين والحديد" },
                { key: "nutrition", en: "Nutrition", ar: "الأكل والشرب" },
                { key: "sleep", en: "Sleep", ar: "النوم والراحة" },
                { key: "mind", en: "Mind", ar: "الذهن والتركيز" },
                { key: "school", en: "School", ar: "الدراسة والمذاكرة" },
                { key: "weight", en: "Weight", ar: "تتبع الوزن" },
              ].map((mod) => (
                <div key={mod.key} className="p-4 rounded-xl bg-[#f0f3ff] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#151c28]">{isAr ? mod.ar : mod.en}</span>
                  <div className="w-10 h-6 bg-black rounded-full p-0.5 flex items-center justify-end cursor-pointer">
                    <div className="w-5 h-5 rounded-full bg-white"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Targets */}
        {activeTab === "targets" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#151c28]">{isAr ? "أهدافك ومعاييرك" : "Your Targets & Objectives"}</h2>
              <p className="text-xs text-[#45474b]">{isAr ? "الوزن، السعرات، البروتين، ساعات النوم، ومعدل المذاكرة" : "Weight, calories, sleep targets, and study hours"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#f0f3ff] space-y-2">
                <label className="text-xs font-semibold text-[#151c28] block">{isAr ? "الوزن المستهدف (كجم)" : "Target body weight (kg)"}</label>
                <input type="number" defaultValue={78} className="w-full h-10 px-3 rounded-lg bg-white text-sm text-[#151c28] border border-[#e2e8f9]" />
              </div>
              <div className="p-4 rounded-xl bg-[#f0f3ff] space-y-2">
                <label className="text-xs font-semibold text-[#151c28] block">{isAr ? "السعرات اليومية" : "Daily target calories"}</label>
                <input type="number" defaultValue={2600} className="w-full h-10 px-3 rounded-lg bg-white text-sm text-[#151c28] border border-[#e2e8f9]" />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Preferences */}
        {activeTab === "preferences" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#151c28]">{isAr ? "تفضيلات التطبيق" : "Preferences"}</h2>
              <p className="text-xs text-[#45474b]">{isAr ? "اللغة، الأصوات، ووحدات القياس" : "Language, alerts, and units"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#f0f3ff] space-y-2">
                <label className="text-xs font-semibold text-[#151c28] block">{isAr ? "لغة التطبيق" : "App language"}</label>
                <div className="flex gap-2">
                  <button onClick={() => setLocale("en")} className={`px-4 py-2 rounded-lg text-xs font-bold ${locale === "en" ? "bg-black text-white" : "bg-white text-black"}`}>English</button>
                  <button onClick={() => setLocale("ar")} className={`px-4 py-2 rounded-lg text-xs font-bold ${locale === "ar" ? "bg-black text-white" : "bg-white text-black"}`}>العامية المصرية</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Onboarding */}
        {activeTab === "onboarding" && (
          <div className="max-w-md mx-auto p-6 rounded-[20px] bg-white border border-[#e2e8f9] shadow-sm space-y-5 text-center">
            <h2 className="text-2xl font-bold text-[#151c28]">{isAr ? "اختار اللي عايز تتابعه" : "Choose what to track"}</h2>
            <p className="text-xs text-[#45474b]">
              {isAr ? "تقدر تعدل أو تقفل أي قسم في أي وقت من الإعدادات." : "You can change this anytime in Settings."}
            </p>
            <div className="space-y-2 text-left">
              {["Workouts", "Nutrition", "Sleep", "Mind", "School"].map((m) => (
                <div key={m} className="p-3 rounded-xl bg-[#f0f3ff] flex items-center justify-between text-xs font-semibold text-[#151c28]">
                  <span>{m}</span>
                  <Check className="w-4 h-4 text-[#0051d5]" />
                </div>
              ))}
            </div>
            <button className="w-full h-11 rounded-xl bg-black text-white text-sm font-semibold shadow-sm cursor-pointer">
              {isAr ? "يلا بينا" : "Get started"}
            </button>
          </div>
        )}

        {/* Tab: Login */}
        {activeTab === "login" && (
          <div className="max-w-md mx-auto p-8 rounded-[20px] bg-white border border-[#e2e8f9] shadow-sm space-y-6 text-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-[#151c28]">Life</h2>
              <p className="text-xs text-[#45474b]">{isAr ? "أهلاً بيك تاني" : "Welcome back"}</p>
            </div>
            <button className="w-full h-11 rounded-xl bg-white border border-[#e2e8f9] hover:bg-[#f0f3ff] text-xs font-semibold text-[#151c28] flex items-center justify-center gap-2 shadow-xs cursor-pointer">
              <span>{isAr ? "الدخول بحساب Google" : "Continue with Google"}</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-[#76777b]">
              <div className="h-[1px] flex-1 bg-[#e2e8f9]"></div>
              <span>{isAr ? "أو بالإيميل" : "or with email"}</span>
              <div className="h-[1px] flex-1 bg-[#e2e8f9]"></div>
            </div>
            <div className="space-y-3 text-left">
              <input type="email" placeholder="you@example.com" className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-xs border-none outline-none" />
              <input type="password" placeholder="••••••••" className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-xs border-none outline-none" />
              <button className="w-full h-11 rounded-xl bg-black text-white text-xs font-semibold shadow-sm cursor-pointer">
                {isAr ? "تسجيل الدخول" : "Sign in"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
