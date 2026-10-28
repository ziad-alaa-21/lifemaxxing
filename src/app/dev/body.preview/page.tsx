"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Dumbbell,
  Apple,
  Moon,
  Scale,
  Library,
  Timer,
  X,
  Coffee,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function DevBodyPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<"workouts" | "nutrition" | "sleep" | "weight" | "library">(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "workouts" || tab === "nutrition" || tab === "sleep" || tab === "weight" || tab === "library") return tab;
      if (tab === "logger") return "workouts";
      if (tab === "standards" || tab === "history" || tab === "catalog") return "library";
    }
    return "workouts";
  });
  const [fixtureMode, setFixtureMode] = useState<"seeded" | "empty">(() => {
    if (typeof window !== "undefined") {
      const fix = new URLSearchParams(window.location.search).get("fixture");
      if (fix === "empty" || fix === "seeded") return fix;
    }
    return "seeded";
  });
  const [librarySubView, setLibrarySubView] = useState<"history" | "standards" | "catalog" | "meals">(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "standards" || tab === "history" || tab === "catalog") return tab;
    }
    return "history";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const l = new URLSearchParams(window.location.search).get("lang") || new URLSearchParams(window.location.search).get("locale");
      if (l === "ar" || l === "en") {
        setLocale(l);
      }
    }
  }, [setLocale]);

  // Rest timer test state
  const [isTimerOpen, setIsTimerOpen] = useState(true);

  // Bench press workout set state for plate quick-add demo
  const [benchWeight, setBenchWeight] = useState(60);
  const benchReps = 8;

  const isArabic = locale === "ar";

  // Plate quick-add handler
  const handleAddPlate = (plateWeight: number) => {
    // Rule: adds one plate on EACH side, total changes by 2 * plateWeight
    const base = benchWeight < 20 ? 20 : benchWeight;
    setBenchWeight(base + plateWeight * 2);
  };

  const handleStepWeight = (delta: number) => {
    setBenchWeight((prev) => Math.max(0, prev + delta));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3F4FB] to-[#ECEEFA] text-on-surface p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Dev Preview Control Switcher Toolbar */}
      <div className="bg-surface-container rounded-2xl border border-border-subtle p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary-ink">
            {isArabic ? "معاينة شاشة الجسم (Body Dev Preview)" : "Body Screen Dev Preview"}
          </span>
          <span className="text-[10px] bg-secondary-cyan/15 text-secondary-cyan px-2 py-0.5 rounded-full font-bold">
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
            href="/body"
            className="px-3 py-1 rounded-xl bg-primary-ink text-white font-bold hover:brightness-110 transition-colors"
          >
            {isArabic ? "فتح في التطبيق الحقيقي" : "Open Signed-in Route"}
          </Link>
        </div>
      </div>

      {/* Main Stitch Rebuilt Body Header & Segmented Tabs */}
      <div className="stitch-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-start">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              {isArabic ? "محرك الجسم والأداء" : "Body Performance & Health"}
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              {isArabic
                ? "تتبع التمارين والأوزان، الأكل، النوم، والوزن في مكان واحد."
                : "Workouts, nutrition, sleep, weight, and your exercise library in one unified view."}
            </p>
          </div>

          <span className="text-xs px-3 py-1.5 rounded-full bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/30 font-bold self-start sm:self-auto">
            {isArabic ? "المرحلة ب: الجسم" : "Stage B: Body View"}
          </span>
        </div>

        {/* 5 Distinct Body Tabs: Workouts, Nutrition, Sleep, Weight, Library */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-border-subtle">
          {[
            { id: "workouts", labelEn: "Workouts", labelAr: "التمارين", icon: Dumbbell },
            { id: "nutrition", labelEn: "Nutrition", labelAr: "الأكل والتغذية", icon: Apple },
            { id: "sleep", labelEn: "Sleep", labelAr: "النوم", icon: Moon },
            { id: "weight", labelEn: "Weight", labelAr: "الوزن", icon: Scale },
            { id: "library", labelEn: "Library", labelAr: "المكتبة", icon: Library },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "workouts" | "nutrition" | "sleep" | "weight" | "library")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSel
                    ? "bg-secondary-cyan text-white shadow-xs font-bold"
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

      {/* TAB 1: WORKOUTS */}
      {activeTab === "workouts" && (
        <div className="space-y-6">
          {fixtureMode === "empty" ? (
            <div className="stitch-card p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan mx-auto">
                <Dumbbell className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-on-surface">
                  {isArabic ? "مفيش تمرين شغال دلوقتي" : "No Active Workout Session"}
                </h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  {isArabic
                    ? "ابدأ تمرينة النهاردة وسجل أوزانك وعداتك وطارات البار بسهولة."
                    : "Start today's planned session and log barbell plates, sets, and reps."}
                </p>
              </div>
              <button
                onClick={() => setFixtureMode("seeded")}
                className="px-6 py-2.5 rounded-xl bg-primary-ink text-white font-bold text-xs uppercase tracking-wider shadow-xs hover:brightness-110 cursor-pointer"
              >
                {isArabic ? "ابدأ تمرينة جديدة" : "Start New Workout"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Session Header Card */}
              <div className="stitch-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-start">
                    <span className="text-[11px] font-bold text-secondary-cyan uppercase tracking-wider">
                      {isArabic ? "تمرين النهاردة المخطط" : "Today's Planned Workout"}
                    </span>
                    <h2 className="text-xl font-bold text-on-surface mt-0.5">
                      {isArabic ? "تمرين الصدر والأكتاف (Push A)" : "Push Day A: Chest & Shoulders"}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsTimerOpen(!isTimerOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 text-secondary-cyan text-xs font-mono font-bold cursor-pointer"
                    >
                      <Timer className="w-4 h-4" />
                      <span>{isArabic ? "عداد الراحة" : "Rest Timer"}</span>
                    </button>
                    <button
                      onClick={() => alert(isArabic ? "تم حفظ التمرين بنجاح!" : "Workout Saved!")}
                      className="px-5 py-2 rounded-xl bg-primary-ink text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer shadow-xs"
                    >
                      {isArabic ? "إنهاء التمرين" : "Finish Workout"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Barbell Exercise with Equipment-Aware Plate Buttons */}
              <div className="stitch-card p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="text-start">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-on-surface">
                        {isArabic ? "بنش برس بالبار (Barbell Bench Press)" : "Barbell Bench Press"}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-secondary-cyan/15 text-secondary-cyan font-bold uppercase">
                        {isArabic ? "بار أولمبي" : "Barbell"}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted mt-0.5 block">
                      {isArabic ? "البار الأولمبي (20 كجم أساسي)" : "Standard Olympic Bar (20 kg base)"}
                    </span>
                  </div>
                </div>

                {/* Set Log Row */}
                <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-start">
                      <span className="text-xs font-bold text-text-muted uppercase">
                        {isArabic ? "مجموعة 1" : "Set 1"}
                      </span>
                      <div className="text-2xl font-bold font-mono text-on-surface mt-0.5">
                        {benchWeight} {isArabic ? "كجم" : "kg"} × {benchReps} {isArabic ? "عدات" : "reps"}
                      </div>
                    </div>

                    {/* Stepper Adjusters */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStepWeight(-2.5)}
                        className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-surface-container-highest"
                      >
                        -2.5
                      </button>
                      <button
                        onClick={() => handleStepWeight(2.5)}
                        className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-surface-container-highest"
                      >
                        +2.5
                      </button>
                    </div>
                  </div>

                  {/* Plate Quick-Add Buttons (Shown ONLY for barbell exercises) */}
                  <div className="pt-3 border-t border-border-subtle/60 space-y-2">
                    <span className="text-[11px] font-bold text-text-muted block text-start">
                      {isArabic
                        ? "إضافة طارات سريعة (طارة في كل جمب على البار):"
                        : "Plate Quick-Add (1 plate added to EACH side of the barbell):"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { plate: 20, labelAr: "+20 كل ناحية (+40 كجم)", labelEn: "+20 each side (+40 kg)" },
                        { plate: 10, labelAr: "+10 كل ناحية (+20 كجم)", labelEn: "+10 each side (+20 kg)" },
                        { plate: 5, labelAr: "+5 كل ناحية (+10 كجم)", labelEn: "+5 each side (+10 kg)" },
                        { plate: 2.5, labelAr: "+2.5 كل ناحية (+5 كجم)", labelEn: "+2.5 each side (+5 kg)" },
                        { plate: 1.25, labelAr: "+1.25 كل ناحية (+2.5 كجم)", labelEn: "+1.25 each side (+2.5 kg)" },
                      ].map((item) => (
                        <button
                          key={item.plate}
                          onClick={() => handleAddPlate(item.plate)}
                          className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-secondary-cyan/15 hover:text-secondary-cyan border border-border-subtle text-xs font-mono font-medium transition-colors cursor-pointer"
                        >
                          {isArabic ? item.labelAr : item.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Non-Blocking Rest Timer */}
              {isTimerOpen && (
                <div
                  className={`fixed bottom-24 z-40 w-80 bg-surface-container rounded-2xl border border-secondary-cyan/30 shadow-2xl p-4 animate-slide-up ${
                    isArabic ? "left-4" : "right-4"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-secondary-cyan" />
                      <span className="text-xs font-bold text-on-surface">
                        {isArabic ? "عداد الراحة" : "Rest Timer"}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsTimerOpen(false)}
                      className="p-1 rounded-md text-text-muted hover:text-on-surface cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="text-2xl font-bold font-mono text-secondary-cyan">01:30</div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 rounded-lg bg-secondary-cyan/15 text-secondary-cyan font-bold text-xs cursor-pointer">
                        {isArabic ? "إيقاف" : "Pause"}
                      </button>
                      <button
                        onClick={() => setIsTimerOpen(false)}
                        className="px-3 py-1 rounded-lg bg-surface-container-high text-text-muted font-bold text-xs cursor-pointer"
                      >
                        {isArabic ? "تخطي" : "Skip"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NUTRITION */}
      {activeTab === "nutrition" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="stitch-card p-4 space-y-1 text-start">
              <span className="text-xs text-text-muted uppercase">{isArabic ? "سعرات" : "Calories"}</span>
              <div className="text-xl font-bold font-mono text-on-surface">
                {fixtureMode === "empty" ? "0" : "2,150"} / 2,600
              </div>
            </div>
            <div className="stitch-card p-4 space-y-1 text-start">
              <span className="text-xs text-text-muted uppercase">{isArabic ? "بروتين" : "Protein"}</span>
              <div className="text-xl font-bold font-mono text-secondary-cyan">
                {fixtureMode === "empty" ? "0" : "165"} / 180g
              </div>
            </div>
            <div className="stitch-card p-4 space-y-1 text-start">
              <span className="text-xs text-text-muted uppercase">{isArabic ? "نشويات" : "Carbs"}</span>
              <div className="text-xl font-bold font-mono text-amber-core">
                {fixtureMode === "empty" ? "0" : "220"} / 280g
              </div>
            </div>
            <div className="stitch-card p-4 space-y-1 text-start">
              <span className="text-xs text-text-muted uppercase">{isArabic ? "دهون" : "Fats"}</span>
              <div className="text-xl font-bold font-mono text-tertiary-purple">
                {fixtureMode === "empty" ? "0" : "60"} / 75g
              </div>
            </div>
          </div>

          {/* Caffeine & Water Warnings */}
          <div className="stitch-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-core" />
                <h3 className="text-sm font-bold text-on-surface">
                  {isArabic ? "تسجيل الكافيين ووقت الإيقاف" : "Caffeine Log & Cutoff Warning"}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-core">
                {fixtureMode === "empty" ? "0 mg" : "180 mg"}
              </span>
            </div>
            <div className="p-3 bg-amber-core/10 border border-amber-core/25 rounded-xl text-xs text-start">
              {isArabic
                ? "قربت على ميعاد وقف الكافيين (الساعة 4 العصر) عشان تعرف تنام مرتاح بالليل."
                : "Caffeine cutoff approaches at 4:00 PM for optimal sleep hygiene tonight."}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SLEEP */}
      {activeTab === "sleep" && (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-start">
                <span className="text-xs text-text-muted uppercase block">
                  {isArabic ? "درجة النوم (من تسجيلك)" : "Sleep score (from your log)"}
                </span>
                <div className="text-3xl font-bold font-mono text-secondary-cyan mt-1">
                  {fixtureMode === "empty" ? "--" : "88/100"}
                </div>
              </div>
              <button
                onClick={() => alert(isArabic ? "تم تطبيق مواعيد النوم المعتادة!" : "Pre-filled default schedule!")}
                className="px-4 py-2 rounded-xl bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/30 text-xs font-bold font-mono cursor-pointer"
              >
                {isArabic ? "زي العادة (Same as usual)" : "Same as usual"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border-subtle text-start">
              <div className="p-4 rounded-xl bg-surface-container space-y-1">
                <span className="text-xs text-text-muted">{isArabic ? "ميعاد النوم" : "Bedtime"}</span>
                <div className="text-lg font-bold font-mono text-on-surface">
                  {fixtureMode === "empty" ? "--:--" : "11:30 PM"}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface-container space-y-1">
                <span className="text-xs text-text-muted">{isArabic ? "ميعاد الصحيان" : "Wake time"}</span>
                <div className="text-lg font-bold font-mono text-on-surface">
                  {fixtureMode === "empty" ? "--:--" : "07:15 AM"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WEIGHT */}
      {activeTab === "weight" && (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-4 text-start">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-text-muted uppercase">{isArabic ? "وزنك الحالي" : "Current Weight"}</span>
                <div className="text-3xl font-bold font-mono text-on-surface mt-1">
                  {fixtureMode === "empty" ? "--" : "78.4"} {isArabic ? "كجم" : "kg"}
                </div>
              </div>
              <span className="text-xs font-bold text-secondary-cyan px-3 py-1 rounded-full bg-secondary-cyan/10">
                {isArabic ? "متوسط الأسبوع: 78.2 كجم" : "Weekly Avg: 78.2 kg"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIBRARY */}
      {activeTab === "library" && (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-4 text-start">
            <h2 className="text-lg font-bold text-on-surface">
              {isArabic ? "المكتبة الرياضية الشاملة" : "Body Library"}
            </h2>

            {/* Sub-navigation inside Library */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "history", labelAr: "سجل التمرينات", labelEn: "Workout History" },
                { id: "standards", labelAr: "مستويات القوة", labelEn: "Strength Standards" },
                { id: "catalog", labelAr: "دليل التمارين", labelEn: "Exercise Catalog" },
                { id: "meals", labelAr: "وجباتك المحفوظة", labelEn: "Saved Meals" },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setLibrarySubView(sub.id as "history" | "standards" | "catalog" | "meals")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
                    librarySubView === sub.id
                      ? "bg-secondary-cyan text-white font-bold"
                      : "bg-surface-container text-text-muted hover:text-on-surface border border-border-subtle"
                  }`}
                >
                  {isArabic ? sub.labelAr : sub.labelEn}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-border-subtle text-xs text-text-muted">
              {librarySubView === "history" && (isArabic ? "عرض 12 تمرينة مسجلة سابقة." : "Showing 12 recorded historical sessions.")}
              {librarySubView === "standards" && (isArabic ? "مصفوفة مستويات الأوزان المعتمدة ومعايير القوة." : "Canonical strength standards & radar rank matrix.")}
              {librarySubView === "catalog" && (isArabic ? "دليل التمارين الكاملة وإضافة تمرين مخصص جديد." : "Exercise movement directory with custom exercises.")}
              {librarySubView === "meals" && (isArabic ? "الوجبات المحفوظة سريعة الاستخدام من التغذية والمكتبة." : "Saved meal templates accessible from Nutrition and Library.")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
