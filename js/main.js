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

    fetch('posts/posts.json')
        .then(res => res.json())
        .then(blogPosts => {
            const blogListEl = document.getElementById('blog-list');
            if (!blogListEl) return;
            blogListEl.innerHTML = '';
            blogPosts.forEach(post => {
                const a = document.createElement('a');
                a.href = '#';
                a.className = 'blog-item';
                a.innerHTML = `<h3>${post.title}</h3><div class="meta">${post.readingTime} · ${post.date}</div>`;
                a.addEventListener('click', e => { e.preventDefault(); loadPost(post); });
                blogListEl.appendChild(a);
            });
        });

    function loadPost(post) {
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-meta').textContent = `${post.readingTime} · Published: ${post.date}`;
        const contentEl = document.getElementById('post-content');
        contentEl.innerHTML = '';
        if (post.hackmdUrl) {
            const iframe = document.createElement('iframe');
            iframe.src = post.hackmdUrl;
            contentEl.appendChild(iframe);
        } else {
            contentEl.innerHTML = '<p>文章連結不存在。</p>';
        }
        switchView('blog-post');
    }
    
    document.getElementById('back-to-blog').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('blog');
        window.location.hash = 'blog';
    });
});