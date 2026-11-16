/**
 * Toolbar Dock
 * The buttons that used to live in the toolbar on the right (settings, change log, active users) now sit in the header of the
 * store, at the right end of the row of the tabs. The toolbar is built by the plugin at the end of the page, so once the header
 * exists it is moved into it (the plugin keeps working: its buttons are the same elements).
 */

(function() {
  'use strict';

  function dock() {
    var bar = document.querySelector('.proj-right-toolbar'), row = document.querySelector('.program-detail-header__nav');
    if (!bar || !row || bar.parentNode === row) return;
    row.appendChild(bar);
    bar.classList.add('proj-right-toolbar--docked');
  }

  // The canvas and the plugins build the page and the toolbar after the load event: try a few times while they settle
  window.addEventListener('load', function() { var n = 0, t = setInterval(function() { dock(); if (++n > 12) clearInterval(t); }, 300); dock(); });
  new MutationObserver(dock).observe(document.documentElement, { childList: true, subtree: true });
})();
