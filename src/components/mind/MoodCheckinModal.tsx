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
  AlertCircle,
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
import { useI18n } from "@/lib/i18n/I18nContext";

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
  const { locale } = useI18n();
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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const checkinPayload = {
        user_id: user.id,
        logged_date: selectedDate,
        period,
        mood_score: moodScore,
        energy_score: energyScore,
        focus_score: focusScore,
        context_tags: selectedTags,
        notes: notes.trim() || null,
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Save checkin failed:", msg);
      // FAKE SUCCESS BUG FIX: show real error banner to user, never emit fake local_ id or close modal
      setErrorMessage(`Failed to save check-in: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40">
      <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-core/10 border border-amber-core/30 flex items-center justify-center text-amber-core">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-on-surface">
                {locale === "ar" ? "تسجيل الحالة والمزاج" : "Mood & Energy Check-in"}
              </h2>
              <p className="text-[11px] font-mono text-on-surface-variant">
                {locale === "ar" ? "معايرة نشاطك وحالتك النفسية" : "Daily state calibration"}
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
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block text-start">
              {locale === "ar" ? "وقت التسجيل" : "Time Period"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "morning", label: locale === "ar" ? "الصبح" : "Morning", icon: Sun },
                { id: "midday", label: locale === "ar" ? "الظهر" : "Midday", icon: Sunset },
                { id: "evening", label: locale === "ar" ? "بالليل" : "Evening", icon: Moon },
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
              <span className="text-text-muted">{locale === "ar" ? "بيانات تلقائية:" : "Auto-detected context:"}</span>
              <div className="flex items-center gap-2 text-primary-lime font-medium">
                {autoContext.sleepHours ? (
                  <span>{locale === "ar" ? `${autoContext.sleepHours} س نوم` : `${autoContext.sleepHours}h sleep`}</span>
                ) : null}
                {autoContext.caffeineMg ? (
                  <span>{locale === "ar" ? `${autoContext.caffeineMg} مجم كافيين` : `${autoContext.caffeineMg}mg caffeine`}</span>
                ) : null}
                {!autoContext.sleepHours && !autoContext.caffeineMg ? (
                  <span className="text-text-muted">
                    {locale === "ar" ? "مفيش بيانات اتسجلت للنهاردة لسه" : "No telemetry logged today"}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {/* Mood Rating */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-on-surface">{locale === "ar" ? "المزاج" : "Mood"}</label>
              <span className="text-xs font-mono font-bold text-amber-core">
                {locale === "ar"
                  ? moodScore === 1 ? "منهك / متضايق" : moodScore === 2 ? "قليل" : moodScore === 3 ? "متوسط" : moodScore === 4 ? "كويس وتمام" : "ممتاز جداً"
                  : RATING_LABELS[moodScore]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setMoodScore(val)}
                  className={`py-2 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                    moodScore === val
                      ? "bg-amber-core text-on-primary border-amber-core"
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
              <label className="text-xs font-mono text-on-surface">{locale === "ar" ? "مستوى النشاط والطاقة" : "Energy Level"}</label>
              <span className="text-xs font-mono font-bold text-amber-core">
                {locale === "ar"
                  ? energyScore === 1 ? "طاقة منعدمة" : energyScore === 2 ? "كسلان" : energyScore === 3 ? "طاقة متوسطة" : energyScore === 4 ? "نشيط" : "طاقة خارقة"
                  : RATING_LABELS[energyScore]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setEnergyScore(val)}
                  className={`py-2 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                    energyScore === val
                      ? "bg-amber-core text-on-primary border-amber-core"
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
              <label className="text-xs font-mono text-on-surface">{locale === "ar" ? "التركيز الذهني" : "Cognitive Focus"}</label>
              <span className="text-xs font-mono font-bold text-amber-core">
                {locale === "ar"
                  ? focusScore === 1 ? "مشتت تمامًا" : focusScore === 2 ? "تركيز ضعيف" : focusScore === 3 ? "تركيز معقول" : focusScore === 4 ? "حاضر ومركز" : "تركيز فائق"
                  : RATING_LABELS[focusScore]}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setFocusScore(val)}
                  className={`py-2 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                    focusScore === val
                      ? "bg-amber-core text-on-primary border-amber-core"
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
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block text-start">
              {locale === "ar" ? "عوامل وظروف إضافية (اختياري)" : "External Context (Non-Measurable)"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXTERNAL_CONTEXT_TAGS.map((tag) => {
                const arTagMap: Record<string, string> = {
                  "Poor Sleep": "نوم قليل ومتقطع",
                  "High Caffeine": "كافيين عالي",
                  "Workout Soreness": "وجع عضلات من التمرين",
                  "Academic Stress": "ضغط مذاكرة / امتحانات",
                  "Fasting": "صيام",
                  "Deep Work Win": "إنجاز شغل مهم",
                };
                const displayTag = locale === "ar" ? (arTagMap[tag] || tag) : tag;
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
                    {displayTag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block text-start">
              {locale === "ar" ? "ملاحظات إضافية (اختياري)" : "Notes (Optional)"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={locale === "ar" ? "اكتب أي تفاصيل سريعة عن يومك..." : "Brief context or thoughts..."}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-border-subtle text-xs text-on-surface font-mono placeholder:text-text-muted focus:outline-none focus:border-primary-lime/50 transition-colors resize-none text-start"
            />
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-border-subtle flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
            <p className="text-[10px] text-text-muted font-mono leading-relaxed text-start">
              {locale === "ar"
                ? "بياناتك متخزنة بأمان وخاصة بيك بالكامل ومش بنشاركها مع أي طرف تالت."
                : PRIVACY_DISCLAIMER}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-crimson-alert/15 border border-crimson-alert/30 text-crimson-alert flex items-start gap-2.5 font-mono text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 text-start">
                <span className="font-bold block">Save Error:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-primary-lime text-on-primary font-mono font-bold text-sm uppercase tracking-wider hover:bg-primary-lime-dim shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{locale === "ar" ? "حفظ تسجيل الحالة" : "Save Check-in"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
