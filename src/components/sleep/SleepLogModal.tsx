"use client";

import React, { useState, useEffect } from "react";
import { X, Moon, Star, Clock, AlertTriangle, Sparkles, Zap } from "lucide-react";
import { SleepEntry, calculateSleepDuration, getTypicalTimes } from "@/lib/sleep";

interface SleepLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    sleep_date: string;
    bedtime: string;
    wake_time: string;
    quality_rating: number | null;
    awakenings_count: number;
    nap_minutes: number;
    notes: string;
  }) => Promise<void>;
  editingEntry?: SleepEntry | null;
  recentEntries: SleepEntry[];
}

export function SleepLogModal({
  isOpen,
  onClose,
  onSave,
  editingEntry,
  recentEntries,
}: SleepLogModalProps) {
  const [sleepDate, setSleepDate] = useState("");
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [qualityRating, setQualityRating] = useState<number | null>(4);
  const [awakenings, setAwakenings] = useState(0);
  const [napMinutes, setNapMinutes] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typical = getTypicalTimes(recentEntries);

  useEffect(() => {
    if (editingEntry) {
      setSleepDate(editingEntry.sleep_date);
      const b = new Date(editingEntry.bedtime);
      const w = new Date(editingEntry.wake_time);
      setBedtime(`${b.getHours().toString().padStart(2, "0")}:${b.getMinutes().toString().padStart(2, "0")}`);
      setWakeTime(`${w.getHours().toString().padStart(2, "0")}:${w.getMinutes().toString().padStart(2, "0")}`);
      setQualityRating(editingEntry.quality_rating ?? null);
      setAwakenings(editingEntry.awakenings_count || 0);
      setNapMinutes(editingEntry.nap_minutes || 0);
      setNotes(editingEntry.notes || "");
    } else {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setSleepDate(dateStr);
      setBedtime(typical.typicalBedtime);
      setWakeTime(typical.typicalWakeTime);
      setQualityRating(4);
      setAwakenings(0);
      setNapMinutes(0);
      setNotes("");
    }
    setError(null);
  }, [editingEntry, isOpen]);

  if (!isOpen) return null;

  // Build full ISO strings for calculation & submission
  const getIsoTimestamps = () => {
    const [bedH, bedM] = bedtime.split(":").map(Number);
    const [wakeH, wakeM] = wakeTime.split(":").map(Number);

    // Bedtime base date (the evening before sleepDate, or same day if bedtime is early morning)
    const wakeDateObj = new Date(`${sleepDate}T12:00:00Z`);
    wakeDateObj.setUTCHours(wakeH, wakeM, 0, 0);

    const bedDateObj = new Date(`${sleepDate}T12:00:00Z`);
    if (bedH >= 12) {
      // e.g. 23:00 is previous night
      bedDateObj.setUTCDate(bedDateObj.getUTCDate() - 1);
    }
    bedDateObj.setUTCHours(bedH, bedM, 0, 0);

    return {
      bedIso: bedDateObj.toISOString(),
      wakeIso: wakeDateObj.toISOString(),
    };
  };

  const { bedIso, wakeIso } = getIsoTimestamps();
  const durationCheck = calculateSleepDuration(bedIso, wakeIso);

  const handleFastPrefill = () => {
    setBedtime(typical.typicalBedtime);
    setWakeTime(typical.typicalWakeTime);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!durationCheck.isValid) {
      setError(durationCheck.error || "Invalid sleep duration");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: editingEntry?.id,
        sleep_date: sleepDate,
        bedtime: bedIso,
        wake_time: wakeIso,
        quality_rating: qualityRating,
        awakenings_count: awakenings,
        nap_minutes: Number(napMinutes) || 0,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record sleep log";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-container rounded-3xl p-6 border border-border-subtle w-full max-w-md space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 flex items-center justify-center text-[#7DD3FC]">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-on-surface">
                {editingEntry ? "Edit Sleep Log" : "Record Sleep Telemetry"}
              </h3>
              <p className="text-xs text-on-surface-variant font-mono">
                Body & Recovery Telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-container-high text-text-muted hover:text-on-surface transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-crimson-alert/10 border border-crimson-alert/30 text-crimson-alert text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          {/* Fast Entry Button ("Same as usual") */}
          {!editingEntry && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high/80 border border-border-subtle">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Zap className="w-3.5 h-3.5 text-[#7DD3FC]" />
                <span>Fast entry: {typical.typicalBedtime} → {typical.typicalWakeTime}</span>
              </div>
              <button
                type="button"
                onClick={handleFastPrefill}
                className="px-2.5 py-1 rounded-lg bg-[#7DD3FC]/10 hover:bg-[#7DD3FC]/20 text-[#7DD3FC] border border-[#7DD3FC]/30 text-xs font-bold transition-all cursor-pointer"
              >
                Same as usual
              </button>
            </div>
          )}

          {/* Sleep Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Wake-up Date (Sleep Night Anchor)</span>
            </label>
            <input
              type="date"
              value={sleepDate}
              onChange={(e) => setSleepDate(e.target.value)}
              required
              className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-[#7DD3FC]"
            />
          </div>

          {/* Bedtime & Wake Time Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1">
                <Moon className="w-3 h-3 text-[#7DD3FC]" />
                <span>Bedtime</span>
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                required
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-[#7DD3FC]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary-lime" />
                <span>Wake Time</span>
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                required
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-[#7DD3FC]"
              />
            </div>
          </div>

          {/* Duration Preview Pill */}
          <div className="p-3 rounded-xl bg-surface-container-highest/70 border border-border-subtle flex items-center justify-between text-xs">
            <span className="text-text-muted">Calculated Sleep Duration:</span>
            <span className={`font-bold ${durationCheck.isValid ? "text-[#7DD3FC]" : "text-crimson-alert"}`}>
              {durationCheck.durationFormatted}
            </span>
          </div>

          {/* Quality Rating (1 to 5 stars) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              Perceived Quality / Restfulness (1-5)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setQualityRating(star)}
                  className={`flex-1 py-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    (qualityRating || 0) >= star
                      ? "bg-[#7DD3FC]/15 border-[#7DD3FC] text-[#7DD3FC]"
                      : "bg-surface-container-highest border-border-subtle text-text-muted hover:text-on-surface"
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Awakenings & Daytime Naps Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">
                Awakenings
              </label>
              <select
                value={awakenings}
                onChange={(e) => setAwakenings(Number(e.target.value))}
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-[#7DD3FC]"
              >
                <option value={0}>0 (Continuous)</option>
                <option value={1}>1 awakening</option>
                <option value={2}>2 awakenings</option>
                <option value={3}>3 awakenings</option>
                <option value={4}>4+ awakenings</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">
                Daytime Nap (min)
              </label>
              <input
                type="number"
                min={0}
                max={240}
                value={napMinutes || ""}
                onChange={(e) => setNapMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-[#7DD3FC]"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              Context Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Magnesium taken, cold room, late dinner"
              className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-[#7DD3FC]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-border-subtle text-xs text-text-muted hover:text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !durationCheck.isValid}
              className="px-5 py-2.5 rounded-xl bg-[#7DD3FC] hover:bg-[#7DD3FC]/90 text-charcoal-dark font-bold text-xs transition-all shadow-[0_0_15px_rgba(125,211,252,0.3)] disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {saving ? "Saving..." : editingEntry ? "Save Changes" : "Record Sleep Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
