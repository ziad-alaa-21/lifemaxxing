import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { provisionFirstLogin } from "@/lib/authProvisioning";
import {
  RECOVERY_FLOW_COOKIE,
  RECOVERY_FLOW_MAX_AGE_SECONDS,
  validateRelativeRedirect,
} from "@/lib/authConfig";

export { validateRelativeRedirect };

function attachRecoveryFlowCookie(response: NextResponse): NextResponse {
  response.cookies.set(RECOVERY_FLOW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: RECOVERY_FLOW_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type") || "recovery";
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = validateRelativeRedirect(requestUrl.searchParams.get("next"), "/reset-password");

  if (error || errorDescription) {
    const redirectUrl = new URL("/login", requestUrl.origin);
    redirectUrl.searchParams.set("error", error || "verification_failed");
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 1. Verify recovery OTP via token_hash
  if (tokenHash) {
    try {
      const supabase = await createClient();
      const otpType: EmailOtpType = rawType === "recovery" ? "recovery" : "email";
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      });

      if (verifyError) {
        const redirectUrl = new URL("/login", requestUrl.origin);
        redirectUrl.searchParams.set("error", "verification_failed");
        redirectUrl.searchParams.set("error_description", verifyError.message);
        return NextResponse.redirect(redirectUrl);
      }

      if (data.user) {
        try {
          await provisionFirstLogin(supabase, data.user);
        } catch (provisionErr) {
          console.error("Error during provisioning in /auth/reset:", provisionErr);
        }
      }

      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      return attachRecoveryFlowCookie(response);
    } catch (err: unknown) {
      console.error("Unhandled error in /auth/reset route:", err);
      const redirectUrl = new URL("/login", requestUrl.origin);
      redirectUrl.searchParams.set("error", "unexpected_auth_error");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Verify recovery code via PKCE exchange
  if (code) {
    try {
      const supabase = await createClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        const redirectUrl = new URL("/login", requestUrl.origin);
        redirectUrl.searchParams.set("error", "session_exchange_failed");
        redirectUrl.searchParams.set("error_description", exchangeError.message);
        return NextResponse.redirect(redirectUrl);
      }

      if (data.user) {
        try {
          await provisionFirstLogin(supabase, data.user);
        } catch (provisionErr) {
          console.error("Error during provisioning in /auth/reset:", provisionErr);
        }
      }

      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      return attachRecoveryFlowCookie(response);
    } catch (err: unknown) {
      console.error("Unhandled error in /auth/reset PKCE exchange:", err);
      const redirectUrl = new URL("/login", requestUrl.origin);
      redirectUrl.searchParams.set("error", "unexpected_auth_error");
      return NextResponse.redirect(redirectUrl);
    }
  }

  const redirectUrl = new URL("/login", requestUrl.origin);
  redirectUrl.searchParams.set("error", "missing_token");
  return NextResponse.redirect(redirectUrl);
}
