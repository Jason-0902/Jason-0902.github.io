import assert from "node:assert/strict";
import { test } from "node:test";
import { renderMarkdown } from "../../scripts/lib/markdown.mjs";
import { describeWriteup, escapeHtml, fillTemplate, parsePage, renderNav, slugify } from "../../scripts/lib/site.mjs";

test("slugify produces stable ASCII slugs and rejects empty input", () => {
  assert.equal(slugify("Magic Numbers(C)_ch"), "magic-numbers-c-ch");
  assert.equal(slugify("Reverse Engineering"), "reverse-engineering");
  assert.throws(() => slugify("中文"), /Cannot build a slug/);
});

test("fillTemplate fails on unknown placeholders instead of shipping {{raw}} text", () => {
  assert.equal(fillTemplate("<p>{{a}}</p>", { a: "x" }), "<p>x</p>");
  assert.throws(() => fillTemplate("{{missing}}", {}), /missing/);
});

test("parsePage requires title and description", () => {
  const page = parsePage('<!--meta {"title":"T","description":"D"} -->\n<p>body</p>');
  assert.equal(page.meta.title, "T");
  assert.equal(page.body, "<p>body</p>");
  assert.throws(() => parsePage('<!--meta {"title":"T"} -->'), /description is required/);
  assert.throws(() => parsePage("<p>no meta</p>"), /missing/);
});

test("renderNav marks exactly the active page", () => {
  const nav = renderNav("projects");
  assert.equal(nav.match(/aria-current="page"/g).length, 1);
  assert.match(nav, /href="\/projects\/" aria-current="page"/);
});

test("escapeHtml escapes all HTML metacharacters", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("describeWriteup labels Chinese writeups", () => {
  assert.deepEqual(describeWriteup("SQLi3_chinese", "# SQLi3\n\n題目目標：這是中文的內容說明"), {
    title: "SQLi 3 (Chinese)",
    lang: "zh-Hant",
  });
  assert.deepEqual(describeWriteup("SQLi4_english", "# SQLi4\n\nEnglish text"), { title: "SQLi 4", lang: "en" });
});

test("renderMarkdown strips script, event handlers and javascript: URLs (XSS regression)", () => {
  const html = renderMarkdown(
    [
      "# Title",
      "<script>alert(1)</script>",
      '<img src="x.png" onerror="alert(1)">',
      "[click](javascript:alert(1))",
      '<a href="https://example.com" onclick="alert(1)">ok</a>',
      "<iframe src=https://evil.example></iframe>",
    ].join("\n\n"),
    "web-security",
  );
  assert.doesNotMatch(html, /<script|onerror|onclick|javascript:|<iframe/i);
  assert.match(html, /href="https:\/\/example.com"/);
});

test("renderMarkdown drops the leading title, rewrites relative images and keeps code language", () => {
  const html = renderMarkdown("# SQLi 1\n\n![alt text](image-2.png)\n\n```python\nprint(1)\n```\n", "web-security");
  assert.doesNotMatch(html, /SQLi 1/);
  assert.match(html, /src="\/blog\/web-security\/image-2.png"/);
  assert.match(html, /alt="Screenshot from the challenge"/);
  assert.match(html, /class="language-python"/);
});
