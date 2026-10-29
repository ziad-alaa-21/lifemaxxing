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
import { StudyTimerHeroCard } from "@/components/ui/StudyTimerHeroCard";
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
  TrendingUp,
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e2e8f9] text-[#45474b] text-xs font-semibold">
              {locale === "ar" ? "نظام الدراسة" : "Academic OS"}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#dbe1ff] text-[#003ea8] text-xs font-semibold">
              {locale === "ar" ? "الفصل الدراسي الحالي" : "Fall term 2024"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#151c28] tracking-tight">
            {locale === "ar" ? "الدراسة والمذاكرة" : "School"}
          </h1>
        </div>

        {/* Segmented Control Navigation */}
        <nav aria-label="School sections" className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-full border border-[#e2e8f9] shadow-xs max-w-full overflow-x-auto">
          <button
            onClick={() => handleTabChange("overview")}
            className={`py-2 px-4 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "bg-white text-[#151c28] shadow-xs font-bold"
                : "text-[#45474b] hover:text-[#151c28] font-medium"
            }`}
          >
            {locale === "ar" ? "المواد" : "Subjects"}
          </button>
          <button
            onClick={() => handleTabChange("timetable")}
            className={`py-2 px-4 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "timetable"
                ? "bg-white text-[#151c28] shadow-xs font-bold"
                : "text-[#45474b] hover:text-[#151c28] font-medium"
            }`}
          >
            {locale === "ar" ? "الجدول" : "Schedule"}
          </button>
          <button
            onClick={() => handleTabChange("plan")}
            className={`py-2 px-4 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "plan"
                ? "bg-white text-[#151c28] shadow-xs font-bold"
                : "text-[#45474b] hover:text-[#151c28] font-medium"
            }`}
          >
            {locale === "ar" ? "الخطة" : "Plan"}
          </button>
          <button
            onClick={() => handleTabChange("practice")}
            className={`py-2 px-4 rounded-full text-xs transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "practice"
                ? "bg-white text-[#151c28] shadow-xs font-bold"
                : "text-[#45474b] hover:text-[#151c28] font-medium"
            }`}
          >
            <span>{locale === "ar" ? "تدريب" : "Practice"}</span>
            {duePracticeTotal > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#0051d5] animate-pulse" />
            )}
          </button>
          <button
            onClick={() => handleTabChange("grades")}
            className={`py-2 px-4 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "grades"
                ? "bg-white text-[#151c28] shadow-xs font-bold"
                : "text-[#45474b] hover:text-[#151c28] font-medium"
            }`}
          >
            {locale === "ar" ? "الدرجات" : "Grades"}
          </button>
          <button
            onClick={() => handleTabChange("stats")}
            className={`py-2 px-4 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "stats"
                ? "bg-white text-[#151c28] shadow-xs font-bold"
                : "text-[#45474b] hover:text-[#151c28] font-medium"
            }`}
          >
            {locale === "ar" ? "الإحصائيات" : "Stats"}
          </button>
        </nav>
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
      {/* TAB 1: OVERVIEW (SUBJECTS)                                     */}
      {/* ============================================================== */}
      {!loading && activeTab === "overview" && (
        <div className="space-y-6">
          {/* Due Today Unified Priority Banner */}
          {duePracticeTotal > 0 && (
            <div className="p-4 rounded-2xl bg-[#fff7ed] border border-[#ffedd5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffedd5] border border-[#fed7aa] flex items-center justify-center text-[#c2410c] shrink-0">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#151c28]">
                    {locale === "ar"
                      ? `مطلوب تركيزك اليوم: ${dueMistakesCount} تصحيح أخطاء • ${dueTopicsCount} مراجعة موضوعات`
                      : `Action Required Today: ${dueMistakesCount} Mistake Redo(s) • ${dueTopicsCount} Topic Review(s)`}
                  </div>
                  <p className="text-xs text-[#45474b] mt-0.5">
                    {locale === "ar"
                      ? "ثبّت معلوماتك بالاسترجاع النشط وفترات التكرار المتباعد"
                      : "Reinforce learning using active-recall and Leitner spaced intervals"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("practice")}
                className="h-9 px-4 rounded-xl bg-[#000000] text-white text-xs font-semibold hover:bg-[#2a313d] transition-colors shrink-0 cursor-pointer"
              >
                {locale === "ar" ? "ابدأ التدريب" : "Start Practice"}
              </button>
            </div>
          )}

          {/* Active Study Dashboard & Focus Session Timer Hero Card */}
          <StudyTimerHeroCard
            activeSubjects={activeSubjects}
            focusSessions={focusSessions}
            locale={locale}
            onOpenStudyModal={setStudySubject}
          />

          {/* Section Heading: Current Subjects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#151c28]">
                  {locale === "ar" ? "المواد الحالية" : "Current subjects"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#0051d5] text-xs font-semibold border border-[#dce2f3]">
                  {activeSubjects.length} {locale === "ar" ? "نشطة" : "active"}
                </span>
              </div>
              <span className="text-xs text-[#45474b]">
                {locale === "ar" ? "مرتبة حسب الأولوية" : "Sorted by priority"}
              </span>
            </div>

            {/* Grid of Subject Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeSubjects.map((sub) => {
                const subGrades = grades.filter((g) => g.subject_id === sub.id);
                const subDeadlines = deadlines.filter((d) => d.subject_id === sub.id && !d.completed);
                const avgResult = calculateSubjectGradeAverage(subGrades);
                const nextDl = subDeadlines[0];

                return (
                  <div
                    key={sub.id}
                    onClick={() => setDetailSubject(sub)}
                    className="rounded-[20px] bg-white p-6 border border-[#e2e8f9] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#e2e8f9]"
                            style={{
                              backgroundColor: sub.color ? `${sub.color}15` : "#f0f3ff",
                              color: sub.color || "#0051d5",
                            }}
                          >
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#151c28] group-hover:text-[#0051d5] transition-colors">
                              {sub.name}
                            </h3>
                            {sub.code && (
                              <span className="text-[11px] text-[#717784]">{sub.code}</span>
                            )}
                          </div>
                        </div>

                        {nextDl ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#93000a] text-[10px] font-bold shrink-0">
                            {classifyDeadline(nextDl.due_date).label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#e7eeff] text-[#0051d5] text-[10px] font-bold shrink-0">
                            {locale === "ar" ? "منتظم" : "on track"}
                          </span>
                        )}
                      </div>

                      {/* Academic Metrics */}
                      <div className="pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-[#151c28]">
                            {avgResult.averagePct !== null ? `${avgResult.averagePct}%` : "—"}
                          </span>
                          <span className="text-xs text-[#45474b]">
                            {avgResult.averagePct !== null
                              ? locale === "ar" ? "متوسط الدرجات" : "average grade"
                              : locale === "ar" ? "لا درجات بعد" : "no grades yet"}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#e7eeff] overflow-hidden mt-2">
                          <div
                            className="h-full bg-[#0051d5] rounded-full transition-all"
                            style={{ width: `${avgResult.averagePct || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer / Context */}
                    <div className="pt-4 mt-4 border-t border-[#f0f3ff] flex items-center justify-between text-xs text-[#45474b]">
                      <span className="flex items-center gap-1.5 truncate max-w-[160px]">
                        <BookOpen className="w-3.5 h-3.5 text-[#0051d5] shrink-0" />
                        <span className="truncate">
                          {nextDl?.title || (locale === "ar" ? "متابعة المنهج" : "Curriculum active")}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudySubject(sub);
                        }}
                        className="text-xs font-semibold text-[#0051d5] hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-[#0051d5]" />
                        <span>{locale === "ar" ? "ذاكر" : "Study"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Subject Action Card */}
              <button
                type="button"
                onClick={() => {
                  setEditingSubject(null);
                  setIsSubjectModalOpen(true);
                }}
                className="group min-h-[220px] rounded-[20px] bg-[#f0f3ff] hover:bg-[#e7eeff] border border-dashed border-[#c6c6cb] transition-all p-6 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer shadow-xs hover:shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-white text-[#151c28] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-[#151c28]">
                    {locale === "ar" ? "إضافة مادة" : "Add subject"}
                  </span>
                  <span className="text-xs text-[#45474b]">
                    {locale === "ar" ? "سجل كورس جديد أو وحدة دراسية" : "Enroll in new course or custom module"}
                  </span>
                </div>
              </button>
            </div>

            {/* Quick Weekly Distribution Insight Card */}
            <div className="rounded-[20px] bg-white p-5 border border-[#e2e8f9] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#f0f3ff] text-[#0051d5] flex items-center justify-center shrink-0 border border-[#e2e8f9]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#151c28] block">
                    {locale === "ar" ? "توزيع عبء المذاكرة الأسبوعي" : "Weekly study load balance"}
                  </span>
                  <span className="text-xs text-[#45474b]">
                    {activeSubjects[0]?.name
                      ? locale === "ar"
                        ? `${activeSubjects[0].name} تمثل النصيب الأكبر من ساعات المذاكرة المسجلة هذا الأسبوع`
                        : `${activeSubjects[0].name} accounts for the primary share of total hours logged this week`
                      : locale === "ar"
                      ? "توازن منتظم عبر المواد المسجلة"
                      : "Balanced distribution across all enrolled courses"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeSubjects.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 text-xs text-[#45474b]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || "#0051d5" }} />
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GRADES                                                  */}
      {/* ============================================================== */}
      {!loading && activeTab === "grades" && (
        <div className="space-y-6">
          {/* Active Subject Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#e2e8f9] shadow-xs">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setGradeSubjectFilter("all")}
                className="w-10 h-10 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#151c28] flex items-center justify-center transition-colors cursor-pointer border border-[#e2e8f9]"
                title={locale === "ar" ? "كل المواد" : "All subjects"}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#45474b]">
                  <span>{locale === "ar" ? "كل المواد" : "All subjects"}</span>
                  <span>›</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#fde7f1] text-[#9d174d] text-[10px] font-bold">
                    {gradeSubjectFilter !== "all"
                      ? subjects.find((s) => s.id === gradeSubjectFilter)?.code || "ACTIVE"
                      : "ALL-COURSES"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#151c28] tracking-tight">
                  {gradeSubjectFilter !== "all"
                    ? subjects.find((s) => s.id === gradeSubjectFilter)?.name || (locale === "ar" ? "المادة المحددة" : "Physics")
                    : locale === "ar" ? "جميع المواد المقيمة" : "All Graded Courses"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={gradeSubjectFilter}
                onChange={(e) => setGradeSubjectFilter(e.target.value)}
                className="h-10 px-3 bg-[#f0f3ff] border border-[#e2e8f9] rounded-xl text-xs text-[#151c28] focus:outline-none focus:border-[#0051d5] cursor-pointer"
              >
                <option value="all">{locale === "ar" ? "تبديل المادة (الكل)" : "Switch subject (All)"}</option>
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setEditingGrade(null);
                  setPreselectedGradeSubjectId(gradeSubjectFilter !== "all" ? gradeSubjectFilter : "");
                  setIsGradeModalOpen(true);
                }}
                className="h-10 px-4 rounded-xl bg-[#000000] text-white hover:bg-[#2a313d] flex items-center gap-1.5 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{locale === "ar" ? "سجل درجة" : "Log grade"}</span>
              </button>
            </div>
          </div>

          {/* Metrics Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Average (unweighted) */}
            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f9] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#45474b]">
                  {locale === "ar" ? "المتوسط (مش موزون)" : "Average (unweighted)"}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#316bf3]" />
              </div>
              <div className="my-3 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#151c28] tracking-tight">
                  {overallStats.overallAveragePct !== null ? `${overallStats.overallAveragePct}%` : "—"}
                </span>
                <span className="text-xs text-[#45474b]">
                  {locale === "ar"
                    ? `عبر ${overallStats.totalGradesCount} تقييم متسجل`
                    : `across ${overallStats.totalGradesCount} recorded items`}
                </span>
              </div>
              <div className="w-full bg-[#e7eeff] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#316bf3] rounded-full"
                  style={{ width: `${overallStats.overallAveragePct || 0}%` }}
                />
              </div>
            </div>

            {/* Target Grade */}
            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f9] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#45474b]">
                  {locale === "ar" ? "المستهدف" : "Target"}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#e7eeff] text-[#0051d5] font-semibold">
                  {overallStats.overallAveragePct !== null && overallStats.overallAveragePct >= 90
                    ? locale === "ar" ? "تم بلوغ الهدف" : "Goal reached"
                    : locale === "ar" ? "2% للهدف" : "2% to goal"}
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#151c28] tracking-tight">90%</span>
                <span className="text-xs text-[#45474b]">{locale === "ar" ? "هدف الفصل الدراسي" : "semester objective"}</span>
              </div>
              <div className="w-full bg-[#e7eeff] h-2 rounded-full overflow-hidden">
                <div className="h-full bg-[#000000] rounded-full" style={{ width: "90%" }} />
              </div>
            </div>

            {/* Performance Split */}
            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f9] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#45474b]">
                  {locale === "ar" ? "توزيع الأداء" : "Performance split"}
                </span>
                <TrendingUp className="w-4 h-4 text-[#0051d5]" />
              </div>
              <div className="my-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9d174d]" />
                    <span className="text-[#151c28] font-medium">{locale === "ar" ? "كويزات" : "Quizzes"}</span>
                  </div>
                  <span className="font-bold text-[#151c28]">91%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rotate-45 rounded-[1px] bg-[#25005a]" />
                    <span className="text-[#151c28] font-medium">{locale === "ar" ? "امتحانات رئيسية" : "Big exams"}</span>
                  </div>
                  <span className="font-bold text-[#151c28]">82%</span>
                </div>
              </div>
              <p className="text-[11px] text-[#45474b]">
                {locale === "ar" ? "الكويزات 91% • الامتحانات الرئيسية 82%" : "Quizzes 91%, Big exams 82%"}
              </p>
            </div>
          </div>

          {/* Chart & Timeline Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e2e8f9] shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#151c28]">
                  {locale === "ar" ? "مسار تطور الدرجات" : "Grade progression"}
                </h3>
                <p className="text-xs text-[#45474b]">
                  {locale === "ar" ? "متابعة كل تقييم تم رصده مقارنة بالهدف الفصلي" : "Tracking each graded assessment against term objective"}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#45474b]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9d174d]" />
                  <span>{locale === "ar" ? "كويز" : "Quiz"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rotate-45 rounded-[1px] bg-[#25005a]" />
                  <span>{locale === "ar" ? "امتحان رئيسي" : "Big exam"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 border-b border-dashed border-[#76777b]" />
                  <span>{locale === "ar" ? "خط الهدف" : "Target line"}</span>
                </div>
              </div>
            </div>

            {/* SVG Line & Scatter Plot */}
            <div className="w-full bg-[#f0f3ff] rounded-xl p-4 overflow-hidden border border-[#e2e8f9]">
              <svg className="w-full h-56 select-none" preserveAspectRatio="none" viewBox="0 0 800 240">
                <defs>
                  <linearGradient id="schoolGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#9D174D" />
                    <stop offset="50%" stopColor="#316BF3" />
                    <stop offset="100%" stopColor="#25005A" />
                  </linearGradient>
                </defs>
                <line stroke="#E2E8F9" strokeWidth="1" x1="40" x2="760" y1="30" y2="30" />
                <text className="text-[10px] font-sans" fill="#76777B" textAnchor="end" x="32" y="34">100%</text>
                <line stroke="#76777B" strokeDasharray="4 4" strokeWidth="1.5" x1="40" x2="760" y1="70" y2="70" />
                <text className="text-[10px] font-sans" fill="#151C28" fontWeight="500" textAnchor="end" x="32" y="74">90%</text>
                <text className="text-[11px] font-sans" fill="#45474B" textAnchor="end" x="756" y="64">Target 90%</text>
                <line stroke="#E2E8F9" strokeWidth="1" x1="40" x2="760" y1="110" y2="110" />
                <text className="text-[10px] font-sans" fill="#76777B" textAnchor="end" x="32" y="114">80%</text>
                <line stroke="#E2E8F9" strokeWidth="1" x1="40" x2="760" y1="150" y2="150" />
                <text className="text-[10px] font-sans" fill="#76777B" textAnchor="end" x="32" y="154">70%</text>
                <line stroke="#E2E8F9" strokeWidth="1" x1="40" x2="760" y1="190" y2="190" />
                <text className="text-[10px] font-sans" fill="#76777B" textAnchor="end" x="32" y="194">60%</text>

                <path d="M 140 90 Q 280 138, 440 118 T 680 50" fill="none" stroke="url(#schoolGrad)" strokeLinecap="round" strokeWidth="2.5" />

                <g className="cursor-pointer">
                  <line stroke="#DCE2F3" strokeDasharray="2 2" strokeWidth="1" x1="140" x2="140" y1="90" y2="205" />
                  <circle cx="140" cy="90" fill="#FFFFFF" r="8" stroke="#9D174D" strokeWidth="3" />
                  <circle cx="140" cy="90" fill="#9D174D" r="3.5" />
                  <text className="text-[11px] font-sans" fill="#45474B" textAnchor="middle" x="140" y="222">Mechanics</text>
                  <text className="text-[11px] font-sans font-semibold" fill="#151C28" textAnchor="middle" x="140" y="78">85%</text>
                </g>

                <g className="cursor-pointer">
                  <line stroke="#DCE2F3" strokeDasharray="2 2" strokeWidth="1" x1="440" x2="440" y1="118" y2="205" />
                  <polygon fill="#FFFFFF" points="440,109 449,118 440,127 431,118" stroke="#25005A" strokeWidth="3" />
                  <polygon fill="#25005A" points="440,114 444,118 440,122 436,118" />
                  <text className="text-[11px] font-sans" fill="#45474B" textAnchor="middle" x="440" y="222">Midterm</text>
                  <text className="text-[11px] font-sans font-semibold" fill="#151C28" textAnchor="middle" x="440" y="102">78%</text>
                </g>

                <g className="cursor-pointer">
                  <line stroke="#DCE2F3" strokeDasharray="2 2" strokeWidth="1" x1="680" x2="680" y1="50" y2="205" />
                  <circle cx="680" cy="50" fill="#FFFFFF" r="8" stroke="#9D174D" strokeWidth="3" />
                  <circle cx="680" cy="50" fill="#9D174D" r="3.5" />
                  <text className="text-[11px] font-sans" fill="#45474B" textAnchor="middle" x="680" y="222">Waves</text>
                  <text className="text-[11px] font-sans font-semibold" fill="#151C28" textAnchor="middle" x="680" y="38">95%</text>
                </g>
              </svg>
            </div>

            {/* Live Interactive Grade Trend Breakdown */}
            <div className="pt-2">
              <GradeTrendChart grades={grades} />
            </div>
          </div>

          {/* Grade History Section */}
          <div className="bg-white p-6 rounded-2xl border border-[#e2e8f9] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#151c28]">{locale === "ar" ? "السجل الدراسي" : "History"}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f0f3ff] text-xs font-semibold text-[#151c28] border border-[#e2e8f9]">
                  {grades.length} {locale === "ar" ? "تقييمات" : "entries"}
                </span>
              </div>
              <span className="text-xs text-[#45474b]">{locale === "ar" ? "مرتبة حسب التاريخ" : "Sorted by date"}</span>
            </div>

            <div className="divide-y divide-[#e2e8f9]/60">
              {grades
                .filter((g) => {
                  if (gradeSubjectFilter !== "all" && g.subject_id !== gradeSubjectFilter) return false;
                  if (gradeTypeFilter !== "all" && g.type !== gradeTypeFilter) return false;
                  return true;
                })
                .map((g) => {
                  const sub = subjects.find((s) => s.id === g.subject_id);
                  const pct = calculateGradePercentage(g.mark_achieved, g.mark_total);
                  const isQuiz = g.type === "quiz";

                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between py-3.5 hover:bg-[#f0f3ff]/40 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isQuiz ? "bg-[#fde7f1] text-[#9d174d]" : "bg-[#eaddff] text-[#25005a]"
                          }`}
                        >
                          {isQuiz ? <span className="w-3 h-3 rounded-full bg-[#9d174d]" /> : <span className="w-3 h-3 rotate-45 bg-[#25005a]" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#151c28]">{g.title}</div>
                          <div className="text-xs text-[#45474b] flex items-center gap-2 mt-0.5">
                            <span>{isQuiz ? (locale === "ar" ? "كويز" : "Quiz") : (locale === "ar" ? "امتحان رئيسي" : "Big exam")}</span>
                            <span>•</span>
                            <span style={{ color: sub?.color || "#0051d5" }}>{sub?.name}</span>
                            <span>•</span>
                            <span>{g.entry_date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-[#45474b]">
                          {g.mark_achieved}/{g.mark_total}
                        </span>
                        <span className="text-sm font-bold text-[#151c28] w-12 text-right">
                          {pct}%
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGrade(g);
                              setIsGradeModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#45474b] hover:text-[#151c28] hover:bg-[#f0f3ff] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGrade(g.id)}
                            className="p-1.5 rounded-lg text-[#45474b] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PLAN (DEADLINES)                                        */}
      {/* ============================================================== */}
      {!loading && activeTab === "plan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Terms Banner & Grouped Tasks */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e2e8f9] shadow-xs flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-[#45474b] font-medium">
                  {locale === "ar" ? "الفصل الدراسي النشط" : "Active academic terms"}
                </span>
                <span className="text-base font-bold text-[#151c28]">
                  {locale === "ar" ? "مهام ومواعيد الفصل الدراسي" : "Spring semester coursework"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDeadline(null);
                  setPreselectedDeadlineSubjectId("");
                  setIsDeadlineModalOpen(true);
                }}
                className="h-10 px-4 bg-[#000000] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-[#2a313d] transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{locale === "ar" ? "إضافة موعد تسليم" : "Add deadline"}</span>
              </button>
            </div>

            {(() => {
              const todayStartMs = new Date().setHours(0, 0, 0, 0);
              const todayDeadlines = deadlines.filter((d) => {
                if (d.completed) return false;
                const dueTime = new Date(d.due_date).getTime();
                return dueTime <= todayStartMs + 24 * 3600 * 1000;
              });

              const thisWeekDeadlines = deadlines.filter((d) => {
                if (d.completed) return false;
                const dueTime = new Date(d.due_date).getTime();
                return (
                  dueTime > todayStartMs + 24 * 3600 * 1000 &&
                  dueTime <= todayStartMs + 7 * 24 * 3600 * 1000
                );
              });

              const laterDeadlines = deadlines.filter((d) => {
                if (d.completed) return false;
                const dueTime = new Date(d.due_date).getTime();
                return dueTime > todayStartMs + 7 * 24 * 3600 * 1000;
              });

              return (
                <>
                  {/* Today Section */}
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-sm font-bold text-[#151c28]">
                        {locale === "ar" ? "اليوم" : "Today"}
                      </h2>
                      <span className="text-xs text-[#45474b]">
                        {todayDeadlines.length} {locale === "ar" ? "مهام متبقية" : "item(s) remaining"}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-3 border border-[#e2e8f9] shadow-xs flex flex-col gap-1">
                      {todayDeadlines.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#45474b]">
                          {locale === "ar" ? "لا توجد مواعيد تسليم مستحقة اليوم" : "No deadlines due today"}
                        </div>
                      ) : (
                        todayDeadlines.map((d) => {
                          const sub = subjects.find((s) => s.id === d.subject_id);
                          return (
                            <div
                              key={d.id}
                              className="group flex items-center justify-between p-3 rounded-xl hover:bg-[#f0f3ff]/60 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={d.completed}
                                  onChange={(e) => handleToggleDeadlineComplete(d.id, e.target.checked)}
                                  className="w-4 h-4 rounded border-[#dce2f3] text-[#0051d5] focus:ring-0 cursor-pointer"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-[#151c28] truncate">
                                    {d.title}
                                  </span>
                                  <span className="text-[11px] text-[#45474b]">
                                    {locale === "ar" ? "مستحق اليوم" : "Due today"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e7eeff] text-[#0051d5]">
                                  {sub?.name || d.type}
                                </span>
                                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDeadline(d);
                                      setIsDeadlineModalOpen(true);
                                    }}
                                    className="p-1 rounded text-[#76777b] hover:text-[#151c28] hover:bg-[#e7eeff] transition-colors cursor-pointer"
                                    title={locale === "ar" ? "تعديل" : "Edit"}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeadline(d.id)}
                                    className="p-1 rounded text-[#76777b] hover:text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors cursor-pointer"
                                    title={locale === "ar" ? "حذف" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  {/* This Week Section */}
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-sm font-bold text-[#151c28]">
                        {locale === "ar" ? "هذا الأسبوع" : "This week"}
                      </h2>
                      <span className="text-xs text-[#45474b]">
                        {thisWeekDeadlines.length} {locale === "ar" ? "مهام متبقية" : "item(s) remaining"}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-3 border border-[#e2e8f9] shadow-xs flex flex-col gap-1.5">
                      {thisWeekDeadlines.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#45474b]">
                          {locale === "ar" ? "لا توجد مواعيد تسليم أخرى هذا الأسبوع" : "No additional deadlines this week"}
                        </div>
                      ) : (
                        thisWeekDeadlines.map((d) => {
                          const sub = subjects.find((s) => s.id === d.subject_id);
                          return (
                            <div
                              key={d.id}
                              className="group flex items-center justify-between p-3 rounded-xl hover:bg-[#f0f3ff]/60 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={d.completed}
                                  onChange={(e) => handleToggleDeadlineComplete(d.id, e.target.checked)}
                                  className="w-4 h-4 rounded border-[#dce2f3] text-[#0051d5] focus:ring-0 cursor-pointer"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-[#151c28] truncate">
                                    {d.title}
                                  </span>
                                  <span className="text-[11px] text-[#45474b]">
                                    {classifyDeadline(d.due_date).label}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dbe1ff] text-[#003ea8]">
                                  {locale === "ar" ? "قادم" : "Upcoming"}
                                </span>
                                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f0f3ff] text-[#45474b]">
                                  {sub?.name || d.type}
                                </span>
                                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDeadline(d);
                                      setIsDeadlineModalOpen(true);
                                    }}
                                    className="p-1 rounded text-[#76777b] hover:text-[#151c28] hover:bg-[#e7eeff] transition-colors cursor-pointer"
                                    title={locale === "ar" ? "تعديل" : "Edit"}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeadline(d.id)}
                                    className="p-1 rounded text-[#76777b] hover:text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors cursor-pointer"
                                    title={locale === "ar" ? "حذف" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  {/* Later Section */}
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-sm font-bold text-[#151c28]">
                        {locale === "ar" ? "لاحقاً" : "Later"}
                      </h2>
                      <span className="text-xs text-[#45474b]">
                        {laterDeadlines.length} {locale === "ar" ? "مهام متبقية" : "item(s) remaining"}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-3 border border-[#e2e8f9] shadow-xs flex flex-col gap-1.5">
                      {laterDeadlines.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#45474b]">
                          {locale === "ar" ? "لا توجد مواعيد تسليم لاحقة" : "No later deadlines scheduled"}
                        </div>
                      ) : (
                        laterDeadlines.map((d) => {
                          const sub = subjects.find((s) => s.id === d.subject_id);
                          return (
                            <div
                              key={d.id}
                              className="group flex items-center justify-between p-3 rounded-xl hover:bg-[#f0f3ff]/60 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={d.completed}
                                  onChange={(e) => handleToggleDeadlineComplete(d.id, e.target.checked)}
                                  className="w-4 h-4 rounded border-[#dce2f3] text-[#0051d5] focus:ring-0 cursor-pointer"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-[#151c28] truncate">
                                    {d.title}
                                  </span>
                                  <span className="text-[11px] text-[#45474b]">
                                    {classifyDeadline(d.due_date).label}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f0f3ff] text-[#45474b]">
                                  {sub?.name || d.type}
                                </span>
                                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDeadline(d);
                                      setIsDeadlineModalOpen(true);
                                    }}
                                    className="p-1 rounded text-[#76777b] hover:text-[#151c28] hover:bg-[#e7eeff] transition-colors cursor-pointer"
                                    title={locale === "ar" ? "تعديل" : "Edit"}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeadline(d.id)}
                                    className="p-1 rounded text-[#76777b] hover:text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors cursor-pointer"
                                    title={locale === "ar" ? "حذف" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </>
              );
            })()}
          </div>

          {/* Right Column (4 cols): Weekly Distribution & Study Materials */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Weekly Distribution Card */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2e8f9] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#151c28]">
                  {locale === "ar" ? "التوزيع الأسبوعي" : "Weekly distribution"}
                </span>
                <span className="text-xs text-[#45474b]">
                  {deadlines.filter((d) => !d.completed).length} {locale === "ar" ? "مهام إجمالاً" : "tasks total"}
                </span>
              </div>

              {/* 7-Day Bar Chart */}
              <div className="h-28 flex items-end justify-between gap-2 pt-2">
                {[
                  { day: "Mon", h: "40%", active: false },
                  { day: "Tue", h: "85%", active: true },
                  { day: "Wed", h: "25%", active: false },
                  { day: "Thu", h: "60%", active: false },
                  { day: "Fri", h: "15%", active: false },
                  { day: "Sat", h: "10%", active: false },
                  { day: "Sun", h: "50%", active: false },
                ].map((col) => (
                  <div key={col.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        col.active ? "bg-[#316bf3]" : "bg-[#e2e8f9]"
                      }`}
                      style={{ height: col.h }}
                    />
                    <span className="text-[10px] text-[#45474b]">{col.day}</span>
                  </div>
                ))}
              </div>

              {/* Next Major Test Callout */}
              <div className="p-3.5 rounded-xl bg-[#f0f3ff] border border-[#e2e8f9] flex items-center justify-between mt-1">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#45474b]">
                    {locale === "ar" ? "الاختبار الرئيسي القادم" : "Next major test"}
                  </span>
                  <span className="text-xs font-bold text-[#151c28]">
                    {nearestDl?.title || (locale === "ar" ? "امتحان الفيزياء" : "Physics exam")}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#0051d5]">
                  {nearestDl ? classifyDeadline(nearestDl.due_date).label : (locale === "ar" ? "3 أيام" : "3 days")}
                </span>
              </div>
            </div>

            {/* Study Materials Card */}
            <div className="bg-white rounded-2xl p-6 border border-[#e2e8f9] shadow-xs flex flex-col gap-3">
              <span className="text-sm font-bold text-[#151c28]">
                {locale === "ar" ? "المواد والمراجع" : "Study materials"}
              </span>
              <div className="rounded-xl bg-[#f0f3ff] p-4 border border-[#e2e8f9] flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[#151c28]">
                  {locale === "ar" ? "فهرس القوانين والملخصات" : "Course formula index"}
                </span>
                <span className="text-[11px] text-[#45474b] leading-relaxed">
                  {locale === "ar"
                    ? "ملخصات القوانين والميكانيكا الكلاسيكية والترموديناميكا متاحة للمراجعة السريعة."
                    : "Thermodynamics and classical mechanics summaries available for revision."}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PRACTICE (STAGE 8B-1)                                   */}
      {/* ============================================================== */}
      {!loading && activeTab === "practice" && (
        <div className="space-y-6">
          {/* Sub-Tab Selector: Mistakes vs Topics */}
          <div className="flex items-center bg-[#f0f3ff] p-1 rounded-full border border-[#e2e8f9] max-w-sm text-xs shadow-xs">
            <button
              onClick={() => setPracticeSubTab("mistakes")}
              className={`flex-1 py-1.5 px-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                practiceSubTab === "mistakes"
                  ? "bg-white text-[#151c28] font-bold shadow-xs"
                  : "text-[#45474b] hover:text-[#151c28]"
              }`}
            >
              <BookX className="w-3.5 h-3.5" />
              <span>
                {locale === "ar" ? "بنك الأخطاء" : "Mistakes"} ({mistakes.length})
              </span>
            </button>
            <button
              onClick={() => setPracticeSubTab("topics")}
              className={`flex-1 py-1.5 px-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                practiceSubTab === "topics"
                  ? "bg-white text-[#151c28] font-bold shadow-xs"
                  : "text-[#45474b] hover:text-[#151c28]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40">
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
