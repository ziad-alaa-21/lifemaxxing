"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Dumbbell, Brain, GraduationCap, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useUserModules } from "@/lib/modules/UserModulesContext";

interface BottomTabBarProps {
  onOpenQuickAction: () => void;
}

export function BottomTabBar({ onOpenQuickAction }: BottomTabBarProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { dict } = useI18n();
  const { isPillarActive } = useUserModules();

  const allActiveTabs = [
    { href: "/today", label: dict.nav.today, icon: Flame, visible: true },
    { href: "/body", label: dict.nav.body, icon: Dumbbell, visible: isPillarActive("body") },
    { href: "/mind", label: dict.nav.mind, icon: Brain, visible: isPillarActive("mind") },
    { href: "/school", label: dict.nav.school, icon: GraduationCap, visible: isPillarActive("school") },
  ].filter((t) => t.visible);

  // Split tabs around the center quick-action (+) button
  const splitIndex = Math.ceil(allActiveTabs.length / 2);
  const leftTabs = allActiveTabs.slice(0, splitIndex);
  const rightTabs = allActiveTabs.slice(splitIndex);

  const renderTab = (tab: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
    const Icon = tab.icon;

    return (
      <motion.div
        key={tab.href}
        className="relative flex-1 flex items-center justify-center h-full min-w-[44px]"
        whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.12 }}
      >
        {/* Active Pill (Shared Layout Animation) */}
        {isActive && (
          <motion.div
            layoutId={shouldReduceMotion ? undefined : "liquid-glass-tab-lens"}
            className="absolute inset-x-1.5 inset-y-1.5 rounded-[16px] bg-[#F0F3FF] border border-[#E3E5F0] pointer-events-none"
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 30 }
            }
          />
        )}

        <Link
          href={tab.href}
          aria-label={tab.label}
          aria-current={isActive ? "page" : undefined}
          className={`relative z-10 flex flex-col items-center justify-center w-full h-full min-h-[44px] py-1 select-none rounded-[16px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14161A] ${
            isActive
              ? "text-[#14161A] font-medium"
              : "text-[#5B6270] hover:text-[#14161A]"
          }`}
        >
          <Icon
            className={`w-5 h-5 mb-0.5 transition-all ${
              isActive ? "stroke-[2.25] text-[#2563EB]" : "stroke-[1.75]"
            }`}
          />
          <span className="text-[12px] leading-[16px] font-medium">
            {tab.label}
          </span>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="lg:hidden fixed bottom-[calc(8px+env(safe-area-inset-bottom,0px))] left-3 right-3 max-w-md mx-auto z-40 pointer-events-none">
      <nav
        aria-label="Bottom Navigation"
        className="liquid-glass-bar pointer-events-auto relative flex items-center justify-between h-[64px] px-2 rounded-[20px] border border-[#E3E5F0] select-none"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[48%] rounded-t-[20px] bg-gradient-to-b from-white/50 to-transparent" />

        {/* Left Tabs (Today, Body) */}
        <div className="flex-1 flex items-center justify-around h-full">
          {leftTabs.map(renderTab)}
        </div>

        {/* Center Floating Quick Action Button (+) */}
        <div className="relative flex items-center justify-center px-1 shrink-0">
          <motion.button
            whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
            transition={{ duration: 0.12 }}
            onClick={onOpenQuickAction}
            type="button"
            aria-label="Quick Action"
            className="relative -top-2.5 w-12 h-12 rounded-full bg-[#14161A] text-white flex items-center justify-center shadow-[0_8px_16px_rgba(20,22,26,0.22)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14161A] focus-visible:ring-offset-2"
          >
            <Plus className="w-6 h-6 stroke-[2.5] text-white" />
          </motion.button>
        </div>

        {/* Right Tabs (Mind, School) */}
        <div className="flex-1 flex items-center justify-around h-full">
          {rightTabs.map(renderTab)}
        </div>
      </nav>
    </div>
  );
}
