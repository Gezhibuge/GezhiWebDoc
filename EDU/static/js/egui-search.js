/* Easy Game UI 文档 · 中文站内搜索 */
(function () {
  "use strict";

  var DATA = window.EGUI_SEARCH || [];
  if (!DATA.length) return;

  var overlay, input, list;

  function norm(s) {
    return (s || "").toLowerCase();
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function build() {
    overlay = el("div", "egui-search-overlay");
    var box = el("div", "egui-search-box");
    input = el("input", "egui-search-input");
    input.type = "text";
    input.placeholder = "搜索文档…（Esc 关闭）";
    list = el("ul", "egui-search-list");
    var hint = el("div", "egui-search-hint", "输入关键词，回车打开第一条结果");
    box.appendChild(input);
    box.appendChild(list);
    box.appendChild(hint);
    overlay.appendChild(box);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);

    input.addEventListener("input", function () {
      render(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
      if (e.key === "Enter") {
        var first = list.querySelector("a");
        if (first) window.location.href = first.getAttribute("href");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      }
    });
  }

  function move(dir) {
    var links = [].slice.call(list.querySelectorAll("a"));
    if (!links.length) return;
    var i = links.findIndex(function (a) {
      return a.classList.contains("active");
    });
    if (i >= 0) links[i].classList.remove("active");
    i = (i + dir + links.length) % links.length;
    links[i].classList.add("active");
    links[i].scrollIntoView({ block: "nearest" });
  }

  function render(q) {
    var term = q.trim().toLowerCase();
    list.innerHTML = "";
    if (!term) {
      list.appendChild(el("li", "egui-search-empty", "试试输入「设置」「存档」「提示」等关键词"));
      return;
    }
    var results = [];
    DATA.forEach(function (page) {
      page.h.forEach(function (h) {
        var hay = norm(h.t + " " + h.s + " " + page.t);
        var idx = hay.indexOf(term);
        if (idx < 0) return;
        var score = 10;
        if (norm(h.t).indexOf(term) >= 0) score += 30;
        if (norm(page.t).indexOf(term) >= 0) score += 15;
        if (idx === 0) score += 5;
        results.push({ page: page, h: h, score: score });
      });
    });
    results.sort(function (a, b) {
      return b.score - a.score;
    });
    results = results.slice(0, 20);
    if (!results.length) {
      list.appendChild(el("li", "egui-search-empty", "没有找到相关内容。"));
      return;
    }
    results.forEach(function (r) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = r.page.u + (r.h.i ? "#" + r.h.i : "");
      var title = el("span", "s-title", r.h.t);
      var page = el("span", "s-page", " · " + r.page.t);
      var snip = el("span", "s-snippet", r.h.s || "");
      a.appendChild(title);
      a.appendChild(page);
      if (r.h.s) a.appendChild(snip);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function open() {
    if (!overlay) build();
    overlay.classList.add("open");
    input.value = "";
    render("");
    setTimeout(function () {
      input.focus();
    }, 10);
  }

  function close() {
    if (overlay) overlay.classList.remove("open");
  }

  function addButton() {
    var form = document.querySelector(".md-header__option");
    if (!form || document.querySelector(".egui-search-btn")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "md-header__button md-icon egui-search-btn";
    btn.title = "搜索（Ctrl+K）";
    btn.setAttribute("aria-label", "搜索");
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
    btn.addEventListener("click", open);
    form.parentNode.insertBefore(btn, form);
  }

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      open();
    }
    if (e.key === "Escape") close();
  });

  function fromHash() {
    var m = (location.hash || "").match(/^#q=(.+)$/);
    if (m) {
      open();
      input.value = decodeURIComponent(m[1]);
      render(input.value);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      addButton();
      fromHash();
    });
  } else {
    addButton();
    fromHash();
  }
})();


