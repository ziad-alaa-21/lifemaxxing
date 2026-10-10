"use client";

import React from "react";
import { Pillar } from "@/lib/types";
import { X, Dumbbell, GraduationCap, Brain, Activity, Shield } from "lucide-react";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (pillar: Pillar) => void;
}

export function QuickActionModal({
  isOpen,
  onClose,
  onSelectAction,
}: QuickActionModalProps) {
  if (!isOpen) return null;

  const actions = [
    {
      title: "Log Workout Session",
      desc: "Record sets, reps, and compute Epley 1RM progression",
      pillar: "body" as Pillar,
      icon: Dumbbell,
      accent: "text-secondary-cyan border-secondary-cyan/30 bg-secondary-cyan/10",
    },
    {
      title: "Record Academic Grade",
      desc: "Log quiz or exam score against target GPA",
      pillar: "school" as Pillar,
      icon: GraduationCap,
      accent: "text-primary-lime border-primary-lime/30 bg-primary-lime/10",
    },
    {
      title: "Cognitive Check-in",
      desc: "Evaluate autonomic recovery & mental clarity",
      pillar: "mind" as Pillar,
      icon: Brain,
      accent: "text-tertiary-purple border-tertiary-purple/30 bg-tertiary-purple/10",
    },
    {
      title: "System & RLS Telemetry",
      desc: "Inspect Supabase user token & security boundary",
      pillar: "settings" as Pillar,
      icon: Shield,
      accent: "text-amber-core border-amber-core/30 bg-amber-core/10",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg-darkest/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-surface-container border border-border-subtle rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl relative animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
          <div>
            <h2 className="text-base font-bold font-mono text-on-surface">
              Fast Protocol Log
            </h2>
            <p className="text-xs text-text-muted">Select an action vector</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.pillar}
                onClick={() => {
                  onSelectAction(act.pillar);
                  onClose();
                }}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle hover:border-primary-lime/40 transition-all text-left cursor-pointer group"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${act.accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-on-surface group-hover:text-primary-lime transition-colors">
                    {act.title}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 line-clamp-1">
                    {act.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
