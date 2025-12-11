document.addEventListener("DOMContentLoaded", () => {
    let timerId;

    const modeBtn = document.getElementById("dark-toggle");
    const body = document.body;
    const savedMode = localStorage.getItem("dark-mode") === "true";
    body.classList.toggle("dark-mode", savedMode);
    body.classList.toggle("light-mode", !savedMode);
    updateToggle();
    modeBtn.addEventListener("click", () => {
        const isDark = body.classList.toggle("dark-mode");
        body.classList.toggle("light-mode", !isDark);
        localStorage.setItem("dark-mode", isDark);
        updateToggle();
    });
    function updateToggle() {
        modeBtn.textContent = body.classList.contains("dark-mode") ? "☀️" : "🌙";
    }

    const navLinks = document.querySelectorAll(".nav-link");
    const views = document.querySelectorAll(".view");

    navLinks.forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const id = link.getAttribute("href").slice(1);
            switchView(id);
            window.location.hash = id;
        });
    });
    
    const initialHash = window.location.hash.slice(1) || 'home';
    switchView(initialHash);

    function switchView(id) {
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
        views.forEach(v => v.classList.toggle("active", v.id === id));
        clearTimeout(timerId);

        if (id === "home") {
            setTimeout(startTypewriter, 100);
        }
    }

    const phrases = [
      "學生｜開發者｜喜歡 CTF 與系統開發",
      "熱衷於學習 Rust、Ghidra、x86-64 組語",
      "未來想挑戰系統底層與資安領域"
    ];

    let pIdx = 0, cIdx = 0, deleting = false; 
    const typer = document.getElementById("typewriter");

    function typeStep() {
        if (!typer) return;
        const text = phrases[pIdx];
        if (!deleting) {
            typer.textContent = text.slice(0, ++cIdx);
            if (cIdx === text.length) {
                deleting = true;
                timerId = setTimeout(typeStep, 2000);
            } else {
                timerId = setTimeout(typeStep, 100);
            }
        } else {
            typer.textContent = text.slice(0, --cIdx);
            if (cIdx === 0) {
                deleting = false;
                pIdx = (pIdx + 1) % phrases.length;
                timerId = setTimeout(typeStep, 500);
            } else {
                timerId = setTimeout(typeStep, 50);
            }
        }
    }

    function startTypewriter() {
        clearTimeout(timerId);
        pIdx = 0; cIdx = 0; deleting = false;
        if (typer) {
            typer.textContent = "";
            typeStep();
        }
    }

    if (window.marked) {
        window.marked.setOptions({ mangle: false, headerIds: true, breaks: true });
    }

    const repoConfig = {
        owner: 'Jason-0902',
        repo: 'Pwn-college-writeup',
        contentDir: '' // set to a folder path (e.g. 'notes') if posts live in a subfolder
    };
    const blogListEl = document.getElementById('blog-list');
    let cachedPosts = [];
    const postsByPath = new Map();
    const dirSet = new Set();
    let currentPath = repoConfig.contentDir;

    initBlog();

    async function initBlog() {
        if (!blogListEl) return;
        blogListEl.innerHTML = '<p>載入 GitHub 文章中...</p>';
        try {
            cachedPosts = await fetchPostsFromGitHub();
            cachedPosts.forEach(p => postsByPath.set(p.path, p));
            buildDirSetFromPosts(cachedPosts);
            renderBrowser(currentPath);
        } catch (err) {
            console.error('Failed to load posts from GitHub', err);
            blogListEl.innerHTML = '<p>GitHub 文章載入失敗，改用預設列表。</p>';
            fallbackPostsFromJson();
        }
    }

    function buildDirSetFromPosts(posts) {
        dirSet.clear();
        posts.forEach(post => {
            let dir = getDirname(post.path);
            while (dir) {
                dirSet.add(dir);
                dir = getDirname(dir);
            }
        });
    }

    function renderPostList(posts) {
        if (!blogListEl) return;
        blogListEl.innerHTML = '';
        posts.forEach(post => {
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'blog-item';
            const metaPieces = [post.readingTime, post.date].filter(Boolean).join(' · ') || 'Open to read';
            a.innerHTML = `<h3>${post.title}</h3><div class="meta">${metaPieces}</div>`;
            a.addEventListener('click', e => { e.preventDefault(); loadPost(post); });
            blogListEl.appendChild(a);
        });
    }

    function renderBrowser(path) {
        if (!blogListEl) return;
        blogListEl.innerHTML = '';

        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'browser-breadcrumb meta';
        breadcrumb.textContent = path ? `/${path}` : '/';
        blogListEl.appendChild(breadcrumb);

        if (path) {
            const up = document.createElement('a');
            up.href = '#';
            up.className = 'blog-item';
            up.innerHTML = `<h3>..</h3><div class="meta">返回上一層</div>`;
            up.addEventListener('click', e => { e.preventDefault(); navigateUp(); });
            blogListEl.appendChild(up);
        }

        const subdirs = getImmediateSubdirs(path);
        if (subdirs.length) {
            const folderLabel = document.createElement('div');
            folderLabel.className = 'browser-section';
            folderLabel.textContent = 'Folders';
            blogListEl.appendChild(folderLabel);

            subdirs.forEach(dir => {
                const a = document.createElement('a');
                a.href = '#';
                a.className = 'blog-item';
                a.innerHTML = `<h3>📁 ${dir.split('/').pop()}</h3><div class="meta">${dir}</div>`;
                a.addEventListener('click', e => { e.preventDefault(); navigateTo(dir); });
                blogListEl.appendChild(a);
            });
        }

        const files = cachedPosts.filter(p => getDirname(p.path) === path);
        if (files.length) {
            const fileLabel = document.createElement('div');
            fileLabel.className = 'browser-section';
            fileLabel.textContent = path ? `Files in /${path}` : 'Files in /';
            blogListEl.appendChild(fileLabel);

            files.forEach(post => {
                const a = document.createElement('a');
                a.href = '#';
                a.className = 'blog-item';
                const metaPieces = [post.readingTime, post.date].filter(Boolean).join(' · ') || 'Open to read';
                a.innerHTML = `<h3>${post.title}</h3><div class="meta">${metaPieces}</div>`;
                a.addEventListener('click', e => { e.preventDefault(); loadPost(post); });
                blogListEl.appendChild(a);
            });
        }

        if (!subdirs.length && !files.length) {
            const empty = document.createElement('p');
            empty.textContent = '這個資料夾沒有 Markdown 檔案。';
            blogListEl.appendChild(empty);
        }
    }

    function navigateTo(dir) {
        currentPath = dir;
        renderBrowser(currentPath);
    }

    function navigateUp() {
        currentPath = getDirname(currentPath);
        renderBrowser(currentPath);
    }

    function getImmediateSubdirs(path) {
        const prefix = path ? `${path}/` : '';
        const dirs = [];
        dirSet.forEach(dir => {
            if (!dir.startsWith(prefix)) return;
            const rest = dir.slice(prefix.length);
            if (rest && !rest.includes('/')) dirs.push(dir);
        });
        return dirs.sort();
    }

    async function fetchPostsFromGitHub() {
        const branch = await fetchDefaultBranch();
        const tree = await fetchRepoTree(branch);
        const markdownFiles = tree
            .filter(item => item.type === 'blob' && item.path.endsWith('.md'))
            .filter(item => item.path.toLowerCase() !== 'readme.md')
            .filter(item => repoConfig.contentDir ? item.path.startsWith(`${repoConfig.contentDir}/`) : true);

        if (markdownFiles.length === 0) {
            throw new Error('No markdown files found in repository.');
        }

        const posts = [];
        for (const file of markdownFiles) {
            const rawUrl = buildRawUrl(branch, file.path);
            let mdText = '';
            let meta = {};
            try {
                mdText = await fetch(rawUrl).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.text();
                });
                meta = parseFrontMatter(mdText);
            } catch (err) {
                console.warn(`Failed to fetch ${file.path}:`, err);
            }

            const title = meta.title || extractTitleFromMd(mdText) || formatTitleFromPath(file.path);
            const date = meta.date || deriveDateFromPath(file.path);
            const readingTime = mdText ? estimateReadingTime(mdText) : 'Open to read';

            posts.push({ title, date, readingTime, rawUrl, path: file.path, branch });
        }

        return posts.sort((a, b) => {
            if (a.date && b.date) return new Date(b.date) - new Date(a.date);
            return a.title.localeCompare(b.title);
        });
    }

    async function fetchDefaultBranch() {
        const res = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}`);
        if (!res.ok) throw new Error(`Repo metadata failed: ${res.status}`);
        const data = await res.json();
        return data.default_branch || 'main';
    }

    async function fetchRepoTree(branch) {
        const res = await fetch(`https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/git/trees/${branch}?recursive=1`);
        if (!res.ok) throw new Error(`Repo tree failed: ${res.status}`);
        const data = await res.json();
        return data.tree || [];
    }

    function buildRawUrl(branch, path) {
        return `https://raw.githubusercontent.com/${repoConfig.owner}/${repoConfig.repo}/${branch}/${path}`;
    }

    function formatTitleFromPath(path) {
        const name = path.split('/').pop().replace(/\.md$/i, '');
        const words = name.replace(/[_-]+/g, ' ').trim();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    function getDirname(path) {
        const parts = path.split('/');
        parts.pop();
        return parts.join('/');
    }

    function deriveDateFromPath(path) {
        const match = path.match(/(20\d{2}-\d{2}-\d{2})/);
        return match ? match[1] : '';
    }

    function parseFrontMatter(mdText) {
        if (!mdText.startsWith('---')) return {};
        const end = mdText.indexOf('---', 3);
        if (end === -1) return {};
        const block = mdText.slice(3, end).trim();
        return block.split('\n').reduce((acc, line) => {
            const [key, ...rest] = line.split(':');
            if (!key || rest.length === 0) return acc;
            acc[key.trim()] = rest.join(':').trim();
            return acc;
        }, {});
    }

    function extractTitleFromMd(mdText) {
        const heading = mdText.match(/^#\s+(.+)/m);
        return heading ? heading[1].trim() : '';
    }

    function estimateReadingTime(mdText) {
        const words = mdText.trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.round(words / 200));
        return `${minutes} min read`;
    }

    async function loadPost(post) {
        document.getElementById('post-title').textContent = post.title;
        const contentEl = document.getElementById('post-content');
        const metaEl = document.getElementById('post-meta');
        contentEl.innerHTML = '<p>載入文章中...</p>';
        metaEl.textContent = '';

        if (post.rawUrl) {
            try {
                const mdText = await fetch(post.rawUrl).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.text();
                });
                const html = window.marked ? window.marked.parse(mdText) : `<pre>${escapeHtml(mdText)}</pre>`;
                contentEl.innerHTML = html;
                metaEl.textContent = `${estimateReadingTime(mdText)}${post.date ? ` · Published: ${post.date}` : ''}`;
            } catch (err) {
                console.error('Failed to load post content', err);
                contentEl.innerHTML = '<p>載入文章內容失敗。</p>';
            }
        } else if (post.hackmdUrl) {
            const iframe = document.createElement('iframe');
            iframe.src = post.hackmdUrl;
            contentEl.innerHTML = '';
            contentEl.appendChild(iframe);
            metaEl.textContent = post.date ? `Published: ${post.date}` : '';
        } else {
            contentEl.innerHTML = '<p>文章連結不存在。</p>';
        }

        switchView('blog-post');
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function fallbackPostsFromJson() {
        fetch('posts/posts.json')
            .then(res => res.json())
            .then(blogPosts => {
                cachedPosts = blogPosts;
                renderPostList(blogPosts);
            })
            .catch(err => {
                console.error('Fallback posts load failed', err);
                if (blogListEl) blogListEl.innerHTML = '<p>沒有可用的文章。</p>';
            });
    }
    
    document.getElementById('back-to-blog').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('blog');
        window.location.hash = 'blog';
    });
});
