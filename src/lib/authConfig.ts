export type AuthMode = "email" | "google" | "both";

/**
 * Single source of truth for the active sign-in mode.
 * - "email": email/password form only (Google button hidden, signInWithOAuth unreachable)
 * - "google": Google button only (email form hidden, signUp/signInWithPassword unreachable)
 * - "both": both Google and email/password shown and active
 *
 * No environment variable, cookie, localStorage entry, or URL parameter may override this constant.
 */
export const AUTH_MODE: "email" | "google" | "both" = "email";

export const MIN_PASSWORD_LENGTH = 10;

export const RECOVERY_FLOW_COOKIE = "lm_recovery_flow";
export const RECOVERY_FLOW_MAX_AGE_SECONDS = 600;

/**
 * Determines whether a visitor is allowed to use /reset-password.
 * - Only allowed after a valid recovery flow (httpOnly cookie set by /auth/reset or /auth/confirm?type=recovery,
 *   or an explicit PASSWORD_RECOVERY auth event).
 * - A normally signed-in user who opens /reset-password directly without a recovery flow is redirected to /today
 *   and cannot set a new password without their current password.
 */
export function canAccessResetPasswordPage({
  hasUser,
  hasRecoveryCookie,
  isPasswordRecoveryEvent = false,
}: {
  hasUser: boolean;
  hasRecoveryCookie: boolean;
  isPasswordRecoveryEvent?: boolean;
}): { allowed: boolean; redirectTo: string | null } {
  const validRecovery = Boolean(hasRecoveryCookie || isPasswordRecoveryEvent);

  if (validRecovery && hasUser) {
    return { allowed: true, redirectTo: null };
  }

  // Normally signed-in user opening /reset-password directly -> redirect away to /today
  if (hasUser && !validRecovery) {
    return { allowed: false, redirectTo: "/today" };
  }

  return { allowed: false, redirectTo: "/login" };
}

/**
 * Validates the `next` redirect parameter to strictly guarantee:
 * - Only relative paths on our own origin are allowed
 * - Blocks protocol-relative attacks (//evil.com)
 * - Blocks backslash bypasses (/\evil.com or \evil.com)
 * - Blocks protocol schemes (javascript:, https:, etc.)
 * - Falls back to fallbackPath (default /today)
 */
export function validateRelativeRedirect(
  nextParam: string | null | undefined,
  fallbackPath: string = "/today"
): string {
  const safeFallback =
    typeof fallbackPath === "string" &&
    fallbackPath.startsWith("/") &&
    !fallbackPath.startsWith("//")
      ? fallbackPath
      : "/today";

  if (!nextParam || typeof nextParam !== "string") {
    return safeFallback;
  }

  const trimmed = nextParam.trim();

  // 1. Must start with a single forward slash and cannot start with //
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return safeFallback;
  }

  // 2. Must not contain backslashes, control characters, or protocol specifiers
  if (trimmed.includes("\\") || trimmed.includes("://") || trimmed.includes("\0")) {
    return safeFallback;
  }

  // 3. Parse with URL using a local base to verify origin match and path validity
  try {
    const dummyOrigin = "http://localhost.localdomain";
    const parsed = new URL(trimmed, dummyOrigin);
    if (parsed.origin !== dummyOrigin) {
      return safeFallback;
    }
    // Prevent redirect loops back to login or auth routes
    if (parsed.pathname === "/login" || parsed.pathname.startsWith("/auth")) {
      return safeFallback;
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return safeFallback;
  }
}

export function isEmailAuthAllowed(mode: AuthMode = AUTH_MODE): boolean {
  return mode === "email" || mode === "both";
}

export function isGoogleAuthAllowed(mode: AuthMode = AUTH_MODE): boolean {
  return mode === "google" || mode === "both";
}

export type ReauthMethod = "password" | "google";

export interface AuthUserLike {
  id?: string;
  email?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  } | null;
  identities?: Array<{
    provider?: string;
  }> | null;
}

/**
 * Extracts normalized identity provider names from a Supabase user object.
 */
export function getUserProviders(user: AuthUserLike | null | undefined): string[] {
  if (!user) return [];
  const providers = new Set<string>();

  if (Array.isArray(user.identities)) {
    for (const identity of user.identities) {
      if (identity && typeof identity.provider === "string" && identity.provider.trim()) {
        providers.add(identity.provider.trim().toLowerCase());
      }
    }
  }

  if (user.app_metadata && Array.isArray(user.app_metadata.providers)) {
    for (const p of user.app_metadata.providers) {
      if (typeof p === "string" && p.trim()) {
        providers.add(p.trim().toLowerCase());
      }
    }
  }

  if (user.app_metadata && typeof user.app_metadata.provider === "string" && user.app_metadata.provider.trim()) {
    providers.add(user.app_metadata.provider.trim().toLowerCase());
  }

  return Array.from(providers);
}

/**
 * Returns true when the user authenticated via Google OAuth and has no email/password identity.
 */
export function isGoogleOnlyUser(user: AuthUserLike | null | undefined): boolean {
  const providers = getUserProviders(user);
  return providers.includes("google") && !providers.includes("email");
}

/**
 * Returns true when the user has an email/password identity (or default non-Google-only account).
 */
export function isEmailProviderUser(user: AuthUserLike | null | undefined): boolean {
  return !isGoogleOnlyUser(user);
}

/**
 * Picks the re-authentication method for sensitive actions ("Delete my data", "Delete my account")
 * strictly from the user's identity provider rather than AUTH_MODE.
 */
export function getDeletionReauthMethod(user: AuthUserLike | null | undefined): ReauthMethod {
  return isGoogleOnlyUser(user) ? "google" : "password";
}

export interface DeletionReauthCheckResult {
  ok: boolean;
  method: ReauthMethod;
  status?: number;
  error?: string;
  requiresReauth?: boolean;
}

/**
 * Verifies deletion re-authentication based on the user's identity provider ("password" vs "google"),
 * independent of AUTH_MODE.
 */
export async function verifyDeletionReauth(
  user: AuthUserLike,
  password: string | undefined | null,
  verifyPasswordFn: (email: string, password: string) => Promise<{ error: { message?: string } | null }>
): Promise<DeletionReauthCheckResult> {
  const method = getDeletionReauthMethod(user);

  if (method === "google") {
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (isNaN(lastSignIn) || lastSignIn < fiveMinutesAgo) {
      return {
        ok: false,
        method: "google",
        status: 403,
        error:
          "Recent verification required. Please re-authenticate with Google within the last 5 minutes before proceeding.",
        requiresReauth: true,
      };
    }
    return { ok: true, method: "google" };
  }

  // Email/password account: require current password
  if (!password || typeof password !== "string" || password.length === 0) {
    return {
      ok: false,
      method: "password",
      status: 403,
      error: "Current password is required to confirm this action.",
    };
  }

  if (!user.email) {
    return {
      ok: false,
      method: "password",
      status: 403,
      error: "User email not found for password verification.",
    };
  }

  const { error: signInErr } = await verifyPasswordFn(user.email, password);
  if (signInErr) {
    return {
      ok: false,
      method: "password",
      status: 403,
      error: "Incorrect password. Re-authentication failed.",
    };
  }

  return { ok: true, method: "password" };
}

/**
 * Translates auth errors into plain, jargon-free English or Arabic.
 * Never reveals whether an email address already exists in the system.
 */
export function getPlainAuthErrorMessage(errText: string, locale: "en" | "ar"): string {
  const lower = (errText || "").toLowerCase();

  if (lower.includes("access_denied") || lower.includes("canceled") || lower.includes("cancelled")) {
    return locale === "ar"
      ? "تم إلغاء تسجيل الدخول. يمكنك المحاولة مرة أخرى في أي وقت."
      : "Sign-in was cancelled. You can try again whenever you're ready.";
  }

  if (lower.includes("popup")) {
    return locale === "ar"
      ? "تم حظر نافذة تسجيل الدخول المنبثقة من متصفحك."
      : "Sign-in popup was blocked by your browser.";
  }

  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return locale === "ar"
      ? "لم يتم تأكيد بريدك الإلكتروني بعد. افتح رابط التأكيد في بريدك الوارد أو اضغط على إعادة إرسال رسالة التأكيد."
      : "Your email is not confirmed yet. Please check your inbox for the confirmation link or resend the confirmation email below.";
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("too many") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("only request this") ||
    lower.includes("429")
  ) {
    return locale === "ar"
      ? "محاولات كثيرة أو رسائل متكررة في وقت قصير (خدمة البريد تتيح إرسال حوالي رسالتين في الساعة). يرجى الانتظار قليلاً ثم المحاولة مرة أخرى."
      : "Too many attempts right now (the built-in email sender allows about 2 emails per hour). Please wait a while and try again.";
  }

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("invalid_grant") ||
    lower.includes("wrong password") ||
    lower.includes("incorrect password")
  ) {
    return locale === "ar"
      ? "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مرة أخرى."
      : "Incorrect email or password. Please check your details and try again.";
  }

  if (
    lower.includes("at least 10 characters") ||
    lower.includes("password should be at least") ||
    lower.includes("weak_password") ||
    lower.includes("password_too_short")
  ) {
    return locale === "ar"
      ? "يجب أن تتكون كلمة المرور من 10 أحرف على الأقل."
      : "Password must be at least 10 characters long.";
  }

  // Non-enumerating: never disclose whether an email address is already registered or absent
  if (
    lower.includes("user already registered") ||
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("email_exists") ||
    lower.includes("user not found") ||
    lower.includes("no user found")
  ) {
    return locale === "ar"
      ? "تعذر إتمام الطلب بهذه البيانات. يرجى مراجعة البريد الإلكتروني وكلمة المرور أو محاولة تسجيل الدخول."
      : "We couldn't complete that request. Please check your details or try signing in.";
  }

  if (
    lower.includes("otp_expired") ||
    lower.includes("token has expired") ||
    lower.includes("invalid token") ||
    lower.includes("missing_token") ||
    lower.includes("verification_failed") ||
    lower.includes("session_exchange_failed")
  ) {
    return locale === "ar"
      ? "انتهت صلاحية هذا الرابط أو تم استخدامه مسبقاً. يرجى طلب رابط جديد."
      : "This link has expired or was already used. Please request a new link.";
  }

  return locale === "ar"
    ? "تعذر إتمام العملية حالياً. يرجى المحاولة مرة أخرى."
    : "Unable to complete your request at the moment. Please try again.";
}
