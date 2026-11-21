// Pure helpers shared by the build script and unit tests. No file system access here.

export const SITE_URL = "https://jason-0902.github.io";

export const NAV_ITEMS = [
  { id: "home", href: "/", label: "Home" },
  { id: "research", href: "/research/", label: "Research" },
  { id: "projects", href: "/projects/", label: "Projects" },
  { id: "blog", href: "/blog/", label: "Blog" },
  { id: "cv", href: "/cv/", label: "CV" },
];

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Lowercase, ASCII-only, hyphen-separated slug. Throws on empty results so bad input fails the build. */
export function slugify(value) {
  const slug = String(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`Cannot build a slug from "${value}"`);
  return slug;
}

const META_PATTERN = /^\s*<!--meta\s+([\s\S]*?)-->\s*/;

/** Split a page source into its JSON front matter and HTML body. */
export function parsePage(source, fileName = "page") {
  const match = source.match(META_PATTERN);
  if (!match) throw new Error(`${fileName}: missing <!--meta {...} --> header`);
  let meta;
  try {
    meta = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`${fileName}: invalid meta JSON (${error.message})`, { cause: error });
  }
  for (const key of ["title", "description"]) {
    if (typeof meta[key] !== "string" || !meta[key].trim()) {
      throw new Error(`${fileName}: meta.${key} is required`);
    }
  }
  return { meta, body: source.slice(match[0].length) };
}

export function renderNav(activeId) {
  return NAV_ITEMS.map(({ id, href, label }) => {
    const current = id === activeId ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}>${label}</a>`;
  }).join("\n          ");
}

/** Fill {{placeholders}}. Unknown placeholders are a build error, never silently left in output. */
export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Template placeholder {{${key}}} has no value`);
    return values[key];
  });
}

/** True when text is mostly CJK, used to set lang="zh-Hant" on Chinese writeups. */
export function isMostlyChinese(text) {
  const letters = text.replace(/```[\s\S]*?```/g, "").match(/[A-Za-z一-鿿]/g) ?? [];
  if (!letters.length) return false;
  const cjk = letters.filter((char) => /[一-鿿]/.test(char)).length;
  return cjk / letters.length > 0.3;
}

/** "Magic Numbers(C)_ch" -> { title: "Magic Numbers (C)", lang: "zh-Hant" } */
export function describeWriteup(fileStem, text) {
  let title = fileStem
    .replace(/_(ch|chinese)$/i, " (Chinese)")
    .replace(/_english$/i, "")
    .replace(/(\S)\(/g, "$1 (")
    .replace(/(SQLi|CMDi)(\d)/, "$1 $2")
    .trim();
  const lang = isMostlyChinese(text) ? "zh-Hant" : "en";
  if (lang === "zh-Hant" && !title.endsWith("(Chinese)")) title += " (Chinese)";
  return { title, lang };
}

/** Natural sort so "SQLi 10" follows "SQLi 9". */
export function naturalCompare(a, b) {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}
