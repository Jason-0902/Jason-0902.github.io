import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "check-links.mjs");

function run(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "links-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), content);
    }
    return spawnSync(process.execPath, [script], { env: { ...process.env, SITE_DIR: dir }, encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("link checker passes valid internal links and anchors", () => {
  const result = run({
    "index.html": '<a href="/about/">a</a><a href="/about/#team">t</a><img src="/img/x.png" alt="">',
    "about/index.html": '<h2 id="team">Team</h2>',
    "img/x.png": "png",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("link checker fails on a broken page, image and anchor", () => {
  const result = run({
    "index.html": '<a href="/missing/">m</a><img src="/nope.png" alt=""><a href="/#nowhere">n</a>',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /broken link \/missing\//);
  assert.match(result.stderr, /broken link \/nope.png/);
  assert.match(result.stderr, /missing anchor \/#nowhere/);
});

test("absolute links to the site itself are checked against the build", () => {
  const ok = run({ "index.html": '<link rel="canonical" href="https://jason-0902.github.io/">' });
  assert.equal(ok.status, 0, ok.stderr);
  const broken = run({ "index.html": '<a href="https://jason-0902.github.io/gone/">x</a>' });
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /broken link https:\/\/jason-0902.github.io\/gone\//);
});
