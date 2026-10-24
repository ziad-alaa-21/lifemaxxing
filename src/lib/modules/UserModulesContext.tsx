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
import { provisionFirstLogin } from "@/lib/authProvisioning";

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
    if (!userId) {
      setModules(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        await provisionFirstLogin(supabase, user);
      }
      const record = await ensureUserModules(supabase, userId);
      setModules(record);
    } catch (err) {
      console.error("Error loading user modules:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!userId) {
        if (active) {
          setModules(null);
          setLoading(false);
        }
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          await provisionFirstLogin(supabase, user);
        }
        const record = await ensureUserModules(supabase, userId);
        if (active) {
          setModules(record);
        }
      } catch (err) {
        console.error("Error loading user modules:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [userId]);

  const toggleModule = async (key: ModuleKey, value: boolean) => {
    if (!userId || !modules) {
      return { success: false, error: "Authentication required" };
    }

    const res = await updateModuleSettings(supabase, userId, modules, key, value);
    if (res.success && res.record) {
      setModules(res.record);
    }
    return res;
  };

  const saveOnboarding = async (selectedKeys: ModuleKey[]) => {
    if (!userId) {
      return { success: false, error: "Authentication required" };
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
