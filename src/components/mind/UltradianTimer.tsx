"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  Coffee,
  Brain,
  ChevronRight,
  Flame,
  Vibrate,
  AlertTriangle,
  Clock,
  Info,
} from "lucide-react";
import {
  FocusMode,
  SessionStatus,
  FOCUS_PRESETS,
  TASK_CATEGORIES,
  calculateRemainingSeconds,
  resumeSessionTimer,
  formatSeconds,
  calculateSessionProgress,
  playHarmonicChime,
} from "@/lib/mind";
import { SessionCompleteModal } from "./SessionCompleteModal";
import { useI18n } from "@/lib/i18n/I18nContext";

interface UltradianTimerProps {
  onSessionLogged: () => void;
  userTimezone: string;
  defaultMode?: FocusMode;
  chimeEnabledDefault?: boolean;
  soundVolumeDefault?: number;
  vibrationDefault?: boolean;
  initialSubjectId?: string | null;
  initialTaskCategory?: string;
  initialTaskIntention?: string;
}

type TimerPhase = "idle" | "working" | "paused" | "break" | "break_paused";

export function UltradianTimer({
  onSessionLogged,
  userTimezone,
  defaultMode = "sprint_50",
  chimeEnabledDefault = true,
  soundVolumeDefault = 80,
  vibrationDefault = true,
  initialSubjectId = null,
  initialTaskCategory = "Coding",
  initialTaskIntention = "",
}: UltradianTimerProps) {
  const { locale } = useI18n();
  // Preset mode: default 50/10
  const [selectedMode, setSelectedMode] = useState<FocusMode>(defaultMode);
  const [phase, setPhase] = useState<TimerPhase>("idle");

  // Category and Task Intention
  const [taskCategory, setTaskCategory] = useState<string>(initialTaskCategory);
  const [taskIntention, setTaskIntention] = useState(initialTaskIntention);
  const [subjectId, setSubjectId] = useState<string | null>(initialSubjectId);

  // Audio & Vibration settings
  const [chimeEnabled, setChimeEnabled] = useState(chimeEnabledDefault);
  const [soundVolume, setSoundVolume] = useState(soundVolumeDefault);
  const [vibrationEnabled, setVibrationEnabled] = useState(vibrationDefault);
  const [showAudioControls, setShowAudioControls] = useState(false);

  // Wall-Clock Time Tracking
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0);

  const preset = FOCUS_PRESETS[selectedMode] || FOCUS_PRESETS.sprint_50;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    preset.workMinutes * 60
  );

  // Recovery & Finished notification banners
  const [finishedNotice, setFinishedNotice] = useState<string | null>(null);
  const [recoveryPrompt, setRecoveryPrompt] = useState<{
    elapsedMinutes: number;
    plannedMinutes: number;
    startedAt: string;
    category: string;
    taskName: string;
  } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<SessionStatus>("completed");
  const [loggedActualMinutes, setLoggedActualMinutes] = useState(preset.workMinutes);

  const totalPhaseSeconds =
    phase === "break" || phase === "break_paused"
      ? preset.breakMinutes * 60
      : preset.workMinutes * 60;

  // Restore active timer or handle killed/closed recovery from localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo_recovery") === "true") {
        setRecoveryPrompt({
          elapsedMinutes: 50,
          plannedMinutes: 50,
          startedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
          category: "Study",
          taskName: "Algorithms Practice",
        });
        return;
      }

      const saved = localStorage.getItem("mind_active_timer");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.targetEndTime && parsed.startedAt) {
          const rem = calculateRemainingSeconds(
            parsed.targetEndTime,
            parsed.pausedAt
          );

          if (rem > 0 && parsed.phase !== "idle") {
            // Timer is still active or paused
            setPhase(parsed.phase || "working");
            setSelectedMode(parsed.mode || "sprint_50");
            setTargetEndTime(parsed.targetEndTime);
            setSessionStartTime(parsed.startedAt);
            setPausedAt(parsed.pausedAt || null);
            setTotalPausedSeconds(parsed.totalPausedSeconds || 0);
            setTaskCategory(parsed.category || "Coding");
            setTaskIntention(parsed.taskIntention || "");
            setSubjectId(parsed.subjectId || null);
            setRemainingSeconds(rem);
          } else if (rem <= 0 && parsed.phase === "working") {
            // App was closed and timer finished while closed
            const elapsed = Math.max(
              1,
              Math.round(
                (parsed.targetEndTime -
                  new Date(parsed.startedAt).getTime() -
                  (parsed.totalPausedSeconds || 0) * 1000) /
                  (60 * 1000)
              )
            );
            setRecoveryPrompt({
              elapsedMinutes: elapsed,
              plannedMinutes:
                FOCUS_PRESETS[parsed.mode as FocusMode]?.workMinutes || 50,
              startedAt: parsed.startedAt,
              category: parsed.category || "Coding",
              taskName: parsed.taskIntention || "",
            });
            localStorage.removeItem("mind_active_timer");
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse saved timer state:", e);
    }
  }, []);

  // Sync active timer to localStorage
  useEffect(() => {
    if (phase === "working" || phase === "paused" || phase === "break") {
      localStorage.setItem(
        "mind_active_timer",
        JSON.stringify({
          phase,
          mode: selectedMode,
          targetEndTime,
          startedAt: sessionStartTime,
          pausedAt,
          totalPausedSeconds,
          category: taskCategory,
          taskIntention,
          subjectId,
        })
      );
    } else if (phase === "idle") {
      localStorage.removeItem("mind_active_timer");
    }
  }, [
    phase,
    selectedMode,
    targetEndTime,
    sessionStartTime,
    pausedAt,
    totalPausedSeconds,
    taskCategory,
    taskIntention,
    subjectId,
  ]);

  // Main countdown tick loop (Wall-clock derived)
  useEffect(() => {
    if (phase !== "working" && phase !== "break") return;
    if (!targetEndTime) return;

    const interval = setInterval(() => {
      const rem = calculateRemainingSeconds(targetEndTime, null);
      setRemainingSeconds(rem);

      if (rem <= 0) {
        clearInterval(interval);
        handleIntervalCompleted();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [phase, targetEndTime]);

  // Handle phase completion
  const handleIntervalCompleted = useCallback(() => {
    const finishTimeStr = new Date().toLocaleTimeString(locale === "ar" ? "ar-EG" : [], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (phase === "working") {
      if (chimeEnabled) {
        playHarmonicChime("work_complete", soundVolume, vibrationEnabled);
      }
      setFinishedNotice(`Session finished at ${finishTimeStr}`);
      setLoggedActualMinutes(preset.workMinutes);

      // Transition to break
      const breakTarget = Date.now() + preset.breakMinutes * 60 * 1000;
      setTargetEndTime(breakTarget);
      setRemainingSeconds(preset.breakMinutes * 60);
      setPhase("break");
    } else if (phase === "break") {
      if (chimeEnabled) {
        playHarmonicChime("break_complete", soundVolume, vibrationEnabled);
      }
      setFinishedNotice(`Renewal break finished at ${finishTimeStr}`);
      setPhase("idle");
      setTargetEndTime(null);
      setRemainingSeconds(preset.workMinutes * 60);
      setModalStatus("completed");
      setIsModalOpen(true);
    }
  }, [phase, chimeEnabled, soundVolume, vibrationEnabled, preset]);

  // Start work session
  const handleStartWork = () => {
    const start = new Date().toISOString();
    setSessionStartTime(start);
    setFinishedNotice(null);
    setTotalPausedSeconds(0);
    setPausedAt(null);
    const target = Date.now() + preset.workMinutes * 60 * 1000;
    setTargetEndTime(target);
    setRemainingSeconds(preset.workMinutes * 60);
    setPhase("working");
  };

  // Pause session (Wall-clock time recorded)
  const handlePause = () => {
    if (phase === "working" || phase === "break") {
      setPausedAt(Date.now());
      setPhase(phase === "working" ? "paused" : "break_paused");
    }
  };

  // Resume session (Target end time pushed forward by pause duration)
  const handleResume = () => {
    if ((phase === "paused" || phase === "break_paused") && pausedAt && targetEndTime) {
      const { newTargetEndTimeMs, newTotalPausedSeconds } = resumeSessionTimer(
        targetEndTime,
        pausedAt,
        totalPausedSeconds
      );
      setTargetEndTime(newTargetEndTimeMs);
      setTotalPausedSeconds(newTotalPausedSeconds);
      setPausedAt(null);
      setPhase(phase === "paused" ? "working" : "break");
    }
  };

  // Reset timer
  const handleReset = () => {
    setPhase("idle");
    setTargetEndTime(null);
    setPausedAt(null);
    setTotalPausedSeconds(0);
    setRemainingSeconds(preset.workMinutes * 60);
    setFinishedNotice(null);
    localStorage.removeItem("mind_active_timer");
  };

  // Finish session early and log
  const handleFinishEarly = () => {
    const now = Date.now();
    let currentTotalPause = totalPausedSeconds;
    if (pausedAt) {
      currentTotalPause += Math.round((now - pausedAt) / 1000);
    }

    const startMs = sessionStartTime
      ? new Date(sessionStartTime).getTime()
      : now - (preset.workMinutes * 60 - remainingSeconds) * 1000;

    const activeSec = Math.max(60, Math.round((now - startMs) / 1000) - currentTotalPause);
    const activeMin = Math.max(1, Math.round(activeSec / 60));

    setLoggedActualMinutes(activeMin);
    setModalStatus(activeMin >= preset.workMinutes ? "completed" : "ended_early");
    setPhase("idle");
    setTargetEndTime(null);
    setPausedAt(null);
    localStorage.removeItem("mind_active_timer");
    setIsModalOpen(true);
  };

  // Switch mode
  const handleModeChange = (newMode: FocusMode) => {
    if (phase !== "idle") {
      if (!confirm("Changing modes will reset your current timer. Proceed?")) {
        return;
      }
    }
    setSelectedMode(newMode);
    setPhase("idle");
    setTargetEndTime(null);
    setPausedAt(null);
    setTotalPausedSeconds(0);
    setRemainingSeconds(FOCUS_PRESETS[newMode].workMinutes * 60);
    localStorage.removeItem("mind_active_timer");
  };

  // Dial progress metrics
  const elapsed = totalPhaseSeconds - remainingSeconds;
  const progressRatio = calculateSessionProgress(elapsed, totalPhaseSeconds);

  const isBreak = phase === "break" || phase === "break_paused";
  // Item 9: Dial ring uses Violet / Tertiary Purple (#A78BFA) for Mind color
  const ringColor = isBreak ? "stroke-secondary-cyan" : "stroke-tertiary-purple";

  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-6 lg:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col justify-between space-y-6">
      {/* Finished Banner Notification (Session finished at HH:MM) */}
      {finishedNotice && (
        <div className="p-3 rounded-2xl bg-tertiary-purple/15 border border-tertiary-purple/30 text-tertiary-purple flex items-center justify-between text-xs font-mono animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">{finishedNotice}</span>
          </div>
          <button
            onClick={() => setFinishedNotice(null)}
            className="text-text-muted hover:text-on-surface"
          >
            ✕
          </button>
        </div>
      )}

      {/* App Closed / Killed Recovery Prompt */}
      {recoveryPrompt && (
        <div className="p-4 rounded-2xl bg-surface-container-high border border-primary-ink/40 space-y-2 text-xs font-mono animate-fade-in">
          <div className="flex items-center gap-2 text-primary-ink font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>{locale === "ar" ? "جلسة مستعادة من جهازك" : "Recovered Session from this Device"}</span>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            {locale === "ar"
              ? `كان فيه جلسة تركيز مدتها ${recoveryPrompt.elapsedMinutes} دقيقة شغالة لما التطبيق اتقفل. تحب تسجلها ولا تتجاهلها؟`
              : `A ${recoveryPrompt.elapsedMinutes}m focus session was active when the app was closed. Would you like to log it or discard?`}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setLoggedActualMinutes(recoveryPrompt.elapsedMinutes);
                setSessionStartTime(recoveryPrompt.startedAt);
                setTaskCategory(recoveryPrompt.category);
                setTaskIntention(recoveryPrompt.taskName);
                setModalStatus("completed");
                setIsModalOpen(true);
                setRecoveryPrompt(null);
              }}
              className="px-4 py-1.5 rounded-xl bg-primary-ink text-on-primary font-bold hover:brightness-110 cursor-pointer"
            >
              {locale === "ar" ? "تسجيل الجلسة" : "Log Session"}
            </button>
            <button
              onClick={() => setRecoveryPrompt(null)}
              className="px-3 py-1.5 rounded-xl bg-surface-container border border-border-subtle text-text-muted hover:text-on-surface cursor-pointer"
            >
              {locale === "ar" ? "تجاهل" : "Discard"}
            </button>
          </div>
        </div>
      )}

      {/* Top Meta & Mode Selector (Stitch Layout) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-muted font-medium">
            <Brain className="w-3.5 h-3.5 text-tertiary-purple" />
            <span>{locale === "ar" ? "مدة الجلسة" : "Session duration"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-surface-container text-primary-ink font-medium">
              <Sparkles className="w-3 h-3 text-secondary-cyan" />
              <span>{locale === "ar" ? "الهدف 100% تركيز" : "Target 100% intensity"}</span>
            </span>
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setShowAudioControls(!showAudioControls)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs transition-colors cursor-pointer ${
                chimeEnabled
                  ? "bg-surface-container-high border-border-subtle text-on-surface"
                  : "bg-surface-container-low border-border-subtle text-text-muted"
              }`}
              title="Configure Chime & Haptics"
            >
              {chimeEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-tertiary-purple" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-text-muted" />
              )}
              <span>{chimeEnabled ? `${soundVolume}%` : locale === "ar" ? "صامت" : "Muted"}</span>
            </button>
          </div>
        </div>

        {/* Mode Preset Chips Row (Stitch Mode Pills) */}
        <div className="flex flex-wrap items-center gap-2">
          {(["sprint_50", "ultradian_90", "pomodoro_25"] as FocusMode[]).map((m) => {
            const p = FOCUS_PRESETS[m];
            const isSelected = selectedMode === m;
            const label =
              m === "sprint_50"
                ? (locale === "ar" ? "جلسة 50/10" : "Sprint 50/10")
                : m === "ultradian_90"
                ? (locale === "ar" ? "عمل عميق 90/20" : "Deep work 90/20")
                : (locale === "ar" ? "بومودورو 25/5" : "Pomodoro 25/5");
            return (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                type="button"
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary-ink text-on-primary shadow-xs font-semibold"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Audio & Vibration Panel */}
      {showAudioControls && (
        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-3 font-mono text-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">{locale === "ar" ? "صوت التنبيه:" : "Chime Sound:"}</span>
            <button
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-subtle cursor-pointer"
            >
              {chimeEnabled
                ? locale === "ar" ? "مفعّل" : "Enabled"
                : locale === "ar" ? "مكتوم" : "Muted"}
            </button>
          </div>

          {chimeEnabled && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-muted text-[11px]">{locale === "ar" ? "مستوى الصوت:" : "Volume:"}</span>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={soundVolume}
                onChange={(e) => setSoundVolume(Number(e.target.value))}
                className="flex-1 accent-tertiary-purple cursor-pointer"
              />
              <span className="text-on-surface text-[11px] w-8 text-right">
                {soundVolume}%
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Vibrate className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "الاهتزاز:" : "Vibration:"}</span>
            </div>
            <button
              onClick={() => setVibrationEnabled(!vibrationEnabled)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-border-subtle cursor-pointer"
            >
              {vibrationEnabled
                ? locale === "ar" ? "شغال" : "On"
                : locale === "ar" ? "مقفول" : "Off"}
            </button>
          </div>

          <div className="text-[10px] text-text-muted/80 flex items-start gap-1 pt-1 border-t border-border-subtle">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            <span>
              {locale === "ar"
                ? "التنبيه والاهتزاز بيشتغلوا جوه التطبيق. التنبيهات في الخلفية بتعتمد على إعدادات إدارة الطاقة بجهازك."
                : "Chime & vibration trigger in-app. Background alerts depend on OS power management."}
            </span>
          </div>
        </div>
      )}

      {/* Hero Timer Presentation (Stitch Tabular Timer) */}
      <div className="flex flex-col items-center justify-center py-8 my-2 rounded-2xl bg-surface-container-low/50 relative overflow-hidden border border-border-subtle/50">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-container-highest/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          {/* Phase indicator badge */}
          <div className="flex items-center gap-1.5 mb-2">
            {isBreak ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-secondary-cyan/15 text-secondary-cyan border border-secondary-cyan/30">
                <Coffee className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "استراحة تجديد طاقة" : "Renewal Break"}</span>
              </span>
            ) : phase === "paused" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 border border-amber-500/30">
                <Pause className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "متوقف مؤقتًا" : "Paused"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-tertiary-purple/15 text-tertiary-purple border border-tertiary-purple/30">
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {locale === "ar"
                    ? `تركيز ${
                        taskCategory === "Coding"
                          ? "برمجة"
                          : taskCategory === "Study"
                          ? "مذاكرة"
                          : taskCategory === "Reading"
                          ? "قراءة"
                          : taskCategory === "Writing"
                          ? "كتابة"
                          : taskCategory === "Deep Work"
                          ? "عمل عميق"
                          : taskCategory === "Admin"
                          ? "إداريات"
                          : taskCategory === "Planning"
                          ? "تخطيط"
                          : taskCategory
                      }`
                    : `${taskCategory} Focus`}
                </span>
              </span>
            )}
          </div>

          {/* Big Tabular Countdown Numbers */}
          <span className="text-[68px] lg:text-[88px] leading-none tracking-tight font-medium text-on-surface tabular-nums">
            {formatSeconds(remainingSeconds)}
          </span>

          <span className="text-xs text-text-muted mt-3">
            {phase === "idle"
              ? (locale === "ar" ? "فترة تركيز واحدة" : "Single block interval")
              : isBreak
              ? (locale === "ar" ? `${preset.breakMinutes} دقيقة استراحة` : `${preset.breakMinutes}m Break`)
              : (locale === "ar" ? `${Math.round(elapsed / 60)} دقيقة من ${preset.workMinutes} دقيقة` : `${Math.round(elapsed / 60)}m of ${preset.workMinutes}m`)}
          </span>
        </div>

        {/* Local Device Integrity Notice */}
        <div className="text-[10px] text-text-muted mt-3 flex items-center gap-1.5 opacity-70">
          <Clock className="w-3 h-3" />
          <span>
            {locale === "ar"
              ? "المؤقت شغال محليًا بدقة على جهازك"
              : "Timer runs locally on this device"}
          </span>
        </div>
      </div>

      {/* Config Form Fields (Stitch Subject & Intention) */}
      <div className="flex flex-col gap-3 font-mono">
        {/* Category selector row */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-text-muted font-medium">
              {locale === "ar" ? "الموضوع أو التصنيف" : "Subject"}
            </label>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {TASK_CATEGORIES.map((cat) => {
              const arCategoryMap: Record<string, string> = {
                Coding: "برمجة",
                Study: "مذاكرة",
                Reading: "قراءة",
                Writing: "كتابة",
                "Deep Work": "عمل عميق",
                Admin: "إداريات",
                Planning: "تخطيط",
              };
              const displayCat = locale === "ar" ? (arCategoryMap[cat] || cat) : cat;
              return (
                <button
                  key={cat}
                  onClick={() => setTaskCategory(cat)}
                  disabled={phase !== "idle"}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shrink-0 border ${
                    taskCategory === cat
                      ? "bg-tertiary-purple/15 text-tertiary-purple border-tertiary-purple/40 font-semibold"
                      : "bg-surface-container-low text-text-muted border-border-subtle hover:text-on-surface"
                  }`}
                >
                  {displayCat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Intention Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted font-medium">
            {locale === "ar" ? "هتخلّص إيه في الجلسة دي؟" : "What will you finish?"}
          </label>
          <div className="w-full h-11 bg-surface-container-low/40 border border-border-subtle rounded-xl flex items-center px-3 shadow-xs focus-within:bg-surface-container-lowest focus-within:border-tertiary-purple transition-colors">
            <input
              type="text"
              value={taskIntention}
              onChange={(e) => setTaskIntention(e.target.value)}
              placeholder={
                locale === "ar"
                  ? "مثال: حل شيت الفيزياء رقم 4، مراجعة المحاضرة..."
                  : "e.g., Problem set 4, review lecture notes..."
              }
              disabled={phase === "working" || phase === "break"}
              className="w-full bg-transparent text-xs text-on-surface placeholder:text-text-muted outline-none"
            />
          </div>
        </div>
      </div>

      {/* Action Button (Stitch prominent full-width CTA) */}
      <div className="pt-2 font-mono">
        {phase === "idle" && (
          <button
            onClick={handleStartWork}
            className="w-full h-12 bg-primary-ink text-on-primary hover:brightness-110 font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current text-on-primary" />
            <span>{locale === "ar" ? "ابدأ التركيز" : "Start focus"}</span>
          </button>
        )}

        {(phase === "working" || phase === "break") && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePause}
              className="h-12 bg-surface-container-high border border-border-subtle text-on-surface font-semibold text-sm rounded-xl hover:border-tertiary-purple active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>{locale === "ar" ? "إيقاف مؤقت" : "Pause"}</span>
            </button>
            <button
              onClick={handleFinishEarly}
              className="h-12 bg-primary-ink text-on-primary font-semibold text-sm rounded-xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{locale === "ar" ? "إنهاء الجلسة" : "Complete"}</span>
            </button>
          </div>
        )}

        {(phase === "paused" || phase === "break_paused") && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleResume}
              className="col-span-1 h-12 bg-primary-ink text-on-primary font-semibold text-sm rounded-xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current text-on-primary" />
              <span>{locale === "ar" ? "استئناف" : "Resume"}</span>
            </button>
            <button
              onClick={handleReset}
              className="h-12 bg-surface-container-high border border-border-subtle text-text-muted hover:text-on-surface rounded-xl active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer"
              title={locale === "ar" ? "إعادة ضبط" : "Reset Timer"}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleFinishEarly}
              className="h-12 bg-surface-container-high border border-border-subtle text-tertiary-purple font-semibold text-xs rounded-xl hover:border-tertiary-purple active:scale-[0.99] transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{locale === "ar" ? "تسجيل الوقت" : "Log Elapsed"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Post-Session Reflection Modal */}
      <SessionCompleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          onSessionLogged();
          handleReset();
        }}
        mode={selectedMode}
        plannedMinutes={preset.workMinutes}
        actualMinutes={loggedActualMinutes}
        pausedSeconds={totalPausedSeconds}
        status={modalStatus}
        initialCategory={taskCategory}
        initialTaskName={taskIntention}
        initialSubjectId={subjectId}
        startedAt={sessionStartTime || new Date().toISOString()}
        endedAt={new Date().toISOString()}
        userTimezone={userTimezone}
      />
    </div>
  );
}
