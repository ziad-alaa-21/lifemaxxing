# Track A: Bubblewrap (Trusted Web Activity) Runbook

Bubblewrap packages Lifemaxxing's existing PWA (`public/manifest.json` + `public/sw.js`) into a signed Android App Bundle (`.aab`) and APK (`.apk`) for Google Play.

---

## 1. Prerequisites

- **Node.js** 20+
- **JDK 17** (Bubblewrap can auto-download or use Android Studio's `jbr`)
- **Android SDK Command-line Tools** (`ANDROID_HOME`)
- **Bubblewrap CLI**:
  ```powershell
  npx @bubblewrap/cli --version
  ```

---

## 2. Digital Asset Links (`public/.well-known/assetlinks.json`)

Trusted Web Activities require Digital Asset Links verification between the production HTTPS origin and the Android signing certificate SHA-256 fingerprint. Without it, Chrome displays a visible browser URL bar at the top of the app.

Create `public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "io.lifemaxxing.app",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT",
        "REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

> **Important**: Include **both** your local upload keystore SHA-256 fingerprint (for local release builds) and the **Google Play App Signing** SHA-256 fingerprint (from Google Play Console -> Setup -> App signing).

To inspect a keystore's SHA-256 fingerprint:
```powershell
keytool -list -v -keystore android-signing-key.keystore -alias lifemaxxing
```

---

## 3. `twa-manifest.json` Reference Template

Place `twa-manifest.json` at the repository root (or inside `android-twa/`):

```json
{
  "packageId": "io.lifemaxxing.app",
  "host": "app.lifemaxxing.io",
  "name": "Life",
  "launcherName": "Life",
  "display": "standalone",
  "themeColor": "#0F1419",
  "themeColorDark": "#0F1419",
  "navigationColor": "#07090C",
  "navigationColorDark": "#07090C",
  "navigationDividerColor": "#0F1419",
  "navigationDividerColorDark": "#0F1419",
  "backgroundColor": "#07090C",
  "enableNotifications": true,
  "startUrl": "/today",
  "iconUrl": "https://app.lifemaxxing.io/icon-512.png",
  "maskableIconUrl": "https://app.lifemaxxing.io/icon-maskable-512.png",
  "splashScreenFadeOutDuration": 300,
  "signingKey": {
    "path": "./android.keystore",
    "alias": "lifemaxxing"
  },
  "appVersionName": "0.1.0",
  "appVersionCode": 1,
  "shortcuts": [],
  "generatorApp": "bubblewrap-cli",
  "webManifestUrl": "https://app.lifemaxxing.io/manifest.json",
  "fallbackType": "customtabs",
  "features": {},
  "alphaDependencies": {
    "enabled": false
  },
  "enableSiteSettingsShortcut": true,
  "isChromeOSOnly": false,
  "isMetaQuest": false,
  "fullScopeUrl": "https://app.lifemaxxing.io/",
  "minSdkVersion": 24,
  "orientation": "portrait-primary",
  "fingerprints": []
}
```

---

## 4. Initializing & Building the TWA

1. **Initialize from deployed manifest** (or from `twa-manifest.json`):
   ```powershell
   npx @bubblewrap/cli init --manifest https://app.lifemaxxing.io/manifest.json
   ```
2. **Validate Digital Asset Links against production**:
   ```powershell
   npx @bubblewrap/cli validate --url https://app.lifemaxxing.io
   ```
3. **Build signed APK and Play Store AAB**:
   ```powershell
   npx @bubblewrap/cli build
   ```
   Outputs:
   - `app-release-bundle.aab` (upload to Google Play Console)
   - `app-release-signed.apk` (install on test device via `adb install app-release-signed.apk`)

---

## 5. Auth Flow & Deep Link Verification in TWA

Because a verified TWA runs inside the user's default Chrome cookie jar with `fullScopeUrl: "https://app.lifemaxxing.io/"` and `delegate_permission/common.handle_all_urls`:
- Clicking email links (`https://app.lifemaxxing.io/auth/confirm?...` and `https://app.lifemaxxing.io/auth/reset?...`) opens directly inside the installed `Life` TWA app.
- `/auth/reset` sets the `httpOnly; Secure; SameSite=Lax` cookie `lm_recovery_flow` on `app.lifemaxxing.io` and redirects to `/reset-password` within the same TWA session.
- If `AUTH_MODE` is ever switched to `"google"` or `"both"`, Google OAuth (`/auth/callback`) completes inside the same Chrome Custom Tab / TWA cookie store without losing PKCE code verifiers.
