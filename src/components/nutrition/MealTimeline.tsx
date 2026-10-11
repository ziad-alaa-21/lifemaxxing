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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  MealLogEntry,
  MealType,
  rescaleItemNutrients,
  ConfidenceTier,
} from "@/lib/nutrition";

interface MealTimelineProps {
  meals: MealLogEntry[];
  onMealsUpdated: () => void;
  userTimezone: string;
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks & Other",
};

export function MealTimeline({
  meals,
  onMealsUpdated,
  userTimezone,
}: MealTimelineProps) {
  const { isOnline, guardAction } = useOnlineGuard();

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
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary-lime/10 text-primary-lime border border-primary-lime/20">Verified</span>;
      case "medium":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#7DD3FC]/10 text-[#7DD3FC] border border-[#7DD3FC]/20">Estimated</span>;
      case "low":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rank-gold/10 text-rank-gold border border-rank-gold/20">Approx</span>;
      case "could_not_estimate":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20">Manual</span>;
    }
  };

  if (meals.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-surface-container border border-border-subtle text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-container-high flex items-center justify-center text-text-muted">
          <Utensils className="w-6 h-6" />
        </div>
        <div className="font-mono text-sm font-bold text-on-surface">
          No Meals Logged Today
        </div>
        <p className="font-mono text-xs text-text-muted max-w-sm mx-auto">
          Start your nutrition telemetry by describing a meal with AI or adding items manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Undo Toast */}
      {deletedMeal && (
        <div className="p-3 rounded-2xl bg-surface-container-high border border-primary-lime/40 flex items-center justify-between text-xs font-mono text-on-surface animate-fade-in">
          <span>Deleted &ldquo;{deletedMeal.name}&rdquo;</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-lime text-charcoal-dark font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Grouped by Meal Type */}
      {MEAL_ORDER.map((type) => {
        const groupMeals = meals.filter((m) => m.meal_type === type);
        if (groupMeals.length === 0) return null;

        const groupCals = groupMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const groupProt = groupMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0);

        return (
          <div
            key={type}
            className="p-4 rounded-3xl bg-surface-container border border-border-subtle space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle font-mono">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-secondary-cyan" />
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  {MEAL_LABELS[type]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-on-surface">{groupCals} kcal</span>
                <span className="text-primary-lime font-semibold">{Math.round(groupProt * 10) / 10}g Prot</span>
              </div>
            </div>

            {/* Meal Items */}
            <div className="space-y-2">
              {groupMeals.map((meal) => {
                const timeStr = new Date(meal.logged_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
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
                          {meal.calories !== null ? `${meal.calories} kcal` : "No kcal"}
                        </span>
                        <span className="text-primary-lime">
                          {meal.protein_g}g P
                        </span>
                        <span className="text-secondary-cyan">
                          {meal.carbs_g}g C
                        </span>
                        <span className="text-rank-gold">
                          {meal.fats_g}g F
                        </span>
                        <span>at {timeStr}</span>
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
                        className="p-1.5 rounded-lg text-text-muted hover:text-[#F87171] hover:bg-surface-container-high transition-colors"
                        title="Delete meal entry"
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
