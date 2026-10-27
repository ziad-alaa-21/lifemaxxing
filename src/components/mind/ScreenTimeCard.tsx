"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Loader2,
  Activity,
  Layers,
} from "lucide-react";
import {
  ScreenTimeLog,
  calculateScreenTimeBreakdown,
  validateScreenTimeInput,
  formatMinutesToHours,
} from "@/lib/screentime";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nContext";

interface ScreenTimeCardProps {
  selectedDate: string;
  onScreenTimeUpdated?: () => void;
}

export function ScreenTimeCard({
  selectedDate,
  onScreenTimeUpdated,
}: ScreenTimeCardProps) {
  const { locale } = useI18n();
  const [log, setLog] = useState<ScreenTimeLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form inputs
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [prodMinutes, setProdMinutes] = useState<string>("");
  const [entMinutes, setEntMinutes] = useState<string>("");
  const [pickups, setPickups] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load screen time log for selectedDate
  useEffect(() => {
    async function loadData() {
      if (!selectedDate) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("screen_time_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null)
          .maybeSingle();

        if (data) {
          const l = data as ScreenTimeLog;
          setLog(l);
          const total = l.total_minutes || 0;
          setHours(String(Math.floor(total / 60)));
          setMinutes(String(total % 60));
          setProdMinutes(String(l.productive_minutes || ""));
          setEntMinutes(String(l.entertainment_minutes || ""));
          setPickups(l.pickups_count !== null && l.pickups_count !== undefined ? String(l.pickups_count) : "");
          setNotes(l.notes || "");
        } else {
          setLog(null);
          setHours("");
          setMinutes("");
          setProdMinutes("");
          setEntMinutes("");
          setPickups("");
          setNotes("");
        }
      } catch (err) {
        console.warn("Could not load screen time:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDate]);

  const handleSave = async () => {
    setErrorMsg(null);
    const totalMin = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    const pMin = Number(prodMinutes) || 0;
    const eMin = Number(entMinutes) || 0;
    const pCount = pickups.trim() ? Number(pickups) : null;

    const validation = validateScreenTimeInput(totalMin, pMin, eMin, pCount);
    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid screen time");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        logged_date: selectedDate,
        total_minutes: totalMin,
        productive_minutes: pMin,
        entertainment_minutes: eMin,
        pickups_count: pCount,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("screen_time_logs")
        .upsert(payload, { onConflict: "user_id,logged_date" })
        .select()
        .single();

      if (error) throw error;

      setLog(data as ScreenTimeLog);
      setIsModalOpen(false);
      if (onScreenTimeUpdated) onScreenTimeUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save screen time");
    } finally {
      setSaving(false);
    }
  };

  const breakdown = log ? calculateScreenTimeBreakdown(log) : null;

  return (
    <div className="stitch-card p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary-cyan/10 border border-secondary-cyan/30 flex items-center justify-center text-secondary-cyan">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "متابعة وقت الشاشة" : "Screen Time Telemetry"}
            </h3>
            <p className="text-[10px] font-mono text-on-surface-variant">
              {locale === "ar" ? "تسجيل يومي يدوي" : "Manual daily input"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {breakdown ? (
            <span className="text-xs font-mono font-bold text-secondary-cyan px-2.5 py-1 rounded-full bg-secondary-cyan/10 border border-secondary-cyan/20">
              {breakdown.totalFormatted}
            </span>
          ) : (
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded-full bg-surface-container-low border border-border-subtle">
              {locale === "ar" ? "مفيش تسجيل النهاردة" : "No log today"}
            </span>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle font-mono text-xs text-on-surface cursor-pointer transition-colors"
          >
            {log
              ? locale === "ar" ? "تعديل التسجيل" : "Edit Log"
              : locale === "ar" ? "سجل النهاردة" : "Log Today"}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        </div>
      ) : breakdown ? (
        <div className="space-y-3 font-mono">
          {/* Ratio bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary-ink font-medium">
                {locale === "ar"
                  ? `${breakdown.productivePct}% إنتاجي (${formatMinutesToHours(breakdown.productiveMinutes)})`
                  : `${breakdown.productivePct}% Productive (${formatMinutesToHours(breakdown.productiveMinutes)})`}
              </span>
              <span className="text-amber-core font-medium">
                {locale === "ar"
                  ? `${breakdown.entertainmentPct}% ترفيه وسوشيال (${formatMinutesToHours(breakdown.entertainmentMinutes)})`
                  : `${breakdown.entertainmentPct}% Entertainment (${formatMinutesToHours(breakdown.entertainmentMinutes)})`}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden flex">
              <div
                className="h-full bg-primary-ink transition-all duration-500"
                style={{ width: `${breakdown.productivePct}%` }}
                title={`Productive: ${breakdown.productivePct}%`}
              />
              <div
                className="h-full bg-amber-core transition-all duration-500"
                style={{ width: `${breakdown.entertainmentPct}%` }}
                title={`Entertainment: ${breakdown.entertainmentPct}%`}
              />
              <div
                className="h-full bg-text-muted/30 transition-all duration-500"
                style={{ width: `${breakdown.neutralPct}%` }}
                title={`Neutral/Other: ${breakdown.neutralPct}%`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle">
              <div className="text-[10px] uppercase text-text-muted">
                {locale === "ar" ? "معدل التوازن" : "Balance Ratio"}
              </div>
              <div className="font-bold text-on-surface mt-0.5">{breakdown.ratioLabel}</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle">
              <div className="text-[10px] uppercase text-text-muted">
                {locale === "ar" ? "مرات فتح الموبايل" : "Phone Pickups"}
              </div>
              <div className="font-bold text-on-surface mt-0.5">
                {breakdown.pickupsCount !== null
                  ? locale === "ar" ? `${breakdown.pickupsCount} مرة` : `${breakdown.pickupsCount} times`
                  : locale === "ar" ? "لم يُسجل" : "Not recorded"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-surface-container-low border border-dashed border-border-subtle text-center space-y-2">
          <p className="text-xs font-mono text-text-muted">
            {locale === "ar" ? "مفيش وقت شاشة متسجل للنهاردة لسه." : "No screen time logged for today."}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-secondary-cyan/15 border border-secondary-cyan/30 text-secondary-cyan font-mono text-xs font-bold hover:bg-secondary-cyan/25 cursor-pointer transition-colors"
          >
            {locale === "ar" ? "+ سجل وقت الشاشة" : "+ Log Screen Time"}
          </button>
        </div>
      )}

      {/* MANUAL SCREEN TIME ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl p-6 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-secondary-cyan" />
                <h3 className="text-sm font-bold text-on-surface">
                  {locale === "ar" ? "تسجيل وقت الشاشة يدويًا" : "Manual Screen Time Entry"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-crimson-alert/10 border border-crimson-alert/30 text-crimson-alert text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              {/* Total Time Inputs */}
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "إجمالي وقت الشاشة" : "Total Screen Time"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low border border-border-subtle">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-on-surface focus:outline-none text-start"
                    />
                    <span className="text-text-muted">{locale === "ar" ? "ساعات" : "hours"}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low border border-border-subtle">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-on-surface focus:outline-none text-start"
                    />
                    <span className="text-text-muted">{locale === "ar" ? "دقائق" : "mins"}</span>
                  </div>
                </div>
              </div>

              {/* Productive Minutes */}
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "الوقت الإنتاجي / شغل ومذاكرة (دقائق)" : "Productive / Work Focus (Minutes)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={prodMinutes}
                  onChange={(e) => setProdMinutes(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: 150" : "e.g. 150"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-secondary-cyan text-start"
                />
              </div>

              {/* Entertainment Minutes */}
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "وقت السوشيال ميديا والترفيه (دقائق)" : "Entertainment / Social (Minutes)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={entMinutes}
                  onChange={(e) => setEntMinutes(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: 60" : "e.g. 60"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-secondary-cyan text-start"
                />
              </div>

              {/* Pickups */}
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "عدد مرات فتح القفل (اختياري)" : "Device Pickups (Optional)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={pickups}
                  onChange={(e) => setPickups(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: 45" : "e.g. 45"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-secondary-cyan text-start"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-on-surface cursor-pointer"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (!hours && !minutes)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-secondary-cyan text-on-primary hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{locale === "ar" ? "حفظ وقت الشاشة" : "Save Telemetry"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
