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
        <div className="space-y-5">
          {/* Catalog Top Filter */}
          <div className="stitch-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-start">
                <h3 className="text-base font-bold font-mono text-on-surface">
                  {locale === "ar" ? "دليل التمارين والحركات" : "Lifting & Exercise Library"}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {locale === "ar"
                    ? "المعايير القياسية المعتمدة والتمارين المخصصة"
                    : "Canonical rated benchmarks and custom movements"}
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-on-surface self-start sm:self-auto">
                {locale === "ar" ? `${filteredExercises.length} تمرين مسجل` : `${filteredExercises.length} Exercises Listed`}
              </span>
            </div>

            {/* Search & Muscle Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3 rtl:left-auto rtl:right-3 top-3" />
                <input
                  type="text"
                  placeholder={locale === "ar" ? "ابحث بالاسم أو الجهاز..." : "Filter by name or equipment..."}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full bg-surface-container-low border border-border-subtle rounded-xl pl-9 rtl:pl-4 rtl:pr-9 pr-4 py-2 text-xs font-mono text-on-surface focus:border-secondary-cyan focus:outline-none text-start"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {muscleGroups.map((muscle) => {
                  const muscleNames: Record<string, string> = {
                    all: "الكل",
                    chest: "صدر",
                    back: "ظهر",
                    legs: "رجلين",
                    shoulders: "أكتاف",
                    arms: "دراع",
                    core: "بطن",
                    "full body": "جسم كامل",
                  };
                  return (
                    <button
                      key={muscle}
                      onClick={() => setSelectedMuscle(muscle)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono capitalize transition-all cursor-pointer whitespace-nowrap ${
                        selectedMuscle === muscle
                          ? "bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/40 font-bold"
                          : "bg-surface-container-low text-text-muted border border-border-subtle hover:text-on-surface"
                      }`}
                    >
                      {locale === "ar" ? (muscleNames[muscle.toLowerCase()] || muscle) : muscle}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Catalog Error */}
          {catalogError && (
            <div className="p-4 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-3 text-crimson-alert text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{locale === "ar" ? `خطأ في تحميل الدليل: ${catalogError}` : `Error loading catalog: ${catalogError}`}</span>
            </div>
          )}

          {/* Catalog Loading */}
          {loadingCatalog && (
            <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-secondary-cyan" />
              <span className="text-xs font-mono">{locale === "ar" ? "جاري تحميل التمارين..." : "Loading library..."}</span>
            </div>
          )}

          {/* Catalog Grid */}
          {!loadingCatalog && filteredExercises.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="stitch-card hover:border-secondary-cyan/30 p-4 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-start">
                      <h4 className="text-sm font-semibold text-on-surface tracking-tight">
                        {ex.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-text-muted capitalize">
                          {ex.muscle_group}
                        </span>
                        <span className="text-[11px] text-text-muted">•</span>
                        <span className="text-[11px] font-mono text-text-muted capitalize">
                          {ex.equipment}
                        </span>
                      </div>
                    </div>
                    {ex.is_ranked && (
                      <span className="px-2 py-0.5 rounded-md bg-primary-ink/10 border border-primary-ink/30 text-[10px] font-mono text-primary-ink font-bold uppercase shrink-0">
                        {locale === "ar" ? "معتمد" : "Ranked"}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span>{locale === "ar" ? "المفتاح:" : "Key:"} {ex.ranked_key || (locale === "ar" ? "مخصص" : "custom")}</span>
                    <span className="truncate max-w-[120px]">
                      ID: {ex.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
