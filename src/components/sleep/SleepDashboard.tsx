"use client";

import React, { useState, useEffect } from "react";
import {
  Moon,
  Sparkles,
  Clock,
  RotateCcw,
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  Settings as SettingsIcon,
  Sun,
  ShieldAlert,
  Loader2,
  Coffee,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import {
  SleepEntry,
  calculateSleepScore,
  calculateCircularMidpointConsistency,
  calculateSleepStats,
} from "@/lib/sleep";
import { SleepLogModal } from "@/components/sleep/SleepLogModal";
import { CircadianDial } from "@/components/sleep/CircadianDial";
import { SleepTrendChart } from "@/components/sleep/SleepTrendChart";

export function SleepDashboard() {
  const { guardAction } = useOnlineGuard();

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [sleepTargetHours, setSleepTargetHours] = useState<number>(8.0);
  const [caffeineCutoffHours, setCaffeineCutoffHours] = useState<number>(10.0);
  const [screenCutoffMinutes, setScreenCutoffMinutes] = useState<number>(60);
  const [timezone, setTimezone] = useState<string>("UTC");

  // Modals & UI States
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null);

  // Undo Toast state
  const [lastDeletedEntry, setLastDeletedEntry] = useState<SleepEntry | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  // Load user profile & sleep logs
  const loadSleepData = async () => {
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

      // 1. Fetch user settings from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("sleep_target_hours, caffeine_cutoff_hours, screen_cutoff_minutes, timezone")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.sleep_target_hours) setSleepTargetHours(Number(profile.sleep_target_hours));
        if (profile.caffeine_cutoff_hours) setCaffeineCutoffHours(Number(profile.caffeine_cutoff_hours));
        if (profile.screen_cutoff_minutes) setScreenCutoffMinutes(Number(profile.screen_cutoff_minutes));
        if (profile.timezone) setTimezone(profile.timezone);
      }

      // 2. Fetch from sleep_logs table (Single Source of Truth - NO events fallback)
      const { data: logsData, error: logsErr } = await supabase
        .from("sleep_logs")
        .select("id, user_id, sleep_date, bedtime, wake_time, duration_minutes, quality_rating, awakenings_count, nap_minutes, notes, created_at, deleted_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("sleep_date", { ascending: false });

      if (logsErr) {
        // Honest error display if table is missing or write fails
        setError(
          `sleep_logs table: ${logsErr.message} (Code: ${logsErr.code}). Please apply migration 003_sleep_and_circadian.sql in Supabase SQL Editor.`
        );
        setLoading(false);
        return;
      }

      const parsed: SleepEntry[] = (logsData || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        sleep_date: row.sleep_date,
        bedtime: row.bedtime,
        wake_time: row.wake_time,
        duration_minutes: Number(row.duration_minutes),
        quality_rating: row.quality_rating,
        awakenings_count: row.awakenings_count ?? 0,
        nap_minutes: row.nap_minutes ?? 0,
        notes: row.notes || undefined,
        created_at: row.created_at,
        deleted_at: row.deleted_at || null,
      }));

      setEntries(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching sleep telemetry";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSleepData();
  }, []);

  // Save or Update Entry
  const handleSaveEntry = async (payload: {
    id?: string;
    sleep_date: string;
    bedtime: string;
    wake_time: string;
    quality_rating: number | null;
    awakenings_count: number;
    nap_minutes: number;
    notes: string;
  }) => {
    if (!userId) return;

    await guardAction(async () => {
      if (payload.id) {
        // Update existing entry
        const { error: updErr } = await supabase
          .from("sleep_logs")
          .update({
            sleep_date: payload.sleep_date,
            bedtime: payload.bedtime,
            wake_time: payload.wake_time,
            quality_rating: payload.quality_rating,
            awakenings_count: payload.awakenings_count,
            nap_minutes: payload.nap_minutes,
            notes: payload.notes || null,
          })
          .eq("id", payload.id);

        if (updErr) throw new Error(updErr.message);

        setEntries((prev) =>
          prev.map((e) =>
            e.id === payload.id
              ? {
                  ...e,
                  ...payload,
                  duration_minutes: Math.round(
                    (new Date(payload.wake_time).getTime() - new Date(payload.bedtime).getTime()) / 60000
                  ),
                }
              : e
          )
        );
      } else {
        // Insert new entry
        const { data: newRow, error: insErr } = await supabase
          .from("sleep_logs")
          .insert({
            user_id: userId,
            sleep_date: payload.sleep_date,
            bedtime: payload.bedtime,
            wake_time: payload.wake_time,
            quality_rating: payload.quality_rating,
            awakenings_count: payload.awakenings_count,
            nap_minutes: payload.nap_minutes,
            notes: payload.notes || null,
          })
          .select()
          .single();

        if (insErr) throw new Error(insErr.message);

        const newEntry: SleepEntry = {
          id: newRow.id,
          user_id: newRow.user_id,
          sleep_date: newRow.sleep_date,
          bedtime: newRow.bedtime,
          wake_time: newRow.wake_time,
          duration_minutes: Number(newRow.duration_minutes),
          quality_rating: newRow.quality_rating,
          awakenings_count: newRow.awakenings_count ?? 0,
          nap_minutes: newRow.nap_minutes ?? 0,
          notes: newRow.notes || undefined,
        };

        const updated = [newEntry, ...entries].sort((a, b) => b.sleep_date.localeCompare(a.sleep_date));
        setEntries(updated);
      }
    });
  };

  // Soft Delete with Undo
  const handleDeleteEntry = async (entry: SleepEntry) => {
    guardAction(async () => {
      try {
        const { error: delErr } = await supabase
          .from("sleep_logs")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entry.id);

        if (delErr) throw new Error(delErr.message);

        const remaining = entries.filter((e) => e.id !== entry.id);
        setEntries(remaining);

        setLastDeletedEntry(entry);
        setShowUndoBanner(true);

        setTimeout(() => {
          setShowUndoBanner(false);
        }, 8000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to soft-delete entry";
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
          .from("sleep_logs")
          .update({ deleted_at: null })
          .eq("id", lastDeletedEntry.id);

        if (undoErr) throw new Error(undoErr.message);

        const restored = [lastDeletedEntry, ...entries].sort((a, b) => b.sleep_date.localeCompare(a.sleep_date));
        setEntries(restored);
        setLastDeletedEntry(null);
        setShowUndoBanner(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to undo delete";
        alert(msg);
      }
    });
  };

  // Save Settings Modal
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    guardAction(async () => {
      try {
        const { error: sErr } = await supabase
          .from("profiles")
          .update({
            sleep_target_hours: sleepTargetHours,
            caffeine_cutoff_hours: caffeineCutoffHours,
            screen_cutoff_minutes: screenCutoffMinutes,
            timezone: timezone,
          })
          .eq("id", userId);

        if (sErr) throw new Error(sErr.message);
        setIsSettingsModalOpen(false);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to save settings");
      }
    });
  };

  // Metrics computation
  const stats = calculateSleepStats(entries, sleepTargetHours);
  const midpoint = calculateCircularMidpointConsistency(entries);
  const latestEntry = entries.length > 0 ? entries[0] : null;
  const latestScore = latestEntry
    ? calculateSleepScore(
        latestEntry.duration_minutes,
        sleepTargetHours,
        latestEntry.quality_rating,
        latestEntry.awakenings_count
      )
    : null;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 font-mono">
        <Loader2 className="w-8 h-8 text-[#7DD3FC] animate-spin" />
        <p className="text-xs text-text-muted">Loading sleep & circadian telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-mono">
      {/* Top Banner & Action Bar */}
      <div className="bg-surface-container rounded-3xl p-6 border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 flex items-center justify-center text-[#7DD3FC] shrink-0">
            <Moon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Sleep & Circadian Telemetry</h2>
            <p className="text-xs text-on-surface-variant">
              Recovery architecture, circular midpoint consistency, and solar protocols
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-container-high hover:bg-surface-container-highest text-xs text-text-muted hover:text-on-surface transition-all cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => {
              setEditingEntry(null);
              setIsLogModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7DD3FC] hover:bg-[#7DD3FC]/90 text-charcoal-dark font-bold text-xs shadow-[0_0_15px_rgba(125,211,252,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>LOG SLEEP</span>
          </button>
        </div>
      </div>

      {/* Honest Error Banner if sleep_logs is missing or read fails */}
      {error && (
        <div className="p-4 rounded-2xl bg-crimson-alert/10 border border-crimson-alert/30 text-crimson-alert text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Database Error (sleep_logs)</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Undo Banner */}
      {showUndoBanner && lastDeletedEntry && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-charcoal-dark border border-border-subtle shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-slide-up">
          <span className="text-xs text-on-surface font-mono">
            Sleep log for {lastDeletedEntry.sleep_date} soft-deleted.
          </span>
          <button
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#7DD3FC] text-charcoal-dark text-xs font-bold hover:bg-[#7DD3FC]/90 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Primary Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Last Night Sleep Score */}
        <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
              Latest Sleep Score
            </span>
            {latestScore && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  color: latestScore.hexColor,
                  borderColor: `${latestScore.hexColor}40`,
                  backgroundColor: `${latestScore.hexColor}15`,
                }}
              >
                {latestScore.tier}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold"
              style={{ color: latestScore?.hexColor || "#7DD3FC" }}
            >
              {latestScore ? latestScore.score : "--"}
            </span>
            <span className="text-xs text-text-muted">/ 100</span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            {latestScore ? latestScore.label : "Log your first sleep night"}
          </p>
        </div>

        {/* Card 2: 7-Day Average Duration */}
        <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
              7-Day Avg Duration
            </span>
            <Clock className="w-4 h-4 text-[#7DD3FC]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">
              {stats.avgDurationFormatted}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Target: {sleepTargetHours}h ({stats.count} nights recorded)
          </p>
        </div>

        {/* Card 3: Circadian Midpoint Consistency */}
        <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
              Midpoint Stability
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                midpoint.stability === "Consistent"
                  ? "text-primary-lime border-primary-lime/30 bg-primary-lime/10"
                  : midpoint.stability === "Moderate"
                  ? "text-[#7DD3FC] border-[#7DD3FC]/30 bg-[#7DD3FC]/10"
                  : "text-[#F87171] border-[#F87171]/30 bg-[#F87171]/10"
              }`}
            >
              {midpoint.stability}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-on-surface truncate">
              {midpoint.meanMidpointFormatted}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            &plusmn;{midpoint.stdDevMinutes}m variability (circular stat)
          </p>
        </div>

        {/* Card 4: Daytime Naps Volume */}
        <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
              7-Day Nap Volume
            </span>
            <Sun className="w-4 h-4 text-rank-bronze" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">
              {stats.totalNapsMinutes}m
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Recorded separate from nocturnal sleep
          </p>
        </div>
      </div>

      {/* Circadian Dial & Solar Windows (General Guidance) */}
      <CircadianDial
        targetBedtime="23:00"
        targetWakeTime="07:00"
        caffeineCutoffHours={caffeineCutoffHours}
        screenCutoffMinutes={screenCutoffMinutes}
      />

      {/* Sleep Trend & Architecture Chart */}
      <SleepTrendChart entries={entries} targetHours={sleepTargetHours} />

      {/* Recorded History List */}
      <div className="bg-surface-container rounded-2xl p-5 border border-border-subtle space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">
            Recorded Sleep History ({entries.length} entries)
          </h3>
          <span className="text-xs text-text-muted">Soft delete with instant undo</span>
        </div>

        {entries.length === 0 ? (
          <div className="py-10 text-center text-xs text-text-muted">
            No sleep logs recorded yet. Tap LOG SLEEP above to start tracking.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {entries.map((entry) => {
              const scoreObj = calculateSleepScore(
                entry.duration_minutes,
                sleepTargetHours,
                entry.quality_rating,
                entry.awakenings_count
              );
              const b = new Date(entry.bedtime);
              const w = new Date(entry.wake_time);
              const bTime = `${b.getHours().toString().padStart(2, "0")}:${b.getMinutes().toString().padStart(2, "0")}`;
              const wTime = `${w.getHours().toString().padStart(2, "0")}:${w.getMinutes().toString().padStart(2, "0")}`;
              const hours = Math.floor(entry.duration_minutes / 60);
              const mins = entry.duration_minutes % 60;

              return (
                <div
                  key={entry.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0"
                      style={{
                        color: scoreObj.hexColor,
                        borderColor: `${scoreObj.hexColor}40`,
                        backgroundColor: `${scoreObj.hexColor}15`,
                      }}
                    >
                      {scoreObj.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface">
                          {entry.sleep_date}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {bTime} &rarr; {wTime} ({hours}h {mins}m)
                        </span>
                        {entry.nap_minutes ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rank-bronze/10 text-rank-bronze border border-rank-bronze/30">
                            +{entry.nap_minutes}m nap
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                        <span>Score: {scoreObj.tier}</span>
                        <span>&bull;</span>
                        <span>{entry.awakenings_count || 0} awakenings</span>
                        {entry.notes && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-[200px] text-on-surface-variant">
                              {entry.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setEditingEntry(entry);
                        setIsLogModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-surface-container-high text-text-muted hover:text-on-surface transition-all cursor-pointer"
                      title="Edit Entry"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry)}
                      className="p-1.5 rounded-lg hover:bg-crimson-alert/15 text-text-muted hover:text-crimson-alert transition-all cursor-pointer"
                      title="Soft Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sleep Log Modal */}
      <SleepLogModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        recentEntries={entries}
      />

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md animate-fade-in">
          <div className="bg-surface-container rounded-3xl p-6 border border-border-subtle w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[#7DD3FC]" />
              <span>Sleep & Circadian Targets</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-text-muted">Target Sleep Duration (hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="12"
                  value={sleepTargetHours}
                  onChange={(e) => setSleepTargetHours(parseFloat(e.target.value) || 8.0)}
                  className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:border-[#7DD3FC]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-text-muted">Caffeine Cutoff (hours before bed)</label>
                <input
                  type="number"
                  step="1"
                  min="6"
                  max="14"
                  value={caffeineCutoffHours}
                  onChange={(e) => setCaffeineCutoffHours(parseInt(e.target.value) || 10)}
                  className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:border-[#7DD3FC]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-text-muted">Screen Wind-Down Cutoff (minutes)</label>
                <input
                  type="number"
                  step="15"
                  min="30"
                  max="180"
                  value={screenCutoffMinutes}
                  onChange={(e) => setScreenCutoffMinutes(parseInt(e.target.value) || 60)}
                  className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:border-[#7DD3FC]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-text-muted">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. UTC or America/New_York"
                  className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3 py-2 text-on-surface focus:outline-none focus:border-[#7DD3FC]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-border-subtle text-text-muted hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#7DD3FC] text-charcoal-dark font-bold hover:bg-[#7DD3FC]/90 cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
