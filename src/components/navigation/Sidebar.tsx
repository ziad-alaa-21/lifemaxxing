"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame,
  Dumbbell,
  Brain,
  GraduationCap,
  Settings,
  LogOut,
  Zap,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { clearPWACaches } from "@/components/pwa/PWAProvider";
import { executeCleanSignOut } from "@/lib/signOutHelper";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useUserModules } from "@/lib/modules/UserModulesContext";

interface SidebarProps {
  userEmail: string | null;
  userId: string | null;
}

export function Sidebar({ userEmail, userId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const { dict } = useI18n();
  const { isPillarActive } = useUserModules();

  const navItems = [
    { href: "/today", label: dict.nav.today, icon: Flame, visible: true },
    { href: "/body", label: dict.nav.body, icon: Dumbbell, visible: isPillarActive("body") },
    { href: "/mind", label: dict.nav.mind, icon: Brain, visible: isPillarActive("mind") },
    { href: "/school", label: dict.nav.school, icon: GraduationCap, visible: isPillarActive("school") },
    { href: "/settings", label: dict.nav.settings, icon: Settings, visible: true },
  ].filter((item) => item.visible);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await executeCleanSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-surface border-e border-border-subtle z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container border border-primary-lime/40 flex items-center justify-center text-primary-lime shadow-[0_0_12px_rgba(198,255,61,0.2)]">
            <Zap className="w-4 h-4 fill-primary-lime/20" />
          </div>
          <div>
            <span className="font-mono text-sm font-bold tracking-tight text-on-surface">
              LIFE
            </span>
            <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
              {dict.nav.brandTag}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items list */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                isActive
                  ? "bg-surface-container-high text-primary-lime shadow-sm border-s-2 border-primary-lime ps-3"
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
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-border-subtle bg-surface-container/30">
        <div className="mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-border-medium flex items-center justify-center font-mono text-xs text-primary-lime font-bold shrink-0">
              {userEmail?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 truncate">
              <p className="text-xs font-mono text-on-surface truncate">
                {userEmail || "Signed In"}
              </p>
              {userId && (
                <p className="text-[10px] font-mono text-text-muted truncate">
                  ID: {userId.slice(0, 8)}...
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-container border border-border-subtle hover:border-crimson-alert/40 hover:text-crimson-alert rounded-xl text-xs font-mono text-on-surface-variant transition-colors cursor-pointer disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          <span>{dict.nav.signOut}</span>
        </button>
      </div>
    </aside>
  );
}
