"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Shield, Zap, AlertCircle, Loader2 } from "lucide-react";

interface AuthViewProps {
  onSuccess?: () => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          setError(signInErr.message);
        } else {
          onSuccess?.();
        }
      } else {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpErr) {
          setError(signUpErr.message);
        } else if (data.session) {
          setMessage("Account created successfully!");
          onSuccess?.();
        } else {
          setMessage("Account created. You can now sign in.");
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-surface relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-lime/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-secondary-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface-container border border-border-subtle rounded-2xl p-6 sm:p-8 relative z-10 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container-high border border-primary-lime/30 text-primary-lime mb-3 shadow-[0_0_20px_rgba(198,255,61,0.2)]">
            <Zap className="w-6 h-6 fill-primary-lime/20 text-primary-lime" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface font-mono">
            LIFE • PROTOCOL
          </h1>
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-mono mt-1">
            Obsidian Kinetic Architecture
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-xl mb-6 border border-border-subtle">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
              mode === "signin"
                ? "bg-surface-container-high text-primary-lime shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
              mode === "signup"
                ? "bg-surface-container-high text-primary-lime shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-crimson-alert/10 border border-crimson-alert/30 rounded-xl flex items-start gap-2 text-crimson-alert text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-emerald-success/10 border border-emerald-success/30 rounded-xl text-emerald-success text-xs">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime focus:ring-1 focus:ring-primary-lime transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime focus:ring-1 focus:ring-primary-lime transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-lime text-surface font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-lime-dim focus:outline-none focus:ring-2 focus:ring-primary-lime/50 transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-[0_0_20px_rgba(198,255,61,0.25)] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-surface" />
            ) : (
              <>
                <Shield className="w-4 h-4 text-surface" />
                <span>{mode === "signin" ? "Authenticate" : "Register Credentials"}</span>
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-muted font-mono">
          <span>Row Level Security (RLS) Active</span>
          <span className="text-primary-lime">v4.8 Verified</span>
        </div>
      </div>
    </div>
  );
}
