"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import { usePWA, clearPWACaches } from "@/components/pwa/PWAProvider";
import { useI18n } from "@/lib/i18n/I18nContext";

export function DeviceTab() {
  const { locale, dict } = useI18n();
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Active session check states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [activeSessionWarningText, setActiveSessionWarningText] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  useEffect(() => {
    // Read last sync timestamp
    const stored = localStorage.getItem("lifemaxxing_last_sync");
    if (stored) {
      try {
        const d = new Date(stored);
        setLastSyncTime(d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }));
      } catch {
        setLastSyncTime("Today");
      }
    }
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await installApp();
    } finally {
      setInstalling(false);
    }
  };

  const handleAttemptClearCache = () => {
    // Safeguard: Check for active focus session or unsaved workout
    const activeFocus = localStorage.getItem("lifemaxxing_active_focus_session");
    const activeWorkout = localStorage.getItem("lifemaxxing_active_workout");

    const issues: string[] = [];
    if (activeFocus) {
      try {
        const parsed = JSON.parse(activeFocus);
        if (parsed.status === "running" || parsed.status === "paused") {
          issues.push(locale === "ar" ? "مؤقت تركيز نشط" : "an active focus timer session");
        }
      } catch {}
    }
    if (activeWorkout) {
      issues.push(locale === "ar" ? "جلسة تمرين جارية وغير محفوظة" : "an ongoing unsaved workout");
    }

    if (issues.length > 0) {
      setActiveSessionWarningText(
        locale === "ar"
          ? `تنبيه الجلسة النشطة: لديك حالياً ${issues.join(" و ")} قيد التشغيل. إفراغ ذاكرة الجهاز الآن سيفقد تقدم الجلسة الحالية.`
          : `Active Session Warning: You currently have ${issues.join(" and ")} in progress. Clearing the device cache now will discard your session progress.`
      );
      setShowWarningModal(true);
      return;
    }

    // No active session: proceed with confirmation
    executeCacheClear();
  };

  const executeCacheClear = async () => {
    setShowWarningModal(false);
    setClearingCache(true);
    setCacheClearSuccess(false);
    try {
      await clearPWACaches();
      setCacheClearSuccess(true);
      setTimeout(() => setCacheClearSuccess(false), 4000);
    } catch (err: any) {
      alert(
        (locale === "ar" ? "فشل تفريغ الذاكرة المؤقتة: " : "Failed to clear cache: ") +
          err.message
      );
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PWA Installation Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary-lime" />
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "تطبيق الويب التقدمي (PWA)" : "Progressive Web App (PWA)"}
            </h3>
          </div>
          {isInstalled && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-success px-2 py-0.5 rounded-full bg-emerald-success/10 border border-emerald-success/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "مثبت كتطبيق مستقل" : "Standalone Installed"}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          {locale === "ar"
            ? "لايف ماكسينج مصمم كتطبيق ويب تقدمي يدعم العمل دون اتصال بالإنترنت أولاً. ثبته على شاشتك الرئيسية أو سطح المكتب لتشغيل فوري، وعرض شاشة كاملة، وتجربة سلسة بدون إنترنت."
            : "LifeMaxxing is built as an offline-first Progressive Web App. Install it to your home screen or desktop for edge launching, full-screen viewport, and reliable offline shell operation."}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-mono text-text-muted">
            {isInstalled ? (
              <span className="text-emerald-success">
                {locale === "ar"
                  ? "✓ يعمل حالياً كنافذة تطبيق مستقلة"
                  : "✓ Running in standalone application window"}
              </span>
            ) : isInstallable ? (
              <span className="text-primary-lime">
                {locale === "ar" ? "● جاهز للتثبيت بضغطة واحدة" : "● Ready for one-click installation"}
              </span>
            ) : (
              <span>
                {locale === "ar"
                  ? "متاح عبر قائمة المتصفح (\"تثبيت التطبيق\" أو \"إضافة إلى الشاشة الرئيسية\")"
                  : "Available via browser menu (\"Install App\" or \"Add to Home Screen\")"}
              </span>
            )}
          </div>

          {!isInstalled && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-lime text-on-primary text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-lime-dim shadow-xs transition-all cursor-pointer disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed"
            >
              {installing ? (
                <Loader2 className="w-4 h-4 animate-spin text-on-primary" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{locale === "ar" ? "تثبيت تطبيق لايف" : "Install Life App"}</span>
            </button>
          )}
        </div>
      </div>

      {/* App Version & Sync Metadata */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <HardDrive className="w-4 h-4 text-tertiary-purple" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            {locale === "ar" ? "حالة الجهاز والمزامنة" : "Device & Sync Status"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {locale === "ar" ? "إصدار التطبيق" : "App Version"}
            </div>
            <div className="text-xs font-mono text-on-surface flex items-center gap-1.5" dir="ltr">
              <span>v1.0.0-stage9</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-lime/10 text-primary-lime font-mono">
                {locale === "ar" ? "النسخة النهائية" : "Production"}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {locale === "ar" ? "آخر مزامنة لقاعدة البيانات" : "Last Database Sync"}
            </div>
            <div className="text-xs font-mono text-primary-lime flex items-center gap-1.5" dir="ltr">
              <Clock className="w-3.5 h-3.5" />
              <span>{lastSyncTime}</span>
            </div>
          </div>
        </div>

        {/* Cache Clearing Safeguard Card */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <div>
            <h4 className="text-xs font-bold font-mono text-on-surface">
              {locale === "ar"
                ? "الذاكرة المؤقتة لقالب التطبيق (Service Worker)"
                : "Service Worker Shell Cache"}
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              {locale === "ar"
                ? "يفرغ حزم الأكواد والأيقونات المخزنة مؤقتاً. لن يمسح جلسات العمل المفتوحة دون تنبيهك."
                : "Purges cached script bundles and static icon assets. Never silently discards running sessions."}
            </p>
          </div>

          <button
            onClick={handleAttemptClearCache}
            disabled={clearingCache}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-all cursor-pointer disabled:opacity-50"
          >
            {clearingCache ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-lime" />
            ) : (
              <RefreshCw className="w-4 h-4 text-primary-lime" />
            )}
            <span>{locale === "ar" ? "إفراغ الكاش" : "Clear Cache"}</span>
          </button>
        </div>

        {cacheClearSuccess && (
          <div className="p-3 bg-emerald-success/10 border border-emerald-success/20 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {locale === "ar"
                ? "تم تفريغ كاش السيرفيس ووركر بنجاح."
                : "Service worker cache successfully purged."}
            </span>
          </div>
        )}
      </div>

      {/* Service Worker Privacy Audit Confirmation */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-success" />
          <h3 className="text-xs font-bold font-mono text-on-surface">
            {locale === "ar" ? "تدقيق خصوصية السيرفيس ووركر" : "Service Worker Privacy Audit"}
          </h3>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {locale === "ar" ? (
            <>
              تم تكوين السيرفيس ووركر (<code className="text-on-surface" dir="ltr">/sw.js</code>) بدقة لتخزين ملفات القالب الثابتة فقط (<code className="text-on-surface" dir="ltr">/offline</code>، ملف التثبيت، الأيقونات، وحزم الأكواد الثابتة). لا يعترض <strong>أي بيانات شخصية</strong>، ولا يخزن <strong>أي رموز تسجيل دخول</strong>، ويبقى خالياً من <strong>أي بيانات مستخدم</strong>.
            </>
          ) : (
            <>
              The service worker (<code className="text-on-surface">/sw.js</code>) is strictly configured to cache static shell assets only (<code className="text-on-surface">/offline</code>, manifest, icons, and static bundle chunks). It intercepts <strong>no personal telemetry</strong>, stores <strong>no authentication tokens</strong>, and retains <strong>zero user data</strong>.
            </>
          )}
        </p>
      </div>

      {/* Active Session Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-border-subtle max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-amber-core">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-mono">
                {locale === "ar" ? "تنبيه: توجد جلسة عمل نشطة حالياً" : "Active Session in Progress"}
              </h3>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              {activeSessionWarningText}
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              {locale === "ar"
                ? "هل أنت متأكد من رغبتك في المتابعة والتضحية ببيانات الجلسة الحالية؟"
                : "Are you sure you want to proceed and discard unsaved session data?"}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
              >
                {locale === "ar" ? "الاحتفاظ بالجلسة النشطة" : "Keep Active Session"}
              </button>
              <button
                type="button"
                onClick={executeCacheClear}
                className="px-4 py-2 rounded-xl bg-crimson-alert text-white text-xs font-mono font-bold hover:bg-crimson-alert/90 cursor-pointer"
              >
                {locale === "ar" ? "التضحية بالجلسة وإفراغ الكاش" : "Discard & Clear Cache"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
