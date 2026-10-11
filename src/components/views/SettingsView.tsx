"use client";

import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  User as UserIcon,
  LogOut,
  Loader2,
  Smartphone,
  Download,
  CheckCircle2,
  Database,
  Trash2,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { usePWA, clearPWACaches } from "@/components/pwa/PWAProvider";

interface SettingsViewProps {
  userEmail: string | null;
  userId: string | null;
}

export function SettingsView({ userEmail, userId }: SettingsViewProps) {
  const router = useRouter();
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [signingOut, setSigningOut] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await clearPWACaches();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await installApp();
    } finally {
      setInstalling(false);
    }
  };

  // Comprehensive Data Export including Stage 7b mind check-ins and discipline logs
  const handleExportData = async () => {
    setExporting(true);
    setExportSuccess(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to export your data.");

      const tables = [
        "profiles",
        "weight_logs",
        "sleep_logs",
        "intake_logs",
        "meal_logs",
        "saved_meals",
        "focus_sessions",
        "math_sessions",
        "math_attempts",
        "discipline_commitments",
        "discipline_logs",
        "mind_checkins",
      ];

      const exportPayload: Record<string, any[]> = {
        meta: [
          {
            exported_at: new Date().toISOString(),
            user_id: user.id,
            email: user.email,
          },
        ],
      };

      for (const t of tables) {
        try {
          const { data } = await supabase.from(t).select("*").eq("user_id", user.id);
          exportPayload[t] = data || [];
        } catch {
          exportPayload[t] = [];
        }
      }

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifemaxxing_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      console.error("Export error:", err);
      alert(err.message || "Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-core/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-core/10 border border-amber-core/30 flex items-center justify-center text-amber-core shadow-[0_0_16px_rgba(245,158,11,0.2)]">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono text-on-surface">
              Account & Settings
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Identity, telemetry data export, and device installation
            </p>
          </div>
        </div>
      </div>

      {/* User Identity Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <h3 className="text-sm font-bold font-mono text-on-surface pb-3 border-b border-border-subtle">
          Account Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Email Address
            </div>
            <div className="text-xs font-mono text-on-surface truncate">
              {userEmail || "Signed In"}
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Account ID (auth.uid)
            </div>
            <div className="text-xs font-mono text-primary-lime truncate">
              {userId || "None"}
            </div>
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 flex justify-start sm:justify-end">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-crimson-alert/10 hover:bg-crimson-alert/20 border border-crimson-alert/30 text-crimson-alert text-xs font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Data Export & Privacy Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-tertiary-purple" />
            <h3 className="text-sm font-bold font-mono text-on-surface">
              Telemetry Data Export & Privacy
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <Lock className="w-3 h-3" />
            <span>Encrypted at Rest</span>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Export your complete health, mind, and habit telemetry into a standardized JSON file.
          Includes mental math sessions, mood/energy check-ins, discipline commitments, and nutritional logs.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-mono text-text-muted">
            {exportSuccess ? (
              <span className="text-emerald-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Export downloaded successfully</span>
              </span>
            ) : (
              <span>Full account archive (JSON)</span>
            )}
          </div>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-on-surface text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-lime" />
            ) : (
              <Download className="w-4 h-4 text-primary-lime" />
            )}
            <span>Export All Data</span>
          </button>
        </div>
      </div>

      {/* PWA Device Installation Card */}
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
          Install Life on your Android phone (from Chrome) or PC browser for full-screen standalone experience, fast launch, and offline shell caching.
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
                Available via browser menu (&ldquo;Install App&rdquo; or &ldquo;Add to Home screen&rdquo;)
              </span>
            )}
          </div>

          {!isInstalled && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-lime text-surface text-xs font-semibold uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.25)] transition-all cursor-pointer disabled:opacity-50"
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
    </div>
  );
}
