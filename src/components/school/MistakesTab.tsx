"use client";

import React, { useState, useMemo } from "react";
import {
  MistakeItem,
  SubjectItem,
  MistakeCause,
  calculateMistakeStats,
} from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  BookX,
  Plus,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  Check,
  Edit2,
  Trash2,
  HelpCircle,
  Sparkles,
  Calendar,
} from "lucide-react";

interface MistakesTabProps {
  mistakes: MistakeItem[];
  subjects: SubjectItem[];
  onOpenAddModal: () => void;
  onOpenEditModal: (mistake: MistakeItem) => void;
  onOpenRedoModal: (mistake: MistakeItem) => void;
  onDeleteMistake: (mistakeId: string) => void;
}

type StatusFilter = "all" | "due_today" | "open" | "resolved";

export function MistakesTab({
  mistakes,
  subjects,
  onOpenAddModal,
  onOpenEditModal,
  onOpenRedoModal,
  onDeleteMistake,
}: MistakesTabProps) {
  const { locale } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [selectedCause, setSelectedCause] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");

  const nowMs = Date.now();
  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  const stats = useMemo(() => calculateMistakeStats(mistakes), [mistakes]);

  // Due today items: redo_at <= now OR not resolved (excluding archived subjects)
  const dueTodayCount = useMemo(() => {
    return mistakes.filter(
      (m) =>
        !m.deleted_at &&
        !subjectMap.get(m.subject_id)?.archived &&
        (!m.resolved ||
          (m.redo_at && new Date(m.redo_at).getTime() <= nowMs))
    ).length;
  }, [mistakes, nowMs, subjectMap]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      if (m.deleted_at) return false;
      if (subjectMap.get(m.subject_id)?.archived) return false;

      // Subject filter
      if (selectedSubjectId !== "all" && m.subject_id !== selectedSubjectId) {
        return false;
      }

      // Cause filter
      if (selectedCause !== "all" && m.cause !== selectedCause) {
        return false;
      }

      // Status filter
      if (selectedStatus === "resolved" && !m.resolved) return false;
      if (selectedStatus === "open" && m.resolved) return false;
      if (selectedStatus === "due_today") {
        const isDue =
          !m.resolved || (m.redo_at && new Date(m.redo_at).getTime() <= nowMs);
        if (!isDue) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTopic = m.topic?.toLowerCase().includes(q);
        const matchesContext = m.question_context?.toLowerCase().includes(q);
        const matchesError = m.error_made?.toLowerCase().includes(q);
        if (!matchesTopic && !matchesContext && !matchesError) return false;
      }

      return true;
    });
  }, [mistakes, selectedSubjectId, selectedCause, selectedStatus, searchQuery, nowMs]);

  const causeColors: Record<MistakeCause, { badge: string; dot: string }> = {
    concept: {
      badge: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
      dot: "bg-indigo-400",
    },
    careless: {
      badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
      dot: "bg-amber-400",
    },
    time: {
      badge: "bg-stone-500/15 border-stone-500/30 text-stone-300",
      dot: "bg-stone-400",
    },
    memory: {
      badge: "bg-teal-500/15 border-teal-500/30 text-teal-300",
      dot: "bg-teal-400",
    },
  };

  const getCauseLabel = (cause: string) => {
    if (locale !== "ar") return cause;
    const labels: Record<string, string> = {
      concept: "سوء فهم نظري",
      careless: "تسرع وسهو",
      time: "ضيق وقت",
      memory: "نسيان القانون",
    };
    return labels[cause] || cause;
  };

  return (
    <div className="space-y-6">
      {(() => {
        const conceptCount = stats.causeBreakdown.concept || 0;
        const carelessCount = stats.causeBreakdown.careless || 0;
        const memoryCount = stats.causeBreakdown.memory || 0;
        const timeCount = stats.causeBreakdown.time || 0;
        const totalCount = stats.totalCount || 1;

        const conceptPct = ((conceptCount / totalCount) * 100).toFixed(1);
        const carelessPct = ((carelessCount / totalCount) * 100).toFixed(1);
        const memoryPct = ((memoryCount / totalCount) * 100).toFixed(1);
        const timePct = ((timeCount / totalCount) * 100).toFixed(1);

        return (
          <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Primary Action & Diagnosis (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Callout Redo Hero Card */}
          <div className="bg-white rounded-[20px] p-6 border border-[#e2e8f9] shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#45474b] tracking-wide font-medium">
                  {locale === "ar" ? "التكرار المتباعد اليومي" : "Daily spaced repetition"}
                </span>
                <h2 className="text-2xl font-bold text-[#151c28]">
                  {locale === "ar"
                    ? `إعادة اليوم: ${dueTodayCount} أخطاء`
                    : `Redo today: ${dueTodayCount} mistake${dueTodayCount === 1 ? "" : "s"}`}
                </h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0051d5]/10 text-[#0051d5] flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-[#45474b] mt-3 leading-relaxed">
              {locale === "ar"
                ? "مراجعة فورية للأخطاء التحليلية والمفاهيمية تضمن تثبيت المعلومة قبل تلاشي الاسترجاع النشط."
                : "Immediate review of recent analytical slips ensures long-term memory retention before active recall decays."}
            </p>
            <div className="mt-5 flex items-center justify-between pt-3 bg-[#f0f3ff] rounded-xl p-3.5 border border-[#e2e8f9]">
              <div className="flex items-center gap-2">
                <span className="text-[#0051d5] text-sm">⏱</span>
                <span className="text-xs font-semibold text-[#151c28]">
                  {locale === "ar" ? "الوقت المقدر: 14 دقيقة" : "Estimated time: 14 mins"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstDue = filteredMistakes.find((m) => !m.resolved);
                  if (firstDue) onOpenRedoModal(firstDue);
                  else if (filteredMistakes[0]) onOpenRedoModal(filteredMistakes[0]);
                }}
                className="bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#1a1c20] transition-colors shadow-xs cursor-pointer"
              >
                {locale === "ar" ? "ابدأ الحل" : "Start redo"}
              </button>
            </div>
          </div>

          {/* Root Cause Analysis Breakdown */}
          <div className="bg-white rounded-[20px] p-6 border border-[#e2e8f9] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-[#151c28]">
                  {locale === "ar" ? "أسباب الأخطاء الشائعة" : "Why I get things wrong"}
                </h3>
                <span className="text-xs text-[#717784]">
                  {locale === "ar"
                    ? `إجمالي ${stats.totalCount} خطأ متسجل`
                    : `Cumulative log of ${stats.totalCount} recorded error states`}
                </span>
              </div>
              <span className="text-xs font-semibold text-[#0051d5] bg-[#f0f3ff] px-2.5 py-1 rounded-full border border-[#dce2f3]">
                {locale === "ar" ? "تحليل" : "Analysis"}
              </span>
            </div>

            {/* Stacked Proportional Distribution Bar */}
            <div className="w-full flex flex-col gap-1.5 mt-1">
              <div className="h-3 w-full bg-[#e7eeff] rounded-full overflow-hidden flex">
                <div className="h-full bg-[#0051d5]" style={{ width: `${conceptPct}%` }} title={`Concept: ${conceptCount}`} />
                <div className="h-full bg-[#316bf3]" style={{ width: `${carelessPct}%` }} title={`Careless: ${carelessCount}`} />
                <div className="h-full bg-[#5d5e63]" style={{ width: `${memoryPct}%` }} title={`Memory: ${memoryCount}`} />
                <div className="h-full bg-[#c6c6cb]" style={{ width: `${timePct}%` }} title={`Time: ${timeCount}`} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#717784] pt-1">
                <span>
                  {locale === "ar"
                    ? `السبب الأكبر: مفاهيم (${conceptPct}%)`
                    : `Primary driver: Conceptual (${conceptPct}%)`}
                </span>
                <span>{locale === "ar" ? "المستهدف: < 15%" : "Target: < 15%"}</span>
              </div>
            </div>

            {/* Key Metrics Segment Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCause(selectedCause === "concept" ? "all" : "concept")}
                className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                  selectedCause === "concept" ? "bg-[#f0f3ff] border-[#0051d5]" : "bg-[#f9f9ff] border-[#e2e8f9]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0051d5]" />
                  <span className="text-xs font-medium text-[#151c28]">
                    {locale === "ar" ? "مفاهيم" : "Concept"}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#151c28]">{conceptCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCause(selectedCause === "careless" ? "all" : "careless")}
                className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                  selectedCause === "careless" ? "bg-[#f0f3ff] border-[#0051d5]" : "bg-[#f9f9ff] border-[#e2e8f9]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#316bf3]" />
                  <span className="text-xs font-medium text-[#151c28]">
                    {locale === "ar" ? "تسرع وسهو" : "Careless"}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#151c28]">{carelessCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCause(selectedCause === "memory" ? "all" : "memory")}
                className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                  selectedCause === "memory" ? "bg-[#f0f3ff] border-[#0051d5]" : "bg-[#f9f9ff] border-[#e2e8f9]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5d5e63]" />
                  <span className="text-xs font-medium text-[#151c28]">
                    {locale === "ar" ? "نسيان قانون" : "Memory"}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#151c28]">{memoryCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCause(selectedCause === "time" ? "all" : "time")}
                className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between ${
                  selectedCause === "time" ? "bg-[#f0f3ff] border-[#0051d5]" : "bg-[#f9f9ff] border-[#e2e8f9]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c6c6cb]" />
                  <span className="text-xs font-medium text-[#151c28]">
                    {locale === "ar" ? "ضيق وقت" : "Time"}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#151c28]">{timeCount}</span>
              </button>
            </div>
          </div>

          {/* Quick Add Prompt Banner */}
          <div className="bg-[#f0f3ff] rounded-[20px] p-4.5 border border-[#e2e8f9] flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-[#0051d5] shrink-0" />
            <span className="text-xs text-[#45474b] leading-relaxed">
              {locale === "ar"
                ? "مراجعة الخطأ وإعادة حله خلال 24 ساعة تضاعف نسبة استرجاعه وثباته."
                : "Reviewing errors within 24 hours doubles long-term retention."}
            </span>
          </div>
        </div>

        {/* Right Column: Error Catalog & Logs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-[20px] px-5 py-4 border border-[#e2e8f9] shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#151c28]">
                {locale === "ar" ? "الأخطاء المسجلة" : "Recorded mistakes"}
              </span>
              <span className="text-xs bg-[#f0f3ff] text-[#0051d5] font-semibold px-2.5 py-0.5 rounded-full border border-[#dce2f3]">
                {filteredMistakes.length} {locale === "ar" ? "إجمالي" : "total"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-44">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === "ar" ? "بحث..." : "Search..."}
                  className="w-full py-1.5 pl-3 pr-8 bg-[#f0f3ff] border border-[#e2e8f9] rounded-xl text-xs text-[#151c28] placeholder:text-[#76777b] focus:bg-white focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#76777b] pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-1.5 bg-black text-white hover:bg-[#1a1c20] text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "تسجيل خطأ" : "Add mistake"}</span>
              </button>
            </div>
          </div>

          {/* Filter Pills Bar with Status and Causes */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: locale === "ar" ? "كل الأخطاء" : "All" },
                { id: "due_today", label: locale === "ar" ? `مستحق اليوم (${dueTodayCount})` : `Redo today (${dueTodayCount})` },
                { id: "open", label: locale === "ar" ? "مفتوح" : "Open" },
                { id: "resolved", label: locale === "ar" ? "متقن" : "Mastered" },
              ] as Array<{ id: StatusFilter; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedStatus(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  selectedStatus === t.id
                    ? "bg-black text-white shadow-xs font-semibold"
                    : "bg-white text-[#45474b] border border-[#e2e8f9] hover:text-[#151c28]"
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="h-4 w-px bg-[#e2e8f9] mx-1" />

            {(["concept", "careless", "time", "memory"] as MistakeCause[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCause(selectedCause === c ? "all" : c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedCause === c
                    ? "bg-[#0051d5] text-white font-semibold shadow-xs"
                    : "bg-[#f0f3ff] text-[#45474b] hover:bg-[#e7eeff]"
                }`}
              >
                {getCauseLabel(c)}
              </button>
            ))}
          </div>

          {/* Mistake Items Stack */}
          {filteredMistakes.length === 0 ? (
            <div className="p-12 rounded-[20px] bg-white border border-[#e2e8f9] text-center space-y-2 shadow-xs">
              <BookX className="w-8 h-8 text-[#717784] mx-auto" />
              <div className="text-sm font-bold text-[#151c28]">
                {locale === "ar" ? "مفيش أخطاء مطابقة" : "No mistakes found"}
              </div>
              <p className="text-xs text-[#717784] max-w-sm mx-auto">
                {locale === "ar"
                  ? "سجل الأخطاء هنا أول ما تظهر في الواجبات أو الامتحانات لتكرارها وتثبيتها."
                  : "Whenever you make an error on homework or exams, log it here for spaced repetition."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMistakes.map((m) => {
                const subject = subjectMap.get(m.subject_id);
                const isResolved = Boolean(m.resolved || m.last_redo_result === "correct");
                const isDueToday =
                  !isResolved || (m.redo_at && new Date(m.redo_at).getTime() <= nowMs);

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-[20px] p-5 border border-[#e2e8f9] shadow-xs flex flex-col gap-3 hover:border-[#0051d5]/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Subject Badge */}
                        <span className="bg-[#dbe1ff] text-[#00174b] text-xs font-semibold px-2.5 py-0.5 rounded-md">
                          {subject?.name || (locale === "ar" ? "مادة" : "Subject")}
                        </span>
                        {/* Topic Chip */}
                        <span className="bg-[#e7eeff] text-[#151c28] text-xs font-medium px-2.5 py-0.5 rounded-md">
                          {m.topic}
                        </span>
                        {/* Reason Chip */}
                        <span className="bg-[#f0f3ff] text-[#45474b] text-xs font-medium px-2.5 py-0.5 rounded-md">
                          {getCauseLabel(m.cause)}
                        </span>
                      </div>

                      {/* Schedule Chip */}
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 bg-[#f0fdf4] text-[#15803d] text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>{locale === "ar" ? "تم الإتقان" : "Mastered"}</span>
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center gap-1.5 bg-[#ffdad6] text-[#93000a] text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
                          <span>{locale === "ar" ? "إعادة اليوم" : "Redo today"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-[#e7eeff] text-[#45474b] text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0">
                          <span>{locale === "ar" ? "قيد الجدولة" : "Pending"}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-[#151c28] leading-snug">
                        {m.question_context}
                      </p>
                      {m.error_made && (
                        <p className="text-xs text-[#45474b] leading-relaxed">
                          {m.error_made}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#f0f3ff] text-[#717784] text-xs">
                      <span>
                        {m.redo_history && m.redo_history.length > 0
                          ? locale === "ar"
                            ? `${m.redo_history.length} محاولات سابقة`
                            : `${m.redo_history.length} previous attempt(s)`
                          : locale === "ar"
                          ? "أول محاولة"
                          : "First cycle"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenRedoModal(m)}
                          className="text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
                        >
                          {locale === "ar" ? "إعادة الحل" : "Practice redo"}
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(m)}
                          className="inline-flex items-center gap-1 text-xs text-[#45474b] hover:text-[#151c28] cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{locale === "ar" ? "تعديل" : "Edit"}</span>
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => onDeleteMistake(m.id)}
                          className="inline-flex items-center gap-1 text-xs text-[#ba1a1a] hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{locale === "ar" ? "حذف" : "Dismiss"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
          </>
        );
      })()}
    </div>
  );
}
