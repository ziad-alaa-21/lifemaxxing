"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nContext";
import { ReauthMethod, getDeletionReauthMethod } from "@/lib/authConfig";

interface DataTabProps {
  userEmail?: string | null;
  reauthMethod?: ReauthMethod;
}

export function DataTab({ reauthMethod }: DataTabProps) {
  const router = useRouter();
  const { locale, dict } = useI18n();

  const [detectedReauthMethod, setDetectedReauthMethod] = useState<ReauthMethod>(
    reauthMethod || "password"
  );
  const activeReauthMethod: ReauthMethod = reauthMethod || detectedReauthMethod;

  // Re-authentication states for Google OAuth users (valid for 5 minutes)
  const [isReauthenticated, setIsReauthenticated] = useState<boolean>(false);

  // Check user's identity provider and whether Google session has a fresh sign-in within the last 5 minutes
  const checkFreshAuth = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const detectedMethod = reauthMethod || getDeletionReauthMethod(user);
      setDetectedReauthMethod(detectedMethod);

      if (detectedMethod === "google") {
        if (user?.last_sign_in_at) {
          const lastSignIn = new Date(user.last_sign_in_at).getTime();
          const isFresh = Date.now() - lastSignIn < 5 * 60 * 1000;
          setIsReauthenticated(isFresh);
        } else {
          setIsReauthenticated(false);
        }
      } else {
        setIsReauthenticated(true);
      }
    } catch {
      if ((reauthMethod || detectedReauthMethod) === "google") {
        setIsReauthenticated(false);
      }
    }
  }, [reauthMethod, detectedReauthMethod]);

  useEffect(() => {
    if (reauthMethod) {
      return;
    }
    let mounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        const detectedMethod = getDeletionReauthMethod(data?.user);
        setDetectedReauthMethod(detectedMethod);
        if (detectedMethod === "google") {
          const lastSignIn = data?.user?.last_sign_in_at
            ? new Date(data.user.last_sign_in_at).getTime()
            : 0;
          setIsReauthenticated(Date.now() - lastSignIn < 5 * 60 * 1000);
        } else {
          setIsReauthenticated(true);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [reauthMethod]);

  const handleReauthGoogle = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/settings`,
        queryParams: { prompt: "login", max_age: "0" },
      },
    });
  };

  // Export states
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Modal states: Delete Data
  const [isDeleteDataModalOpen, setIsDeleteDataModalOpen] = useState(false);
  const [dataPassword, setDataPassword] = useState("");
  const [dataPhrase, setDataPhrase] = useState("");
  const [deleteDataLoading, setDeleteDataLoading] = useState(false);
  const [deleteDataError, setDeleteDataError] = useState<string | null>(null);
  const [deleteDataSuccess, setDeleteDataSuccess] = useState(false);

  // Modal states: Delete Account
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPhrase, setAccountPhrase] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Trigger file download via authenticated server route
  const handleExport = async (format: "json" | "csv") => {
    if (format === "json") setExportingJson(true);
    if (format === "csv") setExportingCsv(true);
    setExportSuccess(null);

    try {
      const res = await fetch(`/api/user/export?format=${format}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `lifemaxxing_export_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(
        locale === "ar"
          ? `تم تنزيل أرشيف ${format.toUpperCase()} الكامل بنجاح.`
          : `Successfully downloaded full ${format.toUpperCase()} archive.`
      );
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(
        (locale === "ar" ? "فشل تنزيل ملف التصدير: " : "Failed to download export: ") +
          msg
      );
    } finally {
      setExportingJson(false);
      setExportingCsv(false);
    }
  };

  const handleDeleteData = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteDataError(null);
    setDeleteDataSuccess(false);

    if (dataPhrase !== "DELETE MY DATA") {
      setDeleteDataError(
        locale === "ar"
          ? 'يجب كتابة عبارة "DELETE MY DATA" تماماً للمتابعة.'
          : 'You must type exactly "DELETE MY DATA" to proceed.'
      );
      return;
    }

    if (activeReauthMethod === "password" && !dataPassword) {
      setDeleteDataError(
        locale === "ar"
          ? "يرجى إدخال كلمة المرور الحالية للمتابعة."
          : "Please enter your current password to proceed."
      );
      return;
    }

    setDeleteDataLoading(true);
    try {
      const res = await fetch("/api/user/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: dataPassword,
          confirmationPhrase: dataPhrase,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error || (locale === "ar" ? "فشل مسح البيانات." : "Failed to delete data.")
        );
      }

      setDeleteDataSuccess(true);
      setDataPassword("");
      setDataPhrase("");
      setTimeout(() => {
        setIsDeleteDataModalOpen(false);
        setDeleteDataSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setDeleteDataError(
        msg || (locale === "ar" ? "فشل مسح البيانات." : "Failed to delete data.")
      );
    } finally {
      setDeleteDataLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteAccountError(null);

    if (accountPhrase !== "DELETE MY ACCOUNT") {
      setDeleteAccountError(
        locale === "ar"
          ? 'يجب كتابة عبارة "DELETE MY ACCOUNT" تماماً للمتابعة.'
          : 'You must type exactly "DELETE MY ACCOUNT" to proceed.'
      );
      return;
    }

    if (activeReauthMethod === "password" && !accountPassword) {
      setDeleteAccountError(
        locale === "ar"
          ? "يرجى إدخال كلمة المرور الحالية للمتابعة."
          : "Please enter your current password to proceed."
      );
      return;
    }

    setDeleteAccountLoading(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: accountPassword,
          confirmationPhrase: accountPhrase,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error || (locale === "ar" ? "فشل حذف الحساب." : "Failed to delete account.")
        );
      }

      // Hard account deletion finished, redirect to login
      router.push("/login?deleted=true");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setDeleteAccountError(
        msg || (locale === "ar" ? "فشل حذف الحساب." : "Failed to delete account.")
      );
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Data Export Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary-lime" />
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "سيادة البيانات وتصدير السجلات" : "Data Sovereignty & Export"}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <Lock className="w-3 h-3" />
            <span>{locale === "ar" ? "جلسة مشفرة وآمنة" : "Encrypted Session"}</span>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          {locale === "ar"
            ? "نزّل 100% من بياناتك وسجلاتك المولدة ديناميكياً عبر كافة جداول قاعدة البيانات (التمارين، النوم، التغذية، جلسات التركيز، تمارين الحساب، الكتب، ووقت الشاشة). التصدير يتم عبر السيرفر بأمان مع حسابك ويتضمن السجلات المؤرشفة لاكتمال الأرشيف."
            : "Download 100% of your data dynamically generated across every user-owned table in the database schema (workouts, sleep, nutrition, focus sessions, math drills, books, and screen time). Exports are executed server-side under your authenticated session and include soft-deleted records for archival completeness."}
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-text-muted">
            {exportSuccess ? (
              <span className="text-emerald-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{exportSuccess}</span>
              </span>
            ) : (
              <span>{locale === "ar" ? "اختر الصيغة (JSON أو CSV):" : "Choose format (JSON or CSV):"}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("json")}
              disabled={exportingJson || exportingCsv}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-all cursor-pointer disabled:opacity-50"
            >
              {exportingJson ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-lime" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-primary-lime" />
              )}
              <span>{locale === "ar" ? "تصدير JSON" : "Export JSON"}</span>
            </button>

            <button
              onClick={() => handleExport("csv")}
              disabled={exportingJson || exportingCsv}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-all cursor-pointer disabled:opacity-50"
            >
              {exportingCsv ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-tertiary-purple" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-tertiary-purple" />
              )}
              <span>{locale === "ar" ? "تصدير CSV" : "Export CSV"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Dual Action Deletion Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-crimson-alert/30 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-crimson-alert/20 text-crimson-alert">
          <ShieldAlert className="w-4 h-4" />
          <h3 className="text-sm font-bold font-mono">
            {locale === "ar" ? "منطقة الخطر: حذف البيانات والحساب" : "Danger Zone: Data & Account Deletion"}
          </h3>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          {locale === "ar"
            ? "هذه العمليات نهائية ولا يمكن التراجع عنها. نوصي بتنزيل نسخة احتياطية من بياناتك قبل المتابعة."
            : "Permanent actions cannot be undone. We recommend downloading an export of your data before proceeding."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Action 1: Delete My Data */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-border-subtle space-y-3">
            <div>
              <h4 className="text-xs font-bold font-mono text-on-surface">
                {locale === "ar" ? "مسح كافة بياناتي" : "Delete My Data"}
              </h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                {locale === "ar" ? (
                  <>
                    يحذف نهائياً كافة القياسات، التمارين، السجلات، ويعيد ضبط الأهداف. <strong>يبقى حسابك وبيانات تسجيل دخولك كما هي.</strong>
                  </>
                ) : (
                  <>
                    Permanently deletes all telemetry, workouts, logs, and resets targets to null. <strong>Keeps your account and login active.</strong>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                checkFreshAuth();
                setIsDeleteDataModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-core/10 hover:bg-amber-core/20 border border-amber-core/30 text-amber-core text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "تصفير وحذف البيانات" : "Reset & Delete Data"}</span>
            </button>
          </div>

          {/* Action 2: Delete My Account */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-crimson-alert/30 space-y-3">
            <div>
              <h4 className="text-xs font-bold font-mono text-crimson-alert">
                {locale === "ar" ? "حذف حسابي نهائياً" : "Delete My Account"}
              </h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                {locale === "ar"
                  ? "يحذف حسابك بالكامل من نظام المصادقة، والملف الشخصي، والملفات المرفوعة، وكافة السجلات المرتبطة به. متوافق مع شروط الحذف الإجباري لمتاجر التطبيقات."
                  : "Permanently hard deletes your authentication user, profile, uploaded files, and all associated database records. Satisfies App Store in-app deletion requirements."}
              </p>
            </div>
            <button
              onClick={() => {
                checkFreshAuth();
                setIsDeleteAccountModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-crimson-alert/15 hover:bg-crimson-alert/25 border border-crimson-alert/40 text-crimson-alert text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "حذف الحساب نهائياً" : "Permanently Delete Account"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compliance & Policy Links */}
      <div className="p-4 bg-surface-container rounded-2xl border border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-on-surface-variant">
        <span>{locale === "ar" ? "وثائق الخصوصية والشروط القانونية:" : "Legal & Privacy Documentation:"}</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-primary-lime underline hover:text-primary-lime-dim">
            {locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
          <Link href="/terms" className="text-primary-lime underline hover:text-primary-lime-dim">
            {locale === "ar" ? "شروط الخدمة" : "Terms of Service"}
          </Link>
        </div>
      </div>

      {/* Modal: Delete Data */}
      {isDeleteDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-amber-core/30 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-amber-core">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-mono">
                {locale === "ar" ? "حذف كافة بيانات وسجلات القياس" : "Delete All Telemetry Data"}
              </h3>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              {locale === "ar"
                ? "سيؤدي هذا لمسح نهائي لكافة التمارين، وسجلات الوزن، والنوم، والتغذية، وجلسات التركيز ونتائج الحساب. تظل اختيارات الوحدات المفعلة (User Modules) وحسابك فعالاً."
                : "This will permanently delete all workouts, bodyweights, sleep logs, nutrition logs, focus sessions, and math results across all tables. Your active module selections and account login remain active."}
            </p>

            {/* Google Re-authentication Verification Banner (shown only for Google identity users) */}
            {activeReauthMethod === "google" && !isReauthenticated ? (
              <div className="p-3.5 rounded-xl bg-amber-core/10 border border-amber-core/30 space-y-2.5">
                <div className="text-xs text-amber-core font-semibold leading-relaxed">
                  {locale === "ar"
                    ? "يلزم تأكيد هويتك بتسجيل دخول حديث عبر Google (خلال آخر 5 دقائق) قبل المتابعة."
                    : "For your security, a fresh sign-in via Google (within the last 5 minutes) is required before deleting."}
                </div>
                <button
                  type="button"
                  onClick={handleReauthGoogle}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>{locale === "ar" ? "التحقق عبر Google الآن" : "Verify with Google Now"}</span>
                </button>
              </div>
            ) : activeReauthMethod === "google" && isReauthenticated ? (
              <div className="p-2.5 bg-emerald-success/10 border border-emerald-success/30 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {locale === "ar"
                    ? "تم التحقق من هويتك عبر Google (جلسة نشطة)."
                    : "Identity verified via Google (active session)."}
                </span>
              </div>
            ) : null}

            <form onSubmit={handleDeleteData} className="space-y-3 pt-1">
              {activeReauthMethod === "password" && (
                <div>
                  <label className="text-[11px] font-mono text-text-muted uppercase">
                    {locale === "ar" ? "كلمة المرور الحالية" : "Current Password"}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={dataPassword}
                    onChange={(e) => setDataPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">
                  {locale === "ar" ? (
                    <>
                      اكتب <span className="text-amber-core font-bold">&ldquo;DELETE MY DATA&rdquo;</span> للتأكيد
                    </>
                  ) : (
                    <>
                      Type <span className="text-amber-core font-bold">&ldquo;DELETE MY DATA&rdquo;</span> to confirm
                    </>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE MY DATA"
                  value={dataPhrase}
                  onChange={(e) => setDataPhrase(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface font-mono"
                  dir="ltr"
                />
              </div>

              {deleteDataError && (
                <div className="p-2.5 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl text-xs font-mono text-crimson-alert">
                  {deleteDataError}
                </div>
              )}

              {deleteDataSuccess && (
                <div className="p-2.5 bg-emerald-success/10 border border-emerald-success/20 rounded-xl text-xs font-mono text-emerald-success">
                  {locale === "ar" ? "تم مسح البيانات بنجاح. جاري التحديث..." : "Telemetry data deleted. Reloading..."}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteDataModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    deleteDataLoading ||
                    (activeReauthMethod === "google" ? !isReauthenticated : !dataPassword) ||
                    dataPhrase !== "DELETE MY DATA"
                  }
                  className="px-4 py-2 rounded-xl bg-amber-core text-on-primary text-xs font-mono font-bold hover:bg-amber-core/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteDataLoading
                    ? locale === "ar"
                      ? "جاري مسح البيانات..."
                      : "Wiping Data..."
                    : locale === "ar"
                    ? "تأكيد مسح البيانات"
                    : "Confirm Data Wipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Account */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-crimson-alert/40 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-crimson-alert">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-mono">
                {locale === "ar" ? "حذف الحساب نهائياً" : "Permanently Delete Account"}
              </h3>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              {locale === "ar" ? (
                <>
                  هذا الإجراء <strong>فوري ونهائي ولا يمكن التراجع عنه مطلقاً</strong>. سيتم مسح حسابك، وبريدك المسجل، وملفك الشخصي، وكافة السجلات تماماً من قاعدة البيانات.
                </>
              ) : (
                <>
                  This action is <strong>immediate and irreversible</strong>. Your account login, email registration, profile, and all telemetry data will be permanently wiped from the database.
                </>
              )}
            </p>

            {/* Google Re-authentication Verification Banner (shown only for Google identity users) */}
            {activeReauthMethod === "google" && !isReauthenticated ? (
              <div className="p-3.5 rounded-xl bg-crimson-alert/10 border border-crimson-alert/30 space-y-2.5">
                <div className="text-xs text-crimson-alert font-semibold leading-relaxed">
                  {locale === "ar"
                    ? "يلزم تأكيد هويتك بتسجيل دخول حديث عبر Google (خلال آخر 5 دقائق) قبل حذف الحساب."
                    : "For security, a fresh sign-in via Google (within the last 5 minutes) is required before deleting your account."}
                </div>
                <button
                  type="button"
                  onClick={handleReauthGoogle}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>{locale === "ar" ? "التحقق عبر Google الآن" : "Verify with Google Now"}</span>
                </button>
              </div>
            ) : activeReauthMethod === "google" && isReauthenticated ? (
              <div className="p-2.5 bg-emerald-success/10 border border-emerald-success/30 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {locale === "ar"
                    ? "تم التحقق من هويتك عبر Google (جلسة نشطة)."
                    : "Identity verified via Google (active session)."}
                </span>
              </div>
            ) : null}

            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-1">
              {activeReauthMethod === "password" && (
                <div>
                  <label className="text-[11px] font-mono text-text-muted uppercase">
                    {locale === "ar" ? "كلمة المرور الحالية" : "Current Password"}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">
                  {locale === "ar" ? (
                    <>
                      اكتب <span className="text-crimson-alert font-bold">&ldquo;DELETE MY ACCOUNT&rdquo;</span> للتأكيد
                    </>
                  ) : (
                    <>
                      Type <span className="text-crimson-alert font-bold">&ldquo;DELETE MY ACCOUNT&rdquo;</span> to confirm
                    </>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE MY ACCOUNT"
                  value={accountPhrase}
                  onChange={(e) => setAccountPhrase(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface font-mono"
                  dir="ltr"
                />
              </div>

              {deleteAccountError && (
                <div className="p-2.5 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl text-xs font-mono text-crimson-alert">
                  {deleteAccountError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    deleteAccountLoading ||
                    (activeReauthMethod === "google" ? !isReauthenticated : !accountPassword) ||
                    accountPhrase !== "DELETE MY ACCOUNT"
                  }
                  className="px-4 py-2 rounded-xl bg-crimson-alert text-white text-xs font-mono font-bold hover:bg-crimson-alert/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteAccountLoading
                    ? locale === "ar"
                      ? "جاري حذف الحساب..."
                      : "Deleting Account..."
                    : locale === "ar"
                    ? "حذف الحساب نهائياً"
                    : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
