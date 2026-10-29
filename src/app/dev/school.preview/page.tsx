"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  SubjectItem,
  GradeItem,
  DeadlineItem,
  MistakeItem,
  AcademicTopicItem,
  ScheduleItem,
  FocusSessionTelemetry,
  generate12WeekStudyHeatmap,
  generateAcademicInsights,
} from "@/lib/school";
import { TimetableGrid } from "@/components/school/TimetableGrid";
import { MistakesTab } from "@/components/school/MistakesTab";
import { TopicsTab } from "@/components/school/TopicsTab";
import { GradeTrendChart } from "@/components/school/GradeTrendChart";
import { StudyAnalyticsTab } from "@/components/school/StudyAnalyticsTab";
import { WeeklyTargetCard } from "@/components/school/WeeklyTargetCard";

type SchoolTab = "subjects" | "schedule" | "plan" | "practice" | "grades";

// Seeded Fixtures
const SEEDED_SUBJECTS: SubjectItem[] = [
  { id: "s1", user_id: "u1", name: "Physics", code: "PHY-201", color: "#0051d5", target_grade: 90, created_at: "2026-09-01T00:00:00Z" },
  { id: "s2", user_id: "u1", name: "Calculus", code: "MTH-102", color: "#316bf3", target_grade: 90, created_at: "2026-09-01T00:00:00Z" },
  { id: "s3", user_id: "u1", name: "Chemistry", code: "CHM-110", color: "#7c3aed", target_grade: 85, created_at: "2026-09-01T00:00:00Z" },
];

const SEEDED_GRADES: GradeItem[] = [
  { id: "g1", user_id: "u1", subject_id: "s1", title: "Mechanics Quiz", mark_achieved: 17, mark_total: 20, type: "quiz", entry_date: "2026-10-10", created_at: "2026-10-10T00:00:00Z" },
  { id: "g2", user_id: "u1", subject_id: "s1", title: "Midterm Exam", mark_achieved: 78, mark_total: 100, type: "big_exam", entry_date: "2026-10-18", created_at: "2026-10-18T00:00:00Z" },
  { id: "g3", user_id: "u1", subject_id: "s1", title: "Waves Quiz", mark_achieved: 19, mark_total: 20, type: "quiz", entry_date: "2026-10-24", created_at: "2026-10-24T00:00:00Z" },
];

const SEEDED_DEADLINES: DeadlineItem[] = [
  { id: "d1", user_id: "u1", subject_id: "s1", title: "Physics Midterm Exam", type: "exam", due_date: "2026-10-31T23:59:59.999Z", priority: "high", completed: false, created_at: "2026-10-01T00:00:00Z" },
  { id: "d2", user_id: "u1", subject_id: "s2", title: "Calculus Problem Set 4", type: "assignment", due_date: "2026-11-05T23:59:59.999Z", priority: "medium", completed: false, created_at: "2026-10-01T00:00:00Z" },
];

const SEEDED_MISTAKES: MistakeItem[] = [
  {
    id: "m1",
    user_id: "u1",
    subject_id: "s1",
    topic: "Lenz Law Sign Convention",
    question_context: "Faraday induced flux calculation problem 4",
    error_made: "Negative sign omitted during Faraday induced flux calculation",
    correct_solution: "Apply Lenz law direction: emf = - dPhi/dt",
    cause: "concept",
    resolved: false,
    redo_at: "2026-10-29T23:59:59.999Z",
    redo_history: [],
    created_at: "2026-10-20T00:00:00Z",
  },
];

const SEEDED_TOPICS: AcademicTopicItem[] = [
  {
    id: "t1",
    user_id: "u1",
    subject_id: "s2",
    name: "Integration by Parts",
    confidence: 4,
    review_count: 2,
    next_review_at: "2026-11-02T23:59:59.999Z",
    review_history: [],
    created_at: "2026-10-15T00:00:00Z",
  },
];

const SEEDED_SCHEDULE: ScheduleItem[] = [
  { id: "sc1", user_id: "u1", subject_id: "s1", day_of_week: 1, start_time: "09:00", end_time: "10:30", session_type: "lecture", location: "Hall 3", created_at: "2026-09-01T00:00:00Z" },
  { id: "sc2", user_id: "u1", subject_id: "s2", day_of_week: 1, start_time: "12:00", end_time: "13:30", session_type: "lab", location: "Lab B", created_at: "2026-09-01T00:00:00Z" },
];

const SEEDED_SESSIONS: FocusSessionTelemetry[] = [
  { id: "fs1", subject_id: "s1", started_at: "2026-10-28T09:00:00Z", actual_minutes: 50, status: "completed" },
  { id: "fs2", subject_id: "s2", started_at: "2026-10-28T14:00:00Z", actual_minutes: 40, status: "completed" },
];

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

  // Injected Fixture Data Sets
  const subjects = isEmpty ? [] : SEEDED_SUBJECTS;
  const grades = isEmpty ? [] : SEEDED_GRADES;
  const deadlines = isEmpty ? [] : SEEDED_DEADLINES;
  const mistakes = isEmpty ? [] : SEEDED_MISTAKES;
  const topics = isEmpty ? [] : SEEDED_TOPICS;
  const schedule = isEmpty ? [] : SEEDED_SCHEDULE;
  const sessions = isEmpty ? [] : SEEDED_SESSIONS;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c28] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Dev Preview Switcher Toolbar */}
      <div className="bg-white rounded-2xl border border-[#e2e8f9] p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#151c28]">
            {isAr ? "معاينة شاشات الدراسة (School Dev Preview)" : "School Dev Preview"}
          </span>
          <span className="text-[10px] bg-[#fde7f1] text-[#9d174d] px-2 py-0.5 rounded-full font-bold">
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
        {/* Header Section */}
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

          {/* Navigation */}
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

        {/* Real Injected Component Renders */}
        {activeTab === "subjects" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#151c28]">{isAr ? "المواد المسجلة" : "Enrolled Subjects"}</h2>
            {subjects.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#45474b] bg-[#f0f3ff] rounded-xl">
                {isAr ? "مفيش مواد متسجلة لسه" : "No subjects enrolled yet"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjects.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl border border-[#e2e8f9] bg-[#f0f3ff] space-y-2">
                    <span className="font-bold text-sm block text-[#151c28]">{s.name} ({s.code})</span>
                    <span className="text-xs text-[#45474b] block">Target: {s.target_grade}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-4">
            <TimetableGrid
              schedule={schedule}
              subjects={subjects}
              onAddSession={async () => {}}
              onEditSession={async () => {}}
              onDeleteSession={() => {}}
            />
          </div>
        )}

        {activeTab === "plan" && (
          <div className="space-y-6">
            <WeeklyTargetCard
              weeklyTargetMinutes={isEmpty ? null : 600}
              completedMinutes={isEmpty ? 0 : 360}
              onUpdateTarget={async () => {}}
            />
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#151c28]">{isAr ? "المواعيد والتسليمات" : "Deadlines"}</h3>
              {deadlines.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#45474b] bg-[#f0f3ff] rounded-xl">
                  {isAr ? "مفيش تسليمات حالية" : "No pending deadlines"}
                </div>
              ) : (
                deadlines.map((d) => (
                  <div key={d.id} className="p-3.5 rounded-xl border border-[#e2e8f9] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#151c28]">{d.title}</span>
                    <span className="text-xs text-[#45474b]">{d.due_date}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "practice" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e2e8f9] pb-3">
              <button
                onClick={() => setPracticeSubTab("mistakes")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  practiceSubTab === "mistakes" ? "bg-black text-white" : "bg-[#f0f3ff] text-[#45474b]"
                }`}
              >
                {isAr ? "الغلطات" : "Mistakes"}
              </button>
              <button
                onClick={() => setPracticeSubTab("topics")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  practiceSubTab === "topics" ? "bg-black text-white" : "bg-[#f0f3ff] text-[#45474b]"
                }`}
              >
                {isAr ? "المواضيع" : "Topics"}
              </button>
            </div>
            {practiceSubTab === "mistakes" ? (
              <MistakesTab
                mistakes={mistakes}
                subjects={subjects}
                onOpenAddModal={() => {}}
                onOpenEditModal={() => {}}
                onOpenRedoModal={() => {}}
                onDeleteMistake={() => {}}
              />
            ) : (
              <TopicsTab
                topics={topics}
                subjects={subjects}
                onOpenAddModal={() => {}}
                onOpenBulkModal={() => {}}
                onOpenEditModal={() => {}}
                onQuickReview={async () => {}}
                onDeleteTopic={() => {}}
              />
            )}
          </div>
        )}

        {activeTab === "grades" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGradesView("progression")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    gradesView === "progression" ? "bg-black text-white" : "bg-[#f0f3ff] text-[#45474b]"
                  }`}
                >
                  {isAr ? "مسار الدرجات" : "Grade progression"}
                </button>
                <button
                  onClick={() => setGradesView("stats")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    gradesView === "stats" ? "bg-black text-white" : "bg-[#f0f3ff] text-[#45474b]"
                  }`}
                >
                  {isAr ? "إحصائيات المذاكرة (من تسجيلك)" : "Study stats (from your log)"}
                </button>
              </div>
            </div>

            {gradesView === "progression" ? (
              <GradeTrendChart
                grades={grades}
                targetGrade={90}
                subjectColor="#0051d5"
              />
            ) : (
              <StudyAnalyticsTab
                sessions={sessions}
                subjects={subjects}
                weeklyTargetMinutes={600}
                heatmapData={generate12WeekStudyHeatmap(sessions, 600)}
                insights={generateAcademicInsights({ subjects, grades, deadlines, topics, sessions })}
                onUpdateTarget={async () => {}}
                onNavigateTab={() => {}}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
