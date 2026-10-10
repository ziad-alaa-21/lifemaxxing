"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onOpenQuickAction: () => void;
}

const titles: Record<string, { title: string; subtitle: string }> = {
  "/today": { title: "Today", subtitle: "Daily protocol and focus" },
  "/body": { title: "Body", subtitle: "Strength engine and lifts" },
  "/mind": { title: "Mind", subtitle: "Cognitive readiness and sleep" },
  "/school": { title: "School", subtitle: "Subjects, grades and deadlines" },
  "/settings": { title: "Settings", subtitle: "Account preferences and system info" },
};

export function Header({ onOpenQuickAction }: HeaderProps) {
  const pathname = usePathname();
  const meta = titles[pathname] || { title: "Life", subtitle: "Personal Architecture" };

  return (
    <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-xl border-b border-border-subtle pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Title & context */}
        <div>
          <h1 className="text-base sm:text-lg font-bold font-mono tracking-tight text-on-surface">
            {meta.title}
          </h1>
          <p className="text-xs text-text-muted hidden sm:block">
            {meta.subtitle}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Fast Action trigger */}
          <button
            onClick={onOpenQuickAction}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-lime text-surface text-xs font-semibold uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.25)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Fast Action</span>
          </button>
        </div>
      </div>
    </header>
  );
}
