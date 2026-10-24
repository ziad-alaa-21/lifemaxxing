"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { WifiOff, RefreshCw, Sparkles, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PWAContextType {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
  updateAvailable: boolean;
  applyUpdate: () => void;
  clearCaches: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  isOnline: true,
  isInstallable: false,
  isInstalled: false,
  installApp: async () => {},
  updateAvailable: false,
  applyUpdate: () => {},
  clearCaches: async () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

export async function clearPWACaches() {
  if (typeof window !== "undefined" && "caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHES" });
    }
  }
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // 1. Initial online status
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo_offline") === "true") {
      setIsOnline(false);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Standalone detection
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Service Worker registration & update listener
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        // In local development, unregister any active service worker and purge caches
        // so Fast Refresh and Turbopack never serve stale client bundles that cause hydration mismatches.
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
            console.log("[PWA] Unregistered service worker in dev mode:", reg.scope);
          }
        });
        if ("caches" in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
              console.log("[PWA] Purged cache in dev mode:", name);
            }
          });
        }
        return;
      }

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);

          // Check if already waiting
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setUpdateAvailable(true);
          }

          // Listen for new service worker installation
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });

      // Reload when new worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 4. Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      alert(
        "Installation can be triggered via your browser menu ('Add to Home screen' or 'Install Life' in Chrome's address bar)."
      );
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isOnline,
        isInstallable: !!deferredPrompt && !isInstalled,
        isInstalled,
        installApp,
        updateAvailable,
        applyUpdate,
        clearCaches: clearPWACaches,
      }}
    >
      {/* Global Offline Warning Bar */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-core text-on-primary px-4 py-2 text-xs font-mono flex items-center justify-center gap-2 shadow-sm backdrop-blur-md">
          <WifiOff className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span className="font-bold">Offline Mode:</span>
          <span>Read-only cache active. Saving and modifications are temporarily blocked.</span>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 bg-surface-container border border-primary-lime/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 max-w-sm animate-slide-up">
          <div className="w-9 h-9 rounded-xl bg-primary-lime/15 border border-primary-lime/30 flex items-center justify-center text-primary-lime shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h4 className="text-xs font-bold font-mono text-on-surface">
              Update Available
            </h4>
            <p className="text-[11px] text-on-surface-variant">
              A new version of Life is ready.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={applyUpdate}
              className="px-3 py-1.5 rounded-lg bg-primary-lime text-on-primary text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-lime-dim flex items-center gap-1 cursor-pointer shadow-xs [&_svg]:stroke-current [&_svg]:text-on-primary"
            >
              <RefreshCw className="w-3 h-3 text-on-primary stroke-current" />
              <span>Update</span>
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="w-7 h-7 rounded-lg bg-surface-container-high border border-border-subtle flex items-center justify-center text-text-muted hover:text-on-surface cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {children}
    </PWAContext.Provider>
  );
}
