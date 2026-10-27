"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Dumbbell,
  GraduationCap,
  Brain,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { PriorityItem, PrioritySource } from "@/lib/today";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nContext";

interface PrioritiesCardProps {
  priorities: PriorityItem[];
  todayDateStr: string;
  tomorrowDateStr: string;
  onPrioritiesChange: (updated: PriorityItem[]) => void;
  userId?: string | null;
}

export function PrioritiesCard({
  priorities,
  todayDateStr,
  tomorrowDateStr,
  onPrioritiesChange,
  userId,
}: PrioritiesCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSource, setNewSource] = useState<PrioritySource>("custom");
  const [newEstimate, setNewEstimate] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle priority completion (strictly allowed for 'custom' tasks)
  const handleToggle = async (item: PriorityItem) => {
    const updatedStatus = !item.completed;
    const nowIso = updatedStatus ? new Date().toISOString() : null;

    const nextList = priorities.map((p) =>
      p.id === item.id
        ? {
            ...p,
            completed: updatedStatus,
            completed_at: nowIso,
            auto_completed: false,
          }
        : p
    );
    onPrioritiesChange(nextList);

    // Save to database if user is authenticated
    if (userId && !item.id.startsWith("temp-")) {
      try {
        await supabase
          .from("priorities")
          .update({
            completed: updatedStatus,
            completed_at: nowIso,
            auto_completed: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("user_id", userId);
      } catch {
        // Fallback gracefully
      }
    }
  };

  // Delete priority
  const handleDelete = async (id: string) => {
    const nextList = priorities.filter((p) => p.id !== id);
    onPrioritiesChange(nextList);

    if (userId && !id.startsWith("temp-")) {
      try {
        await supabase
          .from("priorities")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId);
      } catch {
        // Fallback gracefully
      }
    }
  };

  // Add new custom or planned priority
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const newItem: PriorityItem = {
      id: tempId,
      priority_date: todayDateStr,
      title: newTitle.trim(),
      source: newSource,
      estimate_minutes: newEstimate,
      sort_order: priorities.length,
      completed: false,
      auto_completed: false,
      created_at: new Date().toISOString(),
    };

    const nextList = [...priorities, newItem];
    onPrioritiesChange(nextList);

    if (userId) {
      try {
        const { data } = await supabase
          .from("priorities")
          .insert({
            user_id: userId,
            priority_date: todayDateStr,
            title: newTitle.trim(),
            source: newSource,
            estimate_minutes: newEstimate,
            sort_order: priorities.length,
            completed: false,
            auto_completed: false,
          })
          .select("id")
          .single();

        if (data?.id) {
          onPrioritiesChange(
            nextList.map((p) => (p.id === tempId ? { ...p, id: data.id } : p))
          );
        }
      } catch {
        // Fallback gracefully
      }
    }

    setNewTitle("");
    setNewEstimate(30);
    setIsAddModalOpen(false);
    setIsSubmitting(false);
  };

  // Carry over incomplete tasks to tomorrow
  const handleCarryOver = async () => {
    const incomplete = priorities.filter((p) => !p.completed);
    if (incomplete.length === 0) return;

    if (userId) {
      for (const item of incomplete) {
        try {
          await supabase.from("priorities").insert({
            user_id: userId,
            priority_date: tomorrowDateStr,
            title: item.title,
            source: item.source,
            source_id: item.source_id,
            estimate_minutes: item.estimate_minutes,
            sort_order: item.sort_order,
            completed: false,
            auto_completed: false,
          });
        } catch {
          // Graceful fallback
        }
      }
    }
    alert(`Carried over ${incomplete.length} task${incomplete.length === 1 ? '' : 's'} to tomorrow (${tomorrowDateStr}).`);
  };

  const { locale } = useI18n();
  const completedCount = priorities.filter((p) => p.completed).length;

  const getSourceLabel = (src: PrioritySource) => {
    if (locale !== "ar") return src.replace("_", " ");
    switch (src) {
      case "workout_plan":
        return "تمرين";
      case "deadline":
        return "ميعاد تسليم";
      case "study_goal":
        return "مذاكرة";
      default:
        return "مهمة خاصة";
    }
  };

  return (
    <div className="p-6 rounded-[20px] bg-white border border-[#E3E5F0] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#ECEEFA]">
        <div className="flex items-center gap-2.5">
          <CheckSquare className="w-4 h-4 text-[#14161A]" />
          <h3 className="text-[15px] font-medium text-[#14161A]">
            {locale === "ar" ? "أولويات النهاردة" : "Today's Priorities"}
          </h3>
          <span className="text-xs tabular-nums text-[#5B6270]">
            ({completedCount}/{priorities.length} {locale === "ar" ? "اتنفذوا" : "done"})
          </span>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#14161A] hover:bg-[#23272F] text-xs font-medium text-white transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>{locale === "ar" ? "أضف مهمة" : "Add Task"}</span>
        </button>
      </div>

      {/* List */}
      {priorities.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-xs text-[#5B6270]">
            {locale === "ar"
              ? "مفيش أولويات متسجلة للنهاردة لسه."
              : "No priorities scheduled for today."}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs font-medium text-[#1E3A9E] hover:underline cursor-pointer"
          >
            {locale === "ar" ? "+ حدد أول أولوياتك للنهاردة" : "+ Set your first priority"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {priorities.map((item) => {
            const isCustom = item.source === "custom";

            const getSourceIcon = () => {
              switch (item.source) {
                case "workout_plan":
                  return <Dumbbell className="w-3.5 h-3.5 text-[#1E3A9E]" />;
                case "deadline":
                  return <GraduationCap className="w-3.5 h-3.5 text-[#9D174D]" />;
                case "study_goal":
                  return <Brain className="w-3.5 h-3.5 text-[#5B21B6]" />;
                default:
                  return <CheckSquare className="w-3.5 h-3.5 text-[#5B6270]" />;
              }
            };

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-[14px] border flex items-center justify-between gap-3 transition-colors ${
                  item.completed
                    ? "bg-[#F8F9FD] border-[#ECEEFA] text-[#5B6270]"
                    : "bg-white border-[#E3E5F0] hover:border-[#CBD0E6] text-[#14161A] shadow-[0_2px_8px_rgba(40,50,120,0.04)]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Checkbox button */}
                  <button
                    onClick={() => isCustom && handleToggle(item)}
                    disabled={!isCustom}
                    className={`shrink-0 cursor-pointer ${
                      !isCustom ? "cursor-default opacity-80" : ""
                    }`}
                    title={
                      !isCustom
                        ? (locale === "ar" ? "مهمة سيستم: بتتعلم تلقائي لما تسجل الداتا" : "System task: automatically completed when record is logged")
                        : (locale === "ar" ? "تغيير حالة المهمة" : "Toggle task")
                    }
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#5B6270] hover:text-[#14161A]" />
                    )}
                  </button>

                  <div className="min-w-0 text-start">
                    <div
                      className={`text-xs font-medium truncate ${
                        item.completed ? "line-through text-[#5B6270]" : "text-[#14161A]"
                      }`}
                    >
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] tabular-nums text-[#5B6270]">
                      <span className="flex items-center gap-1">
                        {getSourceIcon()}
                        <span className="capitalize">{getSourceLabel(item.source)}</span>
                      </span>
                      {item.estimate_minutes && (
                        <span>• {item.estimate_minutes} {locale === "ar" ? "دقيقة" : "m"}</span>
                      )}
                      {item.auto_completed && (
                        <span className="text-[#1E3A9E] font-medium">
                          • {locale === "ar" ? "تم تلقائيًا" : "Auto-completed"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-[8px] text-[#5B6270] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                    title={locale === "ar" ? "حذف المهمة" : "Delete task"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Carry Over Action */}
      {priorities.some((p) => !p.completed) && (
        <div className="pt-2">
          <button
            onClick={handleCarryOver}
            className="w-full py-2.5 px-3.5 rounded-[12px] bg-[#F8F9FD] hover:bg-[#F3F4FB] border border-[#E3E5F0] flex items-center justify-between text-xs font-medium text-[#5B6270] hover:text-[#14161A] transition-colors cursor-pointer"
          >
            <span>{locale === "ar" ? "ترحيل المهام المتبقية لبكرة" : "Carry over incomplete tasks to tomorrow"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#14161A] rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Add Priority Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14161A]/40"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white border border-[#E3E5F0] rounded-[24px] p-6 shadow-[0_24px_60px_rgba(20,22,26,0.18)] relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[#ECEEFA]">
              <h4 className="text-sm font-medium text-[#14161A]">
                {locale === "ar" ? "أولوية يومية جديدة" : "New Daily Priority"}
              </h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-[10px] bg-[#F3F4FB] border border-[#E3E5F0] flex items-center justify-center text-[#5B6270] hover:text-[#14161A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-[#5B6270] block mb-1.5">
                  {locale === "ar" ? "اسم المهمة" : "Task Title"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === "ar" ? "مثال: مراجعة فيزياء أو جلسة تمرين بنش" : "e.g. Bench press progression session"}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8F9FD] border border-[#E3E5F0] text-xs text-[#14161A] focus:outline-none focus:border-[#2563EB] text-start"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#5B6270] block mb-1.5">
                    {locale === "ar" ? "المصدر" : "Source"}
                  </label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as PrioritySource)}
                    className="w-full px-3 py-2.5 rounded-[12px] bg-[#F8F9FD] border border-[#E3E5F0] text-xs text-[#14161A]"
                  >
                    <option value="custom">{locale === "ar" ? "مهمة خاصة" : "Custom Task"}</option>
                    <option value="workout_plan">{locale === "ar" ? "خطة التمرين" : "Workout Plan"}</option>
                    <option value="study_goal">{locale === "ar" ? "هدف مذاكرة" : "Study Goal"}</option>
                    <option value="deadline">{locale === "ar" ? "ميعاد تسليم" : "Deadline"}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#5B6270] block mb-1.5">
                    {locale === "ar" ? "الوقت المقدر" : "Estimate"}
                  </label>
                  <select
                    value={newEstimate}
                    onChange={(e) => setNewEstimate(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-[12px] bg-[#F8F9FD] border border-[#E3E5F0] text-xs text-[#14161A] tabular-nums"
                  >
                    <option value={15}>15 {locale === "ar" ? "دقيقة" : "min"}</option>
                    <option value={30}>30 {locale === "ar" ? "دقيقة" : "min"}</option>
                    <option value={45}>45 {locale === "ar" ? "دقيقة" : "min"}</option>
                    <option value={60}>60 {locale === "ar" ? "دقيقة" : "min"}</option>
                    <option value={90}>90 {locale === "ar" ? "دقيقة" : "min"}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-[12px] bg-[#F3F4FB] border border-[#E3E5F0] text-xs font-medium text-[#5B6270] hover:text-[#14161A] cursor-pointer"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-[12px] bg-primary-ink text-on-primary text-xs font-medium hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    locale === "ar" ? "حفظ المهمة" : "Save Priority"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
