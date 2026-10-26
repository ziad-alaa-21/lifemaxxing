#!/usr/bin/env node
/**
 * Self-test for scripts/check-design-only.mjs.
 * Applies temporary mutations to tracked files, runs the gate, and restores
 * every file with `git checkout` afterwards (also on failure).
 * Requires a clean state for the files it touches.
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";

const cases = [
  {
    name: "className-only change in a data component passes",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace(/className="([^"]+)"/, 'className="$1 self-test-class"'),
    expect: 0,
  },
  {
    name: "changing a Supabase table name fails",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace('.from("reading_books")', '.from("reading_book")'),
    expect: 1,
  },
  {
    name: "service worker non-version change (SHELL_ASSETS) fails",
    file: "public/sw.js",
    mutate: (s) => s.replace("const SHELL_ASSETS = [", "const SHELL_ASSETS = [ '/x',"),
    expect: 1,
  },
  {
    name: "service worker STATIC_CACHE_NAME change fails",
    file: "public/sw.js",
    mutate: (s) => s.replace("const STATIC_CACHE_NAME = `life-static-${CACHE_VERSION}`;", "const STATIC_CACHE_NAME = 'other-cache';"),
    expect: 1,
  },
  {
    name: "service worker CACHE_VERSION constant bump passes",
    file: "public/sw.js",
    mutate: (s) => s.replace(/const CACHE_VERSION = '[^']+';/, "const CACHE_VERSION = 'life-v99.0.0';"),
    expect: 0,
  },
  {
    name: "manifest.json theme_color and background_color change passes",
    file: "public/manifest.json",
    mutate: (s) => s.replace(/"theme_color":\s*"[^"]+"/, '"theme_color": "#F3F4FB"').replace(/"background_color":\s*"[^"]+"/, '"background_color": "#ECEEFA"'),
    expect: 0,
  },
  {
    name: "manifest.json non-color change (start_url) fails",
    file: "public/manifest.json",
    mutate: (s) => s.replace('"start_url": "/today"', '"start_url": "/body"'),
    expect: 1,
  },
  {
    name: "layout.tsx meta theme-color (viewport.themeColor) change passes",
    file: "src/app/layout.tsx",
    mutate: (s) => s.replace(/themeColor:\s*"[^"]+"/, 'themeColor: "#F3F4FB"'),
    expect: 0,
  },
  {
    name: "layout.tsx non-themeColor metadata change fails",
    file: "src/app/layout.tsx",
    mutate: (s) => s.replace('title: "Life"', 'title: "Other"'),
    expect: 1,
  },
  {
    name: "editing authConfig fails",
    file: "src/lib/authConfig.ts",
    mutate: (s) => s + "\n// touched\n",
    expect: 1,
  },
  {
    name: "changing an aria-label fails",
    file: "src/components/navigation/BottomTabBar.tsx",
    mutate: (s) => s.replace('aria-label="Quick Action"', 'aria-label="Add"'),
    expect: 1,
  },
  {
    name: "removing an aria-label fails",
    file: "src/components/navigation/BottomTabBar.tsx",
    mutate: (s) => s.replace('aria-label="Bottom Navigation"', ""),
    expect: 1,
  },
  {
    name: "changing a hook/state line fails",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace(/useState(<[^>]*>)?\(/, (m) => `${m}/*x*/ undefined ?? `),
    expect: 1,
  },
];

function run() {
  const r = spawnSync(process.execPath, ["scripts/check-design-only.mjs"], { encoding: "utf8" });
  return r.status;
}

let failed = 0;
for (const c of cases) {
  const original = fs.readFileSync(c.file, "utf8");
  try {
    const mutated = c.mutate(original);
    if (mutated === original) throw new Error("mutation did not apply");
    fs.writeFileSync(c.file, mutated);
    const status = run();
    const ok = c.expect === "either" ? true : status === c.expect;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name} (gate exit ${status}, expected ${c.expect})`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`FAIL  ${c.name}: ${e.message}`);
    failed++;
  } finally {
    fs.writeFileSync(c.file, original);
    execSync(`git diff --quiet -- "${c.file}" || git checkout -- "${c.file}"`, { stdio: "ignore", shell: true });
  }
}
console.log(failed ? `\n${failed} self-test case(s) failed` : "\nAll self-test cases passed");
process.exit(failed ? 1 : 0);
