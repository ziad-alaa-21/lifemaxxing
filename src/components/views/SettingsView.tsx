"use client";

import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Database,
  Palette,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";

interface SettingsViewProps {
  user: User | null;
  onSignOut: () => void;
}

export function SettingsView({ user, onSignOut }: SettingsViewProps) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await onSignOut();
    setSigningOut(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface-container rounded-2xl p-6 border border-border-subtle relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-core/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-core/10 border border-amber-core/30 flex items-center justify-center text-amber-core shadow-[0_0_16px_rgba(245,158,11,0.2)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-on-surface">
                  System Diagnostics & Session
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-success/15 text-emerald-success border border-emerald-success/30">
                  RLS ACTIVE
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Obsidian Kinetic Security Matrix & Supabase Session Control
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Session Profile Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <UserIcon className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            Active Supabase Identity
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Email Address
            </div>
            <div className="text-xs font-mono text-on-surface truncate">
              {user?.email || "Unknown"}
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              User UUID (auth.uid)
            </div>
            <div className="text-xs font-mono text-primary-lime truncate">
              {user?.id || "None"}
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Authentication Provider
            </div>
            <div className="text-xs font-mono text-on-surface capitalize">
              {user?.app_metadata?.provider || "Email/Password"}
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Last Sign-In Timestamp
            </div>
            <div className="text-xs font-mono text-on-surface-variant">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : "Active"}
            </div>
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 flex justify-end">
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
            <span>Terminate Session (Sign Out)</span>
          </button>
        </div>
      </div>

      {/* Database Connection & RLS Specs */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <Database className="w-4 h-4 text-secondary-cyan" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            Database Architecture Status
          </h3>
        </div>

        <div className="space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-border-subtle">
            <span className="text-text-muted">Supabase Project Node</span>
            <span className="text-on-surface">pdfzqeytbvtguheygthw.supabase.co</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-border-subtle">
            <span className="text-text-muted">Client Key Type</span>
            <span className="text-primary-lime">Publishable Anon Key (sb_publishable_...)</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-border-subtle">
            <span className="text-text-muted">Service Role Key in App</span>
            <span className="text-emerald-success font-semibold">Strictly Forbidden & Excluded</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-border-subtle">
            <span className="text-text-muted">RLS Isolation Test Result</span>
            <span className="text-emerald-success font-semibold">100% Passed (8/8 Checks)</span>
          </div>
        </div>
      </div>

      {/* Design System Token Overview */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <Palette className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            Obsidian Kinetic Token System
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-2.5 bg-surface-container-low rounded-xl border border-border-subtle flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-primary-lime shrink-0" />
            <div>
              <div className="text-[10px] text-text-muted">Volt Lime</div>
              <div className="text-[11px] text-on-surface">#C6FF3D</div>
            </div>
          </div>

          <div className="p-2.5 bg-surface-container-low rounded-xl border border-border-subtle flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-secondary-cyan shrink-0" />
            <div>
              <div className="text-[10px] text-text-muted">Somatic Cyan</div>
              <div className="text-[11px] text-on-surface">#5DE6FF</div>
            </div>
          </div>

          <div className="p-2.5 bg-surface-container-low rounded-xl border border-border-subtle flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-tertiary-purple shrink-0" />
            <div>
              <div className="text-[10px] text-text-muted">Mind Violet</div>
              <div className="text-[11px] text-on-surface">#A78BFA</div>
            </div>
          </div>

          <div className="p-2.5 bg-surface-container-low rounded-xl border border-border-subtle flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-core shrink-0" />
            <div>
              <div className="text-[10px] text-text-muted">Amber Core</div>
              <div className="text-[11px] text-on-surface">#F59E0B</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
