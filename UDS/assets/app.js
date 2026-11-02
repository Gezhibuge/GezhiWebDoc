/* 中文文档站 · 交互脚本：主题、抽屉导航、搜索弹层、视频播放、图片放大、目录高亮 */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'doc-theme';

  /* ------------------------------ 主题 ------------------------------ */
  function applyTheme(t, save) {
    var theme = t === 'slate' ? 'slate' : 'paper';
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'slate' ? '#0e0f0b' : '#f2eee5');
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.themeBtn === theme));
    });
    if (save) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (e) {}
    }
  }

  var saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (e) {}
  applyTheme(root.getAttribute('data-theme') || saved || 'paper', false);

  document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.themeBtn, true);
    });
  });

  /* --------------------------- 移动端抽屉 --------------------------- */
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('overlay');
  var menuBtn = document.getElementById('menu-btn');

  function setDrawer(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('open', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setDrawer(!sidebar.classList.contains('open'));
    });
  }
  if (overlay) {
    overlay.addEventListener('click', function () {
      setDrawer(false);
    });
  }

  /* ---------------------------- 视频播放 ---------------------------- */
  document.querySelectorAll('.video-embed').forEach(function (box) {
    var btn = box.querySelector('.video-poster');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var bvid = box.dataset.bvid;
      var iframe = document.createElement('iframe');
      iframe.src =
        'https://player.bilibili.com/player.html?bvid=' +
        encodeURIComponent(bvid) +
        '&page=1&high_quality=1&danmaku=0&autoplay=1&muted=0';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      var frame = box.querySelector('.video-frame');
      frame.innerHTML = '';
      frame.appendChild(iframe);
    });
  });

  /* ---------------------------- 目录高亮 ---------------------------- */
  var tocLinks = document.querySelectorAll('.md-nav--secondary a[data-toc]');
  if (tocLinks.length) {
    var onScroll = function () {
      var current = tocLinks[0];
      tocLinks.forEach(function (a) {
        var el = document.getElementById(a.dataset.toc);
        if (el && el.getBoundingClientRect().top <= 140) current = a;
      });
      tocLinks.forEach(function (a) {
        a.classList.toggle('md-nav__link--active', a === current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------- 图片放大 ---------------------------- */
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    document.querySelectorAll('figure img').forEach(function (el) {
      el.addEventListener('click', function () {
        lbImg.src = el.src;
        lbImg.alt = el.alt || '';
        lightbox.classList.add('open');
      });
    });
    lightbox.addEventListener('click', function () {
      lightbox.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lightbox.classList.remove('open');
    });
  }

  /* ------------------------------ 搜索 ------------------------------ */
  var modal = document.getElementById('search-modal');
  var input = document.getElementById('search-input');
  var list = document.getElementById('search-results');
  var searchBtn = document.getElementById('search-btn');
  var active = -1;

  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var low = function (s) {
    return (s || '').toLowerCase();
  };

  function openSearch() {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      input.focus();
      input.select();
    }, 10);
  }
  function closeSearch() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    active = -1;
  }

  function highlight() {
    items().forEach(function (a, i) {
      a.classList.toggle('active', i === active);
      if (i === active && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    });
  }

  function items() {
    return list ? Array.prototype.slice.call(list.querySelectorAll('a')) : [];
  }

  function render(q) {
    if (!list) return;
    var query = q.trim().toLowerCase();
    if (!query) {
      list.innerHTML = '';
      active = -1;
      return;
    }
    var terms = query.split(/\s+/).filter(Boolean);
    var hits = [];
    (window.DOC_SEARCH || []).forEach(function (page) {
      page.h.forEach(function (h) {
        var hay = low(page.t + ' ' + h.t + ' ' + h.s);
        var score = 0;
        var ok = true;
        for (var i = 0; i < terms.length; i++) {
          var t = terms[i];
          var at = hay.indexOf(t);
          if (at < 0) {
            ok = false;
            break;
          }
          score += 10;
          if (low(h.t).indexOf(t) >= 0) score += 40;
          if (low(page.t).indexOf(t) >= 0) score += 18;
          if (at === 0) score += 6;
        }
        if (ok) hits.push({ page: page, h: h, score: score });
      });
    });
    hits.sort(function (a, b) {
      return b.score - a.score;
    });
    var top = hits.slice(0, 24);

    if (!top.length) {
      list.innerHTML =
        '<li><div class="md-search-empty">没有找到相关内容。换个关键词试试。</div></li>';
      active = -1;
      return;
    }
    list.innerHTML = top
      .map(function (r) {
        var href = r.page.u + (r.h.i ? '#' + r.h.i : '');
        return (
          '<li><a href="' +
          esc(href) +
          '"><span class="s-title">' +
          esc(r.h.t) +
          '</span><span class="s-page">' +
          esc(r.h.i ? r.page.t : '本页') +
          '</span>' +
          (r.h.s ? '<span class="s-snippet">' + esc(r.h.s) + '</span>' : '') +
          '</a></li>'
        );
      })
      .join('');
    active = 0;
    highlight();
  }

  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeSearch();
    });
  }
  if (input) {
    input.addEventListener('input', function () {
      render(input.value);
    });
    input.addEventListener('keydown', function (e) {
      var all = items();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        active = Math.min(active + 1, all.length - 1);
        highlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        active = Math.max(active - 1, 0);
        highlight();
      } else if (e.key === 'Enter') {
        var pick = all[active] || all[0];
        if (pick) window.location.href = pick.getAttribute('href');
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    var el = document.activeElement || {};
    var inField = /input|textarea|select/i.test(el.tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal && modal.classList.contains('open') ? closeSearch() : openSearch();
      return;
    }
    if (e.key === '/' && !inField && !(modal && modal.classList.contains('open'))) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === 'Escape') {
      closeSearch();
      setDrawer(false);
    }
  });

  // 支持 ?q=关键词 直接唤起搜索
  var m = location.search.match(/[?&]q=([^&]+)/);
  if (m) {
    openSearch();
    input.value = decodeURIComponent(m[1].replace(/\+/g, ' '));
    render(input.value);
  }
})();
