# Stage C Code-Derived Inventory & Feature Reachability Matrix

This document provides the mandatory pre-build AST scan and reachability mapping for **Stage C**:
- **School**: Subjects, Schedule, Plan, Practice (mistakes & topics), Grades (study stats reachable from Grades).
- **Settings**: Account, Modules, Targets, Preferences, Data and privacy.
- **Auth & Onboarding & Legal**: Login, Reset password, Onboarding module picker, Privacy policy, Terms.

**Verification Rule:** Strict compliance with `check-logic-intact.mjs` and the Gravitas engineering reliability runtime. Zero features dropped.

---

## 1. Code-Derived Component Inventory (AST Scan)

| File | Component(s) | Real Supabase Tables | State Variables | Mutation / Actions | Target Location | Stitch Screen ID |
|---|---|---|---|---|---|---|
| [`SchoolView.tsx`](file:///src/components/views/SchoolView.tsx) | `SchoolView` | `subjects`, `grades`, `deadlines`, `mistakes`, `academic_topics`, `academic_schedule`, `focus_sessions`, `user_settings` | 35 states | `handleTabChange`, `handleSaveSubject`, `handleArchiveSubject` +18 | **Shell / Router** | `df6f5ff1789049319d12872ef39511ce / e61b05a925fd41ddb8afb290c6844599` |
| [`SubjectModal.tsx`](file:///src/components/school/SubjectModal.tsx) | `SubjectModal` | *(via hooks/context/API)* | 6 states | `handleSubmit` | **Subjects** | `df6f5ff1789049319d12872ef39511ce` |
| [`SubjectDetailModal.tsx`](file:///src/components/school/SubjectDetailModal.tsx) | `SubjectDetailModal` | *(via hooks/context/API)* | 2 states | `handleDeleteClick`, `handleConfirmSafeguardArchive` | **Subjects** | `df6f5ff1789049319d12872ef39511ce` |
| [`TimetableGrid.tsx`](file:///src/components/school/TimetableGrid.tsx) | `TimetableGrid` | *(via hooks/context/API)* | 3 states | `handleOpenAdd`, `handleOpenEdit`, `handleSaveModal` | **Schedule** | `26d617feec4b4134b8c61d4c9649b096 / f429529c39ea419aa6e1ab7d59513bed` |
| [`SessionModal.tsx`](file:///src/components/school/SessionModal.tsx) | `SessionModal` | *(via hooks/context/API)* | 8 states | `handleSubmit` | **Schedule** | `26d617feec4b4134b8c61d4c9649b096` |
| [`DeadlineModal.tsx`](file:///src/components/school/DeadlineModal.tsx) | `DeadlineModal` | *(via hooks/context/API)* | 8 states | `handleSubmit` | **Plan** | `7e42f7fd36494cd6af01cc6ffad60cf0 / 5f20509c86f5408994e8ad924e53452e` |
| [`WeeklyTargetCard.tsx`](file:///src/components/school/WeeklyTargetCard.tsx) | `WeeklyTargetCard` | *(via hooks/context/API)* | 4 states | `handleSave`, `handleClear` | **Plan** | `7e42f7fd36494cd6af01cc6ffad60cf0` |
| [`MistakesTab.tsx`](file:///src/components/school/MistakesTab.tsx) | `MistakesTab` | *(via hooks/context/API)* | 4 states | None | **Practice (Mistakes)** | `4fe44b0bd94a4d7f97421041d5f562fc / fb454733c6e04212b8caa72c79fc3115` |
| [`MistakeModal.tsx`](file:///src/components/school/MistakeModal.tsx) | `MistakeModal` | *(via hooks/context/API)* | 8 states | `handleSubmit` | **Practice (Mistakes)** | `4fe44b0bd94a4d7f97421041d5f562fc` |
| [`MistakeRedoModal.tsx`](file:///src/components/school/MistakeRedoModal.tsx) | `MistakeRedoModal` | *(via hooks/context/API)* | 4 states | `handleRedoResult` | **Practice (Mistakes)** | `823a573fdbd34de4af4c43db69ccbe40 / 84e4a77edcae4066a74c1e5d87106e5f` |
| [`TopicsTab.tsx`](file:///src/components/school/TopicsTab.tsx) | `TopicsTab` | *(via hooks/context/API)* | 3 states | `handleRate` | **Practice (Topics)** | `b4b82841cc0244d6a0d91d7be3c0038f / cb02bf83f0e24883984b8ddbba587ced` |
| [`TopicModal.tsx`](file:///src/components/school/TopicModal.tsx) | `TopicModal` | *(via hooks/context/API)* | 6 states | `handleSubmit` | **Practice (Topics)** | `b4b82841cc0244d6a0d91d7be3c0038f` |
| [`BulkTopicModal.tsx`](file:///src/components/school/BulkTopicModal.tsx) | `BulkTopicModal` | *(via hooks/context/API)* | 4 states | `handleSubmit` | **Practice (Topics)** | `b4b82841cc0244d6a0d91d7be3c0038f` |
| [`GradeModal.tsx`](file:///src/components/school/GradeModal.tsx) | `GradeModal` | *(via hooks/context/API)* | 10 states | `handleSubmit` | **Grades** | `0b36e06247024997a171daa1bb2174d9 / acb6863e8a2b4f5698f5bf647f989fe2` |
| [`GradeTrendChart.tsx`](file:///src/components/school/GradeTrendChart.tsx) | `GradeTrendChart` | *(via hooks/context/API)* | 2 states | None | **Grades** | `8573b4bbe75b428687866f39edf7aa65 / f8e45f3c0dc743e88d68ed0f9421b18d` |
| [`StudyAnalyticsTab.tsx`](file:///src/components/school/StudyAnalyticsTab.tsx) | `StudyAnalyticsTab` | *(via hooks/context/API)* | 1 states | None | **Grades (Study Stats)** | `7c3d9b3a097f41399570cb65d1928b40 / 80dea72153e446c18ea97c2b6cee88f5` |
| [`StudyHeatmap.tsx`](file:///src/components/school/StudyHeatmap.tsx) | `StudyHeatmap` | *(via hooks/context/API)* | 1 states | None | **Grades (Study Stats)** | `7c3d9b3a097f41399570cb65d1928b40` |
| [`AcademicInsightsCard.tsx`](file:///src/components/school/AcademicInsightsCard.tsx) | `AcademicInsightsCard` | *(via hooks/context/API)* | 1 states | None | **Grades (Study Stats)** | `7c3d9b3a097f41399570cb65d1928b40` |
| [`SettingsView.tsx`](file:///src/components/views/SettingsView.tsx) | `SettingsView` | *(via hooks/context/API)* | 4 states | `handleTabChange` | **Shell / Router** | `415f52c7a5284a9da2b6e5e5dd89ae7e / e28242f23cfc451694ceceb0d5f2e717` |
| [`AccountTab.tsx`](file:///src/components/settings/AccountTab.tsx) | `AccountTab` | *(via hooks/context/API)* | 17 states | `handleSignOut`, `handleSignOutOthers`, `handleChangePassword` +1 | **Account** | `415f52c7a5284a9da2b6e5e5dd89ae7e` |
| [`ModulesTab.tsx`](file:///src/components/settings/ModulesTab.tsx) | `ModulesTab` | *(via hooks/context/API)* | 3 states | `handleToggle`, `handleEnableAll` | **Modules** | `7dac4ad98dd2406fb00a7859a898adb7 / 1a27605099624650988ab9640a4fa3aa` |
| [`ProtocolTab.tsx`](file:///src/components/settings/ProtocolTab.tsx) | `ProtocolTab` | *(via hooks/context/API)* | 20 states | `handleSyncDerivedSleep`, `handleSaveProtocol` | **Targets** | `74b29d2633c14b5688a3f5540740ae37 / 33c0367b836b411383084d7ea2a2b3c7` |
| [`PreferencesTab.tsx`](file:///src/components/settings/PreferencesTab.tsx) | `PreferencesTab` | *(via hooks/context/API)* | 11 states | `handleSavePreferences` | **Preferences** | `415f52c7a5284a9da2b6e5e5dd89ae7e` |
| [`DataTab.tsx`](file:///src/components/settings/DataTab.tsx) | `DataTab` | *(via hooks/context/API)* | 16 states | `handleReauthGoogle`, `handleExport`, `handleDeleteData` +1 | **Data and privacy** | `415f52c7a5284a9da2b6e5e5dd89ae7e / e28242f23cfc451694ceceb0d5f2e717` |
| [`PrivacyTab.tsx`](file:///src/components/settings/PrivacyTab.tsx) | `PrivacyTab` | *(via hooks/context/API)* | 0 states | None | **Data and privacy** | `415f52c7a5284a9da2b6e5e5dd89ae7e` |
| [`DeviceTab.tsx`](file:///src/components/settings/DeviceTab.tsx) | `DeviceTab` | *(via hooks/context/API)* | 6 states | `handleInstall`, `handleAttemptClearCache` | **Data and privacy (Storage & Sync)** | `415f52c7a5284a9da2b6e5e5dd89ae7e` |
| [`DisabledModuleFallback.tsx`](file:///src/components/modules/DisabledModuleFallback.tsx) | `DisabledModuleFallback` | *(via hooks/context/API)* | 1 states | `handleEnable` | **Fallback State** | `7dac4ad98dd2406fb00a7859a898adb7` |
| [`ModuleOnboardingModal.tsx`](file:///src/components/modules/ModuleOnboardingModal.tsx) | `ModuleOnboardingModal` | *(via hooks/context/API)* | 3 states | `handleSelectStarter`, `handleSelectAll`, `handleClearAll` +1 | **Choose What to Track** | `91c57e0779464367909c63b9eea804db / 71b7e534d4d7426490ad81312021001a` |
| [`page.tsx`](file:///src/app/login/page.tsx) | `GoogleIcon`, `LoginForm`, `LoginPage` | *(via hooks/context/API)* | 8 states | `handleGoogleSignIn`, `handleEmailSubmit`, `handleForgotPasswordSubmit` +1 | **Login & Create Account** | `1afc595a0afc45ee87207c7c1490cf71 / 1937ee3355444dd286d644f015cf2628` |
| [`page.tsx`](file:///src/app/reset-password/page.tsx) | `ResetPasswordForm`, `ResetPasswordPage` | *(via hooks/context/API)* | 8 states | `handleSubmit` | **Reset Password** | `0cca07297d58444497b26e100663bacc` |
| [`page.tsx`](file:///src/app/privacy/page.tsx) | `PrivacyPage` | *(via hooks/context/API)* | 0 states | None | **Privacy Policy** | `415f52c7a5284a9da2b6e5e5dd89ae7e` |
| [`page.tsx`](file:///src/app/terms/page.tsx) | `TermsPage` | *(via hooks/context/API)* | 0 states | None | **Terms of Service** | `415f52c7a5284a9da2b6e5e5dd89ae7e` |

---

## 2. Navigation Structure & URL Redirection Specification

### School Domain (`/school`)
Redirection rule: Old query parameters are preserved and redirected via 307/replace to keep all deep links intact.

| Old URL / Param | Stage C Target URL | Query Params Preserved | Reachability & Behavior |
|---|---|---|---|
| `/school?tab=overview` | `/school?tab=subjects` | Yes (all additional params kept) | Default school view: active subjects grid, study timer hero card, add course action |
| `/school?tab=timetable` | `/school?tab=schedule` | Yes | Weekly timetable schedule grid, day filters, session modal add/edit |
| `/school?tab=deadlines` / `?tab=plan` | `/school?tab=plan` | Yes | Deadlines timeline, urgency tiers, add deadline modal, weekly target hours card |
| `/school?tab=practice` | `/school?tab=practice&sub=mistakes` | Yes (e.g. `&sub=topics`) | Practice arena with sub-tabs for Mistakes (redo queue) and Topics (spaced ratings) |
| `/school?tab=grades` | `/school?tab=grades` | Yes (e.g. `&subjectId=...`) | Subject grade progression, unweighted average, target comparison, log grade modal |
| `/school?tab=stats` | `/school?tab=grades&view=stats` | Yes | Study analytics, 12-week study heatmap, academic insights (reachable from Grades) |

### Settings Domain (`/settings`)
| Old URL / Param | Stage C Target URL | Query Params Preserved | Reachability & Behavior |
|---|---|---|---|
| `/settings?tab=account` | `/settings?tab=account` | Yes | Account info, password change, email update, session sign-out |
| `/settings?tab=modules` | `/settings?tab=modules` | Yes | Module toggles (Workouts, Nutrition, Sleep, Mind, School, Weight), starter preset |
| `/settings?tab=protocol` | `/settings?tab=targets` | Yes | Targets for nutrition, water, body weight, sleep schedule, and target grades |
| `/settings?tab=preferences` | `/settings?tab=preferences` | Yes | Sound/chimes, haptics, theme, language switcher, weight unit (kg/lbs) |
| `/settings?tab=data` / `?tab=privacy` | `/settings?tab=data-privacy` | Yes | Data sovereignty, export data (JSON/CSV), delete logs, delete account |
| `/settings?tab=device` | `/settings?tab=data-privacy#device` | Yes | Local cache clear, PWA install prompt, storage diagnostics (zero feature drop) |

### Legal & Auth Domain
| Route | Stage C Presentation | Stitch ID | Notes |
|---|---|---|---|
| `/login` | Clean Stitch Card layout with Google + Email tabs | `1afc595a0afc45ee87207c7c1490cf71` | Rate-limiting, non-enumerating messages, redirect preserving intact |
| `/reset-password` | Clean recovery card matching Stitch Create Account | `0cca07297d58444497b26e100663bacc` | Client recovery event validation intact |
| `/privacy` | Card layout with data sovereignty tokens | `415f52c7a5284a9da2b6e5e5dd89ae7e` | Plain-language terms, zero cloud resale guarantees |
| `/terms` | Clean legal card layout matching design system | `415f52c7a5284a9da2b6e5e5dd89ae7e` | Terms of service and user agreements |

## 3. Strict Reachability Verification (Zero Feature Drop Guarantee)

- **Study Analytics / Heatmap**: Now directly integrated into **Grades** via a dedicated "Study stats" sub-view / switch. Every chart, metric, and 12-week cell remains fully rendered and functional.
- **Mistakes & Topics**: Fully preserved under **Practice** with dual segmented control (`[Mistakes] [Topics]`). Redo modal, confidence rating, and bulk import remain 100% active.
- **Device Diagnostics & PWA Cache**: Integrated cleanly into the new **Data and privacy** tab under a "Device & offline storage" section. Active session safeguard and cache clearing remain completely intact.
- **Protocol Targets**: Restructured under **Targets** tab with refined sliders and input fields matching Stitch design system.

