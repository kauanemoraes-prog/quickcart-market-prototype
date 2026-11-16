/**
 * Network Products
 * Every product of every store of every city in one editable table. The columns are the ones of the Products tab of a
 * store, plus the store and the city. A cell is edited in place: click it, type, Enter saves, Esc cancels. Edits live
 * in the page (they are lost on reload) and edited cells are marked. Status follows stock and minimum stock, and the
 * discount and the promo price follow each other and the price.
 */

(function() {
  'use strict';

  // Each column: key, label, sort, numeric, how it is edited (none = read only) and its starting width
  var COLUMNS = [
    { key: 'select', label: '', width: 44, select: true },
    { key: 'name', label: 'Product', sort: true, edit: 'text', width: 200 },
    { key: 'store', label: 'Store', sort: true, width: 170 },
    { key: 'city', label: 'City', sort: true, width: 150 },
    { key: 'area', label: 'Area name', sort: true, edit: 'area', width: 150 },
    { key: 'brand', label: 'Brand', sort: true, edit: 'text', width: 140 },
    { key: 'variant', label: 'Variant', edit: 'text', width: 150 },
    { key: 'status', label: 'Status', sort: true, width: 120 },
    { key: 'size', label: 'Package Size', edit: 'text', width: 120 },
    { key: 'pack', label: 'Pack', sort: true, edit: 'text', width: 120 },
    { key: 'sku', label: 'SKU', sort: true, edit: 'text', width: 160 },
    { key: 'ean', label: 'Barcode', edit: 'text', width: 140 },
    { key: 'price', label: 'Price', sort: true, num: true, edit: 'money', width: 110 },
    { key: 'discount', label: 'Discount', sort: true, num: true, edit: 'percent', width: 110 },
    { key: 'promo', label: 'Promo Price', sort: true, num: true, edit: 'money', width: 120 },
    { key: 'stock', label: 'Stock', sort: true, num: true, edit: 'int', width: 100 },
    { key: 'min', label: 'Min. Stock', num: true, edit: 'int', width: 110 },
    { key: 'location', label: 'Shelf Location', edit: 'text', width: 230 },
    { key: 'alert', label: 'Expiry Alert', width: 130 }
  ];
  var EDITABLE = ['name', 'area', 'brand', 'variant', 'size', 'pack', 'sku', 'ean', 'price', 'discount', 'promo', 'stock', 'min', 'location'];
  var STATUS_ORDER = { 'Out of stock': 0, 'Low stock': 1, 'In stock': 2 };
  var STATUS_TONE = { 'In stock': 'success', 'Low stock': 'warning', 'Out of stock': 'danger' };
  var PAGE_SIZES = [50, 100, 250];

  var all = [], byId = {}, areas = [], cities = [], stores = [], storeMeta = [], brands = {}, newCount = 0, nextNew = 1;
  var state = { query: '', quick: 'all', sortKey: 'status', sortDir: 1, page: 0, size: 100, view: 'table' };
  var filters = {}, resizer = null, editing = null, editCount = 0, shown = [], openSku = null, selectedIds = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function number(n) { return n.toLocaleString('pt-BR'); }
  function statusOf(stock, min) { return stock === 0 ? 'Out of stock' : (stock < min ? 'Low stock' : 'In stock'); }

  /* ---------- data: one row per product and store ---------- */

  function build() {
    var seenStore = {};
    window.ProgramsData.getAll().forEach(function(p) {
      if (cities.indexOf(p.name) === -1) cities.push(p.name);
      (p.sites || []).forEach(function(site) {
        window.ProductsData.getInventory(site).forEach(function(r) {
          var s = r.sku, row = {
            id: site.storeCode + '|' + s.index, store: site.storeName, storeCode: site.storeCode, city: p.name,
            name: s.name, area: s.department, brand: s.brand, variant: s.variant, size: s.size, pack: s.packLabel, pkg: s.pack, packQty: s.packQty, sku: s.sku, ean: s.ean,
            price: r.price, discount: r.promoPct || 0, promo: r.promo || 0, stock: r.stock, min: r.min, location: r.location,
            status: r.status, alert: r.alert, alertTone: r.alertTone, edits: {}
          };
          row.base = {};
          EDITABLE.forEach(function(f) { row.base[f] = row[f]; });
          all.push(row);
          byId[row.id] = row;
        });
        storeMeta.push({ label: site.storeName + ' · ' + p.name, store: site.storeName, storeCode: site.storeCode, city: p.name });
        var label = site.storeName + ' · ' + p.name;
        if (!seenStore[label]) { seenStore[label] = { label: label, city: p.name }; stores.push(seenStore[label]); }
      });
    });
    areas = window.DetailData.getLines().map(function(a) { return a.name; });
    all.forEach(function(r) { if (!brands[r.brand]) brands[r.brand] = { name: r.brand, area: r.area, supplier: '' }; });
  }

  /* ---------- filtering, sorting and paging ---------- */

  function inScope(r) {
    if (!filters.city.shows(r.city)) return false;
    if (!filters.store.shows(r.store + ' · ' + r.city)) return false;
    return filters.area.shows(r.area);
  }

  function matches(r) {
    if (state.quick === 'low' && r.status !== 'Low stock') return false;
    if (state.quick === 'out' && r.status !== 'Out of stock') return false;
    if (state.quick === 'expiring' && !r.alert) return false;
    if (state.quick === 'edited' && !r.isNew && !Object.keys(r.edits).length) return false;
    var q = state.query;
    if (!q) return true;
    return [r.name, r.brand, r.variant, r.sku, r.ean, r.store, r.city].some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
  }

  function value(r, key) {
    switch (key) {
      case 'status': return STATUS_ORDER[r.status];
      case 'pack': return r.packQty;
      case 'promo': return r.promo || r.price;
      default: return r[key];
    }
  }

  function visible() {
    var key = state.sortKey, dir = state.sortDir;
    return all.filter(function(r) { return inScope(r) && matches(r); }).sort(function(a, b) {
      var x = value(a, key), y = value(b, key);
      var c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return (c || a.name.localeCompare(b.name) || a.store.localeCompare(b.store)) * dir;
    });
  }

  /* ---------- rendering ---------- */

  function cellHtml(r, c) {
    switch (c.key) {
      case 'select': return '<input type="checkbox" class="products-check" data-select="' + esc(r.id) + '"' + (selectedIds[r.id] ? ' checked' : '') + ' aria-label="Select ' + esc(r.name) + ' in ' + esc(r.store) + '">';
      case 'name': return esc(r.name);
      case 'size': return window.ProductsData.sizeHtml(r.size);
      case 'store': return '<span class="products-clip">' + esc(r.store) + '</span>';
      case 'status': return '<span class="ov-badge ov-badge--' + STATUS_TONE[r.status] + '">' + r.status + '</span>';
      case 'pack': return r.packQty > 1 ? '<span class="ov-badge ov-badge--info">' + esc(r.pack) + '</span>' : esc(r.pack);
      case 'price': return money(r.price);
      case 'discount': return r.discount ? '<span class="ov-badge ov-badge--danger">-' + r.discount + '%</span>' : '<span class="products-none">—</span>';
      case 'promo': return r.promo ? '<span class="products-promo">' + money(r.promo) + '</span>' : '<span class="products-none">—</span>';
      case 'alert': return r.alert ? '<span class="ov-badge ov-badge--' + r.alertTone + '">' + esc(r.alert) + '</span>' : '<span class="products-none">—</span>';
      default: return esc(r[c.key]);
    }
  }

  function cellClass(r, c) {
    if (c.select) return 'table__cell products-cell--select';
    return 'table__cell' + (c.num ? ' products-cell--num' : '') + (c.key === 'sku' || c.key === 'ean' ? ' products-cell--mono' : '') +
      (c.key === 'name' ? ' products-cell--name' : '') + (c.edit ? ' np-cell--edit' : '') + (r.isNew || r.edits[c.key] ? ' np-cell--edited' : '');
  }

  function rowHtml(r) {
    return '<tr class="table__row products-row' + (selectedIds[r.id] ? ' products-row--selected' : '') + '" data-id="' + esc(r.id) + '">' + COLUMNS.map(function(c) {
      return '<td class="' + cellClass(r, c) + '" data-field="' + c.key + '">' + cellHtml(r, c) + '</td>';
    }).join('') + '</tr>';
  }

  function headHtml() {
    return COLUMNS.map(function(c) {
      var active = state.sortKey === c.key;
      if (c.select) return '<th class="table__header products-cell--select"><input type="checkbox" class="products-check" id="np-select-all" aria-label="Select all listings"></th>';
      return '<th class="table__header' + (c.num ? ' products-cell--num' : '') + (c.sort ? ' sortable' : '') + '"' + (c.sort ? ' data-sort="' + c.key + '"' : '') +
        (active ? ' aria-sort="' + (state.sortDir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' + c.label +
        (c.sort ? '<span class="products-sort' + (active ? ' products-sort--active' : '') + '">' + (active ? (state.sortDir > 0 ? '↑' : '↓') : '⇅') + '</span>' : '') + '</th>';
    }).join('');
  }

  function renderChips() {
    var scoped = all.filter(inScope), c = { all: scoped.length, low: 0, out: 0, expiring: 0, edited: 0 };
    scoped.forEach(function(r) {
      if (r.status === 'Low stock') c.low++;
      if (r.status === 'Out of stock') c.out++;
      if (r.alert) c.expiring++;
      if (r.isNew || Object.keys(r.edits).length) c.edited++;
    });
    var chips = [['all', 'All listings', c.all], ['low', 'Low stock', c.low], ['out', 'Out of stock', c.out], ['expiring', 'Expiring', c.expiring], ['edited', 'Edited', c.edited]];
    document.getElementById('np-chips').innerHTML = chips.map(function(x) {
      return '<button type="button" class="products-chip' + (state.quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (state.quick === x[0]) + '">' +
        x[1] + ' <strong>' + number(x[2]) + '</strong></button>';
    }).join('');
  }

  function renderReset() {
    var b = document.getElementById('np-reset');
    var n = editCount + newCount;
    b.hidden = !n;
    b.style.display = n ? '' : 'none';   // a button's own display would beat the hidden attribute
    b.textContent = 'Reset ' + n + (n === 1 ? ' change' : ' changes');
  }

  function renderPager(total, from, to) {
    document.getElementById('np-pager').innerHTML =
      '<span>' + (total ? 'Showing ' + number(from + 1) + '–' + number(to) + ' of ' + number(total) : 'No product matches the filters') + '</span>' +
      '<span class="np-pager__controls"><label>Rows per page <select class="form-select" id="np-size">' +
        PAGE_SIZES.map(function(n) { return '<option' + (n === state.size ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
        '<button type="button" class="btn btn--secondary btn--small" data-page="-1"' + (state.page === 0 ? ' disabled' : '') + '>Previous</button>' +
        '<button type="button" class="btn btn--secondary btn--small" data-page="1"' + (to >= total ? ' disabled' : '') + '>Next</button></span>';
  }

  /** The listings of the filters grouped by product: one card per product, with the stores that have it in each stock status. */
  function groupProducts(list) {
    var map = {}, groups = [];
    list.forEach(function(r) {
      var g = map[r.sku];
      if (!g) { g = map[r.sku] = { sku: r.sku, row: r, stores: 0, out: 0, low: 0, ok: 0, exp: 0, expDanger: 0 }; groups.push(g); }
      g.stores++;
      if (r.status === 'Out of stock') g.out++; else if (r.status === 'Low stock') g.low++; else g.ok++;
      if (r.alert) { g.exp++; if (r.alertTone === 'danger') g.expDanger++; }
      var pr = r.promo || r.price;
      g.min = g.min === undefined ? pr : Math.min(g.min, pr);
      g.max = g.max === undefined ? pr : Math.max(g.max, pr);
    });
    // Cards are in alphabetical order (name, then brand and variant)
    return groups.sort(function(a, b) {
      return a.row.name.localeCompare(b.row.name, 'pt-BR') || a.row.brand.localeCompare(b.row.brand, 'pt-BR') || a.row.variant.localeCompare(b.row.variant, 'pt-BR') || a.sku.localeCompare(b.sku);
    });
  }

  function cardHtml(g) {
    var r = g.row, status = g.out === g.stores ? 'Out of stock' : (g.out || g.low ? 'Low stock' : 'In stock');
    var headline = g.out ? '<strong>' + number(g.out) + '</strong> of ' + number(g.stores) + (g.stores === 1 ? ' store' : ' stores') + ' out of stock'
      : (g.low ? number(g.low) + ' of ' + number(g.stores) + ' stores low on stock' : 'All ' + number(g.stores) + (g.stores === 1 ? ' store' : ' stores') + ' in stock');
    return window.ProductCards.card({
      name: r.name, brand: r.brand, variant: r.variant, size: r.size, pack: r.pkg || 'Box', sku: r.sku, ean: r.ean, status: status, headline: headline, expiry: g.exp ? number(g.exp) + (g.exp === 1 ? ' store has' : ' stores have') + ' an expiry alert' : 'No expiry alerts', expiryTone: g.exp ? (g.expDanger ? 'danger' : 'warning') : '',
      price: g.min === g.max ? money(g.min) : money(g.min) + ' – ' + money(g.max),
      attrs: 'data-sku="' + esc(r.sku) + '"', cls: 'np-card'
    });
  }

  function renderRows() {
    closeEditor();
    shown = visible();
    var cards = state.view === 'cards', groups = cards ? groupProducts(shown) : null, total = cards ? groups.length : shown.length;
    var pages = Math.max(1, Math.ceil(total / state.size));
    if (state.page >= pages) state.page = pages - 1;
    var from = state.page * state.size, to = Math.min(total, from + state.size);
    document.querySelector('#network-products .products-container').hidden = cards;
    document.getElementById('np-cards').hidden = !cards;
    if (cards) {
      document.getElementById('np-cards').innerHTML = groups.slice(from, to).map(cardHtml).join('') || '<p class="pc-empty">No product matches the filters.</p>';
      markCard();
    } else {
      document.getElementById('np-body').innerHTML = shown.slice(from, to).map(rowHtml).join('') ||
        '<tr class="table__row"><td class="table__cell products-empty" colspan="' + COLUMNS.length + '">No product matches the filters.</td></tr>';
    }
    renderChips();
    renderPager(total, from, to);
    renderReset();
    syncSelectAll();
  }

  /** The listings shown on the current page of the table. */
  function pageRows() { return shown.slice(state.page * state.size, state.page * state.size + state.size); }

  /** The box in the header: ticked when every listing of the page is selected, half-ticked when only some are. */
  function syncSelectAll() {
    var box = document.getElementById('np-select-all');
    if (!box || state.view === 'cards') return;
    var rows = pageRows(), n = rows.filter(function(r) { return selectedIds[r.id]; }).length;
    box.checked = rows.length > 0 && n === rows.length;
    box.indeterminate = n > 0 && n < rows.length;
  }

  function renderHead() {
    document.getElementById('np-head').innerHTML = headHtml();
    resizer.refresh();
  }

  /* ---------- editing ---------- */

  function closeEditor() {
    editing = null;
  }

  function parse(c, raw) {
    var text = raw.trim();
    switch (c.edit) {
      case 'text':
        if (!text && (c.key === 'name' || c.key === 'sku')) return { error: c.label + ' cannot be empty' };
        return { value: text };
      case 'money':
        if (!text && c.key === 'promo') return { value: 0 };
        var m = Number(text.replace(/^R\$\s*/, '').replace(/\./g, function(d, i, s) { return s.indexOf(',') !== -1 ? '' : '.'; }).replace(',', '.'));
        if (!isFinite(m) || m < 0 || text === '') return { error: 'Enter an amount, like 12,90' };
        return { value: round2(m) };
      case 'percent':
        if (!text) return { value: 0 };
        var p = Number(text.replace('%', '').replace('-', ''));
        if (!isFinite(p) || p < 0 || p > 90 || Math.round(p) !== p) return { error: 'Enter a whole number from 0 to 90' };
        return { value: p };
      case 'int':
        var n = Number(text);
        if (text === '' || !isFinite(n) || n < 0 || Math.round(n) !== n) return { error: 'Enter a whole number, 0 or more' };
        return { value: n };
      default:
        return { value: text };
    }
  }

  /** Writes a value and updates what depends on it (status, discount and promo price). */
  function apply(r, key, v) {
    r[key] = v;
    if (key === 'price' && r.discount) r.promo = round2(r.price * (100 - r.discount) / 100);
    if (key === 'discount') r.promo = v ? round2(r.price * (100 - v) / 100) : 0;
    if (key === 'promo') r.discount = v && r.price ? Math.round((1 - v / r.price) * 100) : 0;
    if (key === 'stock' || key === 'min') r.status = statusOf(r.stock, r.min);
  }

  function markEdits(r) {
    if (r.isNew) return;
    var before = Object.keys(r.edits).length;
    EDITABLE.forEach(function(f) { if (r[f] !== r.base[f]) r.edits[f] = true; else delete r.edits[f]; });
    editCount += Object.keys(r.edits).length - before;
  }

  function refreshRow(r) {
    var tr = document.querySelector('#np-body tr[data-id="' + r.id.replace(/"/g, '\\"') + '"]');
    if (!tr) return;
    COLUMNS.forEach(function(c, i) {
      var td = tr.children[i];
      td.className = cellClass(r, c);
      td.innerHTML = cellHtml(r, c);
    });
  }

  function openEditor(td) {
    var key = td.getAttribute('data-field'), c = COLUMNS.filter(function(x) { return x.key === key; })[0];
    if (!c || !c.edit || editing) return;
    var r = byId[td.parentNode.getAttribute('data-id')];
    var current = key === 'price' || key === 'promo' ? (r[key] ? String(r[key]).replace('.', ',') : '') : (key === 'discount' ? (r.discount ? String(r.discount) : '') : String(r[key]));
    editing = { td: td, row: r, col: c };
    td.classList.add('np-cell--editing');
    if (c.edit === 'area') {
      td.innerHTML = '<select class="np-input">' + areas.map(function(a) { return '<option' + (a === r.area ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select>';
    } else {
      td.innerHTML = '<input class="np-input' + (c.num ? ' np-input--num' : '') + '" type="text" value="' + esc(current) + '" aria-label="' + esc(c.label) + '"' +
        (c.edit === 'money' || c.edit === 'percent' || c.edit === 'int' ? ' inputmode="decimal"' : '') + '>';
    }
    var input = td.firstChild;
    input.focus();
    if (input.select) input.select();
  }

  function finishEditor(save) {
    if (!editing) return;
    var e = editing, input = e.td.firstChild, old = e.td.querySelector('.np-error');
    if (old) old.remove();
    if (save) {
      var res = parse(e.col, input.value);
      if (res.error) {
        input.setAttribute('aria-invalid', 'true');
        var tip = document.createElement('span');
        tip.className = 'np-error';
        tip.textContent = res.error;
        e.td.appendChild(tip);
        input.focus();
        return;
      }
      if (res.value !== e.row[e.col.key]) {
        if (e.col.key === 'promo' && res.value && res.value >= e.row.price) {
          input.setAttribute('aria-invalid', 'true');
          var t2 = document.createElement('span');
          t2.className = 'np-error';
          t2.textContent = 'The promo price must be lower than the price';
          e.td.appendChild(t2);
          input.focus();
          return;
        }
        apply(e.row, e.col.key, res.value);
        markEdits(e.row);
      }
    }
    editing = null;
    e.td.classList.remove('np-cell--editing');
    refreshRow(e.row);
    renderChips();
    renderReset();
  }

  function resetEdits() {
    all = all.filter(function(r) { if (r.isNew) delete byId[r.id]; return !r.isNew; });
    newCount = 0;
    subtitle();
    all.forEach(function(r) {
      if (!Object.keys(r.edits).length) return;
      EDITABLE.forEach(function(f) { r[f] = r.base[f]; });
      r.status = statusOf(r.stock, r.min);
      r.edits = {};
    });
    editCount = 0;
    renderRows();
  }

  /* ---------- registration: a new product or a new brand ---------- */

  var PACKS = ['Single', 'Pack of 2', 'Pack of 4', 'Pack of 6', 'Pack of 12'];

  function toast(message) {
    var old = document.querySelector('.np-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'np-toast';
    t.setAttribute('role', 'status');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 4200);
  }

  function opts(list, selected, placeholder) {
    return (placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '') +
      list.map(function(v) { return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('');
  }

  function brandNames() {
    return Object.keys(brands).sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  function storeOptions(city) {
    return storeMeta.filter(function(m) { return !city || m.city === city; }).map(function(m) { return m.label; });
  }

  function drawerShell(title, form) {
    return '<div class="drawer__header"><button class="drawer__close" id="np-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title" data-sentence>' + title + '</h3></div><div class="drawer__body">' + form + '</div>';
  }

  function productForm() {
    return drawerShell('New product',
      '<p class="np-form-note">The product is added to the stores you choose, with no stock yet (Out of stock) until the first delivery is received.</p>' +
      '<form class="emp-form" id="np-product-form" novalidate>' +
        '<label class="emp-form__field emp-form__field--wide">Product name *<input type="text" name="name" class="form-input" placeholder="For example, Whole milk"></label>' +
        '<label class="emp-form__field">Brand *<select name="brand" class="form-select form-select--stylized">' + opts(brandNames(), '', 'Choose a brand') + '</select></label>' +
        '<label class="emp-form__field">Area name *<select name="area" class="form-select form-select--stylized">' + opts(areas, '', 'Choose an area') + '</select></label>' +
        '<label class="emp-form__field">Variant<input type="text" name="variant" class="form-input" placeholder="Optional"></label>' +
        '<label class="emp-form__field">Package size<input type="text" name="size" class="form-input" placeholder="For example, 1 L"></label>' +
        '<label class="emp-form__field">Pack<select name="pack" class="form-select form-select--stylized">' + opts(PACKS, 'Single') + '</select></label>' +
        '<label class="emp-form__field">SKU *<input type="text" name="sku" class="form-input" placeholder="For example, BM-1L-WHO"></label>' +
        '<label class="emp-form__field">Barcode<input type="text" name="ean" class="form-input" placeholder="Optional" inputmode="numeric"></label>' +
        '<label class="emp-form__field">Price *<input type="text" name="price" class="form-input" placeholder="R$ 0,00" inputmode="decimal"></label>' +
        '<label class="emp-form__field">Min. stock<input type="text" name="min" class="form-input" value="100" inputmode="numeric"></label>' +
        '<label class="emp-form__field">Shelf location<input type="text" name="location" class="form-input" placeholder="Optional"></label>' +
        '<p class="np-form-group">Where it is sold</p>' +
        '<label class="emp-form__field">City<select name="city" class="form-select form-select--stylized">' + opts(cities, '', 'All cities') + '</select></label>' +
        '<label class="emp-form__field">Store<select name="store" class="form-select form-select--stylized">' + opts(storeOptions(''), '', 'All stores') + '</select></label>' +
        '<p class="emp-form__error" id="np-form-error" hidden></p>' +
        '<div class="emp-form__actions"><button type="submit" class="btn btn--primary btn--medium">Add product</button></div>' +
      '</form>');
  }

  function brandForm() {
    return drawerShell('New brand',
      '<p class="np-form-note">A registered brand can be chosen when you add a product.</p>' +
      '<form class="emp-form" id="np-brand-form" novalidate>' +
        '<label class="emp-form__field emp-form__field--wide">Brand name *<input type="text" name="name" class="form-input" placeholder="For example, Blue Meadow"></label>' +
        '<label class="emp-form__field">Main area *<select name="area" class="form-select form-select--stylized">' + opts(areas, '', 'Choose an area') + '</select></label>' +
        '<label class="emp-form__field">Supplier<select name="supplier" class="form-select form-select--stylized">' + opts(window.ProgramsData.suppliers, '', 'Not defined') + '</select></label>' +
        '<label class="emp-form__field emp-form__field--wide">Notes<textarea name="note" class="form-input" rows="2" placeholder="Optional"></textarea></label>' +
        '<p class="emp-form__error" id="np-form-error" hidden></p>' +
        '<div class="emp-form__actions"><button type="submit" class="btn btn--primary btn--medium">Add brand</button></div>' +
      '</form>');
  }

  function openDrawer(kind) {
    var overlay = document.getElementById('np-drawer'), drawer = overlay.querySelector('.drawer');
    drawer.innerHTML = kind === 'brand' ? brandForm() : productForm();
    overlay.classList.add('drawer-overlay--open');
    var first = drawer.querySelector('input');
    if (first) first.focus();
  }

  function closeDrawer() {
    var overlay = document.getElementById('np-drawer');
    if (overlay) overlay.classList.remove('drawer-overlay--open');
    openSku = null;
    markCard();
  }

  /* ---------- the product of a card: details and its stock in every store ---------- */

  /** The card of the product in the open drawer keeps the hover colour. */
  function markCard() {
    Array.prototype.forEach.call(document.querySelectorAll('#np-cards .pc-card--open'), function(el) { el.classList.remove('pc-card--open'); });
    if (openSku === null) return;
    Array.prototype.forEach.call(document.querySelectorAll('#np-cards .np-card'), function(el) {
      if (el.getAttribute('data-sku') === openSku) el.classList.add('pc-card--open');
    });
  }

  function productDrawer(sku) {
    var list = all.filter(function(r) { return r.sku === sku; });
    if (!list.length) return '';
    var r = list[0], cat = window.ProductsData.getCatalog().filter(function(c) { return c.sku === sku; })[0] || {};
    var out = list.filter(function(x) { return x.status === 'Out of stock'; }).length, low = list.filter(function(x) { return x.status === 'Low stock'; }).length;
    var units = list.reduce(function(n, x) { return n + x.stock; }, 0);
    function dl(pairs) {
      return '<dl class="pd-grid">' + pairs.map(function(p) { return '<div class="pd-grid__item"><dt>' + p[0] + '</dt><dd>' + (p[1] === '' ? '—' : p[1]) + '</dd></div>'; }).join('') + '</dl>';
    }
    function section(title, body) { return '<section class="pd-section"><h4 class="pd-section__title">' + title + '</h4>' + body + '</section>'; }
    var stores = list.slice().sort(function(a, b) { return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.city.localeCompare(b.city, 'pt-BR') || a.store.localeCompare(b.store, 'pt-BR'); });
    var table = '<table class="pd-table"><thead><tr><th>Store</th><th>City</th><th>Status</th><th class="pd-num">Stock</th><th class="pd-num">Min. stock</th><th class="pd-num">Price</th></tr></thead><tbody>' +
      stores.map(function(x) {
        return '<tr><td>' + esc(x.store) + '</td><td>' + esc(x.city) + '</td><td><span class="ov-badge ov-badge--' + STATUS_TONE[x.status] + '">' + x.status + '</span></td>' +
          '<td class="pd-num">' + number(x.stock) + '</td><td class="pd-num">' + number(x.min) + '</td><td class="pd-num">' + money(x.price) + '</td></tr>';
      }).join('') + '</tbody></table>';
    return drawerShell(esc((r.brand === 'Loose' ? '' : r.brand + ' ') + r.name + ' — ' + r.variant + ', ' + r.size),
      section('Product details', dl([
        ['Area name', esc(r.area)], ['Category', esc((cat.category || '').split(' > ').join(' → '))], ['Brand', esc(r.brand)], ['Variant', esc(r.variant)],
        ['SKU', esc(r.sku)], ['Barcode / EAN', esc(r.ean)], ['Net weight / volume', esc(r.size)], ['Pack', esc(r.pack)],
        ['Description', esc(cat.description || '')], ['Ingredients', esc(cat.ingredients || '')], ['Allergens', esc(cat.allergens || '')], ['Storage instructions', esc(cat.storage || '')]
      ])) +
      section('Network stock', dl([
        ['Stores that sell it', number(list.length)], ['Stores out of stock', '<span class="ov-badge ov-badge--' + (out ? 'danger' : 'success') + '">' + number(out) + '</span>'],
        ['Stores low on stock', '<span class="ov-badge ov-badge--' + (low ? 'warning' : 'success') + '">' + number(low) + '</span>'], ['Units in the network', number(units)]
      ])) +
      section('Stock by store', table));
  }

  function openProduct(sku) {
    var overlay = document.getElementById('np-drawer'), drawer = overlay.querySelector('.drawer');
    drawer.innerHTML = productDrawer(sku);
    overlay.classList.add('drawer-overlay--open');
    openSku = sku;
    markCard();
  }

  function formError(message) {
    var el = document.getElementById('np-form-error');
    el.textContent = message;
    el.hidden = !message;
    return false;
  }

  function submitProduct(form) {
    var v = {};
    ['name', 'brand', 'area', 'variant', 'size', 'pack', 'sku', 'ean', 'price', 'min', 'location', 'city', 'store'].forEach(function(k) { v[k] = form.elements[k].value.trim(); });
    if (!v.name) return formError('Enter the product name.');
    if (!v.brand) return formError('Choose a brand. If it is not in the list, register it first with Add > New brand.');
    if (!v.area) return formError('Choose the area.');
    if (!v.sku) return formError('Enter the SKU.');
    var price = parse(COLUMNS.filter(function(c) { return c.key === 'price'; })[0], v.price), min = parse(COLUMNS.filter(function(c) { return c.key === 'min'; })[0], v.min || '0');
    if (price.error) return formError('Price: ' + price.error.charAt(0).toLowerCase() + price.error.slice(1) + '.');
    if (min.error) return formError('Min. stock: ' + min.error.charAt(0).toLowerCase() + min.error.slice(1) + '.');
    var targets = storeMeta.filter(function(m) { return v.store ? m.label === v.store : (!v.city || m.city === v.city); });
    for (var i = 0; i < targets.length; i++) {
      var clash = all.some(function(r) { return r.storeCode === targets[i].storeCode && r.sku.toLowerCase() === v.sku.toLowerCase(); });
      if (clash) return formError('The SKU ' + v.sku + ' already exists in ' + targets[i].store + '.');
    }
    var packQty = v.pack === 'Single' ? 1 : parseInt(v.pack.replace(/\D/g, ''), 10);
    targets.forEach(function(m) {
      var row = {
        id: m.storeCode + '|n' + (nextNew++), store: m.store, storeCode: m.storeCode, city: m.city,
        name: v.name, area: v.area, brand: v.brand, variant: v.variant, size: v.size, pack: v.pack, packQty: packQty, sku: v.sku, ean: v.ean,
        price: price.value, discount: 0, promo: 0, stock: 0, min: min.value, location: v.location || 'Not placed yet',
        status: 'Out of stock', alert: '', alertTone: '', edits: {}, base: {}, isNew: true
      };
      all.push(row);
      byId[row.id] = row;
    });
    newCount += targets.length;
    subtitle();
    state.quick = 'edited';
    state.query = '';
    state.page = 0;
    var search = document.getElementById('np-search');
    if (search) search.value = '';
    renderRows();
    closeDrawer();
    toast(v.name + ' added to ' + (targets.length === 1 ? targets[0].store : targets.length + ' stores') + ' with no stock yet.');
    return true;
  }

  function submitBrand(form) {
    var name = form.elements.name.value.trim(), area = form.elements.area.value;
    if (!name) return formError('Enter the brand name.');
    if (!area) return formError('Choose the main area.');
    var clash = brandNames().some(function(b) { return b.toLowerCase() === name.toLowerCase(); });
    if (clash) return formError('The brand ' + name + ' is already registered.');
    brands[name] = { name: name, area: area, supplier: form.elements.supplier.value, note: form.elements.note.value.trim(), isNew: true };
    closeDrawer();
    toast('Brand ' + name + ' registered. You can now choose it when adding a product.');
    return true;
  }

  function bindRegistration(view) {
    document.addEventListener('click', function(e) {
      var trigger = document.getElementById('np-add'), menu = document.getElementById('np-add-menu');
      if (!trigger || !menu) return;
      var item = e.target.closest('[data-np-add]');
      if (item) { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); openDrawer(item.getAttribute('data-np-add')); return; }
      if (e.target.closest('#np-add')) { menu.hidden = !menu.hidden; trigger.setAttribute('aria-expanded', String(!menu.hidden)); return; }
      if (!menu.hidden) { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      var overlay = document.getElementById('np-drawer');
      if (overlay && overlay.classList.contains('drawer-overlay--open')) closeDrawer();
    });
    view.addEventListener('click', function(e) {
      if (e.target.closest('#np-drawer-close') || e.target.id === 'np-drawer') closeDrawer();
    });
    view.addEventListener('change', function(e) {
      if (e.target.name === 'city' && e.target.closest('#np-product-form')) {
        e.target.closest('form').elements.store.innerHTML = opts(storeOptions(e.target.value), '', 'All stores');
      }
    });
    view.addEventListener('submit', function(e) {
      e.preventDefault();
      if (e.target.id === 'np-product-form') submitProduct(e.target);
      else if (e.target.id === 'np-brand-form') submitBrand(e.target);
    });
  }

  /* ---------- page ---------- */

  function subtitle() {
    var parts = ['QuickCart Market', 'entire network', number(stores.length) + ' stores in ' + cities.length + ' cities', number(all.length) + ' listings'];
    document.getElementById('np-subtitle').innerHTML = parts.map(function(t) { return '<span class="np-header__item">' + esc(t) + '</span>'; }).join('');
  }

  function init() {
    var view = document.getElementById('network-products');
    if (!view || view.dataset.ready) return;
    view.dataset.ready = '1';
    build();
    subtitle();

    view.innerHTML =
      '<div class="products-toolbar np-toolbar">' +
        '<div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
          '<input type="text" id="np-search" class="products-search__input" placeholder="Search by product, brand, SKU, barcode, store or city" autocomplete="off"></div>' +
        '<div class="form-group products-area" id="np-city"></div><div class="form-group products-area" id="np-store"></div><div class="form-group products-area" id="np-area"></div>' +
        window.ProductCards.toggleHtml(state.view) + '<button type="button" class="btn btn--secondary btn--small np-reset" id="np-reset" hidden></button>' +
        '<div class="products-chips np-chips" id="np-chips"></div>' +
      '</div>' +
      '<div class="table-container products-container"><table class="table table--products table--select"><thead class="table__head"><tr class="table__row" id="np-head"></tr></thead><tbody class="table__body" id="np-body"></tbody></table></div><div class="pc-grid" id="np-cards" hidden></div>' +
      '<div class="np-pager" id="np-pager"></div>' +
      '<div class="drawer-overlay" id="np-drawer"><div class="drawer drawer--right product-drawer"></div></div>';

    filters.city = window.MultiSelect.create(document.getElementById('np-city'), { options: cities, label: 'cities', onChange: function() {
      var chosen = cities.filter(filters.city.shows);
      filters.store.setOptions(stores.filter(function(s) { return chosen.indexOf(s.city) !== -1; }).map(function(s) { return s.label; }));
      state.page = 0;
      renderRows();
    } });
    filters.store = window.MultiSelect.create(document.getElementById('np-store'), { options: stores.map(function(s) { return s.label; }), label: 'stores', onChange: function() { state.page = 0; renderRows(); } });
    filters.area = window.MultiSelect.create(document.getElementById('np-area'), { options: areas, label: 'areas', onChange: function() { state.page = 0; renderRows(); } });

    var table = view.querySelector('table');
    resizer = window.TableResize.create(table, { key: 'network-products-v3', defaults: COLUMNS.map(function(c) { return c.width; }), grow: 17, fixed: [0],
      onChange: function(widths) { table.style.setProperty('--sticky-1', widths[1] + 'px'); } });
    renderHead();
    renderRows();
    bindRegistration(view);

    view.addEventListener('input', function(e) {
      if (e.target.id !== 'np-search') return;
      state.query = e.target.value.trim().toLowerCase();
      state.page = 0;
      renderRows();
    });
    view.addEventListener('change', function(e) {
      var box = e.target;
      if (box.classList && box.classList.contains('products-check')) {
        if (box.id === 'np-select-all') {
          pageRows().forEach(function(r) { if (box.checked) selectedIds[r.id] = true; else delete selectedIds[r.id]; });
          renderRows();
          return;
        }
        var id = box.getAttribute('data-select'), tr = box.closest('tr');
        if (box.checked) selectedIds[id] = true; else delete selectedIds[id];
        if (tr) tr.classList.toggle('products-row--selected', box.checked);
        syncSelectAll();
        return;
      }
      if (e.target.id === 'np-size') { state.size = +e.target.value; state.page = 0; renderRows(); }
      else if (editing && e.target.tagName === 'SELECT' && editing.td.contains(e.target)) finishEditor(true);
    });
    view.addEventListener('click', function(e) {
      var vbtn = e.target.closest('.pc-toggle__btn');
      if (vbtn) { setView(vbtn.getAttribute('data-view')); return; }
      var card = e.target.closest('.np-card');
      if (card) { openProduct(card.getAttribute('data-sku')); return; }
      var th = e.target.closest('th[data-sort]');
      if (th) {
        var key = th.getAttribute('data-sort');
        state.sortDir = state.sortKey === key ? -state.sortDir : 1;
        state.sortKey = key;
        renderHead();
        renderRows();
        return;
      }
      var chip = e.target.closest('[data-quick]');
      if (chip) { var q = chip.getAttribute('data-quick'); state.quick = state.quick === q ? 'all' : q; state.page = 0; renderRows(); return; }
      var pg = e.target.closest('[data-page]');
      if (pg) { state.page += +pg.getAttribute('data-page'); renderRows(); document.getElementById('np-body').scrollIntoView({ block: 'start' }); return; }
      if (e.target.closest('#np-reset')) { resetEdits(); return; }
      var td = e.target.closest('td.np-cell--edit');
      if (td && !editing) openEditor(td);
    });
    view.addEventListener('keydown', function(e) {
      var kc = e.target.closest && e.target.closest('.np-card');
      if (kc && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kc.click(); return; }
      if (!editing || !editing.td.contains(e.target)) return;
      if (e.key === 'Enter') { e.preventDefault(); finishEditor(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finishEditor(false); }
    });
    view.addEventListener('focusout', function(e) {
      if (editing && editing.td.contains(e.target) && !editing.td.contains(e.relatedTarget)) setTimeout(function() { if (editing && !editing.td.querySelector('[aria-invalid]')) finishEditor(true); }, 0);
    });
  }

  function setView(v) {
    state.view = v;
    state.page = 0;
    Array.prototype.forEach.call(document.querySelectorAll('#network-products .pc-toggle__btn'), function(b) {
      var on = b.getAttribute('data-view') === v;
      b.classList.toggle('pc-toggle__btn--active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    renderRows();
  }

  function safeInit() {
    try { init(); } catch (err) { console.error('Network products init failed:', err); }
  }

  // The canvas dispatches this event once it has injected the page content.
  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
