"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Weight,
  Search,
  Bell,
  Plus,
} from "lucide-react";
import { RingResult, RecommendationOutput, PriorityItem, CircadianPhase } from "@/lib/today";
import { RecommendationCard } from "@/components/today/RecommendationCard";
import { TodayProgressCard } from "@/components/today/TodayProgressCard";
import { TodayFocusCard } from "@/components/today/TodayFocusCard";
import { TodayNextUpCard } from "@/components/today/TodayNextUpCard";
import { TodayActivityChartCard } from "@/components/today/TodayActivityChartCard";
import { TodaySubjectsCard } from "@/components/today/TodaySubjectsCard";
import { TodayPlanGrid } from "@/components/today/TodayPlanGrid";
import { CircadianTimelineCard } from "@/components/today/CircadianTimelineCard";
import { PrioritiesCard } from "@/components/today/PrioritiesCard";
import { FinishSetupCard, EndOfDayRecapCard } from "@/components/today/TodayPillarCards";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function DevTodayPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const { locale, setLocale } = useI18n();
  const [fixtureMode, setFixtureMode] = useState<"seeded" | "empty">(() => {
    if (typeof window !== "undefined") {
      const fix = new URLSearchParams(window.location.search).get("fixture");
      if (fix === "empty" || fix === "seeded") return fix;
    }
    return "seeded";
  });
  const [hideControls] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("hideControls") === "1" || p.get("hideBar") === "1") return true;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const l = new URLSearchParams(window.location.search).get("lang") || new URLSearchParams(window.location.search).get("locale");
      if (l === "ar" || l === "en") {
        setLocale(l);
      }
    }
  }, [setLocale]);

  const isAr = locale === "ar";

  // =========================================================================
  // FIXTURE DATA: Seeded Account (Matching Stitch Today Screen)
  // =========================================================================
  const seededBodyRing: RingResult = {
    domain: "body",
    label: "Body",
    colorHex: "#2563EB",
    ringPercent: 67,
    status: "active",
    displayText: "2 of 3",
    completedCount: 2,
    totalPlannedCount: 3,
    deltaVsYesterday: 12,
    components: [
      { name: "Push Day Workout", plannedText: "Push Day", doneText: "Logged 55m", percent: 100, status: "active", weight: 40 },
      { name: "Sleep Target", plannedText: "8.0h", doneText: "7.5h", percent: 94, status: "active", weight: 35 },
      { name: "Water Intake", plannedText: "3000ml", doneText: "1800ml", percent: 60, status: "active", weight: 25 },
    ],
  };

  const seededMindRing: RingResult = {
    domain: "mind",
    label: "Mind",
    colorHex: "#7C3AED",
    ringPercent: 50,
    status: "active",
    displayText: "1 of 2",
    completedCount: 1,
    totalPlannedCount: 2,
    deltaVsYesterday: -5,
    components: [
      { name: "Focus Goal", plannedText: "120m", doneText: "85m", percent: 71, status: "active", weight: 60 },
      { name: "Midday Check-in", plannedText: "1 check-in", doneText: "Pending", percent: 0, status: "active", weight: 40 },
    ],
  };

  const seededSchoolRing: RingResult = {
    domain: "school",
    label: "School",
    colorHex: "#DB2777",
    ringPercent: 0,
    status: "active",
    displayText: "0 of 1",
    completedCount: 0,
    totalPlannedCount: 1,
    deltaVsYesterday: null,
    components: [
      { name: "Deadlines Due Today", plannedText: "Physics Set", doneText: "Not done", percent: 0, status: "active", weight: 100 },
    ],
  };

  const seededRecommendation: RecommendationOutput = {
    headline: isAr
      ? "نمت ٧.٥ ساعات. النهاردة تمرين دفع: بنش وبريس."
      : "You slept 7.5 hours. Today is push day: bench and overhead press.",
    categoryBadge: "Session Prep",
    accentColor: "#2563EB",
    reasoning: {
      sleepText: isAr ? "نوم الليلة ٧.٥ ساعة بمتوسط ٧.٤ ساعة." : "7.5h slept vs 7.4h 7-day average. Well rested.",
      loadText: isAr ? "استشفاء كامل بعد راحة ٤٨ ساعة." : "Full 48-hour recovery since previous pull session.",
      screenTimeText: isAr ? "استخدام الشاشة طبيعي قبل النوم." : "Screen time below 45m threshold prior to bed.",
      examText: isAr ? "امتحان فيزياء بعد ٣ أيام." : "Physics exam in 3 days. Morning study block suggested.",
    },
  };

  const seededPriorities: PriorityItem[] = [
    {
      id: "p1",
      priority_date: "2026-10-27",
      title: isAr ? "تمرين الدفع الأساسي في الجيم" : "Push day resistance training",
      source: "workout_plan",
      estimate_minutes: 60,
      sort_order: 0,
      completed: true,
      auto_completed: true,
    },
    {
      id: "p2",
      priority_date: "2026-10-27",
      title: isAr ? "مذاكرة فيزياء الشابتر الرابع" : "Study Physics chapter 4 (Mechanics)",
      source: "study_goal",
      estimate_minutes: 50,
      sort_order: 1,
      completed: false,
      auto_completed: false,
    },
    {
      id: "p3",
      priority_date: "2026-10-27",
      title: isAr ? "قراءة ٢٠ صفحة من كتاب Deep Work" : "Read 20 pages of Deep Work",
      source: "custom",
      estimate_minutes: 30,
      sort_order: 2,
      completed: false,
      auto_completed: false,
    },
  ];

  const seededCircadianPhases: CircadianPhase[] = [
    {
      id: "phase-1",
      label: "Morning Awakening",
      startTime: "07:00",
      endTime: "09:00",
      isActive: false,
      events: [{ title: "Morning Hydration", source: "wake", isCompleted: true }],
    },
    {
      id: "phase-2",
      label: "Deep Work Sprint",
      startTime: "09:30",
      endTime: "12:00",
      isActive: false,
      events: [{ title: "Physics Mechanics Sprint", source: "focus", isCompleted: true }],
    },
    {
      id: "phase-3",
      label: "Resistance Training Block",
      startTime: "17:30",
      endTime: "19:00",
      isActive: true,
      events: [{ title: "Push Day Session", detail: "Bench & Overhead Press", source: "workout", isCompleted: false }],
    },
    {
      id: "phase-4",
      label: "Evening Wind-Down",
      startTime: "21:30",
      endTime: "23:00",
      isActive: false,
      events: [{ title: "Reading Deep Work", source: "sleep", isCompleted: false }],
    },
  ];

  // =========================================================================
  // FIXTURE DATA: Brand-New Empty Account (Zero Data / Fresh State)
  // =========================================================================
  const emptyBodyRing: RingResult = {
    domain: "body",
    label: "Body",
    colorHex: "#2563EB",
    ringPercent: null,
    status: "not_set_up",
    displayText: "0 of 3",
    completedCount: 0,
    totalPlannedCount: 3,
    deltaVsYesterday: null,
    components: [
      { name: "Workout Split", plannedText: "Not set", doneText: "No split set", percent: null, status: "not_set_up", weight: 40 },
      { name: "Sleep Target", plannedText: "Not set", doneText: "No sleep target", percent: null, status: "not_set_up", weight: 35 },
      { name: "Nutrition Target", plannedText: "Not set", doneText: "No calorie target", percent: null, status: "not_set_up", weight: 25 },
    ],
  };

  const emptyMindRing: RingResult = {
    domain: "mind",
    label: "Mind",
    colorHex: "#7C3AED",
    ringPercent: null,
    status: "not_set_up",
    displayText: "0 of 2",
    completedCount: 0,
    totalPlannedCount: 2,
    deltaVsYesterday: null,
    components: [
      { name: "Focus Goal", plannedText: "Not set", doneText: "No daily goal", percent: null, status: "not_set_up", weight: 60 },
      { name: "Daily Habits", plannedText: "Not set", doneText: "No habits tracked", percent: null, status: "not_set_up", weight: 40 },
    ],
  };

  const emptySchoolRing: RingResult = {
    domain: "school",
    label: "School",
    colorHex: "#DB2777",
    ringPercent: null,
    status: "not_set_up",
    displayText: "0 of 1",
    completedCount: 0,
    totalPlannedCount: 1,
    deltaVsYesterday: null,
    components: [
      { name: "Deadlines Due Today", plannedText: "None due", doneText: "No subjects added", percent: null, status: "not_set_up", weight: 100 },
    ],
  };

  const emptyRecommendation: RecommendationOutput = {
    headline: isAr
      ? "أهلاً بيك في Life! ظبط أهدافك عشان تبدأ تشوف اقتراحات دقيقة كل يوم."
      : "Welcome to Life! Finish configuring your targets to unlock deterministic daily recommendations.",
    categoryBadge: "Baseline Calibrating",
    accentColor: "#2563EB",
    reasoning: {
      sleepText: isAr ? "لسه مفيش بيانات نوم مسجلة." : "No sleep telemetry logged yet. Calibrating baseline.",
      loadText: isAr ? "حدد جدول تمرينك من قسم الجسم." : "Set your workout split in Body to plan recovery.",
      screenTimeText: isAr ? "مفيش بيانات وقت شاشة." : "Screen time tracking inactive.",
      examText: isAr ? "أضف موادك الدراسية ومواعيد الامتحانات." : "Add active subjects to track deadlines.",
    },
  };

  const emptyCircadianPhases: CircadianPhase[] = [
    {
      id: "phase-empty-1",
      label: "Awakening",
      startTime: "07:00",
      endTime: "09:00",
      isActive: false,
      events: [{ title: "Hydration", source: "wake" }],
    },
    {
      id: "phase-empty-2",
      label: "Active Day",
      startTime: "09:00",
      endTime: "18:00",
      isActive: true,
      events: [{ title: "Set Daily Goals", source: "focus" }],
    },
    {
      id: "phase-empty-3",
      label: "Evening Rest",
      startTime: "18:00",
      endTime: "23:00",
      isActive: false,
      events: [{ title: "Rest & Sleep Prep", source: "sleep" }],
    },
  ];

  // Active data based on fixture toggle
  const isSeeded = fixtureMode === "seeded";
  const bodyRing = isSeeded ? seededBodyRing : emptyBodyRing;
  const mindRing = isSeeded ? seededMindRing : emptyMindRing;
  const schoolRing = isSeeded ? seededSchoolRing : emptySchoolRing;
  const recommendation = isSeeded ? seededRecommendation : emptyRecommendation;
  const [priorities, setPriorities] = useState<PriorityItem[]>(() => isSeeded ? seededPriorities : []);
  React.useEffect(() => {
    setPriorities(isSeeded ? seededPriorities : []);
  }, [isSeeded]);
  const circadianPhases = isSeeded ? seededCircadianPhases : emptyCircadianPhases;

  return (
    <div className={`min-h-screen bg-[#F9F9FF] text-[#14161A] font-sans ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Dev Fixture Bar (Sticky Controls) */}
      {!hideControls && (
        <div className="bg-[#14161A] text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 z-50 sticky top-0">
          <div className="flex items-center gap-2">
            <span className="font-medium uppercase tracking-wider text-white/70">Stage A Verification Fixture</span>
            <span className="px-2 py-0.5 rounded bg-white/20 text-white font-mono">
              {fixtureMode === "seeded" ? "Seeded Account (With Data)" : "Empty Account (New User)"}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#2563EB] text-white font-mono uppercase">
              {locale}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFixtureMode(fixtureMode === "seeded" ? "empty" : "seeded")}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              Switch to {fixtureMode === "seeded" ? "Empty Account" : "Seeded Account"}
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "ar" : "en")}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              Switch to {locale === "en" ? "العامية المصرية (RTL)" : "English (LTR)"}
            </button>
          </div>
        </div>
      )}

      {/* Stitch Standard Navigation Bar */}
      <header className={`sticky ${hideControls ? "top-0" : "top-8"} z-40 bg-white/90 backdrop-blur-xl border-b border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.06)]`}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="text-[20px] font-medium tracking-tight text-[#14161A] select-none">
              Life
            </span>
            <nav className="hidden nav-desktop-pill md:flex items-center bg-[#F0F3FF] p-1 rounded-full">
              <Link
                href="/dev/today"
                className="px-4 py-1.5 rounded-full text-[14px] font-medium bg-[#14161A] text-white shadow-sm"
              >
                {isAr ? "النهاردة" : "Today"}
              </Link>
              <Link
                href="/body"
                className="px-4 py-1.5 rounded-full text-[14px] font-medium text-[#5B6270] hover:text-[#14161A] transition-colors"
              >
                {isAr ? "الجسم" : "Body"}
              </Link>
              <Link
                href="/mind"
                className="px-4 py-1.5 rounded-full text-[14px] font-medium text-[#5B6270] hover:text-[#14161A] transition-colors"
              >
                {isAr ? "العقل" : "Mind"}
              </Link>
              <Link
                href="/school"
                className="px-4 py-1.5 rounded-full text-[14px] font-medium text-[#5B6270] hover:text-[#14161A] transition-colors"
              >
                {isAr ? "الدراسة" : "School"}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:flex items-center">
              <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 text-[#76777B] pointer-events-none" />
              <input
                type="text"
                readOnly
                placeholder={isAr ? "بحث..." : "Search habits, logs..."}
                className="w-52 h-10 pl-9 pr-3 rtl:pr-9 rtl:pl-3 rounded-xl bg-white border border-[#E3E5F0] text-[14px] placeholder:text-[#76777B] focus:outline-none shadow-sm"
              />
            </div>
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-white border border-[#E3E5F0] flex items-center justify-center text-[#5B6270] hover:text-[#14161A] transition-colors shadow-sm cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 bg-[#14161A] text-white px-4 py-2 rounded-xl text-[14px] font-medium shadow-md hover:bg-[#23272F] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة سريعة" : "Quick add"}</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-[#DBE1FF] text-[#00174B] font-medium text-[14px] flex items-center justify-center select-none">
              Z
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* 1. Page Header (Greeting + Honest Recommendation + Why This?) */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
          <RecommendationCard
            recommendation={recommendation}
            greeting={isSeeded
              ? (isAr ? "صباح الخير يا زياد" : "Good morning, Ziad")
              : (isAr ? "أهلاً بيك" : "Welcome")}
          />

          <div className="flex items-center gap-3 shrink-0">
            {isSeeded && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E6EEFF] border border-[#2563EB]/20 text-xs font-medium text-[#1E3A9E]">
                <Weight className="w-3.5 h-3.5" />
                <span>78.5 {isAr ? "كيلو" : "kg"}</span>
              </div>
            )}

            <button
              type="button"
              className="px-5 py-2.5 rounded-[12px] bg-white border border-[#E3E5F0] text-[#14161A] text-[14px] font-medium shadow-sm hover:bg-[#F3F4FB] transition-colors"
            >
              {isAr ? "تعديل الواجهة" : "Customize"}
            </button>
          </div>
        </section>

        {/* 2. 3-Column Primary Grid matching Stitch Desktop */}
        <section className="grid grid-cols-1 today-3col-grid gap-6 items-start">
          {/* Left Column: Focus Today Card + Next Up Card */}
          <div className="flex flex-col gap-6 min-w-0">
            <TodayFocusCard
              todayFocusMinutes={isSeeded ? 85 : 0}
              dailyFocusGoalMinutes={isSeeded ? 120 : null}
            />
            <TodayNextUpCard
              nearestDeadline={isSeeded ? { id: "d1", title: "Physics assignment", type: "assignment", dueDate: "2026-10-30" } : null}
              nearestExam={isSeeded ? { title: "Physics exam", daysRemaining: 3 } : null}
              plannedWorkoutSession={isSeeded ? "Push day" : null}
              hasLoggedWorkoutToday={false}
              hadPlannedItems={isSeeded}
              allPlannedItemsDone={false}
            />
          </div>

          {/* Center Column: 7-Day Histogram Chart */}
          <div className="flex flex-col min-w-0">
            <TodayActivityChartCard
              userId={isSeeded ? "fixture-seeded" : "fixture-empty"}
              userTimezone="Africa/Cairo"
            />
          </div>

          {/* Right Column: Today's Progress Card + Subjects Card */}
          <div className="flex flex-col gap-6 min-w-0">
            <TodayProgressCard
              bodyRing={bodyRing}
              mindRing={mindRing}
              schoolRing={schoolRing}
              isBodyActive={true}
              isMindActive={true}
              isSchoolActive={true}
            />
            <TodaySubjectsCard userId={isSeeded ? "fixture-seeded" : "fixture-empty"} />
          </div>
        </section>

        {/* 3. Bottom Row: Today's Plan 4-Card Grid */}
        <TodayPlanGrid
          plannedWorkoutSession={isSeeded ? "Push day" : null}
          nearestDeadlineTitle={isSeeded ? "Study Physics chapter 4" : null}
          todayFocusMinutes={isSeeded ? 85 : 0}
          priorities={priorities}
          onAddPlanClick={() => {
            const btn = document.querySelector<HTMLButtonElement>("#priorities-section button");
            if (btn) {
              btn.click();
              setTimeout(() => {
                const input = document.querySelector<HTMLInputElement>("input[placeholder*='Bench press'], input[placeholder*='مراجعة فيزياء']");
                if (input) {
                  input.focus();
                  if (!input.value.trim()) {
                    const defaultText = isAr ? "جلسة تمرين بنش وتطوير القوة" : "Bench press progression session";
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                    setter?.call(input, defaultText);
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.select();
                  }
                }
              }, 50);
            }
          }}
          onViewAllClick={() => {
            const el = document.getElementById("timeline-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* 4. Circadian Day Timeline */}
        <div id="timeline-section">
          <CircadianTimelineCard phases={circadianPhases} />
        </div>

        {/* 5. Priorities List with Carry-over, Add, Delete, and Reorder */}
        <div id="priorities-section">
          <PrioritiesCard
            priorities={priorities}
            todayDateStr="2026-10-27"
            tomorrowDateStr="2026-10-28"
            onPrioritiesChange={setPriorities}
            userId={null}
          />
        </div>

        {/* 6. Finish Setup Card (Empty Account) */}
        {!isSeeded && (
          <FinishSetupCard missingTargets={["Calorie target", "Sleep target", "Focus sprint goal"]} />
        )}

        {/* 7. End-of-Day Execution Recap */}
        <EndOfDayRecapCard
          completedCount={isSeeded ? 1 : 0}
          totalCount={priorities.length}
          onCarryOver={() => {}}
        />
      </main>

      {/* Stitch Footer */}
      <footer className="w-full border-t border-[#E3E5F0] py-8 mt-12 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B6270]">
          <span>Life Habit Operating System</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#14161A] transition-colors">{isAr ? "الخصوصية" : "Privacy"}</Link>
            <Link href="/terms" className="hover:text-[#14161A] transition-colors">{isAr ? "الشروط" : "Terms"}</Link>
            <Link href="/settings" className="hover:text-[#14161A] transition-colors">{isAr ? "الإعدادات" : "Settings"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
