# Jason Liu: personal site

Source for <https://jason-0902.github.io>, the portfolio of Tsung-Yen (Jason) Liu. It is a static site: a small Node
build script turns the files in `src/` into plain HTML in `_site/`, and GitHub Actions deploys `_site/` to GitHub Pages.
Nothing runs on a server and no third-party scripts, fonts or APIs are loaded by visitors.

## Layout

```text
src/layout.html            Shared page shell (head, header, footer)
src/pages/**.html          One file per page. Starts with <!--meta {"title", "description", "nav"} -->
src/data/projects.json     Project cards and /projects/<slug>/ detail pages
static/                    Copied as-is (css/, js/, assets/)
content/pwn-college-writeup  Git submodule, pinned commit; rendered to /blog/
scripts/build.mjs          Build to _site/
scripts/serve.mjs          Local static server (mirrors GitHub Pages)
scripts/check-links.mjs    Link checker
tests/unit/                node:test unit tests
tests/e2e/                 Playwright + axe tests
```

Content rules: the site must not claim results, skills or project status beyond what is true. Project status labels
live in `src/data/projects.json`.

## Local development

Requires Node 22 (`.nvmrc`).

```sh
git submodule update --init      # fetch the writeups
npm ci
npx playwright install chromium  # once
npm run build && npm run serve   # http://localhost:4173
```

Updating the writeups: `git -C content/pwn-college-writeup pull origin main`, then commit the new submodule pointer.

## Quality gates

`npm run check` runs every required check locally, in the same order as CI.

| Check            | Command                  | Fails when                                                                     |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Lint and format  | `npm run lint`           | ESLint errors, or files not formatted by Prettier (`npm run format`)           |
| Unit tests       | `npm run test:unit`      | Build helpers, markdown sanitizer (XSS) or link checker regress                |
| Build            | `npm run build`          | Missing page metadata, unknown template placeholder, slug collision            |
| HTML validation  | `npm run validate:html`  | Invalid or inaccessible HTML in any built page (html-validate)                 |
| Internal links   | `npm run links:internal` | Broken internal link, image or `#anchor`                                       |
| External links   | `npm run links:external` | An external URL returns 404/410. Timeouts, 403, 429, 5xx: warning only         |
| Playwright + axe | `npm run test:e2e`       | See below                                                                      |
| Lighthouse CI    | `npm run lighthouse`     | Median score below Performance 90, Accessibility 95, Best Practices 95, SEO 95 |

Playwright runs on a desktop and a Pixel 7 profile and checks: each main page (Home, Research, Projects, Blog, CV)
renders with one `<h1>` and metadata; navigation reaches every page; the theme toggle works and persists; the default
theme follows the system setting; axe finds no WCAG 2.1 AA violations in either theme; no page in the sitemap overflows
horizontally; no JavaScript errors or failed requests.

Lighthouse uses its default mobile emulation against `_site/` served locally, 3 runs per URL, so scores do not depend
on GitHub Pages or any outside service.

Never lower a threshold or skip a test to get a green build. Fix the cause.

## CI and deployment

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. On `main`, the `Deploy to GitHub Pages`
job runs only after every check passes.

Repository settings this relies on (set once by the owner):

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Branches → protect `main`: require a pull request and require these status checks:
   `Lint and format`, `Unit tests`, `Build, HTML validation, internal links`, `External links`, `Playwright and axe`,
   `Lighthouse CI`.
