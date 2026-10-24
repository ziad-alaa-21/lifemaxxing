import { createServerClient } from "@supabase/ssr";
import { createClient as createDirectClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_FLOW_COOKIE, canAccessResetPasswordPage } from "@/lib/authConfig";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Fetch verified user from Supabase Auth
  let user = (await supabase.auth.getUser()).data.user;

  const pathname = request.nextUrl.pathname;

  // Support Authorization: Bearer <token> for API requests (e.g. scripts or mobile)
  if (!user && pathname.startsWith("/api")) {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const direct = createDirectClient(supabaseUrl, supabaseAnonKey);
      const res = await direct.auth.getUser(token);
      if (res.data?.user) {
        user = res.data.user;
      }
    }
  }

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/offline" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/icon-") ||
    pathname.includes(".");

  // 0. Guard /reset-password: only accessible during an active recovery flow (lm_recovery_flow cookie).
  // A normally signed-in user opening /reset-password directly is redirected to /today.
  if (pathname === "/reset-password") {
    const hasRecoveryCookie = request.cookies.get(RECOVERY_FLOW_COOKIE)?.value === "1";
    const access = canAccessResetPasswordPage({
      hasUser: Boolean(user),
      hasRecoveryCookie,
    });
    if (!access.allowed && access.redirectTo) {
      const url = request.nextUrl.clone();
      url.pathname = access.redirectTo;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 1. Unauthenticated user trying to access protected routes
  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname + request.nextUrl.search);
      const hasAuthCookies = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
      if (hasAuthCookies) {
        url.searchParams.set("expired", "true");
      }
    }
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user trying to access /login
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  // 3. Root URL redirect
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/today" : "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
