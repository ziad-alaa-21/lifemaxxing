"use client";

import React from "react";
import { Pillar } from "@/lib/types";
import {
  Flame,
  Dumbbell,
  Brain,
  GraduationCap,
  Settings,
  Plus,
} from "lucide-react";

interface BottomTabBarProps {
  activePillar: Pillar;
  setActivePillar: (pillar: Pillar) => void;
  onOpenQuickAction: () => void;
}

export function BottomTabBar({
  activePillar,
  setActivePillar,
  onOpenQuickAction,
}: BottomTabBarProps) {
  const tabs: { id: Pillar; label: string; icon: React.ElementType }[] = [
    { id: "today", label: "Today", icon: Flame },
    { id: "body", label: "Body", icon: Dumbbell },
    { id: "mind", label: "Mind", icon: Brain },
    { id: "school", label: "School", icon: GraduationCap },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-border-subtle pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 relative">
        {/* Tab 1: Today */}
        <button
          onClick={() => setActivePillar("today")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            activePillar === "today"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <Flame className={`w-5 h-5 mb-1 ${activePillar === "today" ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] tracking-tight">Today</span>
        </button>

        {/* Tab 2: Body */}
        <button
          onClick={() => setActivePillar("body")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            activePillar === "body"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <Dumbbell className={`w-5 h-5 mb-1 ${activePillar === "body" ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] tracking-tight">Body</span>
        </button>

        {/* Center Floating Quick Action Button (+) */}
        <div className="relative -top-3 flex items-center justify-center px-1">
          <button
            onClick={onOpenQuickAction}
            aria-label="Quick Action"
            className="w-12 h-12 rounded-full bg-primary-lime text-surface flex items-center justify-center shadow-[0_0_20px_rgba(198,255,61,0.45)] hover:scale-105 active:scale-95 transition-transform border-2 border-surface cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[3] text-surface" />
          </button>
        </div>

        {/* Tab 3: Mind */}
        <button
          onClick={() => setActivePillar("mind")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            activePillar === "mind"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <Brain className={`w-5 h-5 mb-1 ${activePillar === "mind" ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] tracking-tight">Mind</span>
        </button>

        {/* Tab 4: School */}
        <button
          onClick={() => setActivePillar("school")}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            activePillar === "school"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <GraduationCap className={`w-5 h-5 mb-1 ${activePillar === "school" ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] tracking-tight">School</span>
        </button>
      </div>
    </div>
  );
}
