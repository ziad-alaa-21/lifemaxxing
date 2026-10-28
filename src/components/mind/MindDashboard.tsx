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
      {/* Sub-navigation Header Area (Stitch Screens) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-text-muted">
              {currentTab === "focus"
                ? (locale === "ar" ? "نطاق الذهن / حالة التركيز" : "MIND DOMAIN / ACTIVE DEEP FOCUS STATE")
                : currentTab === "discipline" || currentTab === "habits"
                ? (locale === "ar" ? "نطاق الذهن / الروتين والصفاء" : "MIND DOMAIN / ROUTINES AND CLARITY")
                : currentTab === "checkin"
                ? (locale === "ar" ? "المؤشرات الذهنية الأساسية" : "MENTAL BASELINE")
                : (locale === "ar" ? "نطاق الذهن / الأدوات" : "MIND DOMAIN")}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-primary-ink" />
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
              {locale === "ar" ? "الذهن" : "Mind"}
            </h1>
          </div>
        </div>

        {/* Segmented Control Bar (Exact Stitch Pills) */}
        <div className="inline-flex p-1 bg-surface-container-high rounded-full self-start md:self-auto shadow-xs border border-border-subtle">
          {[
            { id: "focus", label: locale === "ar" ? "التركيز" : "Focus", icon: Clock },
            { id: "discipline", label: locale === "ar" ? "العادات" : "Habits", icon: ShieldCheck },
            { id: "checkin", label: locale === "ar" ? "تقييم اليوم" : "Check-in", icon: Heart },
            {
              id: (["math", "reading", "screentime", "insights"].includes(currentTab) ? currentTab : "math"),
              tabKey: "tools",
              label: locale === "ar" ? "الأدوات" : "Tools",
              icon: Zap,
              isMatch: ["math", "reading", "screentime", "insights", "tools"].includes(currentTab),
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.isMatch !== undefined ? tab.isMatch : currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary-ink text-on-primary shadow-xs font-bold"
                    : "text-text-muted hover:text-on-surface"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date & Settings Sub-bar */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-border-subtle shadow-xs">
          <button
            onClick={() => changeDateByDays(-1)}
            className="p-1 rounded-full hover:bg-surface-container text-text-muted hover:text-on-surface transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 font-medium text-on-surface">
            <Calendar className="w-3.5 h-3.5 text-tertiary-purple" />
            <span>{selectedDate || "Loading date..."}</span>
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-ink/10 text-primary-ink font-semibold">
                {locale === "ar" ? "النهاردة" : "Today"}
              </span>
            )}
          </div>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(getLocalDateString(new Date(), userProfile.timezone))}
              className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] text-on-surface hover:text-primary-ink transition-colors cursor-pointer"
            >
              {locale === "ar" ? "النهاردة" : "Today"}
            </button>
          )}
          <button
            onClick={() => changeDateByDays(1)}
            disabled={isToday}
            className="p-1 rounded-full hover:bg-surface-container text-text-muted hover:text-on-surface transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-border-subtle text-xs text-text-muted hover:text-on-surface hover:border-tertiary-purple/40 shadow-xs transition-colors cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5 text-tertiary-purple" />
          <span>{locale === "ar" ? "الهدف والتنبيه" : "Goal & Chime"}</span>
        </button>
      </div>

      {/* Tools Sub-Navigation (Shown when user is in Tools tab) */}
      {["math", "reading", "screentime", "insights", "tools"].includes(currentTab) && (
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-border-subtle overflow-x-auto text-xs">
          {[
            { id: "math", label: locale === "ar" ? "الحساب الذهني" : "Mental Math", icon: Zap },
            { id: "reading", label: locale === "ar" ? "القراءة" : "Reading", icon: BookOpen },
            { id: "screentime", label: locale === "ar" ? "وقت الشاشة" : "Screen Time", icon: Smartphone },
            { id: "insights", label: locale === "ar" ? "تحليلات" : "Insights", icon: Lightbulb },
          ].map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = currentTab === sub.id || (currentTab === "tools" && sub.id === "math");
            return (
              <button
                key={sub.id}
                onClick={() => setTab(sub.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isSubActive
                    ? "bg-surface-container font-bold text-tertiary-purple shadow-xs border border-border-subtle"
                    : "text-text-muted hover:text-on-surface"
                }`}
              >
                <SubIcon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}

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

      {/* ======================================================================
          TAB CONTENT
          ====================================================================== */}

      {/* TAB 1: FOCUS WORKSPACE (Stitch 12-Column Responsive Grid) */}
      {currentTab === "focus" && (
        !isModuleActive("module_focus") ? (
          <DisabledModuleFallback
            moduleKey="module_focus"
            onEnabled={() => setTab("focus")}
          />
        ) : (
        <div className="space-y-6">
          {/* Main 12-Column Workspace matching Stitch */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (8 cols): Hero Focus Timer */}
            <div className="lg:col-span-8 space-y-6">
              <UltradianTimer
                onSessionLogged={fetchSessions}
                userTimezone={userProfile.timezone}
                defaultMode={userProfile.defaultFocusMode}
                chimeEnabledDefault={userProfile.soundChimeEnabled}
                soundVolumeDefault={userProfile.soundVolume}
                vibrationDefault={userProfile.vibrationEnabled}
              />
            </div>

            {/* Right Column (4 cols): Current Session Details, Today's Progress & Mind Ambience (Stitch Screenshot 3) */}
            <div className="lg:col-span-4 space-y-5">
              {/* Current Session Details Card */}
              <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">
                    {locale === "ar" ? "تفاصيل الجلسة الحالية" : "Current session details"}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                    {locale === "ar" ? "جلسة نشطة" : "Sprint active"}
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-1 border-t border-border-subtle/50">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">{locale === "ar" ? "الموضوع:" : "Subject"}</span>
                    <span className="font-semibold text-on-surface">Physics</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">{locale === "ar" ? "الهدف:" : "Goal"}</span>
                    <span className="font-semibold text-on-surface">Problem set 4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">{locale === "ar" ? "بدأت الساعة:" : "Started at"}</span>
                    <span className="font-semibold text-on-surface">10:15 am</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">{locale === "ar" ? "النوع:" : "Mode"}</span>
                    <span className="font-semibold text-on-surface">Sprint 50/10</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-[11px] text-text-muted">
                  <Volume2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Binaural beats active (40 Hz gamma)</span>
                </div>
              </div>

              {/* Today's Progress Card (Stitch Screenshot 3) */}
              <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-on-surface">
                    {locale === "ar" ? "تقدم النهاردة" : "Today's progress"}
                  </h2>
                  <span className="text-[11px] text-blue-600 font-medium">
                    {scoreData.goalProgressPercent || 70}% target reached
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-bold text-on-surface">
                    {Math.floor(scoreData.totalActualMinutes / 60)} h {scoreData.totalActualMinutes % 60} m
                    <span className="text-xs font-normal text-text-muted ml-1.5">completed</span>
                  </div>
                </div>

                {/* Flat Progress Track */}
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, scoreData.goalProgressPercent || 70)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border-subtle/50">
                  <span>Target goal: {Math.floor((userProfile.dailyFocusGoalMinutes || 120) / 60)} h target</span>
                  <span>Streak: 6 days</span>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-subtle text-center text-xs">
                  <div className="p-2 rounded-xl bg-surface-container-low flex flex-col items-center">
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Target className="w-3 h-3 text-blue-600" />
                      <span>Completed</span>
                    </span>
                    <span className="font-bold text-on-surface">{scoreData.completedCount || 2} blocks</span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-low flex flex-col items-center">
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      <span>Efficiency</span>
                    </span>
                    <span className="font-bold text-on-surface">94%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-low flex flex-col items-center">
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span>Score</span>
                    </span>
                    <span className="font-bold text-on-surface">{scoreData.score !== null ? scoreData.score : 85}</span>
                  </div>
                </div>

                <p className="text-[10px] text-text-muted leading-relaxed">
                  Keep steady cadence. Next 10-minute restorative break begins right at completion.
                </p>

                {/* Logged Intervals (Stitch style list) */}
                <div className="flex flex-col pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                      {locale === "ar" ? "جلسات مسجلة" : "Logged intervals"}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {sessions.length} {locale === "ar" ? "جلسة" : "sessions"}
                    </span>
                  </div>
                  <FocusHistoryList
                    sessions={sessions}
                    onSessionsUpdated={fetchSessions}
                    userTimezone={userProfile.timezone}
                  />
                </div>
              </div>

              {/* Mind Ambience Card (Stitch Screenshot 3) */}
              <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">
                    {locale === "ar" ? "أجواء التركيز" : "Mind ambience"}
                  </span>
                  <span className="text-[10px] font-medium text-text-muted">Focus sound</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Structured noise generation calibrated to reduce ambient distraction during sprint intervals.
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface-container-low border border-border-subtle text-xs">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-medium text-on-surface">Deep space synth</span>
                    </div>
                    <span className="text-blue-600 font-semibold text-[11px]">Playing</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface-container-low/60 border border-border-subtle/50 text-xs">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-text-muted">Soft rainfall</span>
                    </div>
                    <button type="button" className="text-text-muted hover:text-on-surface text-[11px]">
                      Switch
                    </button>
                  </div>
                </div>
              </div>

              {/* Mind Score Dial */}
              <MindScoreDial scoreData={compositeMindScore} />
            </div>
          </div>
        </div>
        )
      )}

      {/* TAB 2: HABITS & COMMITMENTS */}
      {(currentTab === "discipline" || currentTab === "habits") && (
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

      {/* TAB 3: CHECK-IN & DAILY STATE (Stitch Screenshot 2) */}
      {currentTab === "checkin" && (
        !isModuleActive("module_checkins") ? (
          <DisabledModuleFallback
            moduleKey="module_checkins"
            onEnabled={() => setTab("checkin")}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8 cols): Inline Interactive Check-in Card (Stitch Screenshot 2) */}
              <div className="lg:col-span-8 bg-surface-container-lowest rounded-[20px] p-6 lg:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-on-surface">
                      {locale === "ar" ? "حاسس بإيه دلوقتي؟" : "How are you feeling?"}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {locale === "ar"
                        ? "سجّل مستوى طاقتك وتركيزك الذهني في اللحظة دي."
                        : "Log your state of awareness and physical battery right now."}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted font-medium">
                    {locale === "ar" ? "نبض المساء" : "Afternoon pulse"}
                  </span>
                </div>

                {/* Rating 1: Mood */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">
                      {locale === "ar" ? "المزاج" : "Mood"}
                    </span>
                    <span className="text-blue-600 font-semibold">
                      {locale === "ar" ? "ممتاز (4)" : "Pleasant (4)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setIsCheckinModalOpen(true)}
                        className={`py-3 rounded-xl text-center text-sm font-bold transition-all cursor-pointer ${
                          val === 4
                            ? "bg-primary-ink text-on-primary shadow-xs"
                            : "bg-surface-container-low border border-border-subtle text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted px-1">
                    <span>{locale === "ar" ? "منخفض" : "Low"}</span>
                    <span>{locale === "ar" ? "ممتاز جدًا" : "Very good"}</span>
                  </div>
                </div>

                {/* Rating 2: Energy */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">
                      {locale === "ar" ? "مستوى الطاقة" : "Energy"}
                    </span>
                    <span className="text-blue-600 font-semibold">
                      {locale === "ar" ? "مستقر (3)" : "Steady (3)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setIsCheckinModalOpen(true)}
                        className={`py-3 rounded-xl text-center text-sm font-bold transition-all cursor-pointer ${
                          val === 3
                            ? "bg-primary-ink text-on-primary shadow-xs"
                            : "bg-surface-container-low border border-border-subtle text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted px-1">
                    <span>{locale === "ar" ? "مستنزف" : "Depleted"}</span>
                    <span>{locale === "ar" ? "في القمة" : "Peak"}</span>
                  </div>
                </div>

                {/* Rating 3: Focus */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">
                      {locale === "ar" ? "التركيز وصفاء الذهن" : "Focus"}
                    </span>
                    <span className="text-blue-600 font-semibold">
                      {locale === "ar" ? "صافي (4)" : "Clear (4)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setIsCheckinModalOpen(true)}
                        className={`py-3 rounded-xl text-center text-sm font-bold transition-all cursor-pointer ${
                          val === 4
                            ? "bg-primary-ink text-on-primary shadow-xs"
                            : "bg-surface-container-low border border-border-subtle text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted px-1">
                    <span>{locale === "ar" ? "مشوش" : "Foggy"}</span>
                    <span>{locale === "ar" ? "حاضر وحاد" : "Sharp"}</span>
                  </div>
                </div>

                {/* Anything to add textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface">
                    {locale === "ar" ? "تحب تضيف أي ملاحظة؟" : "Anything to add?"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      locale === "ar"
                        ? "ملاحظات إضافية، شربت قهوة قد إيه، أو أي أفكار سريعة..."
                        : "Context notes, caffeine intake, triggers, or spontaneous insights..."
                    }
                    onClick={() => setIsCheckinModalOpen(true)}
                    className="w-full p-3.5 rounded-xl bg-surface-container-low border border-border-subtle text-xs text-on-surface placeholder:text-text-muted outline-none resize-none"
                  />
                </div>

                {/* Footer Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>{locale === "ar" ? "مذكرات مشفرة ومحمية بالكامل" : "Private encrypted journal"}</span>
                  </div>
                  <button
                    onClick={() => setIsCheckinModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-primary-ink text-on-primary font-bold text-xs hover:brightness-110 cursor-pointer transition-all shadow-xs"
                  >
                    {locale === "ar" ? "حفظ التقييم" : "Save check-in"}
                  </button>
                </div>
              </div>

              {/* Right Column (4 cols): Earlier Today & Cognitive Rhythm */}
              <div className="lg:col-span-4 space-y-6">
                {/* Earlier Today Card */}
                <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      {locale === "ar" ? "في وقت سابق النهاردة" : "Earlier today"}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-text-muted">
                      {checkins.length > 0 ? `${checkins.length} logs total` : "2 logs total"}
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {checkins.length > 0 ? (
                      checkins.map((item) => (
                        <div key={item.id} className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              <span className="font-semibold text-on-surface capitalize">{item.period} pulse</span>
                            </div>
                            <span className="text-[10px] text-text-muted">
                              {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            Mood: {RATING_LABELS[item.mood_score]}, Energy: {RATING_LABELS[item.energy_score]}, Focus: {RATING_LABELS[item.focus_score]}
                          </p>
                          {item.context_tags && item.context_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.context_tags.map((t) => (
                                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-text-muted">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <>
                        {/* Log 1 */}
                        <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              <span className="font-semibold text-on-surface">Morning baseline</span>
                            </div>
                            <span className="text-[10px] text-text-muted">08:15 AM</span>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            Morning: mood 4 ({RATING_LABELS[4]}), energy 3 ({RATING_LABELS[3]}), focus 4 ({RATING_LABELS[4]})
                          </p>
                          <div className="flex gap-1.5 pt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-text-muted">
                              Hydrated
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-text-muted">
                              Quiet morning
                            </span>
                          </div>
                        </div>

                        {/* Log 2 */}
                        <div className="p-3 rounded-xl bg-surface-container-low/60 border border-border-subtle/60 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600/60" />
                              <span className="font-semibold text-on-surface">Waking state</span>
                            </div>
                            <span className="text-[10px] text-text-muted">06:40 AM</span>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            Awakening: mood 3 ({RATING_LABELS[3]}), energy 2 ({RATING_LABELS[2]}), focus 3 ({RATING_LABELS[3]})
                          </p>
                          <div className="flex gap-1.5 pt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-text-muted">
                              7h 24m sleep
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cognitive Rhythm Card */}
                <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                        {locale === "ar" ? "الإيقاع الذهني" : "Cognitive rhythm"}
                      </h3>
                      <p className="text-[10px] text-text-muted">
                        {locale === "ar" ? "استقرار النشاط اليومي" : "Day stability"}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                      {locale === "ar" ? "حالة متوازنة" : "Balanced state"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs pt-1">
                    <span className="text-text-muted">{locale === "ar" ? "ثبات الأداء" : "Day stability"}</span>
                    <span className="font-bold text-on-surface">88% consistency</span>
                  </div>

                  {/* Hourly Bars */}
                  <div className="h-20 flex items-end justify-between gap-2 pt-2 border-b border-border-subtle pb-2">
                    {[
                      { hour: "06h", height: "45%", active: false },
                      { hour: "08h", height: "65%", active: false },
                      { hour: "10h", height: "60%", active: false },
                      { hour: "Now", height: "90%", active: true },
                      { hour: "16h", height: "40%", active: false },
                      { hour: "20h", height: "35%", active: false },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div
                          className={`w-full rounded-xs transition-all ${
                            bar.active ? "bg-blue-600" : "bg-blue-500/20"
                          }`}
                          style={{ height: bar.height }}
                        />
                        <span className={`text-[9px] ${bar.active ? "font-bold text-blue-600" : "text-text-muted"}`}>
                          {bar.hour}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-text-muted leading-relaxed">
                    {locale === "ar"
                      ? "الطاقة بتقل عادة قرب الساعة 3:30 عصرًا. مشي 10 دقائق أو شرب مياه كافي للحفاظ على صفاء الذهن للمساء."
                      : "Energy historically drops near 15:30. A ten-minute outdoor walk or hydration break maintains clarity into evening."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* TAB 4: TOOLS (Mental Math, Reading, Screen Time - Stitch Screenshots 4 & 5) */}
      {(["tools", "math", "reading", "screentime", "insights"].includes(currentTab)) && (
        <div className="space-y-6">
          {/* Sub-tab Pill Selector */}
          <div className="flex items-center gap-2 pb-2">
            {[
              { id: "math", label: locale === "ar" ? "الحساب الذهني" : "Mental math" },
              { id: "reading", label: locale === "ar" ? "القراءة" : "Reading" },
              { id: "screentime", label: locale === "ar" ? "وقت الشاشة" : "Screen time" },
            ].map((sub) => {
              const isActive =
                (sub.id === "math" && (currentTab === "tools" || currentTab === "math")) ||
                currentTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setTab(sub.id)}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary-ink text-on-primary font-bold shadow-xs"
                      : "bg-surface-container-low text-text-muted hover:text-on-surface"
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* Sub-view 1: Mental Math Arena (Stitch Screenshot 4 left) */}
          {(currentTab === "tools" || currentTab === "math") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono">
              {/* Left Column (8 cols): Hero Protocol & Controls */}
              <div className="lg:col-span-8 bg-surface-container-lowest rounded-[20px] p-6 lg:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-container text-text-muted">
                      Mental discipline
                    </span>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                      Rapid calculation protocol
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    Personal record: <strong className="text-on-surface">34 solved</strong>
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    7-SESSION MOVING PERFORMANCE
                  </span>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-3xl font-extrabold text-on-surface block">
                        {mathAccuracy}%
                      </span>
                      <span className="text-xs text-text-muted">Calculation accuracy</span>
                    </div>
                    <div>
                      <span className="text-3xl font-extrabold text-on-surface block">
                        {mathAvgSpeed}s
                      </span>
                      <span className="text-xs text-text-muted">Average latency per answer</span>
                    </div>
                  </div>
                </div>

                {/* Pacing Bar Chart */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-text-muted">
                    <span>Recent pacing stability</span>
                    <span className="text-blue-600 font-semibold">Sub-3s threshold locked</span>
                  </div>
                  <div className="h-6 flex items-center gap-1">
                    {[65, 80, 75, 90, 85, 95, 70].map((w, idx) => (
                      <div
                        key={idx}
                        className="flex-1 h-3 rounded-xs bg-blue-500/30"
                        style={{ opacity: w / 100 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Target Operations Selector */}
                <div className="space-y-2 pt-2 border-t border-border-subtle/50">
                  <span className="text-xs font-semibold text-on-surface block">
                    Target operation
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {["Addition", "Subtraction", "Multiplication", "Division", "Mixed"].map((op, i) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setIsMathModalOpen(true)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                          i === 0
                            ? "bg-primary-ink text-on-primary font-bold shadow-xs"
                            : "bg-surface-container-low text-text-muted hover:text-on-surface"
                        }`}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Standard drill CTA */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-on-surface block">Standard drill</span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Continuous random arithmetic for 60 seconds
                  </p>
                  <button
                    onClick={() => setIsMathModalOpen(true)}
                    className="mt-4 px-6 py-3 rounded-xl bg-primary-ink text-on-primary font-bold text-xs hover:brightness-110 cursor-pointer transition-all shadow-xs"
                  >
                    {locale === "ar" ? "ابدأ سبرنت 60 ثانية" : "Start 60-second sprint"}
                  </button>
                </div>

                {/* Bottom Badges */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle/50">
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <span className="text-[10px] text-text-muted block">Cognitive speed rating</span>
                    <span className="text-base font-bold text-on-surface mt-1 block">Tier 1</span>
                    <span className="text-[10px] text-text-muted">Top bracket for speed</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <span className="text-[10px] text-text-muted block">Recommended focus</span>
                    <span className="text-base font-bold text-on-surface mt-1 block">Double digit division</span>
                    <span className="text-[10px] text-text-muted">Optimal for your next session</span>
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols): Session Log & Daily Sprint Frequency */}
              <div className="lg:col-span-4 space-y-6">
                {/* Session Log */}
                <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      Session log
                    </h3>
                    <span className="text-[10px] text-text-muted">Total 12</span>
                  </div>

                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-center justify-between py-1.5 border-b border-border-subtle/40">
                      <div>
                        <span className="font-semibold text-on-surface block">• Today</span>
                        <span className="text-[10px] text-text-muted">Addition and subtraction</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-on-surface block">Score 34</span>
                        <span className="text-[10px] text-blue-600">100% accuracy</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border-subtle/40">
                      <div>
                        <span className="font-semibold text-on-surface block">• Yesterday</span>
                        <span className="text-[10px] text-text-muted">Mixed operations</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-on-surface block">Score 31</span>
                        <span className="text-[10px] text-blue-600">93% accuracy</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border-subtle/40">
                      <div>
                        <span className="font-semibold text-on-surface block">• 2 days ago</span>
                        <span className="text-[10px] text-text-muted">Multiplication speed</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-on-surface block">Score 29</span>
                        <span className="text-[10px] text-blue-600">90% accuracy</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <div>
                        <span className="font-semibold text-on-surface block">• 4 days ago</span>
                        <span className="text-[10px] text-text-muted">Division drill</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-on-surface block">Score 23</span>
                        <span className="text-[10px] text-blue-600">88% accuracy</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMathModalOpen(true)}
                    className="text-xs text-blue-600 hover:underline pt-2 block w-full text-center"
                  >
                    View all session history
                  </button>
                </div>

                {/* Daily Sprint Frequency Card */}
                <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-3">
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Daily sprint frequency
                  </h3>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Consistently completing one sprint daily maintains active working memory recall speed under moderate cognitive load.
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle/50">
                    <span className="text-text-muted">Weekly target: 5 sessions</span>
                    <span className="font-bold text-on-surface">4 of 5 complete</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-view 2: Reading */}
          {currentTab === "reading" && (
            <ReadingCard selectedDate={selectedDate} onReadingUpdated={fetchSessions} />
          )}

          {/* Sub-view 3: Screen Time */}
          {currentTab === "screentime" && (
            <ScreenTimeCard selectedDate={selectedDate} onScreenTimeUpdated={fetchSessions} />
          )}

          {/* Sub-view 4: Insights */}
          {currentTab === "insights" && (
            <WeeklyInsightCard insights={weeklyInsights} />
          )}
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
