"use client";

import React from "react";
import { Brain, Moon, Activity, Zap, CheckCircle2 } from "lucide-react";

export function MindView() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary-purple/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple shadow-[0_0_16px_rgba(167,139,250,0.2)]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-on-surface">
                  Cognitive Architecture & Recovery
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-tertiary-purple/10 text-tertiary-purple border border-tertiary-purple/20">
                  PILLAR 2
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Autonomic sleep telemetry, focus session pacing, and mental readiness
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-surface-container-high border border-border-subtle text-tertiary-purple">
              Stage 4 Architecture
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-surface-container rounded-xl border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-mono uppercase">Sleep Quality</span>
            <Moon className="w-4 h-4 text-tertiary-purple" />
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface">88%</div>
          <div className="text-[11px] text-on-surface-variant">
            Deep restorative sleep index
          </div>
        </div>

        <div className="p-4 bg-surface-container rounded-xl border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-mono uppercase">Autonomic Balance</span>
            <Activity className="w-4 h-4 text-emerald-success" />
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface">Optimal</div>
          <div className="text-[11px] text-on-surface-variant">
            Sympathetic vs parasympathetic equilibrium
          </div>
        </div>

        <div className="p-4 bg-surface-container rounded-xl border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-mono uppercase">Focus Capacity</span>
            <Zap className="w-4 h-4 text-primary-lime" />
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface">4.5 hrs</div>
          <div className="text-[11px] text-on-surface-variant">
            Target deep work endurance window
          </div>
        </div>
      </div>

      {/* Stage Roadmap Card */}
      <div className="p-5 bg-surface-container-low border border-border-subtle rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            Stage 4 Planned Capabilities
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-on-surface-variant">
          <div className="flex items-start gap-2 p-3 bg-surface-container rounded-xl border border-border-subtle">
            <CheckCircle2 className="w-4 h-4 text-tertiary-purple shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-on-surface">Sleep Telemetry Logs</div>
              <div className="text-text-muted text-[11px]">Database table wired to daily autonomic check-ins</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-surface-container rounded-xl border border-border-subtle">
            <CheckCircle2 className="w-4 h-4 text-tertiary-purple shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-on-surface">Neuro Focus Interval Timer</div>
              <div className="text-text-muted text-[11px]">90-min ultradian rhythm tracker with rest cues</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
