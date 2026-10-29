"use client";

import React, { useState } from "react";
import { calculateWeeklyStudyProgress } from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";

interface WeeklyTargetCardProps {
  weeklyTargetMinutes: number | null;
  completedMinutes: number;
  onUpdateTarget: (minutes: number | null) => Promise<void>;
}

export function WeeklyTargetCard({
  weeklyTargetMinutes,
  completedMinutes,
  onUpdateTarget,
}: WeeklyTargetCardProps) {
  const { locale } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [targetHoursInput, setTargetHoursInput] = useState<string>(
    weeklyTargetMinutes ? (weeklyTargetMinutes / 60).toString() : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = calculateWeeklyStudyProgress(weeklyTargetMinutes, [
    {
      id: "summary",
      actual_minutes: completedMinutes,
      status: "completed",
      started_at: new Date().toISOString(),
    },
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!targetHoursInput.trim()) {
        await onUpdateTarget(null);
        setIsEditing(false);
        return;
      }

      const hours = parseFloat(targetHoursInput);
      if (isNaN(hours) || hours <= 0) {
        setError(
          locale === "ar"
            ? "المستهدف لازم يكون رقم موجب أكبر من الصفر."
            : "Target must be a positive number."
        );
        setSaving(false);
        return;
      }

      const minutes = Math.round(hours * 60);
      if (minutes < 30 || minutes > 10080) {
        setError(
          locale === "ar"
            ? "المستهدف لازم يكون بين نصف ساعة (30 دقيقة) و 168 ساعة."
            : "Target must be between 0.5 hours (30m) and 168 hours."
        );
        setSaving(false);
        return;
      }

      await onUpdateTarget(minutes);
      setIsEditing(false);
    } catch (err: any) {
      setError(
        err?.message ||
          (locale === "ar" ? "حصل خطأ أثناء تحديث المستهدف" : "Failed to update target")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onUpdateTarget(null);
      setTargetHoursInput("");
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[20px] bg-white border border-[#e2e8f9] shadow-xs p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#f0f3ff] border border-[#dce2f3] flex items-center justify-center text-[#0051d5]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#151c28]">
              {locale === "ar" ? "المستهدف الأسبوعي للمذاكرة" : "Weekly Study Target"}
            </h3>
            <p className="text-xs text-[#717784]">
              {locale === "ar"
                ? "إجمالي ساعات التركيز العميق لكل المواد الدراسية"
                : "Total deep work focus across all subjects"}
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => {
              setTargetHoursInput(weeklyTargetMinutes ? (weeklyTargetMinutes / 60).toString() : "");
              setIsEditing(true);
            }}
            className="text-xs font-semibold text-[#0051d5] hover:underline transition-colors px-2.5 py-1 rounded-lg cursor-pointer"
          >
            {weeklyTargetMinutes
              ? locale === "ar"
                ? "تعديل"
                : "Edit"
              : locale === "ar"
              ? "تحديد مستهدف"
              : "Set Target"}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="mt-3 pt-3 border-t border-[#e2e8f9]">
          <label className="block text-xs font-medium text-[#45474b] mb-1.5">
            {locale === "ar" ? "ساعات المذاكرة المستهدفة في الأسبوع" : "Target Study Hours per Week"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="168"
              value={targetHoursInput}
              onChange={(e) => setTargetHoursInput(e.target.value)}
              placeholder="e.g. 15"
              autoFocus
              className="flex-1 px-3 py-2 bg-[#f8faff] rounded-xl border border-[#e2e8f9] text-sm text-[#151c28] focus:outline-none focus:border-[#0051d5] text-start"
            />
            <span className="text-xs text-[#717784]">
              {locale === "ar" ? "ساعة/أسبوع" : "hrs/week"}
            </span>
          </div>

          {error && <p className="text-xs text-[#ba1a1a] mt-1.5">{error}</p>}

          <div className="flex items-center justify-end gap-2 mt-3">
            {weeklyTargetMinutes && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="text-xs text-[#ba1a1a] hover:underline px-2 py-1 mr-auto rtl:mr-0 rtl:ml-auto cursor-pointer"
              >
                {locale === "ar" ? "مسح المستهدف" : "Clear Target"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#45474b] hover:text-[#151c28] hover:bg-[#f0f3ff] cursor-pointer"
            >
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0051d5] hover:bg-[#003ea8] text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {saving
                ? locale === "ar"
                  ? "جاري الحفظ..."
                  : "Saving..."
                : locale === "ar"
                ? "حفظ المستهدف"
                : "Save Target"}
            </button>
          </div>
        </form>
      ) : weeklyTargetMinutes === null ? (
        <div className="mt-2 py-3 px-3.5 bg-[#f8faff] rounded-xl border border-[#e2e8f9] flex items-center justify-between">
          <div className="text-xs text-[#717784]">
            <span className="text-[#151c28] font-semibold">{progress.completedHoursFormatted}</span>{" "}
            {locale === "ar" ? "تمت مذاكرتها الأسبوع ده" : "studied this week"}
          </div>
          <span className="text-xs text-[#717784] italic">
            {locale === "ar" ? "لم يُحدد مستهدف" : "No target defined"}
          </span>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <div>
              <span className="text-base font-bold text-[#151c28]">{progress.completedHoursFormatted}</span>
              <span className="text-[#717784]"> / {progress.targetHoursFormatted}</span>
            </div>
            <div className="font-semibold text-[#0051d5]">
              {progress.isCompleted
                ? locale === "ar"
                  ? "حققت الهدف بالكامل! 🎉"
                  : "Goal Reached! 🎉"
                : `${progress.progressPct}%`}
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-[#f0f3ff] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.isCompleted ? "bg-[#34a853]" : "bg-[#0051d5]"
              }`}
              style={{ width: `${Math.min(100, progress.progressPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
            <span>
              {progress.isCompleted
                ? progress.isOverTarget
                  ? locale === "ar"
                    ? `متجاوز المستهدف بـ ${(progress.completedMinutes / 60 - progress.targetMinutes! / 60).toFixed(1)}ساعة`
                    : `Over target by ${(progress.completedMinutes / 60 - progress.targetMinutes! / 60).toFixed(1)}h`
                  : locale === "ar"
                  ? "الهدف مكتمل"
                  : "Target fulfilled"
                : locale === "ar"
                ? `متبقي ${progress.remainingHoursFormatted}`
                : `${progress.remainingHoursFormatted} remaining`}
            </span>
            <span>{locale === "ar" ? "الأسبوع الحالي" : "Week active"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
