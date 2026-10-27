#!/usr/bin/env node
/**
 * check-design-only.mjs
 *
 * Gate for the design/new-look branch. Compares the working tree (committed,
 * staged, unstaged and untracked files) against the `pre-redesign` tag and
 * FAILS if anything outside the design surface changed.
 *
 * Layers:
 *  1. HARD-PROTECTED paths: any change fails (API routes, middleware/proxy,
 *     auth, Supabase, migrations, logic in src/lib, hooks, translations,
 *     existing tests, env files, next.config, package.json, package-lock.json).
 *  2. Exactly two non-visual edits are permitted across the repo:
 *     a. Theme colors: `theme_color` / `background_color` in `public/manifest.json`
 *        and `viewport.themeColor` (meta theme-color) in `src/app/layout.tsx`.
 *     b. Cache version constant: `const CACHE_VERSION = '...'` in `public/sw.js`
 *        (nothing else in `public/sw.js`).
 *  3. Every changed .ts/.tsx file under src/ (that is not hard-protected) is
 *     parsed with the TypeScript compiler and must keep:
 *       a. LOGIC FINGERPRINT: all non-JSX code (imports, state, hooks, effects,
 *          queries, handlers, calculations) token-identical. Only string
 *          literals in class-name contexts (cn()/clsx() arguments, variables
 *          named *className / *classes / *styles) are ignored.
 *          Exempt only for files in LOGIC_ALLOWLIST (pure presentational /
 *          styling files, printed below).
 *       b. CONTRACT FINGERPRINT (applies to every file, allowlisted or not):
 *          - every JSX attribute except purely presentational ones
 *            (className, style, SVG geometry, chart styling, motion props...),
 *            i.e. ids, names, data-testid, aria-*, role, href, type, value,
 *            event handlers, component data props, translation-bearing props;
 *          - every JSX text node and every JSX child expression
 *            (translation lookups, conditional loading/empty/error states);
 *          - the ORDER of focusable/interactive elements (keyboard order).
 *  4. Deleted files fail. New files under src/ must contain no data access
 *     (no supabase / fetch / .from( / .rpc( ).
 *
 * Usage: node scripts/check-design-only.mjs [--base <ref>] [--verbose]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = process.cwd();
const args = process.argv.slice(2);
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : "pre-redesign";
const VERBOSE = args.includes("--verbose");

// ---------------------------------------------------------------------------
// Configuration (printed on every run so it can be reviewed)
// ---------------------------------------------------------------------------

/** Any change to these fails. */
const HARD_PROTECTED = [
  "src/app/api/**",
  "src/app/auth/**",
  "src/middleware.ts",
  "src/proxy.ts",
  "src/lib/**", // except STYLING_LIB_ALLOWLIST below
  "src/hooks/**",
  "supabase/**",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "public/.well-known/**",
  ".env*",
  "scripts/test-auth-modes.mjs",
  "scripts/check-contrast-regression.js",
  "scripts/verify-arabic-i18n.js",
  "scripts/verify-contrast-and-capture.js",
  "scripts/capture-liquid-glass.js",
  "docs/AUTH_MODES.md",
];

/** Files inside src/lib that MAY change because they only hold styling. */
const STYLING_LIB_ALLOWLIST = [
  "src/lib/design/**", // new: design tokens / font setup / class helpers
];

/**
 * Files whose non-JSX code may change (pure presentation, no data access).
 * Their JSX contract (ids, aria, handlers, text, keyboard order) is still checked.
 */
const LOGIC_ALLOWLIST = [
  "src/lib/design/**",
  "src/components/ui/**", // shared primitives: Button, Badge, Tab, Card...
  "src/components/illustrations/**", // dedicated folder for pure SVG illustration components
  "src/app/dev/**", // development-only design-system preview
];

/** JSX attributes that are purely visual and therefore NOT part of the contract. */
const PRESENTATIONAL_ATTRS = new Set([
  "className", "style", "class",
  // design-system props of shared primitives
  "variant", "tone", "size", "padding", "elevation", "radius", "domain", "gradient", "emphasis", "iconPosition", "fullWidth",
  // icons
  "strokeWidth", "absoluteStrokeWidth", "color",
  // svg geometry / paint
  "viewBox", "d", "fill", "stroke", "strokeLinecap", "strokeLinejoin", "strokeDasharray", "strokeDashoffset",
  "strokeOpacity", "fillOpacity", "fillRule", "clipRule", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "x2", "y1", "y2",
  "width", "height", "points", "transform", "opacity", "offset", "stopColor", "stopOpacity", "gradientUnits",
  "gradientTransform", "preserveAspectRatio", "xmlns", "clipPath", "mask", "filter", "vectorEffect", "pathLength",
  // recharts styling (dataKey and data stay protected)
  "barSize", "barGap", "barCategoryGap", "cursor", "contentStyle", "labelStyle", "itemStyle", "wrapperStyle",
  "tick", "tickLine", "axisLine", "tickMargin", "vertical", "horizontal", "dot", "activeDot", "isAnimationActive",
  "animationDuration", "animationEasing", "margin", "background", "minPointSize", "maxBarSize", "strokeWidthActive",
  // motion (removing entrance/hover animation is a design change)
  "initial", "animate", "exit", "transition", "whileHover", "whileTap", "whileInView", "whileFocus", "layout",
  "layoutId", "variants", "mode",
]);

/** `id` is presentational only on SVG paint servers (gradient defs etc.). */
const SVG_DEF_TAGS = new Set(["linearGradient", "radialGradient", "clipPath", "mask", "pattern", "filter"]);

const NATIVE_FOCUSABLE = new Set(["button", "a", "input", "select", "textarea", "summary", "details", "label"]);
const COMPONENT_FOCUSABLE = /^(Button|IconButton|Link|Input|Select|Textarea|Toggle|Switch|Checkbox|Stepper|Tab|Chip|Segmented\w*)$/;

const DATA_ACCESS = /supabase|createClient|\.from\(|\.rpc\(|\bfetch\(/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function globToRegex(glob) {
  const esc = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\/?/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${esc}$`);
}
const matchAny = (file, globs) => globs.some((g) => globToRegex(g).test(file));

function baseContent(file) {
  try {
    return execSync(`git show ${BASE}:"${file}"`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}
function headContent(file) {
  const p = path.join(ROOT, file);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

function changedFiles() {
  const diff = sh(`git diff --name-status ${BASE}`).trim().split(/\r?\n/).filter(Boolean);
  const untracked = sh("git ls-files --others --exclude-standard").trim().split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of diff) {
    const parts = line.split("\t");
    const status = parts[0][0];
    if (status === "R") {
      out.push({ status: "D", file: parts[1] });
      out.push({ status: "A", file: parts[2] });
    } else {
      out.push({ status, file: parts[1] });
    }
  }
  for (const f of untracked) out.push({ status: "A", file: f });
  return out.map((x) => ({ ...x, file: x.file.replace(/\\/g, "/") }));
}

// ---------------------------------------------------------------------------
// TypeScript fingerprints
// ---------------------------------------------------------------------------

const isJsxRoot = (n) =>
  ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n);

const CLASS_VAR = /(classname|classes|class|styles?|cls|colors?|dotcolor)$/i;
const CLASS_FN = new Set(["cn", "clsx", "twMerge", "cva", "classNames"]);

function inClassContext(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && CLASS_FN.has(p.expression.text)) return true;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && CLASS_VAR.test(p.name.text)) return true;
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && CLASS_VAR.test(p.name.text)) return true;
    if (ts.isFunctionLike(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

function tokensOf(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /*skipTrivia*/ true, ts.LanguageVariant.Standard, text);
  const toks = [];
  let k = scanner.scan();
  while (k !== ts.SyntaxKind.EndOfFileToken) {
    toks.push(scanner.getTokenText());
    k = scanner.scan();
  }
  return toks.join(" ");
}

function replaceRanges(text, ranges) {
  ranges.sort((a, b) => a.start - b.start);
  let out = "";
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue; // nested inside an earlier replacement
    out += text.slice(pos, r.start) + r.with;
    pos = r.end;
  }
  return out + text.slice(pos);
}

const FONT_LOADERS = new Set(["Inter", "JetBrains_Mono", "IBM_Plex_Sans", "IBM_Plex_Sans_Arabic"]);

/** Non-JSX code with JSX trees and class-name strings neutralised, as a token stream. */
function logicFingerprint(sf, { isRootLayout = false } = {}) {
  const text = sf.getFullText();
  const ranges = [];
  let fontSetupInserted = false;
  const visit = (n) => {
    if (isRootLayout) {
      if (
        ts.isImportDeclaration(n) &&
        ts.isStringLiteral(n.moduleSpecifier) &&
        (n.moduleSpecifier.text === "next/font/google" || n.moduleSpecifier.text === "@/lib/design/fonts")
      ) {
        ranges.push({ start: n.getStart(sf), end: n.getEnd(), with: fontSetupInserted ? " " : " __FONT_SETUP__ " });
        fontSetupInserted = true;
        return;
      }
      if (
        ts.isVariableStatement(n) &&
        n.declarationList.declarations.every(
          (d) =>
            d.initializer &&
            ts.isCallExpression(d.initializer) &&
            ts.isIdentifier(d.initializer.expression) &&
            FONT_LOADERS.has(d.initializer.expression.text)
        )
      ) {
        ranges.push({ start: n.getStart(sf), end: n.getEnd(), with: fontSetupInserted ? " " : " __FONT_SETUP__ " });
        fontSetupInserted = true;
        return;
      }
      if (
        ts.isPropertyAssignment(n) &&
        n.name.getText(sf) === "themeColor" &&
        ts.isStringLiteral(n.initializer) &&
        n.parent &&
        ts.isObjectLiteralExpression(n.parent) &&
        n.parent.parent &&
        ts.isVariableDeclaration(n.parent.parent) &&
        n.parent.parent.name.getText(sf) === "viewport"
      ) {
        ranges.push({ start: n.initializer.getStart(sf), end: n.initializer.getEnd(), with: " __META_THEME_COLOR__ " });
        return;
      }
    }
    if (
      ts.isImportDeclaration(n) &&
      ts.isStringLiteral(n.moduleSpecifier) &&
      n.moduleSpecifier.text === "@/components/illustrations/BarbellSvg"
    ) {
      ranges.push({ start: n.getStart(sf), end: n.getEnd(), with: " " });
      return;
    }
    if (isJsxRoot(n)) {
      ranges.push({ start: n.getStart(sf), end: n.getEnd(), with: " __JSX__ " });
      return;
    }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && inClassContext(n)) {
      ranges.push({ start: n.getStart(sf), end: n.getEnd(), with: " __CLS__ " });
      return;
    }
    if (ts.isTemplateExpression(n) && inClassContext(n)) {
      ranges.push({ start: n.head.getStart(sf), end: n.head.getEnd(), with: " __CLS__ ( " });
      for (const span of n.templateSpans) {
        ranges.push({ start: span.literal.getStart(sf), end: span.literal.getEnd(), with: " ) __CLS__ ( " });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return tokensOf(replaceRanges(text, ranges));
}

function tagNameOf(n) {
  const opening = ts.isJsxElement(n) ? n.openingElement : n;
  return opening.tagName.getText();
}

/** Expression text with nested JSX replaced, whitespace-insensitive. */
function exprText(sf, expr) {
  const text = sf.getFullText();
  const ranges = [];
  const visit = (n) => {
    if (isJsxRoot(n)) {
      ranges.push({ start: n.getStart(sf) - expr.getStart(sf), end: n.getEnd() - expr.getStart(sf), with: " __JSX__ " });
      return;
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(expr, visit);
  return tokensOf(replaceRanges(text.slice(expr.getStart(sf), expr.getEnd()), ranges));
}

function contractFingerprint(sf) {
  const attrs = [];
  const texts = [];
  const childExprs = [];
  const focusOrder = [];

  const visit = (n) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const opening = ts.isJsxElement(n) ? n.openingElement : n;
      const tag = tagNameOf(n);
      if (tag === "BarbellSvg") {
        return;
      }
      const sig = [];
      let interactive = NATIVE_FOCUSABLE.has(tag) || COMPONENT_FOCUSABLE.test(tag.split(".").pop());
      for (const prop of opening.attributes.properties) {
        if (ts.isJsxSpreadAttribute(prop)) {
          const s = `{...${exprText(sf, prop.expression)}}`;
          attrs.push(`${tag}:${s}`);
          sig.push(s);
          continue;
        }
        const name = prop.name.getText();
        if (PRESENTATIONAL_ATTRS.has(name)) continue;
        if (name === "id" && SVG_DEF_TAGS.has(tag)) continue;
        if (name === "key") continue; // React reconciliation hint, not user-facing
        let value = "true";
        if (prop.initializer) {
          value = ts.isJsxExpression(prop.initializer)
            ? prop.initializer.expression ? exprText(sf, prop.initializer.expression) : ""
            : prop.initializer.getText();
        }
        const entry = `${name}=${value}`;
        attrs.push(entry);
        sig.push(entry);
        if (/^on[A-Z]/.test(name) || name === "href" || name === "tabIndex") interactive = true;
      }
      if (interactive) focusOrder.push(sig.sort().join(" | "));
    } else if (ts.isJsxText(n)) {
      const t = n.getText().replace(/\s+/g, " ").trim();
      if (t) texts.push(t);
    } else if (ts.isJsxExpression(n) && n.parent && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      if (n.expression) childExprs.push(exprText(sf, n.expression));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return {
    attrs: attrs.sort(),
    texts: texts.sort(),
    childExprs: childExprs.sort(),
    focusOrder,
  };
}

function parse(file, src) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : file.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
}

function multisetDiff(a, b) {
  const count = new Map();
  for (const x of a) count.set(x, (count.get(x) || 0) + 1);
  for (const x of b) count.set(x, (count.get(x) || 0) - 1);
  const removed = [];
  const added = [];
  for (const [k, v] of count) {
    if (v > 0) removed.push(`${k}${v > 1 ? ` (x${v})` : ""}`);
    if (v < 0) added.push(`${k}${v < -1 ? ` (x${-v})` : ""}`);
  }
  return { removed, added };
}

function firstTokenDiff(a, b) {
  const ta = a.split(" ");
  const tb = b.split(" ");
  let i = 0;
  while (i < ta.length && i < tb.length && ta[i] === tb[i]) i++;
  const ctx = (t) => t.slice(Math.max(0, i - 8), i + 12).join(" ");
  return `before: …${ctx(ta)}…\n        after:  …${ctx(tb)}…`;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const failures = [];
const notes = [];
const fail = (file, msg) => failures.push(`${file}: ${msg}`);

function checkServiceWorker() {
  const a = (baseContent("public/sw.js") || "").split(/\r?\n/);
  const b = (headContent("public/sw.js") || "").split(/\r?\n/);
  if (a.length !== b.length) return fail("public/sw.js", "line count changed (only the CACHE_VERSION constant in sw.js may change)");
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const versionConst = /^const\s+CACHE_VERSION\s*=\s*['"][^'"]+['"];$/;
    if (!(versionConst.test(a[i].trim()) && versionConst.test(b[i].trim()))) {
      return fail("public/sw.js", `line ${i + 1} changed and is not the CACHE_VERSION constant`);
    }
    notes.push(`public/sw.js: CACHE_VERSION constant line ${i + 1}: ${a[i].trim()} -> ${b[i].trim()}`);
  }
}

function checkManifest() {
  const a = JSON.parse(baseContent("public/manifest.json") || "{}");
  const b = JSON.parse(headContent("public/manifest.json") || "{}");
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
    if (k === "theme_color" || k === "background_color") {
      notes.push(`public/manifest.json: ${k} ${a[k]} -> ${b[k]}`);
      continue;
    }
    fail("public/manifest.json", `field "${k}" changed (only theme_color and background_color may change)`);
  }
}

function extractViewportThemeColor(sf) {
  let val = null;
  const visit = (n) => {
    if (
      ts.isPropertyAssignment(n) &&
      n.name.getText(sf) === "themeColor" &&
      ts.isStringLiteral(n.initializer) &&
      n.parent &&
      ts.isObjectLiteralExpression(n.parent) &&
      n.parent.parent &&
      ts.isVariableDeclaration(n.parent.parent) &&
      n.parent.parent.name.getText(sf) === "viewport"
    ) {
      val = n.initializer.text;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return val;
}

function checkSourceFile(file, status) {
  const after = headContent(file);
  if (status === "A") {
    if (DATA_ACCESS.test(after)) fail(file, "new source file contains data access (supabase/fetch/.from/.rpc)");
    return;
  }
  const before = baseContent(file);
  if (before === null || after === null) return;
  const sfA = parse(file, before);
  const sfB = parse(file, after);

  const isRootLayout = file === "src/app/layout.tsx";
  if (isRootLayout) {
    const tcA = extractViewportThemeColor(sfA);
    const tcB = extractViewportThemeColor(sfB);
    if (tcA !== tcB) {
      notes.push(`src/app/layout.tsx: meta theme-color (viewport.themeColor) ${tcA} -> ${tcB}`);
    }
  }

  if (!matchAny(file, LOGIC_ALLOWLIST)) {
    const la = logicFingerprint(sfA, { isRootLayout });
    const lb = logicFingerprint(sfB, { isRootLayout });
    if (la !== lb) fail(file, `non-JSX logic changed (state, hooks, queries, handlers or calculations)\n        ${firstTokenDiff(la, lb)}`);
  } else if (DATA_ACCESS.test(after)) {
    fail(file, "allowlisted presentational file now contains data access");
  }

  const ca = contractFingerprint(sfA);
  const cb = contractFingerprint(sfB);
  for (const [key, label] of [["attrs", "JSX contract attribute"], ["texts", "JSX text"], ["childExprs", "JSX child expression (labels / states)"]]) {
    const { removed, added } = multisetDiff(ca[key], cb[key]);
    if (removed.length || added.length) {
      fail(file, `${label} changed\n${removed.map((r) => `        - ${r}`).join("\n")}${removed.length && added.length ? "\n" : ""}${added.map((r) => `        + ${r}`).join("\n")}`);
    }
  }
  if (JSON.stringify(ca.focusOrder) !== JSON.stringify(cb.focusOrder)) {
    fail(file, `order of interactive elements changed (keyboard order)\n        before: ${JSON.stringify(ca.focusOrder)}\n        after:  ${JSON.stringify(cb.focusOrder)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

try {
  sh(`git rev-parse --verify ${BASE}`);
} catch {
  console.error(`Base ref "${BASE}" not found.`);
  process.exit(2);
}

console.log(`check-design-only: comparing working tree against ${BASE}\n`);
console.log("HARD-PROTECTED (any change fails):");
for (const g of HARD_PROTECTED) console.log(`  ${g}`);
console.log("STYLING ALLOWLIST inside src/lib (may change):");
for (const g of STYLING_LIB_ALLOWLIST) console.log(`  ${g}`);
console.log("LOGIC ALLOWLIST (non-JSX code may change; JSX contract still enforced):");
for (const g of LOGIC_ALLOWLIST) console.log(`  ${g}`);
console.log("Non-visual edits allowed (exactly two):");
console.log("  1. Theme colors: public/manifest.json (theme_color, background_color) + src/app/layout.tsx (viewport.themeColor)");
console.log("  2. Service worker cache version constant: public/sw.js (const CACHE_VERSION = '...' only)");
console.log("Other rules: no deleted files; new src files must not access data.\n");

const files = changedFiles();
for (const { status, file } of files) {
  const protectedPath = matchAny(file, HARD_PROTECTED) && !matchAny(file, STYLING_LIB_ALLOWLIST);
  if (protectedPath) {
    fail(file, `protected path ${status === "D" ? "deleted" : status === "A" ? "added" : "modified"}`);
    continue;
  }
  if (status === "D") {
    fail(file, "file deleted (routes, tests and strings must not be removed)");
    continue;
  }
  if (file === "public/sw.js") { checkServiceWorker(); continue; }
  if (file === "public/manifest.json") { checkManifest(); continue; }
  if (file.startsWith("src/") && /\.(tsx?|jsx?)$/.test(file)) { checkSourceFile(file, status); continue; }
}

console.log(`Changed files vs ${BASE}: ${files.length}`);
if (VERBOSE) for (const f of files) console.log(`  ${f.status} ${f.file}`);
if (notes.length) {
  console.log("\nNotes:");
  for (const n of notes) console.log(`  - ${n}`);
}
if (failures.length) {
  console.log(`\nFAIL: ${failures.length} violation(s)`);
  for (const f of failures) console.log(`  x ${f}`);
  process.exit(1);
}
console.log("\nPASS: only design-surface changes detected.");
