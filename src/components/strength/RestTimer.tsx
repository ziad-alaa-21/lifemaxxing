"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "life_rest_timer_end";

export function RestTimer({
  initialSeconds = 90,
  isOpen,
  onClose,
}: RestTimerProps) {
  const { locale } = useI18n();
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);

  // Target end timestamp in milliseconds
  const endTimeRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number>(initialSeconds);

  // Audio synthesis for completion chime
  const playBeep = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 chime
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // AudioContext requires user gesture or is muted
    }
  }, []);

  // Start timer from timestamp
  const startTimerWithDuration = useCallback(
    (seconds: number) => {
      const now = Date.now();
      const targetEnd = now + seconds * 1000;
      endTimeRef.current = targetEnd;
      pausedRemainingRef.current = seconds;
      setTotalSeconds(seconds);
      setSecondsLeft(seconds);
      setIsRunning(true);
      try {
        localStorage.setItem(STORAGE_KEY, targetEnd.toString());
      } catch {}
    },
    []
  );

  // Initialize or re-open
  useEffect(() => {
    if (isOpen) {
      startTimerWithDuration(initialSeconds);
    } else {
      endTimeRef.current = null;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, [isOpen, initialSeconds, startTimerWithDuration]);

  // Main countdown tick loop driven by wall-clock timestamps
  useEffect(() => {
    if (!isRunning || !isOpen || !endTimeRef.current) return;

    const tick = () => {
      if (!endTimeRef.current) return;
      const now = Date.now();
      const diffMs = endTimeRef.current - now;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        setIsRunning(false);
        endTimeRef.current = null;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        playBeep();
      }
    };

    tick();
    const interval = setInterval(tick, 250); // fast interval to avoid second jumps

    // Handle visibility changes when phone screen wakes up
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, isOpen, playBeep]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent =
    totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  const togglePause = () => {
    if (isRunning) {
      // Pause: save remaining seconds and clear end timestamp
      pausedRemainingRef.current = secondsLeft;
      endTimeRef.current = null;
      setIsRunning(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    } else {
      // Resume: set new target end from paused remaining
      const targetEnd = Date.now() + pausedRemainingRef.current * 1000;
      endTimeRef.current = targetEnd;
      setIsRunning(true);
      try {
        localStorage.setItem(STORAGE_KEY, targetEnd.toString());
      } catch {}
    }
  };

  const handleReset = () => {
    startTimerWithDuration(totalSeconds);
  };

  const setPreset = (s: number) => {
    startTimerWithDuration(s);
  };

  return (
    <div className={`fixed bottom-24 lg:bottom-6 z-50 w-80 bg-surface-container border border-secondary-cyan/30 rounded-2xl p-4 shadow-2xl animate-slide-up ${locale === "ar" ? "left-4" : "right-4"}`}>
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-secondary-cyan" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
            {locale === "ar" ? "فترة الراحة" : "Rest Interval"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md hover:bg-surface-container-high flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timer Display */}
      <div className="flex items-center justify-between my-2 px-2" dir="ltr">
        <div className="text-3xl font-bold font-mono text-secondary-cyan tracking-tight">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePause}
            className="w-8 h-8 rounded-lg bg-secondary-cyan/15 hover:bg-secondary-cyan/25 text-secondary-cyan flex items-center justify-center transition-colors cursor-pointer"
            title={isRunning ? (locale === "ar" ? "إيقاف مؤقت" : "Pause") : (locale === "ar" ? "استئناف" : "Resume")}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleReset}
            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
            title={locale === "ar" ? "إعادة تعيين" : "Reset"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden my-3">
        <div
          className="h-full bg-secondary-cyan transition-all duration-300 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {[45, 60, 90, 120].map((s) => (
          <button
            key={s}
            onClick={() => setPreset(s)}
            className={`py-1 text-[11px] font-mono rounded-md border transition-all cursor-pointer ${
              totalSeconds === s
                ? "bg-secondary-cyan/15 text-secondary-cyan border-secondary-cyan/30 font-bold"
                : "bg-surface-container-low text-text-muted border-border-subtle hover:text-on-surface"
            }`}
          >
            {s}{locale === "ar" ? "ث" : "s"}
          </button>
        ))}
      </div>
    </div>
  );
}
