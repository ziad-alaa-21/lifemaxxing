"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  SubjectItem,
  GradeItem,
  DeadlineItem,
  MistakeItem,
  AcademicTopicItem,
  ScheduleItem,
  FocusSessionTelemetry,
  MistakeCause,
  RedoResult,
  calculateSubjectGradeAverage,
  calculateOverallAcademicStats,
  classifyDeadline,
  calculateGradePercentage,
  findNearestDeadline,
  calculateNextRedoDate,
  getConsecutiveCorrectRedos,
  calculateTopicNextReview,
  calculateMistakeStats,
  calculateTopicStats,
  filterOverdueTopicQueue,
  generate12WeekStudyHeatmap,
  generateAcademicInsights,
  PROHIBITED_COLOR,
} from "@/lib/school";
import { SubjectModal } from "@/components/school/SubjectModal";
import { GradeModal } from "@/components/school/GradeModal";
import { DeadlineModal } from "@/components/school/DeadlineModal";
import { SubjectDetailModal } from "@/components/school/SubjectDetailModal";
import { MistakeModal } from "@/components/school/MistakeModal";
import { MistakeRedoModal } from "@/components/school/MistakeRedoModal";
import { TopicModal } from "@/components/school/TopicModal";
import { BulkTopicModal } from "@/components/school/BulkTopicModal";
import { MistakesTab } from "@/components/school/MistakesTab";
import { TopicsTab } from "@/components/school/TopicsTab";
import { GradeTrendChart } from "@/components/school/GradeTrendChart";
import { TimetableGrid } from "@/components/school/TimetableGrid";
import { StudyAnalyticsTab } from "@/components/school/StudyAnalyticsTab";
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
  Calendar,
  CheckCircle2,
  Play,
  Filter,
  Check,
  ChevronDown,
  X,
  Search,
  Edit2,
  Trash2,
  BookX,
  BookmarkCheck,
  BarChart3,
  ListPlus,
  Flame,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/I18nContext";
import { useUserModules } from "@/lib/modules/UserModulesContext";
import { DisabledModuleFallback } from "@/components/modules/DisabledModuleFallback";

type SchoolTab = "overview" | "grades" | "plan" | "practice" | "timetable" | "stats";
type PracticeSubTab = "mistakes" | "topics";

interface DeletedItemSnapshot {
  type: "grade" | "deadline" | "subject" | "mistake" | "topic" | "schedule";
  item: GradeItem | DeadlineItem | SubjectItem | MistakeItem | AcademicTopicItem | ScheduleItem;
  timeoutId: NodeJS.Timeout;
}

export function SchoolView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { dict, locale } = useI18n();
  const { isModuleActive } = useUserModules();

  const { isOnline, isBlocked } = useOnlineGuard();

  // Tab State via URL query param
  const rawTab = searchParams.get("tab");
  let initialTab: SchoolTab = "overview";
  if (rawTab === "grades") initialTab = "grades";
  else if (rawTab === "plan" || rawTab === "deadlines") initialTab = "plan";
  else if (rawTab === "practice" || rawTab === "mistakes" || rawTab === "topics")
    initialTab = "practice";
  else if (rawTab === "timetable" || rawTab === "schedule") initialTab = "timetable";
  else if (rawTab === "stats" || rawTab === "analytics") initialTab = "stats";

  const [activeTab, setActiveTab] = useState<SchoolTab>(initialTab);
  const [practiceSubTab, setPracticeSubTab] = useState<PracticeSubTab>(
    rawTab === "topics" ? "topics" : "mistakes"
  );

  const handleTabChange = (tab: SchoolTab) => {
    setActiveTab(tab);
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
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [topics, setTopics] = useState<AcademicTopicItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSessionTelemetry[]>([]);
  const [userSettings, setUserSettings] = useState<{
    weekly_study_target_minutes?: number | null;
    first_day_of_week?: number | null;
  } | null>(null);
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

  // Mistake & Redo Modals
  const [isMistakeModalOpen, setIsMistakeModalOpen] = useState(false);
  const [editingMistake, setEditingMistake] = useState<MistakeItem | null>(null);
  const [isRedoModalOpen, setIsRedoModalOpen] = useState(false);
  const [activeRedoMistake, setActiveRedoMistake] = useState<MistakeItem | null>(null);

  // Topic Modals
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<AcademicTopicItem | null>(null);
  const [isBulkTopicModalOpen, setIsBulkTopicModalOpen] = useState(false);

  const [detailSubject, setDetailSubject] = useState<SubjectItem | null>(null);
  const [studySubject, setStudySubject] = useState<SubjectItem | null>(null);

  // Filters State for Grades & Deadlines
  const [gradeSubjectFilter, setGradeSubjectFilter] = useState<string>("all");
  const [gradeTypeFilter, setGradeTypeFilter] = useState<string>("all");
  const [deadlineStatusFilter, setDeadlineStatusFilter] = useState<string>("active");
  const [deadlineTypeFilter, setDeadlineTypeFilter] = useState<string>("all");

  // Archived subjects drawer state
  const [showArchived, setShowArchived] = useState(false);

  // 8-second Undo Toast State
  const [undoSnapshot, setUndoSnapshot] = useState<DeletedItemSnapshot | null>(null);

  // 1. Fetch All Academic Data
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [subRes, grRes, dlRes, misRes, topRes, schRes, focRes, setRes] = await Promise.all([
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
        supabase
          .from("mistakes")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("academic_topics")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("academic_schedule")
          .select("*")
          .is("deleted_at", null)
          .order("start_time", { ascending: true }),
        supabase
          .from("focus_sessions")
          .select("*")
          .is("deleted_at", null)
          .order("started_at", { ascending: false }),
        supabase
          .from("user_settings")
          .select("weekly_study_target_minutes, first_day_of_week")
          .limit(1),
      ]);

      if (subRes.error) throw subRes.error;
      if (grRes.error) throw grRes.error;
      if (dlRes.error) throw dlRes.error;
      if (misRes.error) throw misRes.error;
      if (topRes.error) throw topRes.error;

      setSubjects(subRes.data || []);
      setGrades(grRes.data || []);
      setDeadlines(dlRes.data || []);
      setMistakes(misRes.data || []);
      setTopics(topRes.data || []);
      if (schRes?.data) setSchedule(schRes.data);
      if (focRes?.data) setFocusSessions(focRes.data as any);
      if (setRes?.data && setRes.data[0]) setUserSettings(setRes.data[0]);
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
      .update({ archived: archive, updated_at: new Date().toISOString() })
      .eq("id", subjectId)
      .eq("user_id", user.id);

    if (err) setError(err.message);
    else await loadData();
  }

  async function handleDeleteSubject(subjectId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase
      .from("subjects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", subjectId)
      .eq("user_id", user.id);

    if (err) setError(err.message);
    else await loadData();
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
    if (!user) throw new Error("Please log in to manage grades.");

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

    setGrades((prev) => prev.filter((g) => g.id !== gradeId));

    if (undoSnapshot) clearTimeout(undoSnapshot.timeoutId);

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
    }, 8000);

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
    }, 8000);

    setUndoSnapshot({
      type: "deadline",
      item: target,
      timeoutId,
    });
  }

  // 5. Mistake Handlers (Stage 8b-1)
  async function handleSaveMistake(data: {
    subject_id: string;
    topic: string;
    question_context: string;
    error_made: string;
    correct_solution: string;
    cause: MistakeCause;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to manage mistakes.");

    if (editingMistake) {
      const { error: err } = await supabase
        .from("mistakes")
        .update({
          subject_id: data.subject_id,
          topic: data.topic,
          question_context: data.question_context,
          error_made: data.error_made,
          correct_solution: data.correct_solution,
          cause: data.cause,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMistake.id)
        .eq("user_id", user.id);

      if (err) throw err;
    } else {
      const { error: err } = await supabase.from("mistakes").insert([
        {
          user_id: user.id,
          subject_id: data.subject_id,
          topic: data.topic,
          question_context: data.question_context,
          error_made: data.error_made,
          correct_solution: data.correct_solution,
          cause: data.cause,
          resolved: false,
          redo_at: new Date().toISOString(),
          redo_history: [],
        },
      ]);

      if (err) throw err;
    }

    await loadData();
    setEditingMistake(null);
  }

  async function handleLogRedo(
    mistakeId: string,
    result: RedoResult,
    scratchpadNotes?: string
  ) {
    const target = mistakes.find((m) => m.id === mistakeId);
    if (!target) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to record redo.");

    const prevHistory = target.redo_history || [];
    const priorStreak = getConsecutiveCorrectRedos(prevHistory);
    const scheduling = calculateNextRedoDate(result, priorStreak);
    const newAttempt = {
      attempted_at: new Date().toISOString(),
      result,
      notes: scratchpadNotes || null,
    };
    const updatedHistory = [...prevHistory, newAttempt];

    // Optimistic UI update
    setMistakes((prev) =>
      prev.map((m) =>
        m.id === mistakeId
          ? {
              ...m,
              resolved: scheduling.isResolved,
              last_redo_result: result,
              redo_at: scheduling.nextRedoAt,
              redo_history: updatedHistory,
            }
          : m
      )
    );

    const { error: err } = await supabase
      .from("mistakes")
      .update({
        resolved: scheduling.isResolved,
        last_redo_result: result,
        redo_at: scheduling.nextRedoAt,
        redo_history: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mistakeId)
      .eq("user_id", user.id);

    if (err) {
      setError(err.message);
      await loadData();
    }
  }

  async function handleDeleteMistake(mistakeId: string) {
    const target = mistakes.find((m) => m.id === mistakeId);
    if (!target) return;

    setMistakes((prev) => prev.filter((m) => m.id !== mistakeId));

    if (undoSnapshot) clearTimeout(undoSnapshot.timeoutId);

    const timeoutId = setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("mistakes")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", mistakeId)
          .eq("user_id", user.id);
      }
      setUndoSnapshot(null);
    }, 8000);

    setUndoSnapshot({
      type: "mistake",
      item: target,
      timeoutId,
    });
  }

  // 6. Topic Handlers (Stage 8b-1)
  async function handleSaveTopic(data: {
    subject_id: string;
    name: string;
    confidence: number;
    notes: string | null;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to manage topics.");

    if (editingTopic) {
      const { error: err } = await supabase
        .from("academic_topics")
        .update({
          subject_id: data.subject_id,
          name: data.name,
          confidence: data.confidence,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTopic.id)
        .eq("user_id", user.id);

      if (err) throw err;
    } else {
      const { error: err } = await supabase.from("academic_topics").insert([
        {
          user_id: user.id,
          subject_id: data.subject_id,
          name: data.name,
          confidence: data.confidence,
          notes: data.notes,
          review_count: 0,
          last_reviewed_at: null,
          next_review_at: null,
          review_history: [],
        },
      ]);

      if (err) throw err;
    }

    await loadData();
    setEditingTopic(null);
  }

  async function handleSaveBulkTopics(subjectId: string, topicNames: string[]) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to import topics.");

    const rows = topicNames.map((name) => ({
      user_id: user.id,
      subject_id: subjectId,
      name,
      confidence: 1,
      review_count: 0,
      last_reviewed_at: null,
      next_review_at: null,
      review_history: [],
    }));

    const { error: err } = await supabase.from("academic_topics").insert(rows);
    if (err) throw err;

    await loadData();
  }

  async function handleQuickReviewTopic(topicId: string, confidence: number) {
    const target = topics.find((t) => t.id === topicId);
    if (!target) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to record review.");

    const currentInterval =
      target.current_interval_days ||
      (target.review_history && target.review_history.length > 0
        ? target.review_history[target.review_history.length - 1].interval_days
        : 1);
    const scheduling = calculateTopicNextReview(
      confidence,
      currentInterval,
      target.review_count || 0
    );
    const newAttempt = {
      reviewed_at: new Date().toISOString(),
      confidence,
      interval_days: scheduling.nextIntervalDays,
    };
    const updatedHistory = [...(target.review_history || []), newAttempt];

    // Optimistic UI update
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              confidence,
              current_interval_days: scheduling.nextIntervalDays,
              review_count: scheduling.nextReviewCount,
              last_reviewed_at: newAttempt.reviewed_at,
              next_review_at: scheduling.nextReviewAt,
              review_history: updatedHistory,
            }
          : t
      )
    );

    const updatePayload: Record<string, unknown> = {
      confidence,
      review_count: scheduling.nextReviewCount,
      last_reviewed_at: newAttempt.reviewed_at,
      next_review_at: scheduling.nextReviewAt,
      review_history: updatedHistory,
      updated_at: new Date().toISOString(),
    };
    if (target.current_interval_days !== undefined) {
      updatePayload.current_interval_days = scheduling.nextIntervalDays;
    }

    const { error: err } = await supabase
      .from("academic_topics")
      .update(updatePayload)
      .eq("id", topicId)
      .eq("user_id", user.id);

    if (err) {
      setError(err.message);
      await loadData();
    }
  }

  async function handleDeleteTopic(topicId: string) {
    const target = topics.find((t) => t.id === topicId);
    if (!target) return;

    setTopics((prev) => prev.filter((t) => t.id !== topicId));

    if (undoSnapshot) clearTimeout(undoSnapshot.timeoutId);

    const timeoutId = setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("academic_topics")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", topicId)
          .eq("user_id", user.id);
      }
      setUndoSnapshot(null);
    }, 8000);

    setUndoSnapshot({
      type: "topic",
      item: target,
      timeoutId,
    });
  }

  // 7. Undo Action
  function handleUndo() {
    if (!undoSnapshot) return;
    clearTimeout(undoSnapshot.timeoutId);

    if (undoSnapshot.type === "grade") {
      setGrades((prev) => [undoSnapshot.item as GradeItem, ...prev]);
    } else if (undoSnapshot.type === "deadline") {
      setDeadlines((prev) => [undoSnapshot.item as DeadlineItem, ...prev]);
    } else if (undoSnapshot.type === "mistake") {
      setMistakes((prev) => [undoSnapshot.item as MistakeItem, ...prev]);
    } else if (undoSnapshot.type === "topic") {
      setTopics((prev) => [undoSnapshot.item as AcademicTopicItem, ...prev]);
    } else if (undoSnapshot.type === "schedule") {
      setSchedule((prev) => [undoSnapshot.item as ScheduleItem, ...prev]);
    }

    setUndoSnapshot(null);
  }

  // Schedule & Analytics Handlers
  async function handleAddScheduleSession(payload: any) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to manage timetable.");
    const { data, error } = await supabase
      .from("academic_schedule")
      .insert({
        ...payload,
        user_id: user.id,
      })
      .select();
    if (error) throw error;
    if (data && data[0]) {
      setSchedule((prev) => [...prev, data[0]]);
    }
  }

  async function handleEditScheduleSession(id: string, payload: any) {
    const { data, error } = await supabase
      .from("academic_schedule")
      .update(payload)
      .eq("id", id)
      .select();
    if (error) throw error;
    if (data && data[0]) {
      setSchedule((prev) => prev.map((s) => (s.id === id ? data[0] : s)));
    }
  }

  function handleDeleteScheduleSession(id: string) {
    const target = schedule.find((s) => s.id === id);
    if (!target) return;
    setSchedule((prev) => prev.filter((s) => s.id !== id));
    const timeoutId = setTimeout(async () => {
      await supabase
        .from("academic_schedule")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      setUndoSnapshot((curr) => (curr?.item.id === id ? null : curr));
    }, 8000);
    setUndoSnapshot({
      type: "schedule",
      item: target,
      timeoutId,
    });
  }

  async function handleUpdateWeeklyTarget(minutes: number | null) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to update targets.");
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, weekly_study_target_minutes: minutes },
        { onConflict: "user_id" }
      );
    if (error) throw error;
    setUserSettings((prev) => ({ ...prev, weekly_study_target_minutes: minutes }));
  }

  // Active vs Archived subjects
  const activeSubjects = subjects.filter((s) => !s.archived);
  const archivedSubjects = subjects.filter((s) => s.archived);

  // Analytics Derivations
  const heatmapData = generate12WeekStudyHeatmap(
    focusSessions,
    userSettings?.weekly_study_target_minutes,
    new Date(),
    userSettings?.first_day_of_week ?? 0
  );

  const academicInsights = generateAcademicInsights({
    subjects,
    grades,
    deadlines,
    topics,
    sessions: focusSessions,
  });

  // Overall Academic Stats
  const overallStats = calculateOverallAcademicStats(activeSubjects, grades);

  // Nearest deadline for widget
  const nearestDl = findNearestDeadline(deadlines);

  // Priority Due counts (excludes archived subjects)
  const activeSubjectIdSet = new Set(activeSubjects.map((s) => s.id));
  const nowMs = Date.now();
  const dueMistakesCount = mistakes.filter(
    (m) =>
      !m.deleted_at &&
      activeSubjectIdSet.has(m.subject_id) &&
      (!m.resolved || (m.redo_at && new Date(m.redo_at).getTime() <= nowMs))
  ).length;

  const dueTopicsCount = topics.filter(
    (t) =>
      !t.deleted_at &&
      activeSubjectIdSet.has(t.subject_id) &&
      t.next_review_at &&
      new Date(t.next_review_at).getTime() <= nowMs
  ).length;

  const duePracticeTotal = dueMistakesCount + dueTopicsCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Offline Write Warning Banner */}
      {isBlocked && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-amber-700 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {locale === "ar"
                ? "غير متصل بالإنترنت: تم إيقاف الحفظ لمنع تعارض البيانات."
                : "Offline: saving disabled to protect sync integrity."}
            </span>
          </div>
        </div>
      )}

      {/* 8-Second Floating Undo Toast */}
      {undoSnapshot && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-container-high border border-amber-400/40 shadow-2xl text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-on-surface">
            {undoSnapshot.type === "grade"
              ? locale === "ar" ? "تم حذف التقييم" : "Assessment deleted"
              : undoSnapshot.type === "deadline"
              ? locale === "ar" ? "تم حذف موعد التسليم" : "Deadline deleted"
              : undoSnapshot.type === "mistake"
              ? locale === "ar" ? "تم حذف الخطأ" : "Mistake deleted"
              : undoSnapshot.type === "topic"
              ? locale === "ar" ? "تم حذف المفهوم" : "Topic deleted"
              : locale === "ar" ? "تم الحذف" : "Item deleted"}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-on-primary font-bold hover:bg-amber-400 transition-colors uppercase tracking-wider text-[11px] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 stroke-[3]" />
            <span>{locale === "ar" ? "تراجع (8 ث)" : "Undo (8s)"}</span>
          </button>
        </div>
      )}

      {/* Top Academic Header Banner */}
      <div className="stitch-card p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-on-surface">
                  {locale === "ar" ? "محرك الدراسة والتحصيل" : "School Engine"}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-high text-amber-700 border border-amber-500/20">
                  {locale === "ar" ? "المرحلة 8" : "Stage 8"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                {locale === "ar"
                  ? "حساب النسب، استرجاع الأخطاء، والتكرار المتباعد للمفاهيم"
                  : "Pure percentages, active-recall mistakes & spaced repetition topics"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingSubject(null);
                setIsSubjectModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-semibold uppercase tracking-wider hover:bg-amber-400 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{dict.school.addSubject}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Group Consolidated Mobile Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl border border-border-subtle overflow-x-auto">
        <button
          onClick={() => handleTabChange("overview")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          {dict.school.overview}
        </button>
        <button
          onClick={() => handleTabChange("grades")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize whitespace-nowrap cursor-pointer ${
            activeTab === "grades"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          {dict.school.grades} ({grades.length})
        </button>
        <button
          onClick={() => handleTabChange("plan")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize whitespace-nowrap cursor-pointer ${
            activeTab === "plan"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          {dict.school.plan} ({deadlines.filter((d) => !d.completed).length})
        </button>
        <button
          onClick={() => handleTabChange("practice")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "practice"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <span>{dict.school.practice}</span>
          {duePracticeTotal > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => handleTabChange("timetable")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize whitespace-nowrap cursor-pointer ${
            activeTab === "timetable"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          {dict.school.timetable} ({schedule.filter((s) => !s.deleted_at).length})
        </button>
        <button
          onClick={() => handleTabChange("stats")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono transition-all capitalize whitespace-nowrap cursor-pointer ${
            activeTab === "stats"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 font-semibold shadow-sm"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          {locale === "ar" ? "الإحصائيات" : "Stats"}
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-3 text-crimson-alert text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{locale === "ar" ? "تنبيه المزامنة:" : "Academic sync notice:"} {error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-16 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
          <span className="text-xs font-mono">
            {locale === "ar" ? "جاري تحميل السجلات الدراسية..." : "Loading academic records..."}
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW                                                */}
      {/* ============================================================== */}
      {!loading && activeTab === "overview" && (
        <div className="space-y-6">
          {/* Due Today Unified Priority Banner */}
          {duePracticeTotal > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-surface-container to-indigo-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 shrink-0">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-bold font-mono text-on-surface">
                    {locale === "ar"
                      ? `مطلوب تركيزك النهاردة: ${dueMistakesCount} تصحيح أخطاء • ${dueTopicsCount} مراجعة مفاهيم`
                      : `Action Required Today: ${dueMistakesCount} Mistake Redo(s) • ${dueTopicsCount} Topic Review(s)`}
                  </div>
                  <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                    {locale === "ar"
                      ? "ثبّت معلوماتك بالاسترجاع النشط وفترات التكرار المتباعد لايتنر"
                      : "Reinforce learning using active-recall and Leitner spaced intervals"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {dueMistakesCount > 0 && (
                  <button
                    onClick={() => {
                      setPracticeSubTab("mistakes");
                      handleTabChange("practice");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-bold uppercase hover:bg-amber-400 transition-all cursor-pointer shadow-sm"
                  >
                    {locale === "ar" ? "حل الأخطاء تاني" : "Redo Mistakes"}
                  </button>
                )}
                {dueTopicsCount > 0 && (
                  <button
                    onClick={() => {
                      setPracticeSubTab("topics");
                      handleTabChange("practice");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-mono font-bold uppercase hover:bg-indigo-400 transition-all cursor-pointer shadow-sm"
                  >
                    {locale === "ar" ? "راجع المفاهيم" : "Review Topics"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Average Across Subjects Card */}
            <div className="stitch-card p-4 space-y-2">
              <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                {locale === "ar" ? "المعدل التراكمي للمواد (غير موزون)" : "Average across subjects (unweighted)"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-on-surface">
                  {overallStats.overallAveragePct !== null
                    ? `${overallStats.overallAveragePct}%`
                    : "—"}
                </span>
                <span className="text-xs font-mono text-amber-600">
                  {overallStats.gradedSubjectsCount} {locale === "ar" ? "مادة مقيمة" : "Graded Subjects"}
                </span>
              </div>
              <p className="text-[11px] text-text-muted font-mono">
                {locale === "ar"
                  ? `إجمالي ${overallStats.totalGradesCount} تقييم متسجل في المواد النشطة`
                  : `${overallStats.totalGradesCount} total assessments recorded across active courses`}
              </p>
            </div>

            {/* Nearest Deadline Card */}
            <div className="stitch-card p-4 space-y-2">
              <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                {locale === "ar" ? "أقرب موعد تسليم" : "Upcoming Deadline"}
              </span>
              {nearestDl ? (
                <div className="space-y-1">
                  <div className="text-base font-bold font-mono text-on-surface truncate">
                    {nearestDl.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-amber-700 font-semibold border border-amber-500/20 uppercase text-[10px]">
                      {nearestDl.type}
                    </span>
                    <span className="text-text-muted">
                      {classifyDeadline(nearestDl.due_date).label}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-text-muted pt-2">
                  {locale === "ar" ? "مفيش مواعيد تسليم قادمة" : "No upcoming deadlines pending"}
                </div>
              )}
            </div>

            {/* Practice Retention Quick Card */}
            <div className="stitch-card p-4 space-y-2">
              <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                {locale === "ar" ? "مركز التكرار والتثبيت" : "Practice Retention Hub"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-on-surface">
                  {mistakes.length}
                </span>
                <span className="text-xs font-mono text-amber-600">
                  {locale === "ar" ? "أخطاء" : "Mistakes"}
                </span>
                <span className="text-text-muted font-mono">•</span>
                <span className="text-3xl font-extrabold font-mono text-on-surface">
                  {topics.length}
                </span>
                <span className="text-xs font-mono text-indigo-600">
                  {locale === "ar" ? "مفاهيم" : "Topics"}
                </span>
              </div>
              <p className="text-[11px] text-text-muted font-mono">
                {locale === "ar"
                  ? `${duePracticeTotal} عنصر مستحق النهاردة للتثبيت والمراجعة`
                  : `${duePracticeTotal} item(s) due today for active retrieval practice`}
              </p>
            </div>
          </div>

          {/* Active Courses Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold font-mono text-on-surface uppercase tracking-wider">
                {locale === "ar"
                  ? `المواد المسجلة (${activeSubjects.length})`
                  : `Enrolled Subjects (${activeSubjects.length})`}
              </h2>
              <button
                onClick={() => {
                  setEditingSubject(null);
                  setIsSubjectModalOpen(true);
                }}
                className="text-xs font-mono text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "مادة جديدة" : "New Subject"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeSubjects.map((sub) => {
                const subGrades = grades.filter((g) => g.subject_id === sub.id);
                const subDeadlines = deadlines.filter(
                  (d) => d.subject_id === sub.id && !d.completed
                );
                const avgResult = calculateSubjectGradeAverage(subGrades);

                return (
                  <div
                    key={sub.id}
                    onClick={() => setDetailSubject(sub)}
                    className="stitch-card p-4 hover:border-border-medium transition-all cursor-pointer space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color || "#F59E0B" }}
                        />
                        <div>
                          <h3 className="text-sm font-bold font-mono text-on-surface">
                            {sub.name}
                          </h3>
                          {sub.code && (
                            <span className="text-[10px] text-text-muted font-mono">
                              {sub.code}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="text-base font-extrabold font-mono text-on-surface">
                          {avgResult.averagePct !== null
                            ? `${avgResult.averagePct}%`
                            : "—"}
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">
                          {avgResult.isWeighted
                            ? locale === "ar" ? "موزون" : "Weighted"
                            : locale === "ar" ? "غير موزون" : "Unweighted"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-border-subtle/50 text-text-muted">
                      <span>
                        {subGrades.length} {locale === "ar" ? "تقييم" : "assessment(s)"}
                      </span>
                      <span>
                        {subDeadlines.length} {locale === "ar" ? "موعد تسليم" : "active deadline(s)"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudySubject(sub);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-high text-amber-700 hover:bg-amber-500/20 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-amber-700" />
                        <span>{locale === "ar" ? "ذاكر" : "Study"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Chart Preview */}
          <div className="stitch-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-mono text-on-surface">
                  {locale === "ar" ? "مسار الأداء الدراسي" : "Academic Performance Trend"}
                </h3>
                <p className="text-xs font-mono text-text-muted mt-0.5">
                  {locale === "ar"
                    ? "تطور الدرجات: كويز (دائرة) مقارنة بامتحان رئيسي (معين)"
                    : "Quiz (circle) vs Big Exam (diamond) score progression"}
                </p>
              </div>
            </div>
            <GradeTrendChart grades={grades} />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GRADES                                                  */}
      {/* ============================================================== */}
      {!loading && activeTab === "grades" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={gradeSubjectFilter}
                onChange={(e) => setGradeSubjectFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-container border border-border-subtle rounded-xl text-xs font-mono text-on-surface focus:outline-none"
              >
                <option value="all">{locale === "ar" ? "كل المواد" : "All Subjects"}</option>
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={gradeTypeFilter}
                onChange={(e) => setGradeTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-container border border-border-subtle rounded-xl text-xs font-mono text-on-surface focus:outline-none"
              >
                <option value="all">{locale === "ar" ? "كل الأنواع" : "All Types"}</option>
                <option value="quiz">{locale === "ar" ? "كويزات بس" : "Quizzes Only"}</option>
                <option value="big_exam">{locale === "ar" ? "امتحانات رئيسية بس" : "Big Exams Only"}</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingGrade(null);
                setPreselectedGradeSubjectId("");
                setIsGradeModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-bold uppercase hover:bg-amber-400 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{locale === "ar" ? "سجل درجة" : "Record Grade"}</span>
            </button>
          </div>

          {/* Grades Table / Card List */}
          <div className="space-y-2.5">
            {grades
              .filter((g) => {
                if (gradeSubjectFilter !== "all" && g.subject_id !== gradeSubjectFilter)
                  return false;
                if (gradeTypeFilter !== "all" && g.type !== gradeTypeFilter)
                  return false;
                return true;
              })
              .map((g) => {
                const sub = subjects.find((s) => s.id === g.subject_id);
                const pct = calculateGradePercentage(g.mark_achieved, g.mark_total);

                return (
                  <div
                    key={g.id}
                    className="stitch-card p-3.5 flex items-center justify-between gap-3 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sub?.color || "#F59E0B" }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">{g.title}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                              g.type === "quiz"
                                ? "bg-amber-400/20 text-amber-700"
                                : "bg-indigo-400/20 text-indigo-700"
                            }`}
                          >
                            {g.type === "quiz"
                              ? locale === "ar" ? "كويز" : "Quiz"
                              : locale === "ar" ? "امتحان رئيسي" : "Big Exam"}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                          <span>{sub?.name}</span>
                          <span>•</span>
                          <span>{g.entry_date}</span>
                          {g.weight_pct !== null && (
                            <>
                              <span>•</span>
                              <span>
                                {locale === "ar" ? "الوزن النسبي:" : "Weight:"} {g.weight_pct}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-end">
                        <div className="text-sm font-extrabold text-on-surface">
                          {pct}%
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {g.mark_achieved} / {g.mark_total}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingGrade(g);
                            setIsGradeModalOpen(true);
                          }}
                          className="p-1 rounded text-text-muted hover:text-on-surface"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGrade(g.id)}
                          className="p-1 rounded text-text-muted hover:text-crimson-alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PLAN (DEADLINES)                                        */}
      {/* ============================================================== */}
      {!loading && activeTab === "plan" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono text-on-surface uppercase tracking-wider">
              {locale === "ar" ? "مواعيد التسليم والجدول الأكاديمي" : "Academic Deadlines & Schedule"}
            </h2>
            <button
              onClick={() => {
                setEditingDeadline(null);
                setPreselectedDeadlineSubjectId("");
                setIsDeadlineModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-on-primary text-xs font-mono font-bold uppercase hover:bg-amber-400 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{locale === "ar" ? "إضافة موعد تسليم" : "Add Deadline"}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {deadlines.map((d) => {
              const sub = subjects.find((s) => s.id === d.subject_id);
              const urgency = classifyDeadline(d.due_date);

              return (
                <div
                  key={d.id}
                  className={`p-3.5 rounded-xl bg-surface-container border flex items-center justify-between gap-3 font-mono text-xs transition-all ${
                    d.completed
                      ? "opacity-60 border-border-subtle"
                      : "border-border-subtle hover:border-border-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={d.completed}
                      onChange={(e) => handleToggleDeadlineComplete(d.id, e.target.checked)}
                      className="w-4 h-4 rounded border-border-medium bg-surface-container-high text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            d.completed ? "line-through text-text-muted" : "text-on-surface"
                          }`}
                        >
                          {d.title}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-high text-amber-700 uppercase font-semibold border border-border-subtle">
                          {d.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                        <span style={{ color: sub?.color || "#F59E0B" }}>
                          {sub?.name}
                        </span>
                        <span>•</span>
                        <span>{locale === "ar" ? "التسليم:" : "Due:"} {urgency.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingDeadline(d);
                        setIsDeadlineModalOpen(true);
                      }}
                      className="p-1 rounded text-text-muted hover:text-on-surface"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDeadline(d.id)}
                      className="p-1 rounded text-text-muted hover:text-crimson-alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PRACTICE (STAGE 8B-1)                                   */}
      {/* ============================================================== */}
      {!loading && activeTab === "practice" && (
        <div className="space-y-6">
          {/* Sub-Tab Selector: Mistakes vs Topics */}
          <div className="flex items-center bg-surface-container p-1 rounded-xl border border-border-subtle max-w-sm font-mono text-xs">
            <button
              onClick={() => setPracticeSubTab("mistakes")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                practiceSubTab === "mistakes"
                  ? "bg-amber-500/20 text-amber-700 font-bold border border-amber-500/30 shadow-xs"
                  : "text-text-muted hover:text-on-surface"
              }`}
            >
              <BookX className="w-3.5 h-3.5" />
              <span>
                {locale === "ar" ? "بنك الأخطاء" : "Mistakes"} ({mistakes.length})
              </span>
            </button>
            <button
              onClick={() => setPracticeSubTab("topics")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                practiceSubTab === "topics"
                  ? "bg-indigo-500/20 text-indigo-700 font-bold border border-indigo-500/30 shadow-xs"
                  : "text-text-muted hover:text-on-surface"
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>
                {locale === "ar" ? "المفاهيم" : "Topics"} ({topics.length})
              </span>
            </button>
          </div>

          {/* SubTab Content */}
          {practiceSubTab === "mistakes" ? (
            !isModuleActive("module_school") ? (
              <DisabledModuleFallback
                moduleKey="module_school"
                onEnabled={() => setPracticeSubTab("mistakes")}
              />
            ) : (
              <MistakesTab
                mistakes={mistakes}
                subjects={activeSubjects}
                onOpenAddModal={() => {
                  setEditingMistake(null);
                  setIsMistakeModalOpen(true);
                }}
                onOpenEditModal={(m) => {
                  setEditingMistake(m);
                  setIsMistakeModalOpen(true);
                }}
                onOpenRedoModal={(m) => {
                  setActiveRedoMistake(m);
                  setIsRedoModalOpen(true);
                }}
                onDeleteMistake={handleDeleteMistake}
              />
            )
          ) : (
            !isModuleActive("module_school") ? (
              <DisabledModuleFallback
                moduleKey="module_school"
                onEnabled={() => setPracticeSubTab("topics")}
              />
            ) : (
              <TopicsTab
                topics={topics}
                subjects={activeSubjects}
                onOpenAddModal={() => {
                  setEditingTopic(null);
                  setIsTopicModalOpen(true);
                }}
                onOpenBulkModal={() => {
                  setIsBulkTopicModalOpen(true);
                }}
                onOpenEditModal={(t) => {
                  setEditingTopic(t);
                  setIsTopicModalOpen(true);
                }}
                onQuickReview={handleQuickReviewTopic}
                onDeleteTopic={handleDeleteTopic}
              />
            )
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: TIMETABLE                                              */}
      {/* ============================================================== */}
      {!loading && activeTab === "timetable" && (
        !isModuleActive("module_school") ? (
          <DisabledModuleFallback
            moduleKey="module_school"
            onEnabled={() => handleTabChange("timetable")}
          />
        ) : (
          <TimetableGrid
            schedule={schedule}
            subjects={subjects}
            onAddSession={handleAddScheduleSession}
            onEditSession={handleEditScheduleSession}
            onDeleteSession={handleDeleteScheduleSession}
          />
        )
      )}

      {/* ============================================================== */}
      {/* TAB 6: STATS                                                  */}
      {/* ============================================================== */}
      {!loading && activeTab === "stats" && (
        <StudyAnalyticsTab
          subjects={subjects}
          sessions={focusSessions}
          weeklyTargetMinutes={userSettings?.weekly_study_target_minutes ?? null}
          heatmapData={heatmapData}
          insights={academicInsights}
          onUpdateTarget={handleUpdateWeeklyTarget}
          onNavigateTab={(tab) => handleTabChange(tab)}
          firstDayOfWeek={userSettings?.first_day_of_week ?? 0}
        />
      )}

      {/* ============================================================== */}
      {/* MODALS                                                         */}
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

      {/* 4. Mistake Create / Edit Modal */}
      <MistakeModal
        isOpen={isMistakeModalOpen}
        onClose={() => {
          setIsMistakeModalOpen(false);
          setEditingMistake(null);
        }}
        onSave={handleSaveMistake}
        subjects={activeSubjects}
        initialMistake={editingMistake}
        isBlocked={isBlocked}
      />

      {/* 5. Active-Recall Redo Modal */}
      {activeRedoMistake && (
        <MistakeRedoModal
          isOpen={isRedoModalOpen}
          onClose={() => {
            setIsRedoModalOpen(false);
            setActiveRedoMistake(null);
          }}
          mistake={activeRedoMistake}
          subject={subjects.find((s) => s.id === activeRedoMistake.subject_id)}
          onLogRedo={handleLogRedo}
        />
      )}

      {/* 6. Topic Create / Edit Modal */}
      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={() => {
          setIsTopicModalOpen(false);
          setEditingTopic(null);
        }}
        onSave={handleSaveTopic}
        subjects={activeSubjects}
        initialTopic={editingTopic}
        isBlocked={isBlocked}
      />

      {/* 7. Bulk Topic Add Modal */}
      <BulkTopicModal
        isOpen={isBulkTopicModalOpen}
        onClose={() => setIsBulkTopicModalOpen(false)}
        onSaveBulk={handleSaveBulkTopics}
        subjects={activeSubjects}
        existingTopics={topics}
        isBlocked={isBlocked}
      />

      {/* 8. Subject Detail Modal */}
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

      {/* 9. Study Session Modal (Focus Timer Link Reuse) */}
      {studySubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md">
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
