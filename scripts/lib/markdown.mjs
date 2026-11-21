// Markdown -> sanitized HTML for writeups. Kept separate from the build so it can be unit tested.
import path from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { slugify } from "./site.mjs";

export function slugifyFile(name) {
  const ext = path.extname(name).toLowerCase();
  return slugify(path.basename(name, path.extname(name))) + ext;
}

export function renderMarkdown(markdown, categorySlug) {
  // The page provides the <h1>; drop the writeup's own leading title and demote remaining h1s.
  const body = markdown.replace(/^\uFEFF?\s*#\s+[^\n]*\n/, "");
  const rawHtml = marked.parse(body, { gfm: true, async: false });
  return sanitizeHtml(rawHtml, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2", "del", "details", "summary"],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title"],
      code: ["class"],
      th: ["class"],
      td: ["class"],
    },
    allowedClasses: {
      code: [/^language-[\w+-]+$/],
      th: ["align-left", "align-center", "align-right"],
      td: ["align-left", "align-center", "align-right"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      h1: "h2",
      // `align` is obsolete HTML; keep the alignment as a class instead.
      th: alignToClass,
      td: alignToClass,
      img: (tagName, attribs) => {
        const src = attribs.src ?? "";
        const isRelative = src && !/^[a-z]+:/i.test(src) && !src.startsWith("/");
        return {
          tagName,
          attribs: {
            ...attribs,
            alt: attribs.alt && attribs.alt !== "alt text" ? attribs.alt : "Screenshot from the challenge",
            src: isRelative ? `/blog/${categorySlug}/${slugifyFile(decodeURI(src))}` : src,
          },
        };
      },
    },
  });
}

export function alignToClass(tagName, attribs) {
  const { align, ...rest } = attribs;
  return { tagName, attribs: align ? { ...rest, class: `align-${align}` } : rest };
}
