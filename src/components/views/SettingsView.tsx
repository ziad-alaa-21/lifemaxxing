"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User as UserIcon,
  Sliders,
  Flame,
  Smartphone,
  Database,
  ShieldCheck,
  Loader2,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { UserProfile, UserSettings, loadFullUserSettings } from "@/lib/settings";
import { AccountTab } from "@/components/settings/AccountTab";
import { ModulesTab } from "@/components/settings/ModulesTab";
import { ProtocolTab } from "@/components/settings/ProtocolTab";
import { PreferencesTab } from "@/components/settings/PreferencesTab";
import { DeviceTab } from "@/components/settings/DeviceTab";
import { DataTab } from "@/components/settings/DataTab";
import { PrivacyTab } from "@/components/settings/PrivacyTab";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ReauthMethod } from "@/lib/authConfig";

interface SettingsViewProps {
  userEmail: string | null;
  userId: string | null;
  isGoogleOnly?: boolean;
  reauthMethod?: ReauthMethod;
}

type TabType = "account" | "modules" | "protocol" | "preferences" | "device" | "data" | "privacy";

export function SettingsView({
  userEmail,
  userId,
  isGoogleOnly,
  reauthMethod,
}: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dict, locale } = useI18n();

  const tabParam = (searchParams.get("tab") as TabType) || null;
  const [selectedTab, setSelectedTab] = useState<TabType>("account");
  const activeTab: TabType = tabParam || selectedTab;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    loadFullUserSettings(supabase, userId)
      .then(({ profile: p, settings: s }) => {
        if (!active) return;
        setProfile(p);
        setSettings(s);
      })
      .catch((err) => {
        console.error("Error loading user settings:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "account", label: dict.settings.account, icon: <UserIcon className="w-4 h-4" /> },
    { id: "modules", label: locale === "ar" ? "الأقسام" : "Modules", icon: <Layers className="w-4 h-4" /> },
    { id: "protocol", label: dict.settings.protocol, icon: <Flame className="w-4 h-4" /> },
    { id: "preferences", label: dict.settings.preferences, icon: <Sliders className="w-4 h-4" /> },
    { id: "device", label: dict.settings.devices, icon: <Smartphone className="w-4 h-4" /> },
    { id: "data", label: dict.settings.data, icon: <Database className="w-4 h-4" /> },
    { id: "privacy", label: dict.settings.privacy, icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 font-sans">
      {/* Top Banner */}
      <div className="rounded-[20px] bg-white p-5 sm:p-6 border border-[#e2e8f9] shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#f0f3ff] border border-[#e2e8f9] flex items-center justify-center text-[#0051d5] shadow-xs">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#151c28]">
                  {locale === "ar" ? "الإعدادات والبروتوكول" : "Settings & Protocol"}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0f3ff] text-[#0051d5] font-semibold border border-[#dce2f3]">
                  {locale === "ar" ? "التحكم الكامل" : "Full Control"}
                </span>
              </div>
              <p className="text-xs text-[#45474b] mt-0.5">
                {locale === "ar"
                  ? "تكوين الأهداف، التحكم في الأقسام، وسيادة البيانات الكاملة"
                  : "Target configuration, module controls, and data sovereignty"}
              </p>
            </div>
          </div>
          {profile?.weight_unit && (
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-[#f0f3ff] border border-[#dce2f3] text-xs font-semibold text-[#0051d5]">
              {locale === "ar" ? "الوحدة: " : "Units: "}
              {profile.weight_unit.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Segmented Control Navigation */}
      <nav aria-label="Settings sections" className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-full border border-[#e2e8f9] overflow-x-auto shadow-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white text-[#151c28] shadow-xs font-semibold"
                  : "text-[#45474b] hover:text-[#151c28]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      {loading ? (
        <div className="p-12 stitch-card flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-ink" />
          <span className="text-xs font-mono text-text-muted">
            {locale === "ar" ? "جارٍ تحميل الإعدادات..." : "Loading settings..."}
          </span>
        </div>
      ) : (
        <div>
          {activeTab === "account" && (
            <AccountTab
              userEmail={userEmail}
              userId={userId}
              isGoogleOnly={isGoogleOnly}
            />
          )}
          {activeTab === "modules" && <ModulesTab />}
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
          {activeTab === "data" && (
            <DataTab userEmail={userEmail} reauthMethod={reauthMethod} />
          )}
          {activeTab === "privacy" && <PrivacyTab />}
        </div>
      )}
    </div>
  );
}
