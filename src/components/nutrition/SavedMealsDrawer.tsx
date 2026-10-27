"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bookmark,
  Plus,
  Star,
  Check,
  Trash2,
  Undo2,
  Loader2,
  ChevronRight,
  Layers,
  Utensils,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  SavedMeal,
  SavedMealItem,
  MealType,
  validateSavedMealItems,
  computeSavedMealTotals,
  scaleSavedMealItems,
  getLocalDateString,
} from "@/lib/nutrition";
import { useI18n } from "@/lib/i18n/I18nContext";

interface SavedMealsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMealLogged: () => void;
  userTimezone: string;
  prefillTemplate?: { name: string; meal_type: MealType; items: SavedMealItem[] } | null;
}

export function SavedMealsDrawer({
  isOpen,
  onClose,
  onMealLogged,
  userTimezone,
  prefillTemplate,
}: SavedMealsDrawerProps) {
  const { isOnline, guardAction } = useOnlineGuard();
  const { locale } = useI18n();

  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites">("all");

  // Selected meal for logging
  const [selectedMeal, setSelectedMeal] = useState<SavedMeal | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [logging, setLogging] = useState(false);

  // Create new template modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMealType, setNewMealType] = useState<MealType>("lunch");
  const [newItems, setNewItems] = useState<SavedMealItem[]>([
    { food_name: "", quantity: 1, unit: "serving", calories: null, protein_g: 0, carbs_g: 0, fats_g: 0 },
  ]);

  useEffect(() => {
    if (prefillTemplate) {
      setIsCreating(true);
      setNewName(prefillTemplate.name);
      setNewMealType(prefillTemplate.meal_type);
      setNewItems(
        prefillTemplate.items.map((it) => ({
          food_name: it.food_name,
          quantity: it.quantity,
          unit: it.unit,
          calories: it.calories,
          protein_g: it.protein_g,
          carbs_g: it.carbs_g,
          fats_g: it.fats_g,
          source: it.source || "manual",
        }))
      );
    }
  }, [prefillTemplate]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Undo state
  const [deletedTemplate, setDeletedTemplate] = useState<{ id: string; name: string } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchSavedMeals = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("saved_meals")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        if (!error.message.includes("Could not find the table")) {
          console.error("Fetch saved meals error:", error);
        }
      } else {
        setSavedMeals(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSavedMeals();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleFavorite = async (meal: SavedMeal) => {
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("saved_meals")
          .update({ is_favorite: !meal.is_favorite })
          .eq("id", meal.id);

        if (error) throw error;
        setSavedMeals((prev) =>
          prev.map((m) => (m.id === meal.id ? { ...m, is_favorite: !m.is_favorite } : m))
        );
      } catch (err: any) {
        console.error("Failed to toggle favorite:", err);
      }
    });
  };

  const handleSoftDeleteTemplate = async (meal: SavedMeal) => {
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("saved_meals")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", meal.id);

        if (error) throw error;

        setDeletedTemplate({ id: meal.id, name: meal.name });
        if (undoTimeout) clearTimeout(undoTimeout);
        const t = setTimeout(() => setDeletedTemplate(null), 8000);
        setUndoTimeout(t);

        setSavedMeals((prev) => prev.filter((m) => m.id !== meal.id));
        if (selectedMeal?.id === meal.id) setSelectedMeal(null);
      } catch (err: any) {
        console.error("Failed to delete template:", err);
      }
    });
  };

  const handleUndoTemplateDelete = async () => {
    if (!deletedTemplate) return;
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("saved_meals")
          .update({ deleted_at: null })
          .eq("id", deletedTemplate.id);

        if (error) throw error;
        setDeletedTemplate(null);
        if (undoTimeout) clearTimeout(undoTimeout);
        await fetchSavedMeals();
      } catch (err: any) {
        console.error("Failed to undo template delete:", err);
      }
    });
  };

  // Item 6: Logging a saved meal writes normal meal_logs rows with source = 'saved'
  // Future template edits do not affect past logged rows!
  const handleLogSavedMeal = async () => {
    if (!selectedMeal) return;

    guardAction(async () => {
      setLogging(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");

        const now = new Date();
        const localDate = getLocalDateString(now, userTimezone);

        const scaledItems = scaleSavedMealItems(selectedMeal.items, multiplier);

        const rowsToInsert = scaledItems.map((it) => ({
          user_id: user.id,
          logged_date: localDate,
          meal_type: selectedMealType,
          food_name: it.food_name,
          quantity: it.quantity,
          unit: it.unit,
          calories: it.calories,
          protein_g: it.protein_g,
          carbs_g: it.carbs_g,
          fats_g: it.fats_g,
          source: "saved",
          confidence: "high",
          raw_query: `Saved meal template: ${selectedMeal.name} (${multiplier}x)`,
          logged_at: now.toISOString(),
        }));

        const { error } = await supabase.from("meal_logs").insert(rowsToInsert);
        if (error) throw error;

        onMealLogged();
        setSelectedMeal(null);
        onClose();
      } catch (err: any) {
        console.error("Failed to log saved meal:", err);
      } finally {
        setLogging(false);
      }
    });
  };

  // Create new template submission
  const handleCreateTemplate = async () => {
    if (!newName.trim()) {
      setCreateError("Template name is required.");
      return;
    }

    const validation = validateSavedMealItems(newItems);
    if (!validation.isValid) {
      setCreateError(validation.error || "Invalid meal items.");
      return;
    }

    const totals = computeSavedMealTotals(validation.cleanItems);

    guardAction(async () => {
      setSavingTemplate(true);
      setCreateError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");

        const { error } = await supabase.from("saved_meals").insert([
          {
            user_id: user.id,
            name: newName.trim(),
            meal_type: newMealType,
            items: validation.cleanItems,
            total_calories: totals.total_calories,
            total_protein_g: totals.total_protein_g,
            total_carbs_g: totals.total_carbs_g,
            total_fats_g: totals.total_fats_g,
            is_favorite: false,
          },
        ]);

        if (error) throw error;

        setIsCreating(false);
        setNewName("");
        setNewItems([
          { food_name: "", quantity: 1, unit: "serving", calories: null, protein_g: 0, carbs_g: 0, fats_g: 0 },
        ]);
        await fetchSavedMeals();
      } catch (err: any) {
        setCreateError(err.message || "Failed to create saved meal.");
      } finally {
        setSavingTemplate(false);
      }
    });
  };

  const filteredMeals = savedMeals.filter((m) =>
    activeFilter === "favorites" ? m.is_favorite : true
  );

  const MEAL_LABELS: Record<MealType, string> = {
    breakfast: locale === "ar" ? "فطار" : "breakfast",
    lunch: locale === "ar" ? "غدا" : "lunch",
    dinner: locale === "ar" ? "عشا" : "dinner",
    snack: locale === "ar" ? "سناك" : "snack",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40">
      <div className="relative w-full max-w-lg bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-secondary-cyan" />
            <h2 className="text-base font-bold font-mono text-on-surface">
              {locale === "ar" ? "الوجبات المحفوظة والقوالب" : "Saved Meals & Templates"}
            </h2>
          </div>
          <button
            id="close-saved-meals"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Undo Toast */}
        {deletedTemplate && (
          <div className="p-3 my-3 rounded-2xl bg-surface-container-high border border-primary-ink/40 flex items-center justify-between text-xs font-mono text-on-surface animate-fade-in">
            <span>
              {locale === "ar"
                ? `اتمسح القالب "${deletedTemplate.name}"`
                : `Deleted template "${deletedTemplate.name}"`}
            </span>
            <button
              onClick={handleUndoTemplateDelete}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-ink text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "تراجع" : "Undo"}</span>
            </button>
          </div>
        )}

        {/* Selected Meal Logging Stepper */}
        {selectedMeal ? (
          <div className="my-4 p-4 rounded-2xl bg-surface-container-high border border-secondary-cyan/30 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  {locale === "ar" ? "تسجيل القالب للنهاردة" : "Log Template to Today"}
                </span>
                <div className="font-mono text-base font-bold text-on-surface">
                  {selectedMeal.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedMeal(null)}
                className="text-xs font-mono text-text-muted hover:text-on-surface underline cursor-pointer"
              >
                {locale === "ar" ? "رجوع للقائمة" : "Back to List"}
              </button>
            </div>

            {/* Target Meal Type */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container-lowest rounded-xl font-mono text-[10px]">
              {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedMealType(t)}
                  className={`py-1.5 rounded-lg capitalize font-bold transition-all cursor-pointer ${
                    selectedMealType === t
                      ? "bg-secondary-cyan text-on-primary"
                      : "text-text-muted hover:text-on-surface"
                  }`}
                >
                  {MEAL_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Portion Scaling Multipliers (Item 6) */}
            <div className="space-y-1.5 font-mono text-xs">
              <label className="text-text-muted">
                {locale === "ar" ? "مضاعف الكمية:" : "Portion Multiplier:"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1.0, 1.5, 2.0].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m)}
                    className={`py-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      multiplier === m
                        ? "bg-secondary-cyan text-on-primary border-secondary-cyan"
                        : "bg-surface-container-lowest border-border-subtle text-on-surface hover:border-secondary-cyan/40"
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scaled Totals Preview */}
            {(() => {
              const scaled = scaleSavedMealItems(selectedMeal.items, multiplier);
              const totals = computeSavedMealTotals(scaled);
              return (
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-border-subtle flex items-center justify-between font-mono text-xs">
                  <span className="text-text-muted">
                    {locale === "ar" ? "إجمالي الوجبة بعد التعديل:" : "Scaled Meal Impact:"}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-on-surface">
                      {totals.total_calories} {locale === "ar" ? "سعرة" : "kcal"}
                    </span>
                    <span className="text-primary-ink font-bold">
                      {totals.total_protein_g}{locale === "ar" ? "جم ب" : "g P"}
                    </span>
                    <span className="text-secondary-cyan">
                      {totals.total_carbs_g}{locale === "ar" ? "جم ك" : "g C"}
                    </span>
                    <span className="text-rank-gold">
                      {totals.total_fats_g}{locale === "ar" ? "جم د" : "g F"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Confirm Log Button */}
            <button
              onClick={handleLogSavedMeal}
              disabled={logging}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-xs font-bold bg-secondary-cyan text-on-primary shadow-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {logging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{locale === "ar" ? "جاري تسجيل الوجبة..." : "Logging Meal..."}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {locale === "ar"
                      ? `تأكيد وتسجيل وجبة بمقدار ${multiplier}x`
                      : `Confirm & Log ${multiplier}x Portion`}
                  </span>
                </>
              )}
            </button>
          </div>
        ) : isCreating ? (
          /* Create New Template Panel */
          <div className="my-4 p-4 rounded-2xl bg-surface-container-high border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-on-surface">
                {locale === "ar" ? "قالب وجبة جديد" : "New Meal Template"}
              </span>
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs font-mono text-text-muted hover:text-on-surface cursor-pointer"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 text-xs font-mono text-status-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-text-muted block mb-1">
                  {locale === "ar" ? "اسم القالب *" : "Template Name *"}
                </label>
                <input
                  type="text"
                  placeholder={locale === "ar" ? "مثال: فطار بعد الجيم" : "e.g. Post-Workout Breakfast"}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="text-text-muted block mb-1">
                  {locale === "ar" ? "نوع الوجبة الافتراضي" : "Default Meal Type"}
                </label>
                <select
                  value={newMealType}
                  onChange={(e) => setNewMealType(e.target.value as MealType)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface focus:outline-none capitalize"
                >
                  <option value="breakfast">{MEAL_LABELS.breakfast}</option>
                  <option value="lunch">{MEAL_LABELS.lunch}</option>
                  <option value="dinner">{MEAL_LABELS.dinner}</option>
                  <option value="snack">{MEAL_LABELS.snack}</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">
                    {locale === "ar" ? `الأصناف (${newItems.length})` : `Food Items (${newItems.length})`}
                  </span>
                  <button
                    onClick={() =>
                      setNewItems([
                        ...newItems,
                        { food_name: "", quantity: 1, unit: "serving", calories: null, protein_g: 0, carbs_g: 0, fats_g: 0 },
                      ])
                    }
                    className="text-secondary-cyan hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {locale === "ar" ? "إضافة صنف" : "Add Item"}
                  </button>
                </div>

                {newItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder={locale === "ar" ? "اسم الصنف (مثال: 3 بيضات)" : "Item name (e.g. 3 Eggs)"}
                        value={it.food_name}
                        onChange={(e) => {
                          const updated = [...newItems];
                          updated[idx].food_name = e.target.value;
                          setNewItems(updated);
                        }}
                        className="flex-1 px-2 py-1 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface text-xs focus:outline-none"
                      />
                      {newItems.length > 1 && (
                        <button
                          onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                          className="p-1 text-text-muted hover:text-status-danger cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                      <input
                        type="number"
                        placeholder={locale === "ar" ? "سعرة" : "kcal"}
                        value={it.calories ?? ""}
                        onChange={(e) => {
                          const updated = [...newItems];
                          updated[idx].calories = e.target.value ? parseInt(e.target.value) : null;
                          setNewItems(updated);
                        }}
                        className="px-2 py-1 rounded bg-surface-container-high text-on-surface text-center focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder={locale === "ar" ? "بروتين" : "Prot g"}
                        value={it.protein_g || ""}
                        onChange={(e) => {
                          const updated = [...newItems];
                          updated[idx].protein_g = e.target.value ? parseFloat(e.target.value) : 0;
                          setNewItems(updated);
                        }}
                        className="px-2 py-1 rounded bg-surface-container-high text-on-surface text-center focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder={locale === "ar" ? "كارب" : "Carb g"}
                        value={it.carbs_g || ""}
                        onChange={(e) => {
                          const updated = [...newItems];
                          updated[idx].carbs_g = e.target.value ? parseFloat(e.target.value) : 0;
                          setNewItems(updated);
                        }}
                        className="px-2 py-1 rounded bg-surface-container-high text-on-surface text-center focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder={locale === "ar" ? "دهون" : "Fat g"}
                        value={it.fats_g || ""}
                        onChange={(e) => {
                          const updated = [...newItems];
                          updated[idx].fats_g = e.target.value ? parseFloat(e.target.value) : 0;
                          setNewItems(updated);
                        }}
                        className="px-2 py-1 rounded bg-surface-container-high text-on-surface text-center focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreateTemplate}
                disabled={savingTemplate}
                className="w-full py-2.5 rounded-xl bg-primary-ink text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
              >
                {savingTemplate
                  ? locale === "ar" ? "جاري حفظ القالب..." : "Saving Template..."
                  : locale === "ar" ? "حفظ قالب الوجبة" : "Save Meal Template"}
              </button>
            </div>
          </div>
        ) : (
          /* Normal List View */
          <div className="space-y-4 my-4">
            {/* Action Bar & Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-xl font-mono text-xs">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-secondary-cyan text-on-primary font-bold"
                      : "text-text-muted hover:text-on-surface"
                  }`}
                >
                  {locale === "ar" ? `الكل (${savedMeals.length})` : `All (${savedMeals.length})`}
                </button>
                <button
                  onClick={() => setActiveFilter("favorites")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeFilter === "favorites"
                      ? "bg-rank-gold text-on-primary font-bold"
                      : "text-text-muted hover:text-on-surface"
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>{locale === "ar" ? "المميزة بنجمة" : "Starred"}</span>
                </button>
              </div>

              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-ink text-on-primary font-mono text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "+ قالب جديد" : "+ New Template"}</span>
              </button>
            </div>

            {/* List */}
            {loading ? (
              <div className="p-8 text-center font-mono text-xs text-text-muted flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-secondary-cyan" />
                <span>{locale === "ar" ? "جاري تحميل الوجبات المحفوظة..." : "Loading saved meals..."}</span>
              </div>
            ) : filteredMeals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface-container-lowest border border-border-subtle text-center space-y-2 font-mono">
                <Bookmark className="w-8 h-8 mx-auto text-text-muted/40" />
                <div className="text-xs font-bold text-on-surface">
                  {locale === "ar" ? "مفيش وجبات محفوظة لسه" : "No Saved Meals Yet"}
                </div>
                <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                  {locale === "ar"
                    ? "اعمل قوالب لوجباتك المفضلة عشان تسجلها بضغطة واحدة كل يوم."
                    : "Create reusable templates for your favorite go-to meals to log them with 1 tap."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="p-3.5 rounded-2xl bg-surface-container-high border border-border-subtle flex items-center justify-between gap-3 font-mono hover:border-secondary-cyan/40 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedMeal(meal);
                      setMultiplier(1.0);
                      setSelectedMealType(meal.meal_type || "lunch");
                    }}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface truncate">
                          {meal.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] uppercase bg-surface-container-lowest text-text-muted">
                          {meal.meal_type ? MEAL_LABELS[meal.meal_type] : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs">
                        <span className="font-bold text-on-surface">
                          {meal.total_calories} {locale === "ar" ? "سعرة" : "kcal"}
                        </span>
                        <span className="text-primary-ink font-bold">
                          {meal.total_protein_g}{locale === "ar" ? "جم ب" : "g P"}
                        </span>
                        <span className="text-text-muted text-[11px]">
                          {locale === "ar"
                            ? `(${meal.items?.length || 0} صنف)`
                            : `(${meal.items?.length || 0} items)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleFavorite(meal)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          meal.is_favorite
                            ? "text-rank-gold hover:bg-rank-gold/10"
                            : "text-text-muted hover:text-on-surface"
                        }`}
                        title={locale === "ar" ? "تمييز بنجمة" : "Star Favorite"}
                      >
                        <Star className={`w-4 h-4 ${meal.is_favorite ? "fill-rank-gold" : ""}`} />
                      </button>

                      <button
                        onClick={() => handleSoftDeleteTemplate(meal)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-status-danger hover:bg-surface-container-lowest transition-colors cursor-pointer"
                        title={locale === "ar" ? "مسح القالب" : "Delete Template"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
