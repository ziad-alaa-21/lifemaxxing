"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AuthView } from "@/components/auth/AuthView";
import { AppShell } from "@/components/shell/AppShell";
import { Zap, Loader2 } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface text-on-surface">
        <div className="w-12 h-12 rounded-xl bg-surface-container border border-primary-lime/40 flex items-center justify-center text-primary-lime mb-4 shadow-[0_0_24px_rgba(198,255,61,0.25)] animate-pulse">
          <Zap className="w-6 h-6 fill-primary-lime/20" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-lime" />
          <span>Synchronizing Telemetry Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView onSuccess={() => {}} />;
  }

  return <AppShell user={user} onSignOut={handleSignOut} />;
}
