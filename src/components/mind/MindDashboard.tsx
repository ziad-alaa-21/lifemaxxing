"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Sparkles,
  Clock,
  Target,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Volume2,
  VolumeX,
  Vibrate,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  FocusMode,
  FocusSession,
  FOCUS_PRESETS,
  calculateFocusScore,
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
    dailyFocusGoalMinutes: number | null;
    defaultFocusMode: FocusMode;
    soundChimeEnabled: boolean;
    soundVolume: number;
    vibrationEnabled: boolean;
    timezone: string;
  }>({
    dailyFocusGoalMinutes: null,
    defaultFocusMode: "sprint_50",
    soundChimeEnabled: true,
    soundVolume: 80,
    vibrationEnabled: true,
    timezone: "UTC",
  });

  // Selected Date
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Sessions for selected date
  const [sessions, setSessions] = useState<FocusSession[]>([]);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempGoalMinutes, setTempGoalMinutes] = useState<string>("");
  const [tempDefaultMode, setTempDefaultMode] = useState<FocusMode>("sprint_50");
  const [tempChimeEnabled, setTempChimeEnabled] = useState(true);
  const [tempSoundVolume, setTempSoundVolume] = useState(80);
  const [tempVibrationEnabled, setTempVibrationEnabled] = useState(true);
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
        .select(
          "daily_focus_goal_minutes, default_focus_mode, sound_chime_enabled, sound_volume, vibration_enabled, timezone"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        console.warn("Profile preferences note:", error.message);
        return;
      }

      if (data) {
        const mode = (data.default_focus_mode as FocusMode) || "sprint_50";
        const goal = data.daily_focus_goal_minutes ?? null;
        setUserProfile((prev) => ({
          dailyFocusGoalMinutes: goal,
          defaultFocusMode: mode in FOCUS_PRESETS ? mode : "sprint_50",
          soundChimeEnabled: data.sound_chime_enabled ?? true,
          soundVolume: data.sound_volume ?? 80,
          vibrationEnabled: data.vibration_enabled ?? true,
          timezone: data.timezone || prev.timezone,
        }));
        setTempGoalMinutes(goal !== null ? String(goal) : "");
        setTempDefaultMode(mode in FOCUS_PRESETS ? mode : "sprint_50");
        setTempChimeEnabled(data.sound_chime_enabled ?? true);
        setTempSoundVolume(data.sound_volume ?? 80);
        setTempVibrationEnabled(data.vibration_enabled ?? true);
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

  // Item 4: Focus Score calculation
  const scoreData = calculateFocusScore(
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

        const goalVal =
          tempGoalMinutes.trim() !== "" ? Number(tempGoalMinutes) : null;

        const { error } = await supabase
          .from("profiles")
          .update({
            daily_focus_goal_minutes: goalVal,
            default_focus_mode: tempDefaultMode,
            sound_chime_enabled: tempChimeEnabled,
            sound_volume: tempSoundVolume,
            vibration_enabled: tempVibrationEnabled,
          })
          .eq("id", user.id);

        if (error) throw error;

        setUserProfile((prev) => ({
          ...prev,
          dailyFocusGoalMinutes: goalVal,
          defaultFocusMode: tempDefaultMode,
          soundChimeEnabled: tempChimeEnabled,
          soundVolume: tempSoundVolume,
          vibrationEnabled: tempVibrationEnabled,
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
                  Focus Engine
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30">
                  Sprint & Intervals
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                Sprint intervals, flow telemetry, and session reflections
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
            Run <code className="text-amber-200">supabase/migrations/006_mind_and_focus_engine.sql</code> in your Supabase SQL editor to activate persistence. Timer runs locally on this device.
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

      {/* Daily Metrics: Item 4 Focus score (from your sessions) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* Card 1: Focus Score */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Focus score</span>
            <Sparkles className="w-3.5 h-3.5 text-tertiary-purple" />
          </div>
          <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
            {scoreData.score !== null ? (
              <>
                <span>{scoreData.score}</span>
                <span className="text-xs text-text-muted font-normal">/ 100</span>
              </>
            ) : (
              <span className="text-sm font-bold text-text-muted">{scoreData.label}</span>
            )}
          </div>
          <div className="text-[10px] text-text-muted">
            {scoreData.score !== null
              ? scoreData.label
              : (scoreData.label === "Set a goal" ? "Set a goal in settings" : "Log a session to calculate")}
          </div>
        </div>

        {/* Card 2: Daily Focus Volume */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Focus Volume</span>
            <Clock className="w-3.5 h-3.5 text-tertiary-purple" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
              <span>{scoreData.totalActualMinutes}m</span>
              {userProfile.dailyFocusGoalMinutes ? (
                <span className="text-xs text-text-muted font-normal">
                  / {userProfile.dailyFocusGoalMinutes}m
                </span>
              ) : (
                <span className="text-[10px] text-text-muted font-normal italic">
                  (No goal set)
                </span>
              )}
            </div>
            {/* Progress bar */}
            {userProfile.dailyFocusGoalMinutes ? (
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-tertiary-purple h-full rounded-full transition-all duration-500"
                  style={{ width: `${scoreData.goalProgressPercent || 0}%` }}
                />
              </div>
            ) : (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-[10px] text-tertiary-purple hover:underline mt-1 block"
              >
                + Set daily goal
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Completed Sessions */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Completed Sprints</span>
            <Target className="w-3.5 h-3.5 text-secondary-cyan" />
          </div>
          <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
            <span>{scoreData.completedCount}</span>
            <span className="text-xs text-text-muted font-normal">sprints</span>
          </div>
          <div className="text-[10px] text-text-muted">
            {scoreData.completedCount > 0
              ? `${scoreData.totalActualMinutes}m active time logged`
              : "0 completed today"}
          </div>
        </div>

        {/* Card 4: Flow Rating */}
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[11px]">
            <span>Avg Session Depth</span>
            <Star className="w-3.5 h-3.5 text-rank-gold" />
          </div>
          <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
            {scoreData.averageRating ? (
              <>
                <span>{scoreData.averageRating}</span>
                <span className="text-xs text-rank-gold">★</span>
              </>
            ) : (
              <span className="text-text-muted text-lg font-normal">—</span>
            )}
          </div>
          <div className="text-[10px] text-text-muted">
            {scoreData.averageRating ? "Self-rated depth" : "No ratings logged"}
          </div>
        </div>
      </div>

      {/* Category & Friction Signals Summary */}
      {(Object.keys(scoreData.categoryCounts).length > 0 ||
        Object.keys(scoreData.tagCounts).length > 0) && (
        <div className="p-4 rounded-2xl bg-surface-container border border-border-subtle space-y-2.5 font-mono text-xs">
          {/* Categories */}
          {Object.keys(scoreData.categoryCounts).length > 0 && (
            <div className="space-y-1.5">
              <div className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">
                Categories
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(scoreData.categoryCounts).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 rounded-xl bg-surface-container-high border border-border-subtle text-on-surface text-[11px] flex items-center gap-1.5"
                  >
                    <span>{cat}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-tertiary-purple/20 text-tertiary-purple font-bold text-[10px]">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Friction Tags */}
          {Object.keys(scoreData.tagCounts).length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-border-subtle">
              <div className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">
                Friction & Flow Signals
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(scoreData.tagCounts).map(([tag, count]) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-xl bg-surface-container-lowest border border-border-subtle text-text-muted text-[11px] flex items-center gap-1.5"
                  >
                    <span>{tag}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-surface-container-high text-on-surface font-bold text-[10px]">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Focus Timer Component (50/10 default, Violet dial) */}
      <UltradianTimer
        onSessionLogged={fetchSessions}
        userTimezone={userProfile.timezone}
        defaultMode={userProfile.defaultFocusMode}
        chimeEnabledDefault={userProfile.soundChimeEnabled}
        soundVolumeDefault={userProfile.soundVolume}
        vibrationDefault={userProfile.vibrationEnabled}
      />

      {/* Sessions History List */}
      <FocusHistoryList
        sessions={sessions}
        onSessionsUpdated={fetchSessions}
        userTimezone={userProfile.timezone}
      />

      {/* Settings Modal (Nullable goal, volume, vibration) */}
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

            {/* Daily Goal Input (Nullable) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <label className="text-text-muted uppercase tracking-wider">
                  Daily Focus Goal (Minutes)
                </label>
                <span className="text-text-muted italic">Optional</span>
              </div>
              <input
                type="number"
                min={15}
                max={600}
                step={15}
                value={tempGoalMinutes}
                onChange={(e) => setTempGoalMinutes(e.target.value)}
                placeholder="No goal set (optional)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface focus:outline-none focus:border-tertiary-purple"
              />
              <div className="flex gap-2 pt-1">
                {[100, 150, 180, 240].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTempGoalMinutes(String(m))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer ${
                      tempGoalMinutes === String(m)
                        ? "bg-tertiary-purple/20 text-tertiary-purple border-tertiary-purple/40 font-bold"
                        : "bg-surface-container-high text-text-muted border-border-subtle hover:text-on-surface"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
                {tempGoalMinutes !== "" && (
                  <button
                    type="button"
                    onClick={() => setTempGoalMinutes("")}
                    className="px-2 py-1 rounded-lg text-[10px] text-text-muted hover:text-[#F87171]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Default Mode (Default 50/10) */}
            <div className="space-y-2">
              <label className="text-text-muted uppercase tracking-wider text-[10px]">
                Default Focus Interval
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["sprint_50", "ultradian_90", "pomodoro_25"] as FocusMode[]).map((m) => {
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

            {/* Audio Chime, Volume & Vibration */}
            <div className="space-y-3 p-3 rounded-2xl bg-surface-container-lowest border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-secondary-cyan" />
                  <span className="text-on-surface font-bold">Chime Sound</span>
                </div>
                <input
                  type="checkbox"
                  checked={tempChimeEnabled}
                  onChange={(e) => setTempChimeEnabled(e.target.checked)}
                  className="w-4 h-4 accent-tertiary-purple cursor-pointer"
                />
              </div>

              {tempChimeEnabled && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-text-muted text-[11px]">Volume:</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={tempSoundVolume}
                    onChange={(e) => setTempSoundVolume(Number(e.target.value))}
                    className="flex-1 accent-tertiary-purple cursor-pointer"
                  />
                  <span className="text-on-surface text-[11px] w-8 text-right">
                    {tempSoundVolume}%
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-tertiary-purple" />
                  <span className="text-on-surface font-bold">Vibration</span>
                </div>
                <input
                  type="checkbox"
                  checked={tempVibrationEnabled}
                  onChange={(e) => setTempVibrationEnabled(e.target.checked)}
                  className="w-4 h-4 accent-tertiary-purple cursor-pointer"
                />
              </div>
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
