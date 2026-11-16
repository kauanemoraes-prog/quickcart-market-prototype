/**
 * Filter & search enhancements for every table search of the prototype (the behaviour of the Process Flow filter of core).
 *
 * The search field of a table (`.products-search`) gets, next to the free text it already had:
 *  - tags: a panel lists the columns of the table; a column opens the list of its values (Contains / Without), choosing one puts a chip in the field;
 *  - behaviour: Filter hides the rows that do not match, Search keeps them and highlights the matching cells;
 *  - order of the tags: alphabetical, or smart (the ones that match what is typed come first);
 *  - favorites: a star saves the chips on screen (10 at most, newest first); a pill applies them again; the x removes it with an undo for 5 seconds.
 * Everything works on the rendered table, so it needs no support from the code that draws it, and it survives a re-render.
 * Cmd/Ctrl + K focuses the first search of the screen. Preferences and favorites live in localStorage (davinci:fs:*).
 */
(function() {
  'use strict';

  var STORE = 'davinci:fs:';
  var MAX_FAV = 10, MAX_VALUES = 60, UNDO_MS = 5000;
  var ROOTS = '.products-view, .equip-view, .tabs__panel, .nf-card, .np-page, #page-content';
  var instances = [];

  function read(key, fallback) { try { var v = JSON.parse(localStorage.getItem(STORE + key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(STORE + key, JSON.stringify(value)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s || '').replace(/[⇅↑↓]/g, '').replace(/\s+/g, ' ').trim(); }

  var ICONS = {
    search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    filter: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>'
  };
  var prefs = { behavior: read('behavior', 'filter'), order: read('order', 'alpha'), favVisible: read('favorites-visible', true) };
  function savePrefs() { write('behavior', prefs.behavior); write('order', prefs.order); write('favorites-visible', prefs.favVisible); }

  /* ---------- the table behind a search ---------- */

  function tableOf(search) {
    var root = search.closest(ROOTS);
    while (root) {
      var t = root.querySelector('.table-container table, .tt-card table, table.table');
      if (t) return t;
      root = root.parentElement && root.parentElement.closest(ROOTS);
    }
    return null;
  }

  function columns(table) {
    var ths = table.querySelectorAll('thead th');
    return [].map.call(ths, function(th, i) { return { index: i, label: clean(th.firstChild && th.firstChild.nodeType === 3 ? th.firstChild.textContent : th.textContent) }; })
      .filter(function(c) { return c.label && !/^(actions?|documents|items)$/i.test(c.label); });
  }

  function dataRows(table) {
    return [].filter.call(table.querySelectorAll('tbody tr'), function(tr) {
      var cells = tr.children;
      return cells.length >= 3 && !(cells.length === 1 || cells[0].colSpan > 1);
    });
  }

  function cellText(tr, index) { var c = tr.children[index]; return c ? clean(c.textContent) : ''; }

  function valuesOf(table, col) {
    var seen = {};
    dataRows(table).forEach(function(tr) { var v = cellText(tr, col.index); if (v) seen[v] = (seen[v] || 0) + 1; });
    var list = Object.keys(seen);
    if (list.length > MAX_VALUES) return null;
    return list.map(function(v) { return { value: v, count: seen[v] }; });
  }

  /* ---------- one search ---------- */

  function Instance(search, id) {
    var self = this;
    this.search = search;
    this.id = id;
    this.chips = [];
    this.view = null;          // null = the list of columns, or { col } = the values of a column
    this.open = false;
    this.optionsOpen = false;
    this.favs = read('fav:' + id, []);
    this.input = search.querySelector('input');
    search.classList.add('fs');
    search.insertAdjacentHTML('beforeend',
      '<span class="fs__shortcut" aria-hidden="true">⌘K</span><span class="fs__nav" hidden></span>' +
      '<button type="button" class="fs__btn fs__star" title="Save these tags as a favorite" aria-label="Save these tags as a favorite"><span class="fs__starmark">☆</span></button>' +
      '<button type="button" class="fs__btn fs__more" title="Options" aria-label="Options">⋯</button>' +
      '<div class="fs__panel" hidden></div><div class="fs__options" hidden></div>');
    // Every search has the same placeholder, whatever the code that draws the tab writes in it
    var PLACEHOLDER = 'Type keywords...';
    this.input.placeholder = PLACEHOLDER;
    new MutationObserver(function() { if (self.input.placeholder !== PLACEHOLDER) self.input.placeholder = PLACEHOLDER; }).observe(this.input, { attributes: true, attributeFilter: ['placeholder'] });
    this.lead = document.createElement('button');
    this.lead.type = 'button';
    this.lead.className = 'fs__lead';
    var oldIcon = search.querySelector(':scope > lucide-icon');
    if (oldIcon) { oldIcon.hidden = true; oldIcon.style.display = 'none'; search.insertBefore(this.lead, oldIcon); } else search.insertBefore(this.lead, search.firstChild);
    this.chipBox = document.createElement('span');
    this.chipBox.className = 'fs__chips';
    this.input.parentNode.insertBefore(this.chipBox, this.input);
    this.panel = search.querySelector('.fs__panel');
    this.optionsEl = search.querySelector('.fs__options');
    this.star = search.querySelector('.fs__star');
    this.nav = search.querySelector('.fs__nav');
    this.matches = [];
    this.at = 0;

    search.addEventListener('mousedown', function(e) { if (e.target.closest('.fs__panel, .fs__options')) e.preventDefault(); });
    this.input.addEventListener('focus', function() { self.show(true); });
    this.input.addEventListener('input', function() { self.view = null; self.show(true); });
    this.input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { self.show(false); self.input.blur(); }
      if (e.key === 'Backspace' && !self.input.value && self.chips.length) { self.chips.pop(); self.changed(); }
    });
    search.addEventListener('click', function(e) { self.onClick(e); });
    this.render();
  }

  Instance.prototype.table = function() { return tableOf(this.search); };

  Instance.prototype.show = function(on) {
    this.open = on;
    if (!on) this.optionsOpen = false;
    this.render();
  };

  Instance.prototype.changed = function() { this.view = null; this.render(); this.apply(); };

  Instance.prototype.addChip = function(col, value, mode) {
    var exists = this.chips.some(function(c) { return c.label === col.label && c.value === value && c.mode === mode; });
    if (!exists) this.chips.push({ label: col.label, value: value, mode: mode });
    this.input.value = '';
    this.changed();
  };

  Instance.prototype.favKey = function(chips) { return chips.map(function(c) { return c.label + (c.mode === 'without' ? '!=' : '=') + c.value; }).sort().join('|'); };

  Instance.prototype.isFav = function() {
    var k = this.favKey(this.chips);
    return this.chips.length > 0 && this.favs.some(function(f) { return this.favKey(f) === k; }, this);
  };

  Instance.prototype.toggleFav = function() {
    if (!this.chips.length) return;
    var k = this.favKey(this.chips);
    if (this.isFav()) { this.removeFav(this.favs.filter(function(f) { return this.favKey(f) === k; }, this)[0]); return; }
    this.favs.unshift(this.chips.map(function(c) { return { label: c.label, value: c.value, mode: c.mode }; }));
    this.favs = this.favs.slice(0, MAX_FAV);
    write('fav:' + this.id, this.favs);
    this.render();
  };

  Instance.prototype.removeFav = function(fav) {
    var self = this, at = this.favs.indexOf(fav);
    if (at < 0) return;
    this.favs.splice(at, 1);
    write('fav:' + this.id, this.favs);
    this.render();
    toast('Favorite removed', function() { self.favs.splice(Math.min(at, self.favs.length), 0, fav); write('fav:' + self.id, self.favs); self.render(); });
  };

  Instance.prototype.onClick = function(e) {
    var t = e.target, self = this;
    if (t.closest('.fs__lead')) { prefs.behavior = prefs.behavior === 'filter' ? 'search' : 'filter'; savePrefs(); renderAll(); return; }
    var step = t.closest('[data-nav]');
    if (step && this.matches.length) { this.at = (this.at + +step.getAttribute('data-nav') + this.matches.length) % this.matches.length; this.renderNav(true); return; }
    var del = t.closest('[data-chip-x]');
    if (del) { this.chips.splice(+del.getAttribute('data-chip-x'), 1); this.changed(); return; }
    if (t.closest('.fs__star')) { this.toggleFav(); return; }
    if (t.closest('.fs__more')) { this.optionsOpen = !this.optionsOpen; this.open = true; this.render(); return; }
    var opt = t.closest('[data-opt]');
    if (opt) {
      var kv = opt.getAttribute('data-opt').split(':');
      if (kv[0] === 'behavior' || kv[0] === 'order') prefs[kv[0]] = kv[1];
      if (kv[0] === 'fav') prefs.favVisible = kv[1] === 'show';
      savePrefs(); renderAll(); return;
    }
    var favDel = t.closest('[data-fav-x]');
    if (favDel) { this.removeFav(this.favs[+favDel.getAttribute('data-fav-x')]); return; }
    var fav = t.closest('[data-fav]');
    if (fav) { this.chips = this.favs[+fav.getAttribute('data-fav')].map(function(c) { return { label: c.label, value: c.value, mode: c.mode }; }); this.input.value = ''; this.show(false); this.changed(); return; }
    var colBtn = t.closest('[data-col]');
    if (colBtn) { this.view = { col: +colBtn.getAttribute('data-col'), mode: 'contains' }; this.input.value = ''; this.render(); return; }
    var modeBtn = t.closest('[data-mode]');
    if (modeBtn && this.view) { this.view.mode = modeBtn.getAttribute('data-mode'); this.render(); return; }
    if (t.closest('[data-back]')) { this.view = null; this.render(); return; }
    var val = t.closest('[data-val]');
    if (val && this.view) {
      var col = columns(this.table()).filter(function(c) { return c.index === self.view.col; })[0];
      if (col) this.addChip(col, val.getAttribute('data-val'), this.view.mode);
    }
  };

  Instance.prototype.render = function() {
    var self = this, table = this.table();
    this.lead.innerHTML = ICONS[prefs.behavior === 'filter' ? 'filter' : 'search'];
    this.lead.title = prefs.behavior === 'filter' ? 'Filter mode: hides the rows that do not match. Click to switch to Search' : 'Search mode: highlights the matches. Click to switch to Filter';
    this.lead.setAttribute('aria-label', this.lead.title);
    this.chipBox.innerHTML = this.chips.map(function(c, i) {
      return '<span class="fs__chip" title="' + esc(c.label + (c.mode === 'without' ? ' is not ' : ' = ') + c.value) + '"><span class="fs__chip-label">' + esc(c.label) + '</span>' +
        '<span class="fs__chip-value">' + (c.mode === 'without' ? '≠ ' : '= ') + esc(c.value) + '</span><button type="button" class="fs__chip-x" data-chip-x="' + i + '" aria-label="Remove">×</button></span>';
    }).join('');
    this.search.classList.toggle('fs--chips', this.chips.length > 0);
    var fav = this.isFav();
    this.star.classList.toggle('fs__star--on', fav);
    this.star.querySelector('.fs__starmark').textContent = fav ? '★' : '☆';
    this.star.hidden = !this.chips.length;
    this.search.querySelector('.fs__shortcut').hidden = !!(this.input.value || this.chips.length || this.open);

    this.panel.hidden = !this.open || this.optionsOpen || !table;
    this.optionsEl.hidden = !this.open || !this.optionsOpen;
    if (!this.panel.hidden) this.panel.innerHTML = this.panelHtml(table);
    if (!this.optionsEl.hidden) this.optionsEl.innerHTML = this.optionsHtml();
  };

  Instance.prototype.panelHtml = function(table) {
    var self = this, q = this.input.value.trim().toLowerCase(), out = '';
    if (!this.view && prefs.favVisible && this.favs.length) {
      out += '<div class="fs__group"><div class="fs__title">Favorites</div><div class="fs__favs">' + this.favs.map(function(f, i) {
        return '<span class="fs__fav" data-fav="' + i + '" title="Apply these tags">' + esc(f.map(function(c) { return c.label + (c.mode === 'without' ? ' ≠ ' : ' = ') + c.value; }).join(' · ')) +
          '<button type="button" class="fs__fav-x" data-fav-x="' + i + '" aria-label="Remove favorite">×</button></span>';
      }).join('') + '</div></div>';
    }
    if (this.view) {
      var col = columns(table).filter(function(c) { return c.index === self.view.col; })[0];
      var values = col ? valuesOf(table, col) : [];
      if (!values) values = [];
      if (q) values = values.filter(function(v) { return v.value.toLowerCase().indexOf(q) !== -1; });
      values.sort(function(a, b) { return a.value.localeCompare(b.value, 'pt-BR', { numeric: true }); });
      out += '<div class="fs__group"><button type="button" class="fs__back" data-back>‹ ' + esc(col ? col.label : '') + '</button>' +
        '<div class="fs__modes"><button type="button" class="fs__mode' + (this.view.mode === 'contains' ? ' fs__mode--on' : '') + '" data-mode="contains">Contains</button>' +
        '<button type="button" class="fs__mode' + (this.view.mode === 'without' ? ' fs__mode--on' : '') + '" data-mode="without">Without</button></div>' +
        (values.map(function(v) { return '<button type="button" class="fs__item" data-val="' + esc(v.value) + '"><span>' + esc(v.value) + '</span><span class="fs__count">' + v.count + '</span></button>'; }).join('') ||
          '<div class="fs__empty">No values to choose from.</div>') + '</div>';
      return out;
    }
    var cols = columns(table).filter(function(c) { return !!valuesOf(table, c); });
    var shown = q ? cols.filter(function(c) { return c.label.toLowerCase().indexOf(q) !== -1; }) : cols;
    if (prefs.order === 'smart' && q) {
      shown = cols.slice().sort(function(a, b) { return (b.label.toLowerCase().indexOf(q) !== -1) - (a.label.toLowerCase().indexOf(q) !== -1); });
      // smart: the columns whose label matches come first, then the ones that have a value matching what was typed
      var hasValue = function(c) { return valuesOf(table, c).some(function(v) { return v.value.toLowerCase().indexOf(q) !== -1; }); };
      shown = cols.filter(function(c) { return c.label.toLowerCase().indexOf(q) !== -1; }).concat(cols.filter(function(c) { return c.label.toLowerCase().indexOf(q) === -1 && hasValue(c); }));
    } else if (prefs.order === 'alpha') {
      shown = shown.slice().sort(function(a, b) { return a.label.localeCompare(b.label, 'pt-BR'); });
    }
    out += '<div class="fs__group"><div class="fs__title">Tag by column</div>' +
      (shown.map(function(c) { return '<button type="button" class="fs__item" data-col="' + c.index + '"><span>' + esc(c.label) + '</span><span class="fs__go">›</span></button>'; }).join('') ||
        '<div class="fs__empty">No column matches.</div>') + '</div>';
    return out;
  };

  Instance.prototype.optionsHtml = function() {
    function row(title, group, items) {
      return '<div class="fs__group"><div class="fs__title">' + title + '</div>' + items.map(function(i) {
        var on = (group === 'behavior' && prefs.behavior === i[0]) || (group === 'order' && prefs.order === i[0]) || (group === 'fav' && (prefs.favVisible ? 'show' : 'hide') === i[0]);
        return '<button type="button" class="fs__item' + (on ? ' fs__item--on' : '') + '" data-opt="' + group + ':' + i[0] + '"><span class="fs__opt">' + (i[2] ? '<span class="fs__opt-icon">' + ICONS[i[2]] + '</span>' : '') + i[1] + '</span><span class="fs__go">' + (on ? '✓' : '') + '</span></button>';
      }).join('') + '</div>';
    }
    return row('Behavior', 'behavior', [['filter', 'Filter: hide the rows that do not match', 'filter'], ['search', 'Search: highlight the cells that match', 'search']]) +
      row('Order of the tags', 'order', [['alpha', 'Alphabetical'], ['smart', 'Smart: matches of what you type first']]) +
      row('Favorites', 'fav', [['show', 'Show favorites'], ['hide', 'Hide favorites']]);
  };

  /* ---------- applying the chips to the rows ---------- */

  Instance.prototype.apply = function() {
    var table = this.table();
    if (!table) return;
    var cols = columns(table), chips = this.chips, searchMode = prefs.behavior === 'search', ths = table.querySelectorAll('thead th');
    this.applying = true;
    table.querySelectorAll('.fs-hit, .fs-row-hit, .fs-row-focus, .fs-hide, .fs-hit-header').forEach(function(el) {
      el.classList.remove('fs-hit', 'fs-row-hit', 'fs-row-focus', 'fs-hide', 'fs-hit-header');
    });
    var visible = 0;
    this.matches = [];
    dataRows(table).forEach(function(tr) {
      var ok = true, hits = [];
      chips.forEach(function(c) {
        var col = cols.filter(function(x) { return x.label === c.label; })[0];
        if (!col) return;
        var same = cellText(tr, col.index) === c.value;
        if (c.mode === 'without' ? same : !same) ok = false;
        else if (c.mode !== 'without') hits.push(col.index);
      });
      if (!chips.length) { visible++; return; }
      if (!searchMode) {
        // Filter: the rows that do not match are hidden; the header of every column in a tag is marked
        if (!ok) tr.classList.add('fs-hide'); else visible++;
        return;
      }
      // Search: every row stays; the rows that match every tag get a soft tint and their matching cells the strong yellow
      visible++;
      if (!ok) return;
      tr.classList.add('fs-row-hit');
      hits.forEach(function(i) { if (tr.children[i]) tr.children[i].classList.add('fs-hit'); });
      this.matches.push(tr);
    }, this);
    if (chips.length && !searchMode) {
      chips.forEach(function(c) {
        var col = cols.filter(function(x) { return x.label === c.label; })[0];
        if (col && ths[col.index]) ths[col.index].classList.add('fs-hit-header');
      });
    }
    this.visible = visible;
    if (!this.matches.length || this.at >= this.matches.length || this.at == null) this.at = 0;
    this.applying = false;
    this.renderNav(false);
  };

  /** The count next to the tags: "12 results found" in Filter, "1 of 12" with arrows in Search. */
  Instance.prototype.renderNav = function(scroll) {
    var nav = this.nav, searchMode = prefs.behavior === 'search';
    if (!nav) return;
    if (!this.chips.length || (searchMode && !this.matches.length)) { nav.hidden = true; return; }
    nav.hidden = false;
    nav.classList.toggle('fs__nav--count', !searchMode);
    if (!searchMode) { nav.innerHTML = '<span>' + this.visible + (this.visible === 1 ? ' result found' : ' results found') + '</span>'; return; }
    var table = this.table();
    table.querySelectorAll('.fs-row-focus').forEach(function(el) { el.classList.remove('fs-row-focus'); });
    var row = this.matches[this.at];
    row.classList.add('fs-row-focus');
    if (scroll) row.scrollIntoView({ block: 'nearest' });
    nav.innerHTML = '<button type="button" class="fs__nav-btn" data-nav="-1" aria-label="Previous match">‹</button><span>' + (this.at + 1) + ' of ' + this.matches.length +
      '</span><button type="button" class="fs__nav-btn" data-nav="1" aria-label="Next match">›</button>';
  };

  function renderAll() { instances.forEach(function(i) { if (document.body.contains(i.search)) { i.render(); i.apply(); } }); }

  /* ---------- wiring ---------- */

  function toast(text, undo) {
    var old = document.querySelector('.fs-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'fs-toast';
    t.innerHTML = '<span>' + esc(text) + '</span><button type="button">Undo</button>';
    document.body.appendChild(t);
    var timer = setTimeout(function() { t.remove(); }, UNDO_MS);
    t.querySelector('button').addEventListener('click', function() { clearTimeout(timer); t.remove(); undo(); });
  }

  function idFor(search) {
    var root = search.closest(ROOTS);
    return location.pathname.split('/').slice(-2).join('/') + '#' + ((root && (root.id || root.className.split(' ')[0])) || 'page') + '/' + (search.querySelector('input').id || 'search');
  }

  function scan() {
    document.querySelectorAll('.products-search:not(.fs)').forEach(function(s) {
      if (s.closest('.drawer') || !s.querySelector('input')) return;
      var inst = new Instance(s, idFor(s));
      instances.push(inst);
      var table = inst.table();
      if (table && table.tBodies[0]) {
        new MutationObserver(function() { if (!inst.applying && inst.chips.length) inst.apply(); }).observe(table.tBodies[0], { childList: true });
      }
    });
    instances = instances.filter(function(i) { return document.body.contains(i.search); });
  }

  document.addEventListener('mousedown', function(e) {
    instances.forEach(function(i) { if (i.open && !i.search.contains(e.target)) i.show(false); });
  });
  document.addEventListener('keydown', function(e) {
    if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) return;
    var first = instances.filter(function(i) { return i.search.offsetParent; })[0];
    if (!first) return;
    e.preventDefault();
    first.input.focus();
  });

  var pending = false;
  function later() { if (pending) return; pending = true; requestAnimationFrame(function() { pending = false; scan(); }); }
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('davinci:canvas:ready', later);
  later();

  window.FilterSearch = { rescan: scan };
})();
