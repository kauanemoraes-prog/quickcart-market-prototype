/**
 * Areas Tree
 * The list view of the Areas tab: a tree table. Each area holds two groups:
 *   1.1 Products  - the SKUs sold from the area, with stock and status;
 *   1.2 Issues    - things to fix in the area (a freezer door that does not seal), and for each issue the equipment and
 *                   consumables needed to fix it, with whether the store has them.
 * Issues and the items needed for them can be added from the table.
 */

(function() {
  'use strict';

  var SECTION_LABEL = { 'Fresh': 'Fresh section', 'Dry goods': 'Sales floor', 'Front end': 'Front end', 'Back of house': 'Back of house' };
  var STOCK_ROOM = 'Receiving & Stock Room';
  var STOCK_ROOM_LIMIT = 12;
  var STATUS_TONE = { 'In stock': 'success', 'Low stock': 'warning', 'Out of stock': 'danger', 'Open': 'muted', 'In progress': 'info', 'Waiting for parts': 'warning',
    'Resolved': 'success', 'Used': 'muted', 'Available': 'success', 'Short': 'warning', 'Missing': 'danger', 'Borrow from another store': 'info' };
  var PRIORITY_TONE = { 'Normal': 'muted', 'High': 'warning', 'Urgent': 'danger' };
  var WIDTHS = [440, 150, 110, 340, 150, 170, 200];

  var state = { query: '', quick: 'all', open: {}, form: null };
  var areas = [];      // [{ name, section, description, aisle, products: [row], issues: [issue] }]
  var resizer = null;
  var builtFor = '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function money(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }

  function site() { return window.Dropdowns.getCurrentSite(); }

  function badge(text, tone) { return '<span class="ov-badge ov-badge--' + tone + '">' + esc(text) + '</span>'; }

  /* ---------- data ---------- */

  /** Open issues first, the most urgent on top; the ones already fixed at the end. */
  function issueRank(i) {
    if (window.AreasData.statusOf(i) === 'Resolved') return 9;
    return { Urgent: 0, High: 1, Normal: 2 }[i.priority] || 2;
  }

  function load() {
    var lines = window.DetailData.getLines(), names = lines.map(function(l) { return l.name; });
    var inv = window.ProductsData.getInventory(site());
    areas = lines.map(function(l, i) {
      var products = l.name === STOCK_ROOM
        ? inv.filter(function(r) { return r.backroom > 0; }).sort(function(a, b) { return b.backroom - a.backroom; })
        : inv.filter(function(r) { return r.sku.department === l.name; });
      var issues = window.AreasData.getIssues(site(), l.name, names).sort(function(x, y) { return issueRank(x) - issueRank(y); });
      return {
        open: issues.filter(function(x) { return window.AreasData.statusOf(x) !== 'Resolved'; }).length,
        id: 'a' + (i + 1), num: String(i + 1), name: l.name, section: SECTION_LABEL[l.nameTag] || l.nameTag, description: l.description,
        aisle: window.ProductsData.aisles[l.name], products: products, stockRoom: l.name === STOCK_ROOM,
        issues: issues
      };
    });
    areas.names = names;
  }

  /* ---------- filtering ---------- */

  function matchesQuery(text) { return String(text).toLowerCase().indexOf(state.query) !== -1; }

  function productMatch(r) {
    var s = r.sku;
    return !state.query || [s.name, s.brand, s.variant, s.sku, s.ean].some(matchesQuery);
  }

  function issueMatch(i) {
    return !state.query || matchesQuery(i.title) || matchesQuery(i.detail) || i.resources.some(function(r) { return matchesQuery(r.name); });
  }

  function areaVisible(a) {
    if (state.quick === 'issues' && !a.open) return false;
    if (state.quick === 'waiting' && !a.issues.some(function(i) { return window.AreasData.statusOf(i) === 'Waiting for parts'; })) return false;
    if (!state.query) return true;
    return matchesQuery(a.name) || matchesQuery(a.description) || a.products.some(productMatch) || a.issues.some(issueMatch);
  }

  /* ---------- rows ---------- */

  /* The tree guides are drawn by the cell's background (one vertical line per ancestor, see areas-tree.css), so they run
   * unbroken from row to row; the elbow is the short horizontal line before the item. */
  var ELBOW = '<span class="tt-elbow"></span>';

  function nameCell(level, num, label, opts) {
    opts = opts || {};
    var toggle = opts.id
      ? '<button type="button" class="tt-toggle' + (opts.open ? ' tt-toggle--open' : '') + '" data-toggle="' + opts.id + '" aria-expanded="' + !!opts.open + '" aria-label="' + (opts.open ? 'Collapse ' : 'Expand ') + esc(opts.plain || label) + '">' +
          '<lucide-icon name="chevron-down" style="font-size:14px"></lucide-icon></button>'
      : '<span class="tt-toggle tt-toggle--none"></span>';
    return '<td class="tt-cell tt-cell--name tt-lv' + level + '">' + (level > 1 ? ELBOW : '') + toggle +
      (num ? '<span class="tt-num">' + num + '</span>' : '') + (opts.chip ? '<span class="tt-chip tt-chip--' + opts.chip.toLowerCase() + '">' + opts.chip + '</span>' : '') +
      '<span class="tt-label' + (level === 1 ? ' tt-label--area' : '') + '">' + label + '</span></td>';
  }

  function cells(section, aisle, desc, qty, status, items) {
    return '<td class="tt-cell">' + (section || '') + '</td><td class="tt-cell">' + (aisle || '') + '</td><td class="tt-cell tt-cell--desc">' + (desc || '') + '</td>' +
      '<td class="tt-cell tt-cell--num">' + (qty || '') + '</td><td class="tt-cell">' + (status || '') + '</td><td class="tt-cell">' + (items || '') + '</td>';
  }

  function isOpen(id) { return !!state.open[id] || !!state.query; }

  function row(cls, attrs, inner) { return '<tr class="tt-row ' + cls + '"' + (attrs || '') + '>' + inner + '</tr>'; }

  function productRows(a, base) {
    var list = a.products.filter(productMatch), out = '', limit = a.stockRoom && !state.query ? STOCK_ROOM_LIMIT : list.length;
    list.slice(0, limit).forEach(function(r, i) {
      var s = r.sku;
      var label = esc(s.name) + ' <span class="tt-muted">' + esc((s.brand === 'Loose' ? '' : s.brand + ' · ') + s.variant + ' · ' + s.size) + '</span>';
      var desc = (r.promo ? '<span class="products-promo">' + money(r.promo) + '</span> <s>' + money(r.price) + '</s>' : money(r.price)) + ' · ' + esc(s.sku);
      var qty = a.stockRoom ? r.backroom + ' ' + r.unit : r.stock + ' / min ' + r.min;
      out += row('tt-row--l3', ' data-kind="product"', nameCell(3, base + '.' + (i + 1), label) + cells('', '', desc, qty, badge(r.status, STATUS_TONE[r.status]), esc(s.packLabel)));
    });
    if (list.length > limit) {
      out += row('tt-row--note', '', '<td class="tt-cell tt-cell--note tt-lv3" colspan="7">' + 'Showing ' + limit + ' of ' + list.length + ' products. Click the area on the map to see all of them.</td>');
    }
    return out;
  }

  function resourceRows(issue, base) {
    var out = '';
    issue.resources.forEach(function(r, i) {
      var desc = r.availability === 'Used' ? 'Used for this repair' : r.type === 'Equipment' ? (r.availability === 'Available' ? 'In this store' : 'Needs to be borrowed') : (r.availability === 'Available' ? 'In stock: ' + r.have : (r.have ? 'Have ' + r.have + ', need ' + r.qty : 'Not in stock, order it'));
      out += row('tt-row--l4', ' data-kind="resource"', nameCell(4, base + '.' + (i + 1), esc(r.name), { chip: r.type }) + cells('', '', esc(desc), String(r.qty), badge(r.availability, STATUS_TONE[r.availability]), ''));
    });
    return out;
  }

  function formRow(level, html) {
    return row('tt-row--form', '', '<td class="tt-cell tt-cell--form tt-lv' + level + ' tt-end" colspan="7">' + ELBOW + html + '</td>');
  }

  function issueFormHtml(areaId) {
    return '<form class="tt-form" data-form="issue" data-area="' + areaId + '" novalidate>' +
      '<input type="text" name="title" class="form-input tt-form__input" placeholder="What needs fixing?" aria-label="Issue" autocomplete="off">' +
      '<select name="priority" class="form-select form-select--stylized" aria-label="Priority"><option>Normal</option><option>High</option><option>Urgent</option></select>' +
      '<button type="submit" class="btn btn--primary btn--small">Add issue</button><button type="button" class="btn btn--secondary btn--small" data-cancel>Cancel</button>' +
      '<span class="tt-form__error" hidden></span></form>';
  }

  function optionList(type) {
    var list = type === 'Equipment' ? window.AreasData.equipment : window.AreasData.consumables;
    return list.map(function(n) { return '<option>' + esc(n) + '</option>'; }).join('');
  }

  function itemFormHtml(issueId) {
    return '<form class="tt-form" data-form="item" data-issue="' + issueId + '" novalidate>' +
      '<select name="type" class="form-select form-select--stylized" aria-label="Type"><option>Equipment</option><option>Consumable</option></select>' +
      '<select name="name" class="form-select form-select--stylized tt-form__name" aria-label="Item">' + optionList('Equipment') + '</select>' +
      '<input type="number" name="qty" class="form-input tt-form__qty" value="1" min="1" max="99" aria-label="Quantity">' +
      '<button type="submit" class="btn btn--primary btn--small">Add item</button><button type="button" class="btn btn--secondary btn--small" data-cancel>Cancel</button></form>';
  }

  function issueRows(a, base) {
    var out = '', list = a.issues.filter(function(i) { return !state.query || issueMatch(i) || matchesQuery(a.name); });
    list.forEach(function(issue, i) {
      var num = base + '.' + (i + 1), open = isOpen(issue.id), status = window.AreasData.statusOf(issue);
      var eq = issue.resources.filter(function(r) { return r.type === 'Equipment'; }).length, cons = issue.resources.length - eq;
      out += row('tt-row--l3 tt-row--issue', ' data-kind="issue"',
        nameCell(3, num, esc(issue.title) + (issue.added ? ' ' + badge('New', 'info') : ''), { id: issue.id, open: open, plain: issue.title }) +
        cells('', '', esc(issue.detail), status === 'Resolved' ? '' : badge(issue.priority, PRIORITY_TONE[issue.priority]), badge(status, STATUS_TONE[status]),
          '<span class="ov-badge ov-badge--muted">' + eq + ' equipment · ' + cons + ' consumable' + (cons === 1 ? '' : 's') + '</span>'));
      if (open) {
        out += resourceRows(issue, num);
        if (status === 'Resolved') return;
        if (state.form && state.form.kind === 'item' && state.form.id === issue.id) out += formRow(4, itemFormHtml(issue.id));
        else out += row('tt-row--add', '', '<td class="tt-cell tt-cell--add tt-lv4 tt-end" colspan="7">' + ELBOW + '<button type="button" class="tt-add" data-add-item="' + issue.id + '">+ Add item</button></td>');
      }
    });
    return out;
  }

  function areaRows(a) {
    var out = '', open = isOpen(a.id), prodOpen = isOpen(a.id + 'p'), issOpen = isOpen(a.id + 'i');
    var issues = a.open, resolved = a.issues.length - a.open;
    out += row('tt-row--l1', ' data-area="' + esc(a.name) + '"',
      nameCell(1, a.num, esc(a.name), { id: a.id, open: open }) +
      cells(esc(a.section), a.aisle ? 'Aisle ' + a.aisle : '', esc(a.description), '', '',
        badge(plural(a.products.length, 'product'), 'muted') + ' ' + badge(plural(issues, 'issue'), issues ? 'warning' : 'muted')));
    if (!open) return out;
    out += row('tt-row--l2', ' data-kind="group"', nameCell(2, a.num + '.1', 'Products', { id: a.id + 'p', open: prodOpen }) +
      cells('', '', a.stockRoom ? 'Backroom stock of every area' : 'Sold from this area', '', '', '<span class="ov-badge ov-badge--muted">' + plural(a.products.length, 'SKU') + '</span>'));
    if (prodOpen) out += productRows(a, a.num + '.1');
    out += row('tt-row--l2', ' data-kind="group"', nameCell(2, a.num + '.2', 'Issues &amp; repairs', { id: a.id + 'i', open: issOpen }) +
      cells('', '', 'Equipment and fixtures to fix in this area', '', issues ? badge(plural(issues, 'open issue'), 'warning') : '',
        badge(issues + ' open', issues ? 'warning' : 'muted') + (resolved ? ' ' + badge(resolved + ' resolved', 'muted') : '')));
    if (issOpen) {
      out += issueRows(a, a.num + '.2');
      if (state.form && state.form.kind === 'issue' && state.form.id === a.id) out += formRow(3, issueFormHtml(a.id));
      else out += row('tt-row--add', '', '<td class="tt-cell tt-cell--add tt-lv3 tt-end" colspan="7">' + ELBOW + '<button type="button" class="tt-add" data-add-issue="' + a.id + '">+ Add issue</button></td>');
    }
    return out;
  }

  /* ---------- render ---------- */

  function headHtml() {
    return ['Name <span class="tt-hint">Area › Group › Item</span>', 'Section', 'Aisle', 'Description', 'Qty / Priority', 'Status', 'Items'].map(function(h, i) {
      return '<th class="tt-head' + (i === 4 ? ' tt-head--num' : '') + '">' + h + '</th>';
    }).join('');
  }

  function renderChips() {
    var withIssues = areas.filter(function(a) { return a.open; }).length;
    var waiting = areas.filter(function(a) { return a.issues.some(function(i) { return window.AreasData.statusOf(i) === 'Waiting for parts'; }); }).length;
    var chips = [['all', 'All areas', areas.length], ['issues', 'With issues', withIssues], ['waiting', 'Waiting for parts', waiting]];
    document.getElementById('areas-chips').innerHTML = chips.map(function(x) {
      return '<button type="button" class="products-chip' + (state.quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (state.quick === x[0]) + '">' + x[1] + ' <strong>' + x[2] + '</strong></button>';
    }).join('');
  }

  function renderBody() {
    var list = areas.filter(areaVisible);
    document.getElementById('areas-body').innerHTML = list.map(areaRows).join('') ||
      '<tr class="tt-row"><td class="tt-cell tt-empty" colspan="7">' + (areas.length ? 'No areas match your filters.' : 'This store has no areas yet.') + '</td></tr>';
    // The map shows the same search: it highlights the areas that match
    document.dispatchEvent(new CustomEvent('areas:filtered', { detail: { active: !!(state.query || state.quick !== 'all'), names: list.map(function(a) { return a.name; }) } }));
  }

  function render() {
    var view = document.getElementById('areas-view');
    if (!view || !view.dataset.ready) return;
    load();
    renderChips();
    renderBody();
  }

  /* ---------- actions ---------- */

  function toggle(id) {
    if (state.open[id]) delete state.open[id]; else state.open[id] = true;
    renderBody();
  }

  function notify(message) {
    if (typeof window.showNotification === 'function') window.showNotification('success', message);
  }

  function submitIssue(form) {
    var a = areas.filter(function(x) { return x.id === form.getAttribute('data-area'); })[0];
    var title = form.elements.title.value.trim(), err = form.querySelector('.tt-form__error');
    if (!title) { err.textContent = 'Describe what needs fixing.'; err.hidden = false; form.elements.title.focus(); return; }
    var issue = window.AreasData.addIssue(site(), a.name, { title: title, priority: form.elements.priority.value });
    state.form = { kind: 'item', id: issue.id };
    state.open[a.id] = state.open[a.id + 'i'] = state.open[issue.id] = true;
    load();
    renderChips();
    renderBody();
    notify('Issue added to ' + a.name + '. Now add the equipment and consumables needed to fix it.');
  }

  function submitItem(form) {
    var id = form.getAttribute('data-issue'), qty = parseInt(form.elements.qty.value, 10);
    if (!(qty >= 1)) { form.elements.qty.focus(); return; }
    window.AreasData.addResource(site(), areas.names, id, { type: form.elements.type.value, name: form.elements.name.value, qty: qty });
    state.form = null;
    load();
    renderBody();
    notify(form.elements.name.value + ' added to the issue.');
  }

  /** Expand an area and bring it into view (used by the Overview). */
  function focusArea(name) {
    var a = areas.filter(function(x) { return x.name === name; })[0];
    if (!a) return;
    state.query = '';
    state.quick = 'all';
    var input = document.getElementById('areas-search');
    if (input) input.value = '';
    state.open[a.id] = true;
    renderChips();
    renderBody();
    var tr = document.querySelector('#areas-body tr[data-area="' + name.replace(/"/g, '\\"') + '"]');
    if (tr) {
      tr.scrollIntoView({ block: 'center' });
      tr.classList.add('tt-row--flash');
      setTimeout(function() { tr.classList.remove('tt-row--flash'); }, 1600);
    }
  }

  /* ---------- wiring ---------- */

  function build(view) {
    view.dataset.ready = '1';
    view.innerHTML =
      '<div class="products-toolbar areas-toolbar">' +
        '<div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
          '<input type="text" id="areas-search" class="products-search__input" placeholder="Search areas, products, issues, equipment or consumables" autocomplete="off"></div>' +
        '<button type="button" class="products-chip areas-map-only" data-issues-toggle aria-pressed="false" title="Show the open issues of each area on the map">' +
          '<svg class="issues-pin" viewBox="-14 -36 28 38" width="14" height="19" aria-hidden="true"><path d="M0 0 C-9 -9 -13 -14 -13 -22 A13 13 0 1 1 13 -22 C13 -14 9 -9 0 0 Z" fill="#F5B400" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg> Show issues</button>' +
        '<div class="products-chips" id="areas-chips"></div>' +
        '<div class="areas-view-toggle" role="group" aria-label="Switch view">' +
          '<button type="button" class="areas-view-toggle__btn areas-view-toggle__btn--active" data-areas-view="list" aria-pressed="true" aria-label="List view" title="List view"><lucide-icon name="list" style="font-size:16px"></lucide-icon>List</button>' +
          '<button type="button" class="areas-view-toggle__btn" data-areas-view="map" aria-pressed="false" aria-label="Map view" title="Map view"><lucide-icon name="layout-grid" style="font-size:16px"></lucide-icon>Map</button>' +
        '</div>' +
      '</div>' +
      '<div class="tt-card"><table class="tt-table"><thead><tr id="areas-head">' + headHtml() + '</tr></thead><tbody id="areas-body"></tbody></table></div>';

    resizer = window.TableResize.create(view.querySelector('table'), { key: 'areas-tree', defaults: WIDTHS, grow: 3 });
    resizer.refresh();

    view.addEventListener('input', function(e) {
      if (e.target.id !== 'areas-search') return;
      state.query = e.target.value.trim().toLowerCase();
      renderBody();
    });
    view.addEventListener('change', function(e) {
      if (e.target.name === 'type' && e.target.closest('[data-form="item"]')) {
        e.target.closest('form').elements.name.innerHTML = optionList(e.target.value);
      }
    });
    view.addEventListener('submit', function(e) {
      var kind = e.target.getAttribute('data-form');
      if (!kind) return;
      e.preventDefault();
      if (kind === 'issue') submitIssue(e.target); else submitItem(e.target);
    });
    view.addEventListener('click', function(e) {
      var t = e.target;
      var tg = t.closest('[data-toggle]');
      if (tg) { toggle(tg.getAttribute('data-toggle')); return; }
      var chip = t.closest('[data-quick]');
      if (chip) { var k = chip.getAttribute('data-quick'); state.quick = state.quick === k ? 'all' : k; renderChips(); renderBody(); return; }
      var ai = t.closest('[data-add-issue]');
      if (ai) { state.form = { kind: 'issue', id: ai.getAttribute('data-add-issue') }; renderBody(); var f = view.querySelector('[data-form="issue"] input'); if (f) f.focus(); return; }
      var am = t.closest('[data-add-item]');
      if (am) { state.form = { kind: 'item', id: am.getAttribute('data-add-item') }; renderBody(); var s = view.querySelector('[data-form="item"] select'); if (s) s.focus(); return; }
      if (t.closest('[data-cancel]')) { state.form = null; renderBody(); }
    });
  }

  window.AreasTree = {
    init: function() {
      var view = document.getElementById('areas-view');
      if (!view) return;
      build(view);
      render();
      // Dropdowns update the current city / store first (their listeners were attached earlier)
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', function() { state.form = null; state.open = {}; render(); });
      });
    },
    render: render,
    focusArea: focusArea
  };
})();
