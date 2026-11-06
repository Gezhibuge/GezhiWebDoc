/* Story Framework 5.2 中文文档 · 交互脚本（无外部依赖） */
(function () {
  "use strict";

  var THEME_KEY = "sf-theme";
  var root = document.documentElement;
  var body = document.body;

  /* ---------- 主题 ---------- */
  function currentTheme() {
    return body.getAttribute("data-md-color-scheme") === "default" ? "default" : "slate";
  }
  function applyTheme(theme, persist) {
    if (theme !== "default") theme = "slate";
    body.setAttribute("data-md-color-scheme", theme);
    root.setAttribute("data-theme", theme === "default" ? "paper" : "slate");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "default" ? "#f3eee3" : "#0f1116");
    document.querySelectorAll("[data-sf-theme]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-sf-theme") === theme ? "true" : "false");
    });
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* 忽略隐私模式限制 */ }
    }
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* 忽略 */ }
    applyTheme(saved === "default" ? "default" : "slate", false);
    document.querySelectorAll("[data-sf-theme]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyTheme(btn.getAttribute("data-sf-theme"), true);
      });
    });
  }

  /* ---------- 搜索 ---------- */
  var searchOverlay = null;
  var searchInput = null;
  var searchList = null;
  var lastFocus = null;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function highlight(text, term) {
    var safe = escapeHtml(text);
    if (!term) return safe;
    try {
      return safe.replace(new RegExp("(" + escapeRegExp(escapeHtml(term)) + ")", "gi"), "<mark>$1</mark>");
    } catch (e) {
      return safe;
    }
  }
  function buildSearch() {
    searchOverlay = document.createElement("div");
    searchOverlay.className = "sf-search-overlay";
    searchOverlay.setAttribute("role", "dialog");
    searchOverlay.setAttribute("aria-modal", "true");
    searchOverlay.setAttribute("aria-label", "搜索文档");

    var box = document.createElement("div");
    box.className = "sf-search-box";

    var head = document.createElement("div");
    head.className = "sf-search-head";
    head.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
    searchInput = document.createElement("input");
    searchInput.className = "sf-search-input";
    searchInput.type = "search";
    searchInput.placeholder = "搜索功能、节点、资产或教程…";
    searchInput.setAttribute("aria-label", "搜索关键词");
    searchInput.setAttribute("autocomplete", "off");
    var esc = document.createElement("span");
    esc.className = "sf-search-esc";
    esc.textContent = "Esc";
    head.appendChild(searchInput);
    head.appendChild(esc);

    searchList = document.createElement("ul");
    searchList.className = "sf-search-list";

    var hint = document.createElement("div");
    hint.className = "sf-search-hint";
    hint.innerHTML = "<span>↑↓ 选择 · Enter 打开 · Esc 关闭</span><span>中文 / English 均可</span>";

    box.appendChild(head);
    box.appendChild(searchList);
    box.appendChild(hint);
    searchOverlay.appendChild(box);
    document.body.appendChild(searchOverlay);

    searchOverlay.addEventListener("mousedown", function (e) {
      if (e.target === searchOverlay) closeSearch();
    });
    searchInput.addEventListener("input", function () { renderSearch(searchInput.value); });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
      if (e.key === "Enter") {
        var first = searchList.querySelector("a");
        if (first) window.location.href = first.getAttribute("href");
      }
      if (e.key === "ArrowDown") { e.preventDefault(); moveSearch(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); moveSearch(-1); }
    });
  }
  function data() {
    return Array.isArray(window.SF_SEARCH) ? window.SF_SEARCH : [];
  }
  function snippetAround(text, term) {
    var source = String(text || "");
    var idx = source.toLowerCase().indexOf(String(term || "").toLowerCase());
    if (idx < 0) return source.slice(0, 180);
    var start = Math.max(0, idx - 72);
    var end = Math.min(source.length, idx + term.length + 118);
    return (start > 0 ? "…" : "") + source.slice(start, end) + (end < source.length ? "…" : "");
  }
  function renderSearch(value) {
    var term = String(value || "").trim().toLowerCase();
    searchList.innerHTML = "";
    if (!term) {
      var tip = document.createElement("li");
      tip.className = "sf-search-empty";
      tip.textContent = "试试搜索「交互」「剧情抉择」「保存」「QTE」「输入映射」等关键词。";
      searchList.appendChild(tip);
      return;
    }
    var results = [];
    data().forEach(function (page) {
      var pageMatched = false;
      (page.h || []).forEach(function (heading) {
        var hay = [heading.t, heading.s, page.t].join(" ").toLowerCase();
        var idx = hay.indexOf(term);
        if (idx < 0) return;
        pageMatched = true;
        var score = 10;
        if (String(heading.t || "").toLowerCase().indexOf(term) >= 0) score += 40;
        if (String(page.t || "").toLowerCase().indexOf(term) >= 0) score += 18;
        if (idx === 0) score += 5;
        results.push({ page: page, heading: heading, score: score });
      });
      if (!pageMatched) {
        var full = String(page.full || page.d || "");
        var inFull = full.toLowerCase().indexOf(term) >= 0;
        var inTitle = String(page.t || "").toLowerCase().indexOf(term) >= 0;
        if (inFull || inTitle) {
          results.push({
            page: page,
            heading: {
              t: page.t,
              i: "",
              s: inFull ? snippetAround(full, term) : (page.d || ""),
            },
            score: inTitle ? 28 : 14,
          });
        }
      }
    });
    results.sort(function (a, b) { return b.score - a.score; });
    results = results.slice(0, 24);
    if (!results.length) {
      var empty = document.createElement("li");
      empty.className = "sf-search-empty";
      empty.textContent = "没有找到相关内容。可以换一个更短的关键词，或直接浏览左侧目录。";
      searchList.appendChild(empty);
      return;
    }
    results.forEach(function (r) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = r.page.u + (r.heading.i ? "#" + r.heading.i : "");
      var title = document.createElement("span");
      title.className = "s-title";
      title.innerHTML = highlight(r.heading.t || r.page.t, value.trim());
      if (r.heading.t !== r.page.t) {
        var pageName = document.createElement("span");
        pageName.className = "s-page";
        pageName.innerHTML = " · " + escapeHtml(r.page.t);
        a.appendChild(pageName);
      }
      if (r.heading.s) {
        var snip = document.createElement("span");
        snip.className = "s-snippet";
        snip.innerHTML = highlight(r.heading.s, value.trim());
        a.appendChild(snip);
      }
      li.appendChild(a);
      searchList.appendChild(li);
    });
  }
  function moveSearch(dir) {
    var links = Array.prototype.slice.call(searchList.querySelectorAll("a"));
    if (!links.length) return;
    var i = links.findIndex(function (a) { return a.classList.contains("active"); });
    if (i >= 0) links[i].classList.remove("active");
    i = (i + dir + links.length) % links.length;
    links[i].classList.add("active");
    links[i].scrollIntoView({ block: "nearest" });
  }
  function openSearch() {
    if (!searchOverlay) buildSearch();
    lastFocus = document.activeElement;
    searchOverlay.classList.add("open");
    searchInput.value = "";
    renderSearch("");
    setTimeout(function () { searchInput.focus(); }, 20);
  }
  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove("open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("keydown", function (e) {
    var isK = e.key && e.key.toLowerCase() === "k";
    if (isK && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === "Escape") {
      closeSearch();
      var drawer = document.getElementById("__drawer");
      if (drawer && drawer.checked) drawer.checked = false;
    }
  });
  document.querySelectorAll(".sf-search-trigger").forEach(function (btn) {
    btn.addEventListener("click", openSearch);
  });

  /* ---------- 移动端抽屉 ---------- */
  var drawer = document.getElementById("__drawer");
  if (drawer) {
    drawer.addEventListener("change", function () {
      document.body.classList.toggle("sf-drawer-open", drawer.checked);
    });
  }

  /* ---------- 右侧目录跟随 ---------- */
  function initToc() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".md-nav--secondary a[href^='#']"));
    if (!links.length) return;
    var map = {};
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute("href").slice(1));
      if (id) map[id] = a;
    });
    var headings = Array.prototype.slice.call(document.querySelectorAll(".md-content h2[id], .md-content h3[id]"));
    if (!("IntersectionObserver" in window)) return;
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      var bestId = null;
      var best = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > best) { best = visible[id]; bestId = id; }
      });
      if (bestId) {
        links.forEach(function (a) { a.classList.remove("md-nav__link--active"); });
        if (map[bestId]) map[bestId].classList.add("md-nav__link--active");
      }
    }, { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.1, 0.5, 1] });
    headings.forEach(function (h) { io.observe(h); });
  }

  /* ---------- 图片灯箱 ---------- */
  function initLightbox() {
    var box = document.createElement("div");
    box.className = "sf-lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "查看大图");
    var img = document.createElement("img");
    img.alt = "";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "sf-lightbox__close";
    close.setAttribute("aria-label", "关闭大图");
    close.textContent = "×";
    box.appendChild(img);
    box.appendChild(close);
    document.body.appendChild(box);

    function closeBox() {
      box.classList.remove("open");
      img.removeAttribute("src");
      document.body.style.overflow = "";
    }
    document.querySelectorAll(".sf-figure img").forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        img.src = thumb.currentSrc || thumb.src;
        img.alt = thumb.alt || "";
        img.style.width = "auto";
        function sizeLarge() {
          if (img.naturalWidth && img.naturalWidth < 640) {
            img.style.width = "min(680px, 90vw)";
          }
        }
        if (img.complete && img.naturalWidth) sizeLarge();
        else img.addEventListener("load", sizeLarge, { once: true });
        box.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target === close) closeBox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && box.classList.contains("open")) closeBox();
    });
  }

  /* ---------- 回到顶部 ---------- */
  function initTopButton() {
    var btn = document.querySelector(".md-top");
    if (!btn) return;
    function update() {
      if (window.scrollY > 480) btn.removeAttribute("hidden");
      else btn.setAttribute("hidden", "");
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 外链新窗口 + 复制代码 ---------- */
  function initMisc() {
    document.querySelectorAll('.md-content a[href^="http"]').forEach(function (a) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    document.querySelectorAll("pre > code").forEach(function (code) {
      var pre = code.parentNode;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sf-copy";
      btn.textContent = "复制";
      btn.addEventListener("click", function () {
        var text = code.innerText;
        function done() { btn.textContent = "已复制"; setTimeout(function () { btn.textContent = "复制"; }, 1300); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });
    document.querySelectorAll(".md-content a[href^='#']").forEach(function (a) {
      a.addEventListener("click", function () {
        if (drawer && drawer.checked) drawer.checked = false;
      });
    });
  }

  function init() {
    initTheme();

    var params = new URLSearchParams(window.location.search);
    var themeParam = params.get("theme");
    if (themeParam === "paper" || themeParam === "default") applyTheme("default", true);
    if (themeParam === "slate" || themeParam === "dark") applyTheme("slate", true);
    if (themeParam) {
      params.delete("theme");
      var qs = params.toString();
      try {
        history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
      } catch (e) { /* file:// 下部分浏览器可能限制，忽略 */ }
    }

    initToc();
    initLightbox();
    initTopButton();
    initMisc();

    var q = params.get("q");
    if (q) {
      openSearch();
      searchInput.value = q;
      renderSearch(q);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
