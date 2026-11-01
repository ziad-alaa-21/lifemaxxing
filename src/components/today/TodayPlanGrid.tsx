"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Sparkles, Plus, X, Check, Trash2 } from "lucide-react";
import { PriorityItem } from "@/lib/today";
import { useI18n } from "@/lib/i18n/I18nContext";

export interface CustomPlanItem {
  id: string;
  title: string;
  time: string;
  category: "Body" | "School" | "Mind" | "Custom";
  subtitle: string;
  completed: boolean;
}

interface TodayPlanGridProps {
  plannedWorkoutSession: string | null;
  nearestDeadlineTitle?: string | null;
  todayFocusMinutes: number;
  priorities: PriorityItem[];
  onAddPlanClick?: () => void;
  onViewAllClick?: () => void;
  onPlanAdded?: (item: PriorityItem) => void;
  onPlanDeleted?: (id: string, title?: string) => void;
}

const STORAGE_KEY = "lifemaxxing_custom_today_plans";
const DELETED_KEY = "lifemaxxing_deleted_today_plan_ids";

function normalizePlanKey(s?: string | null): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\s,._-]+/g, " ")
    .trim();
}

export function TodayPlanGrid({
  plannedWorkoutSession,
  nearestDeadlineTitle,
  todayFocusMinutes,
  priorities,
  onAddPlanClick,
  onViewAllClick,
  onPlanAdded,
  onPlanDeleted,
}: TodayPlanGridProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const workoutName = plannedWorkoutSession || (isAr ? "تمرين القوة" : "Strength Training");
  const studyTitle = nearestDeadlineTitle || (isAr ? "مراجعة المنهج الدراسي" : "Study & Review Session");
  const focusTitle = todayFocusMinutes > 0
    ? isAr ? "جلسة تركيز منجزة" : "Completed focus session"
    : isAr ? "جلسة تركيز ٥٠ دقيقة" : "Focus sprint (50m)";

  const [isMounted, setIsMounted] = useState(false);
  const [deletedPlanIds, setDeletedPlanIds] = useState<string[]>([]);
  const [customPlans, setCustomPlans] = useState<CustomPlanItem[]>([]);

  // Modal state for adding a plan directly to Today's Plan
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [planCategory, setPlanCategory] = useState<"Body" | "School" | "Mind" | "Custom">("Body");
  const [planTime, setPlanTime] = useState("");
  const [planMinutes, setPlanMinutes] = useState(30);

  // Load from localStorage strictly after mount to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    try {
      const storedDeleted = localStorage.getItem(DELETED_KEY);
      if (storedDeleted) {
        setDeletedPlanIds(JSON.parse(storedDeleted));
      }
      const storedPlans = localStorage.getItem(STORAGE_KEY);
      if (storedPlans) {
        setCustomPlans(JSON.parse(storedPlans));
      }
    } catch {}
  }, []);

  // Sync custom plans to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPlans));
    } catch {
      // Ignore quota error
    }
  }, [customPlans, isMounted]);

  // Sync deleted IDs to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(DELETED_KEY, JSON.stringify(deletedPlanIds));
    } catch {
      // Ignore quota error
    }
  }, [deletedPlanIds, isMounted]);

  // Combine custom plans created here with any custom tasks from priorities
  const customFromPriorities: CustomPlanItem[] = (priorities || [])
    .filter((p) => p.source === "custom")
    .map((p) => ({
      id: p.id,
      title: p.title,
      time: p.estimate_minutes ? `${p.estimate_minutes}m` : (isAr ? "خطة اليوم" : "Today"),
      category: "Custom",
      subtitle: isAr ? "مهمة مخصصة لليوم" : "Custom priority block",
      completed: p.completed,
    }));

  const deletedSet = new Set(
    deletedPlanIds.flatMap((id) => [
      id,
      id.toLowerCase().trim(),
      normalizePlanKey(id),
    ])
  );

  const seen = new Set<string>();
  const allCustomPlans: CustomPlanItem[] = [];
  for (const p of [...customPlans, ...customFromPriorities]) {
    const rawTitle = (p.title || "").trim();
    const normTitle = normalizePlanKey(p.title);
    const normId = normalizePlanKey(p.id);

    if (
      deletedSet.has(p.id) ||
      deletedSet.has(p.id.toLowerCase().trim()) ||
      (normId && deletedSet.has(normId)) ||
      (rawTitle && deletedSet.has(rawTitle)) ||
      (normTitle && deletedSet.has(normTitle))
    ) {
      continue;
    }

    const key = p.id || normTitle;
    if (!seen.has(key)) {
      seen.add(key);
      allCustomPlans.push(p);
    }
  }

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = planTitle.trim();
    if (!trimmedTitle) return;

    const defaultTime =
      planTime.trim() ||
      (planCategory === "Body"
        ? (isAr ? "٦:٠٠ م" : "6:00 pm")
        : planCategory === "School"
        ? (isAr ? "٧:٣٠ م" : "7:30 pm")
        : planCategory === "Mind"
        ? (isAr ? "٩:٠٠ م" : "9:00 pm")
        : (isAr ? "١٠:٠٠ م" : "10:00 pm"));

    const defaultSubtitle =
      planCategory === "Body"
        ? (isAr ? "جلسة تدريب وبناء عضلات" : "Resistance training session")
        : planCategory === "School"
        ? (isAr ? "مذاكرة مركزة ومراجعة" : "Focused study sprint")
        : planCategory === "Mind"
        ? (isAr ? "فترة صفاء ذهني وقراءة" : "Mental clarity & reading")
        : (isAr ? `مهمة مخصصة (${planMinutes} دقيقة)` : `Custom plan (${planMinutes}m)`);

    const newPlan: CustomPlanItem = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      time: defaultTime,
      category: planCategory,
      subtitle: defaultSubtitle,
      completed: false,
    };

    setCustomPlans((prev) => [...prev, newPlan]);

    // Notify parent if priority synchronization is supported
    if (onPlanAdded) {
      onPlanAdded({
        id: newPlan.id,
        priority_date: new Date().toISOString().split("T")[0],
        title: trimmedTitle,
        source: "custom",
        estimate_minutes: planMinutes,
        sort_order: 99,
        completed: false,
        auto_completed: false,
      });
    }

    setPlanTitle("");
    setPlanTime("");
    setIsAddPlanModalOpen(false);
  };

  const handleTogglePlan = (id: string) => {
    setCustomPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p))
    );
  };

  const handleDeletePlan = (id: string, title?: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const itemsToAdd = [id, id.toLowerCase().trim(), normalizePlanKey(id)];
    if (title) {
      itemsToAdd.push(title);
      itemsToAdd.push(title.trim());
      itemsToAdd.push(title.toLowerCase().trim());
      itemsToAdd.push(normalizePlanKey(title));
    }

    setDeletedPlanIds((prev) => {
      const updated = Array.from(new Set([...prev, ...itemsToAdd.filter(Boolean)]));
      try {
        localStorage.setItem(DELETED_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const normTitle = normalizePlanKey(title);
    setCustomPlans((prev) => {
      const updated = prev.filter(
        (p) =>
          p.id !== id &&
          p.id.toLowerCase().trim() !== id.toLowerCase().trim() &&
          (!normTitle || normalizePlanKey(p.title) !== normTitle)
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (onPlanDeleted) {
      onPlanDeleted(id, title);
    }
  };

  return (
    <section className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-medium text-[#14161A]">
          {isAr ? "خطة النهاردة" : "Today's plan"}
        </h2>
        {onViewAllClick && (
          <button
            type="button"
            onClick={onViewAllClick}
            className="text-[14px] font-medium text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
          >
            {isAr ? "عرض الكل" : "View all"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Body Gradient Card */}
        {(!deletedSet.has("default-body") && !deletedSet.has(normalizePlanKey(workoutName))) && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push("/body?tab=logger")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push("/body?tab=logger");
              }
            }}
            className="rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group hover:opacity-95 transition-opacity cursor-pointer"
            style={{ background: "linear-gradient(135deg, #2563EB, #4338CA)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-white/90">
                {isAr ? "٥:٣٠ م" : "5:30 pm"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white backdrop-blur-md">
                  {isAr ? "الجسم" : "Body"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeletePlan("default-body", workoutName, e);
                  }}
                  className="w-8 h-8 rounded-full bg-white/25 hover:bg-[#DC2626] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 relative z-10"
                  title={isAr ? "حذف الخطة" : "Delete plan"}
                  aria-label={isAr ? "حذف الخطة" : "Delete plan"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 my-3">
              <span className="text-[16px] font-medium text-white">
                {workoutName}
              </span>
              <span className="text-[14px] text-white/80">
                {isAr ? "تمرين القوة ورفع الأوزان الأساسي" : "Main resistance training block"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-white/90">
                {isAr ? "جلسة تمرين اليوم" : "Scheduled session"}
              </span>
              <svg
                className="w-8 h-8 text-white/80 shrink-0"
                fill="none"
                viewBox="0 0 40 40"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect fill="currentColor" height="2" rx="1" width="36" x="2" y="19" />
                <rect fill="currentColor" height="14" rx="1.5" width="3" x="7" y="13" />
                <rect fill="currentColor" height="20" rx="1.5" width="3" x="11" y="10" />
                <rect fill="currentColor" height="20" rx="1.5" width="3" x="26" y="10" />
                <rect fill="currentColor" height="14" rx="1.5" width="3" x="30" y="13" />
              </svg>
            </div>
          </div>
        )}

        {/* 2. School Gradient Card */}
        {(!deletedSet.has("default-school") && !deletedSet.has(normalizePlanKey(studyTitle))) && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push("/school")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push("/school");
              }
            }}
            className="rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group hover:opacity-95 transition-opacity cursor-pointer"
            style={{ background: "linear-gradient(135deg, #DB2777, #C2410C)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-white/90">
                {isAr ? "٨:٠٠ م" : "8:00 pm"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white backdrop-blur-md">
                  {isAr ? "الدراسة" : "School"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeletePlan("default-school", studyTitle, e);
                  }}
                  className="w-8 h-8 rounded-full bg-white/25 hover:bg-[#DC2626] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 relative z-10"
                  title={isAr ? "حذف الخطة" : "Delete plan"}
                  aria-label={isAr ? "حذف الخطة" : "Delete plan"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 my-3">
              <span className="text-[16px] font-medium text-white">
                {studyTitle}
              </span>
              <span className="text-[14px] text-white/80">
                {isAr ? "مذاكرة مركزة وحل تمارين" : "Targeted study sprint"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-white/90">
                {isAr ? "مفاهيم المنهج" : "Syllabus review"}
              </span>
              <BookOpen className="w-5 h-5 text-white/80 shrink-0" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* 3. Mind Gradient Card */}
        {(!deletedSet.has("default-mind") && !deletedSet.has(normalizePlanKey(focusTitle))) && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push("/mind")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push("/mind");
              }
            }}
            className="rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group hover:opacity-95 transition-opacity cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A21CAF)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-white/90">
                {isAr ? "٩:٣٠ م" : "9:30 pm"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white backdrop-blur-md">
                  {isAr ? "العقل" : "Mind"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeletePlan("default-mind", focusTitle, e);
                  }}
                  className="w-8 h-8 rounded-full bg-white/25 hover:bg-[#DC2626] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 relative z-10"
                  title={isAr ? "حذف الخطة" : "Delete plan"}
                  aria-label={isAr ? "حذف الخطة" : "Delete plan"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 my-3">
              <span className="text-[16px] font-medium text-white">
                {focusTitle}
              </span>
              <span className="text-[14px] text-white/80">
                {isAr ? "فترة صفاء ذهني وقراءة" : "Deep work & evening reflection"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-white/90">
                {todayFocusMinutes > 0
                  ? isAr ? `${todayFocusMinutes} دقيقة مسجلة` : `${todayFocusMinutes}m completed`
                  : isAr ? "استرجاع الهدوء" : "Mental clarity"}
              </span>
              <Sparkles className="w-5 h-5 text-white/80 shrink-0" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Custom User Added Plan Cards */}
        {allCustomPlans.map((plan) => {
          const bgStyle =
            plan.category === "Body"
              ? "linear-gradient(135deg, #2563EB, #4338CA)"
              : plan.category === "School"
              ? "linear-gradient(135deg, #DB2777, #C2410C)"
              : plan.category === "Mind"
              ? "linear-gradient(135deg, #7C3AED, #A21CAF)"
              : "linear-gradient(135deg, #059669, #0D9488)";

          const categoryLabel =
            plan.category === "Body"
              ? (isAr ? "الجسم" : "Body")
              : plan.category === "School"
              ? (isAr ? "الدراسة" : "School")
              : plan.category === "Mind"
              ? (isAr ? "العقل" : "Mind")
              : (isAr ? "خطة خاصة" : "Custom");

          return (
            <div
              key={plan.id}
              className={`rounded-[20px] p-6 text-white shadow-[0_8px_24px_rgba(40,50,120,0.08)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group transition-all ${
                plan.completed ? "opacity-75" : ""
              }`}
              style={{ background: bgStyle }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-white/90">
                  {plan.time}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white backdrop-blur-md">
                    {categoryLabel}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeletePlan(plan.id, plan.title, e);
                    }}
                    className="w-8 h-8 rounded-full bg-white/25 hover:bg-[#DC2626] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 relative z-10"
                    title={isAr ? "حذف الخطة" : "Delete plan"}
                    aria-label={isAr ? "حذف الخطة" : "Delete plan"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 my-3">
                <span className={`text-[16px] font-medium text-white line-clamp-2 ${plan.completed ? "line-through opacity-80" : ""}`}>
                  {plan.title}
                </span>
                <span className="text-[14px] text-white/80 line-clamp-1">
                  {plan.subtitle}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePlan(plan.id);
                  }}
                  className={`flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer relative z-10 ${
                    plan.completed
                      ? "bg-white/25 text-white"
                      : "bg-white/15 hover:bg-white/25 text-white/90"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{plan.completed ? (isAr ? "مكتملة" : "Completed") : (isAr ? "خطة نشطة" : "Active plan")}</span>
                </button>
                <Sparkles className="w-5 h-5 text-white/80 shrink-0" aria-hidden="true" />
              </div>
            </div>
          );
        })}

        {/* Dashed Add Plan Card */}
        <button
          type="button"
          onClick={() => {
            setIsAddPlanModalOpen(true);
            if (onAddPlanClick) onAddPlanClick();
          }}
          className="group rounded-[20px] p-6 min-h-[220px] flex flex-col items-center justify-center gap-3 transition-all hover:bg-[#F0F3FF]/60 active:scale-[0.98] border-2 border-dashed border-[#C7CAD9] bg-transparent text-[#14161A] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-[#F0F3FF] flex items-center justify-center group-hover:bg-white transition-colors shadow-sm">
            <Plus className="w-5 h-5 text-[#14161A]" />
          </div>
          <span className="text-[14px] font-medium text-[#14161A]">
            {isAr ? "أضف خطة" : "Add plan"}
          </span>
        </button>
      </div>

      {/* Add Plan Modal */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#14161A]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E3E5F0] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECEEFA]">
              <h3 className="text-[17px] font-semibold text-[#14161A]">
                {isAr ? "إضافة خطة لليوم" : "Add to Today's Plan"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPlanModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F0F3FF] flex items-center justify-center text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              {/* Category Pills */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#5B6270]">
                  {isAr ? "القسم / المجال" : "Category / Pillar"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["Body", "School", "Mind", "Custom"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPlanCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        planCategory === cat
                          ? "bg-[#14161A] text-white shadow-xs"
                          : "bg-[#F0F3FF] text-[#5B6270] hover:text-[#14161A] border border-[#E3E5F0]"
                      }`}
                    >
                      {cat === "Body"
                        ? (isAr ? "الجسم" : "Body")
                        : cat === "School"
                        ? (isAr ? "الدراسة" : "School")
                        : cat === "Mind"
                        ? (isAr ? "العقل" : "Mind")
                        : (isAr ? "خطة خاصة" : "Custom")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#5B6270]">
                  {isAr ? "عنوان الخطة" : "Plan title"}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder={
                    planCategory === "Body"
                      ? (isAr ? "مثال: تمرين أكتاف وكارديو" : "e.g., Shoulders & cardio sprint")
                      : planCategory === "School"
                      ? (isAr ? "مثال: مراجعة فيزياء وحل مسائل" : "e.g., Physics problem set")
                      : planCategory === "Mind"
                      ? (isAr ? "مثال: قراءة كتاب والتأمل" : "e.g., Reading & mindfulness")
                      : (isAr ? "مثال: تجهيز وجبات الأسبوع" : "e.g., Weekly meal prep")
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FC] border border-[#E3E5F0] text-sm text-[#14161A] focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              {/* Time & Duration Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[#5B6270]">
                    {isAr ? "الوقت المجدول" : "Scheduled time"}
                  </label>
                  <input
                    type="text"
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    placeholder={isAr ? "مثال: ٦:٠٠ م" : "e.g., 6:00 pm"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FC] border border-[#E3E5F0] text-sm text-[#14161A] focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[#5B6270]">
                    {isAr ? "المدة (بالدقائق)" : "Estimated mins"}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="360"
                    step="5"
                    value={planMinutes}
                    onChange={(e) => setPlanMinutes(Number(e.target.value) || 30)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FC] border border-[#E3E5F0] text-sm text-[#14161A] focus:border-[#2563EB] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#ECEEFA]">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#5B6270] hover:text-[#14161A] hover:bg-[#F0F3FF] transition-colors cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#14161A] hover:bg-[#23272F] text-xs font-medium text-white transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? "إضافة إلى خطة اليوم" : "Add to Today's Plan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
