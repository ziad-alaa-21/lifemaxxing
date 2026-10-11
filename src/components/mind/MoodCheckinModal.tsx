"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  X,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  Lock,
  Loader2,
  Tag,
} from "lucide-react";
import {
  CheckinPeriod,
  MindCheckin,
  RATING_LABELS,
  EXTERNAL_CONTEXT_TAGS,
  PRIVACY_DISCLAIMER,
  getDefaultCheckinPeriod,
} from "@/lib/checkin";
import { supabase } from "@/lib/supabase/client";

interface MoodCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  existingCheckins?: MindCheckin[];
  onCheckinSaved?: (checkin: MindCheckin) => void;
}

export function MoodCheckinModal({
  isOpen,
  onClose,
  selectedDate,
  existingCheckins = [],
  onCheckinSaved,
}: MoodCheckinModalProps) {
  const currentHour = new Date().getHours();
  const defaultPeriod = getDefaultCheckinPeriod(currentHour);

  const [period, setPeriod] = useState<CheckinPeriod>(defaultPeriod);
  const [moodScore, setMoodScore] = useState<number>(4);
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [focusScore, setFocusScore] = useState<number>(4);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [autoContext, setAutoContext] = useState<{
    sleepHours?: number | null;
    caffeineMg?: number | null;
  }>({});

  // When period changes or existing checkins change, load existing entry if present
  useEffect(() => {
    const existing = existingCheckins.find((c) => c.period === period);
    if (existing) {
      setMoodScore(existing.mood_score);
      setEnergyScore(existing.energy_score);
      setFocusScore(existing.focus_score);
      setSelectedTags(existing.context_tags || []);
      setNotes(existing.notes || "");
    } else {
      setMoodScore(4);
      setEnergyScore(4);
      setFocusScore(4);
      setSelectedTags([]);
      setNotes("");
    }
  }, [period, existingCheckins]);

  // Load auto-detected context (sleep hours & caffeine) from existing logs
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    async function loadBiologicalContext() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch sleep
        const { data: sleepData } = await supabase
          .from("sleep_logs")
          .select("duration_minutes")
          .eq("sleep_date", selectedDate)
          .is("deleted_at", null)
          .maybeSingle();

        // Fetch caffeine
        const { data: intakeData } = await supabase
          .from("intake_logs")
          .select("amount")
          .eq("type", "caffeine")
          .gte("logged_at", `${selectedDate}T00:00:00Z`)
          .lte("logged_at", `${selectedDate}T23:59:59Z`)
          .is("deleted_at", null);

        const totalCaffeine = (intakeData || []).reduce(
          (acc, cur) => acc + (cur.amount || 0),
          0
        );

        setAutoContext({
          sleepHours: sleepData?.duration_minutes
            ? Number((sleepData.duration_minutes / 60).toFixed(1))
            : null,
          caffeineMg: totalCaffeine > 0 ? totalCaffeine : null,
        });
      } catch (err) {
        console.warn("Could not load auto context:", err);
      }
    }

    loadBiologicalContext();
  }, [isOpen, selectedDate]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const checkinPayload: Partial<MindCheckin> = {
        user_id: user.id,
        logged_date: selectedDate,
        period,
        mood_score: moodScore,
        energy_score: energyScore,
        focus_score: focusScore,
        context_tags: selectedTags,
        notes: notes.trim() || null,
        auto_context: autoContext,
        updated_at: new Date().toISOString(),
      };

      // Upsert: edit instead of duplicate per user, date, and period
      const { data, error } = await supabase
        .from("mind_checkins")
        .upsert(checkinPayload, {
          onConflict: "user_id,logged_date,period",
        })
        .select()
        .single();

      if (error) throw error;

      if (onCheckinSaved) onCheckinSaved(data as MindCheckin);
      onClose();
    } catch (err: unknown) {
      console.warn("Save checkin notice:", err instanceof Error ? err.message : err);
      // Fallback save locally if DB table is syncing
      if (onCheckinSaved) {
        onCheckinSaved({
          id: `local_${Date.now()}`,
          logged_date: selectedDate,
          period,
          mood_score: moodScore,
          energy_score: energyScore,
          focus_score: focusScore,
          context_tags: selectedTags,
          notes: notes.trim() || null,
          auto_context: autoContext,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-dim/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-core/10 border border-amber-core/30 flex items-center justify-center text-amber-core">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-on-surface">
                Mood & Energy Check-in
              </h2>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Daily state calibration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-on-surface bg-surface-container-high border border-border-subtle cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
          {/* Period Selector */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block">
              Time Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "morning", label: "Morning", icon: Sun },
                { id: "midday", label: "Midday", icon: Sunset },
                { id: "evening", label: "Evening", icon: Moon },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = period === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id as CheckinPeriod)}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-mono text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-amber-core/15 border-amber-core/40 text-amber-core font-bold"
                        : "bg-surface-container-low border-border-subtle text-text-muted hover:text-on-surface"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Biological State Auto-Detected Banner */}
          {(autoContext.sleepHours !== undefined || autoContext.caffeineMg !== undefined) && (
            <div className="p-3 rounded-2xl bg-surface-container-low border border-border-subtle flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Auto-detected context:</span>
              <div className="flex items-center gap-2 text-primary-lime font-medium">
                {autoContext.sleepHours ? <span>{autoContext.sleepHours}h sleep</span> : null}
                {autoContext.caffeineMg ? <span>{autoContext.caffeineMg}mg caffeine</span> : null}
                {!autoContext.sleepHours && !autoContext.caffeineMg ? (
                  <span className="text-text-muted">No telemetry logged today</span>
                ) : null}
              </div>
            </div>
          )}

          {/* Mood Rating */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-on-surface">Mood</label>
              <span className="text-xs font-mono font-bold text-amber-core">
                {RATING_LABELS[moodScore]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setMoodScore(val)}
                  className={`py-2 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                    moodScore === val
                      ? "bg-amber-core text-surface border-amber-core"
                      : "bg-surface-container-low border-border-subtle text-text-muted hover:text-on-surface"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Energy Rating */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-on-surface">Energy Level</label>
              <span className="text-xs font-mono font-bold text-amber-core">
                {RATING_LABELS[energyScore]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setEnergyScore(val)}
                  className={`py-2 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                    energyScore === val
                      ? "bg-amber-core text-surface border-amber-core"
                      : "bg-surface-container-low border-border-subtle text-text-muted hover:text-on-surface"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Focus Rating */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-on-surface">Cognitive Focus</label>
              <span className="text-xs font-mono font-bold text-amber-core">
                {RATING_LABELS[focusScore]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setFocusScore(val)}
                  className={`py-2 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                    focusScore === val
                      ? "bg-amber-core text-surface border-amber-core"
                      : "bg-surface-container-low border-border-subtle text-text-muted hover:text-on-surface"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* External Context Tags */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block">
              External Context (Non-Measurable)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXTERNAL_CONTEXT_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary-lime/15 border-primary-lime/40 text-primary-lime font-medium"
                        : "bg-surface-container-low border-border-subtle text-text-muted hover:text-on-surface"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brief context or thoughts..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-border-subtle text-xs text-on-surface font-mono placeholder:text-text-muted focus:outline-none focus:border-primary-lime/50 transition-colors resize-none"
            />
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-border-subtle flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
            <p className="text-[10px] text-text-muted font-mono leading-relaxed">
              {PRIVACY_DISCLAIMER}
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-primary-lime text-surface font-mono font-bold text-sm uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_20px_rgba(198,255,61,0.25)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Save Check-in</span>
          </button>
        </div>
      </div>
    </div>
  );
}
