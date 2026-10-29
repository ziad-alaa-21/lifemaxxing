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
  Download,
  History,
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
    <div className="flex flex-col gap-6 font-sans">
      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Summary Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Data Sovereignty Card */}
          <div className="bg-white rounded-[20px] p-6 shadow-[0_8px_24px_rgba(40,50,120,0.06)] flex flex-col gap-4 border border-[#e2e8f9]">
            <div className="w-10 h-10 rounded-xl bg-[#e2e8f9] flex items-center justify-center text-[#0051d5]">
              <Database className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-[#151c28]">
                {locale === "ar" ? "سيادة البيانات" : "Data sovereignty"}
              </h2>
              <p className="text-xs text-[#45474b] leading-relaxed">
                {locale === "ar"
                  ? "سجلاتك عبر جلسات التركيز، التمارين، ومواعيد النوم مخزنة بخصوصية تامة ولا يتم تسويقها مطلقاً. لديك وصول غير مقيد إلى تاريخ بياناتك."
                  : "Your logs across focus sessions, workouts, and sleep schedules are privately stored and never commercialized. You have unrestricted access to your data history."}
              </p>
            </div>
            <div className="bg-[#f0f3ff] rounded-xl p-4 flex flex-col gap-1 border border-[#e2e8f9]">
              <span className="text-[11px] text-[#45474b] font-medium">
                {locale === "ar" ? "البصمة النشطة لقاعدة البيانات" : "Active database footprint"}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-[#151c28]">14,280</span>
                <span className="text-xs text-[#0051d5] font-semibold">
                  {locale === "ar" ? "متزامن" : "Synchronized"}
                </span>
              </div>
              <p className="text-[10px] text-[#45474b]">
                {locale === "ar"
                  ? "إجمالي الأحداث المسجلة منذ إنشاء الحساب"
                  : "Total events recorded since account inception"}
              </p>
            </div>
          </div>

          {/* Privacy Status Note */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_8px_24px_rgba(40,50,120,0.04)] flex items-start gap-4 border border-[#e2e8f9]">
            <div className="w-8 h-8 rounded-lg bg-[#f0f3ff] flex items-center justify-center text-[#0051d5] shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-[#151c28]">
                {locale === "ar" ? "انعدام إعادة البيع السحابي" : "Zero cloud resale"}
              </span>
              <p className="text-[11px] text-[#45474b] leading-relaxed">
                {locale === "ar"
                  ? "يقتصر القياس عن بُعد بدقة على الموثوقية التشخيصية والتخزين المؤقت المحلي."
                  : "Telemetry is strictly restricted to diagnostic reliability and local caching."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Actionable Cards Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card 1: Export Your Data */}
          <section className="bg-white rounded-[20px] p-6 md:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] flex flex-col gap-5 border border-[#e2e8f9] transition-all hover:shadow-[0_12px_32px_rgba(40,50,120,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#e7eeff] flex items-center justify-center text-[#151c28] shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-bold text-[#151c28]">
                    {locale === "ar" ? "تصدير بياناتك" : "Export your data"}
                  </h3>
                  <p className="text-xs text-[#45474b]">
                    {locale === "ar"
                      ? "نزّل أرشيفاً كاملاً لكافة سجلاتك من تمارين، تغذية، نوم، جلسات تركيز، ودرجات."
                      : "Download a full archive of all your logged workouts, nutrition, sleep, focus sessions, and grades."}
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-[#dbe1ff] text-[#00174b] text-xs font-semibold self-start shrink-0">
                {locale === "ar" ? "الأرشيف جاهز" : "Archive ready"}
              </span>
            </div>

            {/* Modules Inventory Visual Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="bg-[#f0f3ff] px-3 py-1.5 rounded-lg flex items-center gap-2 border border-[#e2e8f9]">
                <span className="w-2 h-2 rounded-full bg-[#0051d5]"></span>
                <span className="text-xs text-[#151c28] font-medium">
                  {locale === "ar" ? "التمارين (842 سجلاً)" : "Workouts (842 records)"}
                </span>
              </div>
              <div className="bg-[#f0f3ff] px-3 py-1.5 rounded-lg flex items-center gap-2 border border-[#e2e8f9]">
                <span className="w-2 h-2 rounded-full bg-[#1e3a9e]"></span>
                <span className="text-xs text-[#151c28] font-medium">
                  {locale === "ar" ? "التغذية والترطيب" : "Nutrition and hydration"}
                </span>
              </div>
              <div className="bg-[#f0f3ff] px-3 py-1.5 rounded-lg flex items-center gap-2 border border-[#e2e8f9]">
                <span className="w-2 h-2 rounded-full bg-[#5b21b6]"></span>
                <span className="text-xs text-[#151c28] font-medium">
                  {locale === "ar" ? "جلسات التركيز" : "Focus sessions"}
                </span>
              </div>
              <div className="bg-[#f0f3ff] px-3 py-1.5 rounded-lg flex items-center gap-2 border border-[#e2e8f9]">
                <span className="w-2 h-2 rounded-full bg-[#9d174d]"></span>
                <span className="text-xs text-[#151c28] font-medium">
                  {locale === "ar" ? "الدرجات والمناهج" : "Grades and syllabi"}
                </span>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleExport("json")}
                disabled={exportingJson || exportingCsv}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#dce2f3] shadow-xs hover:bg-[#f0f3ff] text-[#151c28] text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {exportingJson ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0051d5]" />
                ) : (
                  <FileCode className="w-4 h-4 text-[#45474b]" />
                )}
                <span>{locale === "ar" ? "تنزيل JSON" : "Download JSON"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport("csv")}
                disabled={exportingJson || exportingCsv}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#dce2f3] shadow-xs hover:bg-[#f0f3ff] text-[#151c28] text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {exportingCsv ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0051d5]" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-[#45474b]" />
                )}
                <span>{locale === "ar" ? "تنزيل CSV" : "Download CSV"}</span>
              </button>
            </div>

            {exportSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}
          </section>

          {/* Card 2: Delete My Data */}
          <section className="bg-white rounded-[20px] p-6 md:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] flex flex-col gap-5 border border-[#e2e8f9] transition-all hover:shadow-[0_12px_32px_rgba(40,50,120,0.08)]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#e2e8f9] flex items-center justify-center text-[#45474b] shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-[#151c28]">
                  {locale === "ar" ? "مسح بياناتي" : "Delete my data"}
                </h3>
                <p className="text-xs text-[#45474b]">
                  {locale === "ar"
                    ? "يزيل سجلاتك بالكامل مع الإبقاء على حسابك وإعداداتك."
                    : "Removes your logs but keeps your account and settings"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#f0f3ff] rounded-xl flex items-start gap-3 text-xs text-[#45474b] border border-[#e2e8f9]">
              <AlertTriangle className="w-4 h-4 text-[#45474b] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {locale === "ar"
                  ? "رموز المصادقة الخاصة بك، عادات الأهداف، وتخطيط الأقسام، والألوان المحددة ستبقى سليمة. سيتم إعادة تعيين النشاط التاريخي، وعدادات التتابع، ومخططات الأداء إلى نقطة البداية."
                  : "Your authentication tokens, target habits, module layout, and configured color schemes will stay intact. Historical activity, streak counters, and performance charts will be restored to their baseline."}
              </p>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  checkFreshAuth();
                  setIsDeleteDataModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e7eeff] hover:bg-[#e2e8f9] text-[#151c28] text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-[#45474b]" />
                <span>{locale === "ar" ? "مسح بياناتي" : "Delete my data"}</span>
              </button>
            </div>
          </section>

          {/* Card 3: Delete My Account */}
          <section className="bg-white rounded-[20px] p-6 md:p-8 shadow-[0_8px_24px_rgba(40,50,120,0.06)] flex flex-col gap-5 border border-[#e2e8f9] transition-all hover:shadow-[0_12px_32px_rgba(40,50,120,0.08)]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a] shrink-0">
                <ShieldAlert className="w-5 h-5 text-[#ba1a1a]" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-[#ba1a1a]">
                  {locale === "ar" ? "حذف حسابي نهائياً" : "Delete my account"}
                </h3>
                <p className="text-xs text-[#45474b]">
                  {locale === "ar"
                    ? "يحذف كافة البيانات والحساب بالكامل وبشكل لا يمكن التراجع عنه."
                    : "Removes everything permanently"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-xs text-[#45474b]"
                htmlFor="confirm-deletion-input"
              >
                {locale === "ar" ? (
                  <>
                    اكتب <span className="font-semibold text-[#151c28]">DELETE MY ACCOUNT</span> للتأكيد
                  </>
                ) : (
                  <>
                    Type <span className="font-semibold text-[#151c28]">DELETE MY ACCOUNT</span> to confirm
                  </>
                )}
              </label>
              <div className="relative w-full max-w-md">
                <input
                  id="confirm-deletion-input"
                  type="text"
                  placeholder="DELETE MY ACCOUNT"
                  value={accountPhrase}
                  onChange={(e) => setAccountPhrase(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#f0f3ff] text-[#151c28] text-sm placeholder:text-[#45474b]/60 border border-[#dce2f3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ba1a1a] transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center pt-1">
              <button
                type="button"
                id="delete-account-btn"
                disabled={accountPhrase !== "DELETE MY ACCOUNT"}
                onClick={() => {
                  checkFreshAuth();
                  setIsDeleteAccountModalOpen(true);
                }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                  accountPhrase === "DELETE MY ACCOUNT"
                    ? "bg-[#ffdad6] text-[#ba1a1a] border border-[#ffdad6] hover:bg-[#ffdad6]/80"
                    : "bg-white text-[#ba1a1a] border border-[#ffdad6]/60 opacity-40 cursor-not-allowed shadow-xs"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{locale === "ar" ? "حذف حسابي نهائياً" : "Delete my account"}</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Secondary Navigation & Documentation Links */}
      <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[#45474b]">
        <Link href="/privacy" className="hover:text-[#151c28] transition-colors">
          {locale === "ar" ? "سياسة الخصوصية" : "Privacy policy"}
        </Link>
        <span className="w-1 h-1 rounded-full bg-[#dce2f3]"></span>
        <Link href="/terms" className="hover:text-[#151c28] transition-colors">
          {locale === "ar" ? "الشروط القانونية" : "Terms"}
        </Link>
      </div>

      {/* Modal: Delete Data */}
      {isDeleteDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-[20px] border border-[#e2e8f9] shadow-xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-[#151c28]">
              <div className="w-8 h-8 rounded-lg bg-[#e2e8f9] flex items-center justify-center text-[#45474b]">
                <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
              </div>
              <h3 className="text-sm font-bold">
                {locale === "ar" ? "حذف كافة بيانات وسجلات القياس" : "Delete All Telemetry Data"}
              </h3>
            </div>

            <p className="text-xs text-[#45474b] leading-relaxed">
              {locale === "ar"
                ? "سيؤدي هذا لمسح نهائي لكافة التمارين، وسجلات الوزن، والنوم، والتغذية، وجلسات التركيز ونتائج الحساب. تظل اختيارات الأقسام وحسابك فعالاً."
                : "This will permanently delete all workouts, bodyweights, sleep logs, nutrition logs, focus sessions, and math results across all tables. Your active module selections and account login remain active."}
            </p>

            {/* Google Re-authentication Verification Banner */}
            {activeReauthMethod === "google" && !isReauthenticated ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="text-xs text-amber-800 font-medium leading-relaxed">
                  {locale === "ar"
                    ? "يلزم تأكيد هويتك بتسجيل دخول حديث عبر Google (خلال آخر 5 دقائق) قبل المتابعة."
                    : "For your security, a fresh sign-in via Google (within the last 5 minutes) is required before deleting."}
                </div>
                <button
                  type="button"
                  onClick={handleReauthGoogle}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>{locale === "ar" ? "التحقق عبر Google الآن" : "Verify with Google Now"}</span>
                </button>
              </div>
            ) : activeReauthMethod === "google" && isReauthenticated ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {locale === "ar"
                    ? "تم التحقق من هويتك عبر Google (جلسة نشطة)."
                    : "Identity verified via Google (active session)."}
                </span>
              </div>
            ) : null}

            <form onSubmit={handleDeleteData} className="space-y-3 pt-1">
              {activeReauthMethod === "password" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#151c28]">
                    {locale === "ar" ? "كلمة المرور الحالية" : "Current password"}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={dataPassword}
                    onChange={(e) => setDataPassword(e.target.value)}
                    className="w-full h-10 px-3 bg-[#f0f3ff] border border-[#dce2f3] rounded-xl text-xs text-[#151c28] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#000000]"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#151c28]">
                  {locale === "ar" ? (
                    <>
                      اكتب <span className="text-[#ba1a1a] font-bold">&ldquo;DELETE MY DATA&rdquo;</span> للتأكيد
                    </>
                  ) : (
                    <>
                      Type <span className="text-[#ba1a1a] font-bold">&ldquo;DELETE MY DATA&rdquo;</span> to confirm
                    </>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE MY DATA"
                  value={dataPhrase}
                  onChange={(e) => setDataPhrase(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f0f3ff] border border-[#dce2f3] rounded-xl text-xs text-[#151c28] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#000000]"
                  dir="ltr"
                />
              </div>

              {deleteDataError && (
                <div className="p-3 bg-[#ffdad6]/40 border border-[#ffdad6] rounded-xl text-xs text-[#ba1a1a]">
                  {deleteDataError}
                </div>
              )}

              {deleteDataSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  {locale === "ar" ? "تم مسح البيانات بنجاح. جاري التحديث..." : "Telemetry data deleted. Reloading..."}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteDataModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#dce2f3] text-xs font-semibold text-[#151c28] hover:bg-[#f0f3ff] cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-[#000000] text-white text-xs font-semibold hover:bg-[#1a1c20] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-[20px] border border-[#ffdad6] shadow-xl max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-[#ba1a1a]">
              <div className="w-8 h-8 rounded-lg bg-[#ffdad6] flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-[#ba1a1a]" />
              </div>
              <h3 className="text-sm font-bold">
                {locale === "ar" ? "حذف الحساب نهائياً" : "Permanently Delete Account"}
              </h3>
            </div>

            <p className="text-xs text-[#45474b] leading-relaxed">
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

            {/* Google Re-authentication Verification Banner */}
            {activeReauthMethod === "google" && !isReauthenticated ? (
              <div className="p-3.5 rounded-xl bg-[#ffdad6]/40 border border-[#ffdad6] space-y-2">
                <div className="text-xs text-[#ba1a1a] font-semibold leading-relaxed">
                  {locale === "ar"
                    ? "يلزم تأكيد هويتك بتسجيل دخول حديث عبر Google (خلال آخر 5 دقائق) قبل حذف الحساب."
                    : "For security, a fresh sign-in via Google (within the last 5 minutes) is required before deleting your account."}
                </div>
                <button
                  type="button"
                  onClick={handleReauthGoogle}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>{locale === "ar" ? "التحقق عبر Google الآن" : "Verify with Google Now"}</span>
                </button>
              </div>
            ) : activeReauthMethod === "google" && isReauthenticated ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {locale === "ar"
                    ? "تم التحقق من هويتك عبر Google (جلسة نشطة)."
                    : "Identity verified via Google (active session)."}
                </span>
              </div>
            ) : null}

            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-1">
              {activeReauthMethod === "password" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#151c28]">
                    {locale === "ar" ? "كلمة المرور الحالية" : "Current password"}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full h-10 px-3 bg-[#f0f3ff] border border-[#dce2f3] rounded-xl text-xs text-[#151c28] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ba1a1a]"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#151c28]">
                  {locale === "ar" ? (
                    <>
                      اكتب <span className="text-[#ba1a1a] font-bold">&ldquo;DELETE MY ACCOUNT&rdquo;</span> للتأكيد
                    </>
                  ) : (
                    <>
                      Type <span className="text-[#ba1a1a] font-bold">&ldquo;DELETE MY ACCOUNT&rdquo;</span> to confirm
                    </>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE MY ACCOUNT"
                  value={accountPhrase}
                  onChange={(e) => setAccountPhrase(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f0f3ff] border border-[#dce2f3] rounded-xl text-xs text-[#151c28] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ba1a1a]"
                  dir="ltr"
                />
              </div>

              {deleteAccountError && (
                <div className="p-3 bg-[#ffdad6]/40 border border-[#ffdad6] rounded-xl text-xs text-[#ba1a1a]">
                  {deleteAccountError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#dce2f3] text-xs font-semibold text-[#151c28] hover:bg-[#f0f3ff] cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-[#ba1a1a] text-white text-xs font-semibold hover:bg-[#93000a] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
