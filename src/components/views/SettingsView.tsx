"use client";

import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import { User as UserIcon, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SettingsViewProps {
  userEmail: string | null;
  userId: string | null;
}

export function SettingsView({ userEmail, userId }: SettingsViewProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
              Identity and active session
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
    </div>
  );
}
