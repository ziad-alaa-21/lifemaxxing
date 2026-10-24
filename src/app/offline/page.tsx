"use client";

import React from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-surface text-on-surface">
      <div className="w-full max-w-md p-6 sm:p-8 bg-surface-container rounded-2xl border border-border-subtle shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-core/10 border border-amber-core/30 flex items-center justify-center text-amber-core mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <WifiOff className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-mono text-on-surface">
            Offline Mode Active
          </h1>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            No internet connection detected. The app shell is operating in local read-only cache mode.
          </p>
        </div>

        <div className="p-3.5 bg-crimson-alert/10 border border-crimson-alert/25 rounded-xl text-left flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-crimson-alert shrink-0 mt-0.5" />
          <div className="text-[11px] text-on-surface-variant leading-tight">
            <span className="font-semibold text-crimson-alert">
              Writes & Saving Blocked:
            </span>{" "}
            To prevent sync conflicts and protect database integrity, saving new workouts, subjects, and grades is disabled until your connection is restored.
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary-lime text-on-primary text-xs font-semibold uppercase tracking-wider hover:bg-primary-lime-dim flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>

          <Link
            href="/today"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface hover:text-primary-lime flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Today</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
