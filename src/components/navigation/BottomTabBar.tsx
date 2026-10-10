"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Dumbbell,
  Brain,
  GraduationCap,
  Settings,
  Plus,
} from "lucide-react";

interface BottomTabBarProps {
  onOpenQuickAction: () => void;
}

export function BottomTabBar({ onOpenQuickAction }: BottomTabBarProps) {
  const pathname = usePathname();

  const tabs = [
    { href: "/today", label: "Today", icon: Flame },
    { href: "/body", label: "Body", icon: Dumbbell },
    { href: "/mind", label: "Mind", icon: Brain },
    { href: "/school", label: "School", icon: GraduationCap },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-border-subtle pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 relative">
        {/* Tab 1: Today */}
        <Link
          href="/today"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            pathname === "/today"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <Flame
            className={`w-5 h-5 mb-1 ${
              pathname === "/today" ? "stroke-[2.5]" : "stroke-2"
            }`}
          />
          <span className="text-[10px] tracking-tight">Today</span>
        </Link>

        {/* Tab 2: Body */}
        <Link
          href="/body"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            pathname === "/body"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <Dumbbell
            className={`w-5 h-5 mb-1 ${
              pathname === "/body" ? "stroke-[2.5]" : "stroke-2"
            }`}
          />
          <span className="text-[10px] tracking-tight">Body</span>
        </Link>

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
        <Link
          href="/mind"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            pathname === "/mind"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <Brain
            className={`w-5 h-5 mb-1 ${
              pathname === "/mind" ? "stroke-[2.5]" : "stroke-2"
            }`}
          />
          <span className="text-[10px] tracking-tight">Mind</span>
        </Link>

        {/* Tab 4: School */}
        <Link
          href="/school"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
            pathname === "/school"
              ? "text-primary-lime font-semibold"
              : "text-text-muted hover:text-on-surface"
          }`}
        >
          <GraduationCap
            className={`w-5 h-5 mb-1 ${
              pathname === "/school" ? "stroke-[2.5]" : "stroke-2"
            }`}
          />
          <span className="text-[10px] tracking-tight">School</span>
        </Link>
      </div>
    </div>
  );
}
