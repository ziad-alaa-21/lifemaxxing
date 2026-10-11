"use client";

import React, { useState, useEffect } from "react";
import {
  Dumbbell,
  Plus,
  Trash2,
  Check,
  Save,
  Timer,
  Award,
  Sparkles,
  Search,
  X,
  AlertCircle,
  Loader2,
  ChevronRight,
  TrendingUp,
  Weight,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  calculateEpley1RM,
  determineTier,
  getTierColor,
  CANONICAL_EXERCISES,
} from "@/lib/strength";
import { RestTimer } from "./RestTimer";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";

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

interface WorkoutExerciseItem {
  instanceId: string;
  exercise: Exercise;
  sets: SetRow[];
}

interface NewRankCelebration {
  exerciseName: string;
  tier: string;
  e1rm: number;
  ratio: number;
}

interface ActiveWorkoutSessionProps {
  onWorkoutSaved?: () => void;
}

export function ActiveWorkoutSession({ onWorkoutSaved }: ActiveWorkoutSessionProps) {
  const { isOnline, guardAction } = useOnlineGuard();

  // Workout state
  const [workoutName, setWorkoutName] = useState("Obsidian Strength Protocol");
  const [bodyweightKg, setBodyweightKg] = useState<number>(75);
  const [sessionExercises, setSessionExercises] = useState<WorkoutExerciseItem[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  // Exercise Selector Modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Rest Timer State
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(90);

  // Saving & Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<NewRankCelebration | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Fetch exercises and user bodyweight
  useEffect(() => {
    async function initData() {
      try {
        setLoadingExercises(true);
        // Load exercises
        const { data: exData, error: exErr } = await supabase
          .from("exercises")
          .select("id, name, muscle_group, equipment, is_ranked, ranked_key")
          .order("is_ranked", { ascending: false })
          .order("name", { ascending: true });

        if (!exErr && exData) {
          setAvailableExercises(exData);
        }

        // Fetch user's latest bodyweight from rank history if available
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: rankData } = await supabase
            .from("user_rank_history")
            .select("bodyweight_kg")
            .eq("user_id", user.id)
            .order("achieved_at", { ascending: false })
            .limit(1);

          if (rankData && rankData.length > 0 && rankData[0].bodyweight_kg) {
            setBodyweightKg(Number(rankData[0].bodyweight_kg));
          }
        }
      } catch (err) {
        console.error("Failed to load initial workout data:", err);
      } finally {
        setLoadingExercises(false);
      }
    }

    initData();
  }, []);

  // Set default initial exercise if empty and exercises loaded
  useEffect(() => {
    if (sessionExercises.length === 0 && availableExercises.length > 0) {
      const bench = availableExercises.find(
        (e) => e.id === "00000000-0000-0000-0000-000000000001"
      ) || availableExercises[0];

      if (bench) {
        setSessionExercises([
          {
            instanceId: crypto.randomUUID(),
            exercise: bench,
            sets: [
              {
                id: crypto.randomUUID(),
                setNumber: 1,
                weightKg: 80,
                reps: 8,
                rpe: 8,
                isCompleted: false,
                e1rm: calculateEpley1RM(80, 8),
              },
              {
                id: crypto.randomUUID(),
                setNumber: 2,
                weightKg: 80,
                reps: 8,
                rpe: 8.5,
                isCompleted: false,
                e1rm: calculateEpley1RM(80, 8),
              },
            ],
          },
        ]);
      }
    }
  }, [availableExercises, sessionExercises.length]);

  // Add exercise to session
  const addExerciseToSession = (ex: Exercise) => {
    const newItem: WorkoutExerciseItem = {
      instanceId: crypto.randomUUID(),
      exercise: ex,
      sets: [
        {
          id: crypto.randomUUID(),
          setNumber: 1,
          weightKg: 60,
          reps: 8,
          rpe: 8,
          isCompleted: false,
          e1rm: calculateEpley1RM(60, 8),
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
        const e1rm =
          typeof defaultWeight === "number" && typeof defaultReps === "number"
            ? calculateEpley1RM(defaultWeight, defaultReps)
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
        // Renumber sets
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

        const updatedSets = item.sets.map((s) => {
          if (s.id !== setId) return s;
          const updated = { ...s, [field]: numValue };

          // recalculate e1rm if weight or reps changed
          const w = typeof updated.weightKg === "number" ? updated.weightKg : 0;
          const r = typeof updated.reps === "number" ? updated.reps : 0;
          updated.e1rm = calculateEpley1RM(w, r);

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
              // Trigger rest timer
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

        // Check that at least one set is completed
        const totalSets = sessionExercises.flatMap((e) => e.sets);
        const completedSets = totalSets.filter((s) => s.isCompleted);
        if (completedSets.length === 0) {
          throw new Error("Complete at least one set before saving your session.");
        }

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

        // 2. Fetch standards for PR rank checking
        const { data: allStandards } = await supabase
          .from("strength_standards")
          .select("exercise_id, tier, multiplier")
          .eq("gender", "male");

        // 3. For each exercise in session, insert workout_exercises and workout_sets
        let newHighestCelebration: NewRankCelebration | null = null;

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

          if (weErr || !weData) {
            console.error("Error creating workout exercise:", weErr);
            continue;
          }

          const workoutExerciseId = weData.id;

          // Insert sets
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

          const { error: setsErr } = await supabase.from("workout_sets").insert(setInserts);
          if (setsErr) {
            console.error("Error inserting sets:", setsErr);
          }

          // Evaluate Rank PR if canonical ranked exercise
          if (item.exercise.is_ranked && allStandards) {
            const exerciseStandards = allStandards.filter((s) => s.exercise_id === item.exercise.id);
            if (exerciseStandards.length > 0) {
              // Find max completed e1rm
              const completedE1rms = item.sets
                .filter((s) => s.isCompleted && s.e1rm !== null)
                .map((s) => s.e1rm as number);

              if (completedE1rms.length > 0) {
                const maxE1rm = Math.max(...completedE1rms);
                const { tier, ratio } = determineTier(
                  item.exercise.id,
                  maxE1rm,
                  bodyweightKg,
                  exerciseStandards
                );

                // Check existing PR in user_rank_history
                const { data: existingRanks } = await supabase
                  .from("user_rank_history")
                  .select("ratio")
                  .eq("user_id", user.id)
                  .eq("exercise_id", item.exercise.id)
                  .order("ratio", { ascending: false })
                  .limit(1);

                const currentBestRatio =
                  existingRanks && existingRanks.length > 0 ? Number(existingRanks[0].ratio) : 0;

                if (ratio > currentBestRatio) {
                  // New PR achieved! Insert into user_rank_history
                  const { error: rankErr } = await supabase.from("user_rank_history").insert({
                    user_id: user.id,
                    exercise_id: item.exercise.id,
                    e1rm_kg: maxE1rm,
                    bodyweight_kg: bodyweightKg,
                    ratio: ratio,
                    tier: tier,
                    achieved_at: new Date().toISOString(),
                  });

                  if (!rankErr) {
                    newHighestCelebration = {
                      exerciseName: item.exercise.name,
                      tier,
                      e1rm: maxE1rm,
                      ratio,
                    };
                  }
                }
              }
            }
          }
        }

        setSaveSuccessMsg("Workout logged successfully to database.");
        if (newHighestCelebration) {
          setCelebration(newHighestCelebration);
        }

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

  const filteredExercises = availableExercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscle_group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Session Header Card */}
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-lime animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-primary-lime font-bold">
                Active Workout Session
              </span>
            </div>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Session Name"
              className="text-xl font-bold font-mono text-on-surface bg-transparent border-b border-transparent hover:border-border-subtle focus:border-primary-lime focus:outline-none transition-colors w-full max-w-md py-0.5"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bodyweight Selector */}
            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-xl border border-border-subtle">
              <Weight className="w-4 h-4 text-secondary-cyan" />
              <span className="text-xs font-mono text-text-muted">BW:</span>
              <input
                type="number"
                value={bodyweightKg}
                onChange={(e) => setBodyweightKg(Math.max(30, Number(e.target.value)))}
                className="w-14 text-xs font-mono font-bold text-on-surface bg-transparent focus:outline-none text-right"
              />
              <span className="text-xs font-mono text-text-muted">kg</span>
            </div>

            {/* Rest Timer Button */}
            <button
              onClick={() => setIsTimerOpen(!isTimerOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ice-blue/10 hover:bg-ice-blue/20 border border-ice-blue/30 text-ice-blue text-xs font-mono transition-colors cursor-pointer"
            >
              <Timer className="w-4 h-4" />
              <span>Rest Timer</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSaveWorkout}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-lime hover:bg-primary-lime/90 text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(198,255,61,0.25)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Finish Workout</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Offline / Error Alerts */}
        {!isOnline && (
          <div className="mt-4 p-3 bg-rank-bronze/10 border border-rank-bronze/30 rounded-xl flex items-center gap-2 text-rank-bronze text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Offline mode active: Saving workout to database requires network connectivity.</span>
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
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Exercises in Session */}
      <div className="space-y-4">
        {sessionExercises.map((item, itemIdx) => (
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
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold font-mono text-on-surface">
                      {item.exercise.name}
                    </h3>
                    {item.exercise.is_ranked && (
                      <span className="px-2 py-0.5 rounded-md bg-primary-lime/10 border border-primary-lime/30 text-[10px] font-mono text-primary-lime font-bold uppercase">
                        Ranked
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-text-muted capitalize">
                    {item.exercise.muscle_group} • {item.exercise.equipment}
                  </span>
                </div>
              </div>

              <button
                onClick={() => removeExerciseFromSession(item.instanceId)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container-high text-text-muted hover:text-crimson-alert flex items-center justify-center transition-colors cursor-pointer"
                title="Remove Exercise"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Set Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-text-muted border-b border-border-subtle/50 pb-2">
                    <th className="py-2 px-2 w-12 text-center">SET</th>
                    <th className="py-2 px-2 w-28">WEIGHT (KG)</th>
                    <th className="py-2 px-2 w-24">REPS</th>
                    <th className="py-2 px-2 w-20">RPE</th>
                    <th className="py-2 px-2">EST. 1RM</th>
                    <th className="py-2 px-2 w-16 text-center">DONE</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/30">
                  {item.sets.map((s) => (
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
                          className="w-20 px-2 py-1.5 rounded-lg bg-surface-container-high border border-border-subtle text-on-surface font-mono font-bold focus:border-primary-lime focus:outline-none"
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

                      {/* Live Epley 1RM Badge */}
                      <td className="py-2 px-2">
                        {s.e1rm !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 rounded-md bg-primary-lime/10 border border-primary-lime/30 text-primary-lime font-bold text-[11px]">
                              {s.e1rm} kg
                            </span>
                            {bodyweightKg > 0 && (
                              <span className="text-[10px] text-text-muted">
                                ({(s.e1rm / bodyweightKg).toFixed(2)}x BW)
                              </span>
                            )}
                          </div>
                        ) : typeof s.reps === "number" && s.reps > 10 ? (
                          <span className="text-[10px] text-text-muted italic">
                            &gt;10 reps (endurance)
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
                              ? "bg-status-success text-charcoal-dark border-status-success shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                              : "border-border-subtle bg-surface-container-high text-transparent hover:border-status-success/50"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </td>

                      {/* Remove Set */}
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => removeSet(item.instanceId, s.id)}
                          className="text-text-muted hover:text-crimson-alert p-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Set Button */}
            <div className="pt-2">
              <button
                onClick={() => addSet(item.instanceId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Set</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Exercise Trigger Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle hover:border-secondary-cyan/40 text-xs font-mono text-on-surface font-semibold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 text-secondary-cyan" />
          <span>Add Exercise to Session</span>
        </button>
      </div>

      {/* Exercise Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-darkest/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-border-subtle rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-secondary-cyan" />
                <h3 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider">
                  Select Exercise
                </h3>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search canonical or custom exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-border-subtle rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-on-surface focus:border-secondary-cyan focus:outline-none"
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
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-on-surface group-hover:text-secondary-cyan font-mono transition-colors">
                        {ex.name}
                      </span>
                      {ex.is_ranked && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary-lime/10 text-primary-lime border border-primary-lime/30 font-bold uppercase">
                          Ranked
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted mt-0.5 capitalize">
                      {ex.muscle_group} • {ex.equipment}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-secondary-cyan group-hover:translate-x-1 transition-all" />
                </div>
              ))}

              {filteredExercises.length === 0 && (
                <div className="py-8 text-center text-xs font-mono text-text-muted">
                  No matching exercises found.
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
            <div className="w-16 h-16 rounded-2xl bg-primary-lime/15 border border-primary-lime/40 flex items-center justify-center text-primary-lime mx-auto shadow-[0_0_24px_rgba(198,255,61,0.3)]">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-primary-lime font-bold">
                New Rank Achieved!
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
                <span className="text-text-muted text-[10px] block">ESTIMATED 1RM</span>
                <span className="text-base font-bold text-primary-lime">
                  {celebration.e1rm} kg
                </span>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-xl border border-border-subtle">
                <span className="text-text-muted text-[10px] block">RATIO TO BODYWEIGHT</span>
                <span className="text-base font-bold text-secondary-cyan">
                  {celebration.ratio.toFixed(2)}x
                </span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant">
              This performance has been verified and permanently recorded in your Strength Rank History.
            </p>

            <button
              onClick={() => setCelebration(null)}
              className="w-full py-2.5 rounded-xl bg-primary-lime text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-primary-lime/90 shadow-[0_0_15px_rgba(198,255,61,0.25)]"
            >
              Continue
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
