"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import { usePWA, clearPWACaches } from "@/components/pwa/PWAProvider";

export function DeviceTab() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Active session check states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [activeSessionWarningText, setActiveSessionWarningText] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  useEffect(() => {
    // Read last sync timestamp
    const stored = localStorage.getItem("lifemaxxing_last_sync");
    if (stored) {
      try {
        const d = new Date(stored);
        setLastSyncTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        setLastSyncTime("Today");
      }
    }
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await installApp();
    } finally {
      setInstalling(false);
    }
  };

  const handleAttemptClearCache = () => {
    // Safeguard: Check for active focus session or unsaved workout
    const activeFocus = localStorage.getItem("lifemaxxing_active_focus_session");
    const activeWorkout = localStorage.getItem("lifemaxxing_active_workout");

    const issues: string[] = [];
    if (activeFocus) {
      try {
        const parsed = JSON.parse(activeFocus);
        if (parsed.status === "running" || parsed.status === "paused") {
          issues.push("an active focus timer session");
        }
      } catch {}
    }
    if (activeWorkout) {
      issues.push("an ongoing unsaved workout");
    }

    if (issues.length > 0) {
      setActiveSessionWarningText(
        `Active Session Warning: You currently have ${issues.join(" and ")} in progress. Clearing the device cache now will discard your session progress.`
      );
      setShowWarningModal(true);
      return;
    }

    // No active session: proceed with confirmation
    executeCacheClear();
  };

  const executeCacheClear = async () => {
    setShowWarningModal(false);
    setClearingCache(true);
    setCacheClearSuccess(false);
    try {
      await clearPWACaches();
      setCacheClearSuccess(true);
      setTimeout(() => setCacheClearSuccess(false), 4000);
    } catch (err: any) {
      alert("Failed to clear cache: " + err.message);
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PWA Installation Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary-lime" />
            <h3 className="text-sm font-bold font-mono text-on-surface">
              Progressive Web App (PWA)
            </h3>
          </div>
          {isInstalled && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-success px-2 py-0.5 rounded-full bg-emerald-success/10 border border-emerald-success/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Standalone Installed</span>
            </span>
          )}
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          LifeMaxxing is built as an offline-first Progressive Web App. Install it to your home screen or desktop for edge launching, full-screen viewport, and reliable offline shell operation.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-mono text-text-muted">
            {isInstalled ? (
              <span className="text-emerald-success">
                ✓ Running in standalone application window
              </span>
            ) : isInstallable ? (
              <span className="text-primary-lime">
                ● Ready for one-click installation
              </span>
            ) : (
              <span>
                Available via browser menu (&ldquo;Install App&rdquo; or &ldquo;Add to Home Screen&rdquo;)
              </span>
            )}
          </div>

          {!isInstalled && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-lime text-surface text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.25)] transition-all cursor-pointer disabled:opacity-50"
            >
              {installing ? (
                <Loader2 className="w-4 h-4 animate-spin text-surface" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Install Life App</span>
            </button>
          )}
        </div>
      </div>

      {/* App Version & Sync Metadata */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <HardDrive className="w-4 h-4 text-tertiary-purple" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Device & Sync Status</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              App Version
            </div>
            <div className="text-xs font-mono text-on-surface flex items-center gap-1.5">
              <span>v1.0.0-stage9</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-lime/10 text-primary-lime font-mono">
                Production
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Last Database Sync
            </div>
            <div className="text-xs font-mono text-primary-lime flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{lastSyncTime}</span>
            </div>
          </div>
        </div>

        {/* Cache Clearing Safeguard Card */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <div>
            <h4 className="text-xs font-bold font-mono text-on-surface">Service Worker Shell Cache</h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Purges cached script bundles and static icon assets. Never silently discards running sessions.
            </p>
          </div>

          <button
            onClick={handleAttemptClearCache}
            disabled={clearingCache}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-all cursor-pointer disabled:opacity-50"
          >
            {clearingCache ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-lime" />
            ) : (
              <RefreshCw className="w-4 h-4 text-primary-lime" />
            )}
            <span>Clear Cache</span>
          </button>
        </div>

        {cacheClearSuccess && (
          <div className="p-3 bg-emerald-success/10 border border-emerald-success/20 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Service worker cache successfully purged.</span>
          </div>
        )}
      </div>

      {/* Service Worker Privacy Audit Confirmation */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-success" />
          <h3 className="text-xs font-bold font-mono text-on-surface">Service Worker Privacy Audit</h3>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          The service worker (<code className="text-on-surface">/sw.js</code>) is strictly configured to cache static shell assets only (<code className="text-on-surface">/offline</code>, manifest, icons, and static bundle chunks). It intercepts <strong>no personal telemetry</strong>, stores <strong>no authentication tokens</strong>, and retains <strong>zero user data</strong>.
        </p>
      </div>

      {/* Active Session Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-border-subtle max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-amber-core">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-mono">Active Session in Progress</h3>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              {activeSessionWarningText}
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              Are you sure you want to proceed and discard unsaved session data?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
              >
                Keep Active Session
              </button>
              <button
                type="button"
                onClick={executeCacheClear}
                className="px-4 py-2 rounded-xl bg-crimson-alert text-white text-xs font-mono font-bold hover:bg-crimson-alert/90 cursor-pointer"
              >
                Discard & Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
