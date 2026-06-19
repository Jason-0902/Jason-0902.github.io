# Jason Liu Personal Website

This repository contains my GitHub Pages personal website and portfolio. It is a pure static site built with HTML, CSS, and JavaScript, focused on systems security, CTF writeups, fuzzing, reverse engineering, and low-level systems projects.

The site is intentionally lightweight: there is no React, Vue, Next.js, bundler, or build step. GitHub Pages can serve it directly from the repository.

## Features

- Single-page hash routing for Home, Blog, Projects, CV, and Blog Post views.
- Dark and light mode toggle with `localStorage` persistence.
- Blog browser that reads Markdown files from the GitHub repository through the GitHub Contents API.
- Local `posts/posts.json` fallback when GitHub API requests fail or hit rate limits.
- Markdown rendering through the `marked.js` CDN.
- Project cards loaded from the GitHub public repositories API.
- Featured repository ordering for security, fuzzing, CTF, and systems projects.
- Responsive layout for desktop and mobile GitHub Pages usage.

## File Structure

```text
.
├── index.html          # Static SPA markup
├── css/
│   └── style.css       # Theme, layout, cards, Markdown, and responsive styles
├── js/
│   └── main.js         # Theme, routing, typewriter, blog, and project logic
├── posts/
│   └── posts.json      # Local blog fallback data
└── assets/             # Static images and other assets
```

## Local Preview

Because the site uses `fetch`, preview it through a local static server instead of opening `index.html` directly from the filesystem.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Any equivalent static file server is fine. No dependency installation is required.

## Deployment Notes

The site is designed for GitHub Pages. Push changes to the branch configured in the repository Pages settings, usually `main`, and GitHub Pages can serve the files directly.

The Blog and Projects sections call the public GitHub API from the browser. If API rate limits, network restrictions, or repository visibility issues occur, the site keeps working through local fallback content and user-facing status messages.

## Future Improvements

- Add more local Markdown notes for offline-friendly fallback content.
- Add a lightweight sanitizer if the Blog section ever renders untrusted Markdown.
- Expand CV content with publications, research work, or formal project outcomes.
- Add optional syntax highlighting while keeping the site build-free.
- Improve repository metadata by maintaining topics and homepage URLs on GitHub.
