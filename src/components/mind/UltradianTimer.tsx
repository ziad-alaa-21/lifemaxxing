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
} from "lucide-react";
import {
  FocusMode,
  FOCUS_PRESETS,
  calculateRemainingSeconds,
  formatSeconds,
  calculateSessionProgress,
  playHarmonicChime,
} from "@/lib/mind";
import { SessionCompleteModal } from "./SessionCompleteModal";

interface UltradianTimerProps {
  onSessionLogged: () => void;
  userTimezone: string;
  defaultMode?: FocusMode;
  chimeEnabledDefault?: boolean;
}

type TimerPhase = "idle" | "working" | "work_paused" | "break" | "break_paused";

export function UltradianTimer({
  onSessionLogged,
  userTimezone,
  defaultMode = "ultradian_90",
  chimeEnabledDefault = true,
}: UltradianTimerProps) {
  const [selectedMode, setSelectedMode] = useState<FocusMode>(defaultMode);
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [taskIntention, setTaskIntention] = useState("");
  const [chimeEnabled, setChimeEnabled] = useState(chimeEnabledDefault);

  // Time tracking
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    FOCUS_PRESETS[defaultMode].workMinutes * 60
  );
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  // Completed work time for logging
  const [loggedWorkMinutes, setLoggedWorkMinutes] = useState(0);
  const [loggedBreakMinutes, setLoggedBreakMinutes] = useState(0);

  // Completion modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const preset = FOCUS_PRESETS[selectedMode];
  const totalPhaseSeconds =
    phase === "break" || phase === "break_paused"
      ? preset.breakMinutes * 60
      : preset.workMinutes * 60;

  // Restore active timer from localStorage if page was refreshed
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mind_active_timer");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.targetEndTime && parsed.phase) {
          const rem = calculateRemainingSeconds(parsed.targetEndTime);
          if (rem > 0) {
            setPhase(parsed.phase);
            setSelectedMode(parsed.mode || "ultradian_90");
            setTargetEndTime(parsed.targetEndTime);
            setRemainingSeconds(rem);
            setTaskIntention(parsed.taskIntention || "");
            setSessionStartTime(parsed.sessionStartTime || new Date().toISOString());
          } else {
            localStorage.removeItem("mind_active_timer");
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse saved timer state:", e);
    }
  }, []);

  // Update localStorage whenever state changes
  useEffect(() => {
    if ((phase === "working" || phase === "break") && targetEndTime) {
      localStorage.setItem(
        "mind_active_timer",
        JSON.stringify({
          phase,
          mode: selectedMode,
          targetEndTime,
          taskIntention,
          sessionStartTime,
        })
      );
    } else {
      localStorage.removeItem("mind_active_timer");
    }
  }, [phase, targetEndTime, selectedMode, taskIntention, sessionStartTime]);

  // Main countdown tick loop (Wall-clock derived)
  useEffect(() => {
    if (phase !== "working" && phase !== "break") return;
    if (!targetEndTime) return;

    const interval = setInterval(() => {
      const rem = calculateRemainingSeconds(targetEndTime);
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
    if (phase === "working") {
      if (chimeEnabled) playHarmonicChime("work_complete");
      setLoggedWorkMinutes(preset.workMinutes);

      // Transition to recovery break
      const breakTarget = Date.now() + preset.breakMinutes * 60 * 1000;
      setTargetEndTime(breakTarget);
      setRemainingSeconds(preset.breakMinutes * 60);
      setPhase("break");
    } else if (phase === "break") {
      if (chimeEnabled) playHarmonicChime("break_complete");
      setLoggedBreakMinutes(preset.breakMinutes);
      setPhase("idle");
      setTargetEndTime(null);
      setRemainingSeconds(preset.workMinutes * 60);

      // Open reflection modal
      setIsModalOpen(true);
    }
  }, [phase, chimeEnabled, preset]);

  // Start work session
  const handleStartWork = () => {
    const start = new Date().toISOString();
    setSessionStartTime(start);
    const target = Date.now() + preset.workMinutes * 60 * 1000;
    setTargetEndTime(target);
    setRemainingSeconds(preset.workMinutes * 60);
    setPhase("working");
  };

  // Pause session
  const handlePause = () => {
    if (phase === "working") setPhase("work_paused");
    if (phase === "break") setPhase("break_paused");
  };

  // Resume session
  const handleResume = () => {
    const newTarget = Date.now() + remainingSeconds * 1000;
    setTargetEndTime(newTarget);
    if (phase === "work_paused") setPhase("working");
    if (phase === "break_paused") setPhase("break");
  };

  // Reset timer
  const handleReset = () => {
    setPhase("idle");
    setTargetEndTime(null);
    setRemainingSeconds(preset.workMinutes * 60);
    localStorage.removeItem("mind_active_timer");
  };

  // Finish session early and log reflection
  const handleFinishEarly = () => {
    const elapsedSec = totalPhaseSeconds - remainingSeconds;
    const elapsedMin = Math.max(1, Math.round(elapsedSec / 60));
    setLoggedWorkMinutes(elapsedMin);
    setLoggedBreakMinutes(0);
    setPhase("idle");
    setTargetEndTime(null);
    setRemainingSeconds(preset.workMinutes * 60);
    localStorage.removeItem("mind_active_timer");
    setIsModalOpen(true);
  };

  // Change preset mode
  const handleModeChange = (newMode: FocusMode) => {
    if (phase !== "idle") {
      if (!confirm("Changing modes will reset your current timer. Proceed?")) {
        return;
      }
    }
    setSelectedMode(newMode);
    setPhase("idle");
    setTargetEndTime(null);
    setRemainingSeconds(FOCUS_PRESETS[newMode].workMinutes * 60);
    localStorage.removeItem("mind_active_timer");
  };

  // Progress metrics for SVG dial
  const elapsed = totalPhaseSeconds - remainingSeconds;
  const progressRatio = calculateSessionProgress(elapsed, totalPhaseSeconds);
  const strokeDashoffset = 100 - progressRatio * 100;

  const isBreak = phase === "break" || phase === "break_paused";
  const ringColor = isBreak ? "stroke-tertiary-purple" : "stroke-primary-lime";
  const glowColor = isBreak ? "rgba(167,139,250,0.3)" : "rgba(198,255,61,0.3)";

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-container border border-border-subtle relative overflow-hidden space-y-6">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{
          backgroundColor:
            phase === "working"
              ? "rgba(198,255,61,0.06)"
              : isBreak
              ? "rgba(167,139,250,0.08)"
              : "transparent",
        }}
      />

      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono relative z-10">
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-2xl border border-border-subtle text-xs">
          {(["ultradian_90", "sprint_50", "pomodoro_25"] as FocusMode[]).map((m) => {
            const p = FOCUS_PRESETS[m];
            const isSelected = selectedMode === m;
            return (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-tertiary-purple text-charcoal-dark shadow-[0_0_12px_rgba(167,139,250,0.3)]"
                    : "text-text-muted hover:text-on-surface"
                }`}
              >
                {p.badge}
              </button>
            );
          })}
        </div>

        {/* Audio Chime Mute Toggle */}
        <button
          onClick={() => setChimeEnabled(!chimeEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
            chimeEnabled
              ? "bg-surface-container-high border-border-subtle text-on-surface"
              : "bg-surface-container-lowest border-border-subtle text-text-muted"
          }`}
          title={chimeEnabled ? "Chime enabled" : "Chime muted"}
        >
          {chimeEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-secondary-cyan" />
              <span>Chime On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-text-muted" />
              <span>Chime Muted</span>
            </>
          )}
        </button>
      </div>

      {/* Task Intention Input */}
      <div className="relative z-10 font-mono">
        <input
          type="text"
          value={taskIntention}
          onChange={(e) => setTaskIntention(e.target.value)}
          placeholder="What are you focusing on this cycle?"
          disabled={phase === "working" || phase === "break"}
          className="w-full text-center px-4 py-2 text-sm bg-transparent border-b border-border-subtle text-on-surface placeholder:text-text-muted/60 focus:outline-none focus:border-tertiary-purple transition-colors"
        />
      </div>

      {/* Circular Progress SVG Dial */}
      <div className="relative z-10 flex flex-col items-center justify-center py-4">
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              className="stroke-surface-container-high"
              strokeWidth="5"
              fill="transparent"
              r="44"
              cx="50"
              cy="50"
            />
            {/* Progress Bar */}
            <circle
              className={`${ringColor} transition-all duration-500`}
              strokeWidth="6"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 * (1 - progressRatio)}
              strokeLinecap="round"
              fill="transparent"
              r="44"
              cx="50"
              cy="50"
            />
          </svg>

          {/* Central Time Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
            {/* Phase Badge */}
            <div className="flex items-center gap-1.5 mb-1">
              {isBreak ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary-purple/20 text-tertiary-purple border border-tertiary-purple/30">
                  <Coffee className="w-3 h-3" />
                  <span>Renewal Break</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-lime/10 text-primary-lime border border-primary-lime/30">
                  <Flame className="w-3 h-3" />
                  <span>Deep Focus</span>
                </span>
              )}
            </div>

            {/* Countdown Numbers */}
            <div className="text-5xl font-extrabold text-on-surface tracking-tight">
              {formatSeconds(remainingSeconds)}
            </div>

            {/* Subtext info */}
            <div className="text-xs text-text-muted mt-1.5">
              {phase === "idle"
                ? `${preset.name}`
                : isBreak
                ? `${preset.breakMinutes}m Rest Interval`
                : `${Math.round(elapsed / 60)}m of ${preset.workMinutes}m`}
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="relative z-10 flex items-center justify-center gap-3 font-mono">
        {phase === "idle" && (
          <button
            onClick={handleStartWork}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm bg-primary-lime text-charcoal-dark shadow-[0_0_20px_rgba(198,255,61,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Deep Work</span>
          </button>
        )}

        {(phase === "working" || phase === "break") && (
          <>
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-surface-container-high border border-border-subtle text-on-surface hover:border-secondary-cyan active:scale-95 transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>

            <button
              onClick={handleFinishEarly}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-tertiary-purple text-charcoal-dark shadow-[0_0_15px_rgba(167,139,250,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete</span>
            </button>
          </>
        )}

        {(phase === "work_paused" || phase === "break_paused") && (
          <>
            <button
              onClick={handleResume}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-primary-lime text-charcoal-dark shadow-[0_0_15px_rgba(198,255,61,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </button>

            <button
              onClick={handleReset}
              className="p-3.5 rounded-2xl bg-surface-container-high border border-border-subtle text-text-muted hover:text-on-surface active:scale-95 transition-all cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleFinishEarly}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-tertiary-purple text-charcoal-dark shadow-[0_0_15px_rgba(167,139,250,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Log Session</span>
            </button>
          </>
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
        actualWorkMinutes={loggedWorkMinutes}
        actualBreakMinutes={loggedBreakMinutes}
        initialTaskName={taskIntention}
        startedAt={sessionStartTime || new Date().toISOString()}
        userTimezone={userTimezone}
      />
    </div>
  );
}
