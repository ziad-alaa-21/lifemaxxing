import { supabase } from "@/lib/supabase/client";

/**
 * Checks if there is an active, unsaved workout or running timer in progress.
 */
export function getActiveSessionOrTimerWarning(): {
  hasActive: boolean;
  type?: "workout" | "timer";
} {
  if (typeof window === "undefined") return { hasActive: false };

  try {
    // 1. Check active workout
    const activeWorkout = localStorage.getItem("lifemaxxing_active_workout");
    if (activeWorkout) {
      return { hasActive: true, type: "workout" };
    }

    // 2. Check active Ultradian focus timer
    const activeFocus = localStorage.getItem("mind_active_timer");
    if (activeFocus) {
      try {
        const parsed = JSON.parse(activeFocus);
        if (parsed && (parsed.isRunning || parsed.state === "running" || parsed.remainingSeconds > 0)) {
          return { hasActive: true, type: "timer" };
        }
      } catch {
        return { hasActive: true, type: "timer" };
      }
    }

    // 3. Check active strength rest timer
    const restEnd = localStorage.getItem("rest_timer_end_time");
    if (restEnd) {
      const endNum = parseInt(restEnd, 10);
      if (!isNaN(endNum) && endNum > Date.now()) {
        return { hasActive: true, type: "timer" };
      }
    }
  } catch {
    // Ignore storage read failures
  }

  return { hasActive: false };
}

/**
 * Enterprise-grade clean sign-out routine:
 * 1. Checks for running timer or unsaved workout and prompts confirmation
 * 2. Purges all Service Worker CacheStorage caches (preventing stale telemetry leakage)
 * 3. Selectively removes personal-data keys from localStorage while preserving language preference
 * 4. Signs out of Supabase Auth (revoking session cookies & refresh tokens)
 * 5. Executes a hard history replace to /login (defeating browser back-button cache restore)
 */
export async function executeCleanSignOut(options?: {
  skipConfirm?: boolean;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Confirm warning if there is an active workout or running timer
  if (!options?.skipConfirm) {
    const { hasActive } = getActiveSessionOrTimerWarning();
    if (hasActive) {
      const locale = localStorage.getItem("lifemaxxing_locale") || "en";
      const confirmMsg =
        locale === "ar"
          ? "لديك تمرين نشط أو مؤقت يعمل حالياً. تسجيل الخروج سيلغي التقدم غير المحفوظ. هل أنت متأكد من تسجيل الخروج؟"
          : "You have an active workout or running timer in progress. Signing out will discard unsaved progress. Are you sure you want to sign out?";

      const confirmed = window.confirm(confirmMsg);
      if (!confirmed) {
        return false;
      }
    }
  }

  // 2. Purge CacheStorage
  if ("caches" in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch (e) {
      console.warn("Failed purging CacheStorage during sign out:", e);
    }
  }

  // 3. Selective localStorage purge: Preserve language preference ("lifemaxxing_locale")
  try {
    const preservedLocale = localStorage.getItem("lifemaxxing_locale");

    // Keys to purge: personal data, telemetry, active sessions, and supabase auth tokens
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key === "lifemaxxing_locale") {
        continue; // Keep language preference intact
      }

      if (
        key.startsWith("lifemaxxing_") ||
        key.startsWith("mind_") ||
        key.startsWith("life_") ||
        key.startsWith("rest_timer_") ||
        key.startsWith("sb-")
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));

    if (preservedLocale) {
      localStorage.setItem("lifemaxxing_locale", preservedLocale);
    }

    sessionStorage.clear();
  } catch (e) {
    console.warn("Failed clearing personal Web Storage during sign out:", e);
  }

  // 4. Supabase Auth Sign Out
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Failed remote Supabase auth sign-out:", e);
  }

  // 5. Hard replace to login page
  window.location.replace("/login");
  return true;
}
