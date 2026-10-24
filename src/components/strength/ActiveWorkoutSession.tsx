"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Plus,
  Trash2,
  Check,
  Save,
  Timer,
  Sparkles,
  Search,
  X,
  AlertCircle,
  Loader2,
  ChevronRight,
  TrendingUp,
  Weight,
  HelpCircle,
  Award,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  calculateEpley1RM,
  determineTier,
  getTierColor,
  CANONICAL_EXERCISES,
  calculateOverallRank,
  TierName,
} from "@/lib/strength";
import { RestTimer } from "./RestTimer";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_ranked: boolean;
  ranked_key: string | null;
}

interface SetRow {
  id: string;
  setNumber: number;
  weightKg: number | "";
  reps: number | "";
  rpe: number | "";
  isCompleted: boolean;
  e1rm: number | null;
}

interface PreviousPerformance {
  weightKg: number;
  reps: number;
  e1rm: number | null;
  dateStr: string;
}

interface WorkoutExerciseItem {
  instanceId: string;
  exercise: Exercise;
  sets: SetRow[];
  previousPerformance?: PreviousPerformance | null;
}

interface NewRankCelebration {
  exerciseName: string;
  tier: TierName;
  e1rm: number;
  ratio: number;
}

interface ActiveWorkoutSessionProps {
  onWorkoutSaved?: () => void;
}

const CATEGORIES = [
  "All",
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Full Body",
] as const;

export function ActiveWorkoutSession({ onWorkoutSaved }: ActiveWorkoutSessionProps) {
  const { isOnline, guardAction } = useOnlineGuard();
  const { locale } = useI18n();

  // User Profile & Settings
  const [userId, setUserId] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(null);

  // Overall Strength Rank
  const [overallRank, setOverallRank] = useState<{
    overallTier: TierName;
    averageRatio: number;
    liftsCount: number;
    maxLifts: number;
  } | null>(null);

  // Workout state
  const [workoutName, setWorkoutName] = useState("Obsidian Strength Protocol");
  const [sessionExercises, setSessionExercises] = useState<WorkoutExerciseItem[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  // Exercise Selector Modal with Category Picker
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Rest Timer State
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(90);

  // Saving & Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<NewRankCelebration | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Fetch previous performance for an exercise
  const fetchPreviousPerformance = useCallback(
    async (exerciseId: string, uid: string): Promise<PreviousPerformance | null> => {
      try {
        const { data, error } = await supabase
          .from("workout_exercises")
          .select(
            `
            created_at,
            workout_sets (
              weight_kg,
              reps,
              e1rm_kg,
              is_completed
            )
          `
          )
          .eq("user_id", uid)
          .eq("exercise_id", exerciseId)
          .order("created_at", { ascending: false })
          .limit(2);

        if (error || !data || data.length === 0) return null;

        for (const item of data) {
          const sets = item.workout_sets || [];
          const completed = sets.filter((s: { is_completed: boolean }) => s.is_completed);
          if (completed.length > 0) {
            // Find set with max weight
            type CompletedSet = (typeof completed)[number];
            const bestSet = completed.reduce((prev: CompletedSet, curr: CompletedSet) =>
              Number(curr.weight_kg) > Number(prev.weight_kg) ? curr : prev
            );
            const date = new Date(item.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            return {
              weightKg: Number(bestSet.weight_kg),
              reps: Number(bestSet.reps),
              e1rm: bestSet.e1rm_kg ? Number(bestSet.e1rm_kg) : null,
              dateStr: date,
            };
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  // Load User Profile, Bodyweight, and Overall Rank
  const loadUserData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender, current_weight_kg, target_weight_kg")
        .eq("id", user.id)
        .single();

      let currentWeight: number | null = null;
      if (profile) {
        setUserGender(profile.gender || null);
        if (profile.current_weight_kg) {
          currentWeight = Number(profile.current_weight_kg);
        } else if (profile.target_weight_kg) {
          currentWeight = Number(profile.target_weight_kg);
        }
      }

      // 2. Fallback check: latest rank history or events weight log
      if (!currentWeight) {
        const { data: rankData } = await supabase
          .from("user_rank_history")
          .select("bodyweight_kg")
          .eq("user_id", user.id)
          .order("achieved_at", { ascending: false })
          .limit(1);

        if (rankData && rankData.length > 0 && rankData[0].bodyweight_kg) {
          currentWeight = Number(rankData[0].bodyweight_kg);
        }
      }

      if (currentWeight && currentWeight > 0) {
        setBodyweightKg(currentWeight);
      } else {
        setBodyweightKg(null);
      }

      // 3. Calculate Overall Strength Rank from user_rank_history
      const { data: rankHistory } = await supabase
        .from("user_rank_history")
        .select("exercise_id, ratio")
        .eq("user_id", user.id);

      if (rankHistory) {
        // map best ratio per canonical lift
        const bestLifts: { key: string; ratio: number }[] = [];
        for (const c of CANONICAL_EXERCISES) {
          const match = rankHistory
            .filter((r) => r.exercise_id === c.id)
            .sort((a, b) => Number(b.ratio) - Number(a.ratio))[0];
          if (match && Number(match.ratio) > 0) {
            bestLifts.push({ key: c.key, ratio: Number(match.ratio) });
          }
        }
        const overall = calculateOverallRank(bestLifts, profile?.gender || null);
        setOverallRank(overall);
      }
    } catch (err) {
      console.error("Failed to load user profile in logger:", err);
    }
  }, []);

  // Quick set gender if unset
  const handleSetGender = async (selectedGender: "male" | "female") => {
    if (!userId) return;
    try {
      await supabase
        .from("profiles")
        .update({ gender: selectedGender })
        .eq("id", userId);
      setUserGender(selectedGender);
      loadUserData();
    } catch (err) {
      console.error("Error updating gender:", err);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    async function init() {
      try {
        setLoadingExercises(true);
        const { data: exData, error: exErr } = await supabase
          .from("exercises")
          .select("id, name, muscle_group, equipment, is_ranked, ranked_key")
          .order("is_ranked", { ascending: false })
          .order("name", { ascending: true });

        if (!exErr && exData) {
          setAvailableExercises(exData);
        }

        await loadUserData();
      } catch (err) {
        console.error("Failed to initialize workout session:", err);
      } finally {
        setLoadingExercises(false);
      }
    }

    init();
  }, [loadUserData]);

  // Set default initial exercise (Bench Press) if empty
  useEffect(() => {
    if (sessionExercises.length === 0 && availableExercises.length > 0 && userId) {
      const bench =
        availableExercises.find((e) => e.id === "00000000-0000-0000-0000-000000000001") ||
        availableExercises[0];

      if (bench) {
        fetchPreviousPerformance(bench.id, userId).then((prevPerf) => {
          setSessionExercises([
            {
              instanceId: crypto.randomUUID(),
              exercise: bench,
              previousPerformance: prevPerf,
              sets: [
                {
                  id: crypto.randomUUID(),
                  setNumber: 1,
                  weightKg: prevPerf ? prevPerf.weightKg : 80,
                  reps: prevPerf ? prevPerf.reps : 8,
                  rpe: 8,
                  isCompleted: false,
                  e1rm: calculateEpley1RM(
                    prevPerf ? prevPerf.weightKg : 80,
                    prevPerf ? prevPerf.reps : 8
                  ),
                },
                {
                  id: crypto.randomUUID(),
                  setNumber: 2,
                  weightKg: prevPerf ? prevPerf.weightKg : 80,
                  reps: prevPerf ? prevPerf.reps : 8,
                  rpe: 8.5,
                  isCompleted: false,
                  e1rm: calculateEpley1RM(
                    prevPerf ? prevPerf.weightKg : 80,
                    prevPerf ? prevPerf.reps : 8
                  ),
                },
              ],
            },
          ]);
        });
      }
    }
  }, [availableExercises, sessionExercises.length, userId, fetchPreviousPerformance]);

  // Add exercise to session
  const addExerciseToSession = async (ex: Exercise) => {
    let prevPerf: PreviousPerformance | null = null;
    if (userId) {
      prevPerf = await fetchPreviousPerformance(ex.id, userId);
    }

    const isPullUp = ex.id === "00000000-0000-0000-0000-000000000005";
    const defaultWeight = prevPerf ? prevPerf.weightKg : isPullUp ? 0 : 60;
    const defaultReps = prevPerf ? prevPerf.reps : 8;

    const newItem: WorkoutExerciseItem = {
      instanceId: crypto.randomUUID(),
      exercise: ex,
      previousPerformance: prevPerf,
      sets: [
        {
          id: crypto.randomUUID(),
          setNumber: 1,
          weightKg: defaultWeight,
          reps: defaultReps,
          rpe: 8,
          isCompleted: false,
          e1rm: calculateEpley1RM(defaultWeight, defaultReps, isPullUp),
        },
      ],
    };
    setSessionExercises((prev) => [...prev, newItem]);
    setIsPickerOpen(false);
    setSearchQuery("");
  };

  // Remove exercise from session
  const removeExerciseFromSession = (instanceId: string) => {
    setSessionExercises((prev) => prev.filter((item) => item.instanceId !== instanceId));
  };

  // Add set to exercise
  const addSet = (instanceId: string) => {
    setSessionExercises((prev) =>
      prev.map((item) => {
        if (item.instanceId !== instanceId) return item;
        const lastSet = item.sets[item.sets.length - 1];
        const newSetNumber = item.sets.length + 1;
        const defaultWeight = lastSet ? lastSet.weightKg : 60;
        const defaultReps = lastSet ? lastSet.reps : 8;
        const isPullUp = item.exercise.id === "00000000-0000-0000-0000-000000000005";
        const e1rm =
          typeof defaultWeight === "number" && typeof defaultReps === "number"
            ? calculateEpley1RM(defaultWeight, defaultReps, isPullUp)
            : null;

        return {
          ...item,
          sets: [
            ...item.sets,
            {
              id: crypto.randomUUID(),
              setNumber: newSetNumber,
              weightKg: defaultWeight,
              reps: defaultReps,
              rpe: 8,
              isCompleted: false,
              e1rm,
            },
          ],
        };
      })
    );
  };

  // Remove set
  const removeSet = (instanceId: string, setId: string) => {
    setSessionExercises((prev) =>
      prev.map((item) => {
        if (item.instanceId !== instanceId) return item;
        const filtered = item.sets.filter((s) => s.id !== setId);
        const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...item, sets: renumbered };
      })
    );
  };

  // Update set values
  const updateSet = (
    instanceId: string,
    setId: string,
    field: "weightKg" | "reps" | "rpe",
    value: string
  ) => {
    const numValue = value === "" ? "" : Number(value);

    setSessionExercises((prev) =>
      prev.map((item) => {
        if (item.instanceId !== instanceId) return item;

        const isPullUp = item.exercise.id === "00000000-0000-0000-0000-000000000005";
        const updatedSets = item.sets.map((s) => {
          if (s.id !== setId) return s;
          const updated = { ...s, [field]: numValue };

          const w = typeof updated.weightKg === "number" ? updated.weightKg : 0;
          const r = typeof updated.reps === "number" ? updated.reps : 0;
          updated.e1rm = calculateEpley1RM(w, r, isPullUp);

          return updated;
        });

        return { ...item, sets: updatedSets };
      })
    );
  };

  // Toggle set completion and trigger rest timer
  const toggleSetComplete = (instanceId: string, setId: string) => {
    setSessionExercises((prev) =>
      prev.map((item) => {
        if (item.instanceId !== instanceId) return item;
        return {
          ...item,
          sets: item.sets.map((s) => {
            if (s.id !== setId) return s;
            const nextCompleted = !s.isCompleted;
            if (nextCompleted) {
              setTimerInitialSeconds(90);
              setIsTimerOpen(true);
            }
            return { ...s, isCompleted: nextCompleted };
          }),
        };
      })
    );
  };

  // Save Workout to Supabase
  const handleSaveWorkout = async () => {
    guardAction(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccessMsg(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("You must be logged in to save a workout.");
        }

        if (sessionExercises.length === 0) {
          throw new Error("Please add at least one exercise to your session.");
        }

        const totalSets = sessionExercises.flatMap((e) => e.sets);
        const completedSets = totalSets.filter((s) => s.isCompleted);
        if (completedSets.length === 0) {
          throw new Error("Complete at least one set before saving your session.");
        }

        const bw = bodyweightKg || 75;

        // 1. Create Workout Record
        const { data: workoutData, error: workoutErr } = await supabase
          .from("workouts")
          .insert({
            user_id: user.id,
            name: workoutName || "Obsidian Strength Protocol",
            started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (workoutErr || !workoutData) {
          throw new Error(`Failed to save workout: ${workoutErr?.message || "Unknown error"}`);
        }

        const workoutId = workoutData.id;

        // 2. Insert exercises and sets
        let newCelebration: NewRankCelebration | null = null;

        for (let orderIdx = 0; orderIdx < sessionExercises.length; orderIdx++) {
          const item = sessionExercises[orderIdx];

          const { data: weData, error: weErr } = await supabase
            .from("workout_exercises")
            .insert({
              user_id: user.id,
              workout_id: workoutId,
              exercise_id: item.exercise.id,
              order_in_workout: orderIdx + 1,
            })
            .select("id")
            .single();

          if (weErr || !weData) continue;

          const workoutExerciseId = weData.id;

          const setInserts = item.sets.map((s) => ({
            user_id: user.id,
            workout_exercise_id: workoutExerciseId,
            set_number: s.setNumber,
            weight_kg: typeof s.weightKg === "number" ? s.weightKg : 0,
            reps: typeof s.reps === "number" ? s.reps : 0,
            rpe: typeof s.rpe === "number" ? s.rpe : null,
            is_completed: s.isCompleted,
            e1rm_kg: s.e1rm,
          }));

          await supabase.from("workout_sets").insert(setInserts);

          // Evaluate Rank PR
          if (item.exercise.is_ranked) {
            const isPullUp = item.exercise.id === "00000000-0000-0000-0000-000000000005";
            const completedE1rms = item.sets
              .filter((s) => s.isCompleted && s.e1rm !== null)
              .map((s) => s.e1rm as number);

            if (completedE1rms.length > 0) {
              const maxE1rm = Math.max(...completedE1rms);
              const tierEval = determineTier(item.exercise.id, maxE1rm, bw, userGender);

              if (!tierEval.isUnranked) {
                // Check existing PR in user_rank_history
                const { data: existingRanks } = await supabase
                  .from("user_rank_history")
                  .select("ratio")
                  .eq("user_id", user.id)
                  .eq("exercise_id", item.exercise.id)
                  .order("ratio", { ascending: false })
                  .limit(1);

                const currentBestRatio =
                  existingRanks && existingRanks.length > 0 ? Number(existingRanks[0].ratio) : -1;

                if (tierEval.ratio > currentBestRatio) {
                  await supabase.from("user_rank_history").insert({
                    user_id: user.id,
                    exercise_id: item.exercise.id,
                    e1rm_kg: maxE1rm,
                    bodyweight_kg: bw,
                    ratio: tierEval.ratio,
                    tier: tierEval.tier,
                    achieved_at: new Date().toISOString(),
                  });

                  newCelebration = {
                    exerciseName: item.exercise.name,
                    tier: tierEval.tier,
                    e1rm: maxE1rm,
                    ratio: tierEval.ratio,
                  };
                }
              }
            }
          }
        }

        setSaveSuccessMsg("Workout session logged successfully.");
        if (newCelebration) {
          setCelebration(newCelebration);
        }

        // Refresh overall rank
        await loadUserData();

        if (onWorkoutSaved) {
          onWorkoutSaved();
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to save workout";
        setSaveError(msg);
      } finally {
        setIsSaving(false);
      }
    });
  };

  // Filter exercises by category and search
  const filteredExercises = availableExercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscle_group.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      ex.muscle_group.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Gender Unset Warning Banner */}
      {userGender === null && (
        <div className="bg-amber-core/10 border border-amber-core/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-core">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Gender Unset:</strong> Rank thresholds are currently averaged. Set your gender for calibrated standards:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetGender("male")}
              className="px-3 py-1 rounded-lg bg-surface-container-high border border-border-subtle hover:border-amber-core text-on-surface hover:text-amber-core transition-colors cursor-pointer"
            >
              Male
            </button>
            <button
              onClick={() => handleSetGender("female")}
              className="px-3 py-1 rounded-lg bg-surface-container-high border border-border-subtle hover:border-amber-core text-on-surface hover:text-amber-core transition-colors cursor-pointer"
            >
              Female
            </button>
          </div>
        </div>
      )}

      {/* Bodyweight Missing Notice linking to Body Weight tab */}
      {!bodyweightKg && (
        <div className="bg-surface-container border border-border-subtle rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-text-muted">
            <Weight className="w-4 h-4 text-secondary-cyan shrink-0" />
            <span>
              Bodyweight unset. Multipliers will use 75kg default until logged.
            </span>
          </div>
          <Link
            href="/body?tab=weight"
            className="text-xs font-mono text-secondary-cyan hover:underline flex items-center gap-1 font-bold"
          >
            <span>Log in Weight Engine</span>
            <span>&rarr;</span>
          </Link>
        </div>
      )}

      {/* Session Header Card with Overall Strength Rank */}
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1 text-start">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-lime animate-pulse shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wider text-primary-lime font-bold truncate">
                {locale === "ar" ? "التمرين الحالي" : "Active Workout Session"}
              </span>
            </div>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder={locale === "ar" ? "اسم التمرين" : "Session Name"}
              className="text-lg sm:text-xl font-bold font-mono text-on-surface bg-transparent border-b border-transparent hover:border-border-subtle focus:border-primary-lime focus:outline-none transition-colors w-full truncate py-0.5 text-start"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bodyweight Indicator (Read-only, loaded from profiles.current_weight_kg) */}
            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-xl border border-border-subtle select-none">
              <Weight className="w-4 h-4 text-secondary-cyan shrink-0" />
              <span className="text-xs font-mono text-text-muted">{locale === "ar" ? "الوزن:" : "Bodyweight:"}</span>
              <span className="text-xs font-mono font-bold text-on-surface">
                {bodyweightKg ? `${bodyweightKg} ${locale === "ar" ? "كيلو" : "kg"}` : (locale === "ar" ? "غير محدد" : "Unset")}
              </span>
            </div>

            {/* Rest Timer Button */}
            <button
              onClick={() => setIsTimerOpen(!isTimerOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ice-blue/10 hover:bg-ice-blue/20 border border-ice-blue/30 text-ice-blue text-xs font-mono transition-colors cursor-pointer"
            >
              <Timer className="w-4 h-4" />
              <span>{locale === "ar" ? "مؤقت الراحة" : "Rest Timer"}</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSaveWorkout}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-lime hover:bg-primary-lime-dim text-on-primary font-mono font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-on-primary stroke-current" />
                  <span>{locale === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-on-primary stroke-current" />
                  <span>{locale === "ar" ? "إنهاء التمرين" : "Finish Workout"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Overall Strength Rank Banner */}
        {overallRank && (
          <div className="pt-3 border-t border-border-subtle/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/60 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rank-gold/10 border border-rank-gold/30 flex items-center justify-center text-rank-gold">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                  {locale === "ar" ? "المستوى العام للقوة" : "Overall Strength Rank"}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${getTierColor(
                      overallRank.overallTier
                    )}`}
                  >
                    {overallRank.overallTier}
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    ({locale === "ar" ? "متوسط" : "Avg."} {overallRank.averageRatio.toFixed(2)}x {locale === "ar" ? "وزن الجسم" : "BW"})
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs font-mono text-text-muted self-start sm:self-auto">
              {locale === "ar" ? (
                <>
                  بناءً على <strong className="text-on-surface">{overallRank.liftsCount} من {overallRank.maxLifts}</strong> تمارين قوة معتمدة
                </>
              ) : (
                <>
                  Based on{" "}
                  <strong className="text-on-surface">
                    {overallRank.liftsCount} of {overallRank.maxLifts}
                  </strong>{" "}
                  canonical ranked lifts
                </>
              )}
            </div>
          </div>
        )}

        {/* Offline / Error Alerts */}
        {!isOnline && (
          <div className="mt-4 p-3 bg-rank-bronze/10 border border-rank-bronze/30 rounded-xl flex items-center gap-2 text-rank-bronze text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{locale === "ar" ? "أنت غير متصل بالإنترنت: حفظ التمرين محتاج اتصال بالشبكة." : "Offline mode active: Saving workout to database requires network connectivity."}</span>
          </div>
        )}

        {saveError && (
          <div className="mt-4 p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-status-success/10 border border-status-success/30 rounded-xl flex items-center gap-2 text-status-success text-xs font-mono">
            <Check className="w-4 h-4 shrink-0" />
            <span>{locale === "ar" ? "تم تسجيل التمرين بنجاح!" : saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Exercises in Session */}
      <div className="space-y-4">
        {sessionExercises.map((item, itemIdx) => {
          const isPullUp = item.exercise.id === "00000000-0000-0000-0000-000000000005";

          return (
            <div
              key={item.instanceId}
              className="bg-surface-container rounded-2xl border border-border-subtle p-4 sm:p-5 space-y-4"
            >
              {/* Exercise Header */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-xs font-mono font-bold text-text-muted">
                    #{itemIdx + 1}
                  </span>
                  <div className="text-start">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold font-mono text-on-surface">
                        {item.exercise.name}
                      </h3>
                      {item.exercise.is_ranked && (
                        <span className="px-2 py-0.5 rounded-md bg-primary-lime/10 border border-primary-lime/30 text-[10px] font-mono text-primary-lime font-bold uppercase">
                          {locale === "ar" ? "معتمد" : "Ranked"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-text-muted capitalize">
                        {item.exercise.muscle_group} • {item.exercise.equipment}
                      </span>
                      {/* Last Session Telemetry Inline */}
                      {item.previousPerformance && (
                        <>
                          <span className="text-[11px] text-text-muted">•</span>
                          <span className="text-[11px] font-mono text-secondary-cyan">
                            {locale === "ar" ? "آخر مرة" : "Last"} ({item.previousPerformance.dateStr}): {item.previousPerformance.weightKg} {locale === "ar" ? "كجم" : "kg"} × {item.previousPerformance.reps}
                            {item.previousPerformance.e1rm && ` (e1RM: ${item.previousPerformance.e1rm} ${locale === "ar" ? "كجم" : "kg"})`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeExerciseFromSession(item.instanceId)}
                  className="w-8 h-8 rounded-lg hover:bg-surface-container-high text-text-muted hover:text-crimson-alert flex items-center justify-center transition-colors cursor-pointer"
                  title={locale === "ar" ? "حذف التمرين" : "Remove Exercise"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Set Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs font-mono">
                  <thead>
                    <tr className="text-text-muted border-b border-border-subtle/50 pb-2">
                      <th className="py-2 px-2 w-12 text-center">{locale === "ar" ? "مجموعة" : "SET"}</th>
                      <th className="py-2 px-2 w-32">
                        {isPullUp
                          ? (locale === "ar" ? "الوزن المضاف (كجم)" : "ADDED WEIGHT (KG)")
                          : (locale === "ar" ? "الوزن (كجم)" : "WEIGHT (KG)")}
                      </th>
                      <th className="py-2 px-2 w-24">{locale === "ar" ? "عدات" : "REPS"}</th>
                      <th className="py-2 px-2 w-20">RPE</th>
                      <th className="py-2 px-2">{locale === "ar" ? "أقصى وزن ومستوى" : "EST. 1RM & TIER"}</th>
                      <th className="py-2 px-2 w-16 text-center">{locale === "ar" ? "تمت" : "DONE"}</th>
                      <th className="py-2 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/30">
                    {item.sets.map((s) => {
                      const bw = bodyweightKg || 75;
                      const tierEval =
                        s.e1rm !== null && item.exercise.is_ranked
                          ? determineTier(item.exercise.id, s.e1rm, bw, userGender)
                          : null;

                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors ${
                            s.isCompleted
                              ? "bg-status-success/5 text-on-surface"
                              : "hover:bg-surface-container-low"
                          }`}
                        >
                          {/* Set Number */}
                          <td className="py-2.5 px-2 text-center font-bold text-text-muted">
                            {s.setNumber}
                          </td>

                          {/* Weight Input */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.5"
                              value={s.weightKg}
                              onChange={(e) =>
                                updateSet(item.instanceId, s.id, "weightKg", e.target.value)
                              }
                              placeholder="0"
                              className="w-24 px-2 py-1.5 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface font-mono font-bold focus:border-primary-lime focus:outline-none"
                            />
                          </td>

                          {/* Reps Input */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={s.reps}
                              onChange={(e) =>
                                updateSet(item.instanceId, s.id, "reps", e.target.value)
                              }
                              placeholder="0"
                              className="w-16 px-2 py-1.5 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface font-mono font-bold focus:border-primary-lime focus:outline-none"
                            />
                          </td>

                          {/* RPE Input */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.5"
                              max="10"
                              min="5"
                              value={s.rpe}
                              onChange={(e) =>
                                updateSet(item.instanceId, s.id, "rpe", e.target.value)
                              }
                              placeholder="8"
                              className="w-14 px-2 py-1.5 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface font-mono focus:border-primary-lime focus:outline-none"
                            />
                          </td>

                          {/* Live 1RM Badge & Projected Tier */}
                          <td className="py-2 px-2">
                            {s.e1rm !== null ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-1 rounded-md bg-primary-lime/10 border border-primary-lime/30 text-primary-lime font-bold text-[11px]">
                                  {isPullUp && s.e1rm === 0 ? (locale === "ar" ? "وزن الجسم" : "Strict BW") : `${s.e1rm} ${locale === "ar" ? "كجم" : "kg"}`}
                                </span>
                                {tierEval && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getTierColor(
                                      tierEval.tier
                                    )}`}
                                  >
                                    {tierEval.tier}
                                  </span>
                                )}
                              </div>
                            ) : typeof s.reps === "number" && s.reps > 10 ? (
                              <span className="text-[10px] text-text-muted italic">
                                {locale === "ar" ? ">10 عدات (تحمل)" : ">10 reps (endurance)"}
                              </span>
                            ) : (
                              <span className="text-[11px] text-text-muted">-</span>
                            )}
                          </td>

                          {/* Complete Checkbox */}
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => toggleSetComplete(item.instanceId, s.id)}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer mx-auto ${
                                s.isCompleted
                                  ? "bg-status-success text-on-primary border-status-success shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                                  : "border-border-subtle bg-surface-container-high text-transparent hover:border-status-success/50"
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                          </td>

                          {/* Remove Set */}
                          <td className="py-2 px-2 text-end">
                            <button
                              onClick={() => removeSet(item.instanceId, s.id)}
                              className="text-text-muted hover:text-crimson-alert p-1 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Set Button */}
              <div className="pt-2 text-start">
                <button
                  onClick={() => addSet(item.instanceId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "إضافة مجموعة" : "Add Set"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Exercise Trigger Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle hover:border-secondary-cyan/40 text-xs font-mono text-on-surface font-semibold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 text-secondary-cyan" />
          <span>{locale === "ar" ? "إضافة تمرين للجلسة" : "Add Exercise to Session"}</span>
        </button>
      </div>

      {/* Exercise Picker Modal with Category Filter */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-darkest/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-border-subtle rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-secondary-cyan" />
                <h3 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider">
                  {locale === "ar" ? "اختيار تمرين" : "Select Exercise"}
                </h3>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Picker Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => {
                const catLabels: Record<string, string> = {
                  All: "الكل",
                  Chest: "صدر",
                  Back: "ظهر",
                  Legs: "رجلين",
                  Shoulders: "أكتاف",
                  Arms: "دراع",
                  Core: "بطن",
                  "Full Body": "جسم كامل",
                };
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-secondary-cyan text-on-primary font-bold"
                        : "bg-surface-container-high text-text-muted hover:text-on-surface border border-border-subtle"
                    }`}
                  >
                    {locale === "ar" ? (catLabels[cat] || cat) : cat}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 rtl:left-auto rtl:right-3 top-3" />
              <input
                type="text"
                placeholder={locale === "ar" ? "ابحث باسم التمرين..." : "Search exercise by name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-border-subtle rounded-xl pl-9 rtl:pl-4 rtl:pr-9 pr-4 py-2 text-xs font-mono text-on-surface focus:border-secondary-cyan focus:outline-none text-start"
                autoFocus
              />
            </div>

            {/* Exercises List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/50 pr-1">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => addExerciseToSession(ex)}
                  className="py-3 px-2 hover:bg-surface-container-high rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="text-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface group-hover:text-secondary-cyan font-mono transition-colors">
                        {ex.name}
                      </span>
                      {ex.is_ranked && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary-lime/10 text-primary-lime border border-primary-lime/30 font-bold uppercase">
                          {locale === "ar" ? "معتمد" : "Ranked"}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted mt-0.5 capitalize">
                      {ex.muscle_group} • {ex.equipment}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-secondary-cyan group-hover:translate-x-1 transition-all rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </div>
              ))}

              {filteredExercises.length === 0 && (
                <div className="py-8 text-center text-xs font-mono text-text-muted">
                  {locale === "ar" ? "مفيش تمارين مطابقة لبحثك." : `No matching exercises found for ${selectedCategory}.`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PR Celebration Modal */}
      {celebration && (
        <div className="fixed inset-0 z-50 bg-charcoal-darkest/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container border border-primary-lime/50 rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-[0_0_50px_rgba(198,255,61,0.2)]">
            <div className="w-16 h-16 rounded-2xl bg-primary-lime/15 border border-primary-lime/40 flex items-center justify-center text-primary-lime mx-auto shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-primary-lime font-bold">
                {locale === "ar" ? "حققت مستوى قوة جديد! عاش!" : "New Rank Achieved!"}
              </span>
              <h2 className="text-xl font-bold font-mono text-on-surface">
                {celebration.exerciseName}
              </h2>
            </div>

            <div className="py-3 px-4 rounded-xl bg-surface-container-high border border-border-subtle inline-block">
              <span
                className={`text-sm font-mono font-bold px-3 py-1 rounded-lg border ${getTierColor(
                  celebration.tier
                )}`}
              >
                {celebration.tier}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
              <div className="bg-surface-container-low p-2.5 rounded-xl border border-border-subtle">
                <span className="text-text-muted text-[10px] block">{locale === "ar" ? "الوزن الأقصى (1RM)" : "ESTIMATED 1RM"}</span>
                <span className="text-base font-bold text-primary-lime">
                  {celebration.e1rm} {locale === "ar" ? "كجم" : "kg"}
                </span>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-xl border border-border-subtle">
                <span className="text-text-muted text-[10px] block">{locale === "ar" ? "النسبة لوزن جسمك" : "RATIO TO BODYWEIGHT"}</span>
                <span className="text-base font-bold text-secondary-cyan">
                  {celebration.ratio.toFixed(2)}x
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant">
              {locale === "ar"
                ? "الأداء ده تم التحقق منه وتوثيقه رسميًا في سجل قوتك البدنية."
                : "This performance has been verified and permanently recorded in your Strength Rank History."}
            </p>

            <button
              onClick={() => setCelebration(null)}
              className="w-full py-2.5 rounded-xl bg-primary-lime text-on-primary font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-primary-lime-dim shadow-xs"
            >
              {locale === "ar" ? "استمرار" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Rest Timer Component */}
      <RestTimer
        isOpen={isTimerOpen}
        initialSeconds={timerInitialSeconds}
        onClose={() => setIsTimerOpen(false)}
      />
    </div>
  );
}
