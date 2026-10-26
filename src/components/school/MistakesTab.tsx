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
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">
            {locale === "ar" ? "إجمالي الأخطاء" : "Total Cataloged"}
          </span>
          <div className="text-2xl font-extrabold text-on-surface">{stats.totalCount}</div>
        </div>
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-amber-700 uppercase tracking-wider block">
            {locale === "ar" ? "محتاج إعادة حل" : "Needs Redo"}
          </span>
          <div className="text-2xl font-extrabold text-amber-600">{stats.openCount}</div>
        </div>
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-emerald-600 uppercase tracking-wider block">
            {locale === "ar" ? "تم الحل والإتقان" : "Redone & Resolved"}
          </span>
          <div className="text-2xl font-extrabold text-emerald-600">{stats.resolvedCount}</div>
        </div>
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-indigo-600 uppercase tracking-wider block">
            {locale === "ar" ? "نسبة التغلب ع الأخطاء" : "Resolution Rate"}
          </span>
          <div className="text-2xl font-extrabold text-indigo-700">
            {stats.resolutionRatePct}%
          </div>
        </div>
      </div>

      {/* Cause Taxonomy Breakdown Pill Bar */}
      <div className="stitch-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
          <span className="uppercase tracking-wider font-semibold">
            {locale === "ar" ? "توزيع أسباب الأخطاء" : "Root Cause Distribution"}
          </span>
          <span className="text-[11px] text-text-muted">
            {locale === "ar" ? `إجمالي ${stats.totalCount} خطأ متسجل` : `${stats.totalCount} total logged`}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
          {(["concept", "careless", "time", "memory"] as MistakeCause[]).map((c) => {
            const count = stats.causeBreakdown[c];
            const pct = stats.causePercentages[c];
            const cfg = causeColors[c];
            const isSelected = selectedCause === c;

            return (
              <button
                key={c}
                onClick={() => setSelectedCause(selectedCause === c ? "all" : c)}
                className={`p-2 rounded-lg border text-start transition-all cursor-pointer ${
                  isSelected
                    ? "bg-surface-container-high border-amber-400/50 shadow-sm"
                    : "bg-surface-container-high/40 border-border-subtle hover:border-border-medium"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-[11px] capitalize font-bold text-on-surface">
                      {getCauseLabel(c)}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-on-surface">{count}</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-bold uppercase hover:bg-amber-400 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{locale === "ar" ? "سجل خطأ" : "Log Mistake"}</span>
          </button>
        </div>
      </div>

      {/* Mistake Cards List */}
      {filteredMistakes.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-container/50 border border-border-subtle text-center space-y-2">
          <BookX className="w-8 h-8 text-text-muted mx-auto" />
          <div className="text-sm font-mono font-bold text-on-surface">
            {locale === "ar" ? "مفيش أخطاء متسجلة هنا" : "No mistakes found"}
          </div>
          <p className="text-xs font-mono text-text-muted max-w-sm mx-auto">
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
                className="stitch-card p-4 hover:border-border-medium transition-all space-y-3 shadow-xs"
              >
                {/* Header: Subject + Topic + Cause + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: subject?.color || "#F59E0B" }}
                    />
                    <span className="text-xs font-mono font-bold text-on-surface">
                      {subject?.name || (locale === "ar" ? "المادة" : "Academic Subject")}
                    </span>
                    <span className="text-text-muted font-mono text-xs">•</span>
                    <h3 dir="auto" className="text-xs font-mono font-bold text-on-surface">
                      {m.topic}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${cfg.badge}`}
                    >
                      {getCauseLabel(m.cause)}
                    </span>
                    {isResolved ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 uppercase font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        {locale === "ar" ? "تم الإتقان" : "Resolved"}
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                          isDueToday
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-700"
                            : "bg-surface-container-high border-border-subtle text-text-muted"
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
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    <span>{locale === "ar" ? "سياق المسألة / السؤال:" : "Problem Context:"}</span>
                  </div>
                  <p
                    dir="auto"
                    className="text-xs font-sans text-on-surface-variant line-clamp-2 leading-relaxed"
                  >
                    {m.question_context}
                  </p>
                </div>

                {/* Card Actions & Redo CTA */}
                <div className="flex items-center justify-between pt-1 text-xs font-mono">
                  <div className="text-[11px] text-text-muted flex items-center gap-2">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 text-xs font-mono font-bold hover:bg-amber-500/25 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{locale === "ar" ? "حل تاني" : "Practice Redo"}</span>
                    </button>
                    <button
                      onClick={() => onOpenEditModal(m)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
                      title={locale === "ar" ? "تعديل الخطأ" : "Edit Mistake"}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMistake(m.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-crimson-alert hover:bg-crimson-alert/10 transition-colors"
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
