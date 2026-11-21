// Builds the static site into _site/. Run with `npm run build`.
// Inputs: src/layout.html, src/pages/**, src/data/projects.json, static/**, content/pwn-college-writeup (git submodule).
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown, slugifyFile } from "./lib/markdown.mjs";
import {
  SITE_URL,
  describeWriteup,
  escapeHtml,
  fillTemplate,
  naturalCompare,
  parsePage,
  renderNav,
  slugify,
} from "./lib/site.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "_site");
const writeupsDir = path.join(root, "content", "pwn-college-writeup");
const writeupsRepo = "https://github.com/Jason-0902/Pwn-college-writeup";
const writeupCategories = ["Reverse Engineering", "Web Security"];

const urls = [];

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(path.join(root, "static"), outDir, { recursive: true });

  const layout = await readFile(path.join(root, "src", "layout.html"), "utf8");
  const assets = {
    cssHref: await hashedHref("css/style.css"),
    jsHref: await hashedHref("js/main.js"),
  };
  const render = (meta, content, urlPath) => {
    if (meta.noindex !== true) urls.push(urlPath);
    return fillTemplate(layout, {
      lang: meta.lang ?? "en",
      title: escapeHtml(meta.title),
      description: escapeHtml(meta.description),
      canonical: SITE_URL + urlPath,
      ogType: meta.ogType ?? "website",
      nav: renderNav(meta.nav),
      year: String(new Date().getUTCFullYear()),
      content,
      ...assets,
    });
  };

  const projects = JSON.parse(await readFile(path.join(root, "src", "data", "projects.json"), "utf8"));
  const writeups = await loadWriteups();
  const slots = {
    projectCards: projects.map(projectCard).join("\n"),
    blogIndex: blogIndex(writeups),
  };

  for (const file of await listFiles(path.join(root, "src", "pages"))) {
    const relative = path.relative(path.join(root, "src", "pages"), file);
    const { meta, body } = parsePage(await readFile(file, "utf8"), relative);
    const urlPath = "/" + relative.replace(/\\/g, "/").replace(/index\.html$/, "");
    await writePage(relative, render(meta, fillTemplate(body, slots), urlPath));
  }

  for (const project of projects) {
    const meta = {
      title: `${project.name} | Projects | Jason Liu`,
      description: project.summary,
      nav: "projects",
    };
    await writePage(
      `projects/${project.slug}/index.html`,
      render(meta, projectPage(project), `/projects/${project.slug}/`),
    );
  }

  for (const post of writeups) {
    const meta = {
      title: `${post.title} | ${post.category} | Jason Liu`,
      description: `pwn.college ${post.category} writeup: ${post.title}.`,
      nav: "blog",
      ogType: "article",
    };
    await writePage(post.outFile, render(meta, postPage(post), post.url));
  }

  await writeFile(path.join(outDir, "sitemap.xml"), sitemap(urls));
  await writeFile(path.join(outDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  await writeFile(path.join(outDir, ".nojekyll"), "");
  console.log(`Built ${urls.length} indexed pages (${writeups.length} writeups) into _site/`);
}

async function hashedHref(relative) {
  const content = await readFile(path.join(root, "static", relative));
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 10);
  return `/${relative}?v=${hash}`;
}

async function writePage(relative, html) {
  const target = path.join(outDir, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(full) : [full];
    }),
  );
  return nested.flat().sort();
}

function chips(items) {
  if (!items.length) return "";
  return `<ul class="chips">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function projectLinks(project) {
  const links = [`<a href="/projects/${project.slug}/">Details</a>`];
  if (project.repo) links.push(`<a href="${escapeHtml(project.repo)}">Repository</a>`);
  return links.join("");
}

// Status is only shown when it is known; never invent one.
function statusLine(project) {
  return project.status ? `<p class="status">Status: ${escapeHtml(project.status)}</p>` : "";
}

function projectCard(project) {
  return `  <article class="card project-card">
    <p class="card-kicker">${escapeHtml(project.category)}</p>
    <h2><a href="/projects/${project.slug}/">${escapeHtml(project.name)}</a></h2>
    ${statusLine(project)}
    <p>${escapeHtml(project.summary)}</p>
    ${chips(project.tech)}
    <p class="card-links">${projectLinks(project)}</p>
  </article>`;
}

function projectPage(project) {
  const links = [];
  if (project.repo) links.push(`<a class="button primary" href="${escapeHtml(project.repo)}">View repository</a>`);
  if (project.extraLink) {
    links.push(
      `<a class="button" href="${escapeHtml(project.extraLink.href)}">${escapeHtml(project.extraLink.label)}</a>`,
    );
  }
  if (!project.repo) links.push(`<p class="muted">The repository is not public yet.</p>`);
  const tech = project.tech.length
    ? `<section class="section" aria-labelledby="tech-title"><h2 id="tech-title">Technologies</h2>${chips(project.tech)}</section>`
    : "";
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/projects/">Projects</a> / <span>${escapeHtml(project.name)}</span></nav>
<header class="page-header">
  <p class="eyebrow">${escapeHtml(project.category)}</p>
  <h1>${escapeHtml(project.name)}</h1>
  <p class="lead">${escapeHtml(project.summary)}</p>
  ${statusLine(project)}
</header>
<section class="section prose" aria-labelledby="about-title">
  <h2 id="about-title">About</h2>
  ${project.details.map((text) => `<p>${escapeHtml(text)}</p>`).join("\n  ")}
</section>
<section class="section" aria-labelledby="focus-title">
  <h2 id="focus-title">Focus</h2>
  <ul class="list">${project.focus.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
</section>
${tech}
<div class="actions">${links.join("")}</div>`;
}

async function loadWriteups() {
  try {
    await stat(path.join(writeupsDir, "README.md"));
  } catch {
    throw new Error(
      "Writeups submodule is missing. Run `git submodule update --init` (CI: actions/checkout with submodules: true).",
    );
  }

  const posts = [];
  for (const category of writeupCategories) {
    const categorySlug = slugify(category);
    const dir = path.join(writeupsDir, category);
    const names = (await readdir(dir)).sort(naturalCompare);
    for (const name of names) {
      const source = path.join(dir, name);
      if (!name.endsWith(".md")) {
        if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
          await mkdir(path.join(outDir, "blog", categorySlug), { recursive: true });
          await cp(source, path.join(outDir, "blog", categorySlug, slugifyFile(name)));
        }
        continue;
      }
      const markdown = await readFile(source, "utf8");
      const stem = name.replace(/\.md$/, "");
      const { title, lang } = describeWriteup(stem, markdown);
      const slug = slugify(stem);
      if (posts.some((post) => post.categorySlug === categorySlug && post.slug === slug)) {
        throw new Error(`Two writeups in "${category}" map to the same URL slug "${slug}". Rename one of them.`);
      }
      posts.push({
        title,
        lang,
        category,
        categorySlug,
        slug,
        url: `/blog/${categorySlug}/${slug}/`,
        outFile: `blog/${categorySlug}/${slug}/index.html`,
        sourceUrl: `${writeupsRepo}/blob/main/${encodeURI(category)}/${encodeURI(name)}`,
        html: renderMarkdown(markdown, categorySlug),
      });
    }
  }
  return posts;
}

function blogIndex(posts) {
  return writeupCategories
    .map((category) => {
      const items = posts.filter((post) => post.category === category);
      const id = `${slugify(category)}-title`;
      const list = items.map((post) => `<li><a href="${post.url}">${escapeHtml(post.title)}</a></li>`).join("\n    ");
      return `<section class="section" aria-labelledby="${id}">
  <h2 id="${id}">${escapeHtml(category)} <span class="count">${items.length}</span></h2>
  <ul class="post-list">
    ${list}
  </ul>
</section>`;
    })
    .join("\n");
}

function postPage(post) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/blog/">Blog</a> / <span>${escapeHtml(post.category)}</span></nav>
<article class="post"${post.lang === "en" ? "" : ` lang="${post.lang}"`}>
  <header class="page-header">
    <p class="eyebrow">pwn.college &middot; ${escapeHtml(post.category)}</p>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="meta-line"><a href="${escapeHtml(post.sourceUrl)}">View source on GitHub</a></p>
  </header>
  <div class="prose">
${post.html}
  </div>
</article>`;
}

function sitemap(paths) {
  const entries = paths.map((urlPath) => `  <url><loc>${SITE_URL}${escapeHtml(urlPath)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

main().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
