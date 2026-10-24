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

const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const defaultRedirect = rawType === "recovery" ? "/reset-password" : "/today";
  const next = validateRelativeRedirect(requestUrl.searchParams.get("next"), defaultRedirect);

  if (error || errorDescription) {
    const redirectUrl = new URL("/login", requestUrl.origin);
    redirectUrl.searchParams.set("error", error || "verification_failed");
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 1. Verify OTP via token_hash + type
  if (tokenHash && rawType && VALID_OTP_TYPES.includes(rawType as EmailOtpType)) {
    try {
      const supabase = await createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        type: rawType as EmailOtpType,
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
          console.error("Error during first login provisioning in /auth/confirm:", provisionErr);
        }
      }

      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      if (rawType === "recovery") {
        response.cookies.set(RECOVERY_FLOW_COOKIE, "1", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: RECOVERY_FLOW_MAX_AGE_SECONDS,
          secure: process.env.NODE_ENV === "production",
        });
      }
      return response;
    } catch (err: unknown) {
      console.error("Unhandled error in /auth/confirm route:", err);
      const redirectUrl = new URL("/login", requestUrl.origin);
      redirectUrl.searchParams.set("error", "unexpected_auth_error");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Support PKCE code fallback if Supabase redirected with ?code=
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
          console.error("Error during first login provisioning in /auth/confirm:", provisionErr);
        }
      }

      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      if (rawType === "recovery") {
        response.cookies.set(RECOVERY_FLOW_COOKIE, "1", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: RECOVERY_FLOW_MAX_AGE_SECONDS,
          secure: process.env.NODE_ENV === "production",
        });
      }
      return response;
    } catch (err: unknown) {
      console.error("Unhandled error in /auth/confirm PKCE fallback:", err);
      const redirectUrl = new URL("/login", requestUrl.origin);
      redirectUrl.searchParams.set("error", "unexpected_auth_error");
      return NextResponse.redirect(redirectUrl);
    }
  }

  const redirectUrl = new URL("/login", requestUrl.origin);
  redirectUrl.searchParams.set("error", "missing_token");
  return NextResponse.redirect(redirectUrl);
}
