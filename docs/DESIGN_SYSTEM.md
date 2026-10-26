# LifeMaxxing Design System (Stitch Light-Mode Edition)

## Overview

LifeMaxxing uses the **Stitch Light-Mode Design System**: a high-clarity, daylight-first interface built on cool-lavender canvas gradients (`#F3F4FB` → `#ECEEFA`), crisp white cards (`#FFFFFF`) with subtle borders (`#E3E5F0`) and soft ambient elevation (`0 8px 24px rgba(40, 50, 120, 0.08)`), deep ink primary actions (`#14161A`), and chromatic domain gradients for **Body**, **Mind**, and **School**.

All visual tokens and primitives live in:
- [`src/lib/design/tokens.ts`](../src/lib/design/tokens.ts) — Typed TypeScript design token contract (`DESIGN_TOKENS`).
- [`src/lib/design/fonts.ts`](../src/lib/design/fonts.ts) — Subsetted font loader (`IBM Plex Sans` and `IBM Plex Sans Arabic`).
- [`src/app/globals.css`](../src/app/globals.css) — Tailwind v4 `@theme` tokens and Stitch surface utility classes (`.stitch-canvas`, `.stitch-card`, `.liquid-glass-bar`).
- [`src/components/ui/`](../src/components/ui/index.ts) — Shared UI components (`Button`, `Badge`, `Tab`, `Card`, `Input`, `ProgressBar`).
- [`src/app/dev/design/page.tsx`](../src/app/dev/design/page.tsx) — Interactive design system preview route (`/dev/design`).

---

## 1. Color & Surface Tokens

### Surfaces & Borders

| Token | Tailwind Class / Variable | Hex | Role |
| :--- | :--- | :--- | :--- |
| `canvasStart` → `canvasEnd` | `.stitch-canvas` | `#F3F4FB` → `#ECEEFA` | App viewport background gradient |
| `surface` | `bg-surface` (`--color-surface`) | `#F9F9FF` | Page & modal shell surface |
| `surfaceLowest` | `bg-surface-container` / `.stitch-card` | `#FFFFFF` | Primary card & modal container |
| `surfaceLow` | `bg-surface-container-low` | `#F0F3FF` | Input wells, nested metric boxes |
| `surfaceContainer` | `bg-surface-container-high` | `#E7EEFF` | Secondary buttons, inactive pills, hover states |
| `surfaceHighest` | `bg-surface-container-highest` | `#DCE2F3` | Progress tracks, active neutral pills |
| `border` | `border-border-subtle` | `#E3E5F0` | Card and control hairline border |
| `outlineVariant` | `border-border-medium` | `#C6C6CB` | Emphasized input / button outline |

### Ink & Contrast Hierarchy

| Token | Tailwind Class | Hex | Contrast on `#FFFFFF` | Role |
| :--- | :--- | :--- | :--- | :--- |
| `ink` | `text-on-surface` | `#14161A` | **18.1:1** (AAA) | Primary text, headings, primary action fill (`bg-primary-lime`) |
| `slate` | `text-on-surface-variant` / `text-text-muted` | `#5B6270` | **6.1:1** (AA) | Secondary descriptions, captions, metadata |
| `onPrimary` | `text-on-primary` | `#FFFFFF` | **18.1:1** on `#14161A` | Text on primary solid buttons (`bg-primary-lime text-on-primary`) |

### Domain Gradients & Chips

| Domain | Hero / Progress Gradient | Chip Surface | Chip Ink | Accent |
| :--- | :--- | :--- | :--- | :--- |
| **Body** | `linear-gradient(135deg, #2563EB 0%, #4338CA 100%)` | `#E6EEFF` | `#1E3A9E` | `#2563EB` (`--color-secondary-cyan`) |
| **Mind** | `linear-gradient(135deg, #7C3AED 0%, #A21CAF 100%)` | `#F1E8FF` | `#5B21B6` | `#7C3AED` (`--color-tertiary-purple`) |
| **School** | `linear-gradient(135deg, #DB2777 0%, #C2410C 100%)` | `#FDE7F1` | `#9D174D` | `#DB2777` (`--color-amber-core`) |

### Semantic Status & Rank Accents

| Token | Tailwind Class | Value | Role |
| :--- | :--- | :--- | :--- |
| `emerald-success` | `text-emerald-success` / `bg-emerald-success` | `#15803D` | Positive telemetry, completed states |
| `crimson-alert` / `error` | `text-crimson-alert` / `text-error` | `#BA1A1A` | Destructive actions, overdue alerts, validation errors |
| `recordSurface` / `recordText` | `Badge variant="record"` | `#F5B301` / `#4A3400` | Personal record & gold rank highlight |

---

## 2. Typography & Locale-Gated Font Loading

Configured in [`src/lib/design/fonts.ts`](../src/lib/design/fonts.ts):

- **`IBM Plex Sans` (`--font-plex-sans`)**: Weights `400` (regular) and `500` (medium) only, subset `latin`, `preload: true`.
- **`IBM Plex Sans Arabic` (`--font-plex-arabic`)**: Weights `400` and `500` only, subset `arabic`, `preload: false`.
  - **Locale-Gated Activation**: `:root` sets `--font-active-plex: var(--font-plex-sans)`. Only when `html[lang="ar"]` or `html[dir="rtl"]` is active does `--font-active-plex` switch to `var(--font-plex-arabic), var(--font-plex-sans)`. This prevents Arabic font downloads during English sessions and reduces raw font bundle size by **19.9%** (`298.1 KB` → `238.8 KB`).

### Type Scale (`DESIGN_TOKENS.typography`)

- **`headlineXl`**: `28px/36px` mobile, `40px/48px` desktop (`font-medium`)
- **`headlineLg`**: `28px/36px` (`font-medium`)
- **`headlineMd`**: `20px/28px` (`font-medium`)
- **`headlineSm`**: `16px/24px` (`font-medium`)
- **`bodyLg`**: `16px/24px` (`font-normal`)
- **`bodyMd`**: `14px/20px` (`font-normal`)
- **`labelMd`**: `14px/20px` (`font-medium`)
- **`labelSm`**: `12px/16px` (`font-medium`)
- **`caption`**: `12px/16px` (`font-normal`)

---

## 3. Shared UI Components (`src/components/ui`)

- **[`Button`](../src/components/ui/Button.tsx)**: Variants `primary`, `secondary`, `ghost`, `danger`, `body`, `mind`, `school`; sizes `sm`, `md`, `lg`, `icon`.
- **[`Card`](../src/components/ui/Card.tsx)**: Variants `default` (`.stitch-card`), `subtle`, `elevated`, `hero-body`, `hero-mind`, `hero-school`.
- **[`Badge`](../src/components/ui/Badge.tsx)**: Variants `neutral`, `body`, `mind`, `school`, `record`, `success`, `danger`.
- **[`Tab`](../src/components/ui/Tab.tsx)**: Pill segmented control (`#14161A` active pill with white text; white inactive pill with `#E3E5F0` border).
- **[`Input`](../src/components/ui/Input.tsx)**: Light-mode rounded input (`rounded-[12px]`, `#FFFFFF` fill, `#E3E5F0` border, `#14161A` focus ring).
- **[`ProgressBar`](../src/components/ui/ProgressBar.tsx)**: Domain-aware linear progress bar (`body`, `mind`, `school`, `primary`, `success`, `danger`) on `#E7EEFF` track.

---

## 4. Intentional Stitch Mockup Omissions

Per product requirements, every visible control maps to real application state and handlers. Three decorative mockup elements from the Stitch exploration were **intentionally not built**:
1. **Customize Panel** (floating right-hand drawer in Stitch mockups) — module customization is already handled by **Settings → Modules** (`ModulesTab`).
2. **Header Search Input** — omitted because there is no cross-domain global search backend.
3. **Header Notification Bell** — omitted because push notifications are not active in this release.

---

## 5. Verification Gates

Every commit on `design/new-look` is verified by 6 automated gates:
1. `node scripts/check-design-only.mjs` (plus `node scripts/check-design-only.selftest.mjs`) — AST & path gate enforcing that only presentational JSX attributes (`className`, `style`, SVG presentation attributes), `src/lib/design/**`, `src/components/ui/**`, `src/app/dev/**`, `docs/**`, and the two explicitly permitted non-visual edits (`public/manifest.json` + `src/app/layout.tsx` theme colors, and `const CACHE_VERSION` in `public/sw.js`) change relative to `pre-redesign`.
2. `npx tsc --noEmit` — full TypeScript check.
3. `npx eslint` — zero errors/warnings in new/touched design files; total repository problem count not worse than baseline (`291`).
4. `npm run test:auth` — 9-part authentication & security verification suite.
5. `npm run check:contrast` — solid accent contrast & disabled-state regression check.
6. `npm run build` + `node scripts/measure-bundle.mjs --compare docs/design-baseline/bundle.json` — production build & bundle delta measurement.
