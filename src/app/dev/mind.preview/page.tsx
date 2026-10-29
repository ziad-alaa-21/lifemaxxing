"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Timer,
  CheckCircle2,
  Smile,
  Wrench,
  Play,
  RotateCcw,
  Calculator,
  BookOpen,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function DevMindPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<"focus" | "habits" | "checkin" | "tools">(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "focus" || tab === "habits" || tab === "checkin" || tab === "tools") return tab;
      if (tab === "math" || tab === "reading" || tab === "screen_time" || tab === "insights") return "tools";
    }
    return "focus";
  });
  const [fixtureMode, setFixtureMode] = useState<"seeded" | "empty">(() => {
    if (typeof window !== "undefined") {
      const fix = new URLSearchParams(window.location.search).get("fixture");
      if (fix === "empty" || fix === "seeded") return fix;
    }
    return "seeded";
  });
  const [selectedTool, setSelectedTool] = useState<"math" | "reading" | "screentime" | "insights">(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "reading" || tab === "insights" || tab === "math") return tab;
      if (tab === "screen_time" || tab === "screentime") return "screentime";
    }
    return "math";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const l = new URLSearchParams(window.location.search).get("lang") || new URLSearchParams(window.location.search).get("locale");
      if (l === "ar" || l === "en") {
        setLocale(l);
      }
    }
  }, [setLocale]);

  const isArabic = locale === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3F4FB] to-[#ECEEFA] text-on-surface p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Dev Preview Switcher Toolbar */}
      <div className="bg-surface-container rounded-2xl border border-border-subtle p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary-ink">
            {isArabic ? "معاينة شاشة الذهن (Mind Dev Preview)" : "Mind Screen Dev Preview"}
          </span>
          <span className="text-[10px] bg-tertiary-purple/15 text-tertiary-purple px-2 py-0.5 rounded-full font-bold">
            Stitch Rebuild
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-surface-container-high rounded-xl p-0.5 border border-border-subtle">
            <button
              onClick={() => setFixtureMode("seeded")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                fixtureMode === "seeded" ? "bg-white font-bold shadow-xs text-on-surface" : "text-text-muted hover:text-on-surface"
              }`}
            >
              {isArabic ? "بيانات حقيقية (Seeded)" : "Seeded"}
            </button>
            <button
              onClick={() => setFixtureMode("empty")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                fixtureMode === "empty" ? "bg-white font-bold shadow-xs text-on-surface" : "text-text-muted hover:text-on-surface"
              }`}
            >
              {isArabic ? "حالة فارغة (Empty)" : "Empty"}
            </button>
          </div>

          {/* Lang Switcher */}
          <div className="flex items-center bg-surface-container-high rounded-xl p-0.5 border border-border-subtle">
            <button
              onClick={() => setLocale("en")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                locale === "en" ? "bg-white font-bold shadow-xs text-on-surface" : "text-text-muted hover:text-on-surface"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLocale("ar")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                locale === "ar" ? "bg-white font-bold shadow-xs text-on-surface" : "text-text-muted hover:text-on-surface"
              }`}
            >
              عربي (مصري)
            </button>
          </div>

          <Link
            href="/mind"
            className="px-3 py-1 rounded-xl bg-primary-ink text-white font-bold hover:brightness-110 transition-colors"
          >
            {isArabic ? "فتح في التطبيق الحقيقي" : "Open Signed-in Route"}
          </Link>
        </div>
      </div>

      {/* Main Stitch Rebuilt Mind Header */}
      <div className="stitch-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-start">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              {isArabic ? "الذهن والتركيز" : "Mind & Focus"}
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              {isArabic
                ? "جلسات التركيز، العادات اليومية، التقييم، والأدوات."
                : "Deep focus sessions, daily habits, check-ins, and mental agility tools."}
            </p>
          </div>

          <span className="text-xs px-3 py-1.5 rounded-full bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30 font-bold self-start sm:self-auto">
            {isArabic ? "المرحلة ب: الذهن" : "Stage B: Mind View"}
          </span>
        </div>

        {/* 4 Clean Mind Tabs: Focus, Habits, Check-in, Tools */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-border-subtle">
          {[
            { id: "focus", labelEn: "Focus", labelAr: "التركيز", icon: Timer },
            { id: "habits", labelEn: "Habits", labelAr: "العادات", icon: CheckCircle2 },
            { id: "checkin", labelEn: "Check-in", labelAr: "تقييم اليوم", icon: Smile },
            { id: "tools", labelEn: "Tools", labelAr: "الأدوات", icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "focus" | "habits" | "checkin" | "tools")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSel
                    ? "bg-tertiary-purple text-white shadow-xs font-bold"
                    : "bg-surface-container hover:bg-surface-container-high text-text-muted hover:text-on-surface border border-border-subtle"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isArabic ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mind Score Banner (Plain Wording Only) */}
      <div className="stitch-card p-5 text-start space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-text-muted uppercase">
              {isArabic ? "درجة ذهنك (من تسجيلاتك)" : "Mind score (from your logs)"}
            </span>
            <div className="text-3xl font-bold font-mono text-tertiary-purple mt-0.5">
              {fixtureMode === "empty" ? "--" : "84/100"}
            </div>
          </div>
          <span className="text-xs font-mono text-text-muted self-start sm:self-auto">
            {fixtureMode === "empty"
              ? isArabic ? "مفيش جلسات لسه" : "No sessions yet"
              : isArabic ? "جلسات تركيز + عادات + قراءة متسجلة" : "Synthesizing focus, habits & reading logs"}
          </span>
        </div>
      </div>

      {/* TAB 1: FOCUS */}
      {activeTab === "focus" && (
        <div className="space-y-6">
          <div className="stitch-card p-8 text-center space-y-5">
            <div className="space-y-1">
              <span className="text-xs font-bold text-tertiary-purple uppercase tracking-wider">
                {isArabic ? "جلسة تركيز 50 دقيقة" : "50-Minute Sprint Session"}
              </span>
              <div className="text-5xl font-extrabold font-mono text-on-surface tracking-tight">
                {fixtureMode === "empty" ? "50:00" : "32:15"}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-tertiary-purple text-white font-bold text-xs uppercase tracking-wider shadow-xs hover:brightness-110 cursor-pointer">
                <Play className="w-4 h-4" />
                <span>{isArabic ? "ابدأ التركيز" : "Start Focus"}</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-text-muted hover:text-on-surface border border-border-subtle font-bold text-xs cursor-pointer">
                <RotateCcw className="w-4 h-4" />
                <span>{isArabic ? "إعادة ضبط" : "Reset"}</span>
              </button>
            </div>

            {/* End of Session Summary Drawer Preview */}
            <div className="pt-4 border-t border-border-subtle max-w-md mx-auto text-start space-y-2 text-xs">
              <span className="font-bold text-text-muted block">
                {isArabic ? "تفاصيل الجلسة والتاجات:" : "Session metadata & focus tags:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface">
                  {isArabic ? "مادة: فيزياء متقدمة" : "Subject: Advanced Physics"}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface">
                  {isArabic ? "تصنيف: مذاكرة عميقة" : "Category: Deep Study"}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-tertiary-purple/15 text-tertiary-purple font-bold">
                  {isArabic ? "تركيز عالي" : "High Focus"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HABITS & DISCIPLINES */}
      {activeTab === "habits" && (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-5 text-start">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  {isArabic ? "عاداتك والتزاماتك اليومية" : "Habits & Daily Commitments"}
                </h3>
                {/* Main Display: X of Y done */}
                <div className="text-xl font-bold font-mono text-tertiary-purple mt-1">
                  {fixtureMode === "empty"
                    ? (isArabic ? "0 من 4 خلصوا" : "0 of 4 done")
                    : (isArabic ? "3 من 4 خلصوا" : "3 of 4 done")}
                </div>
              </div>

              {/* Secondary Streak & 7-day text */}
              <div className="text-end">
                <span className="text-xs text-text-muted block">
                  {fixtureMode === "empty"
                    ? (isArabic ? "عملتها 0 أيام من آخر 7 أيام" : "Done on 0 of the last 7 days")
                    : (isArabic ? "عملتها 6 أيام من آخر 7 أيام" : "Done on 6 of the last 7 days")}
                </span>
                <span className="text-[11px] font-mono text-amber-core font-bold">
                  {fixtureMode === "empty" ? "--" : (isArabic ? "استمرار 5 أيام" : "5-day streak")}
                </span>
              </div>
            </div>

            {/* Habit Items */}
            <div className="space-y-2.5">
              {[
                { nameEn: "Morning Meditation", nameAr: "تأمل الصبح (10 دقايق)", done: fixtureMode === "seeded" },
                { nameEn: "Read 20 Pages", nameAr: "قراءة 20 صفحة كتاب", done: fixtureMode === "seeded" },
                { nameEn: "No Screen After 10 PM", nameAr: "قفل الشاشات بعد 10 بالليل", done: fixtureMode === "seeded" },
                { nameEn: "Cold Shower", nameAr: "دش بارد وتنشيط", done: false },
              ].map((habit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container border border-border-subtle"
                >
                  <span className="text-xs font-semibold text-on-surface">
                    {isArabic ? habit.nameAr : habit.nameEn}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                      habit.done ? "bg-tertiary-purple text-white" : "border border-border-subtle bg-surface-container-high"
                    }`}
                  >
                    {habit.done && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHECK-IN */}
      {activeTab === "checkin" && (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-4 text-start">
            <h3 className="text-base font-bold text-on-surface">
              {isArabic ? "تشيك إن المزاج والطاقة النهاردة" : "Daily Mood & Energy Check-in"}
            </h3>
            <p className="text-xs text-text-muted">
              {isArabic
                ? "تقييم سريع للمزاج ومستوى الطاقة والتركيز."
                : "Fast qualitative reflection on mood, energy levels, and alertness."}
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-surface-container border border-border-subtle text-center">
                <span className="text-[10px] text-text-muted uppercase block">{isArabic ? "المزاج" : "Mood"}</span>
                <span className="text-lg font-bold text-on-surface mt-1 block">
                  {fixtureMode === "empty" ? "--" : (isArabic ? "ممتاز" : "Great")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container border border-border-subtle text-center">
                <span className="text-[10px] text-text-muted uppercase block">{isArabic ? "الطاقة" : "Energy"}</span>
                <span className="text-lg font-bold text-on-surface mt-1 block">
                  {fixtureMode === "empty" ? "--" : (isArabic ? "عالية" : "High")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container border border-border-subtle text-center">
                <span className="text-[10px] text-text-muted uppercase block">{isArabic ? "التركيز" : "Focus"}</span>
                <span className="text-lg font-bold text-on-surface mt-1 block">
                  {fixtureMode === "empty" ? "--" : (isArabic ? "حاضر" : "Sharp")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TOOLS */}
      {activeTab === "tools" && (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-4 text-start">
            <h3 className="text-base font-bold text-on-surface">
              {isArabic ? "أدوات الذهن" : "Mind Tools & Trackers"}
            </h3>

            {/* Sub-tool Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "math", labelEn: "Mental Math", labelAr: "الحساب الذهني", icon: Calculator },
                { id: "reading", labelEn: "Reading", labelAr: "القراءة", icon: BookOpen },
                { id: "screentime", labelEn: "Screen Time", labelAr: "وقت الشاشة", icon: Smartphone },
                { id: "insights", labelEn: "Insights", labelAr: "تحليلات", icon: TrendingUp },
              ].map((tool) => {
                const Icon = tool.icon;
                const isSel = selectedTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id as "math" | "reading" | "screentime" | "insights")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
                      isSel
                        ? "bg-tertiary-purple text-white font-bold"
                        : "bg-surface-container text-text-muted hover:text-on-surface border border-border-subtle"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{isArabic ? tool.labelAr : tool.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Tool Content Preview */}
            <div className="pt-3 border-t border-border-subtle text-xs text-text-muted">
              {selectedTool === "math" && (
                <div className="p-4 rounded-xl bg-surface-container space-y-2">
                  <div className="flex items-center justify-between font-bold text-on-surface">
                    <span>{isArabic ? "تدريب العمليات الحسابية السريعة" : "Mental Math Speed Trainer"}</span>
                    <span className="text-tertiary-purple">{fixtureMode === "empty" ? "0 sessions" : "4 sessions (92% accuracy)"}</span>
                  </div>
                  <p>{isArabic ? "حل مسائل ضرب وجمع وطرح في وقت قياسي." : "Solve timed arithmetic questions to sharpen mental speed."}</p>
                </div>
              )}
              {selectedTool === "reading" && (
                <div className="p-4 rounded-xl bg-surface-container space-y-2">
                  <div className="flex items-center justify-between font-bold text-on-surface">
                    <span>{isArabic ? "قائمة الكتب ومتابعة الصفحات" : "Reading List & Daily Pages"}</span>
                    <span className="text-secondary-cyan">{fixtureMode === "empty" ? "0 pages" : "45 pages read today"}</span>
                  </div>
                  <p>{isArabic ? "كتاب حالي: العادات الذرية (صفحة 142 من 320)" : "Active book: Atomic Habits (Page 142 of 320)"}</p>
                </div>
              )}
              {selectedTool === "screentime" && (
                <div className="p-4 rounded-xl bg-surface-container space-y-2">
                  <div className="flex items-center justify-between font-bold text-on-surface">
                    <span>{isArabic ? "تسجيل وقت استخدام الشاشة" : "Manual Screen Time Balance"}</span>
                    <span className="text-amber-core">{fixtureMode === "empty" ? "0h" : "3h 45m logged"}</span>
                  </div>
                  <p>{isArabic ? "2h 30m شغل ومذاكرة • 1h 15m ترفيه" : "2h 30m productive work • 1h 15m leisure"}</p>
                </div>
              )}
              {selectedTool === "insights" && (
                <div className="p-4 rounded-xl bg-surface-container space-y-2">
                  <div className="font-bold text-on-surface">
                    {isArabic ? "ملاحظات وتحليلات الأسبوع" : "Weekly Patterns & Insights"}
                  </div>
                  <p>{isArabic ? "أعلى تركيز بيكون الصبح بدري بعد 7 ساعات نوم متواصلة." : "Peak focus occurs during early morning blocks following 7+ hours of sleep."}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
