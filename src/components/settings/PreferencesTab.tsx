"use client";

import React, { useState } from "react";
import {
  Sliders,
  Globe,
  Languages,
  Volume2,
  Vibrate,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  UserProfile,
  UserSettings,
  WeightUnit,
  AppLocale,
  FocusMode,
  TIMEZONE_OPTIONS,
  TIMEZONE_WARNING,
  saveUserProfileRow,
  saveUserSettingsRow,
} from "@/lib/settings";
import { supabase } from "@/lib/supabase/client";

interface PreferencesTabProps {
  initialProfile: UserProfile | null;
  initialSettings: UserSettings | null;
  onRefresh: () => void;
}

export function PreferencesTab({
  initialProfile,
  initialSettings,
  onRefresh,
}: PreferencesTabProps) {
  // Profiles preferences
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    initialProfile?.weight_unit ?? "kg"
  );
  const [timezone, setTimezone] = useState<string>(
    initialProfile?.timezone ?? "UTC"
  );
  const [locale, setLocale] = useState<AppLocale>(
    initialProfile?.locale ?? "en"
  );

  // UserSettings preferences
  const [focusMode, setFocusMode] = useState<FocusMode>(
    initialSettings?.default_focus_mode ?? "sprint_50"
  );
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(
    initialSettings?.sound_chime_enabled ?? true
  );
  const [volume, setVolume] = useState<number>(
    initialSettings?.sound_volume ?? 80
  );
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(
    initialSettings?.vibration_enabled ?? true
  );
  const [hideAdherence, setHideAdherence] = useState<boolean>(
    initialSettings?.hide_adherence_scores ?? false
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Web Audio synth chime test
  const playTestChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(528, ctx.currentTime); // Solfeggio 528 Hz DNA repair / clarity chime
      gain.gain.setValueAtTime((volume / 100) * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  };

  const testVibration = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialProfile?.id) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Save to profiles
      await saveUserProfileRow(supabase, initialProfile.id, {
        weight_unit: weightUnit,
        timezone: timezone,
        locale: locale,
      });

      // 2. Save to user_settings
      await saveUserSettingsRow(supabase, initialProfile.id, {
        default_focus_mode: focusMode,
        sound_chime_enabled: chimeEnabled,
        sound_volume: volume,
        vibration_enabled: vibrationEnabled,
        hide_adherence_scores: hideAdherence,
      });

      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSavePreferences} className="space-y-6">
      {/* Units & Localization */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <Globe className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Units & Localization</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Weight Display Unit</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setWeightUnit("kg")}
                className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  weightUnit === "kg"
                    ? "bg-primary-lime text-surface shadow-[0_0_12px_rgba(198,255,61,0.2)]"
                    : "bg-surface-container-low border border-border-subtle text-on-surface"
                }`}
              >
                kg (Metric)
              </button>
              <button
                type="button"
                onClick={() => setWeightUnit("lbs")}
                className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  weightUnit === "lbs"
                    ? "bg-primary-lime text-surface shadow-[0_0_12px_rgba(198,255,61,0.2)]"
                    : "bg-surface-container-low border border-border-subtle text-on-surface"
                }`}
              >
                lbs (Imperial)
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-1.5">
              Converted on every screen (Weight, Lift Rank, Workouts, Nutrition).
            </p>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">Timezone (IANA)</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted mt-1.5">
              Controls your daily 00:00 midnight calendar grouping.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">App Language</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as AppLocale)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="en">English (LTR)</option>
              <option value="ar">العربية (Arabic - RTL)</option>
            </select>
            <p className="text-[10px] text-text-muted mt-1.5">
              Supports bidirectional layout direction.
            </p>
          </div>
        </div>

        {/* Timezone Regrouping Warning Banner */}
        <div className="p-3 bg-amber-core/10 border border-amber-core/20 rounded-xl flex items-start gap-2.5 text-xs font-mono text-amber-core">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{TIMEZONE_WARNING}</div>
        </div>
      </div>

      {/* Focus Timer & Feedback Preferences */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <Sliders className="w-4 h-4 text-tertiary-purple" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Feedback & Timer Presets</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              Default Focus Mode Preset
            </label>
            <select
              value={focusMode}
              onChange={(e) => setFocusMode(e.target.value as FocusMode)}
              className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
            >
              <option value="sprint_50">Sprint 50/10 (50m Work, 10m Break)</option>
              <option value="ultradian_90">Ultradian 90/20 (90m Work, 20m Break)</option>
              <option value="pomodoro_25">Classic Pomodoro 25/5 (25m Work, 5m Break)</option>
              <option value="custom">Custom Duration</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-text-muted uppercase">
                Harmonic Audio Chime
              </label>
              <button
                type="button"
                onClick={playTestChime}
                className="text-[11px] font-mono text-primary-lime hover:underline cursor-pointer"
              >
                Play Test Chime
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="chimeToggle"
                checked={chimeEnabled}
                onChange={(e) => setChimeEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-lime cursor-pointer"
              />
              <label htmlFor="chimeToggle" className="text-xs font-mono text-on-surface cursor-pointer">
                Play soft chime on interval complete
              </label>
            </div>
            {chimeEnabled && (
              <div className="mt-2.5 flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                  className="w-full accent-primary-lime"
                />
                <span className="text-xs font-mono text-text-muted w-8 text-right">{volume}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-text-muted uppercase">
                Haptic Vibration
              </label>
              <button
                type="button"
                onClick={testVibration}
                className="text-[11px] font-mono text-tertiary-purple hover:underline cursor-pointer"
              >
                Test Vibration
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="vibToggle"
                checked={vibrationEnabled}
                onChange={(e) => setVibrationEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-lime cursor-pointer"
              />
              <label htmlFor="vibToggle" className="text-xs font-mono text-on-surface cursor-pointer">
                Vibrate on interval complete and rest timer
              </label>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted uppercase">
              Adherence Score Display
            </label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="adherenceToggle"
                checked={hideAdherence}
                onChange={(e) => setHideAdherence(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-lime cursor-pointer"
              />
              <label htmlFor="adherenceToggle" className="text-xs font-mono text-on-surface cursor-pointer">
                Hide percentage badges on meal adherence
              </label>
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl text-xs font-mono text-crimson-alert">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-success/10 border border-emerald-success/20 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-primary-lime text-surface text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.25)] cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </form>
  );
}
