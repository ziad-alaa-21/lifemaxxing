#!/usr/bin/env node

/**
 * CI / Build-time AST Contrast Regression Guard
 *
 * Verifies that all solid and gradient fills across the design system
 * strictly enforce WCAG 2.1 AA contrast (>= 4.5:1).
 *
 * Features:
 *  1. Dynamic token extraction from src/app/globals.css (@theme) and
 *     src/lib/design/tokens.ts (no hardcoded fallback colors; missing tokens fail).
 *  2. Semantic token validation (text-on-primary must be light on dark primary fills).
 *  3. TypeScript AST parsing of JSX elements (handles event handlers with '=>' without truncation).
 *  4. Full surface audit: buttons, badges, chips, cards, banners, and tabs.
 *  5. Gradient contrast validation against both gradient stops.
 *  6. Disabled state check (disabled:opacity on solid fill requires replacement bg/text).
 *  7. Automated self-tests on positive and negative fixtures.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const MIN_CONTRAST = 4.5;
const ROOT = path.resolve(process.cwd());
const ts = require(path.join(ROOT, "node_modules", "typescript"));

// ============================================================================
// 1. WCAG 2.1 Color Math
// ============================================================================

export function hexToRgb(hex) {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) throw new Error(`Invalid hex color: "${hex}"`);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function relativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(fgHex, bgHex) {
  const l1 = relativeLuminance(hexToRgb(fgHex));
  const l2 = relativeLuminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// 2. Dynamic Token Extraction (No Hardcoded Fallbacks)
// ============================================================================

export function parseThemeTokensFromCss(cssPath) {
  if (!fs.existsSync(cssPath)) throw new Error(`globals.css not found at: ${cssPath}`);
  const content = fs.readFileSync(cssPath, "utf8");
  const themeMatch = content.match(/@theme\s*\{([^}]+)\}/s);
  if (!themeMatch) throw new Error("Could not find @theme block in globals.css");

  const colorMap = new Map();
  colorMap.set("white", "#ffffff");
  colorMap.set("black", "#000000");

  const lines = themeMatch[1].split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("--color-")) continue;
    const parts = trimmed.split(":");
    if (parts.length < 2) continue;
    const name = parts[0].trim().replace(/^--color-/, "");
    let val = parts[1].replace(/;.*$/, "").trim();

    if (val.startsWith("var(")) {
      const aliasMatch = val.match(/var\(--color-([^,)]+)/);
      if (aliasMatch && colorMap.has(aliasMatch[1])) {
        val = colorMap.get(aliasMatch[1]);
      }
    }

    if (val.startsWith("#") || val.startsWith("rgba(") || val.startsWith("rgb(")) {
      colorMap.set(name, val);
    }
  }

  const required = [
    "surface", "surface-container-lowest", "on-surface", "text-muted",
    "on-primary", "primary-ink", "primary-lime", "rank-gold",
    "secondary-cyan", "tertiary-purple", "amber-core"
  ];
  for (const req of required) {
    if (!colorMap.has(req)) {
      throw new Error(`[FATAL] Required @theme token "--color-${req}" is missing in globals.css!`);
    }
  }

  // Enforce text-on-primary is light on dark primary fill
  const onPrimary = colorMap.get("on-primary");
  const primaryInk = colorMap.get("primary-ink");
  if (onPrimary && primaryInk) {
    const ratio = contrastRatio(onPrimary, primaryInk);
    if (ratio < MIN_CONTRAST) {
      throw new Error(`[FATAL] text-on-primary (${onPrimary}) is not light on dark primary fill (${primaryInk})! Contrast: ${ratio.toFixed(2)}:1`);
    }
  }

  return colorMap;
}

export function parseTokensFromTs(tokensPath) {
  if (!fs.existsSync(tokensPath)) throw new Error(`tokens.ts not found at: ${tokensPath}`);
  const content = fs.readFileSync(tokensPath, "utf8");
  const sf = ts.createSourceFile(tokensPath, content, ts.ScriptTarget.Latest, true);

  function extractObject(node) {
    const obj = {};
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const name = prop.name.getText(sf).replace(/['"]/g, "");
        if (ts.isStringLiteral(prop.initializer)) {
          obj[name] = prop.initializer.text;
        } else if (ts.isObjectLiteralExpression(prop.initializer)) {
          obj[name] = extractObject(prop.initializer);
        }
      }
    }
    return obj;
  }

  let tokens = null;
  ts.forEachChild(sf, (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name.getText(sf) === "DESIGN_TOKENS" && decl.initializer) {
          let init = decl.initializer;
          if (ts.isAsExpression(init)) init = init.expression;
          if (ts.isObjectLiteralExpression(init)) {
            tokens = extractObject(init);
          }
        }
      }
    }
  });

  if (!tokens || !tokens.colors || !tokens.domains) {
    throw new Error("[FATAL] Could not extract DESIGN_TOKENS from tokens.ts!");
  }
  return tokens;
}

export function resolveColorClass(tokenClass, colorMap, type = "bg") {
  if (!tokenClass) return null;
  const prefix = type === "bg" ? "bg-" : "text-";
  if (!tokenClass.startsWith(prefix)) return null;

  const raw = tokenClass.slice(prefix.length);

  const hexMatch = raw.match(/^\[(#[A-Fa-f0-9]{3,8})\]$/);
  if (hexMatch) return hexMatch[1];

  if (raw.includes("/")) {
    const [baseName, opacity] = raw.split("/");
    return { isTint: true, baseName, opacity: Number(opacity) };
  }

  if (colorMap.has(raw)) {
    return colorMap.get(raw);
  }

  const twColors = {
    "slate-900": "#0f172a",
    "slate-100": "#f1f5f9",
    "white": "#ffffff",
    "black": "#000000",
    "transparent": "transparent",
  };
  if (twColors[raw]) return twColors[raw];

  return null;
}

// Decorative shapes that do not render readable text
const DECORATIVE_PATTERN = /(w-[0-9]|h-[0-9]|w-1\.5|w-2\.5|w-0\.5|w-full h-1|h-full|rounded-full|dotColor)/;

// ============================================================================
// 3. AST JSX Checker
// ============================================================================

export function checkJsxFileAST(filePath, content, colorMap) {
  const violations = [];
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function extractClassVariants(attr) {
    if (!attr || !attr.initializer) return [""];
    if (ts.isStringLiteral(attr.initializer)) return [attr.initializer.text];
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
      const expr = attr.initializer.expression;
      if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
        return [expr.text];
      }
      if (ts.isConditionalExpression(expr)) {
        const trueText = ts.isStringLiteral(expr.whenTrue) ? expr.whenTrue.text : expr.whenTrue.getText(sf);
        const falseText = ts.isStringLiteral(expr.whenFalse) ? expr.whenFalse.text : expr.whenFalse.getText(sf);
        return [trueText, falseText];
      }
      if (ts.isTemplateExpression(expr)) {
        let variants = [expr.head.text];
        for (const span of expr.templateSpans) {
          const subExpr = span.expression;
          const tail = span.literal.text;
          if (ts.isConditionalExpression(subExpr)) {
            const trueText = ts.isStringLiteral(subExpr.whenTrue) ? subExpr.whenTrue.text : subExpr.whenTrue.getText(sf);
            const falseText = ts.isStringLiteral(subExpr.whenFalse) ? subExpr.whenFalse.text : subExpr.whenFalse.getText(sf);
            const nextVariants = [];
            for (const v of variants) {
              nextVariants.push(v + " " + trueText + tail);
              nextVariants.push(v + " " + falseText + tail);
            }
            variants = nextVariants;
          } else {
            const text = ts.isStringLiteral(subExpr) ? subExpr.text : subExpr.getText(sf);
            variants = variants.map(v => v + " " + text + tail);
          }
        }
        return variants;
      }
      return [expr.getText(sf)];
    }
    return [""];
  }

  function hasDirectText(node) {
    if (ts.isJsxElement(node)) {
      return node.children.some(c => ts.isJsxText(c) && c.text.trim().length > 0);
    }
    return false;
  }

  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(sf);
      const isInteractive = tag === "button" || tag === "a" || /role=["']button["']/.test(opening.getText(sf));

      let classVariants = [""];
      let styleAttr = "";
      let hasOnClick = false;
      let isRoleSwitch = false;

      for (const prop of opening.attributes.properties) {
        if (ts.isJsxAttribute(prop)) {
          const name = prop.name.getText(sf);
          if (name === "className") classVariants = extractClassVariants(prop);
          if (name === "style") styleAttr = prop.initializer ? prop.initializer.getText(sf) : "";
          if (name === "onClick" || name === "href") hasOnClick = true;
          if (name === "role" && prop.initializer && prop.initializer.getText(sf).includes("switch")) isRoleSwitch = true;
        }
      }

      for (const classAttr of classVariants) {
        const classes = classAttr.split(/\s+/).filter(Boolean);

        let bgHex = null;
        let textHex = null;
        let hasSolidBg = false;
        let hasGradient = false;
        let gradientHexes = [];

        for (const cls of classes) {
          if (cls.startsWith("bg-gradient-to-") || cls.startsWith("from-") || cls.startsWith("to-")) {
            hasGradient = true;
            const fromMatch = cls.match(/^from-\[(#[A-Fa-f0-9]{3,8})\]$/);
            const toMatch = cls.match(/^to-\[(#[A-Fa-f0-9]{3,8})\]$/);
            if (fromMatch) gradientHexes.push(fromMatch[1]);
            if (toMatch) gradientHexes.push(toMatch[1]);
          }

          if (cls.startsWith("bg-")) {
            const resolved = resolveColorClass(cls, colorMap, "bg");
            if (typeof resolved === "string" && resolved !== "transparent") {
              hasSolidBg = true;
              bgHex = resolved;
            }
          }

          if (cls.startsWith("text-")) {
            const resolved = resolveColorClass(cls, colorMap, "text");
            if (typeof resolved === "string" && resolved !== "transparent") {
              textHex = resolved;
            }
          }
        }

        if (styleAttr && styleAttr.includes("linear-gradient")) {
          hasGradient = true;
          const inlineHexes = styleAttr.match(/#[A-Fa-f0-9]{6}/g);
          if (inlineHexes) gradientHexes.push(...inlineHexes);
        }

        if (styleAttr && styleAttr.includes("backgroundColor")) {
          const inlineBg = styleAttr.match(/backgroundColor\s*:\s*["'](#[A-Fa-f0-9]{3,8})["']/);
          if (inlineBg) {
            hasSolidBg = true;
            bgHex = inlineBg[1];
          }
        }

        const line = sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1;
        const isDecorative = isRoleSwitch ||
                             (DECORATIVE_PATTERN.test(classAttr) && !/(px-|py-|text-)/.test(classAttr)) ||
                             (ts.isJsxSelfClosingElement(node) && !classAttr.includes("text-"));
        const isSolidAccent = classAttr.includes("bg-primary-ink") || classAttr.includes("bg-primary-lime") || classAttr.includes("bg-rank-gold");

        // Rule 1: Solid Fill Contrast Check
        if (hasSolidBg && bgHex && !isDecorative) {
          if (isSolidAccent) {
            if (!textHex && !classAttr.includes("text-transparent")) {
              violations.push({
                file: filePath,
                line,
                issue: `Solid accent background (${bgHex}) without explicit contrasting text color on <${tag}>`,
                snippet: opening.getText(sf).slice(0, 100),
              });
            } else if (textHex) {
              const ratio = contrastRatio(textHex, bgHex);
              if (ratio < MIN_CONTRAST) {
                violations.push({
                  file: filePath,
                  line,
                  issue: `Insufficient contrast (${ratio.toFixed(2)}:1 < 4.5:1) between text ${textHex} and bg ${bgHex} on <${tag}>`,
                  snippet: opening.getText(sf).slice(0, 100),
                });
              }
            }
          } else if (textHex && bgHex) {
            const ratio = contrastRatio(textHex, bgHex);
            if (ratio < MIN_CONTRAST) {
              violations.push({
                file: filePath,
                line,
                issue: `Insufficient contrast (${ratio.toFixed(2)}:1 < 4.5:1) between text ${textHex} and bg ${bgHex} on <${tag}>`,
                snippet: opening.getText(sf).slice(0, 100),
              });
            }
          }
        }

        // Rule 2: Gradient Background Contrast Check
        if (hasGradient && gradientHexes.length > 0 && !isDecorative) {
          if (textHex) {
            for (const endHex of gradientHexes) {
              const ratio = contrastRatio(textHex, endHex);
              if (ratio < MIN_CONTRAST) {
                violations.push({
                  file: filePath,
                  line,
                  issue: `Gradient background end (${endHex}) has insufficient contrast (${ratio.toFixed(2)}:1 < 4.5:1) with text (${textHex})`,
                  snippet: opening.getText(sf).slice(0, 100),
                });
              }
            }
          } else if (hasDirectText(node) || isInteractive) {
            violations.push({
              file: filePath,
              line,
              issue: `Gradient background missing explicit contrasting text color on <${tag}>`,
              snippet: opening.getText(sf).slice(0, 100),
            });
          }
        }

        // Rule 3: Disabled State Check on Solid Fill Interactive Elements
        const hasDisabledOpacity = /\bdisabled:opacity-/.test(classAttr);
        const hasDisabledBg = /\bdisabled:bg-/.test(classAttr);
        const hasDisabledText = /\bdisabled:text-/.test(classAttr);

        if (isSolidAccent && isInteractive && !isDecorative && hasDisabledOpacity && (!hasDisabledBg || !hasDisabledText)) {
          violations.push({
            file: filePath,
            line,
            issue: "disabled:opacity on solid fill button washes out text; must provide disabled:bg-... and disabled:text-...",
            snippet: opening.getText(sf).slice(0, 100),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return violations;
}

// ============================================================================
// 4. Automated Self-Tests Runner
// ============================================================================

export function runSelfTests(colorMap) {
  let passed = 0;
  const total = 6;

  // Fixture 1: White text on yellow badge
  const f1 = `<span className="bg-rank-gold text-white">Gold Record</span>`;
  const v1 = checkJsxFileAST("fixture-1.tsx", f1, colorMap);
  if (v1.length > 0 && v1[0].issue.includes("Insufficient contrast")) {
    passed++;
  } else {
    throw new Error("Self-test 1 (White text on yellow badge) failed to be rejected!");
  }

  // Fixture 2: Primary button with no text color
  const f2 = `<button className="bg-primary-ink px-4 py-2">Save</button>`;
  const v2 = checkJsxFileAST("fixture-2.tsx", f2, colorMap);
  if (v2.length > 0 && v2[0].issue.includes("without explicit contrasting text color")) {
    passed++;
  } else {
    throw new Error("Self-test 2 (Primary button with no text color) failed to be rejected!");
  }

  // Fixture 3: Handler containing => before className
  const f3 = `<button onClick={() => doSomething("val")} className="bg-primary-ink">Click</button>`;
  const v3 = checkJsxFileAST("fixture-3.tsx", f3, colorMap);
  if (v3.length > 0 && v3[0].issue.includes("without explicit contrasting text color")) {
    passed++;
  } else {
    throw new Error("Self-test 3 (Handler with => before className) failed to be rejected!");
  }

  // Fixture 4: Solid chip with wrong text color
  const f4 = `<div className="bg-primary-ink text-on-surface">Badge</div>`;
  const v4 = checkJsxFileAST("fixture-4.tsx", f4, colorMap);
  if (v4.length > 0 && v4[0].issue.includes("Insufficient contrast")) {
    passed++;
  } else {
    throw new Error("Self-test 4 (Solid chip with wrong text color) failed to be rejected!");
  }

  // Fixture 5: Dark text-on-primary on dark fill
  const badColorMap = new Map(colorMap);
  badColorMap.set("on-primary", "#14161a");
  const f5 = `<button className="bg-primary-ink text-on-primary">Save</button>`;
  const v5 = checkJsxFileAST("fixture-5.tsx", f5, badColorMap);
  if (v5.length > 0 && v5[0].issue.includes("Insufficient contrast")) {
    passed++;
  } else {
    throw new Error("Self-test 5 (Dark text-on-primary on dark fill) failed to be rejected!");
  }

  // Fixture 6: Good fixtures
  const f6 = `
    <div>
      <button className="bg-primary-ink text-on-primary px-4 py-2 disabled:bg-surface-container-high disabled:text-text-muted">Save</button>
      <div className="bg-gradient-to-br from-[#2563EB] to-[#4338CA] text-white p-4">Hero</div>
      <span className="bg-[#E6EEFF] text-[#1E3A9E] px-2 py-1">Chip</span>
    </div>
  `;
  const v6 = checkJsxFileAST("fixture-6.tsx", f6, colorMap);
  if (v6.length === 0) {
    passed++;
  } else {
    throw new Error("Self-test 6 (Good fixtures) unexpectedly failed!");
  }

  console.log(`[PASS] Contrast regression self-tests passed (6/6 fixtures verified).`);
}

// ============================================================================
// 5. Main Execution
// ============================================================================

function getAllSourceFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== "node_modules" && f !== ".next" && f !== ".git") getAllSourceFiles(full, list);
    } else if (/\.(tsx|jsx)$/.test(f)) {
      list.push(full);
    }
  }
  return list;
}

try {
  const colorMap = parseThemeTokensFromCss("src/app/globals.css");
  parseTokensFromTs("src/lib/design/tokens.ts");

  runSelfTests(colorMap);

  const files = getAllSourceFiles("src");
  let totalViolations = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const violations = checkJsxFileAST(file, content, colorMap);
    if (violations.length > 0) {
      totalViolations += violations.length;
      for (const v of violations) {
        const rel = path.relative(ROOT, v.file).replace(/\\/g, "/");
        console.error(`  - ${rel}:${v.line} [${v.issue}]`);
        console.error(`    ${v.snippet}\n`);
      }
    }
  }

  if (totalViolations > 0) {
    console.error(`\n❌ CONTRAST REGRESSION FAILURE: ${totalViolations} violation(s) found across codebase!\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ CONTRAST REGRESSION CHECK PASSED: Audited ${files.length} JSX files with 0 violations.\n`);
    process.exit(0);
  }
} catch (err) {
  console.error(`\n❌ CONTRAST SCRIPT FATAL ERROR:`, err.message || err);
  process.exit(1);
}
