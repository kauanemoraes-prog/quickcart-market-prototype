/**
 * Tab loading
 * Switching tabs shows a loading state for 1 second: the cart of the QuickCart Market logo runs in a hurry without leaving its place,
 * over the area below the tabs, which shows grey blocks in the shape of a page (a skeleton). The tabs of the top bar, which open
 * other pages, show it too before they go. It covers the tabs of the store page and of the Finance page.
 */

(function() {
  'use strict';

  var DURATION = 1000, FADE = 220;
    var TRIGGER = '.tabs__tab[data-tab], [data-nftab], [data-fin-tab]';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var overlay = null, timer = null;

  /** The new logo (the cart on colorful blobs) with the cart running in a hurry without leaving its place:
   * it bounces and leans forward, the wheels spin, and speed lines slip backwards behind it. */
  function marks() {
    var basket = 'M21.1 44.8Q20.0 41.0 24.0 41.0L106.0 41.0Q110.0 41.0 109.0 44.9L101.6 73.1Q100.6 77.0 96.6 77.0L34.4 77.0Q30.4 77.0 29.3 73.2Z';
    var rr = function(x, y, w, h, r) { return 'M' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + 'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) + 'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z'; };
    for (var i = 0; i < 4; i++) basket += rr(+(30.5 + i * 17.2).toFixed(1), 47.5, 13.6, 9, 2.6) + rr(+(34.5 + i * 15.8).toFixed(1), 60.5, 12.6, 9, 2.6);
    // A wheel is a white disc with two small holes in it (an even-odd path), so the background shows through them
    var circle = function(cx, cy, r) { return 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z'; };
    var wheel = function(cx, cls) { return '<g class="bn-wheel ' + cls + '"><path fill="#fff" fill-rule="evenodd" d="' + circle(cx, 98, 8) + circle(cx, 94.2, 2.4) + circle(cx, 101.8, 2.4) + '"/></g>'; };
    var lines = [[34, 26], [52, 18], [70, 28]].map(function(l, i) { return '<line class="bn-speed bn-speed--' + i + '" x1="' + (18 - l[1]) + '" y1="' + l[0] + '" x2="14" y2="' + l[0] + '" stroke="#7180AC" stroke-width="4" stroke-linecap="round"/>'; }).join('');
    return '<svg viewBox="-24 -6 168 132" aria-hidden="true"><g class="bn-blobs" opacity=".93">' +
      '<path d="M6 40C4 16 28 0 52 4C72 8 78 26 70 46C62 66 38 80 22 72C12 66 7 54 6 40Z" fill="#7180AC"/>' +
      '<path d="M42 22C46 4 76 -2 98 8C118 18 118 44 104 58C90 70 68 66 54 54C44 46 40 34 42 22Z" fill="#F5B400"/>' +
      '<path d="M54 56C70 44 96 46 110 62C122 78 108 106 84 112C62 116 46 100 46 82C46 70 48 62 54 56Z" fill="#3CA66A"/>' +
      '<path d="M4 70C16 58 40 62 52 78C62 94 52 114 30 116C10 116 -4 96 4 70Z" fill="#E8553D"/></g>' +
      lines +
      '<g class="bn-cart"><path d="M7 25H20L33 82H99" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + basket + '" fill="#fff" fill-rule="evenodd"/>' + wheel(43, 'bn-wheel--a') + wheel(92, 'bn-wheel--b') + '</g></svg>';
  }

  /** What is behind the cart while the tab loads: grey shimmering blocks in the shape of the page that is coming. Where the page has big
   * numbers and charts, the skeleton has cards and a chart in the same places. kind: table, overview, report, dashboard, finance or blank. */
  function skeleton(kind) {
    var bar = function(w, h, extra) { return '<i class="bn-sk__bar ' + (extra || '') + '" style="width:' + w + ';height:' + h + '"></i>'; };
    var kpis = function(n) {
      var out = '';
      for (var i = 0; i < n; i++) out += '<div class="bn-sk__kpi"><span class="bn-sk__kpi-top">' + bar('3.2rem', '3.2rem', 'bn-sk__round') + bar('5rem', '2.6rem') + '</span>' + bar('70%', '1.2rem') + bar('50%', '1rem') + '</div>';
      return '<div class="bn-sk__kpis" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + out + '</div>';
    };
    var filters = '<div class="bn-sk__filters">' + bar('36rem', '4rem', 'bn-sk__search') + bar('17rem', '4rem') + bar('17rem', '4rem') + bar('17rem', '4rem') + '</div>';
    var period = '<div class="bn-sk__filters">' + bar('34rem', '3.6rem') + bar('22rem', '3.6rem') + bar('17rem', '3.6rem') + '</div>';
    var cols = [16, 18, 12, 12, 10, 10, 10, 12];
    var table = function(n) {
      var out = '<div class="bn-sk__row bn-sk__row--head">' + cols.map(function(c) { return '<span class="bn-sk__cell" style="width:' + c + '%">' + bar('60%', '1.4rem') + '</span>'; }).join('') + '</div>';
      for (var i = 0; i < n; i++) out += '<div class="bn-sk__row">' + cols.map(function(c, k) { return '<span class="bn-sk__cell" style="width:' + c + '%">' + bar((45 + ((i * 7 + k * 13) % 45)) + '%', '1.2rem') + '</span>'; }).join('') + '</div>';
      return '<div class="bn-sk__table">' + out + '</div>';
    };
    var list = function(n) {
      var out = '';
      for (var i = 0; i < n; i++) out += '<div class="bn-sk__item">' + bar('3.2rem', '3.2rem', 'bn-sk__round') + '<span class="bn-sk__lines">' + bar((55 + (i * 11) % 30) + '%', '1.3rem') + bar((35 + (i * 17) % 30) + '%', '1rem') + '</span>' + bar('6rem', '2rem') + '</div>';
      return out;
    };
    var card = function(inner) { return '<div class="bn-sk__card">' + bar('14rem', '1.6rem') + inner + '</div>'; };
    var chart = function() {
      var heights = [38, 52, 44, 66, 58, 74, 62, 80, 70, 56, 64, 48, 72, 60, 78, 54, 68, 46, 62, 58], out = '';
      heights.forEach(function(h) { out += '<i class="bn-sk__bar" style="height:' + h + '%"></i>'; });
      return '<div class="bn-sk__card bn-sk__card--chart">' + bar('14rem', '1.6rem') + '<div class="bn-sk__chart">' + out + '</div></div>';
    };
    var body;
    if (kind === 'overview') body = kpis(5) + '<div class="bn-sk__cards bn-sk__cards--main">' + card(list(6)) + '<div class="bn-sk__stack">' + card(list(3)) + card(list(2)) + '</div></div>';
    else if (kind === 'report') body = period + kpis(6) + table(6);
    else if (kind === 'dashboard') body = kpis(7) + '<div class="bn-sk__cards bn-sk__cards--main">' + card(list(7)) + card(list(5)) + '</div>';
    else if (kind === 'finance') body = period + kpis(6) + chart() + table(4);
    else if (kind === 'blank') body = '<div class="bn-sk__card">' + bar('14rem', '1.6rem') + list(4) + '</div>';
    else body = filters + table(9);
    return '<div class="bn-sk" aria-hidden="true">' + body + '</div>';
  }

  function top() {
    var anchor = document.querySelector('.program-detail-header') || document.querySelector('.nf-subtabs');
    return anchor ? anchor.getBoundingClientRect().bottom : 0;
  }

  function show(fromTop, keep, kind) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'bn-loading';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-label', 'Loading');
      overlay.innerHTML = '<span class="bn-loading__back"></span><span class="bn-loading__mark">' + marks() + '</span>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('.bn-loading__back').innerHTML = skeleton(kind);
    var foot = document.querySelector('.footer'), footH = foot && foot.offsetHeight ? foot.offsetHeight : 33;
    overlay.style.top = (fromTop != null ? fromTop : top()) + 'px';
    overlay.style.bottom = footH + 'px';
    overlay.style.right = '0px';
    overlay.classList.remove('is-leaving');
    overlay.hidden = false;
    clearTimeout(timer);
    if (keep) return;   // the page is about to be replaced: the loading stays until it is
    timer = setTimeout(function() {
      overlay.classList.add('is-leaving');
      setTimeout(function() { if (overlay.classList.contains('is-leaving')) overlay.hidden = true; }, FADE);
    }, DURATION);
  }

  // The tabs of the top bar open other pages: show the loading for the same time, then go
  document.addEventListener('click', function(e) {
    var link = e.target.closest('.top-navbar .nav-menu__link[href]');
    if (!link || reduced || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (link.classList.contains('nav-menu__link--current') || link.getAttribute('href') === '#') return;
    var nav = document.querySelector('.top-navbar');
    e.preventDefault();
    e.stopPropagation();
    var href = link.getAttribute('href') || '', kind = /dashboard/.test(href) ? 'dashboard' : (/finance/.test(href) ? 'finance' : (/app-settings/.test(href) ? 'blank' : 'table'));
    show(nav ? nav.getBoundingClientRect().bottom : 0, true, kind);
    setTimeout(function() { window.location.href = link.href; }, DURATION);
  }, true);

  document.addEventListener('click', function(e) {
    var tab = e.target.closest(TRIGGER);
    if (!tab || reduced) return;
    if (tab.classList.contains('tabs__tab--active') || tab.classList.contains('rq-subtab--active') || tab.hasAttribute('hidden')) return;
    var key = tab.getAttribute('data-tab') || tab.getAttribute('data-nftab') || tab.getAttribute('data-fin-tab') || '';
    var kind = key === 'overview' && tab.hasAttribute('data-nftab') ? 'finance' : (key === 'overview' ? 'overview' : ((key === 'finance' || key === 'revenue' || key === 'purchase-spend' || key === 'spend' || key === 'labor') ? 'report' : 'table'));
    show(null, false, kind);
  }, true);
})();
