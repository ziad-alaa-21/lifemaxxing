"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  SubjectItem,
  GradeItem,
  DeadlineItem,
  calculateSubjectGradeAverage,
  calculateOverallAcademicStats,
  classifyDeadline,
  calculateGradePercentage,
  findNearestDeadline,
  PROHIBITED_COLOR,
} from "@/lib/school";
import { SubjectModal } from "@/components/school/SubjectModal";
import { GradeModal } from "@/components/school/GradeModal";
import { DeadlineModal } from "@/components/school/DeadlineModal";
import { SubjectDetailModal } from "@/components/school/SubjectDetailModal";
import { UltradianTimer } from "@/components/mind/UltradianTimer";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  GraduationCap,
  BookOpen,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  Archive,
  RotateCcw,
  Award,
  CalendarClock,
  CheckCircle2,
  Play,
  Filter,
  Check,
  ChevronDown,
  X,
  Search,
  Edit2,
  Trash2,
} from "lucide-react";

type SchoolTab = "overview" | "grades" | "deadlines";

interface DeletedItemSnapshot {
  type: "grade" | "deadline" | "subject";
  item: GradeItem | DeadlineItem | SubjectItem;
  timeoutId: NodeJS.Timeout;
}

export function SchoolView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const { isOnline, isBlocked } = useOnlineGuard();

  // Tab State via URL query param
  const activeTab: SchoolTab =
    (searchParams.get("tab") as SchoolTab) || "overview";

  const handleTabChange = (tab: SchoolTab) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/school?${params.toString()}`);
    });
  };

  // Core Data
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeItem | null>(null);
  const [preselectedGradeSubjectId, setPreselectedGradeSubjectId] = useState<string>("");

  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineItem | null>(null);
  const [preselectedDeadlineSubjectId, setPreselectedDeadlineSubjectId] = useState<string>("");

  const [detailSubject, setDetailSubject] = useState<SubjectItem | null>(null);

  // Focus Timer Study Link Modal
  const [studySubject, setStudySubject] = useState<SubjectItem | null>(null);

  // Filters State
  const [gradeSubjectFilter, setGradeSubjectFilter] = useState<string>("all");
  const [gradeTypeFilter, setGradeTypeFilter] = useState<string>("all");
  const [deadlineStatusFilter, setDeadlineStatusFilter] = useState<string>("active");
  const [deadlineTypeFilter, setDeadlineTypeFilter] = useState<string>("all");

  // Archived subjects drawer state
  const [showArchived, setShowArchived] = useState(false);

  // 5-second Undo Toast State
  const [undoSnapshot, setUndoSnapshot] = useState<DeletedItemSnapshot | null>(null);

  // 1. Fetch All Academic Data
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [subRes, grRes, dlRes] = await Promise.all([
        supabase
          .from("subjects")
          .select("*")
          .is("deleted_at", null)
          .order("name", { ascending: true }),
        supabase
          .from("grades")
          .select("*")
          .is("deleted_at", null)
          .order("entry_date", { ascending: false }),
        supabase
          .from("deadlines")
          .select("*")
          .is("deleted_at", null)
          .order("due_date", { ascending: true }),
      ]);

      if (subRes.error) throw subRes.error;
      if (grRes.error) throw grRes.error;
      if (dlRes.error) throw dlRes.error;

      setSubjects(subRes.data || []);
      setGrades(grRes.data || []);
      setDeadlines(dlRes.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load school data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // 2. Subject Mutation Handlers
  async function handleSaveSubject(data: {
    name: string;
    code: string | null;
    color: string;
    target_grade: number | null;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to manage subjects.");

    if (editingSubject) {
      // Update
      const { error: err } = await supabase
        .from("subjects")
        .update({
          name: data.name,
          code: data.code,
          color: data.color,
          target_grade: data.target_grade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSubject.id)
        .eq("user_id", user.id);

      if (err) throw err;
    } else {
      // Insert
      const { error: err } = await supabase.from("subjects").insert([
        {
          user_id: user.id,
          name: data.name,
          code: data.code,
          color: data.color,
          target_grade: data.target_grade,
        },
      ]);

      if (err) throw err;
    }

    await loadData();
    setEditingSubject(null);
  }

  async function handleArchiveSubject(subjectId: string, archive: boolean) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase
      .from("subjects")
      .update({
        archived: archive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subjectId)
      .eq("user_id", user.id);

    if (err) {
      setError(err.message);
      return;
    }

    await loadData();
    if (detailSubject?.id === subjectId) {
      setDetailSubject((prev) => (prev ? { ...prev, archived: archive } : null));
    }
  }

  async function handleDeleteSubject(subjectId: string, archiveInstead: boolean) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (archiveInstead) {
      await handleArchiveSubject(subjectId, true);
      return;
    }

    // Soft delete
    const { error: err } = await supabase
      .from("subjects")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", subjectId)
      .eq("user_id", user.id);

    if (err) {
      setError(err.message);
      return;
    }

    await loadData();
    if (detailSubject?.id === subjectId) {
      setDetailSubject(null);
    }
  }

  // 3. Grade Mutation Handlers
  async function handleSaveGrade(data: {
    subject_id: string;
    type: "quiz" | "big_exam";
    title: string;
    mark_achieved: number;
    mark_total: number;
    weight_pct: number | null;
    entry_date: string;
    note: string | null;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to record grades.");

    if (editingGrade) {
      const { error: err } = await supabase
        .from("grades")
        .update({
          subject_id: data.subject_id,
          type: data.type,
          title: data.title,
          mark_achieved: data.mark_achieved,
          mark_total: data.mark_total,
          weight_pct: data.weight_pct,
          entry_date: data.entry_date,
          note: data.note,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingGrade.id)
        .eq("user_id", user.id);

      if (err) throw err;
    } else {
      const { error: err } = await supabase.from("grades").insert([
        {
          user_id: user.id,
          subject_id: data.subject_id,
          type: data.type,
          title: data.title,
          mark_achieved: data.mark_achieved,
          mark_total: data.mark_total,
          weight_pct: data.weight_pct,
          entry_date: data.entry_date,
          note: data.note,
        },
      ]);

      if (err) throw err;
    }

    await loadData();
    setEditingGrade(null);
  }

  async function handleDeleteGrade(gradeId: string) {
    const target = grades.find((g) => g.id === gradeId);
    if (!target) return;

    // Optimistic UI removal
    setGrades((prev) => prev.filter((g) => g.id !== gradeId));

    // Clear existing undo
    if (undoSnapshot) clearTimeout(undoSnapshot.timeoutId);

    // Set 5-second undo timer
    const timeoutId = setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("grades")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", gradeId)
          .eq("user_id", user.id);
      }
      setUndoSnapshot(null);
    }, 5000);

    setUndoSnapshot({
      type: "grade",
      item: target,
      timeoutId,
    });
  }

  // 4. Deadline Mutation Handlers
  async function handleSaveDeadline(data: {
    subject_id: string;
    type: "exam" | "quiz" | "assignment" | "project" | "reading";
    title: string;
    due_date: string;
    priority: "low" | "medium" | "high";
    notes: string | null;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to manage deadlines.");

    if (editingDeadline) {
      const { error: err } = await supabase
        .from("deadlines")
        .update({
          subject_id: data.subject_id,
          type: data.type,
          title: data.title,
          due_date: data.due_date,
          priority: data.priority,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingDeadline.id)
        .eq("user_id", user.id);

      if (err) throw err;
    } else {
      const { error: err } = await supabase.from("deadlines").insert([
        {
          user_id: user.id,
          subject_id: data.subject_id,
          type: data.type,
          title: data.title,
          due_date: data.due_date,
          priority: data.priority,
          notes: data.notes,
        },
      ]);

      if (err) throw err;
    }

    await loadData();
    setEditingDeadline(null);
  }

  async function handleToggleDeadlineComplete(deadlineId: string, completed: boolean) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setDeadlines((prev) =>
      prev.map((d) => (d.id === deadlineId ? { ...d, completed } : d))
    );

    const { error: err } = await supabase
      .from("deadlines")
      .update({
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deadlineId)
      .eq("user_id", user.id);

    if (err) {
      setError(err.message);
      await loadData();
    }
  }

  async function handleDeleteDeadline(deadlineId: string) {
    const target = deadlines.find((d) => d.id === deadlineId);
    if (!target) return;

    setDeadlines((prev) => prev.filter((d) => d.id !== deadlineId));

    if (undoSnapshot) clearTimeout(undoSnapshot.timeoutId);

    const timeoutId = setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("deadlines")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", deadlineId)
          .eq("user_id", user.id);
      }
      setUndoSnapshot(null);
    }, 5000);

    setUndoSnapshot({
      type: "deadline",
      item: target,
      timeoutId,
    });
  }

  // 5. Undo Action
  function handleUndo() {
    if (!undoSnapshot) return;
    clearTimeout(undoSnapshot.timeoutId);

    if (undoSnapshot.type === "grade") {
      setGrades((prev) => [undoSnapshot.item as GradeItem, ...prev]);
    } else if (undoSnapshot.type === "deadline") {
      setDeadlines((prev) => [undoSnapshot.item as DeadlineItem, ...prev]);
    }

    setUndoSnapshot(null);
  }

  // Active vs Archived subjects
  const activeSubjects = subjects.filter((s) => !s.archived);
  const archivedSubjects = subjects.filter((s) => s.archived);

  // Overall Semester Stats
  const overallStats = calculateOverallAcademicStats(activeSubjects, grades);

  // Nearest deadline for widget
  const nearestDl = findNearestDeadline(deadlines);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Offline Write Warning Banner */}
      {isBlocked && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-amber-300 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Offline: changes will sync once connection is restored. Saving is disabled to protect database integrity.</span>
          </div>
        </div>
      )}

      {/* 5-Second Undo Toast */}
      {undoSnapshot && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-container-high border border-amber-400/40 shadow-2xl text-xs font-mono">
          <span className="text-on-surface">
            {undoSnapshot.type === "grade" ? "Grade removed" : "Deadline removed"}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-surface font-bold hover:bg-amber-400 transition-colors uppercase tracking-wider text-[11px]"
          >
            <RotateCcw className="w-3 h-3 stroke-[3]" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Top Academic Header Banner */}
      <div className="bg-surface-container rounded-2xl p-5 sm:p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.2)]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-on-surface">
                  School Engine
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-high text-amber-300 border border-amber-500/20">
                  Stage 8a
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                Pure percentage marks, weighted coursework, deadlines & study link
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingSubject(null);
                setIsSubjectModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-surface text-xs font-mono font-semibold uppercase tracking-wider hover:bg-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>
      </div>

      {/* URL Tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-surface-container rounded-xl border border-border-subtle max-w-md">
        <button
          onClick={() => handleTabChange("overview")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize ${
            activeTab === "overview"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => handleTabChange("grades")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize ${
            activeTab === "grades"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          Grades ({grades.length})
        </button>
        <button
          onClick={() => handleTabChange("deadlines")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize ${
            activeTab === "deadlines"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          Deadlines ({deadlines.filter((d) => !d.completed).length})
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-3 text-crimson-alert text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Academic sync notice: {error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-16 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
          <span className="text-xs font-mono">Loading academic records...</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW                                                */}
      {/* ============================================================== */}
      {!loading && activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top Metric Cards: Semester Pure Percentage Average & Nearest Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Semester Average Card */}
            <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-2">
              <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                Semester Average
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-on-surface">
                  {overallStats.overallAveragePct !== null
                    ? `${overallStats.overallAveragePct}%`
                    : "—"}
                </span>
                <span className="text-xs font-mono text-amber-400">
                  {overallStats.gradedSubjectsCount} Graded Subjects
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {overallStats.totalGradesCount} total assessments recorded across active courses
              </p>
            </div>

            {/* Nearest Deadline Card (Integrated directly into Overview) */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-surface-container border border-border-subtle flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-on-surface-variant uppercase tracking-wider">
                  <CalendarClock className="w-4 h-4 text-amber-400" />
                  <span>Nearest Deadline</span>
                </div>
                {nearestDl && (
                  <button
                    onClick={() => handleTabChange("deadlines")}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    View All
                  </button>
                )}
              </div>

              {nearestDl ? (
                (() => {
                  const classification = classifyDeadline(nearestDl.due_date);
                  const sub = subjects.find((s) => s.id === nearestDl.subject_id);
                  return (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-high/50 border border-border-subtle">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() =>
                            handleToggleDeadlineComplete(
                              nearestDl.id,
                              !nearestDl.completed
                            )
                          }
                          className="text-text-muted hover:text-amber-400 transition-colors"
                        >
                          <CheckCircle2 className="w-5 h-5 text-text-muted" />
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-on-surface truncate">
                              {nearestDl.title}
                            </span>
                            {sub && (
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded text-surface font-semibold shrink-0"
                                style={{ backgroundColor: sub.color || "#F59E0B" }}
                              >
                                {sub.name}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-text-muted capitalize">
                            {nearestDl.type} • Priority: {nearestDl.priority}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border font-semibold shrink-0 ${classification.badgeClass}`}
                      >
                        {classification.label}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <div className="p-3 text-center text-xs font-mono text-text-muted">
                  No upcoming deadlines recorded. You are fully caught up!
                </div>
              )}
            </div>
          </div>

          {/* Subjects Grid Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant px-1">
              <span>Active Subjects ({activeSubjects.length})</span>
              <button
                onClick={() => {
                  setEditingSubject(null);
                  setIsSubjectModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-amber-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>

            {activeSubjects.length === 0 ? (
              <div className="p-10 bg-surface-container rounded-2xl border border-border-subtle text-center space-y-3">
                <BookOpen className="w-10 h-10 text-amber-400/40 mx-auto" />
                <h3 className="text-base font-bold font-mono text-on-surface">
                  Register Your First Subject
                </h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Create subjects to start tracking quizzes, big exams, deadlines, and study hours.
                </p>
                <button
                  onClick={() => {
                    setEditingSubject(null);
                    setIsSubjectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-surface text-xs font-mono font-semibold uppercase hover:bg-amber-400 transition-all cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Subject</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeSubjects.map((sub) => {
                  const subGrades = grades.filter((g) => g.subject_id === sub.id);
                  const avgResult = calculateSubjectGradeAverage(subGrades);

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setDetailSubject(sub)}
                      className="p-4 rounded-2xl bg-surface-container border border-border-subtle hover:border-border-medium hover:bg-surface-container-high/30 transition-all cursor-pointer space-y-3 relative group"
                    >
                      {/* Top Bar: Color, Name, Code */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: sub.color || "#F59E0B" }}
                          />
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold font-mono text-on-surface truncate">
                              {sub.name}
                            </h3>
                            {sub.code && (
                              <span className="text-[11px] font-mono text-text-muted">
                                {sub.code}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Study Button (Focus Timer link) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudySubject(sub);
                          }}
                          title="Start Study Focus Session"
                          className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-amber-300" />
                        </button>
                      </div>

                      {/* Performance Readout */}
                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <div className="text-2xl font-extrabold font-mono text-on-surface">
                            {avgResult.averagePct !== null
                              ? `${avgResult.averagePct}%`
                              : "—"}
                          </div>
                          <span className="text-[10px] font-mono text-text-muted">
                            {avgResult.label}
                          </span>
                        </div>

                        {sub.target_grade !== null &&
                          sub.target_grade !== undefined && (
                            <div className="text-right">
                              <span className="text-[10px] font-mono text-text-muted block">
                                Target
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                {sub.target_grade}%
                              </span>
                            </div>
                          )}
                      </div>

                      {/* Footer: Grade Count & Pending Deadlines */}
                      <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                        <span>
                          {subGrades.length}{" "}
                          {subGrades.length === 1 ? "Assessment" : "Assessments"}
                        </span>
                        <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">
                          Open Details &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Archived Subjects Collapsible Section */}
          {archivedSubjects.length > 0 && (
            <div className="pt-4 border-t border-border-subtle space-y-3">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-xs font-mono text-text-muted hover:text-on-surface transition-colors"
              >
                <Archive className="w-4 h-4" />
                <span>
                  Archived Subjects ({archivedSubjects.length})
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showArchived ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showArchived && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {archivedSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl bg-surface-container-high/30 border border-border-subtle flex items-center justify-between gap-3 text-xs font-mono opacity-70"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color || "#78716C" }}
                        />
                        <span className="truncate text-on-surface font-medium">
                          {sub.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleArchiveSubject(sub.id, false)}
                        className="px-2.5 py-1 rounded-lg border border-border-subtle bg-surface-container text-[11px] text-amber-400 hover:border-amber-400 transition-colors"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GRADES (Unified Gradebook)                              */}
      {/* ============================================================== */}
      {!loading && activeTab === "grades" && (
        <div className="space-y-4">
          {/* Controls Bar: Filters & Add Grade Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-container rounded-2xl border border-border-subtle">
            <div className="flex flex-wrap items-center gap-2">
              {/* Subject Filter */}
              <select
                value={gradeSubjectFilter}
                onChange={(e) => setGradeSubjectFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Subjects</option>
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={gradeTypeFilter}
                onChange={(e) => setGradeTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Types</option>
                <option value="quiz">Quizzes Only</option>
                <option value="big_exam">Big Exams Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingGrade(null);
                setPreselectedGradeSubjectId("");
                setIsGradeModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-surface text-xs font-mono font-semibold uppercase hover:bg-amber-400 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Record Grade</span>
            </button>
          </div>

          {/* Grades List */}
          {(() => {
            const filteredGrades = grades.filter((g) => {
              if (
                gradeSubjectFilter !== "all" &&
                g.subject_id !== gradeSubjectFilter
              )
                return false;
              if (gradeTypeFilter !== "all" && g.type !== gradeTypeFilter)
                return false;
              return true;
            });

            if (filteredGrades.length === 0) {
              return (
                <div className="p-12 bg-surface-container rounded-2xl border border-border-subtle text-center space-y-3">
                  <Award className="w-10 h-10 text-amber-400/40 mx-auto" />
                  <h3 className="text-base font-bold font-mono text-on-surface">
                    No Grades Found
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                    {grades.length === 0
                      ? "Start logging quizzes and big exams to track your percentage scores."
                      : "No assessments match the active filter criteria."}
                  </p>
                  <button
                    onClick={() => {
                      setEditingGrade(null);
                      setPreselectedGradeSubjectId("");
                      setIsGradeModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-surface text-xs font-mono font-semibold uppercase hover:bg-amber-400 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Record Grade</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {filteredGrades.map((g) => {
                  const sub = subjects.find((s) => s.id === g.subject_id);
                  const pct = calculateGradePercentage(
                    g.mark_achieved,
                    g.mark_total
                  );
                  const isQuiz = g.type === "quiz";

                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-surface-container border border-border-subtle hover:border-border-medium transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isQuiz ? (
                          <span
                            className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0 shadow-sm"
                            title="Quiz"
                          />
                        ) : (
                          <span
                            className="w-3.5 h-3.5 rotate-45 bg-indigo-400 shrink-0 shadow-sm"
                            title="Big Exam"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-on-surface truncate">
                              {g.title}
                            </h4>
                            {sub && (
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded text-surface font-semibold shrink-0"
                                style={{ backgroundColor: sub.color || "#F59E0B" }}
                              >
                                {sub.name}
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                                isQuiz
                                  ? "bg-amber-400/10 text-amber-300"
                                  : "bg-indigo-400/10 text-indigo-300"
                              }`}
                            >
                              {isQuiz ? "Quiz" : "Big Exam"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted mt-0.5">
                            <span>{g.entry_date}</span>
                            {g.weight_pct !== null &&
                              g.weight_pct !== undefined && (
                                <span>• Weight: {g.weight_pct}%</span>
                              )}
                            {g.note && (
                              <span className="truncate max-w-[200px] italic">
                                • &ldquo;{g.note}&rdquo;
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-extrabold font-mono text-on-surface">
                            {pct}%
                          </div>
                          <div className="text-[10px] font-mono text-text-muted">
                            {g.mark_achieved} / {g.mark_total}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 border-l border-border-subtle pl-2">
                          <button
                            onClick={() => {
                              setEditingGrade(g);
                              setIsGradeModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGrade(g.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-crimson-alert hover:bg-surface-container-high transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DEADLINES                                               */}
      {/* ============================================================== */}
      {!loading && activeTab === "deadlines" && (
        <div className="space-y-4">
          {/* Controls Bar: Filters & Add Deadline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-container rounded-2xl border border-border-subtle">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deadlineStatusFilter}
                onChange={(e) => setDeadlineStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface focus:outline-none focus:border-amber-400"
              >
                <option value="active">Active Only</option>
                <option value="all">All Statuses</option>
                <option value="completed">Completed Only</option>
              </select>

              <select
                value={deadlineTypeFilter}
                onChange={(e) => setDeadlineTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Types</option>
                <option value="exam">Exams</option>
                <option value="quiz">Quizzes</option>
                <option value="assignment">Assignments</option>
                <option value="project">Projects</option>
                <option value="reading">Readings</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingDeadline(null);
                setPreselectedDeadlineSubjectId("");
                setIsDeadlineModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-surface text-xs font-mono font-semibold uppercase hover:bg-amber-400 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Deadline</span>
            </button>
          </div>

          {/* Deadlines List */}
          {(() => {
            const filteredDeadlines = deadlines.filter((d) => {
              if (deadlineStatusFilter === "active" && d.completed) return false;
              if (deadlineStatusFilter === "completed" && !d.completed) return false;
              if (deadlineTypeFilter !== "all" && d.type !== deadlineTypeFilter)
                return false;
              return true;
            });

            if (filteredDeadlines.length === 0) {
              return (
                <div className="p-12 bg-surface-container rounded-2xl border border-border-subtle text-center space-y-3">
                  <CalendarClock className="w-10 h-10 text-amber-400/40 mx-auto" />
                  <h3 className="text-base font-bold font-mono text-on-surface">
                    No Deadlines Found
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                    {deadlines.length === 0
                      ? "Track your exam dates, homework, and assignment due dates with timezone precision."
                      : "No deadlines match the selected filter."}
                  </p>
                  <button
                    onClick={() => {
                      setEditingDeadline(null);
                      setPreselectedDeadlineSubjectId("");
                      setIsDeadlineModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-surface text-xs font-mono font-semibold uppercase hover:bg-amber-400 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Deadline</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {filteredDeadlines.map((dl) => {
                  const sub = subjects.find((s) => s.id === dl.subject_id);
                  const classification = classifyDeadline(dl.due_date);

                  return (
                    <div
                      key={dl.id}
                      className="p-3.5 rounded-2xl bg-surface-container border border-border-subtle hover:border-border-medium transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() =>
                            handleToggleDeadlineComplete(dl.id, !dl.completed)
                          }
                          className="text-text-muted hover:text-amber-400 transition-colors"
                        >
                          <CheckCircle2
                            className={`w-5 h-5 ${
                              dl.completed
                                ? "text-emerald-400 fill-emerald-400/20"
                                : "text-text-muted"
                            }`}
                          />
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-semibold truncate ${
                                dl.completed
                                  ? "line-through text-text-muted"
                                  : "text-on-surface"
                              }`}
                            >
                              {dl.title}
                            </h4>
                            {sub && (
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded text-surface font-semibold shrink-0"
                                style={{ backgroundColor: sub.color || "#F59E0B" }}
                              >
                                {sub.name}
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle text-text-muted capitalize">
                              {dl.type}
                            </span>
                          </div>
                          {dl.notes && (
                            <p className="text-[11px] text-text-muted truncate mt-0.5 font-sans">
                              {dl.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-mono px-2.5 py-1 rounded-lg border font-semibold ${classification.badgeClass}`}
                        >
                          {classification.label}
                        </span>

                        <div className="flex items-center gap-1 border-l border-border-subtle pl-2">
                          <button
                            onClick={() => {
                              setEditingDeadline(dl);
                              setIsDeadlineModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeadline(dl.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-crimson-alert hover:bg-surface-container-high transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* ALL MODALS                                                     */}
      {/* ============================================================== */}

      {/* 1. Subject Create / Edit Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        onSave={handleSaveSubject}
        initialSubject={editingSubject}
        existingNames={subjects.map((s) => s.name)}
        isBlocked={isBlocked}
      />

      {/* 2. Grade Create / Edit Modal */}
      <GradeModal
        isOpen={isGradeModalOpen}
        onClose={() => {
          setIsGradeModalOpen(false);
          setEditingGrade(null);
        }}
        onSave={handleSaveGrade}
        subjects={activeSubjects}
        preselectedSubjectId={preselectedGradeSubjectId}
        initialGrade={editingGrade}
        isBlocked={isBlocked}
      />

      {/* 3. Deadline Create / Edit Modal */}
      <DeadlineModal
        isOpen={isDeadlineModalOpen}
        onClose={() => {
          setIsDeadlineModalOpen(false);
          setEditingDeadline(null);
        }}
        onSave={handleSaveDeadline}
        subjects={activeSubjects}
        preselectedSubjectId={preselectedDeadlineSubjectId}
        initialDeadline={editingDeadline}
        isBlocked={isBlocked}
      />

      {/* 4. Subject Detail Modal */}
      {detailSubject && (
        <SubjectDetailModal
          isOpen={Boolean(detailSubject)}
          onClose={() => setDetailSubject(null)}
          subject={detailSubject}
          grades={grades}
          deadlines={deadlines}
          onOpenAddGrade={(subjectId) => {
            setPreselectedGradeSubjectId(subjectId);
            setEditingGrade(null);
            setIsGradeModalOpen(true);
          }}
          onOpenEditGrade={(grade) => {
            setEditingGrade(grade);
            setIsGradeModalOpen(true);
          }}
          onDeleteGrade={handleDeleteGrade}
          onOpenEditSubject={(sub) => {
            setEditingSubject(sub);
            setIsSubjectModalOpen(true);
          }}
          onArchiveSubject={handleArchiveSubject}
          onDeleteSubject={handleDeleteSubject}
          onOpenStudySession={(sub) => {
            setStudySubject(sub);
          }}
          onToggleDeadlineComplete={handleToggleDeadlineComplete}
        />
      )}

      {/* 5. Study Session Modal (Focus Timer Link Reuse - No Second Timer) */}
      {studySubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg-darkest/90 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: studySubject.color || "#F59E0B" }}
                />
                <h3 className="text-base font-bold font-mono text-on-surface">
                  Study Session: {studySubject.name}
                </h3>
              </div>
              <button
                onClick={() => setStudySubject(null)}
                className="p-1 rounded-lg text-text-muted hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <UltradianTimer
              onSessionLogged={() => {
                setStudySubject(null);
                loadData();
              }}
              userTimezone={
                Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
              }
              initialSubjectId={studySubject.id}
              initialTaskCategory="Studying"
              initialTaskIntention={`Studying ${studySubject.name}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
