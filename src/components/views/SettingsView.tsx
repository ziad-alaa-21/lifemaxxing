"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User as UserIcon,
  Sliders,
  Flame,
  Smartphone,
  Database,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { UserProfile, UserSettings, loadFullUserSettings } from "@/lib/settings";
import { AccountTab } from "@/components/settings/AccountTab";
import { ProtocolTab } from "@/components/settings/ProtocolTab";
import { PreferencesTab } from "@/components/settings/PreferencesTab";
import { DeviceTab } from "@/components/settings/DeviceTab";
import { DataTab } from "@/components/settings/DataTab";
import { PrivacyTab } from "@/components/settings/PrivacyTab";

interface SettingsViewProps {
  userEmail: string | null;
  userId: string | null;
}

type TabType = "account" | "protocol" | "preferences" | "device" | "data" | "privacy";

export function SettingsView({ userEmail, userId }: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as TabType) || "account";
  const [activeTab, setActiveTab] = useState<TabType>(tabParam);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { profile: p, settings: s } = await loadFullUserSettings(supabase, userId);
      setProfile(p);
      setSettings(s);
    } catch (err) {
      console.error("Error loading user settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Sync tab with URL
  useEffect(() => {
    const t = (searchParams.get("tab") as TabType) || "account";
    if (t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "account", label: "Account", icon: <UserIcon className="w-4 h-4" /> },
    { id: "protocol", label: "Protocol", icon: <Flame className="w-4 h-4" /> },
    { id: "preferences", label: "Preferences", icon: <Sliders className="w-4 h-4" /> },
    { id: "device", label: "Device", icon: <Smartphone className="w-4 h-4" /> },
    { id: "data", label: "Data", icon: <Database className="w-4 h-4" /> },
    { id: "privacy", label: "Privacy", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-lime/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime shadow-[0_0_16px_rgba(198,255,61,0.2)]">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-on-surface">
                Settings & Protocol
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Target configuration, device controls, and data sovereignty
              </p>
            </div>
          </div>
          {profile?.weight_unit && (
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-surface-container-high border border-border-subtle text-[11px] font-mono text-primary-lime">
              Units: {profile.weight_unit.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border-subtle">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-primary-lime text-surface shadow-[0_0_16px_rgba(198,255,61,0.25)]"
                  : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-12 bg-surface-container rounded-2xl border border-border-subtle flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-lime" />
          <span className="text-xs font-mono text-text-muted">Loading settings...</span>
        </div>
      ) : (
        <div>
          {activeTab === "account" && (
            <AccountTab userEmail={userEmail} userId={userId} />
          )}
          {activeTab === "protocol" && (
            <ProtocolTab
              initialProfile={profile}
              initialSettings={settings}
              onRefresh={loadData}
            />
          )}
          {activeTab === "preferences" && (
            <PreferencesTab
              initialProfile={profile}
              initialSettings={settings}
              onRefresh={loadData}
            />
          )}
          {activeTab === "device" && <DeviceTab />}
          {activeTab === "data" && <DataTab userEmail={userEmail} />}
          {activeTab === "privacy" && <PrivacyTab />}
        </div>
      )}
    </div>
  );
}
