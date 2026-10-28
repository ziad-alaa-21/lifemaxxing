#!/usr/bin/env node
/**
 * Self-test for scripts/check-logic-intact.mjs.
 * Proves that:
 * 1. JSX structure, layout wrappers, and text changes PASS freely.
 * 2. Changing a mutation FAILS.
 * 3. Changing a calculation FAILS.
 * 4. Changing a query filter FAILS.
 * 5. Removing or altering a handler FAILS.
 * 6. Editing a hard-protected file FAILS.
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";

const cases = [
  {
    name: "JSX structure and text changes pass freely",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) =>
      s
        .replace(
          '<div className="stitch-card p-5 space-y-4">',
          '<section className="stitch-card p-6 space-y-6"><header><h2>New Reading Layout</h2></header>'
        )
        .replace('</div>\n  );\n}', '</section>\n  );\n}'),
    expect: 0,
  },
  {
    name: "changing a mutation fails",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace(".insert([payload])", ".insert([])"),
    expect: 1,
  },
  {
    name: "changing a calculation fails",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace("acc + l.pages_read", "acc + l.pages_read + 1"),
    expect: 1,
  },
  {
    name: "changing a query filter fails",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace('.eq("logged_date", selectedDate)', '.eq("logged_date", "2026-01-01")'),
    expect: 1,
  },
  {
    name: "removing or altering a handler fails",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace("const handleSaveLog = async () => {", "const handleSaveLog = () => {}; const _old = async () => {"),
    expect: 1,
  },
  {
    name: "editing a hard-protected file fails",
    file: "src/lib/authConfig.ts",
    mutate: (s) => s + "\n// unauthorized edit\n",
    expect: 1,
  },
  {
    name: "orphaning a handler from JSX render tree fails",
    file: "src/components/mind/ReadingCard.tsx",
    mutate: (s) => s.replace("onClick={handleSaveLog}", 'onClick={() => {}}'),
    expect: 1,
  },
];

function run() {
  const r = spawnSync(process.execPath, ["scripts/check-logic-intact.mjs"], { encoding: "utf8" });
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
    const ok = status === c.expect;
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

console.log(failed ? `\n${failed} self-test case(s) failed` : "\nAll logic-intact self-test cases passed");
process.exit(failed ? 1 : 0);
