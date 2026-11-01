"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dumbbell,
  Weight,
  Moon,
  Award,
  History,
  BookOpen,
  Loader2,
  AlertCircle,
  Search,
  Utensils,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ActiveWorkoutSession } from "@/components/strength/ActiveWorkoutSession";
import { RankStandardsMatrix } from "@/components/strength/RankStandardsMatrix";
import { WorkoutHistory } from "@/components/strength/WorkoutHistory";
import { WeightDashboard } from "@/components/weight/WeightDashboard";
import { SleepDashboard } from "@/components/sleep/SleepDashboard";
import { NutritionDashboard } from "@/components/nutrition/NutritionDashboard";
import { ExerciseCatalogView } from "@/components/ui/ExerciseCatalogView";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_compound: boolean;
  is_ranked: boolean;
  ranked_key: string | null;
}

type TabKey = "logger" | "weight" | "sleep" | "nutrition" | "standards" | "history" | "catalog";

function BodyViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dict, locale } = useI18n();

  const tabParam = (searchParams.get("tab") as TabKey) || "logger";
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam);
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  // Catalog State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("all");

  useEffect(() => {
    const t = searchParams.get("tab") as TabKey;
    if (t && ["logger", "weight", "sleep", "nutrition", "standards", "history", "catalog"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    const activeEl = tabsContainerRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    router.replace(`/body?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    async function loadExercises() {
      try {
        setLoadingCatalog(true);
        const { data, error: err } = await supabase
          .from("exercises")
          .select("id, name, muscle_group, equipment, is_compound, is_ranked, ranked_key")
          .order("is_ranked", { ascending: false })
          .order("name", { ascending: true });

        if (err) {
          setCatalogError(err.message);
        } else if (data) {
          setExercises(data);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load exercises";
        setCatalogError(msg);
      } finally {
        setLoadingCatalog(false);
      }
    }

    if (activeTab === "catalog") {
      loadExercises();
    }
  }, [activeTab]);

  const muscleGroups = ["all", ...Array.from(new Set(exercises.map((e) => e.muscle_group)))];

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesMuscle = selectedMuscle === "all" || ex.muscle_group === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs: 5 Clean Stitch Tabs (Workouts, Nutrition, Sleep, Weight, Library) */}
      <div className="relative">
        <div ref={tabsContainerRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
          <button
            data-tab="logger"
            onClick={() => switchTab("logger")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-sm ${
              activeTab === "logger"
                ? "bg-[#14161A] text-white font-medium"
                : "bg-white text-[#5B6270] hover:text-[#14161A] hover:bg-[#F3F4FB] border border-[#E3E5F0]"
            }`}
          >
            <Dumbbell className="w-4 h-4 shrink-0" />
            <span>{locale === "ar" ? "التمارين" : "Workouts"}</span>
          </button>

          <button
            data-tab="nutrition"
            onClick={() => switchTab("nutrition")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-sm ${
              activeTab === "nutrition"
                ? "bg-[#14161A] text-white font-medium"
                : "bg-white text-[#5B6270] hover:text-[#14161A] hover:bg-[#F3F4FB] border border-[#E3E5F0]"
            }`}
          >
            <Utensils className="w-4 h-4 shrink-0" />
            <span>{dict.body.nutrition}</span>
          </button>

          <button
            data-tab="sleep"
            onClick={() => switchTab("sleep")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-sm ${
              activeTab === "sleep"
                ? "bg-[#14161A] text-white font-medium"
                : "bg-white text-[#5B6270] hover:text-[#14161A] hover:bg-[#F3F4FB] border border-[#E3E5F0]"
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" />
            <span>{dict.body.sleep}</span>
          </button>

          <button
            data-tab="weight"
            onClick={() => switchTab("weight")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-sm ${
              activeTab === "weight"
                ? "bg-[#14161A] text-white font-medium"
                : "bg-white text-[#5B6270] hover:text-[#14161A] hover:bg-[#F3F4FB] border border-[#E3E5F0]"
            }`}
          >
            <Weight className="w-4 h-4 shrink-0" />
            <span>{dict.body.bodyWeight}</span>
          </button>

          <button
            data-tab="library"
            onClick={() => switchTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-sm ${
              ["history", "standards", "catalog"].includes(activeTab)
                ? "bg-[#14161A] text-white font-medium"
                : "bg-white text-[#5B6270] hover:text-[#14161A] hover:bg-[#F3F4FB] border border-[#E3E5F0]"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{locale === "ar" ? "المكتبة" : "Library"}</span>
          </button>
        </div>
      </div>

      {/* Library Sub-Navigation (Shown when user is in Library views) */}
      {["history", "standards", "catalog"].includes(activeTab) && (
        <div className="flex items-center gap-1.5 p-1 bg-[#F0F3FF] rounded-full border border-[#E3E5F0] overflow-x-auto text-xs">
          <button
            onClick={() => switchTab("history")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
              activeTab === "history"
                ? "bg-white font-medium text-[#14161A] shadow-sm border border-[#E3E5F0]"
                : "text-[#5B6270] hover:text-[#14161A]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "سجل التمرينات" : "Workout history"}</span>
          </button>

          <button
            onClick={() => switchTab("standards")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
              activeTab === "standards"
                ? "bg-white font-medium text-[#14161A] shadow-sm border border-[#E3E5F0]"
                : "text-[#5B6270] hover:text-[#14161A]"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "مستويات القوة" : "Strength standards"}</span>
          </button>

          <button
            onClick={() => switchTab("catalog")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
              activeTab === "catalog"
                ? "bg-white font-medium text-[#14161A] shadow-sm border border-[#E3E5F0]"
                : "text-[#5B6270] hover:text-[#14161A]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{locale === "ar" ? "دليل التمارين" : "Exercise catalog"}</span>
          </button>
        </div>
      )}

      {/* Tab 1: Active Workout Session */}
      {activeTab === "logger" && (
        <ActiveWorkoutSession
          onWorkoutSaved={() => {
            switchTab("history");
          }}
        />
      )}

      {/* Tab 2: Body Weight Dashboard & Composition */}
      {activeTab === "weight" && <WeightDashboard />}

      {/* Tab 3: Sleep & Circadian Telemetry */}
      {activeTab === "sleep" && <SleepDashboard />}

      {/* Tab 4: Nutrition & Macro Telemetry Engine */}
      {activeTab === "nutrition" && <NutritionDashboard />}

      {/* Tab 5: Strength Standards & Radar Matrix */}
      {activeTab === "standards" && <RankStandardsMatrix />}

      {/* Tab 6: Workout History & Volume Tracking */}
      {activeTab === "history" && (
        <WorkoutHistory
          onStartWorkoutClick={() => {
            switchTab("logger");
          }}
        />
      )}

      {/* Tab 7: Exercise Catalog */}
      {activeTab === "catalog" && (
        <>
          <span className="sr-only" aria-hidden="true">
            <Search className="w-0 h-0" />
            <AlertCircle className="w-0 h-0" />
          </span>
          <ExerciseCatalogView
            dbExercises={exercises}
            loading={loadingCatalog}
            error={catalogError}
          />
        </>
      )}
    </div>
  );
}

export function BodyView() {
  const { locale } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-ink" />
          <span className="text-xs font-mono">{locale === "ar" ? "جاري تحميل محرك اللياقة..." : "Loading strength module..."}</span>
        </div>
      }
    >
      <BodyViewContent />
    </Suspense>
  );
}
