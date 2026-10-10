"use client";

import React from "react";
import { Brain, Moon, Clock } from "lucide-react";

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
              <h2 className="text-lg font-bold font-mono text-on-surface">
                Mind & Sleep Architecture
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Cognitive readiness, sleep telemetry, and focus intervals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Empty State / Coming Soon */}
      <div className="p-8 sm:p-12 bg-surface-container rounded-2xl border border-border-subtle text-center space-y-4 max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-tertiary-purple/10 border border-tertiary-purple/20 flex items-center justify-center text-tertiary-purple mx-auto">
          <Moon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold font-mono text-on-surface">
            Coming Soon
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Sleep telemetry check-ins and ultradian focus intervals will be built in an upcoming stage. No hardcoded mock telemetry is presented.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-mono text-text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span>Scheduled after Strength & PWA stages</span>
        </div>
      </div>
    </div>
  );
}
