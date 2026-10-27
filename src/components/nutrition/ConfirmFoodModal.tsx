"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Plus,
  Minus,
  Check,
  AlertCircle,
  HelpCircle,
  Loader2,
  Trash2,
  Edit2,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  ParsedFoodItem,
  MealType,
  rescaleItemNutrients,
  getLocalDateString,
  ConfidenceTier,
} from "@/lib/nutrition";
import { useI18n } from "@/lib/i18n/I18nContext";

interface ConfirmFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogged: () => void;
  userTimezone: string;
}

export function ConfirmFoodModal({
  isOpen,
  onClose,
  onLogged,
  userTimezone,
}: ConfirmFoodModalProps) {
  const { isOnline, guardAction } = useOnlineGuard();
  const { locale } = useI18n();

  const [query, setQuery] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed items waiting for confirmation
  const [items, setItems] = useState<ParsedFoodItem[]>([]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!query.trim()) return;
    setParsing(true);
    setParseError(null);

    try {
      const res = await fetch("/api/nutrition/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse meal input");
      }

      setItems(data.items || []);
    } catch (err: any) {
      setParseError(err.message || "Parsing error");
    } finally {
      setParsing(false);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newQty = Math.max(0.25, Math.round((item.quantity + delta) * 100) / 100);
        const rescaled = rescaleItemNutrients(item, newQty);
        return {
          ...item,
          quantity: rescaled.quantity,
          calories: rescaled.calories,
          protein_g: rescaled.protein_g,
          carbs_g: rescaled.carbs_g,
          fats_g: rescaled.fats_g,
        };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateManualField = (
    index: number,
    field: "calories" | "protein_g" | "carbs_g" | "fats_g" | "food_name",
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  };

  // Confirm-first: Only save to database when user taps Confirm!
  const handleConfirmAndSave = async () => {
    if (items.length === 0) return;

    guardAction(async () => {
      setSaving(true);
      setParseError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error(
            locale === "ar"
              ? "يجب تسجيل الدخول أولاً لحفظ الوجبة في حسابك."
              : "Authentication required. Please sign in to save meals."
          );
        }

        const now = new Date();
        const localDate = getLocalDateString(now, userTimezone);

        const rowsToInsert = items.map((it) => ({
          user_id: user.id,
          logged_date: localDate,
          meal_type: mealType,
          food_name: it.food_name,
          quantity: it.quantity,
          unit: it.unit,
          calories: it.calories,
          protein_g: it.protein_g || 0,
          carbs_g: it.carbs_g || 0,
          fats_g: it.fats_g || 0,
          source: it.source,
          confidence: it.confidence,
          raw_query: query.trim() || null,
          logged_at: now.toISOString(),
        }));

        const { error } = await supabase.from("meal_logs").insert(rowsToInsert);
        if (error) throw error;

        onLogged();
        onClose();
      } catch (err: any) {
        setParseError(err.message || "Failed to save meal log.");
      } finally {
        setSaving(false);
      }
    });
  };

  const totalMealCals = items.reduce((sum, it) => sum + (it.calories || 0), 0);
  const totalMealProt = items.reduce((sum, it) => sum + (it.protein_g || 0), 0);
  const totalMealCarbs = items.reduce((sum, it) => sum + (it.carbs_g || 0), 0);
  const totalMealFats = items.reduce((sum, it) => sum + (it.fats_g || 0), 0);

  const getConfidenceBadge = (c: ConfidenceTier) => {
    switch (c) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary-lime/10 text-primary-lime border border-primary-lime/30">
            {locale === "ar" ? "دقة عالية" : "High Confidence"}
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary-cyan/10 text-secondary-cyan border border-secondary-cyan/30">
            {locale === "ar" ? "تقديري" : "Estimated"}
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rank-gold/10 text-rank-gold border border-rank-gold/30">
            {locale === "ar" ? "دقة منخفضة" : "Low Confidence"}
          </span>
        );
      case "could_not_estimate":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-status-danger/10 text-status-danger border border-status-danger/30">
            {locale === "ar" ? "غير محدد" : "Could Not Estimate"}
          </span>
        );
    }
  };

  const MEAL_LABELS: Record<MealType, string> = {
    breakfast: locale === "ar" ? "فطار" : "breakfast",
    lunch: locale === "ar" ? "غدا" : "lunch",
    dinner: locale === "ar" ? "عشا" : "dinner",
    snack: locale === "ar" ? "سناك" : "snack",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40">
      <div className="relative w-full max-w-lg bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary-cyan" />
            <h2 className="text-base font-bold font-mono text-on-surface">
              {locale === "ar" ? "تسجيل الوجبات الذكي" : "AI Natural Food Logger"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Type Selector */}
        <div className="grid grid-cols-4 gap-1.5 my-4 p-1 bg-surface-container-lowest rounded-xl border border-border-subtle">
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMealType(m)}
              className={`py-2 text-[11px] font-mono uppercase tracking-wider font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                mealType === m
                  ? "bg-secondary-cyan text-on-primary shadow-sm font-bold"
                  : "text-text-muted hover:text-on-surface"
              }`}
            >
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Natural Language Input Box */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-text-muted">
            {locale === "ar"
              ? "اوصف أكلت إيه (عربي، مصري، إنجليزي، أو فرانكو)"
              : "Describe what you ate (English, Arabic, Franco-Arab)"}
          </label>
          <div className="relative">
            <textarea
              rows={3}
              maxLength={500}
              placeholder={
                locale === "ar"
                  ? "مثال: طبق كشري وكانز دايت، أو 3 بيضات ورغيف بلدي وقهوة"
                  : "e.g. 3 eggs, 2 sourdough slices, flat white OR طبق كشري و كانز دايت OR 2 ful, 3 ta3meya"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 rounded-2xl bg-surface-container-lowest border border-border-subtle font-mono text-sm text-on-surface placeholder:text-text-muted/60 focus:border-secondary-cyan focus:outline-none resize-none"
            />
            <div className="text-[10px] font-mono text-text-muted text-end mt-1">
              {query.length}/500 {locale === "ar" ? "حرف" : "chars"}
            </div>
          </div>

          <button
            onClick={handleParse}
            disabled={parsing || !query.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-xs font-bold bg-primary-lime text-on-primary shadow-xs hover:brightness-110 active:scale-[0.98] transition-all disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{locale === "ar" ? "جاري التحليل بالذكاء الاصطناعي..." : "Parsing with Grounded AI..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{locale === "ar" ? "تحليل الوجبة" : "Parse Items"}</span>
              </>
            )}
          </button>
        </div>

        {parseError && (
          <div className="p-3 my-4 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start gap-2.5 text-status-danger text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Reviewed Items List (Confirm-First) */}
        {items.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-on-surface flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-secondary-cyan" />
                {locale === "ar" ? `عناصر الوجبة المراجعة (${items.length})` : `Reviewed Meal Items (${items.length})`}
              </span>
              <span className="text-[11px] text-text-muted">
                {locale === "ar" ? "دوس تأكيد للحفظ" : "Tap Confirm to save"}
              </span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-surface-container-high border border-border-subtle space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-mono text-sm font-bold text-on-surface">
                        {it.food_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-surface-container-lowest text-text-muted border border-border-subtle">
                          {it.source}
                        </span>
                        {getConfidenceBadge(it.confidence)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 rounded-lg text-text-muted hover:text-status-danger hover:bg-surface-container-lowest transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity and Portion Stepper */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 bg-surface-container-lowest px-2 py-1 rounded-xl border border-border-subtle font-mono text-xs">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        className="p-1 hover:text-secondary-cyan transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-on-surface px-1">
                        {it.quantity} {it.unit}
                      </span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        className="p-1 hover:text-secondary-cyan transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Macros Display or Manual Input if Could Not Estimate */}
                    {it.confidence === "could_not_estimate" || it.calories === null ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="kcal"
                          value={it.calories ?? ""}
                          onChange={(e) =>
                            updateManualField(
                              idx,
                              "calories",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-surface-container-lowest border border-status-danger/40 font-mono text-xs text-center text-on-surface focus:outline-none"
                        />
                        <span className="text-[10px] font-mono text-status-danger">
                          {locale === "ar" ? "أدخل السعرات" : "Enter kcal"}
                        </span>
                      </div>
                    ) : (
                      <div className="text-end font-mono text-xs">
                        <div className="font-bold text-on-surface">
                          {it.calories} {locale === "ar" ? "سعرة" : "kcal"}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {locale === "ar"
                            ? `ب: ${it.protein_g}جم | ك: ${it.carbs_g}جم | د: ${it.fats_g}جم`
                            : `P: ${it.protein_g}g | C: ${it.carbs_g}g | F: ${it.fats_g}g`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Meal Impact Summary */}
            <div className="p-3 rounded-2xl bg-surface-container-lowest border border-border-subtle flex items-center justify-between font-mono text-xs">
              <span className="text-text-muted">{locale === "ar" ? "إجمالي الوجبة:" : "Total Meal Impact:"}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-on-surface">
                  {totalMealCals} {locale === "ar" ? "سعرة" : "kcal"}
                </span>
                <span className="text-primary-lime font-semibold">
                  {totalMealProt}{locale === "ar" ? "جم بروتين" : "g Prot"}
                </span>
                <span className="text-secondary-cyan">
                  {totalMealCarbs}{locale === "ar" ? "جم ك" : "g C"}
                </span>
                <span className="text-rank-gold">
                  {totalMealFats}{locale === "ar" ? "جم د" : "g F"}
                </span>
              </div>
            </div>

            {/* Error above confirm button */}
            {parseError && (
              <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start gap-2.5 text-status-danger text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Confirm & Save Button */}
            <div className="pt-2">
              <button
                onClick={handleConfirmAndSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-xs font-bold bg-secondary-cyan text-on-primary shadow-xs hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{locale === "ar" ? "جاري الحفظ..." : "Saving Meal..."}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{locale === "ar" ? "تأكيد وحفظ الوجبة" : "Confirm & Save Meal"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
