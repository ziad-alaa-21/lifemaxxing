"use client";

import React, { useEffect, useState } from "react";
import { Timer, Play, Pause, RotateCcw, X, Volume2 } from "lucide-react";

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function RestTimer({
  initialSeconds = 90,
  isOpen,
  onClose,
}: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);

  // Play a soft synthesized audio beep on timer complete
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // AudioContext not allowed without user gesture
    }
  };

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds, isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  const setPreset = (s: number) => {
    setTotalSeconds(s);
    setSecondsLeft(s);
    setIsRunning(true);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-4 z-50 w-80 bg-surface-container border border-ice-blue/40 rounded-2xl p-4 shadow-2xl animate-slide-up backdrop-blur-xl">
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-ice-blue" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
            Rest Interval
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
      <div className="flex items-center justify-between my-2 px-2">
        <div className="text-3xl font-bold font-mono text-ice-blue tracking-tight">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="w-8 h-8 rounded-lg bg-ice-blue/15 hover:bg-ice-blue/25 text-ice-blue flex items-center justify-center transition-colors cursor-pointer"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setSecondsLeft(totalSeconds);
              setIsRunning(true);
            }}
            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden my-3">
        <div
          className="h-full bg-ice-blue transition-all duration-500 ease-linear rounded-full"
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
                ? "bg-ice-blue/20 text-ice-blue border-ice-blue/40 font-bold"
                : "bg-surface-container-low text-text-muted border-border-subtle hover:text-on-surface"
            }`}
          >
            {s}s
          </button>
        ))}
      </div>
    </div>
  );
}
