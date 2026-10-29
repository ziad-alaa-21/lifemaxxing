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
      {/* Top Banner / Due Today Alert */}
      {dueTodayCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-surface-container to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 shrink-0">
              <RotateCcw className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-on-surface">
                {locale === "ar"
                  ? `${dueTodayCount} أخطاء مستحقة للحل والتصحيح النهاردة`
                  : `${dueTodayCount} Mistake${dueTodayCount > 1 ? "s" : ""} Due for Redo Today`}
              </div>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                {locale === "ar"
                  ? "حل الأخطاء بإيدك بيثبت الفكرة في دماغك ويمنع تكرارها في الامتحان"
                  : "Active-recall re-solving locks in comprehension before exam day"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedStatus("due_today")}
            className="px-4 py-2 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-bold uppercase hover:bg-amber-400 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          >
            {locale === "ar" ? "ابدأ الحل دلوقتي" : "Practice Redos"}
          </button>
        </div>
      )}

      {/* Analytics Breakdown Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[18px] bg-white border border-[#e2e8f9] p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#717784] font-medium uppercase tracking-wider block">
            {locale === "ar" ? "إجمالي الأخطاء" : "Total Cataloged"}
          </span>
          <div className="text-2xl font-bold text-[#151c28]">{stats.totalCount}</div>
        </div>
        <div className="rounded-[18px] bg-white border border-[#e2e8f9] p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#0051d5] font-medium uppercase tracking-wider block">
            {locale === "ar" ? "محتاج إعادة حل" : "Needs Redo"}
          </span>
          <div className="text-2xl font-bold text-[#0051d5]">{stats.openCount}</div>
        </div>
        <div className="rounded-[18px] bg-white border border-[#e2e8f9] p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#34a853] font-medium uppercase tracking-wider block">
            {locale === "ar" ? "تم الحل والإتقان" : "Redone & Resolved"}
          </span>
          <div className="text-2xl font-bold text-[#34a853]">{stats.resolvedCount}</div>
        </div>
        <div className="rounded-[18px] bg-white border border-[#e2e8f9] p-4 space-y-1 shadow-xs">
          <span className="text-[11px] text-[#5c5b9e] font-medium uppercase tracking-wider block">
            {locale === "ar" ? "نسبة التغلب ع الأخطاء" : "Resolution Rate"}
          </span>
          <div className="text-2xl font-bold text-[#5c5b9e]">
            {stats.resolutionRatePct}%
          </div>
        </div>
      </div>

      {/* Cause Taxonomy Breakdown Pill Bar */}
      <div className="rounded-[20px] bg-white border border-[#e2e8f9] p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#45474b]">
          <span className="uppercase tracking-wider font-semibold">
            {locale === "ar" ? "توزيع أسباب الأخطاء" : "Root Cause Distribution"}
          </span>
          <span className="text-[11px] text-[#717784]">
            {locale === "ar" ? `إجمالي ${stats.totalCount} خطأ متسجل` : `${stats.totalCount} total logged`}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(["concept", "careless", "time", "memory"] as MistakeCause[]).map((c) => {
            const count = stats.causeBreakdown[c];
            const pct = stats.causePercentages[c];
            const cfg = causeColors[c];
            const isSelected = selectedCause === c;

            return (
              <button
                key={c}
                onClick={() => setSelectedCause(selectedCause === c ? "all" : c)}
                className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#f0f3ff] border-[#0051d5] shadow-xs"
                    : "bg-[#f8faff] border-[#e2e8f9] hover:border-[#0051d5]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs capitalize font-bold text-[#151c28]">
                      {getCauseLabel(c)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#151c28]">{count}</span>
                </div>
                <div className="text-[10px] text-[#717784] mt-0.5">
                  {pct}% {locale === "ar" ? "من الأخطاء" : "of errors"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-surface-container p-1 rounded-xl border border-border-subtle font-mono text-xs">
            {(
              [
                { id: "all", label: locale === "ar" ? "الكل" : "All" },
                { id: "due_today", label: locale === "ar" ? `مستحق (${dueTodayCount})` : `Due (${dueTodayCount})` },
                { id: "open", label: locale === "ar" ? "مفتوح" : "Open" },
                { id: "resolved", label: locale === "ar" ? "متقن" : "Resolved" },
              ] as Array<{ id: StatusFilter; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedStatus(t.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedStatus === t.id
                    ? "bg-amber-500/20 text-amber-700 font-bold border border-amber-500/30 shadow-xs"
                    : "text-text-muted hover:text-on-surface"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-1.5 bg-surface-container border border-border-subtle rounded-xl text-xs font-mono text-on-surface focus:outline-none"
          >
            <option value="all">{locale === "ar" ? "كل المواد" : "All Subjects"}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Add Mistake CTA */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-text-muted ${locale === "ar" ? "right-3" : "left-3"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === "ar" ? "ابحث في الأخطاء..." : "Search mistakes..."}
              className={`w-full py-1.5 bg-surface-container border border-border-subtle rounded-xl text-xs font-mono text-on-surface placeholder:text-text-muted focus:outline-none ${locale === "ar" ? "pr-8 pl-3" : "pl-8 pr-3"}`}
            />
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0051d5] text-white text-xs font-semibold hover:bg-[#003ea8] shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{locale === "ar" ? "سجل خطأ" : "Log Mistake"}</span>
          </button>
        </div>
      </div>

      {/* Mistake Cards List */}
      {filteredMistakes.length === 0 ? (
        <div className="p-12 rounded-[20px] bg-white border border-[#e2e8f9] text-center space-y-2 shadow-xs">
          <BookX className="w-8 h-8 text-[#717784] mx-auto" />
          <div className="text-sm font-bold text-[#151c28]">
            {locale === "ar" ? "مفيش أخطاء متسجلة هنا" : "No mistakes found"}
          </div>
          <p className="text-xs text-[#717784] max-w-sm mx-auto">
            {searchQuery || selectedCause !== "all" || selectedStatus !== "all"
              ? locale === "ar" ? "مفيش عناصر مطابقة للفلاتر دي. اعد ضبط الفلتر عشان تشوف كل الأخطاء." : "No items match your active filters. Reset filters to see all entries."
              : locale === "ar" ? "أول ما تغلط في واجب أو كويز أو تدريب، سجله هنا عشان تراجعه وتضمن إنك مش هتكرره تاني." : "Whenever you make an error on a homework, quiz, or practice problem, log it here to build your active-recall notebook."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMistakes.map((m) => {
            const subject = subjectMap.get(m.subject_id);
            const isResolved = Boolean(m.resolved || m.last_redo_result === "correct");
            const isDueToday =
              !isResolved || (m.redo_at && new Date(m.redo_at).getTime() <= nowMs);
            const cfg = causeColors[m.cause] || causeColors.concept;

            return (
              <div
                key={m.id}
                className="rounded-[20px] bg-white border border-[#e2e8f9] hover:border-[#0051d5]/40 transition-all p-4.5 space-y-3 shadow-xs"
              >
                {/* Header: Subject + Topic + Cause + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#f0f3ff]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: subject?.color || "#0051d5" }}
                    />
                    <span className="text-xs font-bold text-[#151c28]">
                      {subject?.name || (locale === "ar" ? "المادة" : "Academic Subject")}
                    </span>
                    <span className="text-[#717784] text-xs">•</span>
                    <h3 dir="auto" className="text-xs font-bold text-[#151c28]">
                      {m.topic}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border uppercase font-bold ${cfg.badge}`}
                    >
                      {getCauseLabel(m.cause)}
                    </span>
                    {isResolved ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] uppercase font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        {locale === "ar" ? "تم الإتقان" : "Resolved"}
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border uppercase font-bold ${
                          isDueToday
                            ? "bg-[#f0f3ff] border-[#dce2f3] text-[#0051d5]"
                            : "bg-[#f8faff] border-[#e2e8f9] text-[#45474b]"
                        }`}
                      >
                        {isDueToday
                          ? locale === "ar" ? "مستحق النهاردة" : "Due Today"
                          : locale === "ar" ? "في انتظار الإعادة" : "Pending Redo"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Problem Prompt Snippet */}
                <div className="space-y-1">
                  <div className="text-[10px] text-[#717784] uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    <span>{locale === "ar" ? "سياق المسألة / السؤال:" : "Problem Context:"}</span>
                  </div>
                  <p
                    dir="auto"
                    className="text-xs text-[#45474b] line-clamp-2 leading-relaxed"
                  >
                    {m.question_context}
                  </p>
                </div>

                {/* Card Actions & Redo CTA */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-[11px] text-[#717784] flex items-center gap-2">
                    {m.redo_history && m.redo_history.length > 0 ? (
                      <span>
                        {m.redo_history.length} {locale === "ar" ? "محاولة إعادة حل" : "redo attempt(s)"}
                      </span>
                    ) : (
                      <span>{locale === "ar" ? "مفيش محاولات سابقة" : "No redos yet"}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenRedoModal(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f0f3ff] border border-[#dce2f3] text-[#0051d5] text-xs font-semibold hover:bg-[#e2e8f9] transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{locale === "ar" ? "حل تاني" : "Practice Redo"}</span>
                    </button>
                    <button
                      onClick={() => onOpenEditModal(m)}
                      className="p-1.5 rounded-lg text-[#717784] hover:text-[#151c28] hover:bg-[#f0f3ff] transition-colors"
                      title={locale === "ar" ? "تعديل الخطأ" : "Edit Mistake"}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMistake(m.id)}
                      className="p-1.5 rounded-lg text-[#717784] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors"
                      title={locale === "ar" ? "حذف (تراجع 8 ث)" : "Delete (8s Undo)"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
