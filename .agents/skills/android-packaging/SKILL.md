---
name: android-packaging
description: >-
  Use this skill when packaging, configuring, auditing, or building Lifemaxxing
  for Android using Bubblewrap (Trusted Web Activity / TWA) or Capacitor,
  setting up Digital Asset Links (assetlinks.json), configuring Android deep
  links for Supabase auth routes (/auth/confirm, /auth/reset, /auth/callback),
  or preparing Play Store AAB/APK releases.
---

# Lifemaxxing Android Packaging (Bubblewrap TWA & Capacitor)

Use this skill to package the Lifemaxxing Next.js 16 application for Android without breaking Server Components, Route Handlers, or `httpOnly` cookie authentication (`@supabase/ssr` and `lm_recovery_flow`).

---

## 1. Architectural Invariants (Read Before Mutating)

1. **Never enable `output: "export"` in `next.config.ts`**.
   - Lifemaxxing depends on dynamic Server Components (`src/app/(app)/layout.tsx`), Route Handlers (`/auth/confirm`, `/auth/reset`, `/auth/callback`, `/api/auth/reset-password`, `/api/user/delete-account`, `/api/user/delete-data`), and `httpOnly` cookies (`lm_recovery_flow` and Supabase SSR session cookies).
   - Both **Bubblewrap (TWA)** and **Capacitor** MUST point to the deployed HTTPS origin (e.g. `https://app.lifemaxxing.io` or staging tunnel) rather than a static `out/` bundle.
2. **Preserve Auth Redirect & Deep Link Integrity**.
   - Email confirmation (`/auth/confirm`), password recovery (`/auth/reset`), and OAuth (`/auth/callback`) must open inside the Android app context via verified **Android App Links** (`https://<domain>/auth/*`) so session cookies and `lm_recovery_flow` are set in the same cookie jar.
   - Keep `validateRelativeRedirect` in `src/lib/authConfig.ts` enforcing relative-only `next` paths.
3. **Preserve Theme & Viewport Tokens**.
   - Splash screen background: `#07090C` (`background_color` in `public/manifest.json`)
   - Status bar / navigation bar color: `#0F1419` (`theme_color` in `public/manifest.json`)
   - Orientation: `portrait-primary` (`portrait`)
   - Start URL: `/today`
4. **Never Cache Authenticated HTML or Auth Routes in `public/sw.js`**.
   - `public/sw.js` must continue bypassing `/auth/`, `/api/`, `/rest/`, `_rsc`, and `supabase.co`, serving `/offline` only when `navigate` requests fail offline.

---

## 2. Choosing the Packaging Track

| Track | When to Use | Reference Runbook |
| :--- | :--- | :--- |
| **Track A: Bubblewrap (TWA)** *(Default / Recommended)* | Wrapping the production PWA in a lightweight Play Store AAB using Chrome Custom Tabs / Trusted Web Activity with zero native SDK maintenance. | [references/bubblewrap-twa.md](./references/bubblewrap-twa.md) |
| **Track B: Capacitor Hosted Wrapper** | When native Android plugins (e.g. Health Connect, native push notifications, biometric prompt, haptics) are needed alongside the hosted Next.js server. | [references/capacitor-android.md](./references/capacitor-android.md) |

---

## 3. Standard Workflow

### Step 1: Run the Android Readiness Validator
Before initializing or updating Bubblewrap or Capacitor configs, execute the readiness validator:

```powershell
node .agents/skills/android-packaging/scripts/check-android-readiness.mjs
```

Confirm all baseline PWA checks (`manifest.json`, icons, `sw.js`, `next.config.ts` SSR safety) pass.

### Step 2: Configure Digital Asset Links (`public/.well-known/assetlinks.json`)
Both TWA (to hide the Chrome URL bar) and Capacitor App Links (to intercept `/auth/confirm`, `/auth/reset`, `/auth/callback`) require `public/.well-known/assetlinks.json` served at `https://<PRODUCTION_DOMAIN>/.well-known/assetlinks.json` with `Content-Type: application/json`.

Run the readiness validator with `--init-assetlinks` or follow the template in [references/bubblewrap-twa.md](./references/bubblewrap-twa.md).

### Step 3: Follow the Track Runbook
- **For Bubblewrap (TWA)**: Read and follow [references/bubblewrap-twa.md](./references/bubblewrap-twa.md).
- **For Capacitor**: Read and follow [references/capacitor-android.md](./references/capacitor-android.md).

### Step 4: Verify Before Claiming Completion
1. Run the Android readiness validator:
   ```powershell
   node .agents/skills/android-packaging/scripts/check-android-readiness.mjs
   ```
2. Run TypeScript & Auth Mode verification to ensure no web regressions:
   ```powershell
   npx tsc --noEmit
   npm run test:auth
   ```
3. Verify `.gitignore` excludes generated keystores (`*.jks`, `*.keystore`), local SDK properties (`local.properties`), and build outputs (`android/app/build/`, `*.apk`, `*.aab`).
