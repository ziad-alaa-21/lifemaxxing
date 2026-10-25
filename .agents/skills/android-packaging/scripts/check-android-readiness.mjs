#!/usr/bin/env node
/**
 * Lifemaxxing Android Packaging Readiness Validator
 *
 * Audits:
 * 1. public/manifest.json (name, start_url, display, theme_color, background_color, 192/512 + maskable icons)
 * 2. Icon files on disk in public/
 * 3. public/sw.js (offline fallback + non-caching of /auth/, /api/, and supabase.co)
 * 4. next.config.ts (ensures output: 'export' is NOT set, preserving SSR & httpOnly cookies)
 * 5. Optional: public/.well-known/assetlinks.json, twa-manifest.json, capacitor.config.ts
 *
 * Usage:
 *   node .agents/skills/android-packaging/scripts/check-android-readiness.mjs
 *   node .agents/skills/android-packaging/scripts/check-android-readiness.mjs --init-assetlinks
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));

let passed = 0;
let warnings = 0;
let failed = 0;

function pass(msg) {
  passed += 1;
  console.log(`  [PASS] ${msg}`);
}

function warn(msg) {
  warnings += 1;
  console.log(`  [WARN] ${msg}`);
}

function fail(msg) {
  failed += 1;
  console.error(`  [FAIL] ${msg}`);
}

if (args.has("--init-assetlinks")) {
  const wellKnownDir = path.join(ROOT, "public", ".well-known");
  const assetLinksPath = path.join(wellKnownDir, "assetlinks.json");
  if (fs.existsSync(assetLinksPath)) {
    console.log(`[INFO] ${assetLinksPath} already exists. Skipping template creation.`);
  } else {
    fs.mkdirSync(wellKnownDir, { recursive: true });
    const template = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "io.lifemaxxing.app",
          sha256_cert_fingerprints: [
            "REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT",
            "REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT",
          ],
        },
      },
    ];
    fs.writeFileSync(assetLinksPath, JSON.stringify(template, null, 2) + "\n", "utf8");
    console.log(`[CREATED] ${assetLinksPath}`);
  }
}

console.log("=== Lifemaxxing Android Packaging Readiness Check ===");

// 1. Check public/manifest.json
const manifestPath = path.join(ROOT, "public", "manifest.json");
if (!fs.existsSync(manifestPath)) {
  fail("Missing public/manifest.json");
} else {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.name && manifest.short_name) {
      pass(`Web App Manifest name="${manifest.name}", short_name="${manifest.short_name}"`);
    } else {
      fail("public/manifest.json is missing 'name' or 'short_name'");
    }

    if (manifest.display === "standalone") {
      pass('public/manifest.json has display="standalone"');
    } else {
      fail(`public/manifest.json display is "${manifest.display}" (expected "standalone")`);
    }

    if (manifest.start_url === "/today") {
      pass('public/manifest.json has start_url="/today"');
    } else {
      warn(`public/manifest.json start_url is "${manifest.start_url}" (expected "/today")`);
    }

    if (manifest.theme_color === "#0F1419" && manifest.background_color === "#07090C") {
      pass("public/manifest.json theme_color (#0F1419) and background_color (#07090C) match Lifemaxxing tokens");
    } else {
      warn(
        `public/manifest.json colors (theme=${manifest.theme_color}, bg=${manifest.background_color}) differ from default tokens (#0F1419 / #07090C)`
      );
    }

    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    const has192 = icons.some((i) => i.sizes === "192x192" && i.purpose === "any");
    const has512 = icons.some((i) => i.sizes === "512x512" && i.purpose === "any");
    const hasMaskable192 = icons.some((i) => i.sizes === "192x192" && i.purpose === "maskable");
    const hasMaskable512 = icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable");

    if (has192 && has512 && hasMaskable192 && hasMaskable512) {
      pass("public/manifest.json declares 192x192 and 512x512 icons for both 'any' and 'maskable' purposes");
    } else {
      fail("public/manifest.json is missing required 192x192 or 512x512 'any'/'maskable' icons");
    }

    for (const icon of icons) {
      const iconRel = (icon.src || "").replace(/^\//, "");
      const iconFile = path.join(ROOT, "public", iconRel);
      if (fs.existsSync(iconFile) && fs.statSync(iconFile).size > 0) {
        pass(`Icon asset exists: public/${iconRel} (${fs.statSync(iconFile).size} bytes)`);
      } else {
        fail(`Missing or empty icon asset: public/${iconRel}`);
      }
    }
  } catch (err) {
    fail(`Failed to parse public/manifest.json: ${err.message}`);
  }
}

// 2. Check public/sw.js
const swPath = path.join(ROOT, "public", "sw.js");
if (!fs.existsSync(swPath)) {
  fail("Missing public/sw.js service worker");
} else {
  const swContent = fs.readFileSync(swPath, "utf8");
  if (swContent.includes("'/offline'") || swContent.includes('"/offline"')) {
    pass("public/sw.js pre-caches and serves /offline fallback");
  } else {
    fail("public/sw.js does not reference /offline fallback");
  }

  if (
    swContent.includes("url.pathname.startsWith('/auth/')") &&
    swContent.includes("url.pathname.startsWith('/api/')") &&
    swContent.includes("supabase.co")
  ) {
    pass("public/sw.js bypasses /auth/, /api/, and supabase.co requests (safe for Android auth flows)");
  } else {
    fail("public/sw.js may intercept /auth/, /api/, or supabase.co requests");
  }
}

// 3. Check next.config.ts for static export anti-pattern
const nextConfigPath = path.join(ROOT, "next.config.ts");
if (!fs.existsSync(nextConfigPath)) {
  warn("next.config.ts not found");
} else {
  const nextConfig = fs.readFileSync(nextConfigPath, "utf8");
  if (/output\s*:\s*['"]export['"]/.test(nextConfig)) {
    fail(
      'next.config.ts contains output: "export" which breaks Server Components, Route Handlers (/auth/*, /api/*), and httpOnly cookies'
    );
  } else {
    pass('next.config.ts preserves dynamic SSR & Route Handlers (no output: "export")');
  }
}

// 4. Optional Packaging Configs (Asset Links, Bubblewrap, Capacitor)
const assetLinksPath = path.join(ROOT, "public", ".well-known", "assetlinks.json");
if (fs.existsSync(assetLinksPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(assetLinksPath, "utf8"));
    const raw = JSON.stringify(parsed);
    if (raw.includes("REPLACE_WITH_")) {
      warn("public/.well-known/assetlinks.json exists but still contains placeholder SHA-256 fingerprints");
    } else {
      pass("public/.well-known/assetlinks.json is present and configured");
    }
  } catch (err) {
    fail(`Invalid JSON in public/.well-known/assetlinks.json: ${err.message}`);
  }
} else {
  warn(
    "public/.well-known/assetlinks.json not created yet (run with --init-assetlinks when ready to configure Play signing fingerprints)"
  );
}

const twaManifestPath = fs.existsSync(path.join(ROOT, "twa-manifest.json"))
  ? path.join(ROOT, "twa-manifest.json")
  : path.join(ROOT, "android", "twa-manifest.json");
if (fs.existsSync(twaManifestPath)) {
  pass(`Found Bubblewrap config: ${path.relative(ROOT, twaManifestPath)}`);
}

const capConfigPath = path.join(ROOT, "capacitor.config.ts");
if (fs.existsSync(capConfigPath)) {
  const capContent = fs.readFileSync(capConfigPath, "utf8");
  if (capContent.includes("server:") && capContent.includes("url:")) {
    pass("Found Capacitor config: capacitor.config.ts with hosted server.url");
  } else {
    fail("capacitor.config.ts exists but does not configure server.url (required for Next.js SSR & auth)");
  }
}

console.log(`\nSummary: ${passed} passed, ${warnings} warning(s), ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
