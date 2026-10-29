"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CalendarClock,
  ListTodo,
  CheckCircle2,
  Clock,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  AlertCircle,
  BarChart3,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
} from "lucide-react";

type SchoolTab = "subjects" | "schedule" | "plan" | "practice" | "grades";

export default function DevSchoolPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<SchoolTab>(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab") as SchoolTab;
      if (["subjects", "schedule", "plan", "practice", "grades"].includes(tab)) return tab;
    }
    return "subjects";
  });
  const [fixtureMode, setFixtureMode] = useState<"seeded" | "empty">(() => {
    if (typeof window !== "undefined") {
      const fix = new URLSearchParams(window.location.search).get("fixture");
      if (fix === "empty" || fix === "seeded") return fix;
    }
    return "seeded";
  });
  const [practiceSubTab, setPracticeSubTab] = useState<"mistakes" | "topics">("mistakes");
  const [gradesView, setGradesView] = useState<"progression" | "stats">("progression");

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
  const STITCH_SCREENS: Record<SchoolTab, { desktop: string; phone: string; title: string }> = {
    subjects: {
      desktop: "df6f5ff1789049319d12872ef39511ce",
      phone: "e61b05a925fd41ddb8afb290c6844599",
      title: "School - Subjects",
    },
    schedule: {
      desktop: "26d617feec4b4134b8c61d4c9649b096",
      phone: "f429529c39ea419aa6e1ab7d59513bed",
      title: "School - Schedule",
    },
    plan: {
      desktop: "7e42f7fd36494cd6af01cc6ffad60cf0",
      phone: "5f20509c86f5408994e8ad924e53452e",
      title: "School - Plan",
    },
    practice: {
      desktop: practiceSubTab === "mistakes" ? "4fe44b0bd94a4d7f97421041d5f562fc" : "b4b82841cc0244d6a0d91d7be3c0038f",
      phone: practiceSubTab === "mistakes" ? "fb454733c6e04212b8caa72c79fc3115" : "cb02bf83f0e24883984b8ddbba587ced",
      title: practiceSubTab === "mistakes" ? "School - Practice - Mistakes" : "School - Practice - Topics",
    },
    grades: {
      desktop: gradesView === "progression" ? "8573b4bbe75b428687866f39edf7aa65" : "7c3d9b3a097f41399570cb65d1928b40",
      phone: gradesView === "progression" ? "f8e45f3c0dc743e88d68ed0f9421b18d" : "80dea72153e446c18ea97c2b6cee88f5",
      title: gradesView === "progression" ? "School - Grades" : "School - Stats",
    },
  };

  const currentStitch = STITCH_SCREENS[activeTab];

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c28] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Dev Preview Switcher Toolbar */}
      <div className="bg-white rounded-2xl border border-[#e2e8f9] p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#151c28]">
            {isAr ? "معاينة شاشات الدراسة (School Dev Preview)" : "School Dev Preview"}
          </span>
          <span className="text-[10px] bg-[#fde7f1] text-[#9d174d] px-2 py-0.5 rounded-full font-bold">
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
            <span className="text-[#9d174d] font-bold">Stitch:</span>
            <span>{currentStitch.title}</span>
            <span className="text-[#76777b]">({currentStitch.desktop.slice(0, 8)})</span>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="bg-white rounded-[20px] border border-[#e2e8f9] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] space-y-6">
        {/* School Header Context */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#f0f3ff] text-[#45474b] text-xs font-medium">
                Academic OS
              </span>
              <span className="px-3 py-1 rounded-full bg-[#dbe1ff] text-[#003ea8] text-xs font-medium">
                {isAr ? "ترم خريف 2024" : "Fall term 2024"}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#151c28]">
              {isAr ? "الدراسة والمذاكرة" : "School"}
            </h1>
          </div>

          {/* Segmented Control Navigation */}
          <nav aria-label="School sections" className="flex items-center p-1 bg-[#f0f3ff] rounded-full overflow-x-auto">
            {(["subjects", "schedule", "plan", "practice", "grades"] as SchoolTab[]).map((tab) => {
              const labels: Record<SchoolTab, { en: string; ar: string }> = {
                subjects: { en: "Subjects", ar: "المواد" },
                schedule: { en: "Schedule", ar: "الجدول" },
                plan: { en: "Plan", ar: "الخطة والمواعيد" },
                practice: { en: "Practice", ar: "تدريب" },
                grades: { en: "Grades", ar: "الدرجات" },
              };
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#151c28] shadow-sm font-semibold"
                      : "text-[#45474b] hover:text-[#151c28]"
                  }`}
                >
                  {isAr ? labels[tab].ar : labels[tab].en}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab 1: Subjects */}
        {activeTab === "subjects" && (
          <div className="space-y-6">
            {/* Hero Study Timer Card */}
            <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-6 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-medium text-[#151c28]">
                    <Clock className="w-5 h-5 text-[#0051d5]" />
                    <span>{isAr ? "تايمر المذاكرة" : "Study timer"}</span>
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[#f0f3ff] rounded-full text-[#0051d5] text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#0051d5] animate-pulse"></span>
                    {isAr ? "جاهز للتسجيل" : "Ready to record"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#45474b] font-medium">{isAr ? "المادة" : "Subject"}</label>
                    <select className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-sm text-[#151c28] border-none outline-none">
                      <option>{isAr ? "فيزياء (PHY-201)" : "Physics (PHY-201)"}</option>
                      <option>{isAr ? "تفاضل وتكامل (MTH-102)" : "Calculus (MTH-102)"}</option>
                      <option>{isAr ? "كيمياء (CHM-110)" : "Chemistry (CHM-110)"}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#45474b] font-medium">{isAr ? "هدفك للجلسة دي" : "Goal for this session"}</label>
                    <input
                      type="text"
                      defaultValue={isEmpty ? "" : (isAr ? "حل شيت المسائل 4" : "Finish problem set 4")}
                      placeholder={isAr ? "عايز تنجز إيه في الجلسة دي؟" : "What are you focusing on?"}
                      className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-sm text-[#151c28] border-none outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button className="h-11 px-6 rounded-xl bg-[#000000] text-white text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#1a1c20] transition-colors cursor-pointer">
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isAr ? "ابدأ" : "Start"}</span>
                  </button>
                  <button className="h-11 w-11 rounded-xl bg-[#f0f3ff] text-[#45474b] hover:text-[#151c28] flex items-center justify-center transition-colors cursor-pointer">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#45474b]">
                  <span>{isAr ? "النهاردة:" : "Today:"}</span>
                  <span className="font-semibold text-[#151c28]">{isEmpty ? "0 h 0 m" : "1 h 40 m"}</span>
                </div>
              </div>
            </div>

            {/* Current Subjects Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#151c28]">{isAr ? "المواد الحالية" : "Current subjects"}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#f0f3ff] text-xs text-[#45474b]">
                    {isEmpty ? "0 active" : "3 active"}
                  </span>
                </div>
                <span className="text-xs text-[#45474b]">{isAr ? "مرتبة حسب الأولوية" : "Sorted by priority"}</span>
              </div>

              {isEmpty ? (
                <div className="rounded-[20px] bg-[#f0f3ff] border border-dashed border-[#c6c6cb] p-12 text-center space-y-3">
                  <BookOpen className="w-10 h-10 mx-auto text-[#76777b]" />
                  <p className="text-base font-medium text-[#151c28]">{isAr ? "مفيش مواد متسجلة لسه" : "No subjects enrolled yet"}</p>
                  <button className="h-10 px-5 rounded-xl bg-black text-white text-sm font-medium inline-flex items-center gap-2 shadow-sm cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>{isAr ? "ضيف أول مادة" : "Add first subject"}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Subject 1: Physics */}
                  <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-base text-[#151c28]">{isAr ? "فيزياء" : "Physics"}</h3>
                        <span className="text-xs text-[#45474b]">PHY-201 · Mechanics</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-xs font-medium">
                        {isAr ? "امتحان بعد 3 أيام" : "exam in 3 days"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs text-[#45474b]">
                        <span className="text-2xl font-bold text-[#151c28]">88%</span>
                        <span>{isAr ? "متوسط الدرجات" : "average grade"}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#f0f3ff] overflow-hidden">
                        <div className="h-full bg-[#0051d5] rounded-full" style={{ width: "88%" }}></div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#f0f3ff] flex items-center justify-between text-xs text-[#45474b]">
                      <span>{isAr ? "باب الطاقة الحركية" : "Ch. 7 Kinetic energy"}</span>
                      <span className="text-[#0051d5] font-medium flex items-center cursor-pointer">
                        {isAr ? "مراجعة" : "Review"} <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Subject 2: Calculus */}
                  <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-base text-[#151c28]">{isAr ? "تفاضل وتكامل" : "Calculus"}</h3>
                        <span className="text-xs text-[#45474b]">MTH-102 · Integration</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f0f3ff] text-[#45474b] text-xs font-medium">
                        {isAr ? "ماشي تمام" : "on track"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs text-[#45474b]">
                        <span className="text-2xl font-bold text-[#151c28]">91%</span>
                        <span>{isAr ? "متوسط الدرجات" : "average grade"}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#f0f3ff] overflow-hidden">
                        <div className="h-full bg-[#0051d5] rounded-full" style={{ width: "91%" }}></div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#f0f3ff] flex items-center justify-between text-xs text-[#45474b]">
                      <span>{isAr ? "4 من 5 فصول خلصوا" : "4 / 5 modules complete"}</span>
                      <span className="text-[#151c28] font-medium flex items-center cursor-pointer">
                        {isAr ? "تفاصيل" : "Details"} <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Add Subject Card */}
                  <button className="rounded-[20px] bg-[#f0f3ff] border border-dashed border-[#c6c6cb] p-6 flex flex-col items-center justify-center gap-2 hover:bg-[#e7eeff] transition-colors cursor-pointer text-center">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-xs">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-[#151c28]">{isAr ? "ضيف مادة جديدة" : "Add subject"}</span>
                    <span className="text-xs text-[#45474b]">{isAr ? "سجّل في مادة أو كورس جديد" : "Enroll in new course"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Schedule */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#151c28]">{isAr ? "جدول مواعيد الأسبوع" : "Weekly schedule"}</h2>
                <p className="text-xs text-[#45474b]">{isAr ? "الحصص والمحاضرات وفترات المذاكرة" : "Classes, labs, and study blocks"}</p>
              </div>
              <button className="h-9 px-4 rounded-xl bg-black text-white text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "ضيف حصة" : "Add session"}</span>
              </button>
            </div>

            {isEmpty ? (
              <div className="rounded-[20px] bg-[#f0f3ff] p-12 text-center space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-[#76777b]" />
                <p className="text-sm text-[#45474b]">{isAr ? "مفيش مواعيد متسجلة في الجدول" : "No scheduled classes or sessions yet."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {["Sun", "Mon", "Tue", "Wed", "Thu"].map((day, idx) => (
                  <div key={day} className="rounded-xl bg-[#f0f3ff] p-3 space-y-2">
                    <span className="text-xs font-bold text-[#151c28]">{day}</span>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-white border border-[#e2e8f9] shadow-xs text-xs space-y-1">
                        <span className="font-semibold block text-[#151c28]">09:00 - 10:30</span>
                        <span className="text-[#0051d5] font-medium block">Physics Lecture</span>
                        <span className="text-[#76777b] block">Hall 3</span>
                      </div>
                      {idx % 2 === 0 && (
                        <div className="p-2.5 rounded-lg bg-white border border-[#e2e8f9] shadow-xs text-xs space-y-1">
                          <span className="font-semibold block text-[#151c28]">12:00 - 13:30</span>
                          <span className="text-[#9d174d] font-medium block">Calculus Lab</span>
                          <span className="text-[#76777b] block">Lab B</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Plan */}
        {activeTab === "plan" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#151c28]">{isAr ? "الخطة ومواعيد التسليم" : "Plan & Deadlines"}</h2>
                <p className="text-xs text-[#45474b]">{isAr ? "الامتحانات، المشاريع، والتسليمات المطلوبة" : "Track exams, projects, and assignments"}</p>
              </div>
              <button className="h-9 px-4 rounded-xl bg-black text-white text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "ضيف ميعاد تسليم" : "Add deadline"}</span>
              </button>
            </div>

            {isEmpty ? (
              <div className="rounded-[20px] bg-[#f0f3ff] p-12 text-center space-y-2">
                <ListTodo className="w-8 h-8 mx-auto text-[#76777b]" />
                <p className="text-sm text-[#45474b]">{isAr ? "مفيش تسليمات أو امتحانات قادمة" : "No pending deadlines recorded."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white border border-[#e2e8f9] flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#ba1a1a]"></span>
                    <div>
                      <span className="font-semibold text-sm block text-[#151c28]">{isAr ? "ميدتيرم الفيزياء" : "Physics Midterm"}</span>
                      <span className="text-xs text-[#76777b]">{isAr ? "خلال 3 أيام · قاعة الامتحان 2" : "In 3 days · Exam Hall 2"}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold">
                    {isAr ? "عاجل" : "Urgent"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#e2e8f9] flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#0051d5]"></span>
                    <div>
                      <span className="font-semibold text-sm block text-[#151c28]">{isAr ? "تسليم بحث التفاضل" : "Calculus Problem Set 4"}</span>
                      <span className="text-xs text-[#76777b]">{isAr ? "الخميس الجاي" : "Next Thursday"}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#dbe1ff] text-[#003ea8] text-xs font-bold">
                    {isAr ? "الأسبوع ده" : "This week"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Practice */}
        {activeTab === "practice" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#151c28]">{isAr ? "تدريب ومراجعة متباعدة" : "Practice & Retrieval"}</h2>
                <p className="text-xs text-[#45474b]">{isAr ? "تصحيح الغلطات وتقييم استيعاب مواضيع المنهج" : "Mistake redo queue and spaced topic ratings"}</p>
              </div>

              {/* Sub-tab pills */}
              <div className="flex items-center bg-[#f0f3ff] rounded-full p-1 border border-[#e2e8f9]">
                <button
                  onClick={() => setPracticeSubTab("mistakes")}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                    practiceSubTab === "mistakes" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#76777b]"
                  }`}
                >
                  {isAr ? "الغلطات" : "Mistakes"}
                </button>
                <button
                  onClick={() => setPracticeSubTab("topics")}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                    practiceSubTab === "topics" ? "bg-white font-bold shadow-xs text-[#151c28]" : "text-[#76777b]"
                  }`}
                >
                  {isAr ? "المواضيع" : "Topics"}
                </button>
              </div>
            </div>

            {practiceSubTab === "mistakes" ? (
              isEmpty ? (
                <div className="rounded-[20px] bg-[#f0f3ff] p-12 text-center text-sm text-[#45474b]">
                  {isAr ? "طابور الغلطات فاضي، مفيش مسائل محتاجة حل تاني!" : "Mistake queue is clear. No overdue mistakes."}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white border border-[#e2e8f9] flex items-center justify-between shadow-xs">
                    <div>
                      <span className="font-semibold text-sm block text-[#151c28]">Faraday Induction Law Sign Convention</span>
                      <span className="text-xs text-[#76777b]">{isAr ? "فيزياء · غلطة إشارة في اشتقاق لينز" : "Physics · Sign flip in Lenz derivation"}</span>
                    </div>
                    <button className="h-8 px-4 rounded-lg bg-black text-white text-xs font-medium shadow-xs cursor-pointer">
                      {isAr ? "حل الغلطة تاني" : "Redo mistake"}
                    </button>
                  </div>
                </div>
              )
            ) : (
              isEmpty ? (
                <div className="rounded-[20px] bg-[#f0f3ff] p-12 text-center text-sm text-[#45474b]">
                  {isAr ? "مفيش مواضيع مضافة للمنهج لسه" : "No topics logged yet."}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white border border-[#e2e8f9] flex items-center justify-between shadow-xs">
                    <div>
                      <span className="font-semibold text-sm block text-[#151c28]">Integration by Parts</span>
                      <span className="text-xs text-[#76777b]">{isAr ? "تفاضل وتكامل · مستوى الاستيعاب 4 من 5" : "Calculus · Confidence 4 of 5"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-xs px-2 py-0.5 rounded cursor-pointer ${star === 4 ? "bg-black text-white font-bold" : "bg-[#f0f3ff] text-[#45474b]"}`}>
                          {star}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Tab 5: Grades */}
        {activeTab === "grades" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-[#45474b]">
                    <span>{isAr ? "كل المواد" : "All subjects"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="px-2 py-0.5 rounded-full bg-[#fde7f1] text-[#9d174d] font-semibold">PHY-201</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-[#151c28]">{isAr ? "فيزياء" : "Physics"}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGradesView(gradesView === "progression" ? "stats" : "progression")}
                  className="h-10 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] text-xs font-medium flex items-center gap-1.5 hover:bg-[#e7eeff] transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-[#0051d5]" />
                  <span>{gradesView === "progression" ? (isAr ? "إحصائيات المذاكرة (من تسجيلك)" : "Study stats (from your log)") : (isAr ? "مسار الدرجات" : "Grade progression")}</span>
                </button>
                <button className="h-10 px-4 rounded-xl bg-black text-white text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? "سجّل درجة" : "Log grade"}</span>
                </button>
              </div>
            </div>

            {gradesView === "progression" ? (
              <div className="space-y-6">
                {/* Bento metrics row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Average (unweighted) */}
                  <div className="p-5 rounded-xl bg-white border border-[#e2e8f9] shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#45474b]">
                      <span className="font-medium">{isAr ? "متوسط الدرجات (مش موزون)" : "Average (unweighted)"}</span>
                      <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#151c28]">{isEmpty ? "—" : "88%"}</span>
                      <span className="text-xs text-[#76777b]">{isEmpty ? "0 items" : (isAr ? "من واقع 3 تقييمات" : "across 3 recorded items")}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#f0f3ff] overflow-hidden">
                      <div className="h-full bg-[#0051d5] rounded-full" style={{ width: isEmpty ? "0%" : "88%" }}></div>
                    </div>
                  </div>

                  {/* Card 2: Target */}
                  <div className="p-5 rounded-xl bg-white border border-[#e2e8f9] shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#45474b]">
                      <span className="font-medium">{isAr ? "الهدف" : "Target"}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f0f3ff] text-xs font-semibold text-[#151c28]">
                        {isEmpty ? "—" : (isAr ? "باقي 2% للهدف" : "2% to goal")}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#151c28]">90%</span>
                      <span className="text-xs text-[#76777b]">{isAr ? "هدف الترم" : "semester objective"}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#f0f3ff] overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: "90%" }}></div>
                    </div>
                  </div>

                  {/* Card 3: Performance split (Quizzes vs Big exams) */}
                  <div className="p-5 rounded-xl bg-white border border-[#e2e8f9] shadow-xs space-y-2">
                    <span className="text-xs font-medium text-[#45474b] block">{isAr ? "توزيع الأداء" : "Performance split"}</span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9d174d] font-medium">{isAr ? "كويزات" : "Quizzes"}</span>
                      <span className="font-bold text-[#151c28]">{isEmpty ? "—" : "91%"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#25005a] font-medium">{isAr ? "امتحانات كبيرة" : "Big exams"}</span>
                      <span className="font-bold text-[#151c28]">{isEmpty ? "—" : "82%"}</span>
                    </div>
                  </div>
                </div>

                {/* Grade History entries */}
                <div className="rounded-xl border border-[#e2e8f9] overflow-hidden">
                  <div className="p-4 bg-[#f0f3ff] border-b border-[#e2e8f9] flex items-center justify-between text-xs font-semibold text-[#151c28]">
                    <span>{isAr ? "سجل الدرجات" : "Grade History"}</span>
                    <span className="text-[#76777b]">{isEmpty ? "0 items" : "3 items"}</span>
                  </div>
                  {isEmpty ? (
                    <div className="p-8 text-center text-xs text-[#76777b]">{isAr ? "مفيش درجات مسجلة لسه" : "No grades logged yet."}</div>
                  ) : (
                    <div className="divide-y divide-[#f0f3ff]">
                      <div className="p-4 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold block text-[#151c28]">{isAr ? "ميكانيكا كويز 1" : "Mechanics Quiz"}</span>
                          <span className="text-xs text-[#76777b]">{isAr ? "كويز" : "Quiz"}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#151c28] block">85%</span>
                          <span className="text-xs text-[#76777b]">17 / 20</span>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold block text-[#151c28]">{isAr ? "امتحان الميدتيرم" : "Midterm"}</span>
                          <span className="text-xs text-[#76777b]">{isAr ? "امتحان كبير" : "Big exam"}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#151c28] block">78%</span>
                          <span className="text-xs text-[#76777b]">78 / 100</span>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold block text-[#151c28]">{isAr ? "كويز الموجات" : "Waves Quiz"}</span>
                          <span className="text-xs text-[#76777b]">{isAr ? "كويز" : "Quiz"}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#0051d5] block">95%</span>
                          <span className="text-xs text-[#76777b]">19 / 20</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Study Stats Sub-view (Reachable from Grades) */
              <div className="space-y-4 p-5 rounded-xl bg-[#f0f3ff] border border-[#e2e8f9]">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-[#151c28]">{isAr ? "إحصائيات المذاكرة (من تسجيلك)" : "Study stats (from your log)"}</h3>
                  <span className="text-xs text-[#76777b]">{isAr ? "خريطة نشاط لـ 12 أسبوع" : "12-week study heatmap"}</span>
                </div>
                <div className="grid grid-cols-12 gap-1.5 p-4 rounded-xl bg-white border border-[#e2e8f9]">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-4 rounded-xs ${
                        isEmpty || i % 3 === 0 ? "bg-[#f0f3ff]" : i % 2 === 0 ? "bg-[#b4c5ff]" : "bg-[#0051d5]"
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
