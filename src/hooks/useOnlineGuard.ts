"use client";

import { usePWA } from "@/components/pwa/PWAProvider";
import { useCallback } from "react";

export interface OnlineGuardOptions {
  blockedMessage?: string;
}

export function useOnlineGuard() {
  const { isOnline } = usePWA();

  const guardAction = useCallback(
    <T extends (...args: unknown[]) => unknown>(
      action: T,
      options?: OnlineGuardOptions
    ): ReturnType<T> | void => {
      if (!isOnline) {
        const msg =
          options?.blockedMessage ||
          "You are currently offline. Saving and modifications are disabled to protect data integrity.";
        alert(msg);
        return;
      }
      return action() as ReturnType<T>;
    },
    [isOnline]
  );

  const createGuardedHandler = useCallback(
    <T extends (...args: unknown[]) => unknown>(
      action: T,
      options?: OnlineGuardOptions
    ) => {
      return (...args: Parameters<T>): ReturnType<T> | void => {
        if (!isOnline) {
          const msg =
            options?.blockedMessage ||
            "You are currently offline. Saving and modifications are disabled to protect data integrity.";
          alert(msg);
          return;
        }
        return action(...args) as ReturnType<T>;
      };
    },
    [isOnline]
  );

  return {
    isOnline,
    isBlocked: !isOnline,
    guardAction,
    saveButtonProps: {
      disabled: !isOnline,
      title: !isOnline
        ? "Saving is disabled while offline to protect data integrity."
        : undefined,
    },
  };
}
