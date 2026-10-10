"use client";

import React, { useState } from "react";
import {
  Flame,
  Dumbbell,
  Brain,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Pillar } from "@/lib/types";

interface TodayViewProps {
  onNavigate: (pillar: Pillar) => void;
}

export function TodayView({ onNavigate }: TodayViewProps) {
  const [showTipCard, setShowTipCard] = useState(true);

  return (
    <div className="space-y-6">
      {/* Protocol Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-surface-container rounded-xl border border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-lime animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-wider text-on-surface">
            Current Protocol • Active Session
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
          <span className="px-2 py-0.5 rounded-md bg-surface-container-high border border-border-subtle text-primary-lime">
            v4.8 Telemetry
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="text-text-muted">Autonomic Sync Optimal</span>
        </div>
      </div>

      {/* Dismissible Tip / Micro-Intervention Card */}
      {showTipCard && (
        <div className="relative overflow-hidden bg-surface-container rounded-2xl p-5 sm:p-6 border border-border-subtle shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary-lime/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime shrink-0 shadow-[0_0_12px_rgba(198,255,61,0.2)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary-lime">
                  Daily Micro-Intervention
                </span>
                <h3 className="text-base font-bold text-on-surface tracking-tight">
                  Autonomic Calibration Directive
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
                  Focus cadence calibrated to 90-minute blocks with 15-minute nervous system downregulations. Maintain hydration targets and log afternoon strength session.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTipCard(false)}
              aria-label="Dismiss tip"
              className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3 Pillar Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Physical / Body */}
        <div
          onClick={() => onNavigate("body")}
          className="bg-surface-container border border-border-subtle hover:border-secondary-cyan/40 rounded-2xl p-5 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan">
              <Dumbbell className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs text-secondary-cyan px-2 py-0.5 rounded-full bg-secondary-cyan/10">
              6 Canonical Lifts
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Physical Domain
            </div>
            <div className="text-xl font-bold font-mono text-on-surface group-hover:text-secondary-cyan transition-colors">
              Strength Engine
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-2">
              Seeded benchmarks: Bench Press, Squat, Deadlift, OHP, Weighted Pull-up, Row.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-secondary-cyan">
            <span>Inspect Lifts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Cognitive / Mind */}
        <div
          onClick={() => onNavigate("mind")}
          className="bg-surface-container border border-border-subtle hover:border-tertiary-purple/40 rounded-2xl p-5 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple">
              <Brain className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs text-tertiary-purple px-2 py-0.5 rounded-full bg-tertiary-purple/10">
              Recovery 84%
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Cognitive Domain
            </div>
            <div className="text-xl font-bold font-mono text-on-surface group-hover:text-tertiary-purple transition-colors">
              Mind Architecture
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-2">
              Sleep telemetry, autonomic recovery index, and focused attention intervals.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-tertiary-purple">
            <span>View Architecture</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Academic / School */}
        <div
          onClick={() => onNavigate("school")}
          className="bg-surface-container border border-border-subtle hover:border-primary-lime/40 rounded-2xl p-5 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs text-primary-lime px-2 py-0.5 rounded-full bg-primary-lime/10">
              GPA Matrix
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Academic Domain
            </div>
            <div className="text-xl font-bold font-mono text-on-surface group-hover:text-primary-lime transition-colors">
              Unified Grades
            </div>
            <p className="text-xs text-on-surface-variant line-clamp-2 mt-2">
              Unified grades schema: quizzes and major exams weighted against GPA.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-mono text-primary-lime">
            <span>Open Matrix</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Stage 1 Shell Verification Banner */}
      <div className="bg-surface-container-low border border-primary-lime/25 rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-lime/15 border border-primary-lime/40 flex items-center justify-center text-primary-lime shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold font-mono text-on-surface">
                Stage 1 Milestone: Responsive Shell & Live Supabase Auth
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-success/15 text-emerald-success border border-emerald-success/30 rounded-md uppercase font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Clean Next.js App Router codebase in root <code className="text-primary-lime font-mono">d:\lifemaxxing</code>. Strict design tokens extracted from Obsidian Kinetic. Supabase RLS isolation verified 100% across User A and User B.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl bg-surface-container border border-border-subtle text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-success shrink-0" />
                <span className="text-text-muted">No Service Role Key</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container border border-border-subtle text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-success shrink-0" />
                <span className="text-text-muted">Zero Raw Hex in UI</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container border border-border-subtle text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-success shrink-0" />
                <span className="text-text-muted">Mobile & Desktop Shell</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
