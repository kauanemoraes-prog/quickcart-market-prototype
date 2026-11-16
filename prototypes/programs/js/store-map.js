/**
 * Store Map
 * A graphic view of the store for the Areas tab: an isometric floor plan with every area drawn where it sits in the
 * store (fresh counters on the left, tall fridges on the back wall, aisles in the middle, checkout lanes at the front).
 * The List / Map toggle in the toolbar switches between the table and this drawing. Hovering an area highlights it and
 * selecting one shows its name below the map; what happens next is still to be defined.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'programs:areas-view';
  var Art = window.StoreMapArt;
  var pt = Art.pt;
  var ROW_DEPTH = Art.ROW_DEPTH;
  var partCounts = [];              // how many pieces each area is drawn with (an aisle is one piece per shelf row)
  var SECTIONS = {
    'Fresh': { color: '#7CC47F', label: 'Fresh section' },
    'Dry goods': { color: '#6FA8DC', label: 'Sales floor' },
    'Front end': { color: '#F2A154', label: 'Front end' },
    'Back of house': { color: '#A3AAB8', label: 'Back of house' }
  };

  // Where each area sits: x and y run along the two walls, w and d are its size on the floor, h its height (grid units).
  // Aisle areas are made of several shelf rows ([x, y, length]).
  var AREAS = [
    { name: 'Receiving & Stock Room', section: 'Back of house', kind: 'room', x: 0, y: 0, w: 7, d: 7, h: 2.8 },
    { name: 'Dairy', section: 'Fresh', kind: 'fridge', x: 9.5, y: 0, w: 9.5, d: 1.6, h: 3.2 },
    { name: 'Chilled & Frozen', section: 'Back of house', kind: 'fridge', x: 20.5, y: 0, w: 9.5, d: 1.6, h: 3.2 },
    { name: 'Butcher', section: 'Fresh', kind: 'counter', x: 0, y: 9, w: 1.8, d: 6, h: 1.3, sign: true },
    { name: 'Fish Counter', section: 'Fresh', kind: 'counter', x: 0, y: 16.5, w: 1.8, d: 4.5, h: 1.3 },
    { name: 'Bakery', section: 'Fresh', kind: 'counter', x: 3, y: 20.8, w: 9, d: 1.8, h: 1.3 },
    { name: 'Produce', section: 'Fresh', kind: 'produce', x: 25, y: 4.5, w: 7.5, d: 5.5, h: 0.9 },
    { name: 'Grocery', section: 'Dry goods', kind: 'aisle', rows: [[9, 6, 14], [9, 9.4, 14]], h: 2.4 },
    { name: 'Beverages', section: 'Dry goods', kind: 'aisle', rows: [[9, 12.8, 8], [9, 16.2, 8]], h: 2.4 },
    { name: 'Cleaning', section: 'Dry goods', kind: 'aisle', rows: [[18.5, 12.8, 6.5]], h: 2.4 },
    { name: 'Health & Beauty', section: 'Dry goods', kind: 'aisle', rows: [[18.5, 16.2, 6.5]], h: 2.4 },
    { name: 'Pet Shop', section: 'Dry goods', kind: 'aisle', rows: [[14, 19.4, 8]], h: 2.4 },
    { name: 'Checkout', section: 'Front end', kind: 'checkout', x: 25.5, y: 14.5, w: 7.5, d: 7.5, h: 1.1 }
  ];
  AREAS.forEach(function(a) {
    if (!a.rows) return;
    a.x = Math.min.apply(null, a.rows.map(function(r) { return r[0]; }));
    a.y = Math.min.apply(null, a.rows.map(function(r) { return r[1]; }));
    a.w = Math.max.apply(null, a.rows.map(function(r) { return r[0] + r[2]; })) - a.x;
    a.d = Math.max.apply(null, a.rows.map(function(r) { return r[1] + ROW_DEPTH; })) - a.y;
  });

  var state = { view: 'list', selected: '', matches: null, issues: false, peg: false, full: false };
  var ISSUES_KEY = 'programs:areas-issues';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Open issues of an area in the current store (the most urgent first). */
  function openIssues(name) {
    if (!window.AreasData || !window.Dropdowns || !window.DetailData) return [];
    var names = window.DetailData.getLines().map(function(l) { return l.name; });
    if (names.indexOf(name) === -1) return [];
    var rank = { Urgent: 0, High: 1, Normal: 2 };
    return window.AreasData.getIssues(window.Dropdowns.getCurrentSite(), name, names).filter(function(i) { return window.AreasData.statusOf(i) !== 'Resolved'; })
      .sort(function(x, y) { return (rank[x.priority] || 2) - (rank[y.priority] || 2); });
  }

  /** A map pin over the name of an area with the number of its open issues. Shown when "Show issues" is on. */
  function alertHtml(a) {
    var issues = openIssues(a.name);
    if (!issues.length) return '';
    var urgent = issues.some(function(i) { return i.priority === 'Urgent'; });
    return '<g class="store-map__alert' + (urgent ? ' store-map__alert--urgent' : '') + '" data-alert="' + esc(a.name) + '" tabindex="0" role="button" transform="translate(0,-13)" ' +
      'aria-label="' + issues.length + ' open issue' + (issues.length === 1 ? '' : 's') + ' in ' + esc(a.name) + '">' +
      '<ellipse class="store-map__pulse" cx="0" cy="0" rx="9" ry="4.5"/>' +
      '<circle class="store-map__pin-bg" cx="0" cy="-17.5" r="23"/>' +
      '<path class="store-map__pin" d="M0 0 C-9 -9 -13 -14 -13 -22 A13 13 0 1 1 13 -22 C13 -14 9 -9 0 0 Z"/>' +
      '<text text-anchor="middle" x="0" y="-22" dy="4.5">' + issues.length + '</text></g>';
  }

  /** The sign over an area: a dark board with the name on a short post, and the pin of its issues above it. */
  function labelHtml(a, i) {
    var p = pt(a.x + a.w / 2, a.y + a.d / 2, a.h + (a.sign ? 2.4 : 0.55) + (a.kind === 'room' ? 0.5 : 0));
    var w = a.name.length * 6.8 + 22;
    return '<g class="store-map__label" id="smap-label-' + i + '" data-area="' + esc(a.name) + '" transform="translate(' + p[0] + ',' + (p[1] - 12) + ')">' +
      '<line class="store-map__post" x1="0" y1="11" x2="0" y2="22"/><rect x="' + (-w / 2) + '" y="-11" width="' + w + '" height="22" rx="5"/>' +
      '<text text-anchor="middle" dy="4.5">' + esc(a.name) + '</text>' + alertHtml(a) + '</g>';
  }

  function entranceLabel() {
    var p = pt(Art.FLOOR.w - 0.2, 12.2, 0);
    return '<g class="store-map__label store-map__label--entrance" transform="translate(' + p[0] + ',' + (p[1] - 6) + ')"><rect x="-34" y="-11" width="68" height="22" rx="5"/><text text-anchor="middle" dy="4.5">Entrance</text></g>';
  }

  /* ---------- assemble ---------- */

  function svg() {
    var FLOOR = Art.FLOOR;
    var width = Math.round((FLOOR.w + FLOOR.d + 1.1) * Art.C * Art.S + 80), height = Math.round((FLOOR.w + FLOOR.d) * Art.H * Art.S + 285);
    // Every piece of the scene (parts of areas, shoppers, carts, gates) in depth order, so people stand in front of or behind the shelves
    var pieces = [];
    AREAS.forEach(function(a, i) {
      var sec = SECTIONS[a.section], ps = Art.parts(a, i);
      partCounts[i] = ps.length;
      ps.forEach(function(part, k) {
        pieces.push({ box: part.box, html: '<g class="store-map__area' + (state.selected === a.name ? ' is-selected' : '') + '" id="smap-area-' + i + '-' + k + '" data-area="' + esc(a.name) + '" tabindex="' + (k ? -1 : 0) + '" role="button" aria-label="' + esc(a.name) + ', ' + sec.label + '">' +
          (k ? '' : '<title>' + esc(a.name) + '</title>') + part.html + '</g>' });
      });
    });
    Art.props().forEach(function(p) { pieces.push({ box: p.box, html: '<g class="store-map__prop">' + p.html + '</g>' }); });
    var scene = Art.order(pieces).map(function(p) { return p.html; }).join('');
    var labels = AREAS.map(function(a, i) { return labelHtml(a, i); }).join('') + entranceLabel();
    return '<svg class="store-map__svg" viewBox="0 0 ' + width + ' ' + height + '" role="group" aria-label="Isometric floor plan of the store">' +
      '<g class="store-map__scene" id="store-map-scene">' + Art.floor() + Art.walls() + scene + '<g class="store-map__labels">' + labels + '</g></g></svg>';
  }

  function legend() {
    return '<ul class="store-map__legend" aria-label="Sections">' + Object.keys(SECTIONS).map(function(k) {
      return '<li><span style="background:' + SECTIONS[k].color + '"></span>' + SECTIONS[k].label + '</li>';
    }).join('') + '</ul>';
  }

  function caption() {
    var a = AREAS.filter(function(x) { return x.name === state.selected; })[0];
    if (!a && state.matches) return state.matches.length ? '<strong>' + state.matches.length + '</strong> of ' + AREAS.length + ' areas match your search' : 'No area matches your search.';
    if (!a) return 'Hover an area to highlight it, click one to see its products.';
    var lines = window.DetailData ? window.DetailData.getLines().filter(function(l) { return l.name === a.name; })[0] : null;
    return '<strong>' + esc(a.name) + '</strong> · ' + esc(SECTIONS[a.section].label) + (lines ? ' · ' + lines.stations.length + ' operation points' : '');
  }

  function renderMap() {
    var el = document.getElementById('store-map');
    if (!el) return;
    el.innerHTML = pegHtml() + '<div class="store-map__canvas">' + svg() + '</div><div class="store-map__footer">' + legend() + '<p class="store-map__caption" id="store-map-caption" aria-live="polite">' + caption() + '</p></div>' +
      '<div class="store-map__popover" id="store-map-popover" role="tooltip" hidden></div>';
    el.classList.toggle('store-map--issues', state.issues);
    el.classList.toggle('store-map--peg', state.peg);
    el.classList.toggle('store-map--full', state.full);
    placePeg();
    setTimeout(placePeg, 300);
    applyMatches();
  }

  /** The search of the toolbar: areas that do not match are faded, the ones that do stay as they are. */
  function applyMatches() {
    var m = state.matches;
    document.querySelectorAll('.store-map__area, .store-map__label').forEach(function(g) {
      g.classList.toggle('is-dim', !!m && m.indexOf(g.getAttribute('data-area')) === -1);
    });
    var cap = document.getElementById('store-map-caption');
    if (cap) cap.innerHTML = caption();
  }

  /* ---------- the issues of an area, in a popover over its exclamation mark ---------- */

  var hideTimer = null;

  function popoverHtml(name) {
    var issues = openIssues(name), tone = { Urgent: 'danger', High: 'warning', Normal: 'muted' };
    var statusTone = { 'Open': 'muted', 'In progress': 'info', 'Waiting for parts': 'warning' };
    return '<h4 class="store-map__popover-title">' + esc(name) + ' · ' + issues.length + ' open issue' + (issues.length === 1 ? '' : 's') + '</h4><ul>' + issues.map(function(i) {
      var status = window.AreasData.statusOf(i);
      var missing = i.resources.filter(function(r) { return r.availability !== 'Available'; }).map(function(r) { return r.name; });
      return '<li><div class="store-map__popover-head"><strong>' + esc(i.title) + '</strong>' +
        '<span class="ov-badge ov-badge--' + tone[i.priority] + '">' + esc(i.priority) + '</span><span class="ov-badge ov-badge--' + (statusTone[status] || 'muted') + '">' + esc(status) + '</span></div>' +
        '<p>' + esc(i.detail) + '</p>' +
        '<small>' + i.resources.length + ' item' + (i.resources.length === 1 ? '' : 's') + ' needed' + (missing.length ? ' · missing or short: ' + esc(missing.join(', ')) : ' · all available') + '</small></li>';
    }).join('') + '</ul><p class="store-map__popover-foot">Click the area to see its products. The issues are in the Areas list.</p>';
  }

  function showPopover(target) {
    var pop = document.getElementById('store-map-popover');
    if (!pop) return;
    clearTimeout(hideTimer);
    pop.innerHTML = popoverHtml(target.getAttribute('data-alert'));
    pop.hidden = false;
    var r = target.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = r.right + 10 + pw > window.innerWidth - 8 ? r.left - 10 - pw : r.right + 10;
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = Math.max(8, Math.min(window.innerHeight - ph - 8, r.top + r.height / 2 - ph / 2)) + 'px';
  }

  function hidePopover(now) {
    clearTimeout(hideTimer);
    var pop = document.getElementById('store-map-popover');
    if (!pop) return;
    if (now) { pop.hidden = true; return; }
    hideTimer = setTimeout(function() { pop.hidden = true; }, 150);
  }

  function applyIssues() {
    var el = document.getElementById('store-map');
    if (el) el.classList.toggle('store-map--issues', state.issues);
    document.querySelectorAll('[data-issues-toggle]').forEach(function(b) {
      b.classList.toggle('products-chip--active', state.issues);
      b.setAttribute('aria-pressed', state.issues ? 'true' : 'false');
    });
    if (!state.issues) hidePopover(true);
  }

  function applyView() {
    var panel = document.getElementById('process-flow');
    if (!panel) return;
    panel.classList.toggle('areas--map', state.view === 'map');
    var map = document.getElementById('store-map');
    if (map) map.hidden = state.view !== 'map';
    document.querySelectorAll('.areas-view-toggle__btn').forEach(function(b) {
      var on = b.getAttribute('data-areas-view') === state.view;
      b.classList.toggle('areas-view-toggle__btn--active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (state.view === 'map') renderMap();
    applyIssues();
  }

  function mark() {
    document.querySelectorAll('.store-map__area').forEach(function(g) { g.classList.toggle('is-selected', g.getAttribute('data-area') === state.selected); });
    var cap = document.getElementById('store-map-caption');
    if (cap) cap.innerHTML = caption();
  }

  /* ---------- the little person: look inside an area, close up ---------- */

  var PEG_ICON = '<svg viewBox="0 0 24 32" width="20" height="28" aria-hidden="true" focusable="false"><circle cx="12" cy="5" r="4" fill="#F6B93B" stroke="#C98A12" stroke-width=".8"/>' +
    '<path d="M6.5 11h11l2.2 9.5-3 .9L16 17l-.4 14h-3.2L12 22.4h0L11.6 31H8.4L8 17l-.7 4.4-3-.9z" fill="#F6B93B" stroke="#C98A12" stroke-width=".8" stroke-linejoin="round"/>' +
    '<path d="M9 11l3 4 3-4z" fill="#E5493A"/></svg>';

  function pegHtml() {
    // A zero-height sticky wrapper: the button and its hint follow the page while the map scrolls, under the bar of the tab
    return '<div class="store-map__peg-wrap"><button type="button" class="store-map__peg store-map__full" id="store-map-full" aria-pressed="' + state.full + '" aria-label="' + (state.full ? 'Exit full screen' : 'Full screen') + '" title="' + (state.full ? 'Exit full screen' : 'Full screen') + '"><lucide-icon name="' + (state.full ? 'minimize' : 'maximize') + '" style="font-size:20px"></lucide-icon></button>' +
      '<button type="button" class="store-map__peg" id="store-map-peg" aria-pressed="' + state.peg + '" aria-label="Look inside an area" title="Look inside an area">' + PEG_ICON + '</button>' +
      '<div class="store-map__peg-hint" id="store-map-peg-hint"' + (state.peg ? '' : ' hidden') + '>Click an area to look inside <kbd>Esc</kbd></div></div>';
  }

  /** The button is fixed on the screen: it sits at the top right of the map and, when the page scrolls, stops under the bar of the tab. */
  function placePeg() {
    var map = document.getElementById('store-map'), peg = document.getElementById('store-map-peg'), hint = document.getElementById('store-map-peg-hint');
    if (!map || map.hidden || !peg) return;
    var canvas = map.querySelector('.store-map__canvas'), r = (canvas || map).getBoundingClientRect(), tb = document.querySelector('.areas-toolbar');
    var stuck = tb ? tb.getBoundingClientRect().bottom : 0, size = 44;
    if (state.full) stuck = 0;
    var top = Math.max(r.top + 12, stuck + 12), left = Math.min(r.right, document.documentElement.clientWidth) - 28 - size, full = document.getElementById('store-map-full');
    var visible = r.bottom > top + size + 8 && r.top < window.innerHeight;
    peg.style.display = visible ? 'flex' : 'none';
    peg.style.top = Math.round(top) + 'px';
    peg.style.left = Math.round(left) + 'px';
    if (full) { full.style.display = visible ? 'flex' : 'none'; full.style.top = Math.round(top) + 'px'; full.style.left = Math.round(left - 8 - size) + 'px'; }
    if (hint) {
      hint.style.top = Math.round(top + 6) + 'px';
      hint.style.left = Math.max(8, Math.round(left - 8 - size - 12 - hint.offsetWidth)) + 'px';
      if (!visible) hint.style.display = 'none'; else hint.style.display = '';
    }
  }
  var pegQueued = false;
  function pegLater() {
    if (pegQueued) return;
    pegQueued = true;
    requestAnimationFrame(function() { pegQueued = false; placePeg(); });
  }
  window.addEventListener('resize', pegLater);
  window.addEventListener('scroll', pegLater, true);

  /** Full screen: the map covers the whole window (under the drawers) and, where the browser allows it, the browser goes full screen too. */
  function setFull(on) {
    state.full = on;
    var el = document.getElementById('store-map');
    if (!el) return;
    el.classList.toggle('store-map--full', on);
    document.documentElement.classList.toggle('has-map-full', on);
    var b = document.getElementById('store-map-full');
    if (b) {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
      b.title = on ? 'Exit full screen' : 'Full screen';
      b.innerHTML = '<lucide-icon name="' + (on ? 'minimize' : 'maximize') + '" style="font-size:20px"></lucide-icon>';
    }
    try {
      if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function() {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function() {});
    } catch (err) {}
    placePeg();
    setTimeout(placePeg, 350);
  }

  document.addEventListener('fullscreenchange', function() {
    // The browser left full screen (Esc): the map goes back to its place
    if (!document.fullscreenElement && state.full) setFull(false);
  });

  function setPeg(on) {
    state.peg = on;
    var el = document.getElementById('store-map');
    if (!el) return;
    el.classList.toggle('store-map--peg', on);
    var b = document.getElementById('store-map-peg'), h = document.getElementById('store-map-peg-hint');
    if (b) b.setAttribute('aria-pressed', String(on));
    if (h) h.hidden = !on;
    placePeg();
  }

  /** The close-up of one area: it drawn big on a patch of the floor, with a way to open its products. */
  function closeUp(name) {
    var idx = -1, a = AREAS.filter(function(x, i) { if (x.name === name) idx = i; return x.name === name; })[0];
    if (!a) return;
    closeCloseUp();
    var x0 = Math.max(a.x - 2.2, -0.5), x1 = a.x + a.w + 2.2 + (a.kind === 'room' ? 1.6 : 0), y0 = Math.max(a.y - 2.2, -0.5), y1 = a.y + a.d + 2.2 + (a.kind === 'room' ? 1.6 : 0);
    var floor = '', tile = 1;
    for (var i = Math.floor(x0); i < x1; i += tile) {
      for (var j = Math.floor(y0); j < y1; j += tile) {
        floor += '<polygon points="' + [Art.pt(i, j, 0), Art.pt(i + tile, j, 0), Art.pt(i + tile, j + tile, 0), Art.pt(i, j + tile, 0)].map(function(q) { return q.join(','); }).join(' ') +
          '" fill="' + ((i + j) % 2 ? '#C5CAD1' : '#CDD2D8') + '" stroke="#AEB4BD" stroke-width=".8"/>';
      }
    }
    var corners = [Art.pt(x0, y1, 0), Art.pt(x1, y1, 0), Art.pt(x1, y0, 0), Art.pt(x0, y0, 0), Art.pt(a.x, a.y, a.h + 1.2), Art.pt(a.x + a.w, a.y, a.h + 1.2), Art.pt(a.x, a.y + a.d, a.h + 1.2), Art.pt(a.x + a.w, a.y + a.d, a.h + 1.2)];
    var minX = Math.min.apply(null, corners.map(function(q) { return q[0]; })) - 24, maxX = Math.max.apply(null, corners.map(function(q) { return q[0]; })) + 24;
    var minY = Math.min.apply(null, corners.map(function(q) { return q[1]; })) - 24, maxY = Math.max.apply(null, corners.map(function(q) { return q[1]; })) + 24;
    var parts = Art.order(Art.parts(a, idx)).map(function(p) { return p.html; }).join('');
    var sec = SECTIONS[a.section];
    var o = document.createElement('div');
    o.className = 'store-map__closeup';
    o.id = 'store-map-closeup';
    o.innerHTML = '<div class="store-map__closeup-card" role="dialog" aria-modal="true" aria-label="' + esc(a.name) + ', close up">' +
      '<div class="store-map__closeup-head"><span class="store-map__closeup-dot" style="background:' + sec.color + '"></span><h3>' + esc(a.name) + '</h3><span class="store-map__closeup-sec">' + esc(sec.label) + '</span>' +
        '<button type="button" class="store-map__closeup-close" data-closeup-close aria-label="Close"><lucide-icon name="x" style="font-size:22px"></lucide-icon></button></div>' +
      '<div class="store-map__closeup-art"><svg viewBox="' + [minX, minY, maxX - minX, maxY - minY].map(function(v) { return Math.round(v); }).join(' ') + '" role="img" aria-label="' + esc(a.name) + '">' +
        '<g>' + floor + parts + '</g></svg></div>' +
      '<div class="store-map__closeup-foot"><button type="button" class="btn btn--secondary btn--medium" data-closeup-close>Close</button>' +
        '<button type="button" class="btn btn--primary btn--medium" data-closeup-open="' + esc(a.name) + '">See products</button></div></div>';
    o.addEventListener('click', function(e) {
      if (e.target === o || e.target.closest('[data-closeup-close]')) { closeCloseUp(); return; }
      var open = e.target.closest('[data-closeup-open]');
      if (open) { closeCloseUp(); select(open.getAttribute('data-closeup-open')); }
    });
    document.body.appendChild(o);
    var btn = o.querySelector('[data-closeup-open]');
    if (btn) btn.focus();
  }

  function closeCloseUp() {
    var o = document.getElementById('store-map-closeup');
    if (o) o.remove();
  }

  /** Clicking an area selects it and opens the drawer with its products. */
  function select(name) {
    state.selected = name;
    mark();
    var a = AREAS.filter(function(x) { return x.name === name; })[0];
    if (window.AreaDrawer && a) window.AreaDrawer.open(name, SECTIONS[a.section].label);
    if (a) focusOn(a);
  }

  /* ---------- zoom to the clicked area ---------- */

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ZOOM_MIN = 0.6, ZOOM_MAX = 3.6;

  /** Bounding box of an area in the drawing: the corners of its footprint, on the floor and at its height. */
  function boxOf(a) {
    var pts = [];
    [0, a.h + (a.sign ? 2.4 : 0.6)].forEach(function(z) {
      [[a.x, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.d], [a.x, a.y + a.d]].forEach(function(c) { pts.push(pt(c[0], c[1], z)); });
    });
    var xs = pts.map(function(p) { return p[0]; }), ys = pts.map(function(p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  /** The layer drawn over everything: a veil, and the clicked area (and its name) drawn again on top of it. */
  function focusLayer(scene, index) {
    var layer = scene.querySelector('.store-map__focus-layer');
    if (!layer) {
      layer = document.createElementNS(SVG_NS, 'g');
      layer.setAttribute('class', 'store-map__focus-layer');
      var veil = document.createElementNS(SVG_NS, 'rect');
      veil.setAttribute('class', 'store-map__veil');
      veil.setAttribute('x', '-4000'); veil.setAttribute('y', '-4000'); veil.setAttribute('width', '9000'); veil.setAttribute('height', '9000');
      layer.appendChild(veil);
      scene.appendChild(layer);
    }
    Array.prototype.slice.call(layer.querySelectorAll('.store-map__clone')).forEach(function(n) { layer.removeChild(n); });
    var hrefs = [];
    for (var k = 0; k < (partCounts[index] || 1); k++) hrefs.push(['area', '#smap-area-' + index + '-' + k]);
    hrefs.push(['label', '#smap-label-' + index]);
    hrefs.forEach(function(h) {
      var use = document.createElementNS(SVG_NS, 'use');
      use.setAttribute('class', 'store-map__clone store-map__clone--' + h[0]);
      use.setAttribute('href', h[1]);
      layer.appendChild(use);
    });
    return layer;
  }

  /** Zoom so the area sits in the middle of the part of the map the open drawer leaves free, and veil the rest. */
  function focusOn(a) {
    var scene = document.getElementById('store-map-scene'), svgEl = scene && scene.ownerSVGElement;
    if (!scene || !svgEl) return;
    var layer = focusLayer(scene, AREAS.indexOf(a));
    var rect = svgEl.getBoundingClientRect(), vb = svgEl.viewBox.baseVal, k = rect.width / vb.width;
    var drawer = document.querySelector('#area-drawer .drawer'), drawerW = drawer ? drawer.getBoundingClientRect().width : 0;
    var left = Math.max(rect.left, 0), right = Math.min(rect.right, window.innerWidth - drawerW - 16);
    var top = Math.max(rect.top, 0), bottom = Math.min(rect.bottom, window.innerHeight);
    if (right - left < 200) { left = rect.left; right = rect.right; }
    if (bottom - top < 200) { top = rect.top; bottom = rect.bottom; }
    var freeW = (right - left) / k, freeH = (bottom - top) / k, box = boxOf(a);
    var scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(freeW * 0.78 / box.w, freeH * 0.78 / box.h)));
    var fx = ((left + right) / 2 - rect.left) / k, fy = ((top + bottom) / 2 - rect.top) / k;
    scene.style.transform = 'translate(' + (fx - scale * box.cx).toFixed(1) + 'px, ' + (fy - scale * box.cy).toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
    // The veil fades in after the drawing starts to move
    requestAnimationFrame(function() { layer.classList.add('is-on'); });
  }

  function unfocus() {
    var scene = document.getElementById('store-map-scene');
    if (!scene) return;
    scene.style.transform = '';
    var layer = scene.querySelector('.store-map__focus-layer');
    if (layer) layer.classList.remove('is-on');
  }

  window.StoreMap = {
    init: function() {
      try { if (localStorage.getItem(STORAGE_KEY) === 'map') state.view = 'map'; } catch (e) {}
      document.querySelectorAll('.areas-view-toggle__btn').forEach(function(b) {
        b.addEventListener('click', function() {
          state.view = b.getAttribute('data-areas-view');
          try { localStorage.setItem(STORAGE_KEY, state.view); } catch (e) {}
          applyView();
        });
      });
      try { state.issues = localStorage.getItem(ISSUES_KEY) === '1'; } catch (e) {}
      document.querySelectorAll('[data-issues-toggle]').forEach(function(b) {
        b.addEventListener('click', function() {
          state.issues = !state.issues;
          try { localStorage.setItem(ISSUES_KEY, state.issues ? '1' : '0'); } catch (e) {}
          applyIssues();
        });
      });
      // Another store has other issues: draw the map again
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', function() { if (state.view === 'map') renderMap(); });
      });
      var map = document.getElementById('store-map');
      if (map) {
        // An aisle is drawn in several pieces: hovering one highlights the whole area
        map.addEventListener('mouseover', function(e) {
          var hovered = e.target.closest && e.target.closest('.store-map__area');
          document.querySelectorAll('.store-map__area.is-hover').forEach(function(g) { g.classList.remove('is-hover'); });
          if (hovered) document.querySelectorAll('.store-map__area').forEach(function(g) { if (g.getAttribute('data-area') === hovered.getAttribute('data-area')) g.classList.add('is-hover'); });
        });
        map.addEventListener('mouseleave', function() {
          document.querySelectorAll('.store-map__area.is-hover').forEach(function(g) { g.classList.remove('is-hover'); });
        });
        map.addEventListener('mouseover', function(e) {
          var t = e.target.closest('.store-map__alert');
          if (t) showPopover(t);
          else if (e.target.closest('.store-map__popover')) clearTimeout(hideTimer);
        });
        map.addEventListener('mouseout', function(e) {
          if (e.target.closest('.store-map__alert') || e.target.closest('.store-map__popover')) hidePopover();
        });
        map.addEventListener('focusin', function(e) {
          var t = e.target.closest && e.target.closest('.store-map__alert');
          if (t) showPopover(t);
        });
        map.addEventListener('focusout', function(e) {
          if (e.target.closest && e.target.closest('.store-map__alert')) hidePopover();
        });
        map.addEventListener('click', function(e) {
          hidePopover(true);
          if (e.target.closest('#store-map-full')) { setFull(!state.full); return; }
          if (e.target.closest('#store-map-peg')) { setPeg(!state.peg); return; }
          var g = e.target.closest('.store-map__area');
          if (g && state.peg) { setPeg(false); closeUp(g.getAttribute('data-area')); return; }
          if (g) select(g.getAttribute('data-area'));
        });
        document.addEventListener('keydown', function(e) {
          if (e.key !== 'Escape') return;
          if (document.getElementById('store-map-closeup')) { closeCloseUp(); return; }
          if (state.peg) { setPeg(false); return; }
          if (state.full && !document.querySelector('.drawer-overlay--open')) setFull(false);
        });
        map.addEventListener('keydown', function(e) {
          var g = e.target.closest && e.target.closest('.store-map__area');
          if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g.getAttribute('data-area')); }
        });
      }
      document.addEventListener('areas:filtered', function(e) {
        state.matches = e.detail.active ? e.detail.names : null;
        applyMatches();
      });
      applyView();
    },
    render: renderMap,
    clearSelection: function() { state.selected = ''; mark(); unfocus(); }
  };
})();
