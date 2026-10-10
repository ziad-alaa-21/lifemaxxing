"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { X, Dumbbell, GraduationCap, Brain, Settings } from "lucide-react";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionModal({ isOpen, onClose }: QuickActionModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const actions = [
    {
      title: "View Strength & Lifts",
      desc: "Inspect canonical lifts and upcoming workout logger",
      href: "/body",
      icon: Dumbbell,
      accent: "text-secondary-cyan border-secondary-cyan/30 bg-secondary-cyan/10",
    },
    {
      title: "School & Subjects",
      desc: "Manage subjects, grades, deadlines and mistake log",
      href: "/school",
      icon: GraduationCap,
      accent: "text-primary-lime border-primary-lime/30 bg-primary-lime/10",
    },
    {
      title: "Mind & Sleep",
      desc: "Cognitive readiness and sleep architecture",
      href: "/mind",
      icon: Brain,
      accent: "text-tertiary-purple border-tertiary-purple/30 bg-tertiary-purple/10",
    },
    {
      title: "Account Settings",
      desc: "Inspect user account and system configuration",
      href: "/settings",
      icon: Settings,
      accent: "text-amber-core border-amber-core/30 bg-amber-core/10",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg-darkest/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-surface-container border border-border-subtle rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
          <div>
            <h2 className="text-base font-bold font-mono text-on-surface">
              Fast Navigation
            </h2>
            <p className="text-xs text-text-muted">Jump to section</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.href}
                onClick={() => {
                  router.push(act.href);
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
