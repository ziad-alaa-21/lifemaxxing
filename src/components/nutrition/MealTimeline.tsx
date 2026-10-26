"use client";

import React, { useState } from "react";
import {
  Utensils,
  Plus,
  Minus,
  Trash2,
  Undo2,
  Clock,
  Sparkles,
  Layers,
  Check,
  BookmarkPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  MealLogEntry,
  MealType,
  rescaleItemNutrients,
  ConfidenceTier,
  calculateProteinPerMealGuideline,
  evaluateMealProtein,
} from "@/lib/nutrition";

import { useI18n } from "@/lib/i18n/I18nContext";

interface MealTimelineProps {
  meals: MealLogEntry[];
  onMealsUpdated: () => void;
  userTimezone: string;
  currentWeightKg?: number | null;
  onSaveAsTemplate?: (mealType: MealType, items: MealLogEntry[]) => void;
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function MealTimeline({
  meals,
  onMealsUpdated,
  userTimezone,
  currentWeightKg,
  onSaveAsTemplate,
}: MealTimelineProps) {
  const { isOnline, guardAction } = useOnlineGuard();
  const { locale } = useI18n();
  const guidelineG = calculateProteinPerMealGuideline(currentWeightKg);

  const MEAL_LABELS: Record<MealType, string> = {
    breakfast: locale === "ar" ? "الفطار" : "Breakfast",
    lunch: locale === "ar" ? "الغدا" : "Lunch",
    dinner: locale === "ar" ? "العشا" : "Dinner",
    snack: locale === "ar" ? "سناكس وتصبيرة" : "Snacks & Other",
  };

  const [deletedMeal, setDeletedMeal] = useState<{ id: string; name: string } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdatePortion = async (meal: MealLogEntry, newQty: number) => {
    if (newQty <= 0) return;
    guardAction(async () => {
      setUpdatingId(meal.id);
      try {
        const rescaled = rescaleItemNutrients(
          {
            quantity: meal.quantity,
            calories: meal.calories,
            protein_g: meal.protein_g,
            carbs_g: meal.carbs_g,
            fats_g: meal.fats_g,
          },
          newQty
        );

        const { error } = await supabase
          .from("meal_logs")
          .update({
            quantity: rescaled.quantity,
            calories: rescaled.calories,
            protein_g: rescaled.protein_g,
            carbs_g: rescaled.carbs_g,
            fats_g: rescaled.fats_g,
          })
          .eq("id", meal.id);

        if (error) throw error;
        onMealsUpdated();
      } catch (err: any) {
        console.error("Failed to update portion:", err);
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleSoftDelete = async (meal: MealLogEntry) => {
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("meal_logs")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", meal.id);

        if (error) throw error;

        // Show undo toast
        setDeletedMeal({ id: meal.id, name: meal.food_name });
        if (undoTimeout) clearTimeout(undoTimeout);
        const timer = setTimeout(() => {
          setDeletedMeal(null);
        }, 8000);
        setUndoTimeout(timer);

        onMealsUpdated();
      } catch (err: any) {
        console.error("Failed to delete meal:", err);
      }
    });
  };

  const handleUndo = async () => {
    if (!deletedMeal) return;
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("meal_logs")
          .update({ deleted_at: null })
          .eq("id", deletedMeal.id);

        if (error) throw error;
        setDeletedMeal(null);
        if (undoTimeout) clearTimeout(undoTimeout);
        onMealsUpdated();
      } catch (err: any) {
        console.error("Failed to undo meal delete:", err);
      }
    });
  };

  const getConfidenceBadge = (c: ConfidenceTier) => {
    switch (c) {
      case "high":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary-lime/10 text-primary-lime border border-primary-lime/20">
            {locale === "ar" ? "مؤكد" : "Verified"}
          </span>
        );
      case "medium":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-secondary-cyan/10 text-secondary-cyan border border-secondary-cyan/20">
            {locale === "ar" ? "تقديري" : "Estimated"}
          </span>
        );
      case "low":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rank-gold/10 text-rank-gold border border-rank-gold/20">
            {locale === "ar" ? "تقريبي" : "Approx"}
          </span>
        );
      case "could_not_estimate":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-status-danger/10 text-status-danger border border-status-danger/20">
            {locale === "ar" ? "يدوي" : "Manual"}
          </span>
        );
    }
  };

  if (meals.length === 0) {
    return (
      <div className="stitch-card p-8 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-container-high flex items-center justify-center text-text-muted">
          <Utensils className="w-6 h-6" />
        </div>
        <div className="font-mono text-sm font-bold text-on-surface">
          {locale === "ar" ? "مفيش وجبات متسجلة النهاردة" : "No Meals Logged Today"}
        </div>
        <p className="font-mono text-xs text-text-muted max-w-sm mx-auto">
          {locale === "ar"
            ? "ابدأ سجل تغذيتك بوصف وجبتك بالذكاء الاصطناعي أو ضيف الأصناف يدوي."
            : "Start your nutrition telemetry by describing a meal with AI or adding items manually."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Undo Toast */}
      {deletedMeal && (
        <div className="p-3 rounded-2xl bg-surface-container-high border border-primary-lime/40 flex items-center justify-between text-xs font-mono text-on-surface animate-fade-in">
          <span>
            {locale === "ar" ? `اتمسحت "${deletedMeal.name}"` : `Deleted "${deletedMeal.name}"`}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-lime text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "تراجع" : "Undo"}</span>
          </button>
        </div>
      )}

      {/* Grouped by Meal Type */}
      {MEAL_ORDER.map((type) => {
        const groupMeals = meals.filter((m) => m.meal_type === type);
        if (groupMeals.length === 0) return null;

        const groupCals = groupMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const groupProt = Math.round(groupMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0) * 10) / 10;
        const protEval = evaluateMealProtein(groupProt, guidelineG, type === "snack");

        return (
          <div
            key={type}
            className="stitch-card p-5 space-y-3"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border-subtle font-mono">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-secondary-cyan" />
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  {MEAL_LABELS[type]}
                </span>

                {/* Protein per meal guideline badge (Item 4: neutral, snacks unjudged) */}
                {type === "snack" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-high text-text-muted border border-border-subtle">
                    {locale === "ar" ? "وجبة خفيفة" : protEval.label}
                  </span>
                ) : protEval.meetsGuideline ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-lime/10 text-primary-lime border border-primary-lime/20 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>
                      {locale === "ar"
                        ? `الهدف اتحقق (${groupProt} جم / ${guidelineG} جم)`
                        : `Target met (${groupProt}g / ${guidelineG}g)`}
                    </span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-high text-text-muted border border-border-subtle">
                    {locale === "ar"
                      ? `المستهدف (${groupProt} جم / ${guidelineG} جم)`
                      : `${groupProt}g / ${guidelineG}g guideline`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-bold text-on-surface">
                  {groupCals} {locale === "ar" ? "سعرة" : "kcal"}
                </span>
                <span className="text-primary-lime font-semibold">
                  {groupProt} {locale === "ar" ? "جم بروتين" : "g Prot"}
                </span>

                {onSaveAsTemplate && (
                  <button
                    onClick={() => onSaveAsTemplate(type, groupMeals)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-[10px] text-text-muted hover:text-on-surface transition-colors cursor-pointer"
                    title={locale === "ar" ? "حفظ الوجبة كقالب متكرر" : "Save this meal as a reusable template"}
                  >
                    <BookmarkPlus className="w-3 h-3 text-secondary-cyan" />
                    <span>{locale === "ar" ? "حفظ كقالب" : "Save"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Meal Items */}
            <div className="space-y-2">
              {groupMeals.map((meal) => {
                const timeStr = new Date(meal.logged_at).toLocaleTimeString(locale === "ar" ? "ar-EG" : [], {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });

                return (
                  <div
                    key={meal.id}
                    className="p-3 rounded-2xl bg-surface-container-lowest border border-border-subtle flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface truncate">
                          {meal.food_name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[8px] uppercase tracking-wider bg-surface-container-high text-text-muted">
                          {meal.source}
                        </span>
                        {getConfidenceBadge(meal.confidence)}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-text-muted">
                        <span>
                          {meal.calories !== null
                            ? `${meal.calories} ${locale === "ar" ? "سعرة" : "kcal"}`
                            : locale === "ar"
                            ? "بدون سعرات"
                            : "No kcal"}
                        </span>
                        <span className="text-primary-lime">
                          {meal.protein_g}{locale === "ar" ? " جم ب" : "g P"}
                        </span>
                        <span className="text-secondary-cyan">
                          {meal.carbs_g}{locale === "ar" ? " جم ك" : "g C"}
                        </span>
                        <span className="text-rank-gold">
                          {meal.fats_g}{locale === "ar" ? " جم د" : "g F"}
                        </span>
                        <span>{locale === "ar" ? `الساعة ${timeStr}` : `at ${timeStr}`}</span>
                      </div>
                    </div>

                    {/* Rescaling Portion Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-surface-container-high px-2 py-1 rounded-xl border border-border-subtle text-xs">
                        <button
                          onClick={() => handleUpdatePortion(meal, Math.max(0.25, meal.quantity - 0.5))}
                          disabled={updatingId === meal.id}
                          className="p-0.5 hover:text-secondary-cyan transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold px-1.5 text-on-surface">
                          {meal.quantity} {meal.unit}
                        </span>
                        <button
                          onClick={() => handleUpdatePortion(meal, meal.quantity + 0.5)}
                          disabled={updatingId === meal.id}
                          className="p-0.5 hover:text-secondary-cyan transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleSoftDelete(meal)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-surface-container-high transition-colors"
                        title={locale === "ar" ? "مسح الوجبة" : "Delete meal entry"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
