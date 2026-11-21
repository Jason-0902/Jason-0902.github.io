// Pure helpers that turn the writeup repository's folders into the Blog's folder tree. No file system access.
import { naturalCompare } from "./site.mjs";

/**
 * Pick the top-level Blog folder for a writeup category (a folder in the writeup repository).
 * Rules come from src/data/blog-folders.json; the first rule whose pattern matches wins, otherwise "fallback".
 */
export function folderFor(category, config) {
  const rule = config.folders.find((folder) => new RegExp(folder.match, "i").test(category));
  return rule ? rule.name : config.fallback;
}

/** "Magic Numbers (C) (Chinese)" -> { base: "Magic Numbers", variant: "C · Chinese" } */
export function splitVariant(title) {
  const parts = [];
  let base = title.trim();
  for (let match = base.match(/\s*\(([^()]+)\)$/); match; match = base.match(/\s*\(([^()]+)\)$/)) {
    parts.unshift(match[1].trim());
    base = base.slice(0, match.index).trim();
  }
  return { base: base || title, variant: parts.join(" · ") };
}

/** Group posts of one category by challenge, so "X (C)", "X (Python)" and "X (x86)" sit in one folder. */
export function groupChallenges(posts) {
  const groups = new Map();
  for (const post of posts) {
    const { base, variant } = splitVariant(post.title);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push({ ...post, variant });
  }
  return [...groups.entries()]
    .sort(([a], [b]) => naturalCompare(a, b))
    .map(([title, items]) => ({
      title,
      items: items
        .map((item) => ({ ...item, variant: item.variant || (item.lang === "en" ? "English" : "Chinese") }))
        .sort((a, b) => naturalCompare(a.variant, b.variant)),
    }));
}

/** Build folder -> category -> challenge tree. Folder order follows the config, then the fallback folder. */
export function buildTree(posts, config) {
  const order = [...config.folders.map((folder) => folder.name), config.fallback];
  const folders = new Map(order.map((name) => [name, new Map()]));
  for (const post of posts) {
    const categories = folders.get(folderFor(post.category, config));
    if (!categories.has(post.category)) categories.set(post.category, []);
    categories.get(post.category).push(post);
  }
  return [...folders.entries()]
    .filter(([, categories]) => categories.size)
    .map(([name, categories]) => ({
      name,
      count: [...categories.values()].reduce((sum, list) => sum + list.length, 0),
      categories: [...categories.entries()]
        .sort(([a], [b]) => naturalCompare(a, b))
        .map(([category, list]) => ({ name: category, count: list.length, challenges: groupChallenges(list) })),
    }));
}
