/* ==========================================================================
   UE5 文档库 · 站点脚本
   主题切换（与三份文档共用 doc-theme 键）、移动端菜单、页脚年份
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'doc-theme';
  var THEMES = ['paper', 'slate'];
  var COLOR = { paper: '#f2eee5', slate: '#0e0f0b' };

  /* ----------------------------- 主题 ----------------------------- */

  function normalize(value) {
    return THEMES.indexOf(value) > -1 ? value : 'paper';
  }

  function applyTheme(name, persist) {
    var theme = normalize(name);
    root.classList.add('theme-swapping');
    root.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', COLOR[theme]);

    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-theme-btn') === theme));
    });

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        root.classList.remove('theme-swapping');
      });
    });

    if (persist) {
      try {
        localStorage.setItem(KEY, theme);
      } catch (err) {
        /* 隐私模式下忽略 */
      }
    }
  }

  var saved = 'paper';
  try {
    saved = normalize(localStorage.getItem(KEY) || root.getAttribute('data-theme') || 'paper');
  } catch (err) {
    saved = normalize(root.getAttribute('data-theme'));
  }
  applyTheme(saved, false);

  document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.getAttribute('data-theme-btn'), true);
    });
  });

  /* --------------------------- 移动端菜单 --------------------------- */

  var menu = document.querySelector('.menu');
  var opener = document.querySelector('[data-menu-open]');

  function setMenu(open) {
    if (!menu) return;
    menu.setAttribute('data-open', open ? 'true' : 'false');
    if (opener) opener.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = menu.querySelector('a');
      if (first) first.focus();
    } else if (opener) {
      opener.focus();
    }
  }

  if (menu && opener) {
    opener.addEventListener('click', function () {
      setMenu(menu.getAttribute('data-open') !== 'true');
    });

    menu.querySelectorAll('[data-menu-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        setMenu(false);
      });
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMenu(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.getAttribute('data-open') === 'true') setMenu(false);
    });
  }

  /* --------------------------- 页脚年份 --------------------------- */

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
