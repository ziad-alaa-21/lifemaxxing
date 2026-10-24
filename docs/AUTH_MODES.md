# Authentication Modes (`AUTH_MODE`)

## 1. Single Source of Truth

Authentication sign-in mode is controlled by a single committed constant in [`src/lib/authConfig.ts`](../src/lib/authConfig.ts):

```ts
export const AUTH_MODE: "email" | "google" | "both" = "email";
```

- **No overrides**: No environment variable (`NEXT_PUBLIC_ENABLE_EMAIL_AUTH` has been removed), cookie, `localStorage` entry, or URL query parameter can override `AUTH_MODE`.
- **Hide, Not Delete**: Switching modes hides the inactive UI and prevents its handlers from executing, while keeping all OAuth and email routes (`/auth/callback`, `/auth/confirm`, `/auth/reset`, `/reset-password`, `/api/auth/reset-password`), provisioning (`src/lib/authProvisioning.ts`), and translations compiled and intact.

---

## 2. The Three Modes

| Mode | Login Page UI | Reachable Handlers | Legal Copy (`/privacy`, `/terms`) |
| :--- | :--- | :--- | :--- |
| `"email"` | Email + password form (sign in, sign up, forgot password, resend confirmation, check-your-inbox screen). Google button is **not** rendered. | `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `resend`. `signInWithOAuth` is unreachable. | Describes email + password sign-in. |
| `"google"` | "Continue with Google" button only. Email/password form is **not** rendered. | `signInWithOAuth` (PKCE -> `/auth/callback`). `signInWithPassword` and `signUp` are unreachable. | Describes Google sign-in. |
| `"both"` | Both "Continue with Google" and the email + password form are rendered. | Both Google OAuth and email/password handlers are active. | Describes both email + password and Google sign-in. |

---

## 3. Complete Supabase Dashboard Checklist (Email Mode / Both Mode)

When running in `"email"` or `"both"` mode, verify the following settings in your **Supabase Dashboard**:

1. **Enable the Email Provider**:
   - Navigate to **Authentication -> Providers -> Email** and toggle **Enable Email provider** to **ON**.
2. **Confirm Email ON**:
   - Keep **Confirm email** toggled **ON** so new sign-ups verify their address before signing in (the app supports both **Confirm email ON** — showing the *"Check your inbox"* screen and provisioning upon confirmation — and **Confirm email OFF** — provisioning immediately upon sign-up and landing on onboarding).
3. **Minimum Password Length = 10**:
   - In **Authentication -> Providers -> Email** (or **Authentication -> Policies**), set **Minimum password length** to **`10`** to match `MIN_PASSWORD_LENGTH = 10` enforced in the app.
4. **Site URL & Redirect URLs**:
   - Navigate to **Authentication -> URL Configuration**:
     - Set **Site URL** to your production domain (e.g. `https://your-domain.com`).
     - Under **Redirect URLs**, include:
       - `<SITE_URL>/auth/callback`
       - `<SITE_URL>/auth/confirm`
       - `<SITE_URL>/auth/reset`
       - `<SITE_URL>/reset-password`
       - (Plus local development equivalents under `http://localhost:3000/auth/*` and `http://localhost:3000/reset-password`.)
5. **Built-in Email Sender Limitation & Custom SMTP**:
   - **Important**: Supabase's built-in email sender **only delivers emails to addresses belonging to project team/organization members** and is strictly rate-limited to **~2 emails per hour**.
   - To send confirmation and password-reset emails to external users in production, configure a **Custom SMTP** provider under **Project Settings -> Authentication -> SMTP Settings** (e.g. Resend, Postmark, AWS SES, or SendGrid).

---

## 4. Sensitive Actions Follow Account Type, Not `AUTH_MODE`

Regardless of which `AUTH_MODE` is currently active:
- **Reset Password Page (`/reset-password`)**:
  - Only works after a valid recovery flow (verified via the short-lived `httpOnly` `lm_recovery_flow` cookie set by `/auth/reset` or `/auth/confirm?type=recovery`, or an explicit `PASSWORD_RECOVERY` auth event).
  - A normally signed-in user who opens `/reset-password` directly is redirected away to `/today` and cannot set a new password without entering their current password in Account Settings.
- **Delete My Data & Delete My Account** (`/settings?tab=data`, `/api/user/delete-data`, `/api/user/delete-account`):
  - **Email/password accounts** (`email` identity provider): Must re-enter their current password plus the confirmation phrase (`DELETE MY DATA` / `DELETE MY ACCOUNT`).
  - **Google-only accounts** (`google` identity provider without `email`): Must have a fresh Google sign-in within the last 5 minutes (`Verify with Google Now` -> forced Google re-login) plus the confirmation phrase.
- **Change Password & Change Email** (`/settings?tab=account`):
  - Require re-entering the current password (new passwords must be at least 10 characters).
  - Hidden automatically for Google-only accounts.

---

## 5. Standing Restore Commands

### Command A: `"restore Google sign-in"` (or `"restore"`)

When instructed with **"restore Google sign-in"** or **"restore"**, execute immediately with no questions:

1. Edit `src/lib/authConfig.ts` to set:
   ```ts
   export const AUTH_MODE: "email" | "google" | "both" = "google";
   ```
2. Run verification:
   ```bash
   npx tsc --noEmit
   npm run test:auth
   npm run build
   ```
3. Commit the change to git.
4. Reply with the **Supabase Dashboard Checklist** (steps only the project owner can perform in the dashboard):
   - **Authentication -> Providers -> Email**: Turn **Email provider OFF** (if disabling email sign-ins completely).
   - **Authentication -> Providers -> Google**: Ensure **Google provider is ON** with valid Client ID and Client Secret configured.
   - **Authentication -> URL Configuration**:
     - Verify **Site URL** matches your production domain.
     - Verify **Redirect URLs** include `<SITE_URL>/auth/callback` (and local dev `http://localhost:3000/auth/callback`).
5. Include the **Account Compatibility Reminder**:
   - Accounts created with email/password cannot sign in using the email form when `AUTH_MODE = "google"` because the email form is hidden.
   - Setting `AUTH_MODE = "both"` keeps existing email/password accounts working alongside Google sign-in.

### Command B: `"restore both"`

When instructed with **"restore both"**, execute immediately with no questions:

1. Edit `src/lib/authConfig.ts` to set:
   ```ts
   export const AUTH_MODE: "email" | "google" | "both" = "both";
   ```
2. Run verification:
   ```bash
   npx tsc --noEmit
   npm run test:auth
   npm run build
   ```
3. Commit the change to git.
4. Reply with the **Supabase Dashboard Checklist**:
   - **Authentication -> Providers -> Email**: Ensure **Email provider is ON** (Confirm email ON, Minimum password length = `10`, and Custom SMTP configured for non-team recipients beyond the ~2 emails/hour built-in cap).
   - **Authentication -> Providers -> Google**: Ensure **Google provider is ON** with valid Client ID and Client Secret configured.
   - **Authentication -> URL Configuration**:
     - Verify **Site URL** matches your production domain.
     - Verify **Redirect URLs** include `<SITE_URL>/auth/callback`, `<SITE_URL>/auth/confirm`, `<SITE_URL>/auth/reset`, and `<SITE_URL>/reset-password`.
