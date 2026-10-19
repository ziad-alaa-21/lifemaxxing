"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  ModuleKey,
  UserModulesRecord,
  ensureUserModules,
  updateModuleSettings,
  completeOnboarding,
  isModuleActive as checkModuleActive,
  isPillarActive as checkPillarActive,
} from "@/lib/modules";

interface UserModulesContextType {
  modules: UserModulesRecord | null;
  loading: boolean;
  isModuleActive: (key: ModuleKey) => boolean;
  isPillarActive: (pillar: "body" | "mind" | "school") => boolean;
  toggleModule: (key: ModuleKey, value: boolean) => Promise<{ success: boolean; error?: string }>;
  saveOnboarding: (selectedKeys: ModuleKey[]) => Promise<{ success: boolean; error?: string }>;
  refreshModules: () => Promise<void>;
  showOnboarding: boolean;
}

const UserModulesContext = createContext<UserModulesContextType | null>(null);

export function UserModulesProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [modules, setModules] = useState<UserModulesRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    // Check localStorage override for dev / preview / screenshot capture
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dev_modules_override");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setModules(parsed);
          setLoading(false);
          return;
        } catch {}
      }
    }

    if (!userId || userId === "00000000-0000-0000-0000-000000000000") {
      setModules({
        user_id: "00000000-0000-0000-0000-000000000000",
        has_completed_onboarding: true,
        module_workouts: true,
        module_nutrition: true,
        module_sleep: true,
        module_weight: true,
        module_mind_focus: true,
        module_mind_discipline: true,
        module_mind_reading: true,
        module_mind_screentime: true,
        module_school_timetable: true,
        module_school_topics: true,
        module_school_mistakes: true,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const record = await ensureUserModules(supabase, userId);
      setModules(record);
    } catch (err) {
      console.error("Error loading user modules:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const toggleModule = async (key: ModuleKey, value: boolean) => {
    if (!userId || userId === "00000000-0000-0000-0000-000000000000") {
      if (!modules) return { success: false, error: "Not initialized" };
      const updated = { ...modules, [key]: value };
      setModules(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("dev_modules_override", JSON.stringify(updated));
      }
      return { success: true, record: updated };
    }

    if (!modules) {
      return { success: false, error: "Not initialized" };
    }

    const res = await updateModuleSettings(supabase, userId, modules, key, value);
    if (res.success && res.record) {
      setModules(res.record);
    }
    return res;
  };

  const saveOnboarding = async (selectedKeys: ModuleKey[]) => {
    if (!userId || userId === "00000000-0000-0000-0000-000000000000") {
      const updated: UserModulesRecord = {
        user_id: "00000000-0000-0000-0000-000000000000",
        has_completed_onboarding: true,
        module_workouts: selectedKeys.includes("module_workouts"),
        module_nutrition: selectedKeys.includes("module_nutrition"),
        module_sleep: selectedKeys.includes("module_sleep"),
        module_weight: selectedKeys.includes("module_weight"),
        module_mind_focus: selectedKeys.includes("module_mind_focus"),
        module_mind_discipline: selectedKeys.includes("module_mind_discipline"),
        module_mind_reading: selectedKeys.includes("module_mind_reading"),
        module_mind_screentime: selectedKeys.includes("module_mind_screentime"),
        module_school_timetable: selectedKeys.includes("module_school_timetable"),
        module_school_topics: selectedKeys.includes("module_school_topics"),
        module_school_mistakes: selectedKeys.includes("module_school_mistakes"),
      };
      setModules(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("dev_modules_override", JSON.stringify(updated));
      }
      return { success: true, record: updated };
    }

    const res = await completeOnboarding(supabase, userId, selectedKeys);
    if (res.success && res.record) {
      setModules(res.record);
    }
    return res;
  };

  const isModuleActive = (key: ModuleKey): boolean => {
    return checkModuleActive(modules, key);
  };

  const isPillarActive = (pillar: "body" | "mind" | "school"): boolean => {
    return checkPillarActive(modules, pillar);
  };

  const showOnboarding = Boolean(
    modules && modules.has_completed_onboarding === false && !loading
  );

  return (
    <UserModulesContext.Provider
      value={{
        modules,
        loading,
        isModuleActive,
        isPillarActive,
        toggleModule,
        saveOnboarding,
        refreshModules: fetchModules,
        showOnboarding,
      }}
    >
      {children}
    </UserModulesContext.Provider>
  );
}

export function useUserModules(): UserModulesContextType {
  const context = useContext(UserModulesContext);
  if (!context) {
    // Default safe fallback if mounted outside provider
    return {
      modules: null,
      loading: false,
      isModuleActive: () => true,
      isPillarActive: () => true,
      toggleModule: async () => ({ success: true }),
      saveOnboarding: async () => ({ success: true }),
      refreshModules: async () => {},
      showOnboarding: false,
    };
  }
  return context;
}
