import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  MIN_PASSWORD_LENGTH,
  RECOVERY_FLOW_COOKIE,
  canAccessResetPasswordPage,
} from "@/lib/authConfig";
import { provisionFirstLogin } from "@/lib/authProvisioning";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasRecoveryCookie = request.cookies.get(RECOVERY_FLOW_COOKIE)?.value === "1";
  const access = canAccessResetPasswordPage({
    hasUser: Boolean(user),
    hasRecoveryCookie,
  });

  if (!access.allowed) {
    return NextResponse.json(
      {
        allowed: false,
        redirectTo: access.redirectTo || (user ? "/today" : "/login"),
      },
      { status: user ? 403 : 401 }
    );
  }

  return NextResponse.json({ allowed: true });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasRecoveryCookie = request.cookies.get(RECOVERY_FLOW_COOKIE)?.value === "1";
  const access = canAccessResetPasswordPage({
    hasUser: Boolean(user),
    hasRecoveryCookie,
  });

  if (!access.allowed || !user) {
    return NextResponse.json(
      {
        error: user
          ? "Password reset requires a valid recovery link. To change your password while signed in, use Account Settings and enter your current password."
          : "Recovery session expired. Please request a new password reset link.",
        redirectTo: access.redirectTo || (user ? "/today" : "/login"),
      },
      { status: user ? 403 : 401 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const newPassword = typeof body.password === "string" ? body.password : "";
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` },
      { status: 400 }
    );
  }

  const { data, error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  if (data.user) {
    try {
      await provisionFirstLogin(supabase, data.user);
    } catch {
      // Non-fatal fallback
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(RECOVERY_FLOW_COOKIE);
  return response;
}
