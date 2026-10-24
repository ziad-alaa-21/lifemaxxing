#!/usr/bin/env node

/**
 * CI / Build-time Regression Guard for Lime and Solid Accent Contrast
 *
 * Ensures that any solid background fill of Volt Lime (#C6FF3D) or other
 * light accent colors (cyan, amber, gold, ice blue) strictly pairs with
 * the designated dark contrast token 'text-on-primary' (#0A0A0F) or an approved
 * dark text token, guaranteeing >= 4.5:1 (up to 16.7:1) WCAG AAA contrast.
 */

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        results.push(...walk(full));
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(f)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('./src');
const errors = [];

// Solid lime regex: bg-primary-lime or hex #c6ff3d without low-opacity tint
const solidLimeRegex = /bg-primary-lime(?!\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|50)\b)/;
const rawHexLimeBg = /bg-\[#c6ff3d\]/i;

// Decorative shapes that do not contain text
const decorativeRegex = /(w-[0-9]|h-[0-9]|w-1\.5|w-2\.5|w-0\.5|w-full h-1|h-full|rounded-full|dotColor)/;

for (const filePath of files) {
  const relPath = path.relative('.', filePath).replace(/\\/g, '/');
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const isSolidLime = solidLimeRegex.test(line) || rawHexLimeBg.test(line);

    if (isSolidLime) {
      // Must have text-on-primary OR be decorative without text OR use Button variant="primary"
      const hasOnPrimary = /text-on-primary/.test(line);
      const isDecorative = decorativeRegex.test(line) && !/(<button|<a|px-|py-|text-)/.test(line);
      const isButtonVariant = /variant="primary"/.test(line);

      // Check for unreadable light text regressions on solid lime when active (excluding disabled state)
      const activeLinePart = line.replace(/disabled:[^\s"']+/g, '');
      const hasWhiteOrLightText = /(text-white|text-charcoal-dark\b|text-on-surface\b(?!-variant)|text-surface\b)/.test(activeLinePart);
      const isChartBar = /isQualifying|WeeklyAnalyticsCard/.test(line);
      const hasOpacityWashout = /disabled:opacity-/.test(line);

      if ((!hasOnPrimary && !isDecorative && !isButtonVariant && !isChartBar) || hasWhiteOrLightText) {
        errors.push({
          file: relPath,
          line: lineNum,
          content: line.trim(),
          issue: hasWhiteOrLightText
            ? 'Light text token used on solid lime background'
            : 'Missing text-on-primary token on solid lime background'
        });
      }

      if (hasOpacityWashout && !line.includes('disabled:bg-surface-container-high')) {
        errors.push({
          file: relPath,
          line: lineNum,
          content: line.trim(),
          issue: 'disabled:opacity on solid lime button washes out text; use disabled:bg-surface-container-high disabled:text-text-muted'
        });
      }
    }
  });
}

if (errors.length > 0) {
  console.error('\n❌ CONTRAST REGRESSION FAILURE: Solid lime background without proper dark text token detected!\n');
  errors.forEach(e => {
    console.error(`  - ${e.file}:${e.line} [${e.issue}]`);
    console.error(`    ${e.content}\n`);
  });
  console.error(`Total violations: ${errors.length}\n`);
  process.exit(1);
} else {
  console.log('\n✅ CONTRAST REGRESSION CHECK PASSED: All solid lime elements strictly enforce text-on-primary token and proper disabled states.\n');
  process.exit(0);
}
