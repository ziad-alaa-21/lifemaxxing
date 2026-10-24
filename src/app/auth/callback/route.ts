import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionFirstLogin } from "@/lib/authProvisioning";
import { validateRelativeRedirect } from "@/lib/authConfig";

export { validateRelativeRedirect };

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = validateRelativeRedirect(requestUrl.searchParams.get("next"));

  // 1. Handle OAuth provider error (e.g., user cancelled or Google rejected)
  if (error || errorDescription) {
    console.error("Auth callback received error from OAuth provider:", { error, errorDescription });
    const redirectUrl = new URL("/login", requestUrl.origin);
    redirectUrl.searchParams.set("error", error || "oauth_error");
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Exchange authorization code for session via PKCE
  if (code) {
    try {
      const supabase = await createClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Error exchanging OAuth code for session:", exchangeError.message);
        const redirectUrl = new URL("/login", requestUrl.origin);
        redirectUrl.searchParams.set("error", "session_exchange_failed");
        redirectUrl.searchParams.set("error_description", exchangeError.message);
        return NextResponse.redirect(redirectUrl);
      }

      // 3. First login provisioning: user_modules, profiles, user_settings
      const user = data.user;
      if (user) {
        try {
          await provisionFirstLogin(supabase, user);
        } catch (provisionErr) {
          console.error("Error during first login provisioning:", provisionErr);
        }
      }

      // 4. Safe redirect to validated local destination
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (err: unknown) {
      console.error("Unhandled error in auth callback route:", err);
      const redirectUrl = new URL("/login", requestUrl.origin);
      redirectUrl.searchParams.set("error", "unexpected_auth_error");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 3. Fallback: No authorization code or error was passed
  const redirectUrl = new URL("/login", requestUrl.origin);
  redirectUrl.searchParams.set("error", "missing_code");
  return NextResponse.redirect(redirectUrl);
}
