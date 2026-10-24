"use client";

import React, { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  AlertCircle,
  Loader2,
  Globe,
  Sparkles,
  Mail,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import {
  AUTH_MODE,
  AuthMode,
  MIN_PASSWORD_LENGTH,
  isEmailAuthAllowed,
  isGoogleAuthAllowed,
  getPlainAuthErrorMessage,
  validateRelativeRedirect,
} from "@/lib/authConfig";
import { provisionFirstLogin } from "@/lib/authProvisioning";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export type EmailFlowView = "signin" | "signup" | "forgot" | "check_inbox";

/**
 * Mode-guarded Google OAuth launcher.
 * In "email" mode, this function returns immediately without calling signInWithOAuth.
 */
export async function triggerGoogleOAuth(
  mode: AuthMode,
  authClient: typeof supabase.auth,
  origin: string,
  nextParam: string | null
): Promise<{ called: boolean; error?: string }> {
  if (!isGoogleAuthAllowed(mode)) {
    return { called: false };
  }

  const safeNext = nextParam ? validateRelativeRedirect(nextParam, "/today") : null;
  const redirectUrl = `${origin}/auth/callback${
    safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""
  }`;

  const { error } = await authClient.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  return { called: true, error: error?.message };
}

/**
 * Mode-guarded Email/Password action runner.
 * In "google" mode, this function returns immediately without calling signInWithPassword or signUp.
 */
export async function triggerEmailPasswordAuth(
  mode: AuthMode,
  flow: "signin" | "signup",
  authClient: typeof supabase.auth,
  email: string,
  password: string,
  origin: string,
  nextParam: string | null
) {
  if (!isEmailAuthAllowed(mode)) {
    return { called: false as const };
  }

  const trimmedEmail = email.trim();
  const safeNext = validateRelativeRedirect(nextParam, "/today");

  if (flow === "signin") {
    const { data, error } = await authClient.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    return {
      called: true as const,
      flow: "signin" as const,
      user: data?.user ?? null,
      session: data?.session ?? null,
      error: error?.message,
      redirectTo: safeNext,
    };
  } else {
    const confirmRedirect = `${origin}/auth/confirm?next=${encodeURIComponent(safeNext)}`;
    const { data, error } = await authClient.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: confirmRedirect,
      },
    });
    return {
      called: true as const,
      flow: "signup" as const,
      user: data?.user ?? null,
      session: data?.session ?? null,
      error: error?.message,
      redirectTo: safeNext,
    };
  }
}

/**
 * Full email sign-in / sign-up orchestrator supporting both Confirm Email ON (session === null -> check_inbox)
 * and Confirm Email OFF (session present immediately -> provisionFirstLogin once -> redirect to /today for onboarding).
 */
export async function completeEmailAuthSubmission(
  mode: AuthMode,
  flow: "signin" | "signup",
  supabaseClient: typeof supabase,
  email: string,
  password: string,
  origin: string,
  nextParam: string | null
): Promise<{
  called: boolean;
  outcome?: "redirect" | "check_inbox" | "error";
  redirectTo?: string;
  error?: string;
  provisioned?: boolean;
}> {
  const result = await triggerEmailPasswordAuth(
    mode,
    flow,
    supabaseClient.auth,
    email,
    password,
    origin,
    nextParam
  );

  if (!result.called) {
    return { called: false };
  }

  if (result.error) {
    return {
      called: true,
      outcome: "error",
      error: result.error,
      provisioned: false,
    };
  }

  if (result.flow === "signin") {
    let provisioned = false;
    if (result.user) {
      try {
        await provisionFirstLogin(supabaseClient, result.user);
        provisioned = true;
      } catch {
        // Fallback provisioning also runs on first load
      }
    }
    return {
      called: true,
      outcome: "redirect",
      redirectTo: result.redirectTo,
      provisioned,
    };
  }

  // Sign-up flow:
  // 1. When Confirm Email is OFF in Supabase, signUp returns an active session immediately
  if (result.session && result.user) {
    let provisioned = false;
    try {
      await provisionFirstLogin(supabaseClient, result.user);
      provisioned = true;
    } catch {}
    return {
      called: true,
      outcome: "redirect",
      redirectTo: result.redirectTo,
      provisioned,
    };
  }

  // 2. When Confirm Email is ON in Supabase, session is null -> show "Check your inbox" screen
  return {
    called: true,
    outcome: "check_inbox",
    provisioned: false,
  };
}

function isNonEnumeratingAccountAbsenceError(errText: string | undefined): boolean {
  if (!errText) return false;
  const lower = errText.toLowerCase();
  return (
    lower.includes("user not found") ||
    lower.includes("no user found") ||
    lower.includes("email not found") ||
    lower.includes("already confirmed") ||
    lower.includes("user already registered")
  );
}

/**
 * Mode-guarded Forgot Password handler.
 * Returns an identical response whether or not the email exists, and surfaces a friendly message on rate limit.
 */
export async function triggerForgotPassword(
  mode: AuthMode,
  authClient: typeof supabase.auth,
  email: string,
  origin: string,
  locale: "en" | "ar"
): Promise<{ called: boolean; kind?: "message" | "error"; text?: string }> {
  if (!isEmailAuthAllowed(mode)) {
    return { called: false };
  }

  const trimmedEmail = email.trim();
  const { error: resetErr } = await authClient.resetPasswordForEmail(trimmedEmail, {
    redirectTo: `${origin}/auth/reset?next=/reset-password`,
  });

  if (resetErr && !isNonEnumeratingAccountAbsenceError(resetErr.message)) {
    return {
      called: true,
      kind: "error",
      text: getPlainAuthErrorMessage(resetErr.message, locale),
    };
  }

  return {
    called: true,
    kind: "message",
    text:
      locale === "ar"
        ? "إذا كان هناك حساب مرتبط بهذا البريد، فقد أرسلنا رابطاً لإعادة تعيين كلمة المرور. يرجى مراجعة صندوق الوارد."
        : "If an account exists for that email, we sent a link to reset your password. Please check your inbox.",
  };
}

/**
 * Mode-guarded Resend Confirmation handler.
 * Returns an identical response whether or not the email exists, and surfaces a friendly message on rate limit.
 */
export async function triggerResendConfirmation(
  mode: AuthMode,
  authClient: typeof supabase.auth,
  email: string,
  origin: string,
  nextParam: string | null,
  locale: "en" | "ar"
): Promise<{ called: boolean; kind?: "message" | "error"; text?: string }> {
  if (!isEmailAuthAllowed(mode)) {
    return { called: false };
  }

  const trimmedEmail = email.trim();
  const safeNext = validateRelativeRedirect(nextParam, "/today");
  const { error: resendErr } = await authClient.resend({
    type: "signup",
    email: trimmedEmail,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (resendErr && !isNonEnumeratingAccountAbsenceError(resendErr.message)) {
    return {
      called: true,
      kind: "error",
      text: getPlainAuthErrorMessage(resendErr.message, locale),
    };
  }

  return {
    called: true,
    kind: "message",
    text:
      locale === "ar"
        ? "إذا كان هناك حساب غير مفعل مرتبط بهذا البريد، فقد أرسلنا رابط تأكيد جديداً. يرجى مراجعة صندوق الوارد."
        : "If an unconfirmed account exists for that email, we sent a new confirmation link. Please check your inbox.",
  };
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const { locale, setLocale } = useI18n();

  const googleAllowed = isGoogleAuthAllowed(AUTH_MODE);
  const emailAllowed = isEmailAuthAllowed(AUTH_MODE);

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailView, setEmailView] = useState<EmailFlowView>("signin");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const getPlainErrorMessage = (errText: string) => getPlainAuthErrorMessage(errText, locale);

  // Detect language from browser preferences unless user explicitly chose one
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lifemaxxing_locale");
      if (stored === "ar" || stored === "en") {
        setLocale(stored);
      } else {
        const browserLang =
          (navigator.languages && navigator.languages[0]) || navigator.language || "";
        const preferred = browserLang.toLowerCase().startsWith("ar") ? "ar" : "en";
        setLocale(preferred);
      }
    } catch {}
  }, [setLocale]);

  // Derive incoming query param messages/errors without synchronous setState in useEffect
  const queryErrCode = searchParams.get("error");
  const queryErrDesc = searchParams.get("error_description");
  const queryExpired = searchParams.get("expired");
  const queryDeleted = searchParams.get("deleted");

  const derivedQueryMessage =
    queryExpired === "true"
      ? locale === "ar"
        ? "انتهت جلستك السابقة. يرجى تسجيل الدخول مرة أخرى للمتابعة."
        : "Your session has expired. Please sign in again to continue."
      : queryDeleted === "true"
      ? locale === "ar"
        ? "تم حذف حسابك وبياناتك بالكامل بنجاح."
        : "Your account and data have been permanently deleted."
      : null;

  const derivedQueryError =
    !derivedQueryMessage && (queryErrCode || queryErrDesc)
      ? getPlainAuthErrorMessage(`${queryErrCode || ""} ${queryErrDesc || ""}`.trim(), locale)
      : null;

  const activeError = error || derivedQueryError;
  const activeMessage = message || (!error ? derivedQueryMessage : null);

  // Google OAuth via PKCE (kept intact and compiled; unreachable in "email" mode)
  const handleGoogleSignIn = async () => {
    if (!googleAllowed) return;
    setError(null);
    setMessage(null);
    setLoadingGoogle(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const nextParam = searchParams.get("next");
      const res = await triggerGoogleOAuth(AUTH_MODE, supabase.auth, origin, nextParam);

      if (res.error) {
        setError(getPlainErrorMessage(res.error));
        setLoadingGoogle(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(getPlainErrorMessage(msg));
      setLoadingGoogle(false);
    }
  };

  // Email/Password sign-in & sign-up (unreachable in "google" mode)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAllowed) return;

    setError(null);
    setMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(getPlainErrorMessage("at least 10 characters"));
      return;
    }

    setLoadingEmail(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const nextParam = searchParams.get("next");
      const flow = emailView === "signup" ? "signup" : "signin";

      const result = await completeEmailAuthSubmission(
        AUTH_MODE,
        flow,
        supabase,
        email,
        password,
        origin,
        nextParam
      );

      if (!result.called) return;

      if (result.outcome === "error" && result.error) {
        setError(getPlainErrorMessage(result.error));
        return;
      }

      if (result.outcome === "redirect" && result.redirectTo) {
        window.location.href = result.redirectTo;
      } else if (result.outcome === "check_inbox") {
        setPassword("");
        setEmailView("check_inbox");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(getPlainErrorMessage(msg));
    } finally {
      setLoadingEmail(false);
    }
  };

  // Forgot password handler (unreachable in "google" mode)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAllowed) return;

    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError(
        locale === "ar"
          ? "يرجى إدخال عنوان بريد إلكتروني صحيح."
          : "Please enter a valid email address."
      );
      return;
    }

    setLoadingEmail(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await triggerForgotPassword(
        AUTH_MODE,
        supabase.auth,
        trimmedEmail,
        origin,
        locale
      );

      if (!res.called) return;

      if (res.kind === "error" && res.text) {
        setError(res.text);
      } else if (res.text) {
        setMessage(res.text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(getPlainErrorMessage(msg));
    } finally {
      setLoadingEmail(false);
    }
  };

  // Resend confirmation email handler (unreachable in "google" mode)
  const handleResendConfirmation = async () => {
    if (!emailAllowed) return;
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError(
        locale === "ar"
          ? "يرجى كتابة بريدك الإلكتروني أولاً لإعادة إرسال رابط التأكيد."
          : "Please enter your email address first so we can resend the confirmation link."
      );
      return;
    }

    setResendingEmail(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const nextParam = searchParams.get("next");
      const res = await triggerResendConfirmation(
        AUTH_MODE,
        supabase.auth,
        trimmedEmail,
        origin,
        nextParam,
        locale
      );

      if (!res.called) return;

      if (res.kind === "error" && res.text) {
        setError(res.text);
      } else if (res.text) {
        setMessage(res.text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(getPlainErrorMessage(msg));
    } finally {
      setResendingEmail(false);
    }
  };

  const switchView = (nextView: EmailFlowView) => {
    setError(null);
    setMessage(null);
    setEmailView(nextView);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-surface relative overflow-hidden"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-lime/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-secondary-cyan/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <button
          id="lang-toggle-btn"
          type="button"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high/80 backdrop-blur-md border border-border-subtle text-xs font-mono text-on-surface hover:text-primary-lime hover:border-primary-lime/40 transition-all cursor-pointer shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-primary-lime" />
          <span>{locale === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-surface-container border border-border-subtle rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl backdrop-blur-sm">
        {/* Brand Header: Plain Language, No Jargon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-high border border-primary-lime/30 text-primary-lime mb-4 shadow-[0_0_24px_rgba(198,255,61,0.25)]">
            <Sparkles className="w-7 h-7 text-primary-lime" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            {locale === "ar" ? "لايف" : "Life"}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 max-w-xs mx-auto">
            {locale === "ar"
              ? "مساعدك اليومي لتطوير حياتك وصحتك وتركيزك"
              : "Your personal life optimization companion"}
          </p>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="mb-5 p-3.5 bg-crimson-alert/10 border border-crimson-alert/30 rounded-2xl flex items-start gap-3 text-crimson-alert text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{activeError}</span>
          </div>
        )}

        {/* Info Message */}
        {activeMessage && (
          <div className="mb-5 p-3.5 bg-emerald-success/10 border border-emerald-success/30 rounded-2xl flex items-start gap-2.5 text-emerald-success text-xs leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{activeMessage}</span>
          </div>
        )}

        {/* GOOGLE BUTTON (rendered only when AUTH_MODE is "google" or "both") */}
        {googleAllowed && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loadingGoogle}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200"
            >
              {loadingGoogle ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>
                    {locale === "ar" ? "المتابعة باستخدام Google" : "Continue with Google"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* EMAIL / PASSWORD FLOW (rendered only when AUTH_MODE is "email" or "both") */}
        {emailAllowed && (
          <div className={googleAllowed ? "mt-8 pt-6 border-t border-border-subtle" : ""}>
            {emailView === "check_inbox" ? (
              /* Check Your Inbox Screen after Sign Up */
              <div className="space-y-5 text-center py-2" data-testid="check-inbox-screen">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-lime/10 border border-primary-lime/30 text-primary-lime mx-auto">
                  <Mail className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-on-surface">
                    {locale === "ar" ? "راجع بريدك الإلكتروني" : "Check your inbox"}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {locale === "ar"
                      ? `أرسلنا رابط تأكيد إلى ${email}. اضغط على الرابط في الرسالة لتفعيل حسابك والبدء.`
                      : `We sent a confirmation link to ${email}. Click the link in that email to activate your account.`}
                  </p>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {locale === "ar"
                      ? "إذا لم تصلك الرسالة خلال دقيقة، تفقد مجلد الرسائل غير المرغوب فيها (Spam)."
                      : "If you don't see it within a minute, please check your spam folder."}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    className="w-full py-2.5 px-4 bg-surface-container-high hover:bg-surface-container-highest border border-border-medium text-on-surface text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {resendingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-primary-lime" />
                    )}
                    <span>
                      {locale === "ar"
                        ? "إعادة إرسال رسالة التأكيد"
                        : "Resend confirmation email"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchView("signin")}
                    className="w-full py-2.5 px-4 text-xs text-on-surface-variant hover:text-primary-lime transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>
                      {locale === "ar" ? "العودة لتسجيل الدخول" : "Back to sign in"}
                    </span>
                  </button>
                </div>
              </div>
            ) : emailView === "forgot" ? (
              /* Forgot Password Screen */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-on-surface">
                    {locale === "ar" ? "استعادة كلمة المرور" : "Forgot your password?"}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {locale === "ar"
                      ? "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لتعيين كلمة مرور جديدة."
                      : "Enter your email address and we'll send you a link to reset your password."}
                  </p>
                </div>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                  <div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={locale === "ar" ? "البريد الإلكتروني" : "Email address"}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime transition-all"
                      dir="ltr"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingEmail}
                    className="w-full py-3 px-4 bg-primary-lime text-on-primary text-xs font-bold rounded-xl hover:bg-primary-lime-dim transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-surface-container-high disabled:text-text-muted disabled:cursor-not-allowed"
                  >
                    {loadingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {locale === "ar" ? "إرسال رابط الاستعادة" : "Send reset link"}
                    </span>
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => switchView("signin")}
                  className="w-full py-2 text-xs text-on-surface-variant hover:text-primary-lime transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{locale === "ar" ? "العودة لتسجيل الدخول" : "Back to sign in"}</span>
                </button>
              </div>
            ) : (
              /* Sign In / Sign Up Form */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    {emailView === "signin"
                      ? googleAllowed
                        ? locale === "ar"
                          ? "أو تسجيل الدخول بالبريد"
                          : "Or sign in with email"
                        : locale === "ar"
                        ? "تسجيل الدخول بالبريد الإلكتروني"
                        : "Sign in with email"
                      : locale === "ar"
                      ? "إنشاء حساب جديد بالبريد"
                      : "Create account with email"}
                  </span>
                  <button
                    type="button"
                    onClick={() => switchView(emailView === "signin" ? "signup" : "signin")}
                    className="text-xs text-primary-lime hover:underline cursor-pointer"
                  >
                    {emailView === "signin"
                      ? locale === "ar"
                        ? "إنشاء حساب"
                        : "Create account"
                      : locale === "ar"
                      ? "تسجيل الدخول"
                      : "Sign in"}
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  <div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={locale === "ar" ? "البريد الإلكتروني" : "Email address"}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime transition-all"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        emailView === "signup"
                          ? locale === "ar"
                            ? `كلمة المرور (${MIN_PASSWORD_LENGTH} أحرف على الأقل)`
                            : `Password (at least ${MIN_PASSWORD_LENGTH} characters)`
                          : locale === "ar"
                          ? "كلمة المرور"
                          : "Password"
                      }
                      className="w-full px-3.5 py-2.5 bg-surface-container-low border border-border-medium rounded-xl text-on-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-lime transition-all"
                      dir="ltr"
                    />
                    {emailView === "signup" && (
                      <p className="mt-1.5 text-[11px] text-text-muted">
                        {locale === "ar"
                          ? `يجب أن تتكون كلمة المرور من ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`
                          : `Must be at least ${MIN_PASSWORD_LENGTH} characters long.`}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loadingEmail}
                    className={
                      googleAllowed
                        ? "w-full py-2.5 px-4 bg-surface-container-high border border-border-medium text-on-surface text-xs font-semibold rounded-xl hover:bg-surface-container transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        : "w-full py-3 px-4 bg-primary-lime text-on-primary text-xs font-bold rounded-xl hover:bg-primary-lime-dim transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-surface-container-high disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed shadow-sm"
                    }
                  >
                    {loadingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {emailView === "signin"
                        ? locale === "ar"
                          ? "دخول"
                          : "Sign in"
                        : locale === "ar"
                        ? "إنشاء حساب"
                        : "Create account"}
                    </span>
                  </button>
                </form>

                {/* Secondary actions: Forgot password & Resend confirmation */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-on-surface-variant hover:text-primary-lime transition-colors cursor-pointer"
                  >
                    {locale === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    className="text-on-surface-variant hover:text-primary-lime transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {locale === "ar"
                      ? "إعادة إرسال رسالة التأكيد"
                      : "Resend confirmation email"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy & Terms Disclaimer */}
        <div className="mt-8 text-center text-xs text-on-surface-variant leading-relaxed">
          {locale === "ar" ? (
            <>
              بتسجيل دخولك، فإنك توافق على{" "}
              <Link href="/terms" className="text-on-surface underline hover:text-primary-lime">
                شروط الخدمة
              </Link>{" "}
              و{" "}
              <Link href="/privacy" className="text-on-surface underline hover:text-primary-lime">
                سياسة الخصوصية
              </Link>
              .
            </>
          ) : (
            <>
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-on-surface underline hover:text-primary-lime">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-on-surface underline hover:text-primary-lime">
                Privacy Policy
              </Link>
              .
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-surface">
          <Loader2 className="w-6 h-6 animate-spin text-primary-lime" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
