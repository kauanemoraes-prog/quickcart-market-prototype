/**
 * AI Assistant
 * Chat of every prototype page. The Smart Assistant button of the top bar opens it at the bottom right. Minimizing the chat
 * leaves a floating button at the bottom right to bring it back; closing it (X) clears the conversation and hides everything. The answers are written for the prototype (no real AI):
 * they match keywords of the question and explain where things are in the store pages.
 */

(function() {
  'use strict';
  if (window.BnAiAssistant) return;

  var KEY = 'bossa-nova:ai-assistant';
  var ACCENT = '#7180AC', EDGE = '#A9B4D3', SPARK = '#E8EBF3';

  /** A four-point sparkle centred on (cx, cy), pinched in the middle. */
  function star(cx, cy, r, cls, fill) {
    return '<path class="bn-star ' + cls + '" fill="' + fill + '" d="M' + cx + ' ' + (cy - r) + 'Q' + cx + ' ' + cy + ' ' + (cx + r) + ' ' + cy + 'Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy + r) +
      'Q' + cx + ' ' + cy + ' ' + (cx - r) + ' ' + cy + 'Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy - r) + 'Z"/>';
  }

  /** The AI icon: three sparkles on the accent blue used across the tabs (the button of the top bar draws the same three). */
  function logoIcon() {
    return '<svg viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="60" fill="' + ACCENT + '"/>' +
      star(33, 34, 16, 'bn-star--1', SPARK) + star(70, 57, 32, 'bn-star--2', '#fff') + star(36, 88, 18, 'bn-star--3', SPARK) + '</svg>';
  }

  var TOPICS = [
    { words: ['out of stock', 'low stock', 'stock', 'shelf', 'inventory', 'minimum'], text: 'Out of stock means a product has no units left; low stock means it is under its minimum but still on the shelf. The first two indicators of the Overview open the Products tab already filtered, and the Stock alerts card shows the areas with the most missing products.' },
    { words: ['expir', 'validity', 'shelf life', 'batch'], text: 'Products close to their expiry date are listed in Expiry alerts on the Overview. The Products tab has an "Expiring" filter, and each product drawer shows its batches with the days left.' },
    { words: ['request', 'approve', 'approval', 'reject', 'accept'], text: 'The Requests tab lists purchase requests for products and for equipment/consumables. Pending ones have Accept and Reject buttons; a rejection asks for a reason. Click a row to see its status history.' },
    { words: ['task', 'assign', 'overdue', 'blocked'], text: 'Tasks are open, in progress or blocked. Overdue and blocked ones show up in Needs attention and Tasks today on the Overview. To give someone a task, open the Employees tab and use "Assign task".' },
    { words: ['employee', 'team', 'shift', 'staff', 'leave'], text: 'The Employees tab shows who works in the store, their usual area, shift and open tasks. A person on leave can still receive a task; the form shows a note about it.' },
    { words: ['area', 'map', 'aisle', 'fixture'], text: 'The Areas tab is a tree of the store areas with their products and issues & repairs. The store map shows the same areas in 3D: click one to zoom in and open its drawer.' },
    { words: ['revenue', 'sales', 'ticket', 'channel'], text: 'The Revenue tab shows net sales, discounts, returns, transactions and the breakdown by sales channel, for the period you choose. The Overview only keeps a short sales summary.' },
    { words: ['purchase', 'invoice', 'supplier', 'spend', 'delivery', 'order'], text: 'Purchase Spend lists supplier invoices (awaiting payment, overdue or paid). Upcoming deliveries on the Overview shows the next orders to arrive and which ones are late.' },
    { words: ['equipment', 'consumable', 'repair'], text: 'The Equipment/Consumables tab lists what each area needs to work: scales, scanners, fridges, labels and bags. Items under repair or out of stock can be requested from the Requests tab.' },
    { words: ['hello', 'hi ', 'hey', 'help'], text: 'Hi! I can explain where to find stock, tasks, requests, employees, areas, sales and invoices in the store pages. What would you like to know?' }
  ];
  var FALLBACK = 'I could not find that in the Help documentation. Try asking about stock, expiry dates, requests, tasks, employees, areas, sales or invoices.';

  function answer(q) {
    var text = ' ' + q.toLowerCase() + ' ';
    for (var i = 0; i < TOPICS.length; i++) {
      for (var j = 0; j < TOPICS[i].words.length; j++) if (text.indexOf(TOPICS[i].words[j]) !== -1) return TOPICS[i].text;
    }
    return FALLBACK;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function build() {
    var root = document.createElement('div');
    root.className = 'bn-ai';
    root.innerHTML =
      '<button type="button" class="bn-ai__fab" aria-label="Open AI Assistant" title="AI Assistant">' + logoIcon('bn-ai-fab') + '</button>' +
      '<section class="bn-ai__panel" role="dialog" aria-label="AI Assistant" hidden>' +
        '<header class="bn-ai__header">' +
          '<button type="button" class="bn-ai__icon-btn bn-ai__icon-btn--accent" data-ai="close" aria-label="Close chat"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
          '<span class="bn-ai__badge">' + logoIcon('bn-ai-head') + '</span><span class="bn-ai__title">AI Assistant</span>' +
          '<span class="bn-ai__spacer"></span>' +
          '<button type="button" class="bn-ai__icon-btn bn-ai__icon-btn--accent" data-ai="minimize" aria-label="Minimize chat"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
          '<button type="button" class="bn-ai__icon-btn bn-ai__icon-btn--accent" data-ai="expand" aria-label="Expand chat"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></button>' +
        '</header>' +
        '<div class="bn-ai__body" aria-live="polite">' +
          '<div class="bn-ai__msg"><span class="bn-ai__who">AI Assistant</span><div class="bn-ai__bubble">Welcome to <strong>AI Assistant</strong>.<br>I help you run your QuickCart Market store: what needs attention today, stock and expiry dates, purchase requests, deliveries, tasks, team and sales. My answers come from the <a href="../help-landing-page/index.html">QuickCart Market User Guide (Help)</a>.</div></div>' +
        '</div>' +
        '<form class="bn-ai__form"><input type="text" class="bn-ai__input" placeholder="Type your question..." aria-label="Type your question" autocomplete="off">' +
          '<button type="submit" class="bn-ai__send" aria-label="Send" disabled><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>' +
      '</section>';
    document.body.appendChild(root);
    return root;
  }

  function init() {
    var root = build(), fab = root.querySelector('.bn-ai__fab'), panel = root.querySelector('.bn-ai__panel');
    var body = root.querySelector('.bn-ai__body'), input = root.querySelector('.bn-ai__input'), send = root.querySelector('.bn-ai__send');

    // The same place on every page: 16px from the right edge and 12px above the footer
    function place() {
      var foot = document.querySelector('.footer');
      var bottom = foot && foot.offsetHeight ? window.innerHeight - foot.getBoundingClientRect().top : 0;
      root.style.setProperty('--bn-ai-right', '16px');
      root.style.setProperty('--bn-ai-bottom', (Math.max(bottom, 0) + 12) + 'px');
    }

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Plays a CSS animation (a class) on an element and calls done when it ends. */
    function play(node, cls, done) {
      if (reduced) { if (done) done(); return; }
      node.classList.add(cls);
      var end = function(e) {
        if (e.target !== node) return;
        node.removeEventListener('animationend', end);
        node.classList.remove(cls);
        if (done) done();
      };
      node.addEventListener('animationend', end);
    }

    // open: the chat is shown; min: only the floating button; closed: nothing (the Smart Assistant button of the top bar opens it).
    // The chat grows out of the corner where the button is and shrinks back into it.
    function show(mode, animate) {
      place();
      var wasOpen = !panel.hidden;
      try { sessionStorage.setItem(KEY, mode); } catch (e) {}
      if (mode === 'open') {
        panel.hidden = false;
        fab.hidden = true;
        if (animate !== false && !wasOpen) play(panel, 'is-opening');
        input.focus();
        return;
      }
      var finish = function() {
        panel.hidden = true;
        fab.hidden = mode !== 'min';
        if (mode === 'min' && animate !== false) play(fab, 'is-appearing');
      };
      if (wasOpen && animate !== false) play(panel, 'is-closing', finish); else finish();
    }

    /** A little press and a ring on the button that was clicked. */
    function press(button) {
      if (reduced) return;
      button.classList.remove('bn-ai-clicked');
      void button.offsetWidth;
      button.classList.add('bn-ai-clicked');
      setTimeout(function() { button.classList.remove('bn-ai-clicked'); }, 1000);
    }

    function add(who, html, cls) {
      var m = document.createElement('div');
      m.className = 'bn-ai__msg' + (cls ? ' ' + cls : '');
      m.innerHTML = (who ? '<span class="bn-ai__who">' + who + '</span>' : '') + '<div class="bn-ai__bubble">' + html + '</div>';
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }

    fab.addEventListener('click', function() { press(fab); setTimeout(function() { show('open'); }, reduced ? 0 : 160); });
    // The Smart Assistant button of the top bar opens the chat (or brings it back)
    document.addEventListener('click', function(e) { var b = e.target.closest(':is(button[title="Smart Assistant"], button[data-bn-title="Smart Assistant"])'); if (b) { press(b); show('open'); } });
    panel.addEventListener('click', function(e) {
      var b = e.target.closest('[data-ai]');
      if (!b) return;
      var a = b.getAttribute('data-ai');
      if (a === 'minimize') show('min');
      if (a === 'close') {
        body.querySelectorAll('.bn-ai__msg:not(:first-of-type)').forEach(function(m) { m.remove(); });
        panel.classList.remove('bn-ai__panel--large');
        show('closed');
      }
      if (a === 'expand') panel.classList.toggle('bn-ai__panel--large');
    });
    input.addEventListener('input', function() { send.disabled = !input.value.trim(); });
    root.querySelector('.bn-ai__form').addEventListener('submit', function(e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = '';
      send.disabled = true;
      add('', esc(q), 'bn-ai__msg--user');
      var wait = add('AI Assistant', '<span class="bn-ai__typing"><i></i><i></i><i></i></span>');
      setTimeout(function() { wait.querySelector('.bn-ai__bubble').innerHTML = esc(answer(q)); body.scrollTop = body.scrollHeight; }, 700);
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !panel.hidden && root.contains(document.activeElement)) show('min'); });
    window.addEventListener('resize', place);
    // The toolbar opens and closes (its width changes) and the page loads it late: keep the distances right
    var bar = document.querySelector('.proj-right-toolbar');
    if (bar && window.ResizeObserver) new ResizeObserver(place).observe(bar);
    setTimeout(place, 600);

    var saved = null;
    try { saved = sessionStorage.getItem(KEY); } catch (e) {}
    show(saved === 'open' || saved === 'min' ? saved : 'closed', false);
  }

  window.BnAiAssistant = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
