/**
 * Presence
 * The People item of the toolbar on the right starts (and stops) a simulation of three other people editing the table you are
 * looking at, at the same time, whatever the tab. Each of them has a colour of their own (picked at random) and gets an outline on a
 * row, with their name on a small tag and one cell of the row marked as the one being edited. Every few seconds each person moves on
 * to another row, each at their own pace. When you change tab or page content, the outlines follow to rows of the new table.
 *
 * The outline is drawn by the row itself (a class on the <tr> and on its cell, styled in shared-chrome.css), not by a layer on top of
 * the page: so it scrolls, sideways and up and down, exactly with the row, sticky columns and headers included.
 */

(function() {
  'use strict';

  var PEOPLE = ['Johnny Appleseed', 'Marina Costa', 'Tiago Nunes', 'Beatriz Moreira', 'Felipe Araújo', 'Camila Rocha', 'Gustavo Pinto', 'Helena Duarte', 'Larissa Prado', 'Rafael Campos'];
  var COLORS = ['#3D4BE8', '#E8553D', '#1FA67A', '#C9780A', '#B13FD6', '#0A9CC9', '#D6336C', '#6B8E23'];
  var COUNT = 3;
  var STAY = 12000;       // how long a person stays on a row, at least (each person has a little more, so they never move together)
  var live = false, users = [], queued = false, burst = 0, burstAt = 0;

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /** The rows of the visible tables that can be edited. */
  function rows() {
    var out = [];
    document.querySelectorAll('.table-container tbody tr, .tt-card tbody tr').forEach(function(tr) {
      if (!tr.offsetParent || tr.cells.length < 3 || tr.querySelector('.rq-empty, .products-empty') || tr.classList.contains('fs-hide')) return;
      if (tr.getBoundingClientRect().height > 20) out.push(tr);
    });
    return out;
  }

  /** A row nobody else is on. */
  function pick(except) {
    var taken = users.map(function(u) { return u.row; });
    var list = rows().filter(function(tr) { return taken.indexOf(tr) === -1 && tr !== except; });
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }

  /** A cell that has to be positioned (to hold the tag or the cursor) keeps its own position when it already has one (sticky columns). */
  function positioned(cell) {
    if (getComputedStyle(cell).position === 'static') { cell.style.position = 'relative'; cell.setAttribute('data-presence-pos', '1'); }
  }

  function unmark(user) {
    var row = user.row;
    if (!row) return;
    row.classList.remove('bn-edit');
    row.style.removeProperty('--presence');
    var tag = row.querySelector('.bn-edit-tag[data-user="' + user.id + '"]');
    if (tag) tag.remove();
    [].forEach.call(row.cells, function(c) {
      if (c.classList.contains('bn-edit-cell') && c.getAttribute('data-user') === user.id) { c.classList.remove('bn-edit-cell'); c.removeAttribute('data-user'); }
      if (c.getAttribute('data-presence-pos') && !c.querySelector('.bn-edit-tag') && !c.classList.contains('bn-edit-cell')) { c.style.removeProperty('position'); c.removeAttribute('data-presence-pos'); }
    });
  }

  function mark(user) {
    var row = user.row, first = row.cells[0], cell = row.cells[Math.min(user.cell, row.cells.length - 1)];
    row.classList.add('bn-edit');
    row.style.setProperty('--presence', user.color);
    positioned(first);
    var tag = document.createElement('span');
    tag.className = 'bn-edit-tag';
    tag.setAttribute('data-user', user.id);
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = user.name;
    first.appendChild(tag);
    positioned(cell);
    cell.classList.add('bn-edit-cell');
    cell.setAttribute('data-user', user.id);
  }

  function rehome(user) {
    var next = pick(user.row);
    if (!next) return false;
    unmark(user);
    user.row = next;
    user.cell = 1 + Math.floor(Math.random() * Math.max(1, next.cells.length - 2));
    mark(user);
    return true;
  }

  /** The row of a person is gone (the table was drawn again, another tab opened): they go to a row of what is on screen. */
  function check(user) {
    if (user.row && user.row.isConnected && user.row.offsetParent && user.row.classList.contains('bn-edit')) return;
    if (user.row && user.row.isConnected) unmark(user);
    user.row = null;
    rehome(user);
  }

  function later() {
    if (!live || queued) return;
    // Safety: if the page keeps waking this up (more than 2000 times within a second), it waits for the next change
    var now = Date.now();
    if (now - burstAt > 1000) { burst = 0; burstAt = now; }
    if (++burst > 2000) return;
    queued = true;
    Promise.resolve().then(function() { queued = false; users.forEach(check); });
  }

  function markItem(on) {
    document.querySelectorAll('.proj-right-toolbar__item[data-item-id="people"]').forEach(function(b) { b.classList.toggle('is-live', on); });
  }

  function start() {
    live = true;
    markItem(true);
    var colors = shuffle(COLORS), names = shuffle(PEOPLE);
    users = [];
    for (var i = 0; i < COUNT; i++) {
      var user = { id: 'u' + i, name: names[i], color: colors[i], row: null, cell: 1, timer: null };
      users.push(user);
      rehome(user);
      // Each person moves at their own pace
      (function(u, delay) { u.timer = setInterval(function() { if (live) rehome(u); }, delay); })(user, STAY + i * 3500 + Math.floor(Math.random() * 3000));
    }
  }

  function stop() {
    live = false;
    markItem(false);
    users.forEach(function(u) { clearInterval(u.timer); unmark(u); });
    users = [];
  }

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.proj-right-toolbar__item[data-item-id="people"]')) return;
    if (live) stop(); else start();
  });
  // Only a change of what is on the page (a table drawn again, another tab) matters: scrolling needs nothing, the outline belongs to the row
  new MutationObserver(function(records) {
    if (!live) return;
    // What this file writes (the classes and the tags) must not wake it up again
    var own = function(n) { return n && n.nodeType === 1 && n.classList && (n.classList.contains('bn-edit') || n.classList.contains('bn-edit-cell') || n.classList.contains('bn-edit-tag')); };
    if (records.every(function(r) { return own(r.target) || [].every.call(r.addedNodes, own) && [].every.call(r.removedNodes, own) && (r.addedNodes.length + r.removedNodes.length) > 0; })) return;
    later();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
})();
