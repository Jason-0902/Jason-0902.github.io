# Jason Liu Personal Website

This is my GitHub Pages personal site. It is a static HTML/CSS/JavaScript project for notes, public projects, and a short portfolio CV around systems security, CTF, fuzzing, reverse engineering, and low-level programming.

There is no build step. GitHub Pages can serve the files as-is.

## Features

- Hash-based SPA views: Home, Blog, Projects, CV, and Blog Post.
- Dark/light theme toggle saved in `localStorage`.
- Blog folder browser backed by the GitHub Contents API.
- Local `posts/posts.json` fallback when GitHub API requests fail.
- Markdown rendering through the `marked.js` CDN.
- Project cards loaded from public GitHub repositories.
- Mobile layout that keeps the header and social links out of the way.

## File Structure

```text
.
|-- index.html
|-- css/
|   `-- style.css
|-- js/
|   `-- main.js
|-- posts/
|   `-- posts.json
`-- assets/
```

## Local Preview

Use a small static server so `fetch()` works normally:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

No dependency install is needed.

## Deployment

Push the files to the branch configured for GitHub Pages. The site does not need bundling, compilation, or generated assets.

The Blog and Projects sections call the public GitHub API in the browser. If that API is unavailable or rate-limited, the page falls back to local data instead of rendering an empty section.

## Notes for Later

- Add more local Markdown fallbacks for important writeups.
- Add a sanitizer before rendering Markdown from anyone else's content.
- Keep GitHub repository topics updated so project cards have better tags.
- Add syntax highlighting only if it can stay simple and build-free.
