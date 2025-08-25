// js/main.js
document.addEventListener("DOMContentLoaded", () => {
    // ————————————— 1. 主題（深/淺）持久化切換 —————————————
    const modeBtn = document.getElementById("dark-toggle");
    const body = document.body;

    // 初始加載時設置模式
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

    // ————————————— 2. SPA 分頁切換 —————————————
    const navLinks = document.querySelectorAll(".nav-link");
    const views = document.querySelectorAll(".view");

    navLinks.forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const id = link.getAttribute("href").slice(1);
            switchView(id);
            // 更新 URL hash
            window.location.hash = id;
        });
    });
    
    // 根據 URL hash 初始顯示頁面
    const initialHash = window.location.hash.slice(1) || 'home';
    switchView(initialHash);


    function switchView(id) {
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
        views.forEach(v => v.classList.toggle("active", v.id === id));
        if (id === "home") startTypewriter();
    }


    // ————————————— 3. 打字機效果 —————————————
    const phrases = [
      "學生｜開發者｜喜歡 CTF 與系統開發",
      "熱衷於學習 Rust、Ghidra、x86-64 組語",
      "未來想挑戰系統底層與資安領域"
    ];
    let pIdx = 0, cIdx = 0, deleting = false, timerId;
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
        if (typer) typer.textContent = "";
        typeStep();
    }
    
    if(initialHash === 'home') startTypewriter();


    // ————————————— 4. Blog 列表與文章詳細 —————————————
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
                a.innerHTML = `
                  <h3>${post.title}</h3>
                  <div class="meta">${post.readingTime} · ${post.date}</div>
                `;
                a.addEventListener('click', e => {
                    e.preventDefault();
                    loadPost(post);
                });
                blogListEl.appendChild(a);
            });
        });

    function loadPost(post) {
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-meta').textContent = `${post.readingTime} · Published: ${post.date}`;
        
        const contentEl = document.getElementById('post-content');
        contentEl.innerHTML = ''; // 清空舊內容
        
        // 使用 iframe 嵌入 HackMD
        const iframe = document.createElement('iframe');
        iframe.src = post.hackmdUrl; // JSON 裡需要有 hackmdUrl 欄位
        contentEl.appendChild(iframe);

        switchView('blog-post');
    }

    document.getElementById('back-to-blog').addEventListener('click', () => {
        switchView('blog');
    });
});