document.addEventListener("DOMContentLoaded", () => {
    const githubUser = "Jason-0902";
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
    let cachedRepos = null;
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
    initCoverAnimation();
    initRouting();
    window.addEventListener("scroll", updateHomeChrome, { passive: true });
    $("#back-to-blog")?.addEventListener("click", () => goTo("blog"));
    $("#home-scroll")?.addEventListener("click", () => {
        $(".sketch-hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

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
        document.body.classList.toggle("route-home", route === "home");
        updateHomeChrome();

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
        if (route === "blog-post") {
            window.scrollTo({ top: 0, behavior: "auto" });
            showEmptyPostIfNeeded();
        }
    }

    function updateHomeChrome() {
        if (!document.body.classList.contains("route-home")) {
            document.body.classList.remove("home-stage-active");
            return;
        }

        const splash = $(".intro-splash");
        const threshold = splash ? splash.offsetHeight - 120 : 120;
        document.body.classList.toggle("home-stage-active", window.scrollY >= threshold);
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

    function initCoverAnimation() {
        const canvas = $("#cover-canvas");
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const nodes = [
            { x: 0.12, y: 0.28, label: "scan" },
            { x: 0.26, y: 0.62, label: "gdb" },
            { x: 0.42, y: 0.34, label: "afl++" },
            { x: 0.62, y: 0.67, label: "repo" },
            { x: 0.78, y: 0.26, label: "linux" },
            { x: 0.9, y: 0.58, label: "ctf" }
        ];
        const links = [[0, 2], [0, 1], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]];
        const terminals = [
            { x: 0.05, y: 0.12, w: 0.32, h: 0.26, lines: ["$ nmap -sV target", "$ afl-fuzz ./parser", "$ gdb ./challenge"] },
            { x: 0.68, y: 0.38, w: 0.28, h: 0.28, lines: ["0x401080 <main>", "mov rbp, rsp", "call check_flag"] }
        ];
        let width = 0;
        let height = 0;
        let frameId = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = Math.max(1, Math.floor(rect.width));
            height = Math.max(1, Math.floor(rect.height));
            canvas.width = Math.floor(width * ratio);
            canvas.height = Math.floor(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
        };

        const point = (node) => ({ x: node.x * width, y: node.y * height });

        const drawTerminal = (terminal, time, strokeColor, textColor) => {
            const x = terminal.x * width;
            const y = terminal.y * height;
            const terminalWidth = terminal.w * width;
            const terminalHeight = terminal.h * height;

            context.save();
            context.translate(Math.sin(time * 0.001 + x) * 2, Math.cos(time * 0.001 + y) * 2);
            context.strokeStyle = strokeColor;
            context.lineWidth = 3;
            context.strokeRect(x, y, terminalWidth, terminalHeight);
            context.beginPath();
            context.moveTo(x, y + 34);
            context.lineTo(x + terminalWidth, y + 31 + Math.sin(time * 0.002) * 2);
            context.stroke();

            context.fillStyle = textColor;
            context.font = "14px JetBrains Mono, monospace";
            terminal.lines.forEach((line, index) => {
                const visibleChars = Math.max(1, Math.floor(((time / 70) + index * 9) % (line.length + 8)));
                context.fillText(line.slice(0, visibleChars), x + 18, y + 68 + index * 33);
            });
            context.restore();
        };

        const drawNetwork = (time, linkColor, strokeColor, packetColor, nodeFillColor, textColor) => {
            links.forEach(([fromIndex, toIndex], index) => {
                const from = point(nodes[fromIndex]);
                const to = point(nodes[toIndex]);
                const wobble = Math.sin(time * 0.0015 + index) * 12;
                const middleX = (from.x + to.x) / 2;
                const middleY = (from.y + to.y) / 2 + wobble;

                context.strokeStyle = linkColor;
                context.lineWidth = 3;
                context.beginPath();
                context.moveTo(from.x, from.y);
                context.quadraticCurveTo(middleX, middleY, to.x, to.y);
                context.stroke();

                const progress = ((time * 0.00018 + index * 0.17) % 1);
                const packetX = (1 - progress) * (1 - progress) * from.x + 2 * (1 - progress) * progress * middleX + progress * progress * to.x;
                const packetY = (1 - progress) * (1 - progress) * from.y + 2 * (1 - progress) * progress * middleY + progress * progress * to.y;
                context.fillStyle = packetColor;
                context.beginPath();
                context.arc(packetX, packetY, 4.5, 0, Math.PI * 2);
                context.fill();
            });

            nodes.forEach((node, index) => {
                const { x, y } = point(node);
                const pulse = 1 + Math.sin(time * 0.003 + index) * 0.14;
                context.strokeStyle = index % 2 ? strokeColor : packetColor;
                context.fillStyle = nodeFillColor;
                context.lineWidth = 3;
                context.beginPath();
                context.arc(x, y, 25 * pulse, 0, Math.PI * 2);
                context.fill();
                context.stroke();
                context.fillStyle = textColor;
                context.font = "12px JetBrains Mono, monospace";
                context.textAlign = "center";
                context.fillText(node.label, x, y + 4);
            });
        };

        const drawScanlines = (time, strokeColor) => {
            context.strokeStyle = strokeColor;
            context.lineWidth = 2;
            for (let index = 0; index < 7; index += 1) {
                const y = ((time * 0.035 + index * 96) % (height + 120)) - 60;
                context.beginPath();
                context.moveTo(width * 0.08, y);
                context.bezierCurveTo(width * 0.34, y + 36, width * 0.62, y - 42, width * 0.94, y + 20);
                context.stroke();
            }
        };

        const render = (time = 0) => {
            const isDark = document.body.classList.contains("dark-mode");
            const backgroundColor = isDark ? "#0b0d10" : "#fff";
            const inkColor = isDark ? "rgba(237, 240, 244, 0.58)" : "rgba(5, 5, 5, 0.46)";
            const strongInkColor = isDark ? "rgba(237, 240, 244, 0.84)" : "rgba(5, 5, 5, 0.74)";
            const redColor = isDark ? "rgba(255, 77, 90, 0.9)" : "rgba(215, 0, 0, 0.88)";
            const redLineColor = isDark ? "rgba(255, 77, 90, 0.24)" : "rgba(215, 0, 0, 0.2)";
            const nodeFillColor = isDark ? "rgba(20, 23, 28, 0.78)" : "rgba(255, 255, 255, 0.78)";
            const textColor = isDark ? "rgba(237, 240, 244, 0.72)" : "rgba(5, 5, 5, 0.72)";

            context.clearRect(0, 0, width, height);
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, width, height);
            drawScanlines(time, redLineColor);
            terminals.forEach((terminal) => drawTerminal(terminal, time, strongInkColor, textColor));
            drawNetwork(time, inkColor, strongInkColor, redColor, nodeFillColor, textColor);

            if (!reducedMotion) {
                frameId = requestAnimationFrame(render);
            }
        };

        resize();
        render();
        window.addEventListener("resize", resize);
        if (reducedMotion) return;
        frameId = requestAnimationFrame(render);

        window.addEventListener("pagehide", () => {
            if (frameId) cancelAnimationFrame(frameId);
        });
    }

    async function loadBlogOnce() {
        if (blogLoaded) return;
        blogLoaded = true;
        await loadRepoArticles();
    }

    async function loadRepoArticles() {
        renderRepoSource();
        renderBlogLoading();
        try {
            const repos = await fetchRepos();
            setStatus("#blog-status", "");
            renderRepoArticles(repos);
        } catch (error) {
            console.warn("GitHub repo article load failed:", error);
            setStatus("#blog-status", "GitHub repositories are unavailable right now.");
            renderRepoArticles([]);
        }
    }

    function renderRepoSource() {
        const container = $("#blog-breadcrumbs");
        if (!container) return;
        container.textContent = `github.com/${githubUser} / public repositories`;
    }

    function renderBlogLoading() {
        const list = $("#blog-list");
        if (list) list.innerHTML = '<div class="status-message">Loading public repositories...</div>';
    }

    function renderRepoArticles(repos) {
        const list = $("#blog-list");
        if (!list) return;

        const sorted = sortRepos(repos);
        if (!sorted.length) {
            list.innerHTML = '<div class="status-message">No public repositories are available yet.</div>';
            return;
        }

        list.innerHTML = "";
        sorted.forEach((repo) => {
            const meta = [
                repo.language || "Code",
                `${Number(repo.stargazers_count || 0)} stars`,
                `Updated ${formatDate(repo.pushed_at || repo.updated_at)}`
            ].join(" | ");

            list.append(createBlogRow({
                icon: "repo",
                title: repo.name,
                meta,
                kind: "public",
                onClick: () => openRepoArticle(repo)
            }));
        });
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

    async function openRepoArticle(repo) {
        setPost(repo.name, `GitHub public repository | Updated ${formatDate(repo.pushed_at || repo.updated_at)}`);
        goTo("blog-post");

        try {
            renderMarkdown(await fetchRepoReadme(repo.name));
        } catch (error) {
            console.warn("Repository README load failed:", error);
            renderRepoSummary(repo);
        }
    }

    async function fetchRepoReadme(repoName) {
        const contentsUrl = `https://api.github.com/repos/${githubUser}/${repoName}/contents`;
        const contentsResponse = await fetch(contentsUrl, { headers: { Accept: "application/vnd.github+json" } });
        if (!contentsResponse.ok) throw new Error(`Repo contents ${contentsResponse.status}`);

        const contents = await contentsResponse.json();
        if (!Array.isArray(contents)) throw new Error("Repository root did not return a file list.");

        const readme = contents.find((item) => {
            return item.type === "file" && /^readme(?:\.[a-z0-9._-]+)?$/i.test(item.name);
        });
        if (!readme?.download_url) throw new Error("No README file found in repository root.");

        const readmeResponse = await fetch(readme.download_url);
        if (!readmeResponse.ok) throw new Error(`README file ${readmeResponse.status}`);
        return readmeResponse.text();
    }

    function renderRepoSummary(repo) {
        const content = $("#post-content");
        if (!content) return;

        const description = repo.description || "No repository description is available.";
        content.innerHTML = `
            <p>${escapeHtml(description)}</p>
            <p>
                <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer">
                    Open this public repository on GitHub
                </a>
            </p>
        `;
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
        renderPostMessage("Open Blog and select a public repository to read.");
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
        if (cachedRepos) return cachedRepos;

        const url = `https://api.github.com/users/${githubUser}/repos?sort=pushed&per_page=100`;
        const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });

        if (!response.ok) throw new Error(`GitHub API ${response.status}`);

        const repos = await response.json();
        cachedRepos = Array.isArray(repos) ? repos.filter((repo) => !repo.fork && !repo.private) : [];
        return cachedRepos;
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
