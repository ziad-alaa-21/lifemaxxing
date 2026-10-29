"use client";

import React, { useState, useMemo } from "react";
import {
  AcademicTopicItem,
  SubjectItem,
  calculateTopicStats,
  filterOverdueTopicQueue,
} from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  Search,
  Plus,
  ListPlus,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  Info,
  SlidersHorizontal,
  BookmarkCheck,
  TrendingUp,
  Star,
  Clock,
} from "lucide-react";

interface TopicsTabProps {
  topics: AcademicTopicItem[];
  subjects: SubjectItem[];
  onOpenAddModal: () => void;
  onOpenBulkModal: () => void;
  onOpenEditModal: (topic: AcademicTopicItem) => void;
  onQuickReview: (topicId: string, confidence: number) => Promise<void>;
  onDeleteTopic: (topicId: string) => void;
}

export function TopicsTab({
  topics,
  subjects,
  onOpenAddModal,
  onOpenBulkModal,
  onOpenEditModal,
  onQuickReview,
  onDeleteTopic,
}: TopicsTabProps) {
  const { locale } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const nowMs = Date.now();
  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  // Active topics excluding archived subjects
  const activeTopics = useMemo(() => {
    return topics.filter((t) => !subjectMap.get(t.subject_id)?.archived);
  }, [topics, subjectMap]);

  const stats = useMemo(() => calculateTopicStats(activeTopics), [activeTopics]);

  // Capped overdue reviews queue (max 10 displayed, excludes archived subjects)
  const overdueQueue = useMemo(() => {
    return filterOverdueTopicQueue(activeTopics, 10, nowMs);
  }, [activeTopics, nowMs]);

  const filteredTopics = useMemo(() => {
    return activeTopics.filter((t) => {
      if (t.deleted_at) return false;

      if (selectedSubjectId !== "all" && t.subject_id !== selectedSubjectId) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesNotes) return false;
      }

      return true;
    });
  }, [topics, selectedSubjectId, searchQuery]);

  async function handleRate(topicId: string, level: number) {
    try {
      setReviewingId(topicId);
      await onQuickReview(topicId, level);
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="flex flex-col w-full gap-6">
      {(() => {
        const isAr = locale === "ar";
        const lowConfidenceCount = activeTopics.filter((t) => t.confidence <= 2).length;
        const midConfidenceCount = activeTopics.filter((t) => t.confidence === 3).length;
        const highConfidenceCount = activeTopics.filter((t) => t.confidence >= 4).length;
        const completionPct = stats.totalTopics > 0
          ? Math.round((highConfidenceCount / stats.totalTopics) * 100)
          : 0;
        const activeSubjectName = selectedSubjectId !== "all"
          ? subjectMap.get(selectedSubjectId)?.name || (isAr ? "مادة محددة" : "Selected subject")
          : activeTopics.length > 0 && subjects[0]?.name
          ? subjects[0].name
          : isAr ? "نظام المذاكرة" : "Academic focus";

        function formatLastPracticed(topic: AcademicTopicItem) {
          if (!topic.last_reviewed_at) {
            return isAr ? "لم تتم مراجعته" : "Not yet reviewed";
          }
          const diffHours = Math.round((nowMs - new Date(topic.last_reviewed_at).getTime()) / (1000 * 3600));
          if (diffHours < 1) return isAr ? "الآن" : "Just now";
          if (diffHours < 24) return isAr ? `منذ ${diffHours} س` : `${diffHours}h ago`;
          const diffDays = Math.round(diffHours / 24);
          if (diffDays === 1) return isAr ? "أمس" : "Yesterday";
          return isAr ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
        }

        function getConfidenceDescriptor(level: number) {
          if (level <= 1) return isAr ? "مبتدئ" : "Novice";
          if (level === 2) return isAr ? "يتطور" : "Developing";
          if (level === 3) return isAr ? "متوسط" : "Moderate";
          if (level === 4) return isAr ? "قوي" : "Strong";
          return isAr ? "متمكن" : "Mastered";
        }

        return (
          <>
      {/* Active Header Metrics & Domain Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status & Overview Hero Card (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-7 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9] flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Radial Gradient */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-[#dbe1ff]/30 pointer-events-none blur-2xl" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e7eeff] text-[#0051d5] text-xs font-semibold mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0051d5]" />
                <span>{activeSubjectName}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#151c28] tracking-tight">
                {isAr
                  ? `مراجعة اليوم: ${stats.dueCount} من أصل ${stats.totalTopics} مفهوم`
                  : `Review today: ${stats.dueCount} of ${stats.totalTopics} topics`}
              </h2>
              <p className="text-xs sm:text-sm text-[#45474b] mt-1">
                {isAr
                  ? "التكرار المتباعد المنظم يحافظ على استرجاع المعلومات بقوة قبل الاختبارات التجريبية."
                  : "Regular spaced repetition keeps retrieval strength high before mock exams."}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div
                className="inline-flex items-center gap-1.5 bg-[#f0f3ff] text-[#151c28] rounded-xl px-3.5 py-2 text-xs font-semibold border border-[#e2e8f9]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#45474b]" />
                <span>{isAr ? "تصفية" : "Filter"}</span>
              </div>

              {overdueQueue.dueTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const firstDue = overdueQueue.dueTopics[0];
                    if (firstDue) handleRate(firstDue.id, Math.min(5, (firstDue.confidence || 1) + 1));
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#000000] text-white rounded-xl px-4 py-2 text-xs font-semibold hover:bg-[#2a313d] transition-colors shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isAr ? "راجع الآن" : "Review now"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Linear Visual Progress Strip */}
          <div className="relative z-10 pt-1">
            <div className="flex items-center justify-between text-[#45474b] text-xs font-medium mb-1.5">
              <span>{isAr ? "نسبة إتقان المنهج" : "Curriculum mastery completion"}</span>
              <span className="text-sm font-bold text-[#151c28]">{completionPct}%</span>
            </div>
            <div className="w-full bg-[#e7eeff] rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-[#0051d5] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[#45474b] text-[11px]">
              <span>
                {isAr
                  ? `${highConfidenceCount} مفاهيم متقنة`
                  : `${highConfidenceCount} completed mastery`}
              </span>
              <span>
                {isAr
                  ? `${stats.dueCount} مفاهيم متبقية للدورة الحالية`
                  : `${stats.dueCount} topics remaining for this cycle`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Bento Tile (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-white rounded-2xl p-6 sm:p-7 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#45474b]">
              {isAr ? "مؤشر الاستيعاب" : "Mastery index"}
            </span>
            <TrendingUp className="w-4 h-4 text-[#0051d5]" />
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-[#151c28] tracking-tight">
                {stats.averageConfidence}
              </span>
              <span className="text-sm text-[#45474b]">/ 5.0</span>
            </div>
            <p className="text-xs text-[#45474b] mt-1">
              {isAr
                ? `متوسط الفهم عبر ${stats.totalTopics} مفهوم مفهرس في المنهج`
                : `Average confidence across ${stats.totalTopics} indexed syllabus topics`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 bg-[#f0f3ff] p-2.5 rounded-xl border border-[#e2e8f9]">
            <div className="flex flex-col text-center">
              <span className="text-[10px] text-[#45474b]">
                {isAr ? "منخفض (1-2)" : "Low (1-2)"}
              </span>
              <span className="text-sm font-bold text-[#151c28]">{lowConfidenceCount}</span>
            </div>
            <div className="flex flex-col text-center border-x border-[#dce2f3]">
              <span className="text-[10px] text-[#45474b]">
                {isAr ? "متوسط (3)" : "Mid (3)"}
              </span>
              <span className="text-sm font-bold text-[#151c28]">{midConfidenceCount}</span>
            </div>
            <div className="flex flex-col text-center">
              <span className="text-[10px] text-[#45474b]">
                {isAr ? "عالي (4-5)" : "High (4-5)"}
              </span>
              <span className="text-sm font-bold text-[#151c28]">{highConfidenceCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Tray */}
      <div className="p-4 rounded-2xl bg-white border border-[#e2e8f9] shadow-xs flex flex-wrap items-center gap-3">
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="px-3 py-2 bg-[#f0f3ff] border border-[#e2e8f9] rounded-xl text-xs text-[#151c28] focus:outline-none focus:border-[#0051d5] shadow-xs cursor-pointer"
        >
          <option value="all">{isAr ? "كل المواد" : "All Subjects"}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-[#45474b] ${isAr ? "right-3" : "left-3"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "ابحث في المفاهيم والملاحظات..." : "Search topics & notes..."}
            className={`w-full py-2 bg-[#f0f3ff] border border-[#e2e8f9] rounded-xl text-xs text-[#151c28] placeholder:text-[#45474b] focus:outline-none focus:border-[#0051d5] ${
              isAr ? "pr-8 pl-3" : "pl-8 pr-3"
            }`}
          />
        </div>
      </div>

      {/* Topics Directory Card with Tabular Structure */}
      <div className="w-full bg-white rounded-2xl shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-[#e2e8f9] overflow-hidden">
        {/* Action Bar & Controls */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-[#f0f3ff]/60 border-b border-[#e2e8f9]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-[#151c28]">
              {isAr ? "مفاهيم المنهج" : "Curriculum topics"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#0051d5] text-[11px] font-semibold border border-[#dce2f3]">
              {filteredTopics.length} {isAr ? "معروض" : "visible"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenBulkModal}
              className="inline-flex items-center gap-1.5 bg-white text-[#151c28] text-xs font-semibold px-3 py-2 rounded-xl hover:bg-[#f0f3ff] transition-colors border border-[#e2e8f9] shadow-xs cursor-pointer"
            >
              <ListPlus className="w-3.5 h-3.5 text-[#0051d5]" />
              <span>{isAr ? "لصق جملة" : "Bulk paste"}</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 bg-[#000000] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#2a313d] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? "إضافة مفهوم" : "Add topics"}</span>
            </button>
          </div>
        </div>

        {/* Table Header (Desktop) */}
        <div className="grid grid-cols-12 px-6 py-3 bg-white text-[#45474b] text-xs font-semibold border-b border-[#e2e8f9]">
          <div className="col-span-12 md:col-span-5">{isAr ? "المفهوم والمادة" : "Topic & Subject"}</div>
          <div className="hidden md:flex items-center gap-1.5 md:col-span-4">
            <Star className="w-3.5 h-3.5 text-[#0051d5]" />
            <span>{isAr ? "مستوى الفهم" : "Confidence level"}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 md:col-span-2">
            <Clock className="w-3.5 h-3.5 text-[#45474b]" />
            <span>{isAr ? "آخر مراجعة" : "Last practiced"}</span>
          </div>
          <div className="hidden md:block md:col-span-1 text-right">{isAr ? "إجراءات" : "Actions"}</div>
        </div>

        {/* Topics List Rows */}
        {filteredTopics.length === 0 ? (
          <div className="p-12 text-center space-y-2 bg-white">
            <BookmarkCheck className="w-8 h-8 text-[#45474b] mx-auto opacity-60" />
            <div className="text-sm font-bold text-[#151c28]">
              {isAr ? "مفيش مفاهيم متسجلة" : "No topics found"}
            </div>
            <p className="text-xs text-[#45474b] max-w-sm mx-auto">
              {searchQuery || selectedSubjectId !== "all"
                ? isAr
                  ? "مفيش مفاهيم مطابقة للبحث أو المادة المحددة."
                  : "No syllabus topics match your active search or subject filter."
                : isAr
                ? "أضف عناوين ومفاهيم المنهج عشان تتابع مراجعتهم بالتكرار المتباعد."
                : "Import your syllabus topics or paste them line-by-line to begin tracking spaced repetition."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f9]/60">
            {filteredTopics.map((topic) => {
              const sub = subjectMap.get(topic.subject_id);
              const isBusy = reviewingId === topic.id;
              const isDue =
                topic.next_review_at && new Date(topic.next_review_at).getTime() <= nowMs;

              return (
                <div
                  key={topic.id}
                  className="grid grid-cols-12 items-center px-6 py-3.5 hover:bg-[#f0f3ff]/40 transition-colors bg-white gap-2 sm:gap-0"
                >
                  {/* Topic & Subject (5 cols) */}
                  <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-[#e2e8f9]"
                      style={{
                        backgroundColor: sub?.color ? `${sub.color}15` : "#f0f3ff",
                        color: sub?.color || "#0051d5",
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#151c28] truncate">
                          {topic.name}
                        </span>
                        {isDue && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ffdad6] text-[#93000a] shrink-0">
                            {isAr ? "مستحق" : "Due"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#45474b]">
                        <span className="font-semibold" style={{ color: sub?.color || "#0051d5" }}>
                          {sub?.name || (isAr ? "المادة" : "Course")}
                        </span>
                        {topic.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[180px]">{topic.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Pills (4 cols) */}
                  <div className="col-span-12 md:col-span-4 mt-2 md:mt-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#151c28] w-4 text-center">
                        {topic.confidence}
                      </span>
                      <div
                        role="group"
                        aria-label={`Confidence level ${topic.confidence} of 5`}
                        className="flex items-center gap-1"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => {
                          const isActive = lvl <= topic.confidence;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRate(topic.id, lvl)}
                              title={`Rate ${lvl}`}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 ${
                                isActive
                                  ? "bg-[#000000] text-white shadow-xs"
                                  : "bg-[#e7eeff] text-[#45474b] hover:bg-[#dbe1ff]"
                              }`}
                            >
                              {lvl}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-[#45474b] ml-1.5 hidden sm:inline">
                        {getConfidenceDescriptor(topic.confidence)}
                      </span>
                    </div>
                  </div>

                  {/* Last Practiced (2 cols) */}
                  <div className="col-span-8 md:col-span-2 text-xs text-[#45474b]">
                    {formatLastPracticed(topic)}
                  </div>

                  {/* Actions (1 col) */}
                  <div className="col-span-4 md:col-span-1 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(topic)}
                      className="p-1.5 rounded-lg text-[#45474b] hover:text-[#151c28] hover:bg-[#f0f3ff] transition-colors cursor-pointer"
                      title={isAr ? "تعديل المفهوم" : "Edit Topic"}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTopic(topic.id)}
                      className="p-1.5 rounded-lg text-[#45474b] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
                      title={isAr ? "حذف (تراجع 8 ث)" : "Delete (8s Undo)"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table Bottom Utility Bar */}
        <div className="px-6 py-3.5 bg-[#f0f3ff]/40 border-t border-[#e2e8f9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#45474b]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#0051d5]" />
            <span>
              {isAr
                ? "مستوى الاستيعاب يتعدل تلقائياً بناءً على تكرار المراجعة ودقة الاسترجاع."
                : "Confidence is auto-adjusted based on review accuracy and recall latency."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenBulkModal}
              className="text-[#151c28] hover:text-[#0051d5] font-semibold transition-colors cursor-pointer"
            >
              {isAr ? "تصدير المنهج" : "Export syllabus"}
            </button>
          </div>
        </div>
      </div>
          </>
        );
      })()}
    </div>
  );
}
