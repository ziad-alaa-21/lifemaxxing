"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Calendar,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nContext";

interface WorkoutHistoryItem {
  id: string;
  name: string;
  started_at: string;
  completed_at: string | null;
  workout_exercises: {
    id: string;
    order_in_workout: number;
    exercise_id: string;
    exercises: {
      id: string;
      name: string;
      muscle_group: string;
    } | null;
    workout_sets: {
      id: string;
      set_number: number;
      weight_kg: number;
      reps: number;
      is_completed: boolean;
      e1rm_kg: number | null;
    }[];
  }[];
}

interface WorkoutHistoryProps {
  onStartWorkoutClick?: () => void;
}

export function WorkoutHistory({ onStartWorkoutClick }: WorkoutHistoryProps) {
  const { locale } = useI18n();
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWorkouts([]);
        return;
      }

      const query =
        "id, name, started_at, completed_at, workout_exercises(id, order_in_workout, exercise_id, exercises(id, name, muscle_group), workout_sets(id, set_number, weight_kg, reps, is_completed, e1rm_kg))";

      const { data, error: fetchErr } = await supabase
        .from("workouts")
        .select(query)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("started_at", { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      if (data) {
        // cast data to WorkoutHistoryItem[]
        setWorkouts(data as unknown as WorkoutHistoryItem[]);
        if (data.length > 0) {
          setExpandedWorkoutId(data[0].id);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load workout history";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (workoutId: string) => {
    const confirmMsg = locale === "ar"
      ? "متأكد إنك عاوز تحذف سجل التمرين ده؟"
      : "Are you sure you want to remove this workout log?";
    if (!confirm(confirmMsg)) return;

    try {
      const { error: delErr } = await supabase
        .from("workouts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", workoutId);

      if (delErr) {
        alert(locale === "ar" ? `فشل الحذف: ${delErr.message}` : `Failed to delete: ${delErr.message}`);
      } else {
        setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan shadow-[0_0_16px_rgba(93,230,255,0.2)]">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono text-on-surface">
              {locale === "ar" ? "سجل التمارين والحجم التدريبي" : "Session History & Volume"}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {locale === "ar"
                ? "سجل زمني لجميع التمارين المنتهية، إجمالي الأوزان المرفوعة، وبيانات كل جولة"
                : "Chronological log of completed workouts, tonnage, and individual set telemetry"}
            </p>
          </div>
        </div>

        {onStartWorkoutClick && (
          <button
            onClick={onStartWorkoutClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-lime text-on-primary font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-primary-lime/90 shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{locale === "ar" ? "تمرين جديد" : "New Session"}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-secondary-cyan" />
          <span className="text-xs font-mono">
            {locale === "ar" ? "جاري تحميل سجل التمارين..." : "Loading workout telemetry..."}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loading && workouts.length === 0 && (
        <div className="p-12 bg-surface-container rounded-2xl border border-border-subtle text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted mx-auto">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "لسه مفيش تمارين متسجلة" : "No Workouts Recorded Yet"}
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              {locale === "ar"
                ? "تمارينك وجولات القوة هتظهر هنا فور حفظها."
                : "Your logged sessions and strength sets will appear here once saved."}
            </p>
          </div>
          {onStartWorkoutClick && (
            <button
              onClick={onStartWorkoutClick}
              className="px-4 py-2 rounded-xl bg-primary-lime text-on-primary font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-all cursor-pointer hover:bg-primary-lime/90 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{locale === "ar" ? "ابدأ تمرينك دلوقتي" : "Start Workout Now"}</span>
            </button>
          )}
        </div>
      )}

      {/* Workouts List */}
      {!loading && workouts.length > 0 && (
        <div className="space-y-4">
          {workouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id;
            const startDate = new Date(workout.started_at);
            const formattedDate = startDate.toLocaleDateString(locale === "ar" ? "ar-EG" : undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const formattedTime = startDate.toLocaleTimeString(locale === "ar" ? "ar-EG" : undefined, {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            // Calculate metrics
            let totalTonnage = 0;
            let totalCompletedSets = 0;
            const sortedExercises = [...(workout.workout_exercises || [])].sort(
              (a, b) => a.order_in_workout - b.order_in_workout
            );

            for (const we of sortedExercises) {
              for (const set of we.workout_sets || []) {
                if (set.is_completed) {
                  totalCompletedSets += 1;
                  totalTonnage += Number(set.weight_kg) * Number(set.reps);
                }
              }
            }

            return (
              <div
                key={workout.id}
                className="bg-surface-container rounded-2xl border border-border-subtle overflow-hidden transition-all"
              >
                {/* Header Summary */}
                <div
                  onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-high/40 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold font-mono text-on-surface">
                        {workout.name}
                      </h3>
                      {workout.completed_at && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-status-success bg-status-success/10 px-2 py-0.5 rounded-md border border-status-success/30 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{locale === "ar" ? "مكتمل" : "Finished"}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary-lime" />
                        <span>{formattedDate}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formattedTime}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Tonnage Badge */}
                    <div className="bg-surface-container-high px-3 py-1.5 rounded-xl border border-border-subtle text-end">
                      <span className="text-[10px] font-mono text-text-muted block">
                        {locale === "ar" ? "إجمالي الحجم" : "VOLUME"}
                      </span>
                      <span className="text-xs font-bold font-mono text-primary-lime">
                        {Math.round(totalTonnage).toLocaleString()} {locale === "ar" ? "كجم" : "kg"}
                      </span>
                    </div>

                    {/* Sets Count */}
                    <div className="bg-surface-container-high px-3 py-1.5 rounded-xl border border-border-subtle text-end">
                      <span className="text-[10px] font-mono text-text-muted block">
                        {locale === "ar" ? "الجولات" : "SETS"}
                      </span>
                      <span className="text-xs font-bold font-mono text-secondary-cyan">
                        {totalCompletedSets}
                      </span>
                    </div>

                    {/* Delete Workout */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(workout.id);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-surface-container-highest text-text-muted hover:text-crimson-alert flex items-center justify-center transition-colors cursor-pointer"
                      title={locale === "ar" ? "حذف التمرين" : "Delete workout"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand Arrow */}
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-text-muted">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-border-subtle/50 space-y-4 bg-surface-container-low/40">
                    {sortedExercises.map((we, idx) => (
                      <div
                        key={we.id}
                        className="bg-surface-container border border-border-subtle rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-text-muted">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-bold font-mono text-on-surface">
                              {we.exercises?.name || (locale === "ar" ? "تمرين" : "Exercise")}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-text-muted capitalize">
                            {we.exercises?.muscle_group || ""}
                          </span>
                        </div>

                        {/* Sets table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-start text-xs font-mono">
                            <thead>
                              <tr className="text-text-muted border-b border-border-subtle/30 pb-1">
                                <th className="py-1 px-2 w-16">{locale === "ar" ? "الجولة" : "SET"}</th>
                                <th className="py-1 px-2">{locale === "ar" ? "الوزن" : "WEIGHT"}</th>
                                <th className="py-1 px-2">{locale === "ar" ? "العدات" : "REPS"}</th>
                                <th className="py-1 px-2">{locale === "ar" ? "التقديري 1RM" : "EST. 1RM"}</th>
                                <th className="py-1 px-2 text-end">{locale === "ar" ? "الحالة" : "STATUS"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle/20">
                              {(we.workout_sets || []).map((s) => (
                                <tr key={s.id} className="text-on-surface">
                                  <td className="py-2 px-2 text-text-muted font-bold">
                                    {locale === "ar" ? `جولة ${s.set_number}` : `Set ${s.set_number}`}
                                  </td>
                                  <td className="py-2 px-2 font-bold text-on-surface">
                                    {s.weight_kg} {locale === "ar" ? "كجم" : "kg"}
                                  </td>
                                  <td className="py-2 px-2 font-bold text-on-surface">
                                    {s.reps} {locale === "ar" ? "عدة" : "reps"}
                                  </td>
                                  <td className="py-2 px-2">
                                    {s.e1rm_kg ? (
                                      <span className="text-primary-lime font-bold">
                                        {s.e1rm_kg} {locale === "ar" ? "كجم" : "kg"}
                                      </span>
                                    ) : (
                                      <span className="text-text-muted">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-end">
                                    {s.is_completed ? (
                                      <span className="text-status-success font-semibold">
                                        ✓ {locale === "ar" ? "تم بنجاح" : "Completed"}
                                      </span>
                                    ) : (
                                      <span className="text-text-muted">
                                        {locale === "ar" ? "تم التخطي" : "Skipped"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
