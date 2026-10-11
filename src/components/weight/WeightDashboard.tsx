"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Clock,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import {
  WeightLogEntry,
  GoalType,
  calculateBMI,
  collapseDailyWeights,
  calculateMovingAverage,
  calculateRateOfChange,
  getGoalAwareDeltaSemantic,
  calculateProjectedGoalDate,
} from "@/lib/weight";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";

interface WeightDashboardProps {
  onWeightUpdated?: (newWeight: number) => void;
}

export function WeightDashboard({ onWeightUpdated }: WeightDashboardProps) {
  const { guardAction } = useOnlineGuard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Profile Body Metrics
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [goalType, setGoalType] = useState<GoalType>("recomp");
  const [heightCm, setHeightCm] = useState<number | null>(null);

  // Weight Log Entries (from weight_logs single source of truth)
  const [entries, setEntries] = useState<WeightLogEntry[]>([]);
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "ALL">("30D");

  // Modals & Forms
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightLogEntry | null>(null);

  const [newWeightInput, setNewWeightInput] = useState("");
  const [newNoteInput, setNewNoteInput] = useState("");
  const [newDateInput, setNewDateInput] = useState(new Date().toISOString().split("T")[0]);

  // Goal Form
  const [editTargetWeight, setEditTargetWeight] = useState("");
  const [editGoalType, setEditGoalType] = useState<GoalType>("recomp");
  const [editHeight, setEditHeight] = useState("");

  // Undo Soft-Delete State
  const [lastDeletedEntry, setLastDeletedEntry] = useState<WeightLogEntry | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  // Load Weight Data from weight_logs (Single Source of Truth)
  const loadWeightData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // 1. Fetch Profile
      let profile: {
        current_weight_kg?: number | null;
        target_weight_kg?: number | null;
        goal_type?: string | null;
        height_cm?: number | null;
      } | null = null;

      const { data: profWithCurrent, error: pErr1 } = await supabase
        .from("profiles")
        .select("current_weight_kg, target_weight_kg, goal_type, height_cm")
        .eq("id", user.id)
        .single();

      if (!pErr1 && profWithCurrent) {
        profile = profWithCurrent;
      } else {
        const { data: profBase } = await supabase
          .from("profiles")
          .select("target_weight_kg, goal_type, height_cm")
          .eq("id", user.id)
          .single();
        profile = profBase || null;
      }

      if (profile) {
        setTargetWeight(profile.target_weight_kg ? Number(profile.target_weight_kg) : null);
        setGoalType((profile.goal_type as GoalType) || "recomp");
        setHeightCm(profile.height_cm ? Number(profile.height_cm) : null);
        if (profile.current_weight_kg) {
          setCurrentWeight(Number(profile.current_weight_kg));
        }
      }

      // 2. Fetch from weight_logs table (Single Source of Truth)
      const { data: weightData, error: weightErr } = await supabase
        .from("weight_logs")
        .select("id, weight_kg, logged_at, note, deleted_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("logged_at", { ascending: false });

      if (weightErr) {
        // Honest error display if table is missing or query fails
        setError(
          `weight_logs table: ${weightErr.message} (Code: ${weightErr.code}). Please apply migration 002 in Supabase SQL Editor.`
        );
        setLoading(false);
        return;
      }

      const parsedEntries: WeightLogEntry[] = (weightData || []).map((row) => ({
        id: row.id,
        weight_kg: Number(row.weight_kg),
        logged_at: row.logged_at,
        note: row.note || undefined,
        deleted_at: row.deleted_at || null,
      }));

      setEntries(parsedEntries);

      // Keep latest weight in sync with profiles.current_weight_kg
      const latestLog = parsedEntries.length > 0 ? parsedEntries[0].weight_kg : null;
      if (latestLog !== null) {
        setCurrentWeight(latestLog);
        if (profile?.current_weight_kg !== latestLog) {
          await supabase
            .from("profiles")
            .update({ current_weight_kg: latestLog })
            .eq("id", user.id);
        }
      } else {
        setCurrentWeight(null);
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

  // Sync latest weight to profile
  const syncProfileWeight = async (activeEntries: WeightLogEntry[]) => {
    if (!userId) return;
    const latest = activeEntries.length > 0 ? activeEntries[0].weight_kg : null;
    setCurrentWeight(latest);
    try {
      await supabase
        .from("profiles")
        .update({ current_weight_kg: latest })
        .eq("id", userId);
      if (latest && onWeightUpdated) onWeightUpdated(latest);
    } catch (err) {
      console.error("Profile weight sync failed:", err);
    }
  };

  // Add Weigh-In Entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeightInput) return;

    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val <= 30 || val >= 300) {
      alert("Please enter a valid weight between 30kg and 300kg.");
      return;
    }

    guardAction(async () => {
      try {
        if (!userId) return;

        const loggedAt = new Date(`${newDateInput}T12:00:00Z`).toISOString();
        const { data: newRow, error: insertErr } = await supabase
          .from("weight_logs")
          .insert({
            user_id: userId,
            weight_kg: val,
            note: newNoteInput.trim() || null,
            logged_at: loggedAt,
          })
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        const newEntry: WeightLogEntry = {
          id: newRow.id,
          weight_kg: Number(newRow.weight_kg),
          logged_at: newRow.logged_at,
          note: newRow.note || undefined,
        };

        const updatedEntries = [newEntry, ...entries].sort(
          (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        );

        setEntries(updatedEntries);
        await syncProfileWeight(updatedEntries);

        setIsLogModalOpen(false);
        setNewWeightInput("");
        setNewNoteInput("");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save weight";
        alert(msg);
      }
    });
  };

  // Edit Weigh-In Entry
  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !newWeightInput) return;

    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val <= 30 || val >= 300) {
      alert("Please enter a valid weight between 30kg and 300kg.");
      return;
    }

    guardAction(async () => {
      try {
        const { error: updateErr } = await supabase
          .from("weight_logs")
          .update({
            weight_kg: val,
            note: newNoteInput.trim() || null,
          })
          .eq("id", editingEntry.id);

        if (updateErr) throw new Error(updateErr.message);

        const updatedEntries = entries.map((entry) =>
          entry.id === editingEntry.id
            ? { ...entry, weight_kg: val, note: newNoteInput.trim() || undefined }
            : entry
        );

        setEntries(updatedEntries);
        await syncProfileWeight(updatedEntries);

        setEditingEntry(null);
        setNewWeightInput("");
        setNewNoteInput("");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update weight entry";
        alert(msg);
      }
    });
  };

  // Soft Delete with Undo
  const handleDeleteEntry = async (entry: WeightLogEntry) => {
    guardAction(async () => {
      try {
        // Soft delete on database
        const { error: delErr } = await supabase
          .from("weight_logs")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entry.id);

        if (delErr) throw new Error(delErr.message);

        const remaining = entries.filter((e) => e.id !== entry.id);
        setEntries(remaining);
        await syncProfileWeight(remaining);

        // Save last deleted for undo banner
        setLastDeletedEntry(entry);
        setShowUndoBanner(true);

        // Auto dismiss banner after 8 seconds
        setTimeout(() => {
          setShowUndoBanner(false);
        }, 8000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        alert(msg);
      }
    });
  };

  // Undo Soft Delete
  const handleUndoDelete = async () => {
    if (!lastDeletedEntry) return;

    guardAction(async () => {
      try {
        const { error: undoErr } = await supabase
          .from("weight_logs")
          .update({ deleted_at: null })
          .eq("id", lastDeletedEntry.id);

        if (undoErr) throw new Error(undoErr.message);

        const restored = [lastDeletedEntry, ...entries].sort(
          (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        );

        setEntries(restored);
        await syncProfileWeight(restored);

        setLastDeletedEntry(null);
        setShowUndoBanner(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Undo failed";
        alert(msg);
      }
    });
  };

  // Save Goal Settings
  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    guardAction(async () => {
      try {
        const targetVal = editTargetWeight ? parseFloat(editTargetWeight) : null;
        const heightVal = editHeight ? parseFloat(editHeight) : null;

        const { error: updateErr } = await supabase
          .from("profiles")
          .update({
            target_weight_kg: targetVal,
            goal_type: editGoalType,
            height_cm: heightVal,
          })
          .eq("id", userId);

        if (updateErr) throw new Error(updateErr.message);

        setTargetWeight(targetVal);
        setGoalType(editGoalType);
        setHeightCm(heightVal);
        setIsGoalModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update goals";
        alert(msg);
      }
    });
  };

  // --- Calculations ---
  // 1. Collapse multiple weigh-ins on the same day into a single daily value
  const dailyEntries = useMemo(() => collapseDailyWeights(entries), [entries]);

  // 2. 7-day rolling moving average
  const trendData = useMemo(() => calculateMovingAverage(dailyEntries, 7), [dailyEntries]);

  // 3. Weekly rate of change (OLS regression requiring >=4 entries spanning 7+ days)
  const rateResult = useMemo(() => calculateRateOfChange(dailyEntries, 14), [dailyEntries]);

  // 4. Goal-aware semantics for rate of change
  const rateSemantic = useMemo(
    () => getGoalAwareDeltaSemantic(rateResult.rateKgPerWeek, goalType),
    [rateResult.rateKgPerWeek, goalType]
  );

  // 5. Projected date to goal
  const projectedGoal = useMemo(() => {
    if (!currentWeight || !targetWeight) return null;
    return calculateProjectedGoalDate(
      currentWeight,
      targetWeight,
      rateResult.rateKgPerWeek,
      goalType
    );
  }, [currentWeight, targetWeight, rateResult.rateKgPerWeek, goalType]);

  // 6. Secondary BMI without color judgment
  const bmiInfo = useMemo(() => calculateBMI(currentWeight || 0, heightCm), [currentWeight, heightCm]);

  // Filter trend data based on selected time range
  const filteredTrendData = useMemo(() => {
    if (trendData.length === 0) return [];
    if (timeRange === "ALL") return trendData;

    const days = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    return trendData.filter((d) => d.date >= cutoff);
  }, [trendData, timeRange]);

  // Delta to target
  let deltaToGoal: number | null = null;
  if (currentWeight && targetWeight) {
    deltaToGoal = Math.round((currentWeight - targetWeight) * 10) / 10;
  }

  return (
    <div className="space-y-6">
      {/* Undo Soft-Delete Notification */}
      {showUndoBanner && lastDeletedEntry && (
        <div className="p-3.5 bg-surface-container-high border border-primary-lime/40 rounded-2xl flex items-center justify-between text-xs font-mono animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-on-surface">
            <Info className="w-4 h-4 text-primary-lime" />
            <span>
              Weigh-in entry ({lastDeletedEntry.weight_kg} kg) deleted.
            </span>
          </div>
          <button
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-lime text-charcoal-dark font-bold hover:bg-primary-lime/90 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan shadow-[0_0_16px_rgba(56,189,248,0.2)]">
              <Weight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-on-surface">
                Body Composition & Weight
              </h2>
              <p className="text-xs text-on-surface-variant">
                Daily weigh-ins, 7-day moving averages, and goal-calibrated rate analytics
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
                setNewDateInput(new Date().toISOString().split("T")[0]);
                setNewNoteInput("");
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
            {/* 1. Current Weight */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                Current Weight
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-on-surface">
                  {currentWeight !== null ? `${currentWeight} kg` : "Unlogged"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-text-muted">
                {dailyEntries.length > 0
                  ? `Latest: ${dailyEntries[dailyEntries.length - 1].date}`
                  : "No weigh-ins yet"}
              </p>
            </div>

            {/* 2. Goal Target & Projected Date */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                  Goal Target
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-secondary-cyan">
                  {goalType}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-secondary-cyan">
                  {targetWeight ? `${targetWeight} kg` : "Unset"}
                </span>
                {deltaToGoal !== null && (
                  <span className="text-xs font-mono text-text-muted">
                    ({deltaToGoal > 0 ? `+${deltaToGoal}` : deltaToGoal} kg)
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-text-muted truncate">
                {projectedGoal && projectedGoal.projectedDate
                  ? `ETA: ${projectedGoal.statusText}`
                  : targetWeight
                  ? "Projected date calibrating"
                  : "Set target in settings"}
              </p>
            </div>

            {/* 3. Weekly Rate of Change (Goal-Aware) */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                Rate of Change
              </span>
              <div className="flex items-baseline gap-2">
                {rateResult.status === "Active" ? (
                  <>
                    <span className={`text-xl font-bold font-mono ${rateSemantic.colorToken}`}>
                      {rateResult.rateKgPerWeek! > 0
                        ? `+${rateResult.rateKgPerWeek}`
                        : rateResult.rateKgPerWeek}{" "}
                      kg
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">/ wk</span>
                  </>
                ) : (
                  <span className="text-xl font-bold font-mono text-text-muted">
                    Calibrating...
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-text-muted">
                {rateResult.status === "Active"
                  ? `${rateSemantic.label} (14d OLS slope)`
                  : "Requires 4+ logs across 7+ days"}
              </p>
            </div>

            {/* 4. Secondary BMI (No clinical wording, no red/green judgment) */}
            <div className="bg-surface-container rounded-2xl p-4 border border-border-subtle space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                Body Mass Index
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-on-surface">
                  {bmiInfo.bmi !== null ? bmiInfo.bmi : "Unset"}
                </span>
                {bmiInfo.bmi !== null && (
                  <span className="text-xs font-mono text-text-muted">
                    ({bmiInfo.category})
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-text-muted">
                {heightCm ? `Height: ${heightCm} cm` : "Add height in settings"}
              </p>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-on-surface">
                  Weight Progression & 7-Day Trend
                </h3>
                <p className="text-[11px] text-on-surface-variant font-mono">
                  Smoothed 7-day rolling average filters water weight fluctuations
                </p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl border border-border-subtle self-start sm:self-auto">
                {(["7D", "30D", "90D", "ALL"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                      timeRange === r
                        ? "bg-secondary-cyan text-charcoal-dark font-bold shadow-sm"
                        : "text-text-muted hover:text-on-surface"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {filteredTrendData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border-subtle rounded-xl text-text-muted">
                <p className="text-xs font-mono">No weight entries recorded for this range</p>
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Log your daily weigh-in to view trends and rate of change
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }}
                      axisLine={{ stroke: "#1F2937" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "monospace" }}
                      axisLine={{ stroke: "#1F2937" }}
                      tickLine={false}
                      unit="kg"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-surface-container-highest border border-border-subtle p-2.5 rounded-xl shadow-xl text-xs font-mono space-y-1">
                              <div className="text-text-muted text-[10px]">{data.date}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-on-surface">Raw: {data.rawWeight} kg</span>
                                <span className="text-primary-lime font-bold">
                                  7D Avg: {data.movingAvg} kg
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {targetWeight && (
                      <ReferenceLine
                        y={targetWeight}
                        stroke="#38BDF8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Target: ${targetWeight}kg`,
                          fill: "#38BDF8",
                          fontSize: 10,
                          fontFamily: "monospace",
                          position: "insideTopRight",
                        }}
                      />
                    )}
                    {/* Raw dots */}
                    <Line
                      type="monotone"
                      dataKey="rawWeight"
                      stroke="#4B5563"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={{ fill: "#9CA3AF", r: 3 }}
                      isAnimationActive={false}
                    />
                    {/* 7-Day Smoothed Trend Line */}
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      stroke="#C6FF3D"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Historical Log Table */}
          <div className="bg-surface-container rounded-2xl border border-border-subtle overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-secondary-cyan" />
                <h3 className="text-sm font-bold font-mono text-on-surface">
                  Recorded Weigh-In History
                </h3>
              </div>
              <span className="text-xs font-mono text-text-muted">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {entries.length === 0 ? (
              <div className="p-8 text-center text-text-muted font-mono text-xs">
                No weigh-ins found in weight_logs. Tap &ldquo;Log Weight&rdquo; to add your first record.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-surface-container-high/60 text-text-muted border-b border-border-subtle">
                    <tr>
                      <th className="py-2.5 px-4 font-normal">Date</th>
                      <th className="py-2.5 px-4 font-normal">Weight</th>
                      <th className="py-2.5 px-4 font-normal">Note</th>
                      <th className="py-2.5 px-4 font-normal text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-surface-container-high/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-on-surface">
                          {new Date(entry.logged_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-secondary-cyan">
                          {entry.weight_kg} kg
                        </td>
                        <td className="py-3 px-4 text-text-muted max-w-xs truncate">
                          {entry.note || "-"}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingEntry(entry);
                              setNewWeightInput(entry.weight_kg.toString());
                              setNewNoteInput(entry.note || "");
                            }}
                            className="p-1.5 text-text-muted hover:text-on-surface transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            className="p-1.5 text-text-muted hover:text-crimson-alert transition-colors"
                            title="Soft delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Log Weigh-In Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container border border-border-subtle rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Weight className="w-4 h-4 text-primary-lime" />
                <h3 className="text-sm font-bold font-mono text-on-surface uppercase">
                  Log Bodyweight
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 75.4"
                  value={newWeightInput}
                  onChange={(e) => setNewWeightInput(e.target.value)}
                  className="w-full bg-surface-container-high border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-secondary-cyan transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-full bg-surface-container-high border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-secondary-cyan transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fasted morning weigh-in"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  className="w-full bg-surface-container-high border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-secondary-cyan transition-colors"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary-lime text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider transition-all hover:bg-primary-lime/90"
                >
                  Save Weigh-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Weigh-In Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container border border-border-subtle rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-secondary-cyan" />
                <h3 className="text-sm font-bold font-mono text-on-surface uppercase">
                  Edit Weigh-In Record
                </h3>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditEntry} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWeightInput}
                  onChange={(e) => setNewWeightInput(e.target.value)}
                  className="w-full bg-surface-container-high border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-secondary-cyan transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  className="w-full bg-surface-container-high border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-secondary-cyan transition-colors"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-secondary-cyan text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider transition-all hover:bg-secondary-cyan/90"
                >
                  Update Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Settings Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container border border-border-subtle rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-secondary-cyan" />
                <h3 className="text-sm font-bold font-mono text-on-surface uppercase">
                  Goal & Anthropometrics
                </h3>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoals} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Goal Phase
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["cut", "recomp", "bulk"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEditGoalType(mode)}
                      className={`py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all ${
                        editGoalType === mode
                          ? "bg-secondary-cyan/15 border-secondary-cyan text-secondary-cyan font-bold"
                          : "bg-surface-container-high border-border-subtle text-text-muted hover:text-on-surface"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 72.0"
                  value={editTargetWeight}
                  onChange={(e) => setEditTargetWeight(e.target.value)}
                  className="w-full bg-surface-container-high border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-secondary-cyan transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Height (cm) — Used for BMI
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 178"
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  className="w-full bg-surface-container-high border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-secondary-cyan transition-colors"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-secondary-cyan text-charcoal-dark font-mono font-bold text-xs uppercase tracking-wider transition-all hover:bg-secondary-cyan/90"
                >
                  Save Goals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
