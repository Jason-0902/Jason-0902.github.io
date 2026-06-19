document.addEventListener("DOMContentLoaded", () => {
    const CONFIG = {
        githubUser: "Jason-0902",
        githubRepo: "Jason-0902.github.io",
        blogPath: "posts",
        fallbackPostsUrl: "posts/posts.json",
        featuredRepos: [
            "Pwn-college-writeup",
            "web-dork-fuzzer",
            "wdf",
            "Writing-an-OS-in-Rust-Learning-Project"
        ]
    };

    const state = {
        currentBlogPath: "",
        blogSource: "github",
        typewriterTimer: null,
        typewriterStarted: false,
        fallbackPosts: []
    };

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const escapeHtml = (value = "") => String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const formatDate = (value) => {
        if (!value) return "Unknown date";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
    };

    const showStatus = (selector, message) => {
        const element = $(selector);
        if (!element) return;
        element.hidden = !message;
        element.textContent = message || "";
    };

    // Theme
    const theme = {
        init() {
            const savedTheme = localStorage.getItem("theme");
            const legacyDarkMode = localStorage.getItem("dark-mode");
            const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
            const mode = savedTheme || (legacyDarkMode ? (legacyDarkMode === "true" ? "dark" : "light") : (prefersLight ? "light" : "dark"));
            this.apply(mode);

            const toggle = $("#dark-toggle");
            if (!toggle) return;
            toggle.addEventListener("click", () => {
                const nextMode = document.body.classList.contains("dark-mode") ? "light" : "dark";
                localStorage.setItem("theme", nextMode);
                localStorage.setItem("dark-mode", String(nextMode === "dark"));
                this.apply(nextMode);
            });
        },
        apply(mode) {
            const isDark = mode !== "light";
            document.body.classList.toggle("dark-mode", isDark);
            document.body.classList.toggle("light-mode", !isDark);
            const toggle = $("#dark-toggle");
            if (toggle) {
                toggle.textContent = isDark ? "☾" : "☀";
                toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
                toggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
            }
        }
    };

    // Routing
    const router = {
        validRoutes: new Set(["home", "blog", "projects", "cv", "blog-post"]),
        init() {
            document.addEventListener("click", (event) => {
                const link = event.target.closest("a[href^='#']");
                if (!link) return;
                const route = link.getAttribute("href").slice(1) || "home";
                if (!this.validRoutes.has(route)) return;
                event.preventDefault();
                this.go(route);
            });

            window.addEventListener("hashchange", () => this.sync());
            this.sync();
        },
        sync() {
            const route = window.location.hash.slice(1) || "home";
            if (!this.validRoutes.has(route)) {
                this.go("home", true);
                return;
            }
            this.show(route);
        },
        go(route, replace = false) {
            const hash = `#${route}`;
            if (replace) {
                history.replaceState(null, "", hash);
                this.show(route);
                return;
            }
            if (window.location.hash === hash) {
                this.show(route);
            } else {
                window.location.hash = route;
            }
        },
        show(route) {
            $$(".view").forEach((view) => view.classList.toggle("active", view.id === route));
            $$(".nav-link").forEach((link) => {
                const href = link.getAttribute("href");
                const isActive = href === `#${route}` || (route === "blog-post" && href === "#blog");
                link.classList.toggle("active", isActive);
            });

            if (route === "home") typewriter.start();
            if (route === "blog") blog.ensureLoaded();
            if (route === "projects") projects.ensureLoaded();
            if (route === "blog-post") blog.ensurePostPlaceholder();
        }
    };

    // Typewriter
    const typewriter = {
        phrases: [
            "Building security-focused tools and systems projects.",
            "Interested in fuzzing, reverse engineering, and system reliability.",
            "Documenting my learning through CTF writeups and projects."
        ],
        phraseIndex: 0,
        charIndex: 0,
        deleting: false,
        start() {
            const target = $("#typewriter");
            if (!target) return;
            clearTimeout(state.typewriterTimer);
            if (!state.typewriterStarted) {
                this.phraseIndex = 0;
                this.charIndex = 0;
                this.deleting = false;
                target.textContent = "";
                state.typewriterStarted = true;
            }
            this.step(target);
        },
        step(target) {
            const text = this.phrases[this.phraseIndex];
            this.charIndex += this.deleting ? -1 : 1;
            target.textContent = text.slice(0, this.charIndex);

            if (!this.deleting && this.charIndex === text.length) {
                this.deleting = true;
                state.typewriterTimer = setTimeout(() => this.step(target), 1800);
                return;
            }

            if (this.deleting && this.charIndex === 0) {
                this.deleting = false;
                this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length;
                state.typewriterTimer = setTimeout(() => this.step(target), 420);
                return;
            }

            state.typewriterTimer = setTimeout(() => this.step(target), this.deleting ? 34 : 62);
        }
    };

    // Blog
    const blog = {
        loaded: false,
        async ensureLoaded() {
            if (this.loaded) return;
            this.loaded = true;
            await this.loadDirectory("");
        },
        async loadDirectory(path = "") {
            state.currentBlogPath = path;
            this.renderBreadcrumbs(path);
            this.renderLoading();

            try {
                const items = await this.fetchGithubDirectory(path);
                state.blogSource = "github";
                showStatus("#blog-status", "");
                this.renderGithubItems(items, path);
            } catch (error) {
                console.warn("GitHub blog loading failed; using local fallback.", error);
                state.blogSource = "fallback";
                showStatus("#blog-status", "GitHub notes could not be loaded right now. Showing the local fallback list instead.");
                await this.renderFallbackPosts();
            }
        },
        async fetchGithubDirectory(path) {
            const fullPath = [CONFIG.blogPath, path].filter(Boolean).join("/");
            const apiUrl = `https://api.github.com/repos/${CONFIG.githubUser}/${CONFIG.githubRepo}/contents/${encodeURIComponent(fullPath).replaceAll("%2F", "/")}`;
            const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } });
            if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("Expected a GitHub directory response.");
            return data
                .filter((item) => item.name !== "posts.json")
                .sort((a, b) => {
                    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
        },
        renderBreadcrumbs(path) {
            const container = $("#blog-breadcrumbs");
            if (!container) return;
            const parts = path ? path.split("/").filter(Boolean) : [];
            const crumbs = [{ label: "root", path: "" }].concat(parts.map((part, index) => ({
                label: part,
                path: parts.slice(0, index + 1).join("/")
            })));

            container.innerHTML = "";
            crumbs.forEach((crumb, index) => {
                const slash = document.createElement("span");
                slash.textContent = "/";
                container.appendChild(slash);

                const button = document.createElement("button");
                button.type = "button";
                button.className = "breadcrumb-link";
                button.textContent = crumb.label;
                button.addEventListener("click", () => this.loadDirectory(crumb.path));
                container.appendChild(button);

                if (index === crumbs.length - 1) button.setAttribute("aria-current", "page");
            });
        },
        renderLoading() {
            const list = $("#blog-list");
            if (!list) return;
            list.innerHTML = '<div class="status-message">Loading notes...</div>';
        },
        renderGithubItems(items, currentPath) {
            const list = $("#blog-list");
            if (!list) return;

            if (!items.length) {
                list.innerHTML = '<div class="status-message">No Markdown notes found in this folder yet.</div>';
                return;
            }

            list.innerHTML = "";
            items.forEach((item) => {
                const isDirectory = item.type === "dir";
                const isMarkdown = item.name.toLowerCase().endsWith(".md");
                if (!isDirectory && !isMarkdown) return;

                const button = document.createElement("button");
                button.type = "button";
                button.className = "browser-item";
                button.innerHTML = `
                    <span class="browser-icon">${isDirectory ? "dir" : "md"}</span>
                    <span>
                        <span class="browser-title">${escapeHtml(item.name.replace(/\.md$/i, ""))}</span>
                        <span class="browser-meta">${escapeHtml(item.path)}</span>
                    </span>
                    <span class="browser-kind">${isDirectory ? "folder" : "note"}</span>
                `;
                button.addEventListener("click", () => {
                    if (isDirectory) {
                        const nextPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                        this.loadDirectory(nextPath);
                    } else {
                        this.loadMarkdownPost(item);
                    }
                });
                list.appendChild(button);
            });
        },
        async renderFallbackPosts() {
            const list = $("#blog-list");
            if (!list) return;
            this.renderBreadcrumbs("");

            try {
                const posts = state.fallbackPosts.length ? state.fallbackPosts : await this.fetchFallbackPosts();
                state.fallbackPosts = posts;
                list.innerHTML = "";
                posts.forEach((post) => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "browser-item";
                    button.innerHTML = `
                        <span class="browser-icon">md</span>
                        <span>
                            <span class="browser-title">${escapeHtml(post.title)}</span>
                            <span class="browser-meta">${escapeHtml(post.readingTime || "note")} · ${escapeHtml(post.date || "undated")}</span>
                        </span>
                        <span class="browser-kind">fallback</span>
                    `;
                    button.addEventListener("click", () => this.loadFallbackPost(post));
                    list.appendChild(button);
                });
            } catch (error) {
                console.error("Local fallback posts failed.", error);
                list.innerHTML = '<div class="status-message">No local fallback posts are available.</div>';
            }
        },
        async fetchFallbackPosts() {
            const response = await fetch(CONFIG.fallbackPostsUrl);
            if (!response.ok) throw new Error(`Fallback posts returned ${response.status}`);
            return response.json();
        },
        async loadMarkdownPost(item) {
            const title = item.name.replace(/\.md$/i, "");
            this.setPostShell(title, `Markdown note · ${item.path}`);
            router.go("blog-post");

            try {
                const response = await fetch(item.download_url);
                if (!response.ok) throw new Error(`Markdown fetch returned ${response.status}`);
                const markdown = await response.text();
                this.renderMarkdown(markdown);
            } catch (error) {
                console.error("Markdown loading failed.", error);
                this.renderPostMessage("This note could not be loaded from GitHub right now.");
            }
        },
        loadFallbackPost(post) {
            this.setPostShell(post.title, `${post.readingTime || "note"} · Published: ${post.date || "undated"}`);
            router.go("blog-post");

            if (post.markdown) {
                this.renderMarkdown(post.markdown);
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
                content.appendChild(iframe);
                return;
            }

            this.renderPostMessage("This fallback entry does not have Markdown content yet.");
        },
        setPostShell(title, meta) {
            const titleElement = $("#post-title");
            const metaElement = $("#post-meta");
            const content = $("#post-content");
            if (titleElement) titleElement.textContent = title;
            if (metaElement) metaElement.textContent = meta;
            if (content) content.innerHTML = '<div class="status-message">Loading post...</div>';
        },
        ensurePostPlaceholder() {
            const titleElement = $("#post-title");
            const content = $("#post-content");
            if (!titleElement || titleElement.textContent.trim()) return;
            titleElement.textContent = "Blog Post";
            const metaElement = $("#post-meta");
            if (metaElement) metaElement.textContent = "No note selected";
            if (content) {
                content.innerHTML = '<div class="status-message">Open Blog and select a note to read. Direct #blog-post refreshes are supported, but no post state was available in this browser session.</div>';
            }
        },
        renderMarkdown(markdown) {
            const content = $("#post-content");
            if (!content) return;

            if (!window.marked) {
                content.innerHTML = `<pre><code>${escapeHtml(markdown)}</code></pre>`;
                return;
            }

            window.marked.setOptions({
                gfm: true,
                breaks: false,
                mangle: false,
                headerIds: false
            });

            // Markdown is rendered from trusted personal repository content. Add a sanitizer before accepting untrusted submissions.
            content.innerHTML = window.marked.parse(markdown);
        },
        renderPostMessage(message) {
            const content = $("#post-content");
            if (content) content.innerHTML = `<div class="status-message">${escapeHtml(message)}</div>`;
        }
    };

    // Projects
    const projects = {
        loaded: false,
        fallbackRepos: [
            {
                name: "Pwn-college-writeup",
                description: "CTF and binary exploitation learning notes from pwn.college practice.",
                language: "Markdown",
                stargazers_count: 0,
                pushed_at: "2025-01-01",
                topics: ["ctf", "pwn", "writeups"],
                html_url: "https://github.com/Jason-0902/Pwn-college-writeup"
            },
            {
                name: "web-dork-fuzzer",
                description: "Security-focused web discovery and dork fuzzing experiments.",
                language: "Python",
                stargazers_count: 0,
                pushed_at: "2025-01-01",
                topics: ["security", "fuzzing", "web"],
                html_url: "https://github.com/Jason-0902/web-dork-fuzzer"
            },
            {
                name: "wdf",
                description: "A compact web dork fuzzing tool and related experiments.",
                language: "Python",
                stargazers_count: 0,
                pushed_at: "2025-01-01",
                topics: ["security", "automation"],
                html_url: "https://github.com/Jason-0902/wdf"
            },
            {
                name: "Writing-an-OS-in-Rust-Learning-Project",
                description: "Learning operating system internals through Rust and low-level systems programming.",
                language: "Rust",
                stargazers_count: 0,
                pushed_at: "2025-01-01",
                topics: ["rust", "os", "systems"],
                html_url: "https://github.com/Jason-0902/Writing-an-OS-in-Rust-Learning-Project"
            }
        ],
        async ensureLoaded() {
            if (this.loaded) return;
            this.loaded = true;
            await this.load();
        },
        async load() {
            const grid = $("#projects-grid");
            if (grid) grid.innerHTML = '<div class="status-message">Loading GitHub repositories...</div>';

            try {
                const repos = await this.fetchRepos();
                showStatus("#projects-status", "");
                this.render(repos);
            } catch (error) {
                console.warn("GitHub projects loading failed; using fallback cards.", error);
                showStatus("#projects-status", "GitHub repositories could not be loaded right now. Showing selected fallback projects instead.");
                this.render(this.fallbackRepos);
            }
        },
        async fetchRepos() {
            const response = await fetch(`https://api.github.com/users/${CONFIG.githubUser}/repos?sort=pushed&per_page=100`, {
                headers: { Accept: "application/vnd.github+json" }
            });
            if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
            const repos = await response.json();
            return Array.isArray(repos) ? repos.filter((repo) => !repo.fork) : [];
        },
        sortRepos(repos) {
            const featuredIndex = new Map(CONFIG.featuredRepos.map((name, index) => [name.toLowerCase(), index]));
            return repos.slice().sort((a, b) => {
                const aFeatured = featuredIndex.has(a.name.toLowerCase());
                const bFeatured = featuredIndex.has(b.name.toLowerCase());
                if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
                if (aFeatured && bFeatured) {
                    return featuredIndex.get(a.name.toLowerCase()) - featuredIndex.get(b.name.toLowerCase());
                }
                const starDiff = (b.stargazers_count || 0) - (a.stargazers_count || 0);
                if (starDiff !== 0) return starDiff;
                return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0);
            });
        },
        render(repos) {
            const grid = $("#projects-grid");
            if (!grid) return;

            const sorted = this.sortRepos(repos).slice(0, 12);
            if (!sorted.length) {
                grid.innerHTML = '<div class="status-message">No public repositories are available yet.</div>';
                return;
            }

            grid.innerHTML = "";
            sorted.forEach((repo) => grid.appendChild(this.createCard(repo)));
        },
        createCard(repo) {
            const featured = CONFIG.featuredRepos.some((name) => name.toLowerCase() === repo.name.toLowerCase());
            const card = document.createElement("article");
            card.className = `project-card${featured ? " featured" : ""}`;
            const description = repo.description || "A public project from my systems, security, or programming practice.";
            const topics = Array.isArray(repo.topics) && repo.topics.length ? repo.topics.slice(0, 5) : this.inferTopics(repo);
            const homepage = repo.homepage ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer">Homepage</a>` : "";

            card.innerHTML = `
                <h3>${escapeHtml(repo.name)}</h3>
                <p>${escapeHtml(description)}</p>
                <div class="project-meta">
                    <span>${escapeHtml(repo.language || "Code")}</span>
                    <span>★ ${Number(repo.stargazers_count || 0)}</span>
                    <span>Updated ${escapeHtml(formatDate(repo.pushed_at || repo.updated_at))}</span>
                    ${featured ? "<span>Featured</span>" : ""}
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
        },
        inferTopics(repo) {
            const name = repo.name.toLowerCase();
            if (name.includes("pwn") || name.includes("ctf")) return ["ctf", "security", "writeups"];
            if (name.includes("fuzz") || name.includes("dork")) return ["fuzzing", "web", "security"];
            if (name.includes("os") || name.includes("rust")) return ["rust", "systems", "os"];
            return ["project", "learning"];
        }
    };

    const backButton = $("#back-to-blog");
    if (backButton) {
        backButton.addEventListener("click", () => router.go("blog"));
    }

    theme.init();
    router.init();
});
