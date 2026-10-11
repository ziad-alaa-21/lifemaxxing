"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Settings2,
  Sparkles,
  Coffee,
  Clock,
  Target,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  FocusMode,
  FocusSession,
  FOCUS_PRESETS,
  calculateDailyFocusStats,
} from "@/lib/mind";
import { getLocalDateString } from "@/lib/nutrition";
import { UltradianTimer } from "./UltradianTimer";
import { FocusHistoryList } from "./FocusHistoryList";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";

export function MindDashboard() {
  const { isOnline, guardAction } = useOnlineGuard();

  const [loading, setLoading] = useState(true);
  const [schemaPending, setSchemaPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User Settings & Profile
  const [userProfile, setUserProfile] = useState<{
    dailyFocusGoalMinutes: number;
    defaultFocusMode: FocusMode;
    soundChimeEnabled: boolean;
    timezone: string;
  }>({
    dailyFocusGoalMinutes: 180,
    defaultFocusMode: "ultradian_90",
    soundChimeEnabled: true,
    timezone: "UTC",
  });

  // Selected Date
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Sessions for selected date
  const [sessions, setSessions] = useState<FocusSession[]>([]);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempGoalMinutes, setTempGoalMinutes] = useState(180);
  const [tempDefaultMode, setTempDefaultMode] = useState<FocusMode>("ultradian_90");
  const [tempChimeEnabled, setTempChimeEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Initialize timezone & date
  useEffect(() => {
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setUserProfile((prev) => ({ ...prev, timezone: tz }));
    setSelectedDate(getLocalDateString(new Date(), tz));
  }, []);

  // Fetch user profile preferences
  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("daily_focus_goal_minutes, default_focus_mode, sound_chime_enabled, timezone")
        .eq("id", user.id)
        .single();

      if (error) {
        // columns might not exist if migration pending, fallback gracefully
        console.warn("Profile preferences fetch note:", error.message);
        return;
      }

      if (data) {
        const mode = (data.default_focus_mode as FocusMode) || "ultradian_90";
        setUserProfile((prev) => ({
          dailyFocusGoalMinutes: data.daily_focus_goal_minutes || 180,
          defaultFocusMode: mode in FOCUS_PRESETS ? mode : "ultradian_90",
          soundChimeEnabled: data.sound_chime_enabled ?? true,
          timezone: data.timezone || prev.timezone,
        }));
        setTempGoalMinutes(data.daily_focus_goal_minutes || 180);
        setTempDefaultMode(mode in FOCUS_PRESETS ? mode : "ultradian_90");
        setTempChimeEnabled(data.sound_chime_enabled ?? true);
      }
    } catch (e) {
      console.warn("Profile fetch error:", e);
    }
  }, []);

  // Fetch focus sessions for selected date
  const fetchSessions = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", selectedDate)
        .is("deleted_at", null)
        .order("ended_at", { ascending: false });

      if (error) {
        if (
          error.message.includes("Could not find the table") ||
          error.message.includes("does not exist") ||
          error.code === "42P01"
        ) {
          setSchemaPending(true);
          setSessions([]);
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setSchemaPending(false);
        setSessions(data || []);
      }
    } catch (err: any) {
      console.error("Focus sessions fetch exception:", err);
      setErrorMsg(err.message || "Failed to load focus sessions");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Date Navigation
  const changeDateByDays = (delta: number) => {
    if (!selectedDate) return;
    const parts = selectedDate.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + delta);
    setSelectedDate(getLocalDateString(d, userProfile.timezone));
  };

  const isToday =
    selectedDate === getLocalDateString(new Date(), userProfile.timezone);

  // Stats calculation
  const stats = calculateDailyFocusStats(
    sessions,
    userProfile.dailyFocusGoalMinutes
  );

  // Save Settings
  const handleSaveSettings = async () => {
    guardAction(async () => {
      setSavingSettings(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in to save settings.");

        const { error } = await supabase
          .from("profiles")
          .update({
            daily_focus_goal_minutes: tempGoalMinutes,
            default_focus_mode: tempDefaultMode,
            sound_chime_enabled: tempChimeEnabled,
          })
          .eq("id", user.id);

        if (error) throw error;

        setUserProfile((prev) => ({
          ...prev,
          dailyFocusGoalMinutes: tempGoalMinutes,
          defaultFocusMode: tempDefaultMode,
          soundChimeEnabled: tempChimeEnabled,
        }));
        setIsSettingsOpen(false);
      } catch (err: any) {
        console.error("Save settings error:", err);
        alert(err.message || "Failed to save settings.");
      } finally {
        setSavingSettings(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-3xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-tertiary-purple/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple shadow-[0_0_16px_rgba(167,139,250,0.2)]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-on-surface">
                  Mind & Ultradian Focus Engine
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30">
                  90m BRAC
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                Biological rest-activity cycle, sprint intervals, and friction telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs text-on-surface hover:border-tertiary-purple/40 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-tertiary-purple" />
              <span>Goal & Chime</span>
            </button>
          </div>
        </div>
      </div>

      {/* Migration Pending Notice if schema not executed */}
      {schemaPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Database Table &lsquo;focus_sessions&rsquo; Pending Migration</span>
          </div>
          <p className="text-text-muted leading-relaxed">
            Run <code className="text-amber-200">supabase/migrations/006_mind_and_focus_engine.sql</code> in your Supabase SQL editor to activate persistence. Timer runs smoothly in local memory.
          </p>
        </div>
      )}

      {/* Error notice */}
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171] text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-2xl border border-border-subtle font-mono text-xs">
        <button
          onClick={() => changeDateByDays(-1)}
          className="p-1.5 rounded-xl hover:bg-surface-container-high text-text-muted hover:text-on-surface transition-colors cursor-pointer"
          title="Previous Day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 font-bold text-on-surface">
          <Calendar className="w-4 h-4 text-tertiary-purple" />
          <span>{selectedDate || "Loading date..."}</span>
          {isToday && (
            <span className="px-2 py-0.5 rounded-md text-[10px] bg-primary-lime/15 text-primary-lime border border-primary-lime/30">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isToday && (
            <button
              onClick={() =>
                setSelectedDate(getLocalDateString(new Date(), userProfile.timezone))
              }
              className="px-2.5 py-1 rounded-xl bg-surface-container-high text-[11px] text-on-surface hover:text-primary-lime transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
          <button
            onClick={() => changeDateByDays(1)}
            disabled={isToday}
            className="p-1.5 rounded-xl hover:bg-surface-container-high text-text-muted hover:text-on-surface transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daily Metrics 4-Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* Card 1: Deep Work Score */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Deep Work Score</span>
            <Sparkles className="w-3.5 h-3.5 text-tertiary-purple" />
          </div>
          <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
            <span>{stats.deepWorkScore}</span>
            <span className="text-xs text-text-muted font-normal">/ 100</span>
          </div>
          <div className="text-[10px] text-text-muted">
            {stats.completedSessionsCount === 0
              ? "0 sessions logged today"
              : `${stats.completedSessionsCount} completed session${
                  stats.completedSessionsCount > 1 ? "s" : ""
                }`}
          </div>
        </div>

        {/* Card 2: Daily Focus Volume */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Focus Volume</span>
            <Clock className="w-3.5 h-3.5 text-primary-lime" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
              <span>{stats.totalMinutes}m</span>
              <span className="text-xs text-text-muted font-normal">
                / {userProfile.dailyFocusGoalMinutes}m
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-primary-lime h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.goalProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Completed Ultradian Cycles */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Ultradian Cycles</span>
            <Target className="w-3.5 h-3.5 text-secondary-cyan" />
          </div>
          <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
            <span>{stats.completedUltradianCycles}</span>
            <span className="text-xs text-text-muted font-normal">cycles</span>
          </div>
          <div className="text-[10px] text-text-muted">
            {stats.completedUltradianCycles > 0
              ? `${stats.completedUltradianCycles * 90}m in 90/20 rhythm`
              : "90 min work + 20 min rest"}
          </div>
        </div>

        {/* Card 4: Flow Quality Rating */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Avg Flow Depth</span>
            <Star className="w-3.5 h-3.5 text-rank-gold" />
          </div>
          <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
            {stats.averageRating ? (
              <>
                <span>{stats.averageRating}</span>
                <span className="text-xs text-rank-gold">★</span>
              </>
            ) : (
              <span className="text-text-muted text-lg font-normal">—</span>
            )}
          </div>
          <div className="text-[10px] text-text-muted">
            {stats.averageRating ? "Self-rated focus depth" : "No ratings logged"}
          </div>
        </div>
      </div>

      {/* Cognitive State & Friction Tags Summary (if any logged) */}
      {Object.keys(stats.tagCounts).length > 0 && (
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-2 font-mono text-xs">
          <div className="text-text-muted text-[11px] uppercase tracking-wider font-semibold">
            Today&apos;s Cognitive & Friction Signals
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.tagCounts).map(([tag, count]) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-xl bg-surface-container-high border border-border-subtle text-on-surface text-[11px] flex items-center gap-1.5"
              >
                <span>{tag}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-tertiary-purple/20 text-tertiary-purple font-bold text-[10px]">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ultradian Wall-Clock Timer Component */}
      <UltradianTimer
        onSessionLogged={fetchSessions}
        userTimezone={userProfile.timezone}
        defaultMode={userProfile.defaultFocusMode}
        chimeEnabledDefault={userProfile.soundChimeEnabled}
      />

      {/* Focus Sprints History List for Selected Date */}
      <FocusHistoryList
        sessions={sessions}
        onSessionsUpdated={fetchSessions}
        userTimezone={userProfile.timezone}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-container border border-border-subtle rounded-3xl p-6 shadow-2xl space-y-5 font-mono text-xs animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-tertiary-purple" />
                <h3 className="text-sm font-bold text-on-surface">
                  Focus Engine Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-xl text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Daily Goal Input */}
            <div className="space-y-2">
              <label className="text-text-muted uppercase tracking-wider text-[10px]">
                Daily Deep Work Goal (Minutes)
              </label>
              <input
                type="number"
                min={30}
                max={600}
                step={15}
                value={tempGoalMinutes}
                onChange={(e) => setTempGoalMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface focus:outline-none focus:border-tertiary-purple"
              />
              <div className="flex gap-2 pt-1">
                {[120, 180, 240, 300].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTempGoalMinutes(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer ${
                      tempGoalMinutes === m
                        ? "bg-primary-lime/20 text-primary-lime border-primary-lime/40 font-bold"
                        : "bg-surface-container-high text-text-muted border-border-subtle hover:text-on-surface"
                    }`}
                  >
                    {m}m ({Math.round(m / 60)}h)
                  </button>
                ))}
              </div>
            </div>

            {/* Default Mode */}
            <div className="space-y-2">
              <label className="text-text-muted uppercase tracking-wider text-[10px]">
                Default Interval Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["ultradian_90", "sprint_50", "pomodoro_25"] as FocusMode[]).map((m) => {
                  const p = FOCUS_PRESETS[m];
                  const isSel = tempDefaultMode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTempDefaultMode(m)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSel
                          ? "bg-tertiary-purple text-charcoal-dark font-bold border-tertiary-purple shadow-[0_0_12px_rgba(167,139,250,0.3)]"
                          : "bg-surface-container-lowest text-text-muted border-border-subtle hover:text-on-surface"
                      }`}
                    >
                      <div className="text-xs">{p.badge}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{p.name.split(" ")[0]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sound Chime Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-border-subtle">
              <div className="flex items-center gap-2.5">
                {tempChimeEnabled ? (
                  <Volume2 className="w-4 h-4 text-secondary-cyan" />
                ) : (
                  <VolumeX className="w-4 h-4 text-text-muted" />
                )}
                <div>
                  <div className="font-bold text-on-surface">Harmonic Bell Chime</div>
                  <div className="text-[10px] text-text-muted">
                    Web Audio API synthesized bell at interval completion
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={tempChimeEnabled}
                onChange={(e) => setTempChimeEnabled(e.target.checked)}
                className="w-4 h-4 accent-tertiary-purple cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-tertiary-purple text-charcoal-dark hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
