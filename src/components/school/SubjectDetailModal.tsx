"use client";

import React, { useState } from "react";
import {
  SubjectItem,
  GradeItem,
  DeadlineItem,
  calculateSubjectGradeAverage,
  calculateTargetNeeded,
  calculateQuizVsExamAverage,
  calculateGradePercentage,
  classifyDeadline,
} from "@/lib/school";
import { GradeTrendChart } from "./GradeTrendChart";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Clock,
  Award,
  CalendarClock,
  Sparkles,
  AlertTriangle,
  Play,
  CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface SubjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectItem;
  grades: GradeItem[];
  deadlines: DeadlineItem[];
  onOpenAddGrade: (subjectId: string) => void;
  onOpenEditGrade: (grade: GradeItem) => void;
  onDeleteGrade: (gradeId: string) => void;
  onOpenEditSubject: (subject: SubjectItem) => void;
  onArchiveSubject: (subjectId: string, archive: boolean) => Promise<void>;
  onDeleteSubject: (subjectId: string, hasGrades: boolean) => Promise<void>;
  onOpenStudySession: (subject: SubjectItem) => void;
  onToggleDeadlineComplete: (deadlineId: string, completed: boolean) => Promise<void>;
}

export function SubjectDetailModal({
  isOpen,
  onClose,
  subject,
  grades,
  deadlines,
  onOpenAddGrade,
  onOpenEditGrade,
  onDeleteGrade,
  onOpenEditSubject,
  onArchiveSubject,
  onDeleteSubject,
  onOpenStudySession,
  onToggleDeadlineComplete,
}: SubjectDetailModalProps) {
  const { locale } = useI18n();
  const [deleteSafeguardModal, setDeleteSafeguardModal] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  if (!isOpen) return null;

  const subjectGrades = grades
    .filter((g) => g.subject_id === subject.id && !g.deleted_at)
    .sort(
      (a, b) =>
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

  const subjectDeadlines = deadlines
    .filter((d) => d.subject_id === subject.id && !d.deleted_at)
    .sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

  const averageStats = calculateSubjectGradeAverage(subjectGrades);
  const targetStats = calculateTargetNeeded(
    subjectGrades,
    subject.target_grade
  );
  const quizVsExamStats = calculateQuizVsExamAverage(subjectGrades);

  async function handleDeleteClick() {
    if (subjectGrades.length > 0) {
      // Trigger safeguard modal prompting to archive instead
      setDeleteSafeguardModal(true);
    } else {
      await onDeleteSubject(subject.id, false);
      onClose();
    }
  }

  async function handleConfirmSafeguardArchive() {
    await onDeleteSubject(subject.id, true);
    setDeleteSafeguardModal(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40">
      <div
        className="w-full max-w-2xl bg-surface-container border border-border-subtle rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-start justify-between gap-3 bg-surface-container-high/40">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-4 h-4 rounded-full shrink-0 shadow-md"
              style={{ backgroundColor: subject.color || "#F59E0B" }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 dir="auto" className="text-lg font-bold font-mono text-on-surface truncate">
                  {subject.name}
                </h2>
                {subject.code && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container border border-border-subtle text-text-muted">
                    {subject.code}
                  </span>
                )}
                {subject.archived && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-highest text-text-muted">
                    {locale === "ar" ? "مؤرشفة" : "Archived"}
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                {locale === "ar"
                  ? `${subjectGrades.length} تقييم مسجل`
                  : `${subjectGrades.length} ${
                      subjectGrades.length === 1 ? "grade recorded" : "grades recorded"
                    }`}
                {subject.target_grade !== null &&
                  subject.target_grade !== undefined && (
                    <span className="text-emerald-600 ml-2">
                      • {locale === "ar" ? "المستهدف:" : "Target:"} {subject.target_grade}%
                    </span>
                  )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Study with Focus Timer Button */}
            <button
              onClick={() => onOpenStudySession(subject)}
              title={locale === "ar" ? "بدء جلسة مذاكرة (مؤقت التركيز)" : "Start Study Session (Focus Timer)"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-mono font-medium hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-amber-700" />
              <span className="hidden sm:inline">{locale === "ar" ? "مذاكرة" : "Study"}</span>
            </button>

            <button
              onClick={() => onOpenEditSubject(subject)}
              title={locale === "ar" ? "تعديل المادة" : "Edit Subject"}
              className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Top Performance Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Main Subject Average Card */}
            <div className="p-4 rounded-xl bg-surface-container-high/60 border border-border-subtle space-y-1.5">
              <span className="text-[11px] font-mono text-on-surface-variant block uppercase tracking-wider">
                {locale === "ar" ? "المعدل التراكمي للمادة" : averageStats.label}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-on-surface">
                  {averageStats.averagePct !== null
                    ? `${averageStats.averagePct}%`
                    : "—"}
                </span>
                {averageStats.isWeighted && (
                  <span className="text-[11px] font-mono text-amber-600">
                    {locale === "ar" ? "موزون بالأوزان" : "Weighted"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                {averageStats.hasGrades
                  ? locale === "ar"
                    ? `محسوب عبر ${averageStats.totalGrades} تقييم مسجل`
                    : `Computed across ${averageStats.totalGrades} assessments`
                  : locale === "ar"
                  ? "لا توجد تقييمات مسجلة بعد"
                  : "No evaluations logged yet"}
              </p>
            </div>

            {/* Target Projection Card */}
            <div className="p-4 rounded-xl bg-surface-container-high/60 border border-border-subtle space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">
                  {locale === "ar" ? "توقعات تحقيق الهدف" : "Target Projection"}
                </span>
                {subject.target_grade && (
                  <span className="text-[11px] font-mono text-emerald-600">
                    {locale === "ar" ? "المستهدف:" : "Goal:"} {subject.target_grade}%
                  </span>
                )}
              </div>
              <div className="text-sm font-mono text-on-surface font-semibold pt-0.5">
                {targetStats.message}
              </div>
              <p className="text-[11px] text-text-muted">
                {targetStats.available
                  ? locale === "ar"
                    ? `الوزن النسبي المتبقي من أعمال السنة: ${targetStats.remainingWeightPct}%`
                    : `Remaining coursework weight: ${targetStats.remainingWeightPct}%`
                  : locale === "ar"
                  ? "حدد النسبة المستهدفة وأوزان التقييمات للتفعيل"
                  : "Set a target grade and course weights to activate"}
              </p>
            </div>
          </div>

          {/* Comparative Quiz vs Big Exam Breakdown (ONLY with >= 2 of each) */}
          {quizVsExamStats.hasSufficientData && (
            <div className="p-4 rounded-xl bg-surface-container-high/40 border border-border-subtle space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-on-surface font-semibold">
                  {locale === "ar"
                    ? "مقارنة الأداء (الكويزات ضد الامتحانات الرئيسية)"
                    : "Assessment Split (Quiz vs Big Exam)"}
                </span>
                <span className="text-text-muted text-[10px]">
                  {locale === "ar" ? "يتطلب تقييمين على الأقل من كل نوع" : "Requires ≥ 2 of each"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-surface-container border border-border-subtle">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>
                      {locale === "ar"
                        ? `كويزات (${quizVsExamStats.quizCount})`
                        : `Quizzes (${quizVsExamStats.quizCount})`}
                    </span>
                  </div>
                  <div className="text-lg font-bold font-mono text-on-surface mt-1">
                    {quizVsExamStats.quizAveragePct}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-container border border-border-subtle">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-600">
                    <span className="w-2.5 h-2.5 rotate-45 bg-indigo-400" />
                    <span>
                      {locale === "ar"
                        ? `امتحانات رئيسية (${quizVsExamStats.bigExamCount})`
                        : `Big Exams (${quizVsExamStats.bigExamCount})`}
                    </span>
                  </div>
                  <div className="text-lg font-bold font-mono text-on-surface mt-1">
                    {quizVsExamStats.bigExamAveragePct}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Trend Chart */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
              {locale === "ar" ? "التطور الزمني للدرجات" : "Chronological Trend"}
            </h3>
            <GradeTrendChart
              grades={subjectGrades}
              targetGrade={subject.target_grade}
              subjectColor={subject.color}
            />
          </div>

          {/* Upcoming Subject Deadlines Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-on-surface-variant uppercase tracking-wider">
                {locale === "ar" ? "المواعيد والمهام القادمة للمادة" : "Upcoming Subject Deadlines"}
              </span>
              <span className="text-text-muted text-[10px]">
                {subjectDeadlines.filter((d) => !d.completed).length}{" "}
                {locale === "ar" ? "متبقي" : "Pending"}
              </span>
            </div>

            {subjectDeadlines.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-surface-container/40 border border-border-subtle text-center text-xs font-mono text-text-muted">
                {locale === "ar"
                  ? "لا توجد مواعيد تسليم مسجلة لهذه المادة"
                  : "No deadlines registered for this subject"}
              </div>
            ) : (
              <div className="space-y-2">
                {subjectDeadlines.slice(0, 4).map((dl) => {
                  const classification = classifyDeadline(dl.due_date);
                  return (
                    <div
                      key={dl.id}
                      className="p-3 rounded-xl bg-surface-container-high/40 border border-border-subtle flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() =>
                            onToggleDeadlineComplete(dl.id, !dl.completed)
                          }
                          className="text-text-muted hover:text-amber-600 transition-colors"
                        >
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              dl.completed
                                ? "text-emerald-600 fill-emerald-400/20"
                                : "text-text-muted"
                            }`}
                          />
                        </button>
                        <span
                          className={`truncate ${
                            dl.completed
                              ? "line-through text-text-muted"
                              : "text-on-surface font-medium"
                          }`}
                        >
                          {dl.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container border border-border-subtle text-text-muted capitalize">
                          {dl.type}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${classification.badgeClass}`}
                      >
                        {classification.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assessment History with Edit and Soft-Delete Undo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-on-surface-variant uppercase tracking-wider">
                {locale === "ar" ? "سجل التقييمات والدرجات" : "Assessment History"}
              </span>
              <button
                onClick={() => onOpenAddGrade(subject.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-mono hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "إضافة درجة" : "Add Grade"}</span>
              </button>
            </div>

            {subjectGrades.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-container/40 border border-border-subtle text-center space-y-2">
                <Award className="w-8 h-8 text-amber-600/40 mx-auto" />
                <p className="text-xs font-mono text-on-surface-variant">
                  {locale === "ar"
                    ? `لا توجد تقييمات مسجلة لمادة ${subject.name}`
                    : `No assessments logged for ${subject.name}`}
                </p>
                <button
                  onClick={() => onOpenAddGrade(subject.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-600 hover:underline pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {locale === "ar"
                      ? "سجل أول كويز أو امتحان رئيسي"
                      : "Record your first quiz or big exam"}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {subjectGrades.map((g) => {
                  const pct = calculateGradePercentage(
                    g.mark_achieved,
                    g.mark_total
                  );
                  const isQuiz = g.type === "quiz";

                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-xl bg-surface-container-high/40 border border-border-subtle hover:border-border-medium transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isQuiz ? (
                          <span
                            className="w-3 h-3 rounded-full bg-amber-400 shrink-0"
                            title={locale === "ar" ? "كويز" : "Quiz"}
                          />
                        ) : (
                          <span
                            className="w-3 h-3 rotate-45 bg-indigo-400 shrink-0"
                            title={locale === "ar" ? "امتحان رئيسي" : "Big Exam"}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-on-surface truncate">
                              {g.title}
                            </h4>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                                isQuiz
                                  ? "bg-amber-400/10 text-amber-700"
                                  : "bg-indigo-400/10 text-indigo-700"
                              }`}
                            >
                              {isQuiz
                                ? locale === "ar"
                                  ? "كويز"
                                  : "Quiz"
                                : locale === "ar"
                                ? "امتحان رئيسي"
                                : "Big Exam"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted mt-0.5">
                            <span>{g.entry_date}</span>
                            {g.weight_pct !== null &&
                              g.weight_pct !== undefined && (
                                <span>
                                  • {locale === "ar" ? "الوزن:" : "Weight:"} {g.weight_pct}%
                                </span>
                              )}
                            {g.note && (
                              <span className="truncate max-w-[150px] italic">
                                • &ldquo;{g.note}&rdquo;
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-end">
                          <div className="text-sm font-bold font-mono text-on-surface">
                            {pct}%
                          </div>
                          <div className="text-[10px] font-mono text-text-muted">
                            {g.mark_achieved} / {g.mark_total}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 border-l border-border-subtle pl-2 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2">
                          <button
                            onClick={() => onOpenEditGrade(g)}
                            className="p-1 rounded text-text-muted hover:text-on-surface hover:bg-surface-container transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteGrade(g.id)}
                            className="p-1 rounded text-text-muted hover:text-crimson-alert hover:bg-surface-container transition-colors"
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
        </div>

        {/* Footer Actions (Lifecycle: Archive / Delete Safeguard) */}
        <div className="p-4 border-t border-border-subtle bg-surface-container-high/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onArchiveSubject(subject.id, !subject.archived)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-container text-xs font-mono text-text-muted hover:text-on-surface hover:border-border-medium transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                {subject.archived
                  ? locale === "ar"
                    ? "استعادة للمواد النشطة"
                    : "Restore to Active"
                  : locale === "ar"
                  ? "أرشفة المادة"
                  : "Archive"}
              </span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crimson-alert/30 bg-crimson-alert/10 text-xs font-mono text-crimson-alert hover:bg-crimson-alert/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "حذف" : "Delete"}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-mono text-text-muted hover:text-on-surface transition-colors"
          >
            {locale === "ar" ? "إغلاق" : "Close"}
          </button>
        </div>

        {/* Delete Safeguard Confirmation Modal */}
        {deleteSafeguardModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-md bg-surface-container border border-border-medium rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold font-mono text-on-surface">
                  {locale === "ar" ? "المادة دي مسجل ليها درجات سابقة" : "Subject Has Recorded Grades"}
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {locale === "ar" ? (
                  <>
                    المادة دي فيها <strong>{subjectGrades.length} درجات مسجلة</strong>.
                    حذفها نهائياً هيمسح تاريخك الأكاديمي.
                    <br /><br />
                    هنقوم <strong>بأرشفتها بدل الحذف</strong> عشان نحافظ على درجاتك ومعدلك التراكمي وتختفي من قائمة المواد الحالية.
                  </>
                ) : (
                  <>
                    This subject has <strong>{subjectGrades.length} recorded grades</strong>.
                    Deleting it directly would erase your academic history.
                    <br /><br />
                    We will <strong>archive it instead</strong> so your grades and historical averages are safely preserved while hiding it from active terms.
                  </>
                )}
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  onClick={() => setDeleteSafeguardModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-text-muted hover:text-on-surface transition-colors"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleConfirmSafeguardArchive}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-semibold uppercase hover:bg-amber-400 transition-colors shadow-md"
                >
                  {locale === "ar" ? "أرشفة المادة بأمان" : "Archive Subject Safely"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
