# Jason Liu Personal Website

This is my GitHub Pages personal site. It is a static HTML/CSS/JavaScript project for notes, public projects, and a short portfolio CV around systems security, CTF, fuzzing, reverse engineering, and low-level programming.

There is no build step. GitHub Pages can serve the files as-is.

## Features

- Hash-based SPA views: Home, Blog, Projects, CV, and Blog Post.
- Dark/light theme toggle saved in `localStorage`.
- Blog entries loaded from public GitHub repositories.
- Repository README rendering through the GitHub API.
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
`-- assets/
```

## Deployment

Push the files to the branch configured for GitHub Pages. The site does not need bundling, compilation, or generated assets.

The Blog and Projects sections call the public GitHub API in the browser. Blog entries come from public repositories and render each repository README when available.

## Notes for Later

- Keep GitHub repository topics updated so project cards have better tags.
- Add syntax highlighting only if it can stay simple and build-free.
