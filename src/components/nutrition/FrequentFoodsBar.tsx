"use client";

import React, { useEffect, useState } from "react";
import { Plus, Sparkles, Undo2, Check, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  FrequentFoodItem,
  normalizeFoodName,
  getLocalDateString,
  MealType,
} from "@/lib/nutrition";
import { useI18n } from "@/lib/i18n/I18nContext";

interface FrequentFoodsBarProps {
  onFoodLogged: () => void;
  userTimezone: string;
}

export function FrequentFoodsBar({
  onFoodLogged,
  userTimezone,
}: FrequentFoodsBarProps) {
  const { isOnline, guardAction } = useOnlineGuard();
  const { locale } = useI18n();

  const [frequentFoods, setFrequentFoods] = useState<FrequentFoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Undo state for 1-tap logging
  const [loggedToast, setLoggedToast] = useState<{ id: string; name: string; calories: number } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchFrequentFoods = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch meal_logs from the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("meal_logs")
        .select("food_name, quantity, unit, calories, protein_g, carbs_g, fats_g, source")
        .eq("user_id", user.id)
        .gte("logged_date", startDateStr)
        .is("deleted_at", null);

      if (error || !data || data.length === 0) {
        setFrequentFoods([]);
        setLoading(false);
        return;
      }

      // Group and normalize (Item 7)
      const groups: Record<
        string,
        {
          display_name: string;
          count: number;
          quantities: number[];
          caloriesList: number[];
          proteins: number[];
          carbs: number[];
          fats: number[];
          unit: string;
          source: any;
        }
      > = {};

      for (const row of data) {
        const norm = normalizeFoodName(row.food_name);
        if (!groups[norm]) {
          groups[norm] = {
            display_name: row.food_name,
            count: 0,
            quantities: [],
            caloriesList: [],
            proteins: [],
            carbs: [],
            fats: [],
            unit: row.unit || "serving",
            source: row.source || "manual",
          };
        }
        groups[norm].count += 1;
        groups[norm].quantities.push(Number(row.quantity) || 1);
        if (row.calories !== null) groups[norm].caloriesList.push(Number(row.calories));
        groups[norm].proteins.push(Number(row.protein_g) || 0);
        groups[norm].carbs.push(Number(row.carbs_g) || 0);
        groups[norm].fats.push(Number(row.fats_g) || 0);
      }

      // Compute typical quantities and calories
      const result: FrequentFoodItem[] = Object.entries(groups)
        .map(([norm, g]) => {
          // Median quantity
          const sortedQty = [...g.quantities].sort((a, b) => a - b);
          const typicalQty = sortedQty[Math.floor(sortedQty.length / 2)] || 1;

          // Average calories
          const avgCal = g.caloriesList.length > 0
            ? Math.round(g.caloriesList.reduce((s, c) => s + c, 0) / g.caloriesList.length)
            : 0;

          const avgProt = g.proteins.length > 0
            ? Math.round((g.proteins.reduce((s, p) => s + p, 0) / g.proteins.length) * 10) / 10
            : 0;
          const avgCarb = g.carbs.length > 0
            ? Math.round((g.carbs.reduce((s, c) => s + c, 0) / g.carbs.length) * 10) / 10
            : 0;
          const avgFat = g.fats.length > 0
            ? Math.round((g.fats.reduce((s, f) => s + f, 0) / g.fats.length) * 10) / 10
            : 0;

          return {
            normalized_name: norm,
            display_name: g.display_name,
            frequency: g.count,
            typical_quantity: typicalQty,
            typical_unit: g.unit,
            typical_calories: avgCal,
            typical_protein_g: avgProt,
            typical_carbs_g: avgCarb,
            typical_fats_g: avgFat,
            source: g.source,
          };
        })
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 8); // Top 8 frequent items

      setFrequentFoods(result);
    } catch (err) {
      console.error("Failed to load frequent foods:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrequentFoods();
  }, []);

  // 1-Tap Quick Logging with confirmation & undo (Item 7)
  const handleQuickLog = async (item: FrequentFoodItem) => {
    guardAction(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Auth required");

        const now = new Date();
        const localDate = getLocalDateString(now, userTimezone);

        // Determine likely meal type based on hour
        const hour = now.getHours();
        let mealType: MealType = "lunch";
        if (hour < 11) mealType = "breakfast";
        else if (hour >= 11 && hour < 16) mealType = "lunch";
        else if (hour >= 16 && hour < 21) mealType = "dinner";
        else mealType = "snack";

        const { data: inserted, error } = await supabase
          .from("meal_logs")
          .insert([
            {
              user_id: user.id,
              logged_date: localDate,
              meal_type: mealType,
              food_name: item.display_name,
              quantity: item.typical_quantity,
              unit: item.typical_unit,
              calories: item.typical_calories,
              protein_g: item.typical_protein_g,
              carbs_g: item.typical_carbs_g,
              fats_g: item.typical_fats_g,
              source: "manual",
              confidence: "high",
              raw_query: `1-Tap Frequent Food: ${item.display_name}`,
              logged_at: now.toISOString(),
            },
          ])
          .select("id")
          .single();

        if (error) throw error;

        // Show what was logged and offer undo toast (Item 7)
        if (inserted) {
          setLoggedToast({
            id: inserted.id,
            name: `${item.typical_quantity} ${item.typical_unit} ${item.display_name}`,
            calories: item.typical_calories,
          });

          if (undoTimeout) clearTimeout(undoTimeout);
          const t = setTimeout(() => setLoggedToast(null), 8000);
          setUndoTimeout(t);
        }

        onFoodLogged();
      } catch (err: any) {
        console.error("Quick log error:", err);
      }
    });
  };

  const handleUndoQuickLog = async () => {
    if (!loggedToast) return;
    guardAction(async () => {
      try {
        const { error } = await supabase
          .from("meal_logs")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", loggedToast.id);

        if (error) throw error;
        setLoggedToast(null);
        if (undoTimeout) clearTimeout(undoTimeout);
        onFoodLogged();
      } catch (err: any) {
        console.error("Failed to undo quick log:", err);
      }
    });
  };

  if (loading || frequentFoods.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Undo Toast */}
      {loggedToast && (
        <div className="p-3 rounded-2xl bg-surface-container border border-primary-lime/40 flex items-center justify-between text-xs font-mono text-on-surface animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-primary-lime" />
            <span>
              {locale === "ar"
                ? `اتسجل ${loggedToast.name} (${loggedToast.calories} سعرة)`
                : `Logged ${loggedToast.name} (${loggedToast.calories} kcal)`}
            </span>
          </div>
          <button
            onClick={handleUndoQuickLog}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-lime text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "تراجع" : "Undo"}</span>
          </button>
        </div>
      )}

      {/* Horizontal Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs no-scrollbar">
        <span className="text-[10px] uppercase tracking-wider text-text-muted shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-secondary-cyan" />
          {locale === "ar" ? "المتكرر:" : "Frequent:"}
        </span>

        {frequentFoods.map((item) => (
          <button
            key={item.normalized_name}
            onClick={() => handleQuickLog(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle hover:border-secondary-cyan hover:bg-secondary-cyan/10 active:scale-95 transition-all shrink-0 cursor-pointer text-start"
            title={
              locale === "ar"
                ? `تسجيل بضغطة واحدة: ${item.typical_quantity} ${item.typical_unit} · ${item.typical_calories} سعرة`
                : `1-Tap Log: ${item.typical_quantity} ${item.typical_unit} · ${item.typical_calories} kcal`
            }
          >
            <Plus className="w-3 h-3 text-secondary-cyan shrink-0" />
            <span className="font-bold text-on-surface">{item.display_name}</span>
            <span className="text-[10px] text-text-muted">
              ({item.typical_quantity} {item.typical_unit} · {item.typical_calories} {locale === "ar" ? "سعرة" : "kcal"})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
