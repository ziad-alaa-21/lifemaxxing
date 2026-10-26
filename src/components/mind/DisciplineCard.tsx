"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Settings,
  X,
  Loader2,
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  DisciplineCommitment,
  DisciplineDailyLog,
  DisciplineSnapshotItem,
  DISCIPLINE_SUGGESTIONS,
  createDisciplineDailySnapshot,
  formatDisciplineProgress,
} from "@/lib/discipline";
import { supabase } from "@/lib/supabase/client";
import { feedbackManager } from "@/lib/telemetryFeedback";
import { useI18n } from "@/lib/i18n/I18nContext";

interface DisciplineCardProps {
  selectedDate: string;
}

export function DisciplineCard({ selectedDate }: DisciplineCardProps) {
  const { locale } = useI18n();
  const [commitments, setCommitments] = useState<DisciplineCommitment[]>([]);
  const [dailyLog, setDailyLog] = useState<DisciplineDailyLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isManageOpen, setIsManageOpen] = useState<boolean>(false);
  const [newText, setNewText] = useState<string>("");
  const [savingLog, setSavingLog] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline_draft" | "error">("synced");
  const [syncError, setSyncError] = useState<string | null>(null);

  const STORAGE_COMM_KEY = "lifemaxxing_discipline_commitments";
  const getLogKey = (date: string) => `lifemaxxing_discipline_log_${date}`;

  // Load commitments and today's log (optimistic local first, then remote sync)
  useEffect(() => {
    async function loadData() {
      if (!selectedDate) {
        setLoading(false);
        return;
      }
      setLoading(true);
      let activeComm: DisciplineCommitment[] = [];

      // 1. Immediately hydrate from localStorage for instantaneous response
      if (typeof window !== "undefined") {
        try {
          const cachedComm = localStorage.getItem(STORAGE_COMM_KEY);
          if (cachedComm) {
            activeComm = JSON.parse(cachedComm);
            setCommitments(activeComm);
          }
          const cachedLog = localStorage.getItem(getLogKey(selectedDate));
          if (cachedLog) {
            setDailyLog(JSON.parse(cachedLog));
          }
        } catch (e) {
          console.warn("Failed reading cached discipline data:", e);
        }
      }

      // 2. Fetch remote data from Supabase if session exists
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: commData, error: commErr } = await supabase
            .from("discipline_commitments")
            .select("*")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .order("sort_order", { ascending: true });

          if (commErr) {
            console.error("Discipline commitments fetch failed:", commErr.message);
            setSyncStatus("offline_draft");
            setSyncError(`Database sync unavailable: ${commErr.message}`);
          } else if (commData && commData.length > 0) {
            activeComm = commData as DisciplineCommitment[];
            setCommitments(activeComm);
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_COMM_KEY, JSON.stringify(activeComm));
            }
          }

          const { data: logData, error: logErr } = await supabase
            .from("discipline_logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("logged_date", selectedDate)
            .is("deleted_at", null)
            .maybeSingle();

          if (logErr) {
            console.error("Discipline logs fetch failed:", logErr.message);
            setSyncStatus("offline_draft");
            setSyncError(`Database sync unavailable: ${logErr.message}`);
          } else if (logData) {
            setDailyLog(logData as DisciplineDailyLog);
            if (typeof window !== "undefined") {
              localStorage.setItem(getLogKey(selectedDate), JSON.stringify(logData));
            }
          }

          if (!commErr && !logErr) {
            setSyncStatus("synced");
            setSyncError(null);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Could not load discipline data from Supabase:", msg);
        setSyncStatus("offline_draft");
        setSyncError(`Sync unavailable: ${msg}`);
      } finally {
        // 3. Fallback snapshot initialization if no daily log exists
        setDailyLog((curr) => {
          if (curr && curr.items && curr.items.length > 0) return curr;
          const items = createDisciplineDailySnapshot(activeComm);
          return {
            logged_date: selectedDate,
            items,
            total_count: items.length,
            completed_count: items.filter((i) => i.completed).length,
          };
        });
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDate]);

  // Toggle item in daily snapshot (optimistic + persistent)
  const toggleItem = async (itemId: string) => {
    if (!dailyLog) return;

    const nextItems = dailyLog.items.map((i) => {
      if (i.id === itemId) {
        const nextCompleted = !i.completed;
        if (nextCompleted) {
          feedbackManager.playCorrect();
        } else {
          feedbackManager.triggerHaptic("light");
        }
        return { ...i, completed: nextCompleted };
      }
      return i;
    });

    const completedCount = nextItems.filter((i) => i.completed).length;
    const totalCount = nextItems.length;

    const updatedLog: DisciplineDailyLog = {
      ...dailyLog,
      items: nextItems,
      total_count: totalCount,
      completed_count: completedCount,
      updated_at: new Date().toISOString(),
    };

    setDailyLog(updatedLog);
    if (typeof window !== "undefined") {
      localStorage.setItem(getLogKey(selectedDate), JSON.stringify(updatedLog));
    }

    // Persist to Supabase asynchronously
    setSyncStatus("syncing");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus("offline_draft");
        setSyncError("Authentication required. Running in offline draft mode.");
        return;
      }

      const { error: upsertErr } = await supabase.from("discipline_logs").upsert(
        {
          user_id: user.id,
          logged_date: selectedDate,
          items: nextItems,
          total_count: totalCount,
          completed_count: completedCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,logged_date" }
      );

      if (upsertErr) {
        console.error("Discipline sync error:", upsertErr.message);
        setSyncStatus("offline_draft");
        setSyncError(`Save failed: ${upsertErr.message}`);
      } else {
        setSyncStatus("synced");
        setSyncError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to persist discipline check:", msg);
      setSyncStatus("offline_draft");
      setSyncError(`Save failed: ${msg}`);
    }
  };

  // Add commitment (optimistic instant update + background sync)
  const addCommitment = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Prevent duplicates
    if (commitments.some((c) => c.text.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const tempId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newComm: DisciplineCommitment = {
      id: tempId,
      text: trimmed,
      active: true,
      sort_order: commitments.length,
      created_at: new Date().toISOString(),
    };

    const nextList = [...commitments, newComm];
    setCommitments(nextList);
    setNewText("");

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_COMM_KEY, JSON.stringify(nextList));
    }

    // Update current day snapshot so it's immediately interactive
    const currentItems = dailyLog?.items || [];
    const nextItems = createDisciplineDailySnapshot(nextList, currentItems);
    const updatedLog: DisciplineDailyLog = {
      ...(dailyLog || { logged_date: selectedDate, completed_count: 0 }),
      items: nextItems,
      total_count: nextItems.length,
      completed_count: nextItems.filter((i) => i.completed).length,
      updated_at: new Date().toISOString(),
    };
    setDailyLog(updatedLog);
    if (typeof window !== "undefined") {
      localStorage.setItem(getLogKey(selectedDate), JSON.stringify(updatedLog));
    }

    feedbackManager.triggerHaptic("light");

    // Asynchronously synchronize with Supabase if online/logged in
    setSyncStatus("syncing");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus("offline_draft");
        setSyncError("Authentication required. Running in offline draft mode.");
        return;
      }

      const { data, error } = await supabase
        .from("discipline_commitments")
        .insert([{
          user_id: user.id,
          text: trimmed,
          active: true,
          sort_order: commitments.length,
        }])
        .select()
        .single();

      if (error) {
        console.error("Discipline commitment save failed:", error.message);
        setSyncStatus("offline_draft");
        setSyncError(`Save failed: ${error.message}`);
        return;
      }

      if (data) {
        setCommitments((prev) =>
          prev.map((c) => (c.id === tempId ? (data as DisciplineCommitment) : c))
        );
      }

      const { error: logErr } = await supabase.from("discipline_logs").upsert(
        {
          user_id: user.id,
          logged_date: selectedDate,
          items: nextItems,
          total_count: nextItems.length,
          completed_count: updatedLog.completed_count,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,logged_date" }
      );

      if (logErr) {
        console.error("Discipline log snapshot failed:", logErr.message);
        setSyncStatus("offline_draft");
        setSyncError(`Snapshot save failed: ${logErr.message}`);
      } else {
        setSyncStatus("synced");
        setSyncError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Could not sync commitment to server:", msg);
      setSyncStatus("offline_draft");
      setSyncError(`Save failed: ${msg}`);
    }
  };

  // Delete commitment (optimistic instant update + background sync)
  const deleteCommitment = async (id: string) => {
    const nextList = commitments.filter((c) => c.id !== id);
    setCommitments(nextList);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_COMM_KEY, JSON.stringify(nextList));
    }

    const nextItems = (dailyLog?.items || []).filter((i) => i.id !== id);
    const updatedLog: DisciplineDailyLog = {
      ...(dailyLog || { logged_date: selectedDate }),
      items: nextItems,
      total_count: nextItems.length,
      completed_count: nextItems.filter((i) => i.completed).length,
      updated_at: new Date().toISOString(),
    };
    setDailyLog(updatedLog);
    if (typeof window !== "undefined") {
      localStorage.setItem(getLogKey(selectedDate), JSON.stringify(updatedLog));
    }

    feedbackManager.triggerHaptic("light");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !id.startsWith("comm_")) {
        await supabase
          .from("discipline_commitments")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        await supabase.from("discipline_logs").upsert(
          {
            user_id: user.id,
            logged_date: selectedDate,
            items: nextItems,
            total_count: nextItems.length,
            completed_count: updatedLog.completed_count,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,logged_date" }
        );
      }
    } catch (err) {
      console.warn("Could not delete commitment on server:", err);
    }
  };

  const progress = formatDisciplineProgress(
    dailyLog?.completed_count || 0,
    dailyLog?.total_count || 0
  );

  const completedCount = dailyLog?.completed_count || 0;
  const totalCount = dailyLog?.total_count || 0;
  const progressDisplay = locale === "ar"
    ? `${completedCount} من ${totalCount} اتنفذوا`
    : progress.mainDisplay;

  const arSuggestionMap: Record<string, string> = {
    "No phone in bed": "ممنوع الموبايل على السرير",
    "Zero scrolling before 12pm": "مفيش تصفح سوشيال ميديا قبل ١٢ الظهر",
    "Read 10 pages minimum": "قراءة ١٠ صفحات على الأقل",
    "No sugar / zero soda": "ممنوع السكريات والصودا",
    "Cold shower morning": "دش ساقع الصبح لنشاط الذهن",
    "No YouTube after 10pm": "بلاش يوتيوب بعد ١٠ بالليل",
    "10,000 steps minimum": "١٠,٠٠٠ خطوة على مدار اليوم",
    "Daily state check-in": "تسجيل الحالة اليومية بانتظام",
  };

  return (
    <div className="stitch-card p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "التزاماتك اليومية" : "Daily Commitments"}
            </h3>
            <p className="text-[10px] font-mono text-on-surface-variant">
              {locale === "ar" ? "التحكم في الدوبامين والتشتت" : "Dopamine control"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncStatus === "syncing" && (
            <span className="text-[10px] font-mono text-amber-core px-2 py-0.5 rounded-full bg-amber-core/10 border border-amber-core/20 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{locale === "ar" ? "جاري الحفظ..." : "Syncing..."}</span>
            </span>
          )}
          {syncStatus === "offline_draft" && (
            <span
              className="text-[10px] font-mono font-bold text-amber-core px-2.5 py-0.5 rounded-full bg-amber-core/15 border border-amber-core/30 flex items-center gap-1"
              title={syncError || "Not saved to database yet"}
            >
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{locale === "ar" ? "لم يُحفظ بعد" : "Not saved yet"}</span>
            </span>
          )}

          {/* Main display: "4 of 5 done" */}
          <span className="text-xs font-mono font-bold text-primary-lime px-2.5 py-1 rounded-full bg-primary-lime/10 border border-primary-lime/20">
            {progressDisplay}
          </span>
          <button
            onClick={() => setIsManageOpen(true)}
            className="p-1.5 rounded-xl text-text-muted hover:text-on-surface bg-surface-container-high border border-border-subtle cursor-pointer transition-colors"
            title={locale === "ar" ? "تعديل الالتزامات" : "Manage Commitments"}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Offline Draft Notice */}
      {syncStatus === "offline_draft" && (
        <div className="p-3 rounded-2xl bg-amber-core/10 border border-amber-core/25 text-amber-core font-mono text-xs flex items-start gap-2.5 text-start">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">{locale === "ar" ? "مسودة محلية (لم تُحفظ على الخادم)" : "Offline Draft (Not saved yet)"}</span>
            <span className="text-[11px] opacity-90">
              {syncError || (locale === "ar" ? "قاعدة البيانات غير متزامنة لعدم تطبيق جدول الالتزامات بعد." : "Database tables pending migration. Changes are currently kept only in your local browser draft.")}
            </span>
          </div>
        </div>
      )}

      {/* Items Checklist */}
      {loading ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        </div>
      ) : !progress.hasCommitments ? (
        <div className="p-6 rounded-2xl bg-surface-container-low border border-dashed border-border-subtle text-center space-y-2">
          <p className="text-xs font-mono text-text-muted">
            {locale === "ar" ? "مفيش التزامات نشطة للنهاردة لسه." : "No commitments active for today."}
          </p>
          <button
            onClick={() => setIsManageOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary-lime/15 border border-primary-lime/30 text-primary-lime font-mono text-xs font-bold hover:bg-primary-lime/25 cursor-pointer transition-colors"
          >
            {locale === "ar" ? "حدد التزاماتك اليومية" : "Set your commitments"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {dailyLog?.items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                item.completed
                  ? "bg-surface-container-low/60 border-border-subtle/50 text-text-muted line-through"
                  : "bg-surface-container-low border-border-subtle text-on-surface hover:border-border-default"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-success shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-text-muted shrink-0" />
              )}
              <span className="text-xs font-mono select-none flex-1 text-start">
                {locale === "ar" ? (arSuggestionMap[item.text] || item.text) : item.text}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* MANAGE COMMITMENTS MODAL */}
      {isManageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-container-low">
              <div>
                <h3 className="text-sm font-bold font-mono text-on-surface">
                  {locale === "ar" ? "تعديل الالتزامات اليومية" : "Configure Commitments"}
                </h3>
                <p className="text-[10px] font-mono text-on-surface-variant">
                  {locale === "ar"
                    ? "التعديل هيتطبق على الأيام الجاية، وسجل الأيام اللي فاتت هيفضل محفوظ."
                    : "Changes take effect for future logs; past history is preserved"}
                </p>
              </div>
              <button
                onClick={() => setIsManageOpen(false)}
                className="p-2 rounded-xl text-text-muted hover:text-on-surface bg-surface-container-high border border-border-subtle cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
              {/* Add Custom Commitment */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block text-start">
                  {locale === "ar" ? "إضافة التزام جديد" : "Add New Commitment"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCommitment(newText);
                    }}
                    placeholder={locale === "ar" ? "مثال: بلاش الموبايل على السرير" : "e.g. No phone in bed"}
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-border-subtle text-xs text-on-surface font-mono placeholder:text-text-muted focus:outline-none focus:border-primary-lime/50 text-start"
                  />
                  <button
                    type="button"
                    onClick={() => addCommitment(newText)}
                    disabled={!newText.trim()}
                    className="px-4 rounded-2xl bg-primary-lime text-on-primary font-mono font-bold text-xs uppercase hover:bg-primary-lime-dim disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {locale === "ar" ? "إضافة" : "Add"}
                  </button>
                </div>
              </div>

              {/* Suggestions List (Click to Add) */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5 text-start">
                  <Sparkles className="w-3.5 h-3.5 text-amber-core" />
                  <span>{locale === "ar" ? "اقتراحات مفيدة (دوس للإضافة)" : "Suggestions (Tap to Pick)"}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DISCIPLINE_SUGGESTIONS.map((sug) => {
                    const alreadyAdded = commitments.some(
                      (c) => c.text.toLowerCase() === sug.toLowerCase()
                    );
                    const labelText = locale === "ar" ? (arSuggestionMap[sug] || sug) : sug;
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => !alreadyAdded && addCommitment(sug)}
                        disabled={alreadyAdded}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono text-left cursor-pointer transition-all ${
                          alreadyAdded
                            ? "bg-primary-lime/10 border-primary-lime/30 text-primary-lime opacity-80 cursor-default"
                            : "bg-surface-container-low hover:bg-surface-container-high border-border-subtle text-on-surface hover:border-primary-lime/40 active:scale-95"
                        }`}
                      >
                        {alreadyAdded ? "✓ " : "+ "}{labelText}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Active Commitments */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block text-start">
                  {locale === "ar" ? `الالتزامات النشطة (${commitments.length})` : `Active Commitments (${commitments.length})`}
                </label>
                {commitments.length === 0 ? (
                  <p className="text-xs text-text-muted font-mono italic text-start">
                    {locale === "ar" ? "مفيش التزامات متحددة لسه." : "None configured yet."}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {commitments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-2xl bg-surface-container-low border border-border-subtle flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-mono text-on-surface truncate text-start">
                          {locale === "ar" ? (arSuggestionMap[c.text] || c.text) : c.text}
                        </span>
                        <button
                          onClick={() => deleteCommitment(c.id)}
                          className="p-1.5 text-text-muted hover:text-crimson-alert transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border-subtle bg-surface-container-low">
              <button
                onClick={() => setIsManageOpen(false)}
                className="w-full py-3 rounded-2xl bg-primary-lime text-on-primary font-mono font-bold text-xs uppercase cursor-pointer"
              >
                {locale === "ar" ? "تمام" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
