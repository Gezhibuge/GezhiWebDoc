/* 中文文档站 · 交互脚本：主题、抽屉导航、搜索弹层、视频播放、图片放大、目录高亮 */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'doc-theme';

  /* --------------------------- 滚动锁（共用） --------------------------- */
  /* 抽屉、搜索、图片放大都可能锁滚动；用一份登记表，谁关都不影响别人 */
  var scrollLocks = {};

  function lockScroll(key, on) {
    if (on) scrollLocks[key] = true;
    else delete scrollLocks[key];
    var locked = false;
    for (var k in scrollLocks) {
      if (Object.prototype.hasOwnProperty.call(scrollLocks, k)) locked = true;
    }
    document.body.style.overflow = locked ? 'hidden' : '';
  }

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
  var MOBILE_QUERY = window.matchMedia('(max-width: 960px)');

  function isMobileNav() {
    return !MOBILE_QUERY || MOBILE_QUERY.matches;
  }

  function setDrawer(open) {
    if (!sidebar) return;
    /* 宽屏下左侧导航本来就是常驻的，不允许再叠一层抽屉遮罩 */
    if (open && !isMobileNav()) open = false;
    sidebar.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('open', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    lockScroll('drawer', open);
    /* 抽屉收起时，屏幕外的导航不应该再被 Tab 到 */
    if ('inert' in sidebar) sidebar.inert = isMobileNav() && !open;
    if (open) {
      var first = sidebar.querySelector('.md-nav__link');
      if (first) first.focus();
    } else if (menuBtn && sidebar.contains(document.activeElement)) {
      menuBtn.focus();
    }
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setDrawer(!(sidebar && sidebar.classList.contains('open')));
    });
  }
  if (overlay) {
    overlay.addEventListener('click', function () {
      setDrawer(false);
    });
  }
  if (sidebar && isMobileNav() && 'inert' in sidebar) sidebar.inert = true;

  /* 视口跨过断点时收起抽屉，避免留下“锁滚动但看不到导航”的状态 */
  var onBreakpoint = function () {
    if (!sidebar) return;
    if (!isMobileNav()) {
      sidebar.inert = false;
      if (sidebar.classList.contains('open')) setDrawer(false);
    } else if ('inert' in sidebar) {
      sidebar.inert = !sidebar.classList.contains('open');
    }
  };
  if (MOBILE_QUERY) {
    if (MOBILE_QUERY.addEventListener) MOBILE_QUERY.addEventListener('change', onBreakpoint);
    else if (MOBILE_QUERY.addListener) MOBILE_QUERY.addListener(onBreakpoint);
  }

  /* ---------------------------- 视频播放 ---------------------------- */
  document.querySelectorAll('.video-embed').forEach(function (box) {
    var btn = box.querySelector('.video-poster');
    var frame = box.querySelector('.video-frame');
    if (!btn || !frame) return;
    btn.addEventListener('click', function () {
      var bvid = (box.getAttribute('data-bvid') || '').trim();
      if (!bvid) return;
      var iframe = document.createElement('iframe');
      iframe.src =
        'https://player.bilibili.com/player.html?bvid=' +
        encodeURIComponent(bvid) +
        '&page=1&high_quality=1&danmaku=0&autoplay=1&muted=0';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.setAttribute('title', (btn.getAttribute('aria-label') || 'B 站视频').replace(/^播放视频：/, ''));
      frame.innerHTML = '';
      frame.appendChild(iframe);
    });
  });

  /* ---------------------------- 目录高亮 ---------------------------- */
  var tocLinks = document.querySelectorAll('.md-nav--secondary a[data-toc]');
  if (tocLinks.length) {
    var headerEl = document.querySelector('.md-header');
    var rafPending = false;

    var syncToc = function () {
      rafPending = false;
      if (!tocLinks.length) return;
      var offset = (headerEl ? headerEl.getBoundingClientRect().height : 48) + 16;
      var current = tocLinks[0];
      tocLinks.forEach(function (a) {
        var el = document.getElementById(a.dataset.toc);
        if (el && el.getBoundingClientRect().top <= offset) current = a;
      });
      /* 滚到页底时，最后一段可能还没越过判定线，直接高亮最后一项 */
      var doc = document.documentElement;
      if (window.innerHeight + window.pageYOffset >= doc.scrollHeight - 2) {
        current = tocLinks[tocLinks.length - 1];
      }
      tocLinks.forEach(function (a) {
        var on = a === current;
        a.classList.toggle('md-nav__link--active', on);
        if (on) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    };

    var onScroll = function () {
      if (rafPending) return;
      rafPending = true;
      var run = function () {
        if (!rafPending) return;
        syncToc();
      };
      if (window.requestAnimationFrame) window.requestAnimationFrame(run);
      /* 后台标签页里 rAF 会暂停，用一个定时器兜底，避免目录停在旧位置 */
      setTimeout(run, 120);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    syncToc();
  }

  /* ---------------------------- 图片放大 ---------------------------- */
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    var lbLastFocus = null;

    if (!lightbox.hasAttribute('role')) {
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-modal', 'true');
      lightbox.setAttribute('aria-label', '图片预览（点击或按 Esc 关闭）');
    }
    lightbox.setAttribute('tabindex', '-1');

    var closeLightbox = function () {
      if (!lightbox.classList.contains('open')) return;
      lightbox.classList.remove('open');
      lockScroll('lightbox', false);
      if (lbImg) lbImg.removeAttribute('src');
      if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
    };

    var openLightbox = function (el) {
      if (!lbImg) return;
      lbLastFocus = el;
      lbImg.src = el.currentSrc || el.src;
      lbImg.alt = el.alt || '';
      lightbox.classList.add('open');
      lockScroll('lightbox', true);
      lightbox.focus();
    };

    document.querySelectorAll('figure img').forEach(function (el) {
      /* 图片也要能用键盘打开 */
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', '放大图片' + (el.alt ? '：' + el.alt : ''));
      el.addEventListener('click', function () {
        openLightbox(el);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openLightbox(el);
        }
      });
    });

    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  /* ------------------------------ 搜索 ------------------------------ */
  var modal = document.getElementById('search-modal');
  var input = document.getElementById('search-input');
  var list = document.getElementById('search-results');
  var searchBtn = document.getElementById('search-btn');
  var active = -1;
  var searchLastFocus = null;

  var esc = function (s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };
  var low = function (s) {
    return (s || '').toLowerCase();
  };
  var herePage = function () {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  };
  /* 把命中的关键词包成 <mark>，先转义再匹配（保证不会注入标签） */
  var markTerms = function (text, terms) {
    var safe = esc(text);
    if (!terms.length) return safe;
    var parts = terms
      .map(function (t) {
        return esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .filter(Boolean);
    if (!parts.length) return safe;
    try {
      return safe.replace(new RegExp('(' + parts.join('|') + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) {
      return safe;
    }
  };
  /* 命中位置太靠后时，从命中处截一段做摘要 */
  var buildSnippet = function (h, terms) {
    var text = h.x || h.s || '';
    if (!text) return '';
    var at = -1;
    for (var i = 0; i < terms.length; i++) {
      var pos = low(text).indexOf(terms[i]);
      if (pos >= 0 && (at < 0 || pos < at)) at = pos;
    }
    if (at <= 40) return h.s || text.slice(0, 110);
    var from = Math.max(0, at - 36);
    var win = text.slice(from, from + 110);
    if (from > 0) {
      /* 从命中处往前找最近的句号，摘要从一句完整的话开始 */
      for (var j = 0; j < 24 && j < win.length; j++) {
        if ('。；！？'.indexOf(win.charAt(j)) >= 0) {
          win = win.slice(j + 1);
          break;
        }
      }
      win = '…' + win.replace(/^\s+/, '');
    }
    return win;
  };

  function openSearch() {
    if (!modal) return;
    if (modal.classList.contains('open')) return;
    /* 部分浏览器点击按钮不会把它设为焦点，兜底回到搜索按钮本身 */
    searchLastFocus = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : searchBtn;
    modal.classList.add('open');
    if (searchBtn) searchBtn.setAttribute('aria-expanded', 'true');
    lockScroll('search', true);
    setTimeout(function () {
      if (!input || !modal.classList.contains('open')) return;
      input.focus();
      input.select();
      if (input.value.trim()) render(input.value);
    }, 10);
  }
  function closeSearch() {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    if (searchBtn) searchBtn.setAttribute('aria-expanded', 'false');
    lockScroll('search', false);
    active = -1;
    if (searchLastFocus && searchLastFocus.focus) searchLastFocus.focus();
  }

  function items() {
    return list ? Array.prototype.slice.call(list.querySelectorAll('a')) : [];
  }

  function highlight() {
    items().forEach(function (a, i) {
      var on = i === active;
      a.classList.toggle('active', on);
      a.setAttribute('aria-selected', String(on));
      if (on) {
        if (input) input.setAttribute('aria-activedescendant', a.id);
        if (a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
      }
    });
    if (active < 0 && input) input.removeAttribute('aria-activedescendant');
  }

  function render(q) {
    if (!list) return;
    var query = (q || '').trim().toLowerCase();
    if (!query) {
      list.innerHTML = '';
      active = -1;
      if (input) input.removeAttribute('aria-activedescendant');
      return;
    }
    var terms = query.split(/\s+/).filter(Boolean);
    var hits = [];
    (window.DOC_SEARCH || []).forEach(function (page) {
      (page.h || []).forEach(function (h) {
        var title = h.t || '';
        var body = h.x || h.s || '';
        var hay = low(page.t + ' ' + title + ' ' + body + ' ' + (h.s || ''));
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
          if (low(title).indexOf(t) >= 0) score += 40;
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
        '<li role="presentation"><div class="md-search-empty">没有找到相关内容。换个关键词试试。</div></li>';
      active = -1;
      if (input) input.removeAttribute('aria-activedescendant');
      return;
    }
    var currentPage = herePage();
    list.innerHTML = top
      .map(function (r, i) {
        var href = r.page.u + (r.h.i ? '#' + r.h.i : '');
        var samePage = r.page.u === currentPage;
        /* 页面级条目标“概览”，小节条目在其它页面时标页面名，本页标“本页” */
        var label = !r.h.i ? '概览' : samePage ? '本页' : r.page.t;
        var snippet = buildSnippet(r.h, terms);
        return (
          '<li role="presentation"><a id="search-opt-' +
          i +
          '" href="' +
          esc(href) +
          '" role="option" aria-selected="false"><span class="s-title">' +
          markTerms(r.h.t, terms) +
          '</span><span class="s-page">' +
          esc(label) +
          '</span>' +
          (snippet ? '<span class="s-snippet">' + markTerms(snippet, terms) + '</span>' : '') +
          '</a></li>'
        );
      })
      .join('');
    active = 0;
    highlight();
  }

  if (list) list.setAttribute('role', 'listbox');
  if (input) {
    input.setAttribute('aria-controls', 'search-results');
    input.setAttribute('aria-autocomplete', 'list');
  }

  if (searchBtn) {
    searchBtn.setAttribute('aria-haspopup', 'dialog');
    searchBtn.setAttribute('aria-expanded', 'false');
    searchBtn.addEventListener('click', function () {
      if (modal && modal.classList.contains('open')) closeSearch();
      else openSearch();
    });
  }
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeSearch();
    });
    /* 焦点留在弹层内，Tab 不会跑到背后的页面上 */
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = modal.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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
        active = all.length ? Math.min(active + 1, all.length - 1) : -1;
        highlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        active = Math.max(active - 1, 0);
        highlight();
      } else if (e.key === 'Home') {
        e.preventDefault();
        active = 0;
        highlight();
      } else if (e.key === 'End') {
        e.preventDefault();
        active = all.length - 1;
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
    var key = e.key || '';
    var inField = /input|textarea|select/i.test(el.tagName || '');
    var lbOpen = lightbox && lightbox.classList.contains('open');
    if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'k') {
      e.preventDefault();
      if (lbOpen) return;
      if (modal && modal.classList.contains('open')) closeSearch();
      else openSearch();
      return;
    }
    if (key === '/' && !inField && !lbOpen && !(modal && modal.classList.contains('open'))) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (key === 'Escape') {
      closeSearch();
      setDrawer(false);
    }
  });

  /* 支持 ?q=关键词 直接唤起搜索 */
  try {
    var m = location.search.match(/[?&]q=([^&]*)/);
    if (m) {
      openSearch();
      var q = decodeURIComponent(m[1].replace(/\+/g, ' '));
      if (input) {
        input.value = q;
        render(q);
      }
    }
  } catch (e) {}

  /* 左侧导航指向当前页面的那一项补上无障碍语义（右侧目录用 aria-current="location"） */
  document.querySelectorAll('.md-nav--primary .md-nav__link--active').forEach(function (a) {
    a.setAttribute('aria-current', 'page');
  });
})();
