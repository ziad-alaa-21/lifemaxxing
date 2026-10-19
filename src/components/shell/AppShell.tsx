"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { Header } from "@/components/navigation/Header";
import { QuickActionModal } from "@/components/navigation/QuickActionModal";
import { UserModulesProvider } from "@/lib/modules/UserModulesContext";
import { ModuleOnboardingModal } from "@/components/modules/ModuleOnboardingModal";

interface AppShellProps {
  userEmail: string | null;
  userId: string | null;
  children: React.ReactNode;
}

export function AppShell({ userEmail, userId, children }: AppShellProps) {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  return (
    <UserModulesProvider userId={userId}>
      <div className="flex h-screen w-full bg-surface text-on-surface overflow-hidden">
        {/* Desktop Sidebar (>= 1024px) */}
        <Sidebar userEmail={userEmail} userId={userId} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Responsive Header */}
          <Header onOpenQuickAction={() => setIsQuickActionOpen(true)} />

          {/* Scrollable Page Content */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 lg:pb-10">
            <div className="max-w-5xl mx-auto w-full">{children}</div>
          </main>
        </div>

        {/* Mobile Bottom Tab Bar (< 1024px) */}
        <BottomTabBar onOpenQuickAction={() => setIsQuickActionOpen(true)} />

        {/* Quick Action Drawer */}
        <QuickActionModal
          isOpen={isQuickActionOpen}
          onClose={() => setIsQuickActionOpen(false)}
        />

        {/* First-time Module Onboarding Modal */}
        <ModuleOnboardingModal />
      </div>
    </UserModulesProvider>
  );
}
