import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateProjects } from "../../scripts/lib/site.mjs";
import { buildTree, folderFor, groupChallenges, splitVariant } from "../../scripts/lib/writeups.mjs";

const config = JSON.parse(readFileSync(new URL("../../src/data/blog-folders.json", import.meta.url), "utf8"));

test("security writeup folders are filed under Security, anything else under the fallback", () => {
  for (const name of ["Reverse Engineering", "Web Security", "Binary Exploitation", "Cryptography", "Pwn"]) {
    assert.equal(folderFor(name, config), "Security", name);
  }
  assert.equal(folderFor("Linux Basics", config), config.fallback);
});

test("splitVariant separates the challenge from its language or variant", () => {
  assert.deepEqual(splitVariant("A Basic cIMG (C)"), { base: "A Basic cIMG", variant: "C" });
  assert.deepEqual(splitVariant("Magic Numbers (C) (Chinese)"), { base: "Magic Numbers", variant: "C · Chinese" });
  assert.deepEqual(splitVariant("SQLi 1"), { base: "SQLi 1", variant: "" });
});

test("groupChallenges puts variants of one challenge together and labels unmarked ones by language", () => {
  const posts = [
    { title: "SQLi 3 (Chinese)", lang: "zh-Hant" },
    { title: "SQLi 3", lang: "en" },
    { title: "SQLi 10", lang: "en" },
    { title: "SQLi 2", lang: "en" },
  ];
  const groups = groupChallenges(posts);
  assert.deepEqual(
    groups.map((group) => group.title),
    ["SQLi 2", "SQLi 3", "SQLi 10"],
  );
  assert.deepEqual(
    groups[1].items.map((item) => item.variant),
    ["Chinese", "English"],
  );
});

test("buildTree nests folder > category > challenge and counts every writeup", () => {
  const posts = [
    { title: "A (C)", category: "Reverse Engineering", lang: "en" },
    { title: "A (x86)", category: "Reverse Engineering", lang: "en" },
    { title: "SQLi 1", category: "Web Security", lang: "en" },
    { title: "Shell basics", category: "Linux Basics", lang: "en" },
  ];
  const tree = buildTree(posts, config);
  assert.deepEqual(
    tree.map((folder) => [folder.name, folder.count]),
    [
      ["Security", 3],
      [config.fallback, 1],
    ],
  );
  assert.deepEqual(
    tree[0].categories.map((category) => category.name),
    ["Reverse Engineering", "Web Security"],
  );
  assert.equal(tree[0].categories[0].challenges[0].items.length, 2);
});

test("only projects with a public GitHub repository can be listed", () => {
  const projects = JSON.parse(readFileSync(new URL("../../src/data/projects.json", import.meta.url), "utf8"));
  assert.doesNotThrow(() => validateProjects(projects));
  assert.throws(() => validateProjects([{ slug: "secret", repo: null }]), /public repository/);
  assert.throws(() => validateProjects([{ slug: "elsewhere", repo: "https://example.com/x" }]), /public repository/);
});
