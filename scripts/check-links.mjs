// Link checker for the built site. Zero dependencies.
//   node scripts/check-links.mjs             internal links, images, and #fragments (deterministic, always strict)
//   node scripts/check-links.mjs --external  also checks external URLs, with retries
// External policy: 404/410 fail the check. Network errors, timeouts, 403/429/5xx after all retries are reported
// as warnings, because they are usually caused by bot blocking or CI network limits rather than a broken link.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  process.env.SITE_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "_site"),
);
const checkExternal = process.argv.includes("--external");
const SITE_ORIGIN = "https://jason-0902.github.io";
const RETRIES = 3;
const TIMEOUT_MS = 15000;
// Hosts that reject automated requests outright; still listed in the report but never fetched.
const SKIP_HOSTS = new Set(["www.linkedin.com"]);

async function listHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listHtml(full);
      return entry.name.endsWith(".html") ? [full] : [];
    }),
  );
  return nested.flat();
}

function urlPathOf(file) {
  return (
    "/" +
    path
      .relative(root, file)
      .split(path.sep)
      .join("/")
      .replace(/index\.html$/, "")
  );
}

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function targetFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = path.join(root, decoded);
  if (decoded.endsWith("/")) return path.join(candidate, "index.html");
  if (await exists(candidate)) return candidate;
  return path.join(candidate, "index.html");
}

const idCache = new Map();
async function idsIn(file) {
  if (!idCache.has(file)) {
    const html = await readFile(file, "utf8");
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])));
  }
  return idCache.get(file);
}

async function fetchWithRetry(url) {
  let last = "";
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (response.status === 405 || response.status === 403) {
        response = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
      }
      if (response.ok) return { ok: true };
      if (response.status === 404 || response.status === 410)
        return { ok: false, hard: true, reason: `HTTP ${response.status}` };
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.cause?.code ?? error.name ?? String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
  }
  return { ok: false, hard: false, reason: `${last} after ${RETRIES} attempts` };
}

const errors = [];
const warnings = [];
const external = new Map();
const files = await listHtml(root);

for (const file of files) {
  const html = await readFile(file, "utf8");
  const page = urlPathOf(file);
  const base = new URL(page, "https://site.invalid");
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const value = raw.replaceAll("&amp;", "&");
    if (!value) {
      errors.push(`${page}: empty ${attr}`);
      continue;
    }
    if (/^(mailto|tel|data):/i.test(value)) continue;
    let url = new URL(value, base);
    // Absolute links to the site itself (canonical, og:url) are checked against the build, not the network.
    if (url.origin === SITE_ORIGIN) url = new URL(url.pathname + url.search + url.hash, base);
    if (url.origin !== base.origin) {
      if (!/^https?:$/.test(url.protocol)) {
        errors.push(`${page}: unsupported scheme in ${value}`);
        continue;
      }
      const key = url.href.replace(/#.*$/, "");
      if (!external.has(key)) external.set(key, new Set());
      external.get(key).add(page);
      continue;
    }
    const target = await targetFile(url.pathname);
    if (!(await exists(target))) {
      errors.push(`${page}: broken link ${value}`);
      continue;
    }
    if (url.hash && target.endsWith(".html")) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!(await idsIn(target)).has(id)) errors.push(`${page}: missing anchor ${value}`);
    }
  }
}

if (checkExternal) {
  const queue = [...external.keys()];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const pages = [...external.get(url)].slice(0, 3).join(", ");
      if (SKIP_HOSTS.has(new URL(url).hostname)) {
        warnings.push(`skipped ${url} (host blocks automated checks) on ${pages}`);
        continue;
      }
      const result = await fetchWithRetry(url);
      if (result.ok) continue;
      const line = `${url}: ${result.reason} (linked from ${pages})`;
      (result.hard ? errors : warnings).push(line);
    }
  });
  await Promise.all(workers);
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`\n${errors.length} broken link(s). Fix the href/src in src/ or the writeup source, then rebuild.`);
  process.exitCode = 1;
} else {
  const scope = checkExternal ? `${external.size} external URLs and internal links` : "internal links";
  console.log(`Link check passed: ${scope} across ${files.length} pages (${warnings.length} warnings).`);
}
