"use client";

import React, { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2, Globe, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  MIN_PASSWORD_LENGTH,
  canAccessResetPasswordPage,
  getPlainAuthErrorMessage,
  validateRelativeRedirect,
} from "@/lib/authConfig";
import { provisionFirstLogin } from "@/lib/authProvisioning";

/**
 * Guarded password reset executor.
 * Ensures a normally signed-in user who opens /reset-password directly cannot set a new password
 * without going through a valid recovery flow.
 */
export async function executeGuardedPasswordReset({
  hasUser,
  hasRecoveryCookie,
  isPasswordRecoveryEvent = false,
  newPassword,
  confirmPassword,
  updatePasswordFn,
}: {
  hasUser: boolean;
  hasRecoveryCookie: boolean;
  isPasswordRecoveryEvent?: boolean;
  newPassword: string;
  confirmPassword: string;
  updatePasswordFn: (password: string) => Promise<{ error?: { message?: string } | null }>;
}): Promise<{
  allowed: boolean;
  updated: boolean;
  redirectTo: string | null;
  error?: string;
}> {
  const access = canAccessResetPasswordPage({
    hasUser,
    hasRecoveryCookie,
    isPasswordRecoveryEvent,
  });

  if (!access.allowed) {
    return {
      allowed: false,
      updated: false,
      redirectTo: access.redirectTo,
      error: "Unauthorized recovery session",
    };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      allowed: true,
      updated: false,
      redirectTo: null,
      error: "password_too_short",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      allowed: true,
      updated: false,
      redirectTo: null,
      error: "password_mismatch",
    };
  }

  const { error } = await updatePasswordFn(newPassword);
  if (error) {
    return {
      allowed: true,
      updated: false,
      redirectTo: null,
      error: error.message || "reset_failed",
    };
  }

  return {
    allowed: true,
    updated: true,
    redirectTo: "/today",
  };
}

export function ResetPasswordForm({
  initialRecoveryAllowed,
}: {
  initialRecoveryAllowed?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale, setLocale } = useI18n();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(initialRecoveryAllowed === undefined);
  const [hasRecoverySession, setHasRecoverySession] = useState(Boolean(initialRecoveryAllowed));
  const [usedClientRecoveryEvent, setUsedClientRecoveryEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialRecoveryAllowed !== undefined) {
      return;
    }

    let active = true;

    const verifyRecoveryFlow = async () => {
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "GET",
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));

        if (!active) return;

        if (res.ok && data.allowed) {
          setHasRecoverySession(true);
          setCheckingSession(false);
          return;
        }

        // A normally signed-in user opening /reset-password directly gets 403 + redirectTo: "/today"
        if (res.status === 403 && data.redirectTo) {
          setHasRecoverySession(false);
          setCheckingSession(false);
          router.replace(data.redirectTo);
          return;
        }
      } catch {
        // Fallback to auth state listener if offline
      } finally {
        if (active) setCheckingSession(false);
      }
    };

    verifyRecoveryFlow();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      // Only accept explicit PASSWORD_RECOVERY events (never normal SIGNED_IN sessions)
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setHasRecoverySession(true);
        setUsedClientRecoveryEvent(true);
        setCheckingSession(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [initialRecoveryAllowed, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasRecoverySession) {
      router.replace("/today");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        locale === "ar"
          ? `يجب أن تتكون كلمة المرور من ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`
          : `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        locale === "ar"
          ? "كلمتا المرور غير متطابقتين. يرجى التأكد من تطابقهما."
          : "Passwords do not match. Please make sure both fields match."
      );
      return;
    }

    setLoading(true);
    try {
      if (!usedClientRecoveryEvent) {
        // Server-enforced recovery update via httpOnly recovery cookie
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ password: newPassword }),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 403 && payload.redirectTo) {
            router.replace(payload.redirectTo);
            return;
          }
          setError(getPlainAuthErrorMessage(payload.error || "reset_failed", locale));
          return;
        }
      } else {
        const { data, error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateErr) {
          setError(getPlainAuthErrorMessage(updateErr.message, locale));
          return;
        }

        if (data.user) {
          try {
            await provisionFirstLogin(supabase, data.user);
          } catch {}
        }
      }

      setSuccess(true);
      const nextDest = validateRelativeRedirect(searchParams.get("next"), "/today");
      setTimeout(() => {
        window.location.href = nextDest;
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(getPlainAuthErrorMessage(msg, locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-surface relative overflow-hidden"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-lime/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-secondary-cyan/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high/80 backdrop-blur-md border border-border-subtle text-xs font-mono text-on-surface hover:text-primary-lime hover:border-primary-lime/40 transition-all cursor-pointer shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-primary-lime" />
          <span>{locale === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-surface-container border border-border-subtle rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-high border border-primary-lime/30 text-primary-lime mb-4 shadow-xs">
            <KeyRound className="w-7 h-7 text-primary-lime" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface">
            {locale === "ar" ? "تعيين كلمة مرور جديدة" : "Set a new password"}
          </h1>
          <p className="text-xs text-on-surface-variant mt-1.5">
            {locale === "ar"
              ? `اختر كلمة مرور جديدة لا تقل عن ${MIN_PASSWORD_LENGTH} أحرف.`
              : `Choose a new password with at least ${MIN_PASSWORD_LENGTH} characters.`}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-crimson-alert/10 border border-crimson-alert/30 rounded-2xl flex items-start gap-3 text-crimson-alert text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-emerald-success/10 border border-emerald-success/30 rounded-2xl flex flex-col items-center gap-2 text-emerald-success text-xs leading-relaxed">
              <CheckCircle2 className="w-6 h-6" />
              <span>
                {locale === "ar"
                  ? "تم تحديث كلمة المرور بنجاح! جاري تحويلك..."
                  : "Your password has been updated! Taking you to your dashboard..."}
              </span>
            </div>
          </div>
        ) : checkingSession ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-xs text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin text-primary-lime" />
            <span>{locale === "ar" ? "جاري التحقق من الرابط..." : "Checking your reset link..."}</span>
          </div>
        ) : !hasRecoverySession ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-amber-core/10 border border-amber-core/30 rounded-2xl text-amber-core text-xs leading-relaxed">
              {locale === "ar"
                ? "انتهت صلاحية رابط استعادة كلمة المرور أو تم استخدامه مسبقاً. يرجى طلب رابط جديد من صفحة تسجيل الدخول."
                : "This password reset link has expired or was already used. Please request a new reset link from the sign-in page."}
            </div>
            <Link
              href="/login"
              className="w-full py-3 px-4 bg-primary-lime text-on-primary font-semibold text-xs rounded-xl hover:bg-primary-lime-dim transition-all inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{locale === "ar" ? "العودة لتسجيل الدخول" : "Back to sign in"}</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                {locale === "ar" ? "كلمة المرور الجديدة" : "New password"}
              </label>
              <input
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={
                  locale === "ar"
                    ? `${MIN_PASSWORD_LENGTH} أحرف على الأقل`
                    : `At least ${MIN_PASSWORD_LENGTH} characters`
                }
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime transition-all"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                {locale === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}
              </label>
              <input
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={locale === "ar" ? "أعد كتابة كلمة المرور" : "Re-enter new password"}
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime transition-all"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-lime text-on-primary text-xs font-bold rounded-xl hover:bg-primary-lime-dim transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{locale === "ar" ? "حفظ كلمة المرور الجديدة" : "Save new password"}</span>
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-on-surface-variant hover:text-primary-lime inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "العودة لتسجيل الدخول" : "Back to sign in"}</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-surface">
          <Loader2 className="w-6 h-6 animate-spin text-primary-lime" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
