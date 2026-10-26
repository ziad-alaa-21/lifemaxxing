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
  BookmarkCheck,
  Plus,
  Search,
  Star,
  ListPlus,
  AlertCircle,
  Clock,
  RotateCcw,
  Check,
  Edit2,
  Trash2,
  Calendar,
  Layers,
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
    <div className="space-y-6">
      {/* Capped Overdue "Review Today" Banner */}
      {overdueQueue.totalDueCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-surface-container to-indigo-500/5 border border-indigo-500/30 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-600 shrink-0">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold font-mono text-on-surface">
                  {locale === "ar"
                    ? `مستحق المراجعة النهاردة (${overdueQueue.totalDueCount} مفاهيم)`
                    : overdueQueue.bannerText}
                </div>
                <p className="text-xs font-mono text-on-surface-variant">
                  {overdueQueue.hasMore
                    ? locale === "ar"
                      ? `عرض ${overdueQueue.dueTopics.length} من أصل ${overdueQueue.totalDueCount} مفهوم لمنع التشتت`
                      : `Showing ${overdueQueue.dueTopics.length} of ${overdueQueue.totalDueCount} due topics to prevent overload`
                    : locale === "ar"
                    ? "خلّص مراجعة المفاهيم المستحقة في التكرار المتباعد النهاردة"
                    : "Complete today's active spaced repetition queue"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Review Carousel Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {overdueQueue.dueTopics.map((item) => {
              const sub = subjectMap.get(item.subject_id);
              const isBusy = reviewingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-surface-container-high/70 border border-border-subtle flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: sub?.color || "#6366F1" }}
                        />
                        <span className="text-[10px] font-mono text-text-muted">
                          {sub?.name}
                        </span>
                      </div>
                      <h4 dir="auto" className="text-xs font-bold font-mono text-on-surface">
                        {item.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= item.confidence
                              ? "fill-amber-400 text-amber-600"
                              : "text-text-muted/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 1-5 Quick Rating Action Buttons */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-border-subtle/50 font-mono text-[10px]">
                    <span className="text-text-muted">
                      {locale === "ar" ? "تقييم سريع:" : "Quick Rate:"}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          disabled={isBusy}
                          onClick={() => handleRate(item.id, lvl)}
                          className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            lvl >= 4
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20"
                              : lvl === 3
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-700 hover:bg-rose-500/20"
                          } disabled:opacity-40`}
                          title={`Rate ${lvl}`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">
            {locale === "ar" ? "مفاهيم المنهج" : "Syllabus Topics"}
          </span>
          <div className="text-2xl font-extrabold text-on-surface">{stats.totalTopics}</div>
        </div>
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-amber-700 uppercase tracking-wider block">
            {locale === "ar" ? "مستحق المراجعة" : "Reviews Due"}
          </span>
          <div className="text-2xl font-extrabold text-amber-600">{stats.dueCount}</div>
        </div>
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-emerald-600 uppercase tracking-wider block">
            {locale === "ar" ? "استيعاب عالي (4-5)" : "High Confidence (4-5)"}
          </span>
          <div className="text-2xl font-extrabold text-emerald-600">
            {stats.highConfidenceCount}
          </div>
        </div>
        <div className="stitch-card p-3.5 font-mono space-y-1">
          <span className="text-[10px] text-indigo-600 uppercase tracking-wider block">
            {locale === "ar" ? "متوسط الاستيعاب" : "Avg Confidence"}
          </span>
          <div className="text-2xl font-extrabold text-indigo-700">
            {stats.averageConfidence} / 5
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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

          {/* Search */}
          <div className="relative w-48 sm:w-56">
            <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-text-muted ${locale === "ar" ? "right-3" : "left-3"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === "ar" ? "ابحث في المفاهيم..." : "Search topics..."}
              className={`w-full py-1.5 bg-surface-container border border-border-subtle rounded-xl text-xs font-mono text-on-surface placeholder:text-text-muted focus:outline-none ${locale === "ar" ? "pr-8 pl-3" : "pl-8 pr-3"}`}
            />
          </div>
        </div>

        {/* Buttons: Bulk Add + Add Topic */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBulkModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-border-subtle text-on-surface hover:bg-surface-container-high text-xs font-mono transition-all cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>{locale === "ar" ? "لصق جملة" : "Bulk Paste"}</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-mono font-bold uppercase hover:bg-indigo-400 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{locale === "ar" ? "إضافة مفهوم" : "Add Topic"}</span>
          </button>
        </div>
      </div>

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-container/50 border border-border-subtle text-center space-y-2">
          <BookmarkCheck className="w-8 h-8 text-text-muted mx-auto" />
          <div className="text-sm font-mono font-bold text-on-surface">
            {locale === "ar" ? "مفيش مفاهيم متسجلة" : "No topics found"}
          </div>
          <p className="text-xs font-mono text-text-muted max-w-sm mx-auto">
            {searchQuery || selectedSubjectId !== "all"
              ? locale === "ar" ? "مفيش مفاهيم مطابقة للبحث أو المادة المحددة." : "No syllabus topics match your active search or subject filter."
              : locale === "ar" ? "أضف عناوين ومفاهيم المنهج أو الصقهم جملة واحدة عشان تتابع مراجعتهم بالتكرار المتباعد." : "Import your syllabus topics or paste them line-by-line to begin tracking Leitner spaced repetition."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTopics.map((t) => {
            const sub = subjectMap.get(t.subject_id);
            const isDue =
              t.next_review_at && new Date(t.next_review_at).getTime() <= nowMs;
            const isBusy = reviewingId === t.id;

            return (
              <div
                key={t.id}
                className="stitch-card p-4 hover:border-border-medium transition-all space-y-3 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Subject Tag + Due Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: sub?.color || "#6366F1" }}
                      />
                      <span className="text-[11px] font-mono font-semibold text-text-muted">
                        {sub?.name || (locale === "ar" ? "المادة" : "Subject")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDue ? (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 uppercase font-bold">
                          {locale === "ar" ? "مستحق النهاردة" : "Due Today"}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle text-text-muted">
                          {t.review_count} {locale === "ar" ? "مراجعة" : "review(s)"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 dir="auto" className="text-sm font-mono font-bold text-on-surface">
                    {t.name}
                  </h3>

                  {t.notes && (
                    <p
                      dir="auto"
                      className="text-xs font-sans text-on-surface-variant line-clamp-2 leading-relaxed"
                    >
                      {t.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Row: 1-5 Stars Rating + Actions */}
                <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-muted mr-1">
                      {locale === "ar" ? "مستوى الفهم:" : "Confidence:"}
                    </span>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        disabled={isBusy}
                        onClick={() => handleRate(t.id, lvl)}
                        className={`p-1 rounded transition-all cursor-pointer disabled:opacity-40 hover:scale-110 ${
                          lvl <= t.confidence ? "text-amber-600" : "text-text-muted/30"
                        }`}
                        title={`Rate confidence ${lvl}/5`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            lvl <= t.confidence ? "fill-amber-400" : ""
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEditModal(t)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
                      title={locale === "ar" ? "تعديل المفهوم" : "Edit Topic"}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTopic(t.id)}
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
