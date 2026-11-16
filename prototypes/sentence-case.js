/**
 * Sentence case
 * Headers and subheaders are written with a capital first letter and the rest in lowercase ("Net sales", not "Net Sales").
 * Acronyms in capitals (SKU, PO, EAN) stay as they are. It covers the table headers, the headings of pages, cards and
 * sections, the labels of the indicators, the tabs and the sub-tabs, including the ones drawn later by the pages.
 * Headings that show data (a store, a person, a product) are left alone: mark one with data-keep-case, or a drawer title that
 * is plain text with data-sentence.
 */

(function() {
  'use strict';

  var INCLUDE = 'th, h1, h2, h3, h4, .tabs__tab, .rq-subtab, .fin-card__title, .ov-card__title, .pd-section__title, .drawer-section__title, ' +
    '.fin-kpi__label, .ov-kpi__label, .tt-head, .drawer__title[data-sentence]';
  var EXCLUDE = '.top-navbar, .ov-header__title, .emp-drawer-title, .drawer__title:not([data-sentence]), [data-keep-case], .bn-logo, .bn-ai';

  function convert(text, first) {
    var done = false;
    return text.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g, function(word) {
      var lead = first && !done;
      done = true;
      if (word.length > 1 && word === word.toUpperCase()) return word;   // SKU, PO, EAN
      var lower = word.toLowerCase();
      return lead ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    });
  }

  function fix(node) {
    if (node.closest(EXCLUDE)) return;
    var first = true;
    for (var n = node.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
      var next = convert(n.nodeValue, first);
      if (next !== n.nodeValue) n.nodeValue = next;
      first = false;
    }
  }

  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches(INCLUDE)) fix(root);
    if (root.querySelectorAll) root.querySelectorAll(INCLUDE).forEach(fix);
  }

  var pending = [], queued = false;
  function flush() {
    queued = false;
    var list = pending;
    pending = [];
    list.forEach(function(n) { if (n.isConnected) scan(n); });
  }

  function start() {
    scan(document.documentElement);
    new MutationObserver(function(records) {
      records.forEach(function(r) {
        if (r.type === 'characterData') { if (r.target.parentElement) pending.push(r.target.parentElement.closest(INCLUDE) || r.target.parentElement); }
        else r.addedNodes.forEach(function(n) { if (n.nodeType === 1) pending.push(n); });
      });
      if (!queued && pending.length) { queued = true; Promise.resolve().then(flush); }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  start();
})();
