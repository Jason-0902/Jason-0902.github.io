// Guards against overstated claims in site copy (see README "Content rules").
// Scope: src/ only. Writeups in content/ are quoted challenge material and are not checked.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const files = readdirSync(srcDir, { recursive: true })
  .map((name) => path.join(srcDir, name))
  .filter((file) => /\.(html|json)$/.test(file));

const FORBIDDEN = [
  { pattern: /\bexpert\b/i, why: "skill level claims need evidence" },
  { pattern: /\bdiscovered\b|\bzero-day\b|\bCVE-\d{4}-\d+/i, why: "no vulnerabilities were reported by this research" },
  { pattern: /\bfully reproduced\b|\bsuccessfully reproduced\b/i, why: "DriveFuzz results were not fully reproduced" },
  { pattern: /(?<!not )\bproduction-ready\b/i, why: "no project is production-ready" },
  { pattern: /(?<!not )(?<!not a )\b(audited|fully autonomous)\b/i, why: "no audit, no autonomous deployment" },
  {
    pattern: /B\.?S\.? in Computer Science and Information Engineering/i,
    why: "degree is Information and Computer Engineering",
  },
];

test("site copy contains no overstated claims", () => {
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const { pattern, why } of FORBIDDEN) {
      const match = text.match(pattern);
      if (match) hits.push(`${path.relative(srcDir, file)}: "${match[0]}" (${why})`);
    }
  }
  assert.deepEqual(hits, []);
});

test("Yuan Ze University is never presented as a completed degree", () => {
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/Yuan Ze University[\s\S]{0,300}/g)) {
      assert.doesNotMatch(match[0].split("</article>")[0], /Bachelor|B\.S\.|degree in/i, file);
    }
  }
});
