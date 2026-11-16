/**
 * Sticky tables
 * The page header, the bar with the search and filters, and the header of the table stay in view while a table is read.
 * A table sits in a box that scrolls sideways, and a box like that also scrolls up and down on its own (that is how CSS
 * works): the header of the table can only stick to the box, not to the page. So the box gets the height that is left on
 * the screen, below the page header, the filters and whatever sits above it: the page itself does not scroll, the rows do,
 * and everything above them (including the table header, sticky inside the box) stays where it is.
 * Also publishes --nav-bottom, where the top bar ends, for the sticky page headers.
 */

(function() {
  'use strict';

  var BOXES = '.table-container.products-container, .tt-card, .pc-grid';
  var MIN_HEIGHT = 260;      // never squeeze a table below this, the page scrolls instead
  var BOTTOM_GAP = 8;        // space between the last thing of the page and the footer

  function fit() {
    var nav = document.querySelector('.top-navbar');
    if (nav) document.documentElement.style.setProperty('--nav-bottom', nav.getBoundingClientRect().bottom + 'px');
    var foot = document.querySelector('.footer'), footer = foot && foot.offsetHeight ? foot.offsetHeight : 33, scroll = window.scrollY;
    document.querySelectorAll(BOXES).forEach(function(box) {
      if (!box.offsetParent || box.closest('.drawer')) return;
      var keep = box.scrollTop;   // clearing the height resets the scroll: put it back after the box is sized
      box.style.maxHeight = '';
      box.style.overflowY = 'auto';
      var top = box.getBoundingClientRect().top + scroll, below = 0, n = box.nextElementSibling;
      while (n) {
        if (n.offsetParent) { var cs = getComputedStyle(n); below += n.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); }
        n = n.nextElementSibling;
      }
      box.style.maxHeight = Math.max(window.innerHeight - top - footer - below - BOTTOM_GAP, MIN_HEIGHT) + 'px';
      if (keep) box.scrollTop = keep;
    });
    // The page may still be a few pixels taller than the screen (its own bottom padding): take that from the table too
    placeAllTops();
    var over = document.documentElement.scrollHeight - window.innerHeight;
    if (over > 0 && over < 120) {
      document.querySelectorAll(BOXES).forEach(function(box) {
        if (!box.offsetParent || box.closest('.drawer') || !box.style.maxHeight) return;
        box.style.maxHeight = Math.max(parseFloat(box.style.maxHeight) - over, MIN_HEIGHT) + 'px';
      });
    }
  }


  /* ---------- back to top: a small floating button at the top of a list or of the cards, once they are scrolled down ---------- */

  var SHOW_AFTER = 160;      // pixels scrolled before the button shows
  var buttons = new WeakMap();

  function topButton(box) {
    var b = buttons.get(box);
    if (b) return b;
    b = document.createElement('button');
    b.type = 'button';
    b.className = 'bn-top';
    b.style.display = 'none';
    b.setAttribute('aria-label', 'Back to top');
    b.title = 'Back to top';
    b.innerHTML = '<lucide-icon name="chevron-up" style="font-size:20px"></lucide-icon>';
    b.addEventListener('click', function() {
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      box.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    document.body.appendChild(b);
    box.addEventListener('scroll', function() { placeTop(box); }, { passive: true });
    buttons.set(box, b);
    return b;
  }

  function placeTop(box) {
    var b = topButton(box), r = box.getBoundingClientRect();
    var show = !!box.offsetParent && !box.closest('.drawer') && box.scrollHeight > box.clientHeight && box.scrollTop > SHOW_AFTER;
    // Shown and hidden through the style: the page watches the 'hidden' and 'class' attributes, and fitting the tables again would stop the scroll in the middle
    var want = show ? 'flex' : 'none';
    if (b.style.display !== want) b.style.display = want;
    if (!show) return;
    // Centred on the list or the cards, a little above their top edge (over the header of a table)
    b.style.top = Math.round(r.top - 22) + 'px';
    b.style.left = Math.round(Math.max(r.left, 0) + (Math.min(r.right, document.documentElement.clientWidth) - Math.max(r.left, 0)) / 2 - 18) + 'px';
  }

  function placeAllTops() {
    document.querySelectorAll(BOXES).forEach(placeTop);
    document.querySelectorAll('.bn-top').forEach(function(b) { if (!document.body.contains(b)) b.remove(); });
  }

  window.StickyTables = { fit: fit };

  var queued = false;
  function later() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function() { queued = false; fit(); });
  }

  window.addEventListener('resize', later);
  window.addEventListener('scroll', placeAllTops, { passive: true });
  window.addEventListener('load', function() {
    fit();
    [300, 900, 2000].forEach(function(ms) { setTimeout(fit, ms); });
    // Tables are drawn, redrawn and shown or hidden by the pages: fit again when the page changes
    // The back to top button and its press animation must not make the tables fit again: that would stop its smooth scroll half way
    new MutationObserver(function(records) {
      var real = records.some(function(r) { var t = r.target && r.target.nodeType === 1 ? r.target : r.target.parentNode; return !(t && t.closest && t.closest('.bn-top')); });
      if (real) later();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  });
})();
