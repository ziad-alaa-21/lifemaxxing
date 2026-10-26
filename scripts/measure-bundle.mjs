#!/usr/bin/env node
/**
 * Measures the client bundle produced by `next build` (Turbopack does not print
 * per-route sizes). Reports raw and gzip bytes for JS and CSS in .next/static,
 * and optionally compares against a saved baseline JSON.
 *
 * Usage:
 *   node scripts/measure-bundle.mjs                      # print
 *   node scripts/measure-bundle.mjs --save <file.json>   # print + save
 *   node scripts/measure-bundle.mjs --compare <file.json># print + diff (flags >10%)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const STATIC_DIR = path.join(ROOT, ".next", "static");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function measure() {
  const totals = {
    js: { files: 0, raw: 0, gzip: 0 },
    css: { files: 0, raw: 0, gzip: 0 },
    fonts: { files: 0, raw: 0 },
  };
  for (const file of walk(STATIC_DIR)) {
    const ext = path.extname(file).toLowerCase();
    const buf = fs.readFileSync(file);
    if (ext === ".js") {
      totals.js.files++;
      totals.js.raw += buf.length;
      totals.js.gzip += zlib.gzipSync(buf).length;
    } else if (ext === ".css") {
      totals.css.files++;
      totals.css.raw += buf.length;
      totals.css.gzip += zlib.gzipSync(buf).length;
    } else if ([".woff", ".woff2", ".ttf", ".otf"].includes(ext)) {
      totals.fonts.files++;
      totals.fonts.raw += buf.length;
    }
  }
  return totals;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const args = process.argv.slice(2);
const result = measure();

if (result.js.files === 0) {
  console.error("No .next/static output found. Run `next build` first.");
  process.exit(1);
}

console.log("Client bundle (.next/static):");
console.log(`  JS    ${result.js.files} files  raw ${kb(result.js.raw)}  gzip ${kb(result.js.gzip)}`);
console.log(`  CSS   ${result.css.files} files  raw ${kb(result.css.raw)}  gzip ${kb(result.css.gzip)}`);
console.log(`  Fonts ${result.fonts.files} files  raw ${kb(result.fonts.raw)}`);

const saveIdx = args.indexOf("--save");
if (saveIdx !== -1 && args[saveIdx + 1]) {
  fs.mkdirSync(path.dirname(args[saveIdx + 1]), { recursive: true });
  fs.writeFileSync(args[saveIdx + 1], JSON.stringify(result, null, 2));
  console.log(`Saved to ${args[saveIdx + 1]}`);
}

const cmpIdx = args.indexOf("--compare");
if (cmpIdx !== -1 && args[cmpIdx + 1]) {
  const base = JSON.parse(fs.readFileSync(args[cmpIdx + 1], "utf8"));
  let flagged = false;
  console.log("Change vs baseline:");
  for (const [k, field] of [["js", "gzip"], ["css", "gzip"], ["fonts", "raw"]]) {
    const before = base[k][field];
    const after = result[k][field];
    const pct = before === 0 ? 0 : ((after - before) / before) * 100;
    const flag = pct > 10 ? "  <-- OVER 10%" : "";
    if (pct > 10) flagged = true;
    console.log(`  ${k.padEnd(5)} ${field}: ${kb(before)} -> ${kb(after)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)${flag}`);
  }
  if (flagged) console.log("FLAG: at least one bundle category grew by more than 10%.");
}
