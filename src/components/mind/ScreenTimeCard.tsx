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
    <div className="space-y-6 font-mono">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Daily Threshold & Category Distribution */}
        <div className="lg:col-span-8 space-y-6">
          {/* Daily Threshold Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-6 lg:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-on-surface">
                  {locale === "ar" ? "الحد اليومي للشاشة" : "Daily threshold"}
                </span>
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {locale === "ar" ? "الأقل أفضل" : "Lower is better"}
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-on-surface">
                    {Math.floor((log?.total_minutes || 222) / 60)} h {(log?.total_minutes || 222) % 60} m
                  </span>
                  <span className="text-xs text-text-muted">
                    of 4 h
                  </span>
                  <span className="text-xs text-text-muted ml-auto font-medium">
                    {Math.max(0, 240 - (log?.total_minutes || 222)) > 0
                      ? `${Math.max(0, 240 - (log?.total_minutes || 222))} min remaining until daily planned cap`
                      : "Daily cap reached"}
                  </span>
                </div>

                {/* Flat Progress Bar */}
                <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-primary-ink"
                    style={{ width: `${Math.min(100, Math.round(((log?.total_minutes || 222) / 240) * 100))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>{Math.min(100, Math.round(((log?.total_minutes || 222) / 240) * 100))}% cap reached</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-text-muted" />
                    <span>{locale === "ar" ? "تحديث منذ قليل" : "Updated 6 minutes ago"}</span>
                  </span>
                </div>

                {/* Actions */}
                <div className="pt-2">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-primary-ink text-on-primary font-bold text-xs hover:brightness-110 cursor-pointer transition-all shadow-xs flex items-center gap-2"
                  >
                    <span>+</span>
                    <span>{locale === "ar" ? "تسجيل وقت الشاشة للنهاردة" : "Log today's screen time"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Category Distribution Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>{locale === "ar" ? "توزيع الفئات" : "Category distribution"}</span>
              </h4>
              <span className="text-[10px] text-text-muted">
                {locale === "ar" ? "النهاردة" : "Today"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle">
                <span className="text-[10px] text-text-muted block">
                  {locale === "ar" ? "الإنتاجية والمذاكرة" : "Productivity & study"}
                </span>
                <span className="text-base font-bold text-on-surface mt-1 block">
                  {log?.productive_minutes ? formatMinutesToHours(log.productive_minutes) : "1 h 48 m"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle">
                <span className="text-[10px] text-text-muted block">
                  {locale === "ar" ? "التواصل والرسائل" : "Communication"}
                </span>
                <span className="text-base font-bold text-on-surface mt-1 block">1 h 12 m</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle">
                <span className="text-[10px] text-text-muted block">
                  {locale === "ar" ? "الترفيه والسوشيال" : "Entertainment & feeds"}
                </span>
                <span className="text-base font-bold text-on-surface mt-1 block">
                  {log?.entertainment_minutes ? formatMinutesToHours(log.entertainment_minutes) : "42 m"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Last 7 Days & Adherence */}
        <div className="lg:col-span-4 space-y-6">
          {/* Last 7 Days Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  {locale === "ar" ? "آخر 7 أيام" : "Last 7 days"}
                </h4>
                <p className="text-[10px] text-text-muted">
                  {locale === "ar" ? "مقارنة بالحد اليومي 4 ساعات" : "Historical intake relative to 4 h target"}
                </p>
              </div>
              <span className="text-[10px] text-text-muted text-right">
                <span className="block font-medium">3 h 31 m</span>
                <span className="text-[9px] opacity-75">{locale === "ar" ? "متوسط أسبوعي" : "Weekly average"}</span>
              </span>
            </div>

            {/* 7 Vertical Bars */}
            <div className="h-28 flex items-end justify-between gap-2 pt-2 border-b border-border-subtle pb-2">
              {[
                { day: "Fri", height: "70%", over: false },
                { day: "Sat", height: "45%", over: false },
                { day: "Sun", height: "92%", over: true },
                { day: "Mon", height: "78%", over: false },
                { day: "Tue", height: "66%", over: false },
                { day: "Wed", height: "80%", over: false },
                { day: "Now", height: "88%", active: true },
              ].map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className={`w-full rounded-xs transition-all ${
                      b.over
                        ? "bg-rose-500"
                        : b.active
                        ? "bg-primary-ink"
                        : "bg-blue-600/70"
                    }`}
                    style={{ height: b.height }}
                  />
                  <span className={`text-[9px] ${b.active ? "font-bold text-primary-ink" : "text-text-muted"}`}>
                    {b.day}
                  </span>
                </div>
              ))}
            </div>

            {/* Daily Listing */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between py-1 border-b border-border-subtle/40">
                <div>
                  <span className="font-semibold text-on-surface block">Today</span>
                  <span className="text-[10px] text-blue-600">In progress</span>
                </div>
                <span className="font-bold text-on-surface">3 h 42 m</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border-subtle/40">
                <div>
                  <span className="font-semibold text-on-surface block">Yesterday</span>
                  <span className="text-[10px] text-text-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Under limit</span>
                  </span>
                </div>
                <span className="font-bold text-on-surface">3 h 18 m</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border-subtle/40">
                <div>
                  <span className="font-semibold text-on-surface block">Monday</span>
                  <span className="text-[10px] text-text-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Under limit</span>
                  </span>
                </div>
                <span className="font-bold text-on-surface">3 h 55 m</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="font-semibold text-on-surface block">Sunday</span>
                  <span className="text-[10px] text-rose-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Over limit</span>
                  </span>
                </div>
                <span className="font-bold text-on-surface">4 h 15 m</span>
              </div>
            </div>
          </div>

          {/* Adherence Card */}
          <div className="bg-surface-container-lowest rounded-[20px] p-5 shadow-[0_8px_24px_rgba(40,50,120,0.06)] border border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-on-surface">
                {locale === "ar" ? "الالتزام بالحد الأسبوعي" : "Weekly threshold adherence"}
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-600">85.7%</span>
          </div>
        </div>
      </div>

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
