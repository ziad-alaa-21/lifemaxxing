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
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-white/95 backdrop-blur-xl border-e border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.06)] z-30 select-none">
      {/* Brand Header */}
      <div className="h-[72px] px-6 flex items-center justify-between border-b border-[#E3E5F0]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-[#14161A] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(20,22,26,0.15)]">
            <Zap className="w-4 h-4 fill-white/20" />
          </div>
          <div>
            <span className="text-[20px] leading-[24px] font-medium text-[#14161A]">
              LIFE
            </span>
            <div className="text-[12px] leading-[16px] text-[#5B6270]">
              {dict.nav.brandTag.includes("Telemetry") ? "Life Tracker" : dict.nav.brandTag.includes("القياسات") ? "متابعة الأداء" : dict.nav.brandTag}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items list */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full font-medium text-[14px] leading-[20px] transition-colors ${
                isActive
                  ? "bg-[#14161A] text-white shadow-[0_2px_8px_rgba(20,22,26,0.14)]"
                  : "text-[#5B6270] hover:text-[#14161A] hover:bg-[#F0F3FF]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-white" : "text-[#5B6270]"
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-[#E3E5F0] bg-[#F9F9FF]">
        <div className="mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#DBE1FF] flex items-center justify-center text-[14px] text-[#00174B] font-medium shrink-0">
              {userEmail?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 truncate">
              <p className="text-[14px] leading-[20px] font-medium text-[#14161A] truncate">
                {userEmail || "Signed In"}
              </p>
              {userId && (
                <p className="text-[12px] leading-[16px] text-[#5B6270] truncate">
                  ID: {userId.slice(0, 8)}...
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-[#E3E5F0] hover:border-[#BA1A1A]/40 hover:text-[#BA1A1A] hover:bg-[#FFDAD6]/30 rounded-[12px] text-[14px] leading-[20px] font-medium text-[#5B6270] transition-colors cursor-pointer disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span>{dict.nav.signOut}</span>
        </button>
      </div>
    </aside>
  );
}
