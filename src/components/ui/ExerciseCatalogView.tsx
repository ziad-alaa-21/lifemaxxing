"use client";

import React, { useState, useMemo } from "react";
import { Search, AlertCircle, Loader2, Sparkles, Filter, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  COMPREHENSIVE_EXERCISE_CATALOG,
  CatalogExerciseItem,
} from "./ExerciseCatalogData";

interface ExerciseFromDb {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_compound?: boolean;
  is_ranked?: boolean;
  ranked_key?: string | null;
}

interface ExerciseCatalogViewProps {
  dbExercises: ExerciseFromDb[];
  loading: boolean;
  error: string | null;
}

export function ExerciseCatalogView({
  dbExercises,
  loading,
  error,
}: ExerciseCatalogViewProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [movementType, setMovementType] = useState<"all" | "unilateral" | "bilateral">("all");

  // Merge database exercises with comprehensive catalog (ensuring DB canonical exercises map cleanly)
  const allExercises = useMemo(() => {
    const list: CatalogExerciseItem[] = [...COMPREHENSIVE_EXERCISE_CATALOG];
    const catalogMap = new Map<string, CatalogExerciseItem>();
    list.forEach((item) => {
      catalogMap.set(item.name.toLowerCase().trim(), item);
      catalogMap.set(item.id, item);
    });

    // If database returned custom exercises created by user, incorporate them
    for (const dbEx of dbExercises) {
      const matchByName = catalogMap.get(dbEx.name.toLowerCase().trim());
      const matchById = catalogMap.get(dbEx.id);
      if (!matchByName && !matchById) {
        // Custom exercise from DB
        list.push({
          id: dbEx.id,
          name: dbEx.name,
          name_ar: dbEx.name,
          muscle_group: (dbEx.muscle_group.toLowerCase() as any) || "chest",
          equipment: (dbEx.equipment.toLowerCase() as any) || "barbell",
          is_compound: dbEx.is_compound ?? false,
          is_ranked: dbEx.is_ranked ?? false,
          ranked_key: dbEx.ranked_key ?? null,
          is_unilateral:
            dbEx.name.toLowerCase().includes("single") ||
            dbEx.name.toLowerCase().includes("one-arm") ||
            dbEx.name.toLowerCase().includes("unilateral"),
        });
      }
    }

    return list;
  }, [dbExercises]);

  // Filtered list
  const filteredExercises = useMemo(() => {
    return allExercises.filter((ex) => {
      // Search query (English name, Arabic name, equipment, muscle)
      const q = search.toLowerCase().trim();
      if (q) {
        const matchesNameEn = ex.name.toLowerCase().includes(q);
        const matchesNameAr = ex.name_ar.toLowerCase().includes(q);
        const matchesEquip = ex.equipment.toLowerCase().includes(q);
        const matchesMuscle = ex.muscle_group.toLowerCase().includes(q);
        if (!matchesNameEn && !matchesNameAr && !matchesEquip && !matchesMuscle) {
          return false;
        }
      }

      // Muscle group filter
      if (selectedMuscle !== "all" && ex.muscle_group !== selectedMuscle) {
        return false;
      }

      // Equipment filter
      if (selectedEquipment !== "all" && ex.equipment !== selectedEquipment) {
        return false;
      }

      // Movement type filter (Unilateral / Single-Arm vs Bilateral)
      if (movementType === "unilateral" && !ex.is_unilateral) {
        return false;
      }
      if (movementType === "bilateral" && ex.is_unilateral) {
        return false;
      }

      return true;
    });
  }, [allExercises, search, selectedMuscle, selectedEquipment, movementType]);

  const muscleCategories = [
    { key: "all", en: "All", ar: "الكل" },
    { key: "chest", en: "Chest", ar: "الصدر" },
    { key: "back", en: "Back", ar: "الظهر" },
    { key: "shoulders", en: "Shoulders", ar: "الأكتاف" },
    { key: "arms", en: "Arms", ar: "الذراعين" },
    { key: "legs", en: "Legs", ar: "الأرجل" },
    { key: "core", en: "Core", ar: "البطن والخصر" },
  ];

  const equipmentCategories = [
    { key: "all", en: "All Equipment", ar: "جميع الأجهزة" },
    { key: "barbell", en: "Barbell", ar: "بار حديدي" },
    { key: "dumbbell", en: "Dumbbell", ar: "دمبل" },
    { key: "cable", en: "Cable", ar: "كابل" },
    { key: "machine", en: "Machine", ar: "أجهزة" },
    { key: "bodyweight", en: "Bodyweight", ar: "وزن الجسم" },
    { key: "kettlebell", en: "Kettlebell", ar: "كيتل بيل" },
  ];

  const unilateralCount = useMemo(
    () => allExercises.filter((e) => e.is_unilateral).length,
    [allExercises]
  );

  return (
    <div className="space-y-5">
      {/* Search & Main Filter Card */}
      <div className="stitch-card p-5 sm:p-6 space-y-4 shadow-sm border border-border-subtle bg-surface-container-lowest">
        {/* Header & Stats Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle/60">
          <div className="text-start">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold font-mono text-on-surface">
                {isAr ? "دليل التمارين والحركات الشامل" : "Comprehensive Lifting & Exercise Library"}
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-cyan/15 border border-secondary-cyan/30 text-[11px] font-mono text-secondary-cyan font-semibold">
                <Sparkles className="w-3 h-3" />
                {isAr ? "دليل احترافي" : "Pro Library"}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isAr
                ? "المعايير المعتمدة، الحركات المركبة، والتمارين الفردية بالدمبل والكابل"
                : "Canonical rated benchmarks, compound lifts, and unilateral single-arm movements"}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-medium px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-on-surface">
              {isAr
                ? `${filteredExercises.length} تمرين من ${allExercises.length}`
                : `${filteredExercises.length} of ${allExercises.length} Exercises`}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 rtl:left-auto rtl:right-3 top-3.5" />
          <input
            type="text"
            placeholder={
              isAr
                ? "ابحث بالاسم (إنجليزي أو عربي) أو الجهاز أو العضلة..."
                : "Search by movement name, equipment, or muscle..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-border-subtle rounded-xl pl-9 rtl:pl-10 rtl:pr-9 pr-10 py-2.5 text-xs sm:text-sm font-mono text-on-surface focus:border-secondary-cyan focus:outline-none text-start transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 rtl:right-auto rtl:left-3 top-3 text-text-muted hover:text-on-surface p-0.5 rounded-md transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Movement Type Filter Tabs: All / Unilateral (Single Hand) / Bilateral */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono text-on-surface-variant flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            {isAr ? "نوع الحركة:" : "Pattern:"}
          </span>

          <button
            onClick={() => setMovementType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
              movementType === "all"
                ? "bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/40 font-bold shadow-xs"
                : "bg-surface-container-low text-text-muted border border-border-subtle hover:text-on-surface"
            }`}
          >
            {isAr ? "جميع الحركات" : "All Movements"}
          </button>

          <button
            onClick={() => setMovementType("unilateral")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              movementType === "unilateral"
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold shadow-xs"
                : "bg-surface-container-low text-text-muted border border-border-subtle hover:text-on-surface"
            }`}
          >
            <span>{isAr ? "حركات فردية (يد / رجل واحدة)" : "Unilateral / Single-Arm"}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
              {unilateralCount}
            </span>
          </button>

          <button
            onClick={() => setMovementType("bilateral")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
              movementType === "bilateral"
                ? "bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/40 font-bold shadow-xs"
                : "bg-surface-container-low text-text-muted border border-border-subtle hover:text-on-surface"
            }`}
          >
            {isAr ? "حركات ثنائية (بالطرفين)" : "Bilateral"}
          </button>
        </div>

        {/* Muscle Groups Filter Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {muscleCategories.map((m) => {
              const count =
                m.key === "all"
                  ? allExercises.length
                  : allExercises.filter((e) => e.muscle_group === m.key).length;
              const isSelected = selectedMuscle === m.key;

              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedMuscle(m.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-primary-ink text-white font-bold shadow-xs"
                      : "bg-surface-container-low text-text-muted border border-border-subtle hover:text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  <span>{isAr ? m.ar : m.en}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white font-semibold"
                        : "bg-surface-container-high text-text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Equipment Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-border-subtle/50">
          <span className="text-[11px] font-mono text-text-muted shrink-0 mr-1 rtl:mr-0 rtl:ml-1">
            {isAr ? "الجهاز:" : "Equipment:"}
          </span>
          {equipmentCategories.map((eq) => {
            const isSelected = selectedEquipment === eq.key;
            return (
              <button
                key={eq.key}
                onClick={() => setSelectedEquipment(eq.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono capitalize transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? "bg-secondary-cyan/20 text-secondary-cyan border border-secondary-cyan/40 font-bold"
                    : "bg-surface-container-low text-text-muted border border-border-subtle hover:text-on-surface"
                }`}
              >
                {isAr ? eq.ar : eq.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Database Error Banner if any */}
      {error && (
        <div className="p-4 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-3 text-crimson-alert text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{isAr ? `تنبيه: ${error}` : `Database note: ${error}`}</span>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-secondary-cyan" />
          <span className="text-xs font-mono">
            {isAr ? "جاري مزامنة الدليل..." : "Loading catalog..."}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredExercises.length === 0 && (
        <div className="stitch-card p-12 text-center space-y-3 bg-surface-container-lowest border border-border-subtle">
          <div className="w-12 h-12 rounded-full bg-surface-container-high mx-auto flex items-center justify-center text-text-muted">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-on-surface font-mono">
            {isAr ? "لم يتم العثور على أي تمارين مطابقة" : "No matching movements found"}
          </h4>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            {isAr
              ? "جرّب تغيير عبارة البحث أو إزالة بعض الفلاتر (مثل نوع الحركة أو الجهاز)."
              : "Try adjusting your search terms or clearing muscle/equipment filters."}
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedMuscle("all");
              setSelectedEquipment("all");
              setMovementType("all");
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/30 hover:bg-secondary-cyan/25 transition-colors cursor-pointer"
          >
            {isAr ? "إعادة ضبط جميع الفلاتر" : "Reset All Filters"}
          </button>
        </div>
      )}

      {/* Exercise Grid */}
      {!loading && filteredExercises.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredExercises.map((ex) => {
            const muscleBadgeColors: Record<string, string> = {
              chest: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
              back: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              shoulders: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
              arms: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
              legs: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
              core: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
            };

            const badgeColor =
              muscleBadgeColors[ex.muscle_group] ||
              "bg-surface-container-high text-on-surface border-border-subtle";

            return (
              <div
                key={ex.id}
                className="stitch-card hover:border-secondary-cyan/40 p-4 transition-all duration-200 space-y-3 bg-surface-container-lowest border border-border-subtle/80 hover:shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Top Badges & Tags */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Muscle Group Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold capitalize border ${badgeColor}`}
                      >
                        {ex.muscle_group}
                      </span>

                      {/* Equipment Tag */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface-container-low text-on-surface-variant border border-border-subtle capitalize">
                        {ex.equipment}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Unilateral / Single-Arm Indicator */}
                      {ex.is_unilateral && (
                        <span
                          className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold shrink-0"
                          title={isAr ? "حركة فردية ذراع أو رجل واحدة" : "Unilateral single-arm/leg movement"}
                        >
                          {isAr ? "فردي" : "Single-Arm"}
                        </span>
                      )}

                      {/* Ranked Canonical Benchmark Badge */}
                      {ex.is_ranked && (
                        <span className="px-2 py-0.5 rounded-md bg-primary-ink text-white text-[10px] font-mono font-bold uppercase shrink-0 shadow-xs">
                          {isAr ? "معتمد" : "Ranked"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="text-start pt-1">
                    <h4 className="text-sm font-semibold text-on-surface tracking-tight leading-snug">
                      {ex.name}
                    </h4>
                    {ex.name_ar && ex.name_ar !== ex.name && (
                      <p className="text-xs text-on-surface-variant/80 mt-0.5 font-sans leading-relaxed">
                        {ex.name_ar}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer: Metadata (Compound / Isolation / Key) */}
                <div className="pt-2.5 border-t border-border-subtle/60 flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span className="capitalize">
                    {ex.is_compound
                      ? isAr
                        ? "حركة مركبة"
                        : "Compound"
                      : isAr
                      ? "عزل عضلي"
                      : "Isolation"}
                  </span>
                  <span className="truncate max-w-[130px]" title={ex.id}>
                    {ex.ranked_key
                      ? `${isAr ? "مفتاح:" : "Key:"} ${ex.ranked_key}`
                      : `ID: ${ex.id.slice(0, 8)}...`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
