"use client";

import React, { useState } from "react";
import { X, Plus, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import { MealType, getLocalDateString } from "@/lib/nutrition";

interface ManualFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogged: () => void;
  userTimezone: string;
}

export function ManualFoodModal({
  isOpen,
  onClose,
  onLogged,
  userTimezone,
}: ManualFoodModalProps) {
  const { isOnline, guardAction } = useOnlineGuard();

  const [mealType, setMealType] = useState<MealType>("lunch");
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatsG, setFatsG] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!foodName.trim()) {
      setErrorMsg("Food name is required");
      return;
    }
    const cal = calories.trim() ? parseInt(calories) : null;
    const qty = parseFloat(quantity) || 1;

    guardAction(async () => {
      setSaving(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");

        const now = new Date();
        const localDate = getLocalDateString(now, userTimezone);

        const { error } = await supabase.from("meal_logs").insert([
          {
            user_id: user.id,
            logged_date: localDate,
            meal_type: mealType,
            food_name: foodName.trim(),
            quantity: qty,
            unit: unit.trim() || "serving",
            calories: cal,
            protein_g: proteinG ? parseFloat(proteinG) : 0,
            carbs_g: carbsG ? parseFloat(carbsG) : 0,
            fats_g: fatsG ? parseFloat(fatsG) : 0,
            source: "manual",
            confidence: "high",
            logged_at: now.toISOString(),
          },
        ]);

        if (error) throw error;

        onLogged();
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to save food log");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-lime" />
            <h2 className="text-base font-bold font-mono text-on-surface">
              Manual Food Entry
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Type */}
        <div className="grid grid-cols-4 gap-1.5 my-4 p-1 bg-surface-container-lowest rounded-xl border border-border-subtle">
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMealType(m)}
              className={`py-2 text-[11px] font-mono uppercase tracking-wider font-semibold rounded-lg transition-all capitalize ${
                mealType === m
                  ? "bg-primary-lime text-charcoal-dark shadow-sm font-bold"
                  : "text-text-muted hover:text-on-surface"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-[#F87171]/10 border border-[#F87171]/30 flex items-start gap-2.5 text-[#F87171] text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono text-text-muted mb-1">
              Food Item Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Grilled Chicken Salad"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-primary-lime focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-primary-lime focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                Unit
              </label>
              <input
                type="text"
                placeholder="serving / grams"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-primary-lime focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                Calories (kcal)
              </label>
              <input
                type="number"
                placeholder="e.g. 350"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-primary-lime focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 32"
                value={proteinG}
                onChange={(e) => setProteinG(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-primary-lime focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 15"
                value={carbsG}
                onChange={(e) => setCarbsG(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-primary-lime focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                Fats (g)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 8"
                value={fatsG}
                onChange={(e) => setFatsG(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface focus:border-primary-lime focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-mono text-xs text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-primary-lime text-charcoal-dark shadow-[0_0_15px_rgba(198,255,61,0.25)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Log Food"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
