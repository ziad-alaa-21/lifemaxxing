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
  ChevronRight,
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
    <div className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 font-sans">
      {/* Header Section */}
      {(() => {
        const meta =
          activeTab === "modules"
            ? {
                crumb: locale === "ar" ? "الأقسام" : "Modules",
                title: locale === "ar" ? "ما الذي ترغب في تتبعه؟" : "What do you want to track?",
                desc: locale === "ar"
                  ? "اختر الأقسام التي ترغب في تتبعها يومياً. الأقسام غير المحددة سيتم إخفاؤها من الواجهة الرئيسية."
                  : "Select the operational pillars aligned with your current daily focus. Unselected modules will be neatly tucked away from your dashboard.",
              }
            : activeTab === "protocol"
            ? {
                crumb: locale === "ar" ? "الأهداف والبروتوكول" : "Targets",
                title: locale === "ar" ? "إعدادات النظام والأهداف" : "System settings",
                desc: locale === "ar"
                  ? "ضبط المؤشرات المستهدفة عبر التغذية، التعافي البدني، والتركيز المعرفي."
                  : "Fine-tune operational thresholds across nutrition, physical recovery, and cognitive focus.",
              }
            : activeTab === "data"
            ? {
                crumb: locale === "ar" ? "البيانات والخصوصية" : "Data and privacy",
                title: locale === "ar" ? "البيانات والخصوصية" : "Data and privacy",
                desc: locale === "ar"
                  ? "سجلاتك عبر التمارين، النوم، جلسات التركيز، والدرجات محفوظة بأمان تحت سيادتك التامة."
                  : "Your logs across focus sessions, workouts, and sleep schedules are privately stored and never commercialized.",
              }
            : activeTab === "account"
            ? {
                crumb: locale === "ar" ? "الحساب" : "Account",
                title: locale === "ar" ? "إعدادات الحساب" : "Account configuration",
                desc: locale === "ar"
                  ? "إدارة البريد الإلكتروني، كلمة المرور، وإعدادات المصادقة الآمنة."
                  : "Profile identity, authentication credentials, and security preferences.",
              }
            : activeTab === "preferences"
            ? {
                crumb: locale === "ar" ? "التفضيلات" : "Preferences",
                title: locale === "ar" ? "العرض والتفضيلات" : "Display & preferences",
                desc: locale === "ar"
                  ? "تخصيص المظهر، لغة الواجهة، ووحدات القياس."
                  : "Customize theme, language, units of measurement, and dashboard layout density.",
              }
            : activeTab === "device"
            ? {
                crumb: locale === "ar" ? "الأجهزة" : "Devices",
                title: locale === "ar" ? "الأجهزة المتصلة" : "Connected devices",
                desc: locale === "ar"
                  ? "إدارة الحساسات الحيوية والمزامنة المحلية."
                  : "Manage biometric sensors, wearable integrations, and local background synchronization.",
              }
            : {
                crumb: locale === "ar" ? "سياسة الخصوصية" : "Privacy policy",
                title: locale === "ar" ? "سياسة الخصوصية والامتثال" : "Privacy policy & compliance",
                desc: locale === "ar"
                  ? "إفصاح كامل حول التخزين المحلي، وضوابط التتبع التشخيصي."
                  : "Complete disclosure on local caching, telemetry limitations, and cryptographic integrity.",
              };

        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#45474b] font-medium">
              <span>{locale === "ar" ? "إعدادات النظام" : "System configuration"}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#76777b]" />
              <span className="text-[#151c28] font-semibold">{meta.crumb}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#151c28]">
              {meta.title}
            </h1>
            <p className="text-sm text-[#45474b] max-w-2xl leading-relaxed">
              {meta.desc}
            </p>

            {/* Segmented Navigation Bar */}
            <nav aria-label="Settings sections" className="mt-2 inline-flex items-center gap-1 p-1 bg-[#e7eeff] rounded-full max-w-fit overflow-x-auto border border-[#dce2f3] shadow-xs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-[#000000] text-white shadow-xs font-semibold"
                        : "text-[#45474b] hover:text-[#151c28] hover:bg-white/60 font-medium"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        );
      })()}

      {/* Tab Content */}
      {loading ? (
        <div className="p-12 rounded-[20px] bg-white border border-[#e2e8f9] shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#0051d5]" />
          <span className="text-xs text-[#45474b]">
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
