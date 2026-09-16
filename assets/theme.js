(function () {
  'use strict';

  var KEY = 'ja-study-theme';
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function savedTheme() {
    try {
      var value = localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : '';
    } catch (error) {
      return '';
    }
  }

  function effectiveTheme() {
    return root.dataset.theme || (media && media.matches ? 'dark' : 'light');
  }

  function setTheme(theme, persist) {
    root.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem(KEY, theme); } catch (error) {}
    }
    updateControl();
  }

  function updateControl() {
    var button = document.getElementById('themeToggle');
    var dark = effectiveTheme() === 'dark';
    if (button) {
      button.setAttribute('aria-pressed', dark ? 'true' : 'false');
      button.setAttribute('title', dark ? '切换到日间模式' : '切换到夜间模式');
      button.innerHTML = '<span class="theme-symbol" aria-hidden="true">◐</span><span>' + (dark ? '日间' : '夜间') + '</span>';
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#182522' : '#4c827b';
  }

  var initial = savedTheme();
  if (initial) root.dataset.theme = initial;

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('themeToggle');
    if (button) {
      button.addEventListener('click', function () {
        setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark', true);
      });
    }
    updateControl();
  });

  if (media && media.addEventListener) {
    media.addEventListener('change', function () {
      if (!savedTheme()) updateControl();
    });
  }
})();
