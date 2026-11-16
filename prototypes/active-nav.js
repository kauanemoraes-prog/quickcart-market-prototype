/**
 * Marks the current tab in the top navigation bar.
 * The canvas decides "active" by looking for the link's href inside location.pathname, which never
 * matches the relative hrefs it generates, so no tab is ever highlighted. Here each link is resolved
 * to an absolute URL and compared with the current page: a tab is active when the page is inside
 * its folder (so the exhibition detail page keeps "Exhibitions" active).
 */
(function() {
  'use strict';

  /** Folder of a path: "/a/b/index.html" -> "/a/b/", and "/a/b" (a folder link) -> "/a/b/". */
  function dirOf(pathname) {
    if (!/\.[a-z0-9]+$/i.test(pathname) && pathname.charAt(pathname.length - 1) !== '/') pathname += '/';
    return pathname.replace(/[^/]*$/, '');
  }

  function mark() {
    var here = dirOf(window.location.pathname);
    var best = null, bestLen = -1;
    var links = document.querySelectorAll('.top-navbar .nav-menu__link[href]');
    links.forEach(function(link) {
      link.classList.remove('nav-menu__link--current');
      link.removeAttribute('aria-current');
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var dir = dirOf(new URL(href, window.location.href).pathname);
      if (here.indexOf(dir) === 0 && dir.length > bestLen) { best = link; bestLen = dir.length; }
    });
    if (best) {
      best.classList.add('nav-menu__link--current');
      best.setAttribute('aria-current', 'page');
    }
  }

  document.addEventListener('davinci:canvas:ready', mark);
  if (document.readyState !== 'loading') setTimeout(mark, 0);
  window.addEventListener('load', mark);
})();
