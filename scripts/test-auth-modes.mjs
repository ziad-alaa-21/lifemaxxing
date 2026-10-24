import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = process.cwd();

/**
 * Compiles and loads TypeScript/TSX modules from `src/` in-memory with configurable mocks
 * and optional override of AUTH_MODE in `src/lib/authConfig.ts` so all 3 modes can be tested
 * deterministically without touching production Supabase.
 */
function createTestLoader({
  authModeOverride = null,
  supabaseClientMock = null,
  supabaseServerMock = null,
  searchParamsMap = {},
  locale = "en",
} = {}) {
  const moduleCache = new Map();

  const defaultClientMock = supabaseClientMock || {
    auth: {
      signInWithOAuth: async () => ({ data: {}, error: null }),
      signInWithPassword: async () => ({ data: { user: { id: "u1" }, session: {} }, error: null }),
      signUp: async () => ({ data: { user: { id: "u1" }, session: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      resend: async () => ({ data: {}, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: async () => ({ data: { user: { id: "u1" } }, error: null }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user }, error: null }),
    },
  };

  function resolveFilePath(specifier, parentDir) {
    let basePath;
    if (specifier.startsWith("@/")) {
      basePath = path.join(ROOT, "src", specifier.slice(2));
    } else if (specifier.startsWith(".")) {
      basePath = path.resolve(parentDir, specifier);
    } else {
      return null;
    }

    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.tsx"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    }
    throw new Error(`Cannot resolve module ${specifier} from ${parentDir}`);
  }

  function loadModule(specifier, parentDir = ROOT) {
    // Intercept Next.js / React / Supabase mocks when needed
    if (specifier === "react") return React;
    if (specifier === "next/link") {
      const LinkMock = ({ href, children, ...rest }) =>
        React.createElement("a", { href, ...rest }, children);
      return {
        __esModule: true,
        default: LinkMock,
      };
    }
    if (specifier === "next/navigation") {
      return {
        useSearchParams: () => ({
          get: (key) => (key in searchParamsMap ? searchParamsMap[key] : null),
        }),
        useRouter: () => ({
          push: () => {},
          replace: () => {},
          refresh: () => {},
        }),
        redirect: (url) => {
          throw new Error(`NEXT_REDIRECT:${url}`);
        },
      };
    }
    if (specifier === "@/lib/supabase/client") {
      return { supabase: defaultClientMock };
    }
    if (specifier === "@/lib/supabase/server") {
      return {
        createClient: async () => {
          if (!supabaseServerMock) {
            throw new Error("supabaseServerMock not configured");
          }
          return supabaseServerMock;
        },
      };
    }
    if (specifier === "@/lib/i18n/I18nContext") {
      return {
        useI18n: () => ({
          locale,
          setLocale: () => {},
          dict: {
            common: { cancel: locale === "ar" ? "إلغاء" : "Cancel" },
            settings: {
              account: "Account",
              protocol: "Protocol",
              preferences: "Preferences",
              devices: "Devices",
              data: "Data",
              privacy: "Privacy",
            },
          },
        }),
      };
    }

    const resolved = resolveFilePath(specifier, parentDir);
    if (!resolved) {
      const req = Module.createRequire(path.join(ROOT, "package.json"));
      return req(specifier);
    }

    if (moduleCache.has(resolved)) {
      return moduleCache.get(resolved).exports;
    }

    let source = fs.readFileSync(resolved, "utf8");
    if (
      authModeOverride &&
      path.normalize(resolved) === path.normalize(path.join(ROOT, "src/lib/authConfig.ts"))
    ) {
      source = source.replace(
        /export const AUTH_MODE:\s*"email"\s*\|\s*"google"\s*\|\s*"both"\s*=\s*"(email|google|both)";/,
        `export const AUTH_MODE: "email" | "google" | "both" = "${authModeOverride}";`
      );
    }

    const transpiled = ts.transpileModule(source, {
      fileName: resolved,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });

    const mod = { exports: {} };
    moduleCache.set(resolved, mod);

    const customRequire = (id) => loadModule(id, path.dirname(resolved));
    const fn = new Function("exports", "require", "module", "__filename", "__dirname", transpiled.outputText);
    fn(mod.exports, customRequire, mod, resolved, path.dirname(resolved));

    return mod.exports;
  }

  return { loadModule };
}

function createInMemorySupabase({ user = null, verifyOtpError = null, exchangeError = null, signInError = null } = {}) {
  const tables = {
    user_modules: [],
    profiles: [],
    user_settings: [],
  };
  const counts = {
    insertCalls: { user_modules: 0, profiles: 0, user_settings: 0 },
    verifyOtpCalls: 0,
    exchangeCodeCalls: 0,
  };

  const client = {
    tables,
    counts,
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      verifyOtp: async ({ type, token_hash }) => {
        counts.verifyOtpCalls += 1;
        if (verifyOtpError) {
          return { data: { user: null, session: null }, error: { message: verifyOtpError } };
        }
        return { data: { user, session: { access_token: `tok_${type}_${token_hash}` } }, error: null };
      },
      exchangeCodeForSession: async (code) => {
        counts.exchangeCodeCalls += 1;
        if (exchangeError) {
          return { data: { user: null, session: null }, error: { message: exchangeError } };
        }
        return { data: { user, session: { access_token: `code_${code}` } }, error: null };
      },
      signInWithPassword: async ({ password }) => {
        if (signInError || password === "wrong-password") {
          return { data: { user: null, session: null }, error: { message: signInError || "Invalid login credentials" } };
        }
        return { data: { user, session: {} }, error: null };
      },
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user }, error: null }),
    },
    rpc: async () => ({ error: null }),
    from: (tableName) => {
      if (!(tableName in tables)) {
        tables[tableName] = [];
      }
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              const found = tables[tableName].find((r) => r[col] === val) || null;
              return { data: found, error: null };
            },
            single: async () => {
              const found = tables[tableName].find((r) => r[col] === val) || null;
              return { data: found, error: found ? null : { message: "Not found" } };
            },
          }),
        }),
        insert: async (row) => {
          counts.insertCalls[tableName] = (counts.insertCalls[tableName] || 0) + 1;
          tables[tableName].push({ ...row });
          return { data: row, error: null };
        },
        delete: () => ({
          eq: async (col, val) => {
            tables[tableName] = tables[tableName].filter((r) => r[col] !== val);
            return { error: null };
          },
        }),
        update: (updates) => ({
          eq: async (col, val) => {
            tables[tableName] = tables[tableName].map((r) =>
              r[col] === val ? { ...r, ...updates } : r
            );
            return { error: null };
          },
        }),
      };
    },
  };

  return client;
}

async function runTests() {
  console.log("=== Running Auth Modes & Security Verification Suite ===");

  // -------------------------------------------------------------------------
  // 1. Verify Single Source of Truth (AUTH_MODE constant, no env override)
  // -------------------------------------------------------------------------
  const authConfigSource = fs.readFileSync(path.join(ROOT, "src/lib/authConfig.ts"), "utf8");
  assert.match(
    authConfigSource,
    /export const AUTH_MODE:\s*"email"\s*\|\s*"google"\s*\|\s*"both"\s*=\s*"(email|google|both)";/,
    "src/lib/authConfig.ts must export committed constant AUTH_MODE"
  );

  const loginSource = fs.readFileSync(path.join(ROOT, "src/app/login/page.tsx"), "utf8");
  assert.ok(
    !loginSource.includes("NEXT_PUBLIC_ENABLE_EMAIL_AUTH"),
    "Login page must not reference NEXT_PUBLIC_ENABLE_EMAIL_AUTH"
  );
  console.log("[PASS] 1. Single switch AUTH_MODE exported & NEXT_PUBLIC_ENABLE_EMAIL_AUTH removed");

  // -------------------------------------------------------------------------
  // 2. Mode behavior: Rendered Login Page + Unreachable Handlers in each mode
  // -------------------------------------------------------------------------
  for (const mode of ["email", "google", "both"]) {
    let oauthCalls = 0;
    let signInPasswordCalls = 0;
    let signUpCalls = 0;

    const mockSupabaseClient = {
      auth: {
        signInWithOAuth: async () => {
          oauthCalls += 1;
          return { data: {}, error: null };
        },
        signInWithPassword: async () => {
          signInPasswordCalls += 1;
          return { data: { user: { id: "u1" }, session: {} }, error: null };
        },
        signUp: async () => {
          signUpCalls += 1;
          return { data: { user: { id: "u1" }, session: null }, error: null };
        },
        resetPasswordForEmail: async () => ({ data: {}, error: null }),
        resend: async () => ({ data: {}, error: null }),
      },
    };

    const { loadModule } = createTestLoader({
      authModeOverride: mode,
      supabaseClientMock: mockSupabaseClient,
      locale: "en",
    });

    const loginMod = loadModule("@/app/login/page");
    const html = renderToStaticMarkup(React.createElement(loginMod.LoginForm));

    const hasGoogleButton = html.includes("Continue with Google");
    const hasEmailInput = html.includes('type="email"');
    const hasPasswordInput = html.includes('type="password"') && html.includes('minLength="10"');
    const hasForgotPassword = html.includes("Forgot password?");
    const hasResendConfirm = html.includes("Resend confirmation email");

    if (mode === "email") {
      assert.equal(hasGoogleButton, false, 'In "email" mode, Google button must NOT be rendered');
      assert.equal(hasEmailInput, true, 'In "email" mode, email input must be rendered');
      assert.equal(hasPasswordInput, true, 'In "email" mode, password input (minLength=10) must be rendered');
      assert.equal(hasForgotPassword, true, 'In "email" mode, Forgot password button must be rendered');
      assert.equal(hasResendConfirm, true, 'In "email" mode, Resend confirmation button must be rendered');

      // Attempt to invoke Google OAuth handler in "email" mode -> must be unreachable
      const googleRes = await loginMod.triggerGoogleOAuth(
        mode,
        mockSupabaseClient.auth,
        "https://app.example.com",
        "/today"
      );
      assert.equal(googleRes.called, false, 'In "email" mode, triggerGoogleOAuth must not execute');
      assert.equal(oauthCalls, 0, 'In "email" mode, signInWithOAuth must never be called');

      // Email handlers ARE reachable in "email" mode
      const emailRes = await loginMod.triggerEmailPasswordAuth(
        mode,
        "signin",
        mockSupabaseClient.auth,
        "user@example.com",
        "supersecret10",
        "https://app.example.com",
        "/today"
      );
      assert.equal(emailRes.called, true);
      assert.equal(signInPasswordCalls, 1);
    } else if (mode === "google") {
      assert.equal(hasGoogleButton, true, 'In "google" mode, Google button must be rendered');
      assert.equal(hasEmailInput, false, 'In "google" mode, email input must NOT be rendered');
      assert.equal(hasPasswordInput, false, 'In "google" mode, password input must NOT be rendered');
      assert.equal(hasForgotPassword, false, 'In "google" mode, Forgot password must NOT be rendered');

      // Attempt to invoke Email sign-in and sign-up in "google" mode -> must be unreachable
      const signInRes = await loginMod.triggerEmailPasswordAuth(
        mode,
        "signin",
        mockSupabaseClient.auth,
        "user@example.com",
        "supersecret10",
        "https://app.example.com",
        "/today"
      );
      const signUpRes = await loginMod.triggerEmailPasswordAuth(
        mode,
        "signup",
        mockSupabaseClient.auth,
        "user@example.com",
        "supersecret10",
        "https://app.example.com",
        "/today"
      );
      assert.equal(signInRes.called, false, 'In "google" mode, email sign-in must not execute');
      assert.equal(signUpRes.called, false, 'In "google" mode, email sign-up must not execute');
      assert.equal(signInPasswordCalls, 0, 'In "google" mode, signInWithPassword must never be called');
      assert.equal(signUpCalls, 0, 'In "google" mode, signUp must never be called');

      // Google handler IS reachable in "google" mode
      const googleRes = await loginMod.triggerGoogleOAuth(
        mode,
        mockSupabaseClient.auth,
        "https://app.example.com",
        "/today"
      );
      assert.equal(googleRes.called, true);
      assert.equal(oauthCalls, 1);
    } else if (mode === "both") {
      assert.equal(hasGoogleButton, true, 'In "both" mode, Google button must be rendered');
      assert.equal(hasEmailInput, true, 'In "both" mode, email input must be rendered');
      assert.equal(hasPasswordInput, true, 'In "both" mode, password input must be rendered');

      await loginMod.triggerGoogleOAuth(mode, mockSupabaseClient.auth, "https://app.example.com", "/today");
      await loginMod.triggerEmailPasswordAuth(
        mode,
        "signup",
        mockSupabaseClient.auth,
        "user@example.com",
        "supersecret10",
        "https://app.example.com",
        "/today"
      );
      assert.equal(oauthCalls, 1, 'In "both" mode, signInWithOAuth is reachable');
      assert.equal(signUpCalls, 1, 'In "both" mode, signUp is reachable');
    }
  }
  console.log('[PASS] 2. Login page controls & handler unreachability verified in "email", "google", and "both" modes');

  // -------------------------------------------------------------------------
  // 3. Open-redirect protection across /auth/callback, /auth/confirm, /auth/reset
  // -------------------------------------------------------------------------
  const mockServer = createInMemorySupabase({
    user: { id: "user-redir-1", email: "redir@example.com", user_metadata: {} },
  });
  const { loadModule: loadRouteMod } = createTestLoader({
    supabaseServerMock: mockServer,
  });

  const callbackRoute = loadRouteMod("@/app/auth/callback/route");
  const confirmRoute = loadRouteMod("@/app/auth/confirm/route");
  const resetRoute = loadRouteMod("@/app/auth/reset/route");

  const maliciousRedirects = [
    "https://evil.com",
    "http://evil.com/phish",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\evil.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/login",
    "/auth/callback",
    "/auth/confirm",
    "/auth/reset",
  ];

  for (const evil of maliciousRedirects) {
    // Direct validator check
    assert.equal(callbackRoute.validateRelativeRedirect(evil), "/today");
    assert.equal(confirmRoute.validateRelativeRedirect(evil), "/today");
    assert.equal(resetRoute.validateRelativeRedirect(evil, "/reset-password"), "/reset-password");

    // Route GET handler checks
    const cbRes = await callbackRoute.GET(
      new Request(`https://app.example.com/auth/callback?code=valid_code&next=${encodeURIComponent(evil)}`)
    );
    assert.equal(cbRes.headers.get("location"), "https://app.example.com/today");

    const confRes = await confirmRoute.GET(
      new Request(
        `https://app.example.com/auth/confirm?token_hash=th_123&type=signup&next=${encodeURIComponent(evil)}`
      )
    );
    assert.equal(confRes.headers.get("location"), "https://app.example.com/today");

    const rstRes = await resetRoute.GET(
      new Request(
        `https://app.example.com/auth/reset?token_hash=th_456&type=recovery&next=${encodeURIComponent(evil)}`
      )
    );
    assert.equal(rstRes.headers.get("location"), "https://app.example.com/reset-password");
  }

  // Valid relative redirects are preserved
  const validCb = await callbackRoute.GET(
    new Request("https://app.example.com/auth/callback?code=valid_code&next=%2Fsettings%3Ftab%3Ddata")
  );
  assert.equal(validCb.headers.get("location"), "https://app.example.com/settings?tab=data");

  const validConf = await confirmRoute.GET(
    new Request("https://app.example.com/auth/confirm?token_hash=th_123&type=email&next=%2Fbody")
  );
  assert.equal(validConf.headers.get("location"), "https://app.example.com/body");

  const validReset = await resetRoute.GET(
    new Request("https://app.example.com/auth/reset?token_hash=th_456&type=recovery&next=%2Freset-password")
  );
  assert.equal(validReset.headers.get("location"), "https://app.example.com/reset-password");

  console.log("[PASS] 3. Open-redirect protection verified for /auth/callback, /auth/confirm, and /auth/reset");

  // -------------------------------------------------------------------------
  // 4. First-login provisioning: runs once for new email user, never overwrites returning user
  // -------------------------------------------------------------------------
  const provDb = createInMemorySupabase();
  const { loadModule: loadProv } = createTestLoader();
  const { provisionFirstLogin } = loadProv("@/lib/authProvisioning");

  const newEmailUser = {
    id: "email-user-42",
    email: "karim.adel@example.com",
    user_metadata: {},
  };

  // First run: creates all 3 records with email prefix, empty avatar, NULL modules, NULL targets
  const firstRun = await provisionFirstLogin(provDb, newEmailUser);
  assert.equal(firstRun.modulesCreated, true);
  assert.equal(firstRun.profileCreated, true);
  assert.equal(firstRun.settingsCreated, true);
  assert.equal(firstRun.errors.length, 0);

  assert.equal(provDb.tables.profiles.length, 1);
  assert.equal(provDb.tables.profiles[0].display_name, "karim.adel");
  assert.equal(provDb.tables.profiles[0].avatar_url, null);

  assert.equal(provDb.tables.user_modules.length, 1);
  assert.equal(provDb.tables.user_modules[0].has_completed_onboarding, false);
  assert.equal(provDb.tables.user_modules[0].module_workouts, null);
  assert.equal(provDb.tables.user_modules[0].module_nutrition, null);
  assert.equal(provDb.tables.user_modules[0].module_school, null);

  assert.equal(provDb.tables.user_settings.length, 1);
  assert.equal(provDb.tables.user_settings[0].target_calories, undefined);

  // Simulate returning user who customized profile, completed onboarding, and set calorie target
  provDb.tables.profiles[0].display_name = "Karim Custom";
  provDb.tables.profiles[0].avatar_url = "https://example.com/avatar.png";
  provDb.tables.user_modules[0].has_completed_onboarding = true;
  provDb.tables.user_modules[0].module_workouts = true;
  provDb.tables.user_settings[0].target_calories = 2300;

  // Second run: returning user is never overwritten
  const secondRun = await provisionFirstLogin(provDb, newEmailUser);
  assert.equal(secondRun.modulesCreated, false);
  assert.equal(secondRun.profileCreated, false);
  assert.equal(secondRun.settingsCreated, false);
  assert.equal(provDb.counts.insertCalls.profiles, 1);
  assert.equal(provDb.counts.insertCalls.user_modules, 1);
  assert.equal(provDb.counts.insertCalls.user_settings, 1);
  assert.equal(provDb.tables.profiles[0].display_name, "Karim Custom");
  assert.equal(provDb.tables.user_modules[0].has_completed_onboarding, true);
  assert.equal(provDb.tables.user_modules[0].module_workouts, true);
  assert.equal(provDb.tables.user_settings[0].target_calories, 2300);

  console.log("[PASS] 4. Idempotent provisioning verified for new and returning email users");

  // -------------------------------------------------------------------------
  // 5. Deletion re-auth & Account controls pick method by account provider, not AUTH_MODE
  // -------------------------------------------------------------------------
  const { loadModule: loadAuthCfg } = createTestLoader();
  const authCfg = loadAuthCfg("@/lib/authConfig");

  const emailProviderUser = {
    id: "u-email",
    email: "user@example.com",
    last_sign_in_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    app_metadata: { provider: "email", providers: ["email"] },
    identities: [{ provider: "email" }],
  };

  const googleProviderUserStale = {
    id: "u-google",
    email: "guser@example.com",
    last_sign_in_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 mins ago (stale)
    app_metadata: { provider: "google", providers: ["google"] },
    identities: [{ provider: "google" }],
  };

  const googleProviderUserFresh = {
    ...googleProviderUserStale,
    last_sign_in_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago (fresh)
  };

  assert.equal(authCfg.getDeletionReauthMethod(emailProviderUser), "password");
  assert.equal(authCfg.isGoogleOnlyUser(emailProviderUser), false);
  assert.equal(authCfg.getDeletionReauthMethod(googleProviderUserStale), "google");
  assert.equal(authCfg.isGoogleOnlyUser(googleProviderUserStale), true);

  // Verify email user reauth requires password (rejects missing or wrong password, accepts valid password)
  const emailMissingPw = await authCfg.verifyDeletionReauth(
    emailProviderUser,
    "",
    async () => ({ error: null })
  );
  assert.equal(emailMissingPw.ok, false);
  assert.equal(emailMissingPw.method, "password");
  assert.equal(emailMissingPw.status, 403);

  const emailWrongPw = await authCfg.verifyDeletionReauth(
    emailProviderUser,
    "wrong-pass",
    async () => ({ error: { message: "Invalid login credentials" } })
  );
  assert.equal(emailWrongPw.ok, false);
  assert.equal(emailWrongPw.status, 403);

  const emailValidPw = await authCfg.verifyDeletionReauth(
    emailProviderUser,
    "correct-password-10",
    async () => ({ error: null })
  );
  assert.equal(emailValidPw.ok, true);
  assert.equal(emailValidPw.method, "password");

  // Verify Google-only user reauth checks 5-minute window even if a password string was passed
  const googleStaleCheck = await authCfg.verifyDeletionReauth(
    googleProviderUserStale,
    "any-password",
    async () => ({ error: null })
  );
  assert.equal(googleStaleCheck.ok, false);
  assert.equal(googleStaleCheck.method, "google");
  assert.equal(googleStaleCheck.requiresReauth, true);
  assert.equal(googleStaleCheck.status, 403);

  const googleFreshCheck = await authCfg.verifyDeletionReauth(
    googleProviderUserFresh,
    "",
    async () => ({ error: { message: "Should not be called" } })
  );
  assert.equal(googleFreshCheck.ok, true);
  assert.equal(googleFreshCheck.method, "google");

  // Verify AccountTab hides Change Password and Change Email for Google-only users and shows them for email users
  const { AccountTab } = loadAuthCfg("@/components/settings/AccountTab");
  const emailAccountHtml = renderToStaticMarkup(
    React.createElement(AccountTab, {
      userEmail: "user@example.com",
      userId: "u-email",
      isGoogleOnly: false,
    })
  );
  assert.equal(emailAccountHtml.includes("Change Password"), true);
  assert.equal(emailAccountHtml.includes("Change Email"), true);

  const googleAccountHtml = renderToStaticMarkup(
    React.createElement(AccountTab, {
      userEmail: "guser@example.com",
      userId: "u-google",
      isGoogleOnly: true,
    })
  );
  assert.equal(googleAccountHtml.includes("Change Password"), false);
  assert.equal(googleAccountHtml.includes("Change Email"), false);

  console.log("[PASS] 5. Deletion re-auth & AccountTab controls verified by identity provider");

  // -------------------------------------------------------------------------
  // 6. Error messages (non-enumerating, plain EN + AR) & Legal Copy per mode
  // -------------------------------------------------------------------------
  for (const loc of ["en", "ar"]) {
    const existingEmailMsg = authCfg.getPlainAuthErrorMessage("User already registered", loc);
    assert.ok(
      !existingEmailMsg.toLowerCase().includes("already exists") &&
        !existingEmailMsg.toLowerCase().includes("already registered") &&
        !existingEmailMsg.includes("مسجل بالفعل"),
      `Error message for existing email must not reveal account existence (${loc}): ${existingEmailMsg}`
    );

    const wrongCredsMsg = authCfg.getPlainAuthErrorMessage("Invalid login credentials", loc);
    assert.ok(wrongCredsMsg.length > 10);

    const unconfirmedMsg = authCfg.getPlainAuthErrorMessage("Email not confirmed", loc);
    assert.ok(unconfirmedMsg.length > 10);

    const rateLimitMsg = authCfg.getPlainAuthErrorMessage("email rate limit exceeded", loc);
    assert.ok(
      rateLimitMsg.includes("2") || rateLimitMsg.includes("رسالتين"),
      `Rate limit message should explain the ~2 emails/hour limit (${loc}): ${rateLimitMsg}`
    );
  }

  for (const mode of ["email", "google", "both"]) {
    const { loadModule: loadLegal } = createTestLoader({ authModeOverride: mode });
    const PrivacyPage = loadLegal("@/app/privacy/page").default;
    const TermsPage = loadLegal("@/app/terms/page").default;
    const privacyHtml = renderToStaticMarkup(React.createElement(PrivacyPage));
    const termsHtml = renderToStaticMarkup(React.createElement(TermsPage));

    if (mode === "email") {
      assert.ok(termsHtml.includes("email and password credentials"));
      assert.ok(privacyHtml.includes("email address and password"));
    } else if (mode === "google") {
      assert.ok(termsHtml.includes("authenticated Google credentials"));
      assert.ok(privacyHtml.includes("authenticated Google account"));
    } else {
      assert.ok(termsHtml.includes("email and password or authenticated Google"));
    }
  }
  console.log("[PASS] 6. Friendly EN/AR error messages (non-enumerating) & Privacy/Terms copy verified");

  // -------------------------------------------------------------------------
  // 7. Reset Password Guard: works after valid recovery flow; redirects normally signed-in user
  // -------------------------------------------------------------------------
  const { loadModule: loadResetMod } = createTestLoader();
  const resetPageMod = loadResetMod("@/app/reset-password/page");
  const authCfgReset = loadResetMod("@/lib/authConfig");

  // Verify /auth/reset sets the httpOnly lm_recovery_flow cookie on valid recovery token verification
  const resetCookieRes = await resetRoute.GET(
    new Request("https://app.example.com/auth/reset?token_hash=th_rec_99&type=recovery")
  );
  const setCookieHeader = resetCookieRes.headers.get("set-cookie") || "";
  assert.ok(
    setCookieHeader.includes(`${authCfgReset.RECOVERY_FLOW_COOKIE}=1`) &&
      setCookieHeader.toLowerCase().includes("httponly") &&
      setCookieHeader.toLowerCase().includes("samesite=lax") &&
      setCookieHeader.toLowerCase().includes("path=/") &&
      setCookieHeader.toLowerCase().includes("max-age=600"),
    `/auth/reset must set ${authCfgReset.RECOVERY_FLOW_COOKIE} with HttpOnly, SameSite=lax, Path=/, Max-Age=600: ${setCookieHeader}`
  );

  // Verify POST /api/auth/reset-password deletes lm_recovery_flow cookie after a successful reset
  const resetApiRoute = loadRouteMod("@/app/api/auth/reset-password/route");
  const NextReqCtor = loadRouteMod("next/server").NextRequest;
  const validResetPostReq = new NextReqCtor("https://app.example.com/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${authCfgReset.RECOVERY_FLOW_COOKIE}=1`,
    },
    body: JSON.stringify({ password: "newValidPassword10!" }),
  });
  const validResetPostRes = await resetApiRoute.POST(validResetPostReq);
  assert.equal(validResetPostRes.status, 200);
  const postSetCookieHeader = validResetPostRes.headers.get("set-cookie") || "";
  assert.ok(
    postSetCookieHeader.includes(`${authCfgReset.RECOVERY_FLOW_COOKIE}=;`) ||
      postSetCookieHeader.toLowerCase().includes("max-age=0") ||
      postSetCookieHeader.toLowerCase().includes("expires=thu, 01 jan 1970"),
    `POST /api/auth/reset-password must delete ${authCfgReset.RECOVERY_FLOW_COOKIE} cookie after reset: ${postSetCookieHeader}`
  );

  // Case A: Valid recovery flow -> allowed to set new password
  let recoveryUpdateCalls = 0;
  const validRecoveryAttempt = await resetPageMod.executeGuardedPasswordReset({
    hasUser: true,
    hasRecoveryCookie: true,
    newPassword: "newValidPassword10!",
    confirmPassword: "newValidPassword10!",
    updatePasswordFn: async () => {
      recoveryUpdateCalls += 1;
      return { error: null };
    },
  });
  assert.equal(validRecoveryAttempt.allowed, true);
  assert.equal(validRecoveryAttempt.updated, true);
  assert.equal(validRecoveryAttempt.redirectTo, "/today");
  assert.equal(recoveryUpdateCalls, 1);

  // Case B: Normally signed-in user opens /reset-password directly (no recovery cookie/event)
  let normalSessionUpdateCalls = 0;
  const normalUserAttempt = await resetPageMod.executeGuardedPasswordReset({
    hasUser: true,
    hasRecoveryCookie: false,
    isPasswordRecoveryEvent: false,
    newPassword: "attemptedBypassPassword10!",
    confirmPassword: "attemptedBypassPassword10!",
    updatePasswordFn: async () => {
      normalSessionUpdateCalls += 1;
      return { error: null };
    },
  });
  assert.equal(normalUserAttempt.allowed, false, "Normal signed-in user must not be allowed on /reset-password");
  assert.equal(normalUserAttempt.updated, false, "Normal signed-in user must not be able to update password");
  assert.equal(normalUserAttempt.redirectTo, "/today", "Normal signed-in user must be redirected away to /today");
  assert.equal(normalSessionUpdateCalls, 0, "updatePasswordFn must never be called for normal signed-in user");

  console.log("[PASS] 7. /reset-password guard verified (allows valid recovery flow, redirects normal signed-in users)");

  // -------------------------------------------------------------------------
  // 8. Confirm Email ON vs OFF: both provision once and land on onboarding
  // -------------------------------------------------------------------------
  // Path A: Confirm Email ON (signUp returns session: null -> check_inbox -> cannot sign in until confirmed -> /auth/confirm provisions once)
  const confirmOnUser = {
    id: "user-confirm-on",
    email: "confirm.on@example.com",
    user_metadata: {},
  };
  let isEmailConfirmedYet = false;
  const confirmOnDb = createInMemorySupabase({ user: confirmOnUser });
  confirmOnDb.auth.signUp = async () => ({
    data: { user: confirmOnUser, session: null },
    error: null,
  });
  confirmOnDb.auth.signInWithPassword = async () => {
    if (!isEmailConfirmedYet) {
      return { data: { user: null, session: null }, error: { message: "Email not confirmed" } };
    }
    return { data: { user: confirmOnUser, session: { access_token: "sess_on" } }, error: null };
  };

  const { loadModule: loadConfirmOnMod } = createTestLoader({
    supabaseClientMock: confirmOnDb,
    supabaseServerMock: confirmOnDb,
  });
  const loginConfirmOn = loadConfirmOnMod("@/app/login/page");
  const confirmRouteOn = loadConfirmOnMod("@/app/auth/confirm/route");

  // 1) Sign up with Confirm Email ON -> shows "Check your inbox", does not provision yet
  const signUpOnRes = await loginConfirmOn.completeEmailAuthSubmission(
    "email",
    "signup",
    confirmOnDb,
    confirmOnUser.email,
    "strongPassword10!",
    "https://app.example.com",
    "/today"
  );
  assert.equal(signUpOnRes.called, true);
  assert.equal(signUpOnRes.outcome, "check_inbox");
  assert.equal(confirmOnDb.tables.user_modules.length, 0);

  // 2) Attempt sign-in before confirming email -> blocked with "Email not confirmed"
  const prematureSignIn = await loginConfirmOn.completeEmailAuthSubmission(
    "email",
    "signin",
    confirmOnDb,
    confirmOnUser.email,
    "strongPassword10!",
    "https://app.example.com",
    "/today"
  );
  assert.equal(prematureSignIn.outcome, "error");
  assert.equal(prematureSignIn.error, "Email not confirmed");

  // 3) User confirms email via /auth/confirm -> provisions once with has_completed_onboarding: false (onboarding active) and lands on /today
  isEmailConfirmedYet = true;
  const confirmResp = await confirmRouteOn.GET(
    new Request("https://app.example.com/auth/confirm?token_hash=th_on_1&type=signup&next=%2Ftoday")
  );
  assert.equal(confirmResp.headers.get("location"), "https://app.example.com/today");
  assert.equal(confirmOnDb.counts.insertCalls.user_modules, 1);
  assert.equal(confirmOnDb.counts.insertCalls.profiles, 1);
  assert.equal(confirmOnDb.counts.insertCalls.user_settings, 1);
  assert.equal(confirmOnDb.tables.user_modules[0].has_completed_onboarding, false);
  assert.equal(confirmOnDb.tables.profiles[0].display_name, "confirm.on");

  // Path B: Confirm Email OFF (signUp returns session immediately -> provisions once and redirects to /today for onboarding)
  const confirmOffUser = {
    id: "user-confirm-off",
    email: "confirm.off@example.com",
    user_metadata: {},
  };
  const confirmOffDb = createInMemorySupabase({ user: confirmOffUser });
  confirmOffDb.auth.signUp = async () => ({
    data: { user: confirmOffUser, session: { access_token: "immediate_session" } },
    error: null,
  });

  const signUpOffRes = await loginConfirmOn.completeEmailAuthSubmission(
    "email",
    "signup",
    confirmOffDb,
    confirmOffUser.email,
    "strongPassword10!",
    "https://app.example.com",
    "/today"
  );
  assert.equal(signUpOffRes.called, true);
  assert.equal(signUpOffRes.outcome, "redirect");
  assert.equal(signUpOffRes.redirectTo, "/today");
  assert.equal(signUpOffRes.provisioned, true);
  assert.equal(confirmOffDb.counts.insertCalls.user_modules, 1);
  assert.equal(confirmOffDb.counts.insertCalls.profiles, 1);
  assert.equal(confirmOffDb.counts.insertCalls.user_settings, 1);
  assert.equal(confirmOffDb.tables.user_modules[0].has_completed_onboarding, false);
  assert.equal(confirmOffDb.tables.profiles[0].display_name, "confirm.off");

  // Subsequent first-load fallback call does not re-insert
  await provisionFirstLogin(confirmOffDb, confirmOffUser);
  assert.equal(confirmOffDb.counts.insertCalls.user_modules, 1);
  assert.equal(confirmOffDb.counts.insertCalls.profiles, 1);
  assert.equal(confirmOffDb.counts.insertCalls.user_settings, 1);

  console.log("[PASS] 8. Confirm Email ON and OFF flows verified (both provision once and land on onboarding)");

  // -------------------------------------------------------------------------
  // 9. Forgot Password & Resend Confirmation: identical responses (existing vs non-existing) + rate limit
  // -------------------------------------------------------------------------
  for (const loc of ["en", "ar"]) {
    const existingAuthMock = {
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      resend: async () => ({ data: {}, error: null }),
    };
    const nonExistingAuthMock = {
      resetPasswordForEmail: async () => ({ data: {}, error: { message: "User not found" } }),
      resend: async () => ({ data: {}, error: { message: "User not found" } }),
    };
    const rateLimitedAuthMock = {
      resetPasswordForEmail: async () => ({
        data: {},
        error: { message: "For security purposes, email rate limit exceeded (429)" },
      }),
      resend: async () => ({
        data: {},
        error: { message: "over_email_send_rate_limit: rate limit exceeded" },
      }),
    };

    const forgotExisting = await loginConfirmOn.triggerForgotPassword(
      "email",
      existingAuthMock,
      "exists@example.com",
      "https://app.example.com",
      loc
    );
    const forgotMissing = await loginConfirmOn.triggerForgotPassword(
      "email",
      nonExistingAuthMock,
      "missing@example.com",
      "https://app.example.com",
      loc
    );
    assert.deepStrictEqual(
      forgotExisting,
      forgotMissing,
      `Forgot password response must be identical whether or not email exists (${loc})`
    );
    assert.equal(forgotExisting.kind, "message");

    const resendExisting = await loginConfirmOn.triggerResendConfirmation(
      "email",
      existingAuthMock,
      "exists@example.com",
      "https://app.example.com",
      "/today",
      loc
    );
    const resendMissing = await loginConfirmOn.triggerResendConfirmation(
      "email",
      nonExistingAuthMock,
      "missing@example.com",
      "https://app.example.com",
      "/today",
      loc
    );
    assert.deepStrictEqual(
      resendExisting,
      resendMissing,
      `Resend confirmation response must be identical whether or not email exists (${loc})`
    );
    assert.equal(resendExisting.kind, "message");

    const forgotRateLimit = await loginConfirmOn.triggerForgotPassword(
      "email",
      rateLimitedAuthMock,
      "exists@example.com",
      "https://app.example.com",
      loc
    );
    assert.equal(forgotRateLimit.kind, "error");
    assert.ok(forgotRateLimit.text.includes("2") || forgotRateLimit.text.includes("رسالتين"));

    const resendRateLimit = await loginConfirmOn.triggerResendConfirmation(
      "email",
      rateLimitedAuthMock,
      "exists@example.com",
      "https://app.example.com",
      "/today",
      loc
    );
    assert.equal(resendRateLimit.kind, "error");
    assert.ok(resendRateLimit.text.includes("2") || resendRateLimit.text.includes("رسالتين"));
  }
  console.log("[PASS] 9. Forgot password & Resend confirmation identical responses + rate-limit messages verified");

  if (process.argv.includes("--build-all-modes")) {
    const authConfigPath = path.join(ROOT, "src/lib/authConfig.ts");
    const originalContent = fs.readFileSync(authConfigPath, "utf8");
    try {
      for (const mode of ["google", "both", "email"]) {
        console.log(`\n=== Running tsc + next build for AUTH_MODE = "${mode}" ===`);
        const modeContent = originalContent.replace(
          /export const AUTH_MODE:\s*"email"\s*\|\s*"google"\s*\|\s*"both"\s*=\s*"(email|google|both)";/,
          `export const AUTH_MODE: "email" | "google" | "both" = "${mode}";`
        );
        fs.writeFileSync(authConfigPath, modeContent, "utf8");
        execSync("npx tsc --noEmit", { stdio: "inherit" });
        const buildEnv = {
          ...process.env,
          NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL:
            process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "privacy@lifemaxxing.io",
        };
        try {
          execSync("npm run build", { stdio: "inherit", env: buildEnv });
        } catch {
          console.log("Retrying npm run build after Next.js security upgrade nudge...");
          execSync("npm run build", { stdio: "inherit", env: buildEnv });
        }
        console.log(`[PASS] Production build succeeded for AUTH_MODE = "${mode}"`);
      }
    } finally {
      const restored = originalContent.replace(
        /export const AUTH_MODE:\s*"email"\s*\|\s*"google"\s*\|\s*"both"\s*=\s*"(email|google|both)";/,
        `export const AUTH_MODE: "email" | "google" | "both" = "email";`
      );
      fs.writeFileSync(authConfigPath, restored, "utf8");
    }
  }

  console.log("=== ALL AUTH MODE TESTS PASSED ===");
}

runTests().catch((err) => {
  console.error("TEST FAILURE:", err);
  process.exit(1);
});
