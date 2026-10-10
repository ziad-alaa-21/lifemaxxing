"use client";

import React, { useState } from "react";
import { Pillar } from "@/lib/types";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { Header } from "@/components/navigation/Header";
import { QuickActionModal } from "@/components/navigation/QuickActionModal";
import { TodayView } from "@/components/views/TodayView";
import { BodyView } from "@/components/views/BodyView";
import { MindView } from "@/components/views/MindView";
import { SchoolView } from "@/components/views/SchoolView";
import { SettingsView } from "@/components/views/SettingsView";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

interface AppShellProps {
  user: User | null;
  onSignOut: () => void;
}

export function AppShell({ user, onSignOut }: AppShellProps) {
  const [activePillar, setActivePillar] = useState<Pillar>("today");
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const renderCurrentView = () => {
    switch (activePillar) {
      case "today":
        return <TodayView onNavigate={setActivePillar} />;
      case "body":
        return <BodyView />;
      case "mind":
        return <MindView />;
      case "school":
        return <SchoolView />;
      case "settings":
        return <SettingsView user={user} onSignOut={onSignOut} />;
      default:
        return <TodayView onNavigate={setActivePillar} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-surface text-on-surface overflow-hidden">
      {/* Desktop Sidebar (>= 1024px) */}
      <Sidebar
        activePillar={activePillar}
        setActivePillar={setActivePillar}
        user={user}
        onSignOut={onSignOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Responsive Header */}
        <Header
          activePillar={activePillar}
          setActivePillar={setActivePillar}
          user={user}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-10">
          <div className="max-w-5xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePillar}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
              >
                {renderCurrentView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (< 1024px) */}
      <BottomTabBar
        activePillar={activePillar}
        setActivePillar={setActivePillar}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
      />

      {/* Global Quick Action Drawer / Modal */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onSelectAction={(pillar) => setActivePillar(pillar)}
      />
    </div>
  );
}
