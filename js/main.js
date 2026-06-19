document.addEventListener("DOMContentLoaded", () => {
    const githubUser = "Jason-0902";
    const githubRepo = "Jason-0902.github.io";
    const blogRoot = "posts";
    const featuredRepos = [
        "Pwn-college-writeup",
        "web-dork-fuzzer",
        "wdf",
        "Writing-an-OS-in-Rust-Learning-Project"
    ];

    const routes = new Set(["home", "blog", "projects", "cv", "blog-post"]);
    const fallbackProjects = [
        projectFallback("Pwn-college-writeup", "CTF and binary exploitation notes from pwn.college practice.", "Markdown", ["ctf", "pwn", "writeups"]),
        projectFallback("web-dork-fuzzer", "Small web discovery and dork fuzzing experiments.", "Python", ["security", "fuzzing", "web"]),
        projectFallback("wdf", "A compact web dork fuzzing tool and related experiments.", "Python", ["security", "automation"]),
        projectFallback("Writing-an-OS-in-Rust-Learning-Project", "Operating system internals notes and Rust systems programming practice.", "Rust", ["rust", "os", "systems"]),
        {
            name: "Autoware Fuzzing with AFL++ / AFL",
            description: "Fuzzing notes and experiments around larger software components.",
            language: "C++",
            topics: ["fuzzing", "afl++", "reliability"],
            stargazers_count: 0,
            pushed_at: "2025-01-01",
            html_url: "https://github.com/Jason-0902"
        }
    ];

    let blogLoaded = false;
    let projectsLoaded = false;
    let cachedFallbackPosts = [];
    let typeTimer = null;
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const phrases = [
        "Building small tools to understand real systems.",
        "Writing notes from CTF, reverse engineering, and fuzzing practice.",
        "Learning systems security through projects, not just courses."
    ];

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    initTheme();
    initRouting();
    $("#back-to-blog")?.addEventListener("click", () => goTo("blog"));

    function initTheme() {
        const savedTheme = localStorage.getItem("theme");
        const oldThemeValue = localStorage.getItem("dark-mode");
        const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
        const initialTheme = savedTheme || (oldThemeValue ? (oldThemeValue === "true" ? "dark" : "light") : (prefersLight ? "light" : "dark"));

        setTheme(initialTheme);
        $("#dark-toggle")?.addEventListener("click", () => {
            const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
            localStorage.setItem("theme", nextTheme);
            localStorage.setItem("dark-mode", String(nextTheme === "dark"));
            setTheme(nextTheme);
        });
    }

    function setTheme(theme) {
        const isDark = theme !== "light";
        document.body.classList.toggle("dark-mode", isDark);
        document.body.classList.toggle("light-mode", !isDark);

        const toggle = $("#dark-toggle");
        if (!toggle) return;
        toggle.textContent = isDark ? "Dark" : "Light";
        toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
        toggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    }

    function initRouting() {
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[href^='#']");
            if (!link) return;

            const target = link.getAttribute("href").slice(1) || "home";
            if (!routes.has(target)) return;

            event.preventDefault();
            goTo(target);
        });

        window.addEventListener("hashchange", syncRoute);
        syncRoute();
    }

    function syncRoute() {
        const route = window.location.hash.slice(1) || "home";
        if (!routes.has(route)) {
            goTo("home", true);
            return;
        }
        showRoute(route);
    }

    function goTo(route, replace = false) {
        if (replace) {
            history.replaceState(null, "", `#${route}`);
            showRoute(route);
            return;
        }

        if (window.location.hash === `#${route}`) {
            showRoute(route);
        } else {
            window.location.hash = route;
        }
    }

    function showRoute(route) {
        $$(".view").forEach((view) => {
            view.classList.toggle("active", view.id === route);
        });

        $$(".nav-link").forEach((link) => {
            const href = link.getAttribute("href");
            link.classList.toggle("active", href === `#${route}` || (route === "blog-post" && href === "#blog"));
        });

        if (route === "home") startTypewriter();
        if (route === "blog") loadBlogOnce();
        if (route === "projects") loadProjectsOnce();
        if (route === "blog-post") showEmptyPostIfNeeded();
    }

    function startTypewriter() {
        const target = $("#typewriter");
        if (!target) return;

        clearTimeout(typeTimer);
        typeStep(target);
    }

    function typeStep(target) {
        const text = phrases[phraseIndex];
        charIndex += deleting ? -1 : 1;
        target.textContent = text.slice(0, charIndex);

        if (!deleting && charIndex === text.length) {
            deleting = true;
            typeTimer = setTimeout(() => typeStep(target), 1700);
            return;
        }

        if (deleting && charIndex === 0) {
            deleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typeTimer = setTimeout(() => typeStep(target), 380);
            return;
        }

        typeTimer = setTimeout(() => typeStep(target), deleting ? 35 : 65);
    }

    async function loadBlogOnce() {
        if (blogLoaded) return;
        blogLoaded = true;
        await loadBlogFolder("");
    }

    async function loadBlogFolder(path = "") {
        renderBreadcrumbs(path);
        renderBlogLoading();

        try {
            const items = await fetchGithubFolder(path);
            setStatus("#blog-status", "");
            renderGithubFolder(items, path);
        } catch (error) {
            console.warn("Using local blog fallback:", error);
            setStatus("#blog-status", "Could not load GitHub notes right now. Showing local fallback posts instead.");
            await renderFallbackPosts();
        }
    }

    async function fetchGithubFolder(path) {
        const fullPath = [blogRoot, path].filter(Boolean).join("/");
        const url = `https://api.github.com/repos/${githubUser}/${githubRepo}/contents/${encodePath(fullPath)}`;
        const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });

        if (!response.ok) throw new Error(`GitHub API ${response.status}`);

        const items = await response.json();
        if (!Array.isArray(items)) throw new Error("GitHub did not return a folder.");

        return items
            .filter((item) => item.name !== "posts.json")
            .filter((item) => item.type === "dir" || item.name.toLowerCase().endsWith(".md"))
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
    }

    function renderBreadcrumbs(path) {
        const container = $("#blog-breadcrumbs");
        if (!container) return;

        const parts = path ? path.split("/").filter(Boolean) : [];
        const crumbs = [{ label: "root", path: "" }];
        parts.forEach((part, index) => {
            crumbs.push({ label: part, path: parts.slice(0, index + 1).join("/") });
        });

        container.innerHTML = "";
        crumbs.forEach((crumb) => {
            container.append(document.createTextNode("/"));

            const button = document.createElement("button");
            button.type = "button";
            button.className = "breadcrumb-link";
            button.textContent = crumb.label;
            button.addEventListener("click", () => loadBlogFolder(crumb.path));
            container.append(button);
        });
    }

    function renderBlogLoading() {
        const list = $("#blog-list");
        if (list) list.innerHTML = '<div class="status-message">Loading notes...</div>';
    }

    function renderGithubFolder(items, path) {
        const list = $("#blog-list");
        if (!list) return;

        if (!items.length) {
            list.innerHTML = '<div class="status-message">No Markdown notes found in this folder yet.</div>';
            return;
        }

        list.innerHTML = "";
        items.forEach((item) => {
            const isFolder = item.type === "dir";
            list.append(createBlogRow({
                icon: isFolder ? "dir" : "md",
                title: item.name.replace(/\.md$/i, ""),
                meta: item.path,
                kind: isFolder ? "folder" : "note",
                onClick: () => {
                    if (isFolder) {
                        const nextPath = path ? `${path}/${item.name}` : item.name;
                        loadBlogFolder(nextPath);
                    } else {
                        openMarkdownPost(item);
                    }
                }
            }));
        });
    }

    async function renderFallbackPosts() {
        const list = $("#blog-list");
        if (!list) return;

        renderBreadcrumbs("");

        try {
            const posts = cachedFallbackPosts.length ? cachedFallbackPosts : await fetchFallbackPosts();
            cachedFallbackPosts = posts;
            list.innerHTML = "";
            posts.forEach((post) => {
                list.append(createBlogRow({
                    icon: "md",
                    title: post.title,
                    meta: `${post.readingTime || "note"} | ${post.date || "undated"}`,
                    kind: "fallback",
                    onClick: () => openFallbackPost(post)
                }));
            });
        } catch (error) {
            console.error("Local fallback failed:", error);
            list.innerHTML = '<div class="status-message">No local fallback posts are available.</div>';
        }
    }

    function createBlogRow({ icon, title, meta, kind, onClick }) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "browser-item";
        button.innerHTML = `
            <span class="browser-icon">${escapeHtml(icon)}</span>
            <span>
                <span class="browser-title">${escapeHtml(title)}</span>
                <span class="browser-meta">${escapeHtml(meta)}</span>
            </span>
            <span class="browser-kind">${escapeHtml(kind)}</span>
        `;
        button.addEventListener("click", onClick);
        return button;
    }

    async function fetchFallbackPosts() {
        const response = await fetch("posts/posts.json");
        if (!response.ok) throw new Error(`posts.json ${response.status}`);
        return response.json();
    }

    async function openMarkdownPost(item) {
        setPost(item.name.replace(/\.md$/i, ""), `Markdown note | ${item.path}`);
        goTo("blog-post");

        try {
            const response = await fetch(item.download_url);
            if (!response.ok) throw new Error(`Markdown ${response.status}`);
            renderMarkdown(await response.text());
        } catch (error) {
            console.error("Markdown load failed:", error);
            renderPostMessage("This note could not be loaded from GitHub right now.");
        }
    }

    function openFallbackPost(post) {
        setPost(post.title, `${post.readingTime || "note"} | Published: ${post.date || "undated"}`);
        goTo("blog-post");

        if (post.markdown) {
            renderMarkdown(post.markdown);
            return;
        }

        if (post.hackmdUrl) {
            const content = $("#post-content");
            if (!content) return;

            content.innerHTML = "";
            const iframe = document.createElement("iframe");
            iframe.src = post.hackmdUrl;
            iframe.title = post.title;
            iframe.loading = "lazy";
            content.append(iframe);
            return;
        }

        renderPostMessage("This fallback entry does not have Markdown content yet.");
    }

    function setPost(title, meta) {
        const titleElement = $("#post-title");
        const metaElement = $("#post-meta");
        const content = $("#post-content");

        if (titleElement) titleElement.textContent = title;
        if (metaElement) metaElement.textContent = meta;
        if (content) content.innerHTML = '<div class="status-message">Loading post...</div>';
    }

    function showEmptyPostIfNeeded() {
        const titleElement = $("#post-title");
        if (!titleElement || titleElement.textContent.trim()) return;

        setPost("Blog Post", "No note selected");
        renderPostMessage("Open Blog and select a note to read.");
    }

    function renderMarkdown(markdown) {
        const content = $("#post-content");
        if (!content) return;

        if (!window.marked) {
            content.innerHTML = `<pre><code>${escapeHtml(markdown)}</code></pre>`;
            return;
        }

        window.marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

        // Personal notes only. Add sanitizing before rendering content from other authors.
        content.innerHTML = window.marked.parse(markdown);
    }

    function renderPostMessage(message) {
        const content = $("#post-content");
        if (content) content.innerHTML = `<div class="status-message">${escapeHtml(message)}</div>`;
    }

    async function loadProjectsOnce() {
        if (projectsLoaded) return;
        projectsLoaded = true;

        const grid = $("#projects-grid");
        if (grid) grid.innerHTML = '<div class="status-message">Loading GitHub repositories...</div>';

        try {
            const repos = await fetchRepos();
            setStatus("#projects-status", "");
            renderProjects(repos);
        } catch (error) {
            console.warn("Using project fallback:", error);
            setStatus("#projects-status", "GitHub repositories are unavailable right now. Showing selected fallback projects instead.");
            renderProjects(fallbackProjects);
        }
    }

    async function fetchRepos() {
        const url = `https://api.github.com/users/${githubUser}/repos?sort=pushed&per_page=100`;
        const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });

        if (!response.ok) throw new Error(`GitHub API ${response.status}`);

        const repos = await response.json();
        return Array.isArray(repos) ? repos.filter((repo) => !repo.fork) : [];
    }

    function renderProjects(repos) {
        const grid = $("#projects-grid");
        if (!grid) return;

        const sorted = sortRepos(repos).slice(0, 12);
        if (!sorted.length) {
            grid.innerHTML = '<div class="status-message">No public repositories are available yet.</div>';
            return;
        }

        grid.innerHTML = "";
        sorted.forEach((repo) => grid.append(createProjectCard(repo)));
    }

    function sortRepos(repos) {
        const featuredOrder = new Map(featuredRepos.map((name, index) => [name.toLowerCase(), index]));

        return repos.slice().sort((a, b) => {
            const aRank = featuredOrder.get(a.name.toLowerCase());
            const bRank = featuredOrder.get(b.name.toLowerCase());

            if (aRank !== undefined || bRank !== undefined) {
                if (aRank === undefined) return 1;
                if (bRank === undefined) return -1;
                return aRank - bRank;
            }

            const byStars = (b.stargazers_count || 0) - (a.stargazers_count || 0);
            if (byStars) return byStars;
            return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0);
        });
    }

    function createProjectCard(repo) {
        const isFeatured = featuredRepos.some((name) => name.toLowerCase() === repo.name.toLowerCase());
        const description = repo.description || "No description provided.";
        const topics = Array.isArray(repo.topics) && repo.topics.length ? repo.topics.slice(0, 5) : guessTopics(repo.name);
        const homepage = repo.homepage
            ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer">Homepage</a>`
            : "";

        const card = document.createElement("article");
        card.className = `project-card${isFeatured ? " featured" : ""}`;
        card.innerHTML = `
            <h3>${escapeHtml(repo.name)}</h3>
            <p>${escapeHtml(description)}</p>
            <div class="project-meta">
                <span>${escapeHtml(repo.language || "Code")}</span>
                <span>${Number(repo.stargazers_count || 0)} stars</span>
                <span>Updated ${escapeHtml(formatDate(repo.pushed_at || repo.updated_at))}</span>
                ${isFeatured ? "<span>Featured</span>" : ""}
            </div>
            <div class="project-tags">
                ${topics.map((topic) => `<span class="chip">${escapeHtml(topic)}</span>`).join("")}
            </div>
            <div class="project-links">
                <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer">GitHub</a>
                ${homepage}
            </div>
        `;
        return card;
    }

    function guessTopics(name) {
        const lower = name.toLowerCase();
        if (lower.includes("pwn") || lower.includes("ctf")) return ["ctf", "security", "writeups"];
        if (lower.includes("fuzz") || lower.includes("dork")) return ["fuzzing", "web", "security"];
        if (lower.includes("os") || lower.includes("rust")) return ["rust", "systems", "os"];
        return ["project", "learning"];
    }

    function projectFallback(name, description, language, topics) {
        return {
            name,
            description,
            language,
            topics,
            stargazers_count: 0,
            pushed_at: "2025-01-01",
            html_url: `https://github.com/${githubUser}/${name}`
        };
    }

    function setStatus(selector, message) {
        const element = $(selector);
        if (!element) return;
        element.hidden = !message;
        element.textContent = message || "";
    }

    function encodePath(path) {
        return path.split("/").map(encodeURIComponent).join("/");
    }

    function formatDate(value) {
        if (!value) return "Unknown date";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
    }

    function escapeHtml(value = "") {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});
