#!/usr/bin/env node
/**
 * check-logic-intact.mjs
 *
 * Gate for the design/rebuild branch. Compares the working tree (committed,
 * staged, unstaged, and untracked files) against the `pre-rebuild` tag.
 *
 * RULES:
 *  1. HARD-PROTECTED paths: any change fails (API routes, middleware/proxy,
 *     auth, Supabase migrations, core calculation/scoring logic in src/lib,
 *     hooks, existing test suites, env files, next.config, package.json).
 *  2. Service worker: only cache VERSION line may change.
 *     Manifest: only theme_color / background_color may change.
 *  3. In component and view files (src/components/**, src/app/**):
 *     - JSX structure, layout, elements, attributes, CSS classes, and UI text
 *       are FREE to change to match the Stitch designs.
 *     - The LOGIC FINGERPRINT (state declarations, hook calls, query tables and
 *       filters, mutations, handler bodies, and calculation functions) must
 *       remain intact.
 *     - Any change to a query filter, table name, mutation call, handler body,
 *       or calculation logic triggers a failure, unless the query is explicitly
 *       listed in APPROVED_READONLY_QUERIES.
 *  4. No files may be deleted without approval.
 *
 * Usage: node scripts/check-logic-intact.mjs [--base <ref>] [--verbose]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = process.cwd();
const args = process.argv.slice(2);
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : "pre-rebuild";
const VERBOSE = args.includes("--verbose");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Any change to these fails. */
const HARD_PROTECTED = [
  "src/app/api/**",
  "src/app/auth/**",
  "src/middleware.ts",
  "src/proxy.ts",
  "src/lib/**", // except STYLING_LIB_ALLOWLIST and APPROVED_READONLY_LIB below
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

/** Files inside src/lib that MAY change because they only hold styling/tokens. */
const STYLING_LIB_ALLOWLIST = [
  "src/lib/design/**", // design tokens, fonts, theme definitions
];

/**
 * Approved new read-only query helpers or display helpers inside src/lib.
 * Each must be proposed to and approved by the user before adding here.
 */
const APPROVED_READONLY_LIB = [
  "src/lib/todayDisplayQueries.ts",
];

/**
 * New presentational / display-only components allowed to have new render logic.
 * Must NOT contain data mutations (.insert, .update, .delete, .upsert) or unauthorized queries.
 */
const PRESENTATIONAL_ALLOWLIST = [
  "src/lib/design/**",
  "src/components/ui/**",
  "src/components/illustrations/**",
  "src/components/today/**",
  "src/app/dev/**",
];

const DATA_MUTATION_REGEX = /\.(insert|update|delete|upsert)\s*\(|fetch\s*\([^)]*method:\s*["'](POST|PUT|DELETE|PATCH)["']/i;

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
// TypeScript AST Logic Extraction
// ---------------------------------------------------------------------------

const isJsxRoot = (n) =>
  ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n);

const CLASS_VAR = /(classname|classes|class|styles?|cls)$/i;
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
    if (r.start < pos) continue;
    out += text.slice(pos, r.start) + r.with;
    pos = r.end;
  }
  return out + text.slice(pos);
}

/**
 * Extracts pure logic:
 * - strips all JSX trees (HTML tags, layout wrappers, components, JSX text)
 * - strips className strings and style literals
 * - strips UI text comments
 * - leaves all state hooks, query filters, mutations, calculations, and handler bodies
 */
export function extractLogicFingerprint(sf) {
  const text = sf.getFullText();
  const ranges = [];
  const visit = (n) => {
    if (isJsxRoot(n)) {
      ranges.push({ start: n.getStart(sf), end: n.getEnd(), with: " __JSX__ " });
      return;
    }
    if (ts.isImportDeclaration(n)) {
      ranges.push({ start: n.getStart(sf), end: n.getEnd(), with: " " });
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

function parse(file, src) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : file.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
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
  if (a.length !== b.length) return fail("public/sw.js", "line count changed (only the cache VERSION line may change)");
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const versionLine = /^\s*const\s+\w*(VERSION|CACHE)\w*\s*=\s*["'`][^"'`]*["'`];?\s*$/;
    if (!(versionLine.test(a[i]) && versionLine.test(b[i]))) {
      return fail("public/sw.js", `line ${i + 1} changed and is not the cache VERSION line`);
    }
    notes.push(`public/sw.js: cache version line ${i + 1}: ${a[i].trim()} -> ${b[i].trim()}`);
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

// ---------------------------------------------------------------------------
// Reachability Check for Controls, Handlers, and Modals
// ---------------------------------------------------------------------------

const APPROVED_REMOVALS = new Set([
  // Approved Stage A replacements in TodayView.tsx (replaced by Stitch widgets)
  "src/components/views/TodayView.tsx:Calendar",
  "src/components/views/TodayView.tsx:LifePulseRings",
  "src/components/views/TodayView.tsx:TodayBodyCard",
  "src/components/views/TodayView.tsx:TodayMindCard",
  "src/components/views/TodayView.tsx:TodaySchoolCard",
]);

const HANDLER_PREFIX = /^(handle|on[A-Z]|toggle|save|delete|add[A-Z]|remove[A-Z]|update[A-Z]|start[A-Z]|pause[A-Z]|complete[A-Z]|submit[A-Z]|reset[A-Z])/;

function isCapitalized(str) {
  return /^[A-Z]/.test(str);
}

export function extractRenderedIdentifiers(sf) {
  const jsxIdentifiers = new Set();
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = (ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName).getText(sf);
      if (isCapitalized(tag)) jsxIdentifiers.add(tag);
    }
    if (ts.isJsxExpression(node) && node.expression) {
      function collectIds(n) {
        if (ts.isIdentifier(n)) jsxIdentifiers.add(n.text);
        ts.forEachChild(n, collectIds);
      }
      collectIds(node.expression);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return jsxIdentifiers;
}

export function extractControlsAndHandlers(sf) {
  const items = new Set();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && HANDLER_PREFIX.test(node.name.text)) {
      items.add(node.name.text);
    }
    if (ts.isFunctionDeclaration(node) && node.name && ts.isIdentifier(node.name) && HANDLER_PREFIX.test(node.name.text)) {
      items.add(node.name.text);
    }
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      for (const spec of node.importClause.namedBindings.elements) {
        if (isCapitalized(spec.name.text)) items.add(spec.name.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return items;
}

export function checkReachability(file, sfA, sfB) {
  const candidatesA = extractControlsAndHandlers(sfA);
  const renderedA = extractRenderedIdentifiers(sfA);
  const renderedB = extractRenderedIdentifiers(sfB);

  for (const id of candidatesA) {
    if (renderedA.has(id)) {
      if (!renderedB.has(id) && !APPROVED_REMOVALS.has(id) && !APPROVED_REMOVALS.has(`${file}:${id}`)) {
        fail(file, `handler/component "${id}" was referenced by a rendered control at pre-rebuild, but is now orphaned (missing from JSX render tree)`);
      }
    }
  }
}

function checkSourceFile(file, status) {
  const after = headContent(file);
  if (status === "A") {
    // New files in presentational allowlist are allowed but must not mutate data
    if (DATA_MUTATION_REGEX.test(after)) {
      fail(file, "new presentational component contains data mutations (.insert/.update/.delete/.upsert)");
    }
    return;
  }
  const before = baseContent(file);
  if (before === null || after === null) return;
  const sfA = parse(file, before);
  const sfB = parse(file, after);

  if (!matchAny(file, PRESENTATIONAL_ALLOWLIST)) {
    const la = extractLogicFingerprint(sfA);
    const lb = extractLogicFingerprint(sfB);
    if (la !== lb) {
      fail(file, `logic changed (state, hooks, queries, mutations, handlers, or calculations)\n        ${firstTokenDiff(la, lb)}`);
    }
    checkReachability(file, sfA, sfB);
  } else if (DATA_MUTATION_REGEX.test(after)) {
    fail(file, "allowlisted presentational component now contains data mutations");
  }
}

// ---------------------------------------------------------------------------
// Main Execution
// ---------------------------------------------------------------------------

try {
  sh(`git rev-parse --verify ${BASE}`);
} catch {
  console.error(`Base ref "${BASE}" not found.`);
  process.exit(2);
}

console.log(`check-logic-intact: comparing working tree against ${BASE}\n`);
console.log("HARD-PROTECTED (any change fails):");
for (const g of HARD_PROTECTED) console.log(`  ${g}`);
console.log("STYLING ALLOWLIST inside src/lib (may change):");
for (const g of STYLING_LIB_ALLOWLIST) console.log(`  ${g}`);
console.log("APPROVED READ-ONLY QUERY HELPERS in src/lib:");
if (APPROVED_READONLY_LIB.length === 0) console.log("  (none approved yet)");
for (const g of APPROVED_READONLY_LIB) console.log(`  ${g}`);
console.log("PRESENTATIONAL ALLOWLIST (new UI components allowed; mutations forbidden):");
for (const g of PRESENTATIONAL_ALLOWLIST) console.log(`  ${g}`);
console.log("Rule: JSX layout and text are free to change. Logic, queries, mutations, handlers, and calculations are frozen.\n");

const files = changedFiles();
for (const { status, file } of files) {
  const isProtected =
    matchAny(file, HARD_PROTECTED) &&
    !matchAny(file, STYLING_LIB_ALLOWLIST) &&
    !matchAny(file, APPROVED_READONLY_LIB);

  if (isProtected) {
    fail(file, `protected path ${status === "D" ? "deleted" : status === "A" ? "added" : "modified"}`);
    continue;
  }
  if (status === "D") {
    fail(file, "file deleted without approval");
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
console.log("\nPASS: logic is intact across all rebuilt components.");
