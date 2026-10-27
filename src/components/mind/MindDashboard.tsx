"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Zap,
  Heart,
  ShieldCheck,
  TrendingUp,
  Flame,
  Activity,
  Plus,
  BookOpen,
  Smartphone,
  Lightbulb,
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
import { MathTrainerModal } from "./MathTrainerModal";
import { MoodCheckinModal } from "./MoodCheckinModal";
import { DisciplineCard } from "./DisciplineCard";
import { ReadingCard } from "./ReadingCard";
import { ScreenTimeCard } from "./ScreenTimeCard";
import { MindScoreDial } from "./MindScoreDial";
import { WeeklyInsightCard } from "./WeeklyInsightCard";
import { useOnlineGuard } from "@/hooks/useOnlineGuard";
import { MathSessionSummary } from "@/lib/mathTrainer";
import { MindCheckin, RATING_LABELS } from "@/lib/checkin";
import { calculateCompositeMindScore } from "@/lib/mindScore";
import { generateWeeklyMindInsights, DailyTelemetrySummary } from "@/lib/mindInsights";
import { ScreenTimeLog } from "@/lib/screentime";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useUserModules } from "@/lib/modules/UserModulesContext";
import { DisabledModuleFallback } from "@/components/modules/DisabledModuleFallback";

export function MindDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { dict, locale } = useI18n();
  const { isModuleActive } = useUserModules();

  const currentTab = searchParams.get("tab") || "focus";
  const setTab = (tab: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`/mind?${params.toString()}`);
    });
  };

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
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      return getLocalDateString(new Date(), tz);
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  });

  // Sessions for selected date
  const [sessions, setSessions] = useState<FocusSession[]>([]);

  // Stage 7b Telemetry Data
  const [mathSessions, setMathSessions] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<MindCheckin[]>([]);
  const [disciplineStats, setDisciplineStats] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });

  // Stage 7c Telemetry Data
  const [readingPagesToday, setReadingPagesToday] = useState<number>(0);
  const [readingMinutesToday, setReadingMinutesToday] = useState<number>(0);
  const [screenTimeToday, setScreenTimeToday] = useState<ScreenTimeLog | null>(null);
  const [weeklyTelemetry, setWeeklyTelemetry] = useState<DailyTelemetrySummary[]>([]);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  // Settings form
  const [tempGoalMinutes, setTempGoalMinutes] = useState<string>("");
  const [tempDefaultMode, setTempDefaultMode] = useState<FocusMode>("sprint_50");
  const [tempChimeEnabled, setTempChimeEnabled] = useState(true);
  const [tempSoundVolume, setTempSoundVolume] = useState(80);
  const [tempVibrationEnabled, setTempVibrationEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Initialize timezone & date
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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

      const { data: sett } = await supabase
        .from("user_settings")
        .select(
          "daily_focus_goal_minutes, default_focus_mode, sound_chime_enabled, sound_volume, vibration_enabled"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      const focusGoal = sett?.daily_focus_goal_minutes !== undefined && sett?.daily_focus_goal_minutes !== null
        ? sett.daily_focus_goal_minutes
        : (data?.daily_focus_goal_minutes ?? null);
      const defaultMode = (sett?.default_focus_mode || data?.default_focus_mode || "sprint_50") as FocusMode;
      const chime = sett?.sound_chime_enabled ?? data?.sound_chime_enabled ?? true;
      const vol = sett?.sound_volume ?? data?.sound_volume ?? 80;
      const vib = sett?.vibration_enabled ?? data?.vibration_enabled ?? true;

      setUserProfile((prev) => ({
        ...prev,
        dailyFocusGoalMinutes: focusGoal,
        defaultFocusMode: defaultMode,
        soundChimeEnabled: chime,
        soundVolume: vol,
        vibrationEnabled: vib,
        timezone: data?.timezone || prev.timezone,
      }));

      setTempGoalMinutes(focusGoal ? String(focusGoal) : "");
      setTempDefaultMode(defaultMode);
      setTempChimeEnabled(chime);
      setTempSoundVolume(vol);
      setTempVibrationEnabled(vib);
    } catch (err) {
      console.warn("Profile fetch error:", err);
    }
  }, []);

  // Fetch focus sessions and multi-domain telemetry for selected date
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

      // 1. Fetch focus sessions
      const { data: focusData, error: focusErr } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", selectedDate)
        .is("deleted_at", null)
        .order("started_at", { ascending: false });

      if (focusErr) {
        if (focusErr.code === "42P01") setSchemaPending(true);
        else setErrorMsg(focusErr.message);
      } else {
        setSchemaPending(false);
        setSessions(focusData || []);
      }

      // 2. Fetch math sessions (recent 7 sessions)
      try {
        const { data: mathData } = await supabase
          .from("math_sessions")
          .select("*")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(7);

        if (mathData) setMathSessions(mathData);
      } catch (err) {
        console.warn("Math sessions fetch notice:", err);
      }

      // 3. Fetch check-ins for selected date
      try {
        const { data: checkinData } = await supabase
          .from("mind_checkins")
          .select("*")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null)
          .order("created_at", { ascending: true });

        if (checkinData) setCheckins(checkinData as MindCheckin[]);
      } catch (err) {
        console.warn("Checkins fetch notice:", err);
      }

      // 4. Fetch discipline log for selected date
      try {
        const { data: discData } = await supabase
          .from("discipline_logs")
          .select("completed_count, total_count")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null)
          .maybeSingle();

        if (discData) {
          setDisciplineStats({
            completed: discData.completed_count || 0,
            total: discData.total_count || 0,
          });
        }
      } catch (err) {
        console.warn("Discipline fetch notice:", err);
      }

      // 5. Fetch reading logs for selected date
      try {
        const { data: readData } = await supabase
          .from("reading_logs")
          .select("pages_read, duration_minutes")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null);

        if (readData && readData.length > 0) {
          const p = readData.reduce((acc, r) => acc + (r.pages_read || 0), 0);
          const m = readData.reduce((acc, r) => acc + (r.duration_minutes || 0), 0);
          setReadingPagesToday(p);
          setReadingMinutesToday(m);
        } else {
          setReadingPagesToday(0);
          setReadingMinutesToday(0);
        }
      } catch (err) {
        console.warn("Reading fetch notice:", err);
      }

      // 6. Fetch screen time log for selected date
      try {
        const { data: stData } = await supabase
          .from("screen_time_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null)
          .maybeSingle();

        if (stData) setScreenTimeToday(stData as ScreenTimeLog);
        else setScreenTimeToday(null);
      } catch (err) {
        console.warn("Screen time fetch notice:", err);
      }

      // 7. Assemble rolling 7-day telemetry for insights
      try {
        const daysArray: DailyTelemetrySummary[] = [
          {
            date: selectedDate,
            focusMinutes: (focusData || []).reduce((acc, s) => acc + (s.actual_minutes || 0), 0),
            disciplineCompleted: disciplineStats.completed,
            disciplineTotal: disciplineStats.total,
            mathAccuracy: mathSessions.length > 0 ? mathSessions[0].accuracy_pct : null,
            mathAvgSpeedMs: mathSessions.length > 0 ? mathSessions[0].avg_response_time_ms : null,
            readingMinutes: readingMinutesToday,
            screenTimeTotalMinutes: screenTimeToday?.total_minutes || null,
          },
        ];
        setWeeklyTelemetry(daysArray);
      } catch (err) {
        console.warn("Telemetry synthesis notice:", err);
      }
    } catch (err: any) {
      console.error("Dashboard data load error:", err);
      setErrorMsg(err.message || "Failed to load telemetry.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, disciplineStats.completed, disciplineStats.total, readingMinutesToday, screenTimeToday?.total_minutes, mathSessions]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Date Navigation
  const changeDateByDays = (delta: number) => {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const curr = new Date(y, m - 1, d);
    curr.setDate(curr.getDate() + delta);
    setSelectedDate(getLocalDateString(curr, userProfile.timezone));
  };

  const isToday = selectedDate === getLocalDateString(new Date(), userProfile.timezone);

  // Focus Score calculation
  const scoreData = calculateFocusScore(sessions, userProfile.dailyFocusGoalMinutes);

  // Math summary stats
  const mathAccuracy =
    mathSessions.length > 0
      ? Math.round(
          mathSessions.reduce((acc, s) => acc + (s.accuracy_pct || 0), 0) / mathSessions.length
        )
      : null;
  const mathAvgSpeed =
    mathSessions.length > 0
      ? (
          mathSessions.reduce((acc, s) => acc + (s.avg_response_time_ms || 0), 0) /
          mathSessions.length /
          1000
        ).toFixed(2)
      : null;

  // Composite Mind Score (Stage 7c)
  const compositeMindScore = calculateCompositeMindScore({
    focusMinutes: scoreData.totalActualMinutes,
    focusGoalMinutes: userProfile.dailyFocusGoalMinutes,
    focusRatingAvg: scoreData.averageRating,
    disciplineCompleted: disciplineStats.completed,
    disciplineTotal: disciplineStats.total,
    mathAccuracyPct: mathAccuracy,
    mathSessionsCount: mathSessions.length,
    readingPages: readingPagesToday,
    readingMinutes: readingMinutesToday,
    screenTime: screenTimeToday
      ? {
          totalMinutes: screenTimeToday.total_minutes,
          productiveMinutes: screenTimeToday.productive_minutes,
          entertainmentMinutes: screenTimeToday.entertainment_minutes,
        }
      : null,
  });

  // Weekly Insights (Stage 7c)
  const weeklyInsights = generateWeeklyMindInsights(weeklyTelemetry);

  // Save Settings
  const handleSaveSettings = async () => {
    guardAction(async () => {
      setSavingSettings(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in to save settings.");

        const goalVal = tempGoalMinutes.trim() !== "" ? Number(tempGoalMinutes) : null;

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
      <div className="stitch-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-tertiary-purple/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple shadow-xs">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-on-surface">
                  {dict.mind.engineTitle}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30">
                  {locale === "ar" ? "جاهز ومكتمل" : "Stage 7c Complete"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                {locale === "ar"
                  ? "تركيز فائق، حساب ذهني، عادات والتزامات، قراءة، توازن وقت الشاشة، ومؤشر الجاهزية"
                  : "Ultradian focus, mental math agility, habits, reading, screen balance & cognitive score"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs text-on-surface hover:border-tertiary-purple/40 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-tertiary-purple" />
              <span>{locale === "ar" ? "الهدف والتنبيه" : "Goal & Chime"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* URL-Based Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface-container border border-border-subtle overflow-x-auto">
        {[
          { id: "focus", label: dict.mind.focusTimer, icon: Clock },
          { id: "math", label: dict.mind.mentalMath, icon: Zap },
          { id: "discipline", label: locale === "ar" ? "الالتزامات" : "Discipline", icon: ShieldCheck },
          { id: "reading", label: dict.mind.reading, icon: BookOpen },
          { id: "screentime", label: dict.mind.screenTime, icon: Smartphone },
          { id: "checkin", label: locale === "ar" ? "تسجيل الحالة" : "Check-in", icon: Heart },
          { id: "insights", label: locale === "ar" ? "التحليلات" : "Insights", icon: Lightbulb },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-tertiary-purple text-on-primary shadow-xs font-bold"
                  : "text-text-muted hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Migration Pending Notice */}
      {schemaPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-mono space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Database Tables Pending Migration</span>
          </div>
          <p className="text-text-muted leading-relaxed">
            Run <code className="text-amber-800">supabase/migrations/007_mind_training_and_checkins.sql</code> and <code className="text-amber-800">008_mind_reading_and_screentime.sql</code> in your Supabase SQL editor.
          </p>
        </div>
      )}

      {/* Error notice */}
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-crimson-alert/10 border border-crimson-alert/30 text-crimson-alert text-xs font-mono flex items-center gap-2">
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
              onClick={() => setSelectedDate(getLocalDateString(new Date(), userProfile.timezone))}
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

      {/* ======================================================================
          TAB CONTENT
          ====================================================================== */}

      {/* TAB 1: FOCUS & COMPREHENSIVE OVERVIEW */}
      {currentTab === "focus" && (
        !isModuleActive("module_focus") ? (
          <DisabledModuleFallback
            moduleKey="module_focus"
            onEnabled={() => setTab("focus")}
          />
        ) : (
        <div className="space-y-6">
          {/* Hero 1: Composite Mind Score Dial */}
          <MindScoreDial scoreData={compositeMindScore} />

          {/* Daily Metrics: Focus score, Deep Work, Sessions, Rating */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
            {/* Focus Score */}
            <div className="stitch-card p-4 space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>{locale === "ar" ? "درجة التركيز" : "Focus Score"}</span>
                <Sparkles className="w-3.5 h-3.5 text-tertiary-purple" />
              </div>
              <div className="text-2xl font-extrabold text-on-surface flex items-baseline gap-1">
                {scoreData.score !== null ? (
                  <>
                    <span className="text-tertiary-purple">{scoreData.score}</span>
                    <span className="text-xs text-text-muted font-normal">/ 100</span>
                  </>
                ) : (
                  <span className="text-sm text-text-muted font-normal">
                    {locale === "ar" ? "مفيش تقييم" : "No rating"}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-on-surface-variant truncate">{scoreData.label}</div>
            </div>

            {/* Deep Work Time */}
            <div className="stitch-card p-4 space-y-1">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>{locale === "ar" ? "العمل العميق" : "Deep Work"}</span>
                <Clock className="w-3.5 h-3.5 text-secondary-cyan" />
              </div>
              <div className="text-2xl font-extrabold text-on-surface">
                {scoreData.totalActualMinutes}
                <span className="text-xs text-text-muted font-normal ml-1">
                  {locale === "ar" ? "دقيقة" : "min"}
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant">
                {userProfile.dailyFocusGoalMinutes
                  ? locale === "ar"
                    ? `الهدف: ${userProfile.dailyFocusGoalMinutes} دقيقة (${scoreData.goalProgressPercent}%)`
                    : `Goal: ${userProfile.dailyFocusGoalMinutes} min (${scoreData.goalProgressPercent}%)`
                  : locale === "ar"
                  ? "مفيش هدف يومي محدد"
                  : "No daily goal set"}
              </div>
            </div>

            {/* Sessions Done */}
            <div className="stitch-card p-4 space-y-1">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>{locale === "ar" ? "الجلسات" : "Sessions"}</span>
                <Target className="w-3.5 h-3.5 text-primary-lime" />
              </div>
              <div className="text-2xl font-extrabold text-on-surface">
                {scoreData.completedCount}
                <span className="text-xs text-text-muted font-normal ml-1">
                  {locale === "ar" ? "مكتملة" : "done"}
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant">
                {locale === "ar" ? "فترات عمل وتركيز" : "Sprints & intervals"}
              </div>
            </div>

            {/* Avg Rating */}
            <div className="stitch-card p-4 space-y-1">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>{locale === "ar" ? "تقييم الجلسات" : "Session Rating"}</span>
                <Star className="w-3.5 h-3.5 text-amber-core" />
              </div>
              <div className="text-2xl font-extrabold text-on-surface">
                {scoreData.averageRating !== null ? (
                  <>
                    <span className="text-amber-core">{scoreData.averageRating}</span>
                    <span className="text-xs text-text-muted font-normal">/ 5</span>
                  </>
                ) : (
                  <span className="text-sm text-text-muted font-normal">
                    {locale === "ar" ? "مفيش" : "None"}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-on-surface-variant">
                {sessions.filter((s) => s.rating).length > 0
                  ? locale === "ar"
                    ? `${sessions.filter((s) => s.rating).length} جلسة متقيمة`
                    : `${sessions.filter((s) => s.rating).length} rated sessions`
                  : locale === "ar"
                  ? "قيم جلساتك بعد ما تخلصها"
                  : "Rate completed focus"}
              </div>
            </div>
          </div>

          {/* Row 1: Math Summary & Discipline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Math Summary Card with Sparkline */}
            <div className="stitch-card p-5 space-y-4 font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">
                      {locale === "ar" ? "ملخص الحساب الذهني" : "Mental Math Summary"}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant">
                      {locale === "ar" ? "السرعة والدقة في الحساب" : "Agility & calculation speed"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMathModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary-lime text-on-primary font-bold text-xs uppercase tracking-wider hover:bg-primary-lime-dim cursor-pointer transition-all"
                >
                  {locale === "ar" ? "تدريب دلوقتي" : "Train Now"}
                </button>
              </div>

              {mathSessions.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface-container-low border border-dashed border-border-subtle text-center space-y-1.5">
                  <p className="text-xs text-text-muted">
                    {locale === "ar" ? "مفيش تدريب اتسجل النهاردة." : "No training today."}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    {locale === "ar"
                      ? "نشّط سرعة بديهتك وتفكيرك في تحدي 60 ثانية."
                      : "Sharpen mental processing speed in a 60-second sprint."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-container-low rounded-xl border border-border-subtle">
                      <div className="text-[10px] uppercase text-text-muted">
                        {locale === "ar" ? "الدقة" : "Accuracy"}
                      </div>
                      <div className="text-lg font-bold text-primary-lime">{mathAccuracy}%</div>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-xl border border-border-subtle">
                      <div className="text-[10px] uppercase text-text-muted">
                        {locale === "ar" ? "متوسط السرعة" : "Avg Speed"}
                      </div>
                      <div className="text-lg font-bold text-on-surface">
                        {mathAvgSpeed} {locale === "ar" ? "ث / مسألة" : "s / item"}
                      </div>
                    </div>
                  </div>

                  {/* Sparkline Visual */}
                  <div className="p-3 bg-surface-container-low rounded-xl border border-border-subtle space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>{locale === "ar" ? "نتائج الجلسات الأخيرة" : "Recent Session Scores"}</span>
                      <span>
                        {mathSessions.length} {locale === "ar" ? "جلسة" : "logged"}
                      </span>
                    </div>
                    <div className="flex items-end gap-1.5 h-10 pt-1">
                      {mathSessions
                        .slice(0, 7)
                        .reverse()
                        .map((s, idx) => {
                          const heightPct = Math.min(100, Math.max(15, (s.score / 25) * 100));
                          return (
                            <div
                              key={s.id || idx}
                              className="flex-1 bg-primary-lime/20 hover:bg-primary-lime/40 rounded-t-md transition-all relative group"
                              style={{ height: `${heightPct}%` }}
                              title={`Score: ${s.score} (${s.accuracy_pct}%)`}
                            >
                              <div className="w-full h-1 bg-primary-lime rounded-t-md" />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Discipline Card */}
            <DisciplineCard selectedDate={selectedDate} />
          </div>

          {/* Row 2: Reading Card & Screen Time Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadingCard selectedDate={selectedDate} onReadingUpdated={fetchSessions} />
            <ScreenTimeCard selectedDate={selectedDate} onScreenTimeUpdated={fetchSessions} />
          </div>

          {/* Row 3: Daily State Check-in card */}
          <div className="stitch-card p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-amber-core" />
                <h3 className="text-sm font-bold text-on-surface">
                  {locale === "ar" ? "تسجيل الحالة اليومية" : "Daily State Check-ins"}
                </h3>
              </div>
              <button
                onClick={() => setIsCheckinModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs text-on-surface cursor-pointer transition-colors"
              >
                {locale === "ar" ? "تسجيل الحالة" : "Log Check-in"}
              </button>
            </div>

            {checkins.length === 0 ? (
              <p className="text-xs text-text-muted italic py-1">
                {locale === "ar"
                  ? "مفيش تسجيلات للحالة النهاردة. قيّم مزاجك وطاقتك وتركيزك الذهني."
                  : "No check-ins today. Calibrate mood, energy, and cognitive focus."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["morning", "midday", "evening"] as const).map((p) => {
                  const item = checkins.find((c) => c.period === p);
                  const pLabel =
                    p === "morning"
                      ? locale === "ar"
                        ? "الصبح"
                        : "morning"
                      : p === "midday"
                      ? locale === "ar"
                        ? "الضهر"
                        : "midday"
                      : locale === "ar"
                      ? "بليل"
                      : "evening";
                  return (
                    <div
                      key={p}
                      onClick={() => setIsCheckinModalOpen(true)}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                        item
                          ? "bg-surface-container-low border-border-subtle"
                          : "bg-surface-container-low/40 border-dashed border-border-subtle text-text-muted"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-text-muted capitalize">
                        {pLabel}
                      </div>
                      {item ? (
                        <div className="mt-1 space-y-0.5">
                          <div className="text-amber-core font-bold">
                            {locale === "ar" ? "المزاج: " : "Mood: "}
                            {RATING_LABELS[item.mood_score]}
                          </div>
                          <div className="text-[10px] text-on-surface-variant">
                            {locale === "ar" ? "الطاقة: " : "Energy: "}
                            {RATING_LABELS[item.energy_score]}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-text-muted text-[11px]">
                          {locale === "ar" ? "+ اضغط للتسجيل" : "+ Tap to log"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 4: Weekly Cognitive Insights Card */}
          <WeeklyInsightCard insights={weeklyInsights} />

          {/* Focus Timer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-mono text-on-surface">
                  {locale === "ar" ? "مؤقت جلسات التركيز" : "Focus Session Timer"}
                </h2>
                <p className="text-xs text-on-surface-variant font-mono">
                  {locale === "ar"
                    ? "إيقاع التركيز الفائق، جلسات مكثفة، وتجديد النشاط"
                    : "Ultradian rhythm, sprints, and interval renewals"}
                </p>
              </div>
            </div>

            <UltradianTimer
              onSessionLogged={fetchSessions}
              userTimezone={userProfile.timezone}
              defaultMode={userProfile.defaultFocusMode}
              chimeEnabledDefault={userProfile.soundChimeEnabled}
              soundVolumeDefault={userProfile.soundVolume}
              vibrationDefault={userProfile.vibrationEnabled}
            />
          </div>

          {/* Focus History List */}
          <div className="space-y-4">
            <FocusHistoryList
              sessions={sessions}
              onSessionsUpdated={fetchSessions}
              userTimezone={userProfile.timezone}
            />
          </div>
        </div>
        )
      )}

      {/* TAB 2: MENTAL MATH ARENA */}
      {currentTab === "math" && (
        !isModuleActive("module_math") ? (
          <DisabledModuleFallback
            moduleKey="module_math"
            onEnabled={() => setTab("math")}
          />
        ) : (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
              <div>
                <h2 className="text-base font-bold font-mono text-on-surface">Mental Math Arena</h2>
                <p className="text-xs text-on-surface-variant font-mono">
                  Sprint (60s) or Precision (20 questions) training
                </p>
              </div>
              <button
                onClick={() => setIsMathModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-primary-lime text-on-primary font-mono font-bold text-xs uppercase tracking-wider hover:bg-primary-lime-dim shadow-xs cursor-pointer transition-all"
              >
                Launch Trainer
              </button>
            </div>

            {mathSessions.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Zap className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-xs font-mono text-text-muted">No math sessions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2 font-mono">
                {mathSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-on-surface capitalize">
                        {s.mode} • {s.operation} ({s.difficulty})
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {new Date(s.created_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                        {" • "}
                        {s.duration_seconds}s total
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary-lime">
                        {s.mode === "sprint" ? `${s.score} Correct` : `${s.accuracy_pct}% Accuracy`}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {(s.avg_response_time_ms / 1000).toFixed(2)}s / item
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* TAB 3: DISCIPLINE COMMITMENTS */}
      {currentTab === "discipline" && (
        !isModuleActive("module_discipline") ? (
          <DisabledModuleFallback
            moduleKey="module_discipline"
            onEnabled={() => setTab("discipline")}
          />
        ) : (
          <div className="space-y-6">
            <DisciplineCard selectedDate={selectedDate} />
          </div>
        )
      )}

      {/* TAB 4: READING ENGINE */}
      {currentTab === "reading" && (
        !isModuleActive("module_reading") ? (
          <DisabledModuleFallback
            moduleKey="module_reading"
            onEnabled={() => setTab("reading")}
          />
        ) : (
          <div className="space-y-6">
            <ReadingCard selectedDate={selectedDate} onReadingUpdated={fetchSessions} />
          </div>
        )
      )}

      {/* TAB 5: SCREEN TIME TELEMETRY */}
      {currentTab === "screentime" && (
        !isModuleActive("module_screentime") ? (
          <DisabledModuleFallback
            moduleKey="module_screentime"
            onEnabled={() => setTab("screentime")}
          />
        ) : (
          <div className="space-y-6">
            <ScreenTimeCard selectedDate={selectedDate} onScreenTimeUpdated={fetchSessions} />
          </div>
        )
      )}

      {/* TAB 6: MOOD & ENERGY CHECK-INS */}
      {currentTab === "checkin" && (
        !isModuleActive("module_checkins") ? (
          <DisabledModuleFallback
            moduleKey="module_checkins"
            onEnabled={() => setTab("checkin")}
          />
        ) : (
        <div className="space-y-6">
          <div className="stitch-card p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div>
                <h2 className="text-base font-bold text-on-surface">Mood & Energy Logs</h2>
                <p className="text-xs text-on-surface-variant">Honest calibration without clinical labels</p>
              </div>
              <button
                onClick={() => setIsCheckinModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-core/15 border border-amber-core/40 text-amber-core font-bold text-xs uppercase cursor-pointer"
              >
                Log Entry
              </button>
            </div>

            {checkins.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No check-ins today. Tap Log Entry to record morning, midday, or evening state.
              </p>
            ) : (
              <div className="space-y-3">
                {checkins.map((c) => (
                  <div
                    key={c.id || c.period}
                    className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-core uppercase">
                        {c.period} Check-in
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(c.created_at || Date.now()).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>Mood: <strong className="text-on-surface">{RATING_LABELS[c.mood_score]}</strong></div>
                      <div>Energy: <strong className="text-on-surface">{RATING_LABELS[c.energy_score]}</strong></div>
                      <div>Focus: <strong className="text-on-surface">{RATING_LABELS[c.focus_score]}</strong></div>
                    </div>

                    {c.context_tags && c.context_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {c.context_tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-surface-container-high border border-border-subtle text-text-muted"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* TAB 7: WEEKLY INSIGHTS */}
      {currentTab === "insights" && (
        <div className="space-y-6">
          <WeeklyInsightCard insights={weeklyInsights} />
        </div>
      )}

      {/* MODALS */}
      <MathTrainerModal
        isOpen={isMathModalOpen}
        onClose={() => setIsMathModalOpen(false)}
        onSessionSaved={() => fetchSessions()}
      />

      <MoodCheckinModal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        selectedDate={selectedDate}
        existingCheckins={checkins}
        onCheckinSaved={() => fetchSessions()}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl p-6 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-tertiary-purple" />
                <h3 className="text-sm font-bold text-on-surface">Mind & Focus Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Daily Goal */}
            <div className="space-y-1.5">
              <label className="text-text-muted uppercase text-[11px] block">
                Daily Focus Goal (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={720}
                value={tempGoalMinutes}
                onChange={(e) => setTempGoalMinutes(e.target.value)}
                placeholder="e.g. 180 (3 hours)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple"
              />
            </div>

            {/* Default Mode */}
            <div className="space-y-1.5">
              <label className="text-text-muted uppercase text-[11px] block">
                Default Focus Preset
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
                          ? "bg-tertiary-purple text-on-primary font-bold border-tertiary-purple shadow-xs"
                          : "bg-surface-container-low text-text-muted border-border-subtle hover:text-on-surface"
                      }`}
                    >
                      <div className="text-xs">{p.badge}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{p.name.split(" ")[0]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Chime & Vibration */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-secondary-cyan" />
                  <span className="text-on-surface font-bold">Chime Audio</span>
                </div>
                <input
                  type="checkbox"
                  checked={tempChimeEnabled}
                  onChange={(e) => setTempChimeEnabled(e.target.checked)}
                  className="w-4 h-4 accent-tertiary-purple cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-tertiary-purple" />
                  <span className="text-on-surface font-bold">Haptic Vibration</span>
                </div>
                <input
                  type="checkbox"
                  checked={tempVibrationEnabled}
                  onChange={(e) => setTempVibrationEnabled(e.target.checked)}
                  className="w-4 h-4 accent-tertiary-purple cursor-pointer"
                />
              </div>

              <p className="text-[10px] text-text-muted leading-relaxed pt-1">
                Note: Vibration and audio synthesis depend on OS capabilities. iOS Safari does not support the Vibration API; audio requires initial screen tap.
              </p>
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
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-tertiary-purple text-on-primary hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
