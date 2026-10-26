"use client";

import React, { useState, useEffect } from "react";
import { X, Moon, Star, Clock, AlertTriangle, Sparkles, Zap } from "lucide-react";
import { SleepEntry, calculateSleepDuration, getTypicalTimes } from "@/lib/sleep";
import { useI18n } from "@/lib/i18n/I18nContext";
import { formatTimeTo12h } from "@/lib/time";

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
  const { locale } = useI18n();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-md animate-fade-in">
      <div className="stitch-card p-6 w-full max-w-md space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/20 flex items-center justify-center text-secondary-cyan">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-on-surface">
                {editingEntry
                  ? locale === "ar"
                    ? "تعديل تسجيل النوم"
                    : "Edit Sleep Log"
                  : locale === "ar"
                  ? "تسجيل بيانات النوم"
                  : "Record Sleep Telemetry"}
              </h3>
              <p className="text-xs text-on-surface-variant font-mono">
                {locale === "ar" ? "قياسات الجسم والاستشفاء" : "Body & Recovery Telemetry"}
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
                <Zap className="w-3.5 h-3.5 text-secondary-cyan" />
                <span>
                  {locale === "ar" ? "إدخال سريع:" : "Fast entry:"} {formatTimeTo12h(typical.typicalBedtime, { locale })} &rarr; {formatTimeTo12h(typical.typicalWakeTime, { locale })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleFastPrefill}
                className="px-2.5 py-1 rounded-lg bg-secondary-cyan/10 hover:bg-secondary-cyan/20 text-secondary-cyan border border-secondary-cyan/30 text-xs font-bold transition-all cursor-pointer"
              >
                {locale === "ar" ? "زي العادة" : "Same as usual"}
              </button>
            </div>
          )}

          {/* Sleep Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5 text-start">
              <Clock className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "تاريخ الصحيان (الليلة المستهدفة)" : "Wake-up Date (Sleep Night Anchor)"}</span>
            </label>
            <input
              type="date"
              value={sleepDate}
              onChange={(e) => setSleepDate(e.target.value)}
              required
              className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-secondary-cyan"
            />
          </div>

          {/* Bedtime & Wake Time Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1 text-start">
                <Moon className="w-3 h-3 text-secondary-cyan" />
                <span>{locale === "ar" ? "وقت النوم" : "Bedtime"}</span>
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                required
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-secondary-cyan"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1 text-start">
                <Sparkles className="w-3 h-3 text-primary-lime" />
                <span>{locale === "ar" ? "وقت الصحيان" : "Wake Time"}</span>
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                required
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-secondary-cyan"
              />
            </div>
          </div>

          {/* Duration Preview Pill */}
          <div className="p-3 rounded-xl bg-surface-container-highest/70 border border-border-subtle flex items-center justify-between text-xs">
            <span className="text-text-muted">
              {locale === "ar" ? "مدة النوم المحسوبة:" : "Calculated Sleep Duration:"}
            </span>
            <span className={`font-bold ${durationCheck.isValid ? "text-secondary-cyan" : "text-crimson-alert"}`}>
              {durationCheck.durationFormatted}
            </span>
          </div>

          {/* Quality Rating (1 to 5 stars) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted text-start block">
              {locale === "ar" ? "جودة النوم والراحة (١ - ٥)" : "Perceived Quality / Restfulness (1-5)"}
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setQualityRating(star)}
                  className={`flex-1 py-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    (qualityRating || 0) >= star
                      ? "bg-secondary-cyan/15 border-secondary-cyan text-secondary-cyan"
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
              <label className="text-xs font-semibold text-text-muted text-start block">
                {locale === "ar" ? "مرات الصحيان" : "Awakenings"}
              </label>
              <select
                value={awakenings}
                onChange={(e) => setAwakenings(Number(e.target.value))}
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-secondary-cyan"
              >
                <option value={0}>{locale === "ar" ? "ولا مرة (نوم متواصل)" : "0 (Continuous)"}</option>
                <option value={1}>{locale === "ar" ? "مرة واحدة" : "1 awakening"}</option>
                <option value={2}>{locale === "ar" ? "مرتين" : "2 awakenings"}</option>
                <option value={3}>{locale === "ar" ? "٣ مرات" : "3 awakenings"}</option>
                <option value={4}>{locale === "ar" ? "٤+ مرات" : "4+ awakenings"}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted text-start block">
                {locale === "ar" ? "قيلولة نهارية (دقائق)" : "Daytime Nap (min)"}
              </label>
              <input
                type="number"
                min={0}
                max={240}
                value={napMinutes || ""}
                onChange={(e) => setNapMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-secondary-cyan"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted text-start block">
              {locale === "ar" ? "ملاحظات وتفاصيل (اختياري)" : "Context Notes (Optional)"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={locale === "ar" ? "مثلاً: مغنيسيوم، أوضة ساقعة، عشا خفيف" : "e.g. Magnesium taken, cold room, late dinner"}
              className="w-full bg-surface-container-highest border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-secondary-cyan"
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
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving || !durationCheck.isValid}
              className="px-5 py-2.5 rounded-xl bg-secondary-cyan hover:bg-secondary-cyan/90 text-on-primary font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {saving
                ? locale === "ar"
                  ? "جاري الحفظ..."
                  : "Saving..."
                : editingEntry
                ? locale === "ar"
                  ? "حفظ التعديلات"
                  : "Save Changes"
                : locale === "ar"
                ? "تسجيل النوم"
                : "Record Sleep Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
