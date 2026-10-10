"use client";

import React from "react";
import { Pillar } from "@/lib/types";
import {
  Flame,
  Dumbbell,
  Brain,
  GraduationCap,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface SidebarProps {
  activePillar: Pillar;
  setActivePillar: (pillar: Pillar) => void;
  user: User | null;
  onSignOut: () => void;
}

const navItems: { id: Pillar; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "today", label: "Today Telemetry", icon: Flame, badge: "LIVE" },
  { id: "body", label: "Body & Lifts", icon: Dumbbell, badge: "6 Lifts" },
  { id: "mind", label: "Mind Architecture", icon: Brain },
  { id: "school", label: "School & GPA", icon: GraduationCap },
  { id: "settings", label: "Settings & System", icon: Settings },
];

export function Sidebar({
  activePillar,
  setActivePillar,
  user,
  onSignOut,
}: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 h-screen sticky top-0 bg-surface border-r border-border-subtle z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container border border-primary-lime/40 flex items-center justify-center text-primary-lime shadow-[0_0_12px_rgba(198,255,61,0.2)]">
            <Zap className="w-4 h-4 fill-primary-lime/20" />
          </div>
          <div>
            <span className="font-mono text-sm font-bold tracking-tight text-on-surface">
              LIFE • MAXXING
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-lime animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Obsidian Kinetic
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry pill */}
      <div className="px-5 py-4">
        <div className="p-3 bg-surface-container rounded-xl border border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-success" />
            <span className="text-xs font-mono text-on-surface-variant">RLS Protocol</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-container-high text-primary-lime border border-primary-lime/20">
            SECURE
          </span>
        </div>
      </div>

      {/* Nav items list */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePillar === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePillar(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all text-left cursor-pointer ${
                isActive
                  ? "bg-surface-container-high text-primary-lime shadow-sm border-l-2 border-primary-lime pl-3"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-primary-lime" : "text-text-muted"
                  }`}
                />
                <span className="tracking-wide">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${
                    isActive
                      ? "bg-primary-lime/15 text-primary-lime"
                      : "bg-surface-container-highest text-text-muted"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-border-subtle bg-surface-container/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-border-medium flex items-center justify-center font-mono text-xs text-primary-lime font-bold shrink-0">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 truncate">
              <p className="text-xs font-mono text-on-surface truncate">
                {user?.email || "Authenticated User"}
              </p>
              <p className="text-[10px] font-mono text-text-muted">
                UID: {user?.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-container border border-border-subtle hover:border-crimson-alert/40 hover:text-crimson-alert rounded-xl text-xs font-mono text-on-surface-variant transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
