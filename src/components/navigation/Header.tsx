"use client";

import React from "react";
import { Pillar } from "@/lib/types";
import { Plus, ShieldCheck, Sparkles, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  activePillar: Pillar;
  setActivePillar: (pillar: Pillar) => void;
  user: User | null;
  onOpenQuickAction: () => void;
}

const titles: Record<Pillar, { title: string; subtitle: string }> = {
  today: { title: "Today Protocol", subtitle: "Autonomic Telemetry & Daily Directives" },
  body: { title: "Body & Strength Engine", subtitle: "Somatic Progression & Ranked Lifts" },
  mind: { title: "Cognitive Architecture", subtitle: "Autonomic Recovery & Neuro Focus" },
  school: { title: "Academic Matrix", subtitle: "Subjects, Assessments & Target GPA" },
  settings: { title: "System Configuration", subtitle: "Security, RLS Policies & Supabase Node" },
};

export function Header({
  activePillar,
  setActivePillar,
  user,
  onOpenQuickAction,
}: HeaderProps) {
  const meta = titles[activePillar] || titles.today;

  return (
    <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-xl border-b border-border-subtle pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Title & context */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold font-mono tracking-tight text-on-surface">
              {meta.title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high border border-border-subtle text-[11px] font-mono text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-lime animate-pulse" />
              v4.8 Telemetry
            </span>
          </div>
          <p className="text-xs text-text-muted hidden sm:block">
            {meta.subtitle}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Action Button (Desktop & Tablet) */}
          <button
            onClick={onOpenQuickAction}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary-lime text-surface text-xs font-semibold uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.25)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Fast Log</span>
          </button>

          {/* RLS Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container border border-border-subtle text-xs font-mono text-on-surface-variant">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-success" />
            <span className="hidden md:inline">RLS Protected</span>
          </div>

          {/* Mobile Profile Switcher */}
          <button
            onClick={() => setActivePillar("settings")}
            className="lg:hidden w-8 h-8 rounded-full bg-surface-container border border-border-medium flex items-center justify-center text-primary-lime hover:border-primary-lime transition-colors"
            aria-label="Account Settings"
          >
            <UserIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
