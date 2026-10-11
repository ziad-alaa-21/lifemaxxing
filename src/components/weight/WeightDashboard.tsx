"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Weight,
  TrendingDown,
  TrendingUp,
  Target,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Info,
  Activity,
  Flame,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import {
  WeightLogEntry,
  GoalType,
  calculateBMI,
  calculateMovingAverage,
  calculateRateOfChange,
} from "@/lib/weight";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";

interface WeightDashboardProps {
  onWeightUpdated?: (newWeight: number) => void;
}

export function WeightDashboard({ onWeightUpdated }: WeightDashboardProps) {
  const { isOnline, guardAction } = useOnlineGuard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Profile Body Metrics
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [goalType, setGoalType] = useState<GoalType>("recomp");
  const [heightCm, setHeightCm] = useState<number | null>(null);

  // Weight Log Entries
  const [entries, setEntries] = useState<WeightLogEntry[]>([]);
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "ALL">("30D");

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState("");
  const [newNoteInput, setNewNoteInput] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editTargetWeight, setEditTargetWeight] = useState("");
  const [editGoalType, setEditGoalType] = useState<GoalType>("recomp");
  const [editHeight, setEditHeight] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // Load profile and weight entries
  const loadWeightData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_weight_kg, target_weight_kg, goal_type, height_cm")
        .eq("id", user.id)
        .single();

      if (profile) {
        setTargetWeight(profile.target_weight_kg ? Number(profile.target_weight_kg) : null);
        setGoalType((profile.goal_type as GoalType) || "recomp");
        setHeightCm(profile.height_cm ? Number(profile.height_cm) : null);

        if (profile.current_weight_kg) {
          setCurrentWeight(Number(profile.current_weight_kg));
        }
      }

      // 2. Fetch Weight Entries from events table
      const { data: eventsData, error: eventsErr } = await supabase
        .from("events")
        .select("id, occurred_at, data")
        .eq("user_id", user.id)
        .eq("event_type", "weight_log")
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false });

      if (eventsErr) {
        console.error("Error loading weight logs:", eventsErr);
      }

      const parsedEntries: WeightLogEntry[] = [];
      if (eventsData && eventsData.length > 0) {
        for (const ev of eventsData) {
          const w = ev.data?.weight_kg || ev.data?.weight;
          if (w) {
            parsedEntries.push({
              id: ev.id,
              weight_kg: Number(w),
              occurred_at: ev.occurred_at,
              note: ev.data?.note || undefined,
            });
          }
        }
      }

      setEntries(parsedEntries);

      if (parsedEntries.length > 0) {
        const latestW = parsedEntries[0].weight_kg;
        setCurrentWeight(latestW);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load weight metrics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeightData();
  }, [loadWeightData]);

  // Handle logging a new weight entry
  const handleSaveWeightEntry = async () => {
    guardAction(async () => {
      const val = Number(newWeightInput);
      if (!val || val < 30 || val > 300) {
        alert("Please enter a valid weight between 30 and 300 kg.");
        return;
      }

      if (!userId) return;

      try {
        setIsSavingLog(true);
        const now = new Date().toISOString();

        // 1. Insert into events
        const { error: evErr } = await supabase.from("events").insert({
          user_id: userId,
          event_type: "weight_log",
          occurred_at: now,
          data: {
            weight_kg: val,
            note: newNoteInput.trim() || undefined,
          },
        });

        if (evErr) throw new Error(evErr.message);

        // Try inserting into weight_logs if table exists
        try {
          await supabase.from("weight_logs").insert({
            user_id: userId,
            weight_kg: val,
            logged_at: now,
          });
        } catch {}

        // 2. Update profile
        await supabase
          .from("profiles")
          .update({ target_weight_kg: targetWeight || val })
          .eq("id", userId);

        try {
          await supabase
            .from("profiles")
            .update({ current_weight_kg: val } as Record<string, unknown>)
            .eq("id", userId);
        } catch {}

        setCurrentWeight(val);
        setIsLogModalOpen(false);
        setNewWeightInput("");
        setNewNoteInput("");

        await loadWeightData();

        if (onWeightUpdated) {
          onWeightUpdated(val);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error saving weight entry";
        alert(msg);
      } finally {
        setIsSavingLog(false);
      }
    });
  };

  // Handle saving goal & body metrics
  const handleSaveGoalMetrics = async () => {
    guardAction(async () => {
      if (!userId) return;

      try {
        setIsSavingGoal(true);
        const targetVal = editTargetWeight ? Number(editTargetWeight) : null;
        const heightVal = editHeight ? Number(editHeight) : null;

        const { error: profErr } = await supabase
          .from("profiles")
          .update({
            target_weight_kg: targetVal,
            goal_type: editGoalType,
            height_cm: heightVal,
          })
          .eq("id", userId);

        if (profErr) throw new Error(profErr.message);

        setTargetWeight(targetVal);
        setGoalType(editGoalType);
        setHeightCm(heightVal);
        setIsGoalModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error updating goals";
        alert(msg);
      } finally {
        setIsSavingGoal(false);
      }
    });
  };

  // Delete an entry
  const handleDeleteEntry = async (id: string) => {
    guardAction(async () => {
      if (!confirm("Are you sure you want to remove this weight log entry?")) return;

      try {
        await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", id);
        try {
          await supabase.from("weight_logs").delete().eq("id", id);
        } catch {}

        setEntries((prev) => prev.filter((e) => e.id !== id));
      } catch (err) {
        console.error("Delete entry error:", err);
      }
    });
  };

  // Calculations
  const bmiInfo = calculateBMI(currentWeight || 0, heightCm);
  const weeklyRate = calculateRateOfChange(entries, 14);
  const trendData = calculateMovingAverage(entries, 7);

  // Filter trend data based on selected time range
  const filteredTrendData = React.useMemo(() => {
    if (trendData.length === 0) return [];
    if (timeRange === "ALL") return trendData;

    const days = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return trendData.filter((_, idx) => {
      const orig = entries[entries.length - 1 - idx];
      return orig ? new Date(orig.occurred_at) >= cutoff : true;
    });
  }, [trendData, timeRange, entries]);

  // Delta to target
  let deltaToGoal: number | null = null;
  let goalProgressPercent = 0;
  if (currentWeight && targetWeight) {
    deltaToGoal = Math.round((currentWeight - targetWeight) * 10) / 10;
    if (goalType === "cut") {
      const startWeight = entries.length > 0 ? entries[entries.length - 1].weight_kg : currentWeight;
      const totalToLose = startWeight - targetWeight;
      const lostSoFar = startWeight - currentWeight;
      if (totalToLose > 0) {
        goalProgressPercent = Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100)));
      }
    } else if (goalType === "bulk") {
      const startWeight = entries.length > 0 ? entries[entries.length - 1].weight_kg : currentWeight;
      const totalToGain = targetWeight - startWeight;
      const gainedSoFar = currentWeight - startWeight;
      if (totalToGain > 0) {
        goalProgressPercent = Math.min(100, Math.max(0, Math.round((gainedSoFar / totalToGain) * 100)));
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-cyan/15 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan shadow-[0_0_20px_rgba(93,230,255,0.15)]">
              <Weight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-on-surface">
                Body Composition & Weight
              </h2>
              <p className="text-xs text-on-surface-variant">
                Daily weigh-ins, moving average trends, and automatic strength ratio calibration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setEditTargetWeight(targetWeight ? targetWeight.toString() : "");
                setEditGoalType(goalType);
                setEditHeight(heightCm ? heightCm.toString() : "");
                setIsGoalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-text-muted hover:text-on-surface transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Goal Settings</span>
            </button>

            <button
              onClick={() => {
                setNewWeightInput(currentWeight ? currentWeight.toString() : "");
                setIsLogModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-lime text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-primary-lime/90 shadow-[0_0_15px_rgba(198,255,61,0.2)]"
            >
              <Plus className="w-4 h-4" />
              <span>Log Weight</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-center gap-2 text-crimson-alert text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-secondary-cyan" />
          <span className="text-xs font-mono">Loading body composition data...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Current Weight */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                Current Weight
              </span>
              <div className="text-2xl font-bold font-mono text-on-surface">
                {currentWeight ? `${currentWeight} kg` : "Unlogged"}
              </div>
              <span className="text-[10px] font-mono text-text-muted block">
                {entries.length > 0
                  ? `Last: ${new Date(entries[0].occurred_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}`
                  : "No weigh-ins yet"}
              </span>
            </div>

            {/* Target Weight & Goal */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                  Goal Target
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high uppercase font-bold text-secondary-cyan border border-border-subtle">
                  {goalType}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-secondary-cyan">
                {targetWeight ? `${targetWeight} kg` : "Unset"}
              </div>
              <span className="text-[10px] font-mono text-text-muted block">
                {deltaToGoal !== null
                  ? `${deltaToGoal > 0 ? `+${deltaToGoal}` : deltaToGoal} kg to goal`
                  : "Set target in settings"}
              </span>
            </div>

            {/* Weekly Rate of Change */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                Rate of Change
              </span>
              <div className="text-2xl font-bold font-mono text-primary-lime flex items-center gap-1.5">
                {weeklyRate !== null ? (
                  <>
                    {weeklyRate < 0 ? (
                      <TrendingDown className="w-5 h-5 text-status-success inline" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-secondary-cyan inline" />
                    )}
                    <span>{weeklyRate > 0 ? `+${weeklyRate}` : weeklyRate}</span>
                  </>
                ) : (
                  <span className="text-base text-text-muted font-normal">Calibrating...</span>
                )}
              </div>
              <span className="text-[10px] font-mono text-text-muted block">
                kg / week (14d rolling)
              </span>
            </div>

            {/* BMI & Height */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                BMI & Metrics
              </span>
              <div className="text-2xl font-bold font-mono text-on-surface">
                {bmiInfo.bmi ? `${bmiInfo.bmi}` : "Unset"}
              </div>
              <span className="text-[10px] font-mono text-text-muted block">
                {bmiInfo.bmi ? `${bmiInfo.category} • ${heightCm}cm` : "Add height to compute BMI"}
              </span>
            </div>
          </div>

          {/* Goal Progress Bar */}
          {targetWeight && currentWeight && (
            <div className="p-4 bg-surface-container rounded-2xl border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">
                  Goal Progress toward <strong className="text-on-surface">{targetWeight} kg</strong>:
                </span>
                <span className="text-primary-lime font-bold">
                  {goalProgressPercent}% ({deltaToGoal !== null ? `${Math.abs(deltaToGoal)} kg remaining` : ""})
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-lime rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(198,255,61,0.3)]"
                  style={{ width: `${goalProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Weight Progression Timeline Chart */}
          <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-secondary-cyan" />
                  <h3 className="text-sm font-bold font-mono text-on-surface uppercase tracking-wider">
                    Weight Progression & 7-Day Trend
                  </h3>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Raw daily measurements with smoothed 7-day rolling average to filter water weight
                </p>
              </div>

              {/* Range Filter Buttons */}
              <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl border border-border-subtle self-start sm:self-auto text-xs font-mono">
                {(["7D", "30D", "90D", "ALL"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      timeRange === r
                        ? "bg-secondary-cyan text-charcoal-dark font-bold"
                        : "text-text-muted hover:text-on-surface"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Graphic */}
            <div className="h-64 sm:h-72 w-full pt-2">
              {filteredTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748B", fontSize: 10, fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: "#64748B", fontSize: 10, fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1B2025",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    />
                    {targetWeight && (
                      <ReferenceLine
                        y={targetWeight}
                        stroke="#C6FF3D"
                        strokeDasharray="4 4"
                        label={{
                          value: `Target: ${targetWeight}kg`,
                          fill: "#C6FF3D",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#94A3B8"
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: "#94A3B8" }}
                      name="Daily Log"
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      stroke="#5DE6FF"
                      strokeWidth={2.5}
                      dot={false}
                      name="7-Day Trend"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-mono text-text-muted">
                  Log at least 2 weigh-ins to generate your trend line.
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-5 text-[10px] font-mono border-t border-border-subtle pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-text-muted">Daily Weigh-In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-secondary-cyan" />
                <span className="text-secondary-cyan font-bold">7-Day Trend</span>
              </div>
              {targetWeight && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-primary-lime border-dashed" />
                  <span className="text-primary-lime">Target Weight</span>
                </div>
              )}
            </div>
          </div>

          {/* Weigh-In History Table */}
          <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-lime" />
                <h3 className="text-sm font-bold font-mono text-on-surface uppercase tracking-wider">
                  Weigh-In History
                </h3>
              </div>
              <span className="text-xs font-mono text-text-muted">
                {entries.length} Logs Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-text-muted border-b border-border-subtle/50 pb-2">
                    <th className="py-2 px-3">DATE & TIME</th>
                    <th className="py-2 px-3">WEIGHT</th>
                    <th className="py-2 px-3">DELTA</th>
                    <th className="py-2 px-3">NOTE</th>
                    <th className="py-2 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/30">
                  {entries.slice(0, 15).map((entry, idx) => {
                    const prevEntry = entries[idx + 1];
                    const delta = prevEntry
                      ? Math.round((entry.weight_kg - prevEntry.weight_kg) * 10) / 10
                      : null;

                    const dateStr = new Date(entry.occurred_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const timeStr = new Date(entry.occurred_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={entry.id} className="hover:bg-surface-container-high/40 transition-colors">
                        <td className="py-2.5 px-3 text-on-surface">
                          <span>{dateStr}</span>
                          <span className="text-text-muted ml-2 text-[10px]">{timeStr}</span>
                        </td>
                        <td className="py-2.5 px-3 font-bold font-mono text-on-surface">
                          {entry.weight_kg} kg
                        </td>
                        <td className="py-2.5 px-3">
                          {delta !== null ? (
                            <span
                              className={`font-semibold ${
                                delta === 0
                                  ? "text-text-muted"
                                  : delta < 0
                                  ? "text-status-success"
                                  : "text-secondary-cyan"
                              }`}
                            >
                              {delta > 0 ? `+${delta}` : delta} kg
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted text-[11px] truncate max-w-[150px]">
                          {entry.note || "Morning weigh-in"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-text-muted hover:text-crimson-alert p-1 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {entries.length === 0 && (
                <div className="py-8 text-center text-xs font-mono text-text-muted">
                  No weigh-in logs found. Click "Log Weight" above to record your first entry.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Log Weight Entry Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-darkest/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-border-subtle rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Weight className="w-5 h-5 text-secondary-cyan" />
                <h3 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider">
                  Log Bodyweight
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-text-muted block mb-1">WEIGHT (KG)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 75.4"
                  value={newWeightInput}
                  onChange={(e) => setNewWeightInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-3 py-2 text-base font-bold text-on-surface focus:border-secondary-cyan focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-text-muted block mb-1">NOTE (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. Fasted morning weigh-in"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-3 py-2 text-xs text-on-surface focus:border-secondary-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveWeightEntry}
                disabled={isSavingLog}
                className="w-full py-2.5 rounded-xl bg-primary-lime text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-primary-lime/90 disabled:opacity-50"
              >
                {isSavingLog ? "Saving..." : "Save Weigh-In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal & Metrics Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-darkest/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-border-subtle rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-lime" />
                <h3 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider">
                  Target & Body Metrics
                </h3>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-text-muted block mb-1">GOAL TRAJECTORY</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["cut", "recomp", "bulk"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setEditGoalType(g)}
                      className={`py-1.5 rounded-xl uppercase font-bold text-[11px] border transition-all cursor-pointer ${
                        editGoalType === g
                          ? "bg-primary-lime text-charcoal-dark border-primary-lime"
                          : "bg-surface-container-high text-text-muted border-border-subtle hover:text-on-surface"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-text-muted block mb-1">TARGET WEIGHT (KG)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 72.0"
                  value={editTargetWeight}
                  onChange={(e) => setEditTargetWeight(e.target.value)}
                  className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-on-surface focus:border-primary-lime focus:outline-none"
                />
              </div>

              <div>
                <label className="text-text-muted block mb-1">HEIGHT (CM)</label>
                <input
                  type="number"
                  placeholder="e.g. 178"
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  className="w-full bg-surface-container-low border border-border-subtle rounded-xl px-3 py-2 text-sm font-bold text-on-surface focus:border-primary-lime focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveGoalMetrics}
                disabled={isSavingGoal}
                className="w-full py-2.5 rounded-xl bg-primary-lime text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-primary-lime/90 disabled:opacity-50"
              >
                {isSavingGoal ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
