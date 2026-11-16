/**
 * Area Drawer
 * Opens over the store map when an area is clicked. It has two lists, like the area in the Areas tab, in the same tree table:
 *   Products          every product of the area (product > section > detail);
 *   Issues & repairs  what has to be fixed in the area, and for each issue the equipment and consumables needed.
 * The Receiving & Stock Room sells nothing, so its product list is the backroom stock of all areas.
 */

(function() {
  'use strict';

  var STOCK_ROOM = 'Receiving & Stock Room';
  var STATUS_TONE = { 'In stock': 'success', 'Low stock': 'warning', 'Out of stock': 'danger', 'Open': 'muted', 'In progress': 'info', 'Waiting for parts': 'warning', 'Resolved': 'success',
    'Available': 'success', 'Short': 'warning', 'Missing': 'danger', 'Borrow from another store': 'info', 'Used': 'muted' };
  var PRIORITY_TONE = { 'Normal': 'muted', 'High': 'warning', 'Urgent': 'danger' };
  var WIDTHS = { products: [440, 400, 170, 150, 150, 150, 130], issues: [440, 400, 130, 110, 170, 220] };
  var CHIPS = {
    products: [['all', 'All SKUs'], ['low', 'Low stock'], ['out', 'Out of stock'], ['expiring', 'Expiring']],
    issues: [['all', 'All issues'], ['open', 'Open'], ['waiting', 'Waiting for parts'], ['resolved', 'Resolved']]
  };
  var state = { area: '', tab: 'products', query: { products: '', issues: '' }, quick: { products: 'all', issues: 'all' }, open: {} };
  var items = [], issues = [];
  var ELBOW = '<span class="tt-elbow"></span>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function badge(text, tone) { return '<span class="ov-badge ov-badge--' + tone + '">' + esc(text) + '</span>'; }

  function overlay() { return document.getElementById('area-drawer'); }

  function isStockRoom() { return state.area === STOCK_ROOM; }

  function statusOf(i) { return window.AreasData.statusOf(i); }

  /* ---------- data ---------- */

  function loadProducts() {
    var inv = window.ProductsData.getInventory(window.Dropdowns.getCurrentSite());
    if (isStockRoom()) return inv.filter(function(r) { return r.backroom > 0; }).sort(function(a, b) { return b.backroom - a.backroom; });
    return inv.filter(function(r) { return r.sku.department === state.area; });
  }

  /** The issues of the area: open ones first (the most urgent on top), the fixed ones last. */
  function loadIssues() {
    var names = window.DetailData.getLines().map(function(l) { return l.name; });
    var rank = function(i) { return statusOf(i) === 'Resolved' ? 9 : ({ Urgent: 0, High: 1, Normal: 2 }[i.priority] || 2); };
    return window.AreasData.getIssues(window.Dropdowns.getCurrentSite(), state.area, names).slice().sort(function(a, b) { return rank(a) - rank(b); });
  }

  function visibleProducts() {
    var q = state.query.products, quick = state.quick.products;
    return items.filter(function(r) {
      if (quick === 'low' && r.status !== 'Low stock') return false;
      if (quick === 'out' && r.status !== 'Out of stock') return false;
      if (quick === 'expiring' && !r.alert) return false;
      if (!q) return true;
      var s = r.sku;
      return [s.name, s.brand, s.variant, s.sku, s.ean].some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
    });
  }

  function visibleIssues() {
    var q = state.query.issues, quick = state.quick.issues;
    return issues.filter(function(i) {
      var st = statusOf(i);
      if (quick === 'open' && st === 'Resolved') return false;
      if (quick === 'waiting' && st !== 'Waiting for parts') return false;
      if (quick === 'resolved' && st !== 'Resolved') return false;
      if (!q) return true;
      return [i.title, i.detail].concat(i.resources.map(function(r) { return r.name; })).some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
    });
  }

  /* ---------- rows (same markup and classes as the Areas tab) ---------- */

  function nameCell(level, num, label, key, open, chip) {
    var toggle = key
      ? '<button type="button" class="tt-toggle' + (open ? ' tt-toggle--open' : '') + '" data-toggle="' + key + '" aria-expanded="' + !!open + '" aria-label="' + (open ? 'Collapse' : 'Expand') + '">' +
          '<lucide-icon name="chevron-down" style="font-size:14px"></lucide-icon></button>'
      : '<span class="tt-toggle tt-toggle--none"></span>';
    return '<td class="tt-cell tt-cell--name tt-lv' + level + '">' + (level > 1 ? ELBOW : '') + toggle + '<span class="tt-num">' + num + '</span>' +
      (chip ? '<span class="tt-chip tt-chip--' + chip.toLowerCase() + '">' + chip + '</span>' : '') + '<span class="tt-label' + (level === 1 ? ' tt-label--area' : '') + '">' + label + '</span></td>';
  }

  function cell(html, cls, attrs) { return '<td class="tt-cell' + (cls ? ' ' + cls : '') + '"' + (attrs ? ' ' + attrs : '') + '>' + (html || '') + '</td>'; }

  function row(cls, inner) { return '<tr class="tt-row ' + cls + '">' + inner + '</tr>'; }

  /** ed(field) says how a cell can be edited (a class and the attributes the click handler reads), or nothing for a cell that cannot. */
  function productCells(desc, price, stock, expiry, status, pack, wrap, ed) {
    ed = ed || function() { return {}; };
    var e = function(f) { return ed(f) || {}; };
    return cell(desc, 'tt-cell--desc' + (wrap ? ' tt-cell--wrap' : '') + (e('location').cls ? ' ' + e('location').cls : ''), e('location').attrs) + cell(price, 'tt-cell--num' + (e('price').cls ? ' ' + e('price').cls : ''), e('price').attrs) +
      cell(stock, 'tt-cell--num' + (e('stock').cls ? ' ' + e('stock').cls : ''), e('stock').attrs) + cell(expiry) + cell(status) + cell(pack);
  }

  function productRows(r, n) {
    var s = r.sku, key = 'p' + s.index, open = !!state.open[key], stockRoom = isStockRoom();
    var label = esc(s.name) + ' <span class="tt-muted">' + esc((s.brand === 'Loose' ? '' : s.brand + ' · ') + s.variant + ' · ' + s.size) + '</span>';
    var price = r.promo ? '<span class="products-promo">' + money(r.promo) + '</span> <s>' + money(r.price) + '</s>' : money(r.price);
    // Price, stock (with its minimum) and the shelf location can be edited with a click; the backroom list of the stock room cannot
    var ed = function(field) {
      if (stockRoom) return null;
      return { cls: 'ad-editable' + (r.edits && (field === 'stock' ? (r.edits.stock || r.edits.min) : r.edits[field]) ? ' ad-edited' : ''), attrs: 'data-edit="' + field + '" data-index="' + s.index + '" title="Click to edit"' };
    };
    if (r.isNew) label += ' <span class="ov-badge ov-badge--info">New</span>';
    var out = row('tt-row--l1' + (r.isNew ? ' ad-new' : ''), nameCell(1, n, label, key, open) +
      productCells(esc(s.sku) + ' · ' + esc(stockRoom ? s.department : r.location), price, stockRoom ? r.backroom + ' ' + r.unit : r.stock + ' / min ' + r.min,
        r.alert ? badge(r.alert, r.alertTone) : '<span class="products-none">—</span>', badge(r.status, STATUS_TONE[r.status]), esc(s.packLabel), false, ed));
    if (!open) return out;
    window.ProductsTable.detailGroups(r).forEach(function(g, gi) {
      var gkey = key + 's' + gi, gopen = !!state.open[gkey], num = n + '.' + (gi + 1);
      out += row('tt-row--l2', nameCell(2, num, esc(g.title), gkey, gopen) + productCells(esc(g.summary)));
      if (!gopen) return;
      if (!g.rows.length) out += row('tt-row--l3', nameCell(3, num + '.1', '<span class="tt-muted">Nothing to show</span>') + productCells());
      g.rows.forEach(function(d, di) {
        var tone = d[2], text = d[3] ? d[1] : (tone ? '' : d[1]), status = tone ? badge(d[3] || d[1], tone) : '';
        out += row('tt-row--l3', nameCell(3, num + '.' + (di + 1), esc(d[0])) + productCells(esc(text), '', '', '', status, '', true));
      });
    });
    return out;
  }

  function issueCells(desc, priority, qty, status, items) {
    return cell(desc, 'tt-cell--desc') + cell(priority) + cell(qty, 'tt-cell--num') + cell(status) + cell(items);
  }

  function issueRows(issue, n) {
    var key = 'i' + issue.id, open = !!state.open[key], st = statusOf(issue);
    var eq = issue.resources.filter(function(r) { return r.type === 'Equipment'; }).length, cons = issue.resources.length - eq;
    var out = row('tt-row--l1', nameCell(1, n, esc(issue.title), key, open) +
      issueCells(esc(issue.detail), st === 'Resolved' ? '' : badge(issue.priority, PRIORITY_TONE[issue.priority]), '', badge(st, STATUS_TONE[st]),
        '<span class="ov-badge ov-badge--muted">' + eq + ' equipment · ' + cons + ' consumable' + (cons === 1 ? '' : 's') + '</span>'));
    if (!open) return out;
    if (!issue.resources.length) out += row('tt-row--l2', nameCell(2, n + '.1', '<span class="tt-muted">No equipment or consumables listed yet</span>') + issueCells());
    issue.resources.forEach(function(r, ri) {
      var desc = r.availability === 'Used' ? 'Used for this repair' : r.type === 'Equipment' ? (r.availability === 'Available' ? 'In this store' : 'Needs to be borrowed')
        : (r.availability === 'Available' ? 'In stock: ' + r.have : (r.have ? 'Have ' + r.have + ', need ' + r.qty : 'Not in stock, order it'));
      out += row('tt-row--l2', nameCell(2, n + '.' + (ri + 1), esc(r.name), '', false, r.type) + issueCells(esc(desc), '', String(r.qty), badge(r.availability, STATUS_TONE[r.availability])));
    });
    return out;
  }

  /* ---------- editing and adding products ---------- */

  var editing = null;

  function parseMoney(text) {
    var t = String(text).trim().replace(/^R\$\s*/, '');
    var v = Number(t.indexOf(',') > -1 ? t.replace(/\./g, '').replace(',', '.') : t);
    return isFinite(v) && v >= 0 && t !== '' ? Math.round(v * 100) / 100 : null;
  }

  function parseCount(text) {
    var t = String(text).trim(), v = Number(t);
    return t !== '' && isFinite(v) && v >= 0 && Math.round(v) === v ? v : null;
  }

  function productOf(index) { return items.filter(function(r) { return r.sku.index === index; })[0]; }

  function openEditor(td) {
    if (editing) return;
    var field = td.getAttribute('data-edit'), r = productOf(+td.getAttribute('data-index'));
    if (!r) return;
    editing = { td: td, field: field, row: r };
    td.classList.add('ad-editing');
    if (field === 'stock') {
      td.innerHTML = '<span class="ad-pair"><input class="ad-input ad-input--num" name="stock" value="' + r.stock + '" inputmode="numeric" aria-label="Stock"> <span>/ min</span> ' +
        '<input class="ad-input ad-input--num" name="min" value="' + r.min + '" inputmode="numeric" aria-label="Minimum stock"></span>';
    } else if (field === 'price') {
      td.innerHTML = '<input class="ad-input ad-input--num" name="price" value="' + String(r.price).replace('.', ',') + '" inputmode="decimal" aria-label="Price">';
    } else {
      td.innerHTML = '<input class="ad-input" name="location" value="' + esc(r.location) + '" aria-label="Shelf location">';
    }
    var first = td.querySelector('input');
    first.focus();
    first.select();
  }

  function errorIn(td, message) {
    var old = td.querySelector('.ad-error');
    if (old) old.remove();
    if (!message) return;
    var e = document.createElement('span');
    e.className = 'ad-error';
    e.textContent = message;
    td.appendChild(e);
  }

  function closeEditor(save) {
    if (!editing) return;
    var e = editing, site = window.Dropdowns.getCurrentSite(), td = e.td;
    if (save) {
      var idx = e.row.sku.index;
      if (e.field === 'price') {
        var p = parseMoney(td.querySelector('[name="price"]').value);
        if (p == null) { errorIn(td, 'Enter an amount, like 12,90'); return; }
        if (p !== e.row.price) window.ProductsData.edit(site, idx, 'price', p);
      } else if (e.field === 'stock') {
        var st = parseCount(td.querySelector('[name="stock"]').value), mn = parseCount(td.querySelector('[name="min"]').value);
        if (st == null || mn == null) { errorIn(td, 'Whole numbers, 0 or more'); return; }
        if (st !== e.row.stock) window.ProductsData.edit(site, idx, 'stock', st);
        if (mn !== e.row.min) window.ProductsData.edit(site, idx, 'min', mn);
      } else {
        var loc = td.querySelector('[name="location"]').value.trim();
        if (!loc) { errorIn(td, 'Enter where it is on the shelf'); return; }
        if (loc !== e.row.location) window.ProductsData.edit(site, idx, 'location', loc);
      }
    }
    editing = null;
    items = loadProducts();
    render();
    if (save && window.ProductsTable && window.ProductsTable.render) window.ProductsTable.render();
  }

  var PACKS = ['Single', 'Pack of 2', 'Pack of 4', 'Pack of 6', 'Pack of 12'];

  function addPanelHtml() {
    var brands = window.ProductsData.brands();
    return '<form class="ad-add" id="area-drawer-add-panel" novalidate hidden>' +
      '<p class="ad-add__title">New product in this area <small>It starts with no stock (Out of stock) until the first delivery is received.</small></p>' +
      '<label>Product name *<input type="text" name="name" class="form-input"></label>' +
      '<label>Brand *<input type="text" name="brand" class="form-input" list="area-drawer-brands" autocomplete="off"><datalist id="area-drawer-brands">' + brands.map(function(b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></label>' +
      '<label>Variant<input type="text" name="variant" class="form-input"></label>' +
      '<label>Package size<input type="text" name="size" class="form-input" placeholder="For example, 1 L"></label>' +
      '<label>Pack<select name="pack" class="form-select">' + PACKS.map(function(x) { return '<option>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label>SKU *<input type="text" name="sku" class="form-input"></label>' +
      '<label>Barcode<input type="text" name="ean" class="form-input" inputmode="numeric"></label>' +
      '<label>Price *<input type="text" name="price" class="form-input" placeholder="R$ 0,00" inputmode="decimal"></label>' +
      '<label>Min. stock<input type="text" name="min" class="form-input" value="6" inputmode="numeric"></label>' +
      '<label>Shelf location<input type="text" name="location" class="form-input"></label>' +
      '<p class="ad-add__error" hidden></p>' +
      '<div class="ad-add__actions"><button type="button" class="btn btn--secondary btn--small" data-ad-add-cancel>Cancel</button><button type="submit" class="btn btn--primary btn--small">Add product</button></div></form>';
  }

  function submitAdd(form) {
    var v = {}, err = function(m) { var e = form.querySelector('.ad-add__error'); e.textContent = m; e.hidden = !m; return false; };
    ['name', 'brand', 'variant', 'size', 'pack', 'sku', 'ean', 'price', 'min', 'location'].forEach(function(k) { v[k] = form.elements[k].value.trim(); });
    if (!v.name) return err('Enter the product name.');
    if (!v.brand) return err('Enter the brand.');
    if (!v.sku) return err('Enter the SKU.');
    var price = parseMoney(v.price), min = parseCount(v.min || '0');
    if (price == null) return err('Enter the price, like 12,90.');
    if (min == null) return err('The minimum stock must be a whole number.');
    var site = window.Dropdowns.getCurrentSite();
    if (window.ProductsData.getInventory(site).some(function(r) { return r.sku.sku.toLowerCase() === v.sku.toLowerCase(); })) return err('The SKU ' + v.sku + ' already exists in this store.');
    window.ProductsData.addProduct(site, state.area, { name: v.name, brand: v.brand, variant: v.variant, size: v.size, packQty: v.pack === 'Single' ? 1 : parseInt(v.pack.replace(/\D/g, ''), 10), sku: v.sku, ean: v.ean, price: price, min: min, location: v.location });
    items = loadProducts();
    state.query.products = '';
    state.quick.products = 'all';
    form.reset();
    form.hidden = true;
    err('');
    render();
    if (window.ProductsTable && window.ProductsTable.render) window.ProductsTable.render();
    return true;
  }

  /* ---------- the drawer ---------- */

  function chipsHtml() {
    var tab = state.tab, quick = state.quick[tab];
    var count = function(k) {
      if (tab === 'products') {
        return k === 'all' ? items.length : items.filter(function(r) { return k === 'low' ? r.status === 'Low stock' : k === 'out' ? r.status === 'Out of stock' : !!r.alert; }).length;
      }
      return k === 'all' ? issues.length : issues.filter(function(i) { var st = statusOf(i); return k === 'open' ? st !== 'Resolved' : k === 'waiting' ? st === 'Waiting for parts' : st === 'Resolved'; }).length;
    };
    return CHIPS[tab].map(function(x) {
      return '<button type="button" class="products-chip' + (quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (quick === x[0]) + '">' + x[1] + ' <strong>' + count(x[0]) + '</strong></button>';
    }).join('');
  }

  function render() {
    var tab = state.tab, openIssues = issues.filter(function(i) { return statusOf(i) !== 'Resolved'; }).length;
    document.querySelectorAll('[data-ad-tab]').forEach(function(b) {
      var on = b.getAttribute('data-ad-tab') === tab;
      b.classList.toggle('rq-subtab--active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.getElementById('area-drawer-count-products').textContent = items.length;
    document.getElementById('area-drawer-count-issues').textContent = openIssues;
    document.getElementById('area-drawer-wrap-products').hidden = tab !== 'products';
    document.getElementById('area-drawer-wrap-issues').hidden = tab !== 'issues';
    var search = document.getElementById('area-drawer-search');
    search.placeholder = tab === 'products' ? 'Search by product, brand, SKU or barcode' : 'Search by issue, equipment or consumable';
    if (search.value !== state.query[tab]) search.value = state.query[tab];
    document.getElementById('area-drawer-products').hidden = tab !== 'products' || isStockRoom();
    document.getElementById('area-drawer-add').hidden = tab !== 'products' || isStockRoom();
    if (tab !== 'products' || isStockRoom()) document.getElementById('area-drawer-add-panel').hidden = true;
    document.getElementById('area-drawer-chips').innerHTML = chipsHtml();
    if (tab === 'products') {
      var list = visibleProducts();
      document.getElementById('area-drawer-body-products').innerHTML = list.map(function(r, i) { return productRows(r, String(i + 1)); }).join('') ||
        '<tr class="tt-row"><td class="tt-cell tt-empty" colspan="7">' + (items.length ? 'No products match your filters.' : 'No products are assigned to this area.') + '</td></tr>';
    } else {
      var li = visibleIssues();
      document.getElementById('area-drawer-body-issues').innerHTML = li.map(function(i, k) { return issueRows(i, String(k + 1)); }).join('') ||
        '<tr class="tt-row"><td class="tt-cell tt-empty" colspan="6">' + (issues.length ? 'No issues match your filters.' : 'No issues in this area. Everything is working.') + '</td></tr>';
    }
  }

  function tableHtml(kind, heads, numCols) {
    return '<div class="tt-card" id="area-drawer-wrap-' + kind + '"><table class="tt-table"><thead><tr>' + heads.map(function(h, i) {
      return '<th class="tt-head' + (numCols.indexOf(i) !== -1 ? ' tt-head--num' : '') + '">' + h + '</th>';
    }).join('') + '</tr></thead><tbody id="area-drawer-body-' + kind + '"></tbody></table></div>';
  }

  function shell(section) {
    var stockRoom = isStockRoom();
    return '<div class="drawer__header"><button class="drawer__close" id="area-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">' + esc(state.area) + '<span class="ad-sub">' + esc(section) + (stockRoom ? ' · the products are the backroom stock of every area' : '') + '</span></h3></div>' +
      '<div class="drawer__body">' +
        '<div class="rq-subtabs" role="tablist" aria-label="Lists of the area">' +
          '<button type="button" class="rq-subtab" role="tab" data-ad-tab="products">Products <span class="rq-subtab__count" id="area-drawer-count-products"></span></button>' +
          '<button type="button" class="rq-subtab" role="tab" data-ad-tab="issues">Issues &amp; repairs <span class="rq-subtab__count" id="area-drawer-count-issues"></span></button>' +
        '</div>' +
        '<div class="ad-toolbar"><div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
          '<input type="text" id="area-drawer-search" class="products-search__input" autocomplete="off"></div>' +
          '<div class="products-chips" id="area-drawer-chips"></div>' +
          '<button type="button" class="btn btn--secondary btn--small ad-toolbar__link" id="area-drawer-products">View in Products tab</button>' +
          '<button type="button" class="btn btn--primary btn--small" id="area-drawer-add"><lucide-icon name="plus" style="font-size:14px"></lucide-icon> Add product</button></div>' +
        addPanelHtml() +
        tableHtml('products', ['Name <span class="tt-hint">Product › Section › Detail</span>', 'Description', 'Price', 'Stock', 'Expiry', 'Status', 'Pack'], [2, 3]) +
        tableHtml('issues', ['Name <span class="tt-hint">Issue › Equipment / Consumable</span>', 'Description', 'Priority', 'Qty', 'Status', 'Items'], [3]) +
      '</div>';
  }

  function open(area, sectionLabel, tab) {
    state.area = area;
    state.tab = tab || 'products';
    state.query = { products: '', issues: '' };
    state.quick = { products: 'all', issues: 'all' };
    state.open = {};
    items = loadProducts();
    issues = loadIssues();
    overlay().querySelector('.drawer').innerHTML = shell(sectionLabel || '');
    ['products', 'issues'].forEach(function(kind) {
      window.TableResize.create(document.getElementById('area-drawer-wrap-' + kind).querySelector('table'), { key: 'area-drawer-' + kind, defaults: WIDTHS[kind], grow: 1 }).refresh();
    });
    render();
    overlay().classList.add('drawer-overlay--open');
  }

  function close() {
    var o = overlay();
    if (!o || !o.classList.contains('drawer-overlay--open')) return;
    o.classList.remove('drawer-overlay--open');
    if (window.StoreMap && window.StoreMap.clearSelection) window.StoreMap.clearSelection();
  }

  function init() {
    var panel = document.getElementById('process-flow');
    if (!panel || overlay()) return;
    var o = document.createElement('div');
    o.className = 'drawer-overlay';
    o.id = 'area-drawer';
    o.innerHTML = '<div class="drawer drawer--right area-drawer"></div>';
    panel.appendChild(o);

    o.addEventListener('submit', function(e) {
      if (e.target.id !== 'area-drawer-add-panel') return;
      e.preventDefault();
      submitAdd(e.target);
    });
    o.addEventListener('keydown', function(e) {
      if (!editing || !editing.td.contains(e.target)) return;
      if (e.key === 'Enter') { e.preventDefault(); closeEditor(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeEditor(false); }
    });
    o.addEventListener('focusout', function(e) {
      if (editing && editing.td.contains(e.target) && !editing.td.contains(e.relatedTarget)) setTimeout(function() { if (editing && !editing.td.querySelector('.ad-error')) closeEditor(true); }, 0);
    });
    o.addEventListener('input', function(e) {
      if (e.target.id !== 'area-drawer-search') return;
      state.query[state.tab] = e.target.value.trim().toLowerCase();
      render();
    });
    o.addEventListener('click', function(e) {
      if (e.target === o || e.target.closest('#area-drawer-close')) { close(); return; }
      var add = e.target.closest('#area-drawer-add');
      if (add) { var panel = document.getElementById('area-drawer-add-panel'); panel.hidden = !panel.hidden; if (!panel.hidden) panel.querySelector('input').focus(); return; }
      if (e.target.closest('[data-ad-add-cancel]')) { document.getElementById('area-drawer-add-panel').hidden = true; return; }
      var ed = e.target.closest('td[data-edit]');
      if (ed) { openEditor(ed); return; }
      var tab = e.target.closest('[data-ad-tab]');
      if (tab) { state.tab = tab.getAttribute('data-ad-tab'); render(); return; }
      var chip = e.target.closest('[data-quick]');
      if (chip) {
        var key = chip.getAttribute('data-quick');
        state.quick[state.tab] = state.quick[state.tab] === key ? 'all' : key;
        render();
        return;
      }
      if (e.target.closest('#area-drawer-products')) {
        var t = document.querySelector('.tabs__tab[data-tab="equipment-list"]');
        if (t) t.click();
        if (window.ProductsTable) window.ProductsTable.setArea(state.area);
        close();
        return;
      }
      var tg = e.target.closest('[data-toggle]');
      if (tg) {
        var k = tg.getAttribute('data-toggle');
        if (state.open[k]) delete state.open[k]; else state.open[k] = true;
        render();
      }
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });
    // The drawer has no backdrop: a click anywhere outside it (but not on another area of the map) closes it
    document.addEventListener('click', function(e) {
      if (!o.classList.contains('drawer-overlay--open')) return;
      // The drawer redraws its table when a row is expanded, so the element that was clicked may already be gone from the
      // page: look at the path the click took, not at where the element is now.
      var path = e.composedPath ? e.composedPath() : [];
      var inside = path.some(function(n) { return n === o || (n.classList && n.classList.contains('store-map__area')); });
      if (!inside) close();
    });
    // Another store has other stock and other issues: close the drawer when the city or the store changes
    ['program-select', 'site-select'].forEach(function(id) {
      var sel = document.getElementById(id);
      if (sel) sel.addEventListener('change', close);
    });
  }

  window.AreaDrawer = { init: init, open: open, close: close };
})();
