# Track B: Capacitor Android Wrapper Runbook

Use Capacitor when Lifemaxxing requires native Android APIs (e.g., Health Connect, native push notifications, haptics, or biometric lock) while keeping the Next.js 16 App Router backend hosted on HTTPS.

---

## 1. Why Hosted `server.url` Mode is Mandatory

Lifemaxxing uses:
- Next.js 16 Server Components (`src/app/(app)/layout.tsx`, `src/app/reset-password/page.tsx`)
- Server Route Handlers (`/auth/confirm`, `/auth/reset`, `/auth/callback`, `/api/auth/reset-password`, `/api/user/delete-account`, `/api/user/delete-data`)
- Server-set `httpOnly` cookies (`lm_recovery_flow` and `@supabase/ssr` cookies)

**Never set `output: "export"` in `next.config.ts`.** Instead, configure Capacitor to load the hosted HTTPS origin via `server.url` (with a minimal local offline fallback directory `public/`).

---

## 2. Installing Capacitor

```powershell
npm install @capacitor/core @capacitor/app @capacitor/status-bar @capacitor/splash-screen
npm install --save-dev @capacitor/cli @capacitor/android
```

Initialize the Android platform:
```powershell
npx cap add android
```

---

## 3. `capacitor.config.ts` Template

Create `capacitor.config.ts` at the repository root:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://app.lifemaxxing.io";

const config: CapacitorConfig = {
  appId: "io.lifemaxxing.app",
  appName: "Life",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://localhost") || serverUrl.startsWith("http://10.0.2.2"),
    androidScheme: "https",
    allowNavigation: [
      "app.lifemaxxing.io",
      "*.supabase.co",
    ],
  },
  android: {
    backgroundColor: "#07090C",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 300,
      backgroundColor: "#07090C",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F1419",
      overlaysWebView: false,
    },
  },
};

export default config;
```

> **Local Emulator Testing Tip**: On the Android emulator, `10.0.2.2` maps to the host machine's `127.0.0.1`. Run with `CAPACITOR_SERVER_URL="http://10.0.2.2:3000" npx cap sync android` during local development, and always sync without `CAPACITOR_SERVER_URL` (defaulting to `https://app.lifemaxxing.io`) before building a release AAB/APK.

---

## 4. Deep Links / Android App Links for Auth Routes

For email confirmation (`/auth/confirm`), password reset (`/auth/reset`), and OAuth (`/auth/callback`) links from the user's email client to open inside the Capacitor WebView (so `lm_recovery_flow` and Supabase session cookies are stored inside the Capacitor WebView cookie jar):

1. Serve `public/.well-known/assetlinks.json` on `https://app.lifemaxxing.io/.well-known/assetlinks.json` (see `bubblewrap-twa.md`).
2. Add an `autoVerify="true"` intent filter inside `android/app/src/main/AndroidManifest.xml` under `<activity android:name=".MainActivity">`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="app.lifemaxxing.io" android:pathPrefix="/auth/confirm" />
    <data android:scheme="https" android:host="app.lifemaxxing.io" android:pathPrefix="/auth/reset" />
    <data android:scheme="https" android:host="app.lifemaxxing.io" android:pathPrefix="/auth/callback" />
    <data android:scheme="https" android:host="app.lifemaxxing.io" android:pathPrefix="/today" />
</intent-filter>
```

3. Listen for `appUrlOpen` via `@capacitor/app` in a client listener (or let the hosted WebView handle the incoming intent URL directly when `server.url` matches the App Link host).

---

## 5. Building & Syncing

```powershell
# 1. Sync config and plugins to Android project
npx cap sync android

# 2. Open in Android Studio (optional)
npx cap open android

# 3. Build signed release AAB from CLI
cd android
.\gradlew bundleRelease
```

The output AAB is generated at `android/app/build/outputs/bundle/release/app-release.aab`.
