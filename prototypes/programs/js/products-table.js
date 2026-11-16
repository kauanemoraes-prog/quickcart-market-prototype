/**
 * Products Table
 * The Products tab of the store page: the SKUs of the selected store with their stock, price and location.
 * Clicking a row opens the product in a drawer, split in sections (details, store inventory, batches, location, activity).
 * Data comes from ProductsData; the table follows the City / Store dropdowns of the header.
 */

(function() {
  'use strict';

  var COLUMNS = [
    { key: 'select', label: '', select: true },
    { key: 'area', label: 'Area name', sort: true }, { key: 'name', label: 'Product', sort: true }, { key: 'brand', label: 'Brand', sort: true },
    { key: 'variant', label: 'Variant' }, { key: 'status', label: 'Status', sort: true }, { key: 'size', label: 'Package Size' }, { key: 'pack', label: 'Pack', sort: true }, { key: 'sku', label: 'SKU', sort: true }, { key: 'ean', label: 'Barcode' },
    { key: 'price', label: 'Price', sort: true, num: true }, { key: 'discount', label: 'Discount', sort: true, num: true },
    { key: 'promo', label: 'Promo Price', sort: true, num: true }, { key: 'stock', label: 'Stock', sort: true, num: true }, { key: 'min', label: 'Min. Stock', num: true },
    { key: 'location', label: 'Shelf Location' }, { key: 'alert', label: 'Expiry Alert' },
    { key: 'order', label: 'Purchase order', order: true }
  ];
  var STATUS_ORDER = { 'Out of stock': 0, 'Low stock': 1, 'In stock': 2 };
  var STATUS_TONE = { 'In stock': 'success', 'Low stock': 'warning', 'Out of stock': 'danger' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var state = { query: '', area: '', quick: 'all', sortKey: 'status', sortDir: 1, view: 'table' };
  var rows = [];
  var resizer = null;
  var areaFilter = null;
  // Starting width of each column, in the order of COLUMNS
  var WIDTHS = [44, 150, 190, 140, 150, 120, 110, 120, 160, 140, 100, 100, 110, 100, 110, 220, 120, 144];
  var current = null;
  var selected = {};   // the products ticked in the table, by product index

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }

  function fmt(date) { return date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear(); }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function qty(r, n) { return n + ' ' + (r.unit === 'units' && n === 1 ? 'unit' : r.unit); }

  function value(r, key) {
    switch (key) {
      case 'name': return r.sku.name;
      case 'area': return r.sku.department;
      case 'brand': return r.sku.brand;
      case 'sku': return r.sku.sku;
      case 'price': return r.price;
      case 'discount': return r.promoPct;
      case 'promo': return r.promo || r.price;
      case 'pack': return r.sku.packQty;
      case 'stock': return r.stock;
      case 'status': return STATUS_ORDER[r.status];
      default: return '';
    }
  }

  function areaNames() {
    return window.DetailData.getLines().map(function(a) { return a.name; });
  }

  /* ---------- table ---------- */

  function matches(r) {
    if (areaFilter && !areaFilter.shows(r.sku.department)) return false;
    if (state.quick === 'low' && r.status !== 'Low stock') return false;
    if (state.quick === 'out' && r.status !== 'Out of stock') return false;
    if (state.quick === 'expiring' && !r.alert) return false;
    var q = state.query;
    if (!q) return true;
    var s = r.sku;
    return [s.name, s.brand, s.variant, s.sku, s.ean, s.department, s.category].some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
  }

  function visibleRows() {
    var list = rows.filter(matches);
    var key = state.sortKey, dir = state.sortDir;
    return list.sort(function(a, b) {
      var x = value(a, key), y = value(b, key);
      var c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return (c || a.sku.index - b.sku.index) * dir;
    });
  }

  /** The button of the fixed column on the right: it asks for a purchase order, or says it was already asked. */
  function orderButton(r) {
    var asked = window.RequestsData && window.RequestsData.pendingFor(window.Dropdowns.getCurrentSite(), window.Dropdowns.getCurrentProgram(), r.sku.sku);
    return asked
      ? '<button type="button" class="btn btn--secondary btn--small" disabled title="' + esc(asked.id) + ' is waiting for approval in Requests">Requested</button>'
      : '<button type="button" class="btn ' + (r.status === 'In stock' ? 'btn--secondary' : 'btn--primary') + ' btn--small" data-order="' + r.sku.index + '">Purchase order</button>';
  }

  function rowHtml(r) {
    var s = r.sku;
    return '<tr class="table__row products-row' + (selected[s.index] ? ' products-row--selected' : '') + '" data-index="' + s.index + '" tabindex="0">' +
      '<td class="table__cell products-cell--select"><input type="checkbox" class="products-check" data-select="' + s.index + '"' + (selected[s.index] ? ' checked' : '') + ' aria-label="Select ' + esc(s.name) + '"></td>' +
      '<td class="table__cell">' + esc(s.department) + '</td>' +
      '<td class="table__cell products-cell--name"><span class="products-clip">' + esc(s.name) + '</span></td>' +
      '<td class="table__cell">' + esc(s.brand) + '</td>' +
      '<td class="table__cell">' + esc(s.variant) + '</td>' +
      '<td class="table__cell"><span class="ov-badge ov-badge--' + STATUS_TONE[r.status] + '">' + r.status + '</span></td>' +
      '<td class="table__cell">' + window.ProductsData.sizeHtml(s.size) + '</td>' +
      '<td class="table__cell">' + (s.packQty > 1 ? '<span class="ov-badge ov-badge--info">' + s.packLabel + '</span>' : esc(s.packLabel)) + '</td>' +
      '<td class="table__cell products-cell--mono">' + esc(s.sku) + '</td>' +
      '<td class="table__cell products-cell--mono">' + esc(s.ean) + '</td>' +
      '<td class="table__cell products-cell--num">' + money(r.price) + '</td>' +
      '<td class="table__cell products-cell--num">' + (r.promoPct ? '<span class="ov-badge ov-badge--danger">-' + r.promoPct + '%</span>' : '<span class="products-none">—</span>') + '</td>' +
      '<td class="table__cell products-cell--num">' + (r.promo ? '<span class="products-promo">' + money(r.promo) + '</span>' : '<span class="products-none">—</span>') + '</td>' +
      '<td class="table__cell products-cell--num">' + r.stock + '</td>' +
      '<td class="table__cell products-cell--num">' + r.min + '</td>' +
      '<td class="table__cell">' + esc(r.location) + '</td>' +
      '<td class="table__cell">' + (r.alert ? '<span class="ov-badge ov-badge--' + r.alertTone + '">' + esc(r.alert) + '</span>' : '<span class="products-none">—</span>') + '</td>' +
      '<td class="table__cell products-cell--order">' + orderButton(r) + '</td>' +
    '</tr>';
  }

  function headHtml() {
    return COLUMNS.map(function(c) {
      var active = state.sortKey === c.key;
      if (c.select) return '<th class="table__header products-cell--select"><input type="checkbox" class="products-check" id="products-select-all" aria-label="Select all products"></th>';
      return '<th class="table__header' + (c.num ? ' products-cell--num' : '') + (c.order ? ' products-cell--order' : '') + (c.sort ? ' sortable' : '') + '"' + (c.sort ? ' data-sort="' + c.key + '"' : '') +
        (active ? ' aria-sort="' + (state.sortDir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' + c.label +
        (c.sort ? '<span class="products-sort' + (active ? ' products-sort--active' : '') + '">' + (active ? (state.sortDir > 0 ? '↑' : '↓') : '⇅') + '</span>' : '') + '</th>';
    }).join('');
  }

  function counts() {
    return {
      all: rows.length, low: rows.filter(function(r) { return r.status === 'Low stock'; }).length,
      out: rows.filter(function(r) { return r.status === 'Out of stock'; }).length, expiring: rows.filter(function(r) { return r.alert; }).length
    };
  }

  function renderChips() {
    var c = counts();
    var chips = [['all', 'All SKUs', c.all], ['low', 'Low stock', c.low], ['out', 'Out of stock', c.out], ['expiring', 'Expiring', c.expiring]];
    document.getElementById('products-chips').innerHTML = chips.map(function(x) {
      return '<button type="button" class="products-chip' + (state.quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (state.quick === x[0]) + '">' +
        x[1] + ' <strong>' + x[2] + '</strong></button>';
    }).join('');
  }

  function renderRows() {
    var list = visibleRows();
    document.getElementById('products-head').innerHTML = headHtml();
    if (resizer) resizer.refresh();
    document.getElementById('products-body').innerHTML = list.map(rowHtml).join('') ||
      '<tr class="table__row"><td class="table__cell products-empty" colspan="' + COLUMNS.length + '">No products match your filters.</td></tr>';
    renderCards(list);
    markOpenRow();
    syncSelectAll(list);
  }

  /** The box in the header: ticked when every product shown is selected, half-ticked when only some are. */
  function syncSelectAll(list) {
    var box = document.getElementById('products-select-all');
    if (!box) return;
    list = list || visibleRows();
    var n = list.filter(function(r) { return selected[r.sku.index]; }).length;
    box.checked = list.length > 0 && n === list.length;
    box.indeterminate = n > 0 && n < list.length;
  }

  /** The Discount button of a card: it opens a small menu with the percentages. It is the main action when the product is close to expiry. */
  function discountButton(r) {
    return '<button type="button" class="btn ' + (r.alert ? 'btn--primary' : 'btn--secondary') + ' btn--small" data-discount="' + r.sku.index + '" aria-haspopup="menu">' +
      (r.promoPct ? 'Discount -' + r.promoPct + '%' : 'Discount') + '</button>';
  }

  function closeDiscountMenu() {
    var m = document.getElementById('pc-discount-menu');
    if (m) m.remove();
  }

  function openDiscountMenu(btn, index) {
    closeDiscountMenu();
    var r = rows.filter(function(x) { return x.sku.index === index; })[0];
    if (!r) return;
    var menu = document.createElement('div');
    menu.id = 'pc-discount-menu';
    menu.className = 'pc-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = '<p class="pc-menu__title">Discount on ' + esc(r.sku.name) + '</p>' + [10, 15, 20, 30, 50].map(function(p) {
      return '<button type="button" class="pc-menu__item' + (r.promoPct === p ? ' pc-menu__item--on' : '') + '" role="menuitem" data-pct="' + p + '"><span>-' + p + '%</span><span>' + money(Math.round(r.price * (100 - p)) / 100) + '</span></button>';
    }).join('') + (r.promoPct ? '<button type="button" class="pc-menu__item pc-menu__item--remove" role="menuitem" data-pct="0">Remove discount</button>' : '');
    document.body.appendChild(menu);
    var b = btn.getBoundingClientRect(), h = menu.offsetHeight, w = menu.offsetWidth;
    menu.style.left = Math.max(8, Math.min(b.left, window.innerWidth - w - 8)) + 'px';
    menu.style.top = (b.bottom + 6 + h > window.innerHeight ? Math.max(8, b.top - h - 6) : b.bottom + 6) + 'px';
    menu.addEventListener('click', function(e) {
      var it = e.target.closest('[data-pct]');
      if (!it) return;
      var pct = +it.getAttribute('data-pct');
      window.ProductsData.edit(site(), index, 'discount', pct);
      closeDiscountMenu();
      renderChips();
      renderRows();
      if (current === index) refreshAfterEdit();
      if (typeof window.showNotification === 'function') window.showNotification('success', pct ? r.sku.name + ' now has a ' + pct + '% discount: ' + money(r.promo) + '.' : 'The discount on ' + r.sku.name + ' was removed.');
    });
    var first = menu.querySelector('.pc-menu__item');
    if (first) first.focus();
  }

  /** The next expiry date of a product for its card: the batch that expires first, and how close it is when there is an alert. */
  function expiryText(r) {
    var next = r.batches.slice().sort(function(a, b) { return a.expiry - b.expiry; })[0];
    if (!next) return r.sku.profile === 'none' ? 'No expiry date' : 'No batches in stock';
    return 'Expires ' + fmt(next.expiry) + (r.alert ? ' · ' + (r.alert === 'Expired' ? 'expired' : 'in ' + r.alert) : '');
  }

  /** The card view: the same rows as the table, one card per product. */
  function renderCards(list) {
    var grid = document.getElementById('products-cards'), cards = state.view === 'cards';
    document.querySelector('#products-view .products-container').hidden = cards;
    grid.hidden = !cards;
    if (!cards) return;
    // Cards are in alphabetical order (name, then brand and variant), whatever the table is sorted by
    grid.innerHTML = list.slice().sort(function(a, b) {
      return a.sku.name.localeCompare(b.sku.name, 'pt-BR') || a.sku.brand.localeCompare(b.sku.brand, 'pt-BR') || a.sku.variant.localeCompare(b.sku.variant, 'pt-BR') || a.sku.index - b.sku.index;
    }).map(function(r) {
      var s = r.sku;
      return window.ProductCards.card({
        name: s.name, brand: s.brand, variant: s.variant, size: s.size, pack: s.pack, sku: s.sku, ean: s.ean, status: r.status,
        expiry: expiryText(r), expiryTone: r.alertTone,
        price: r.promo ? '<s>' + money(r.price) + '</s>' + money(r.promo) + '<em>-' + r.promoPct + '%</em>' : money(r.price),
        headline: r.status === 'Out of stock' ? 'No units' : qty(r, r.stock) + ' · min. ' + r.min,
        footer: orderButton(r) + discountButton(r), attrs: 'data-index="' + s.index + '"', cls: 'products-card'
      });
    }).join('') || '<p class="pc-empty">No products match your filters.</p>';
  }

  function render() {
    var view = document.getElementById('products-view');
    if (!view || !view.dataset.ready) return;
    rows = window.ProductsData.getInventory(window.Dropdowns.getCurrentSite());
    renderChips();
    renderRows();
    if (current !== null) closeDrawer();
  }

  /* ---------- drawer ---------- */

  /** A value the user can change in the drawer: click it, type, Enter saves, Esc cancels. `type` is text, int, or money. */
  function ed(label, shown, field, raw, type) {
    return [label, '<button type="button" class="pd-edit" data-edit="' + field + '" data-type="' + type + '" data-raw="' + esc(raw) + '" aria-label="Edit ' + esc(label) + '">' +
      '<span class="pd-edit__text">' + (shown === '' ? '—' : shown) + '</span><lucide-icon name="pencil" style="font-size:14px"></lucide-icon></button>', true];
  }

  function dl(pairs) {
    return '<dl class="pd-grid">' + pairs.map(function(p) {
      return '<div class="pd-grid__item"><dt>' + p[0] + '</dt><dd>' + (p[1] === '' ? '—' : p[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function section(title, body) {
    return '<section class="pd-section"><h4 class="pd-section__title">' + title + '</h4>' + body + '</section>';
  }

  function batchesHtml(r) {
    if (!r.batches.length) return '<p class="pd-note">' + (r.sku.profile === 'none' ? 'This product has no expiry date.' : 'No units in stock, so there are no batches.') + '</p>';
    var tone = { 'Valid': 'success', 'Near expiry': 'warning', 'Expired': 'danger' };
    return '<table class="pd-table"><thead><tr><th>Batch</th><th>Expiration</th><th>Quantity</th><th>Received</th><th>Supplier</th><th>Status</th></tr></thead><tbody>' +
      r.batches.map(function(b) {
        return '<tr><td>' + b.lot + '</td><td>' + fmt(b.expiry) + '</td><td>' + qty(r, b.qty) + '</td><td>' + fmt(b.received) + '</td><td>' + esc(b.supplier) +
          '</td><td><span class="ov-badge ov-badge--' + tone[b.status] + '">' + b.status + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function activityHtml(r) {
    var s = r.sku, drift = 100 - r.accuracy;
    var items = [
      [r.lastSold, 'Sold', 'Average of ' + qty(r, r.ads) + ' per day'],
      [r.lastRestocked, 'Received', qty(r, s.perCase > 1 ? s.perCase * 2 : r.reorderQty) + ' from ' + r.supplier],
      [r.lastCounted, 'Counted', 'Stock accuracy ' + r.accuracy + '%' + (drift > 3 ? ' · ' + drift + '% difference to the system' : '')],
      [new Date(r.lastCounted.getTime() - 4 * 86400000), 'Adjusted', 'Stock corrected by -1 (damaged package)']
    ].sort(function(a, b) { return b[0] - a[0]; });
    return '<ul class="pd-activity">' + items.map(function(i) {
      return '<li><strong>' + i[1] + '</strong><span>' + esc(i[2]) + '</span><time>' + fmt(i[0]) + '</time></li>';
    }).join('') + '</ul>';
  }

  /** The same five sections as plain data (label, text, optional badge tone), for the tree table of the area drawer. */
  function detailGroups(r) {
    var s = r.sku, days = r.daysOfSupply, tone = { 'Valid': 'success', 'Near expiry': 'warning', 'Expired': 'danger' };
    var drift = 100 - r.accuracy;
    var activity = [
      [r.lastSold, 'Sold', 'Average of ' + qty(r, r.ads) + ' per day'],
      [r.lastRestocked, 'Received', qty(r, s.perCase > 1 ? s.perCase * 2 : r.reorderQty) + ' from ' + r.supplier],
      [r.lastCounted, 'Counted', 'Stock accuracy ' + r.accuracy + '%' + (drift > 3 ? ' · ' + drift + '% difference to the system' : '')],
      [new Date(r.lastCounted.getTime() - 4 * 86400000), 'Adjusted', 'Stock corrected by -1 (damaged package)']
    ].sort(function(a, b) { return b[0] - a[0]; });
    return [
      { title: 'Product details', summary: (s.brand === 'Loose' ? '' : s.brand + ' · ') + s.variant + ' · ' + s.size + ' · ' + s.pack, rows: [
        ['Area name', s.department], ['Category', s.category.split(' > ').join(' → ')], ['Brand', s.brand], ['Variant', s.variant], ['SKU', s.sku], ['Barcode / EAN', s.ean],
        ['Net weight / volume', s.size], ['Package type', s.pack], ['Pack', s.packLabel], ['Units per case', s.perCase > 1 ? plural(s.perCase, 'unit') : (s.perCase === 1 ? '1 unit' : 'Sold loose')],
        ['Description', s.description], ['Ingredients', s.ingredients], ['Allergens', s.allergens], ['Storage instructions', s.storage], ['Status', s.status]
      ] },
      { title: 'Store inventory', summary: qty(r, r.stock) + ' in stock · minimum ' + r.min + ' · ' + r.supplier, rows: [
        ['Status', r.status, STATUS_TONE[r.status]], ['Stock on hand', qty(r, r.stock)], ['Available stock', qty(r, r.available) + (r.reserved ? ' (' + r.reserved + ' reserved)' : '')],
        ['Shelf quantity', qty(r, r.shelf)], ['Backroom quantity', qty(r, r.backroom)], ['Minimum stock', qty(r, r.min)], ['Target stock', qty(r, r.target)],
        ['Reorder point', 'Order when it reaches ' + r.reorderPoint], ['Reorder quantity', 'Order ' + qty(r, r.reorderQty)], ['Unit price', money(r.price)],
        ['Discount', r.promoPct ? '-' + r.promoPct + '%' : '—'], ['Promotion price', r.promo ? money(r.promo) : '—'], ['Supplier', r.supplier], ['Lead time', plural(r.lead, 'day')],
        ['Average daily sales', qty(r, r.ads)], ['Days of supply', days + (days === 1 ? ' day' : ' days')], ['Stockout risk', r.risk], ['Suggested order', r.suggested ? qty(r, r.suggested) : 'None']
      ] },
      { title: 'Batches & expiry', summary: r.batches.length ? r.batches.length + (r.batches.length === 1 ? ' batch' : ' batches') + (r.alert ? ' · ' + r.alert : '') : (s.profile === 'none' ? 'No expiry date' : 'No units in stock'),
        rows: r.batches.map(function(b) {
          return ['Batch ' + b.lot, 'Expires ' + fmt(b.expiry) + ' · ' + qty(r, b.qty) + ' · received ' + fmt(b.received) + ' · ' + b.supplier, tone[b.status], b.status];
        }) },
      { title: 'Store location', summary: r.location, rows: [
        ['Area name', s.department], ['Aisle', 'Aisle ' + r.aisle], ['Shelf / fixture', 'Fixture ' + r.fixture], ['Shelf position', r.position], ['Planogram position', r.planogram]
      ] },
      { title: 'Activity', summary: plural(activity.length, 'recent event'), rows: activity.map(function(i) { return [i[1], i[2] + ' · ' + fmt(i[0])]; }) }
    ];
  }

  /** The purchase order button of the drawer: asks for one, or says it was already asked. */
  function drawerOrderHtml(r) {
    var asked = window.RequestsData && window.RequestsData.pendingFor(site(), window.Dropdowns.getCurrentProgram(), r.sku.sku);
    return asked
      ? '<button type="button" class="btn btn--secondary btn--medium" disabled title="' + esc(asked.id) + ' is waiting for approval in Requests">Requested</button>'
      : '<button type="button" class="btn btn--primary btn--medium" data-order="' + r.sku.index + '">Purchase order</button>';
  }

  function drawerHtml(r) {
    var s = r.sku;
    return '<div class="drawer__header"><button class="drawer__close" id="product-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">' + esc((s.brand === 'Loose' ? '' : s.brand + ' ') + s.name + ' — ' + s.variant + ', ' + s.size) + '</h3></div>' +
      '<div class="drawer__body" id="pd-body">' + sectionsHtml(r) + '</div>' +
      '<div class="pd-footer" id="pd-order">' + drawerOrderHtml(r) + '</div>';
  }

  /** The sections of a product (details, store inventory, batches, location, activity); also used by the area drawer of the map. */
  function sectionsHtml(r) {
    var s = r.sku, days = r.daysOfSupply;
    return '' +
        section('Product details', dl([
          ['Area name', esc(s.department)], ['Category', esc(s.category.split(' > ').join(' → '))], ed('Brand', esc(s.brand), 'brand', s.brand, 'text'), ed('Variant', esc(s.variant), 'variant', s.variant, 'text'),
          ['SKU', esc(s.sku)], ['Barcode / EAN', esc(s.ean)], ed('Net weight / volume', esc(s.size), 'size', s.size, 'text'), ['Package type', esc(s.pack)],
          ['Pack', s.packLabel], ['Units per case', s.perCase > 1 ? plural(s.perCase, 'unit') : (s.perCase === 1 ? '1 unit' : 'Sold loose')], ed('Description', esc(s.description), 'description', s.description, 'text'),
          ed('Ingredients', esc(s.ingredients), 'ingredients', s.ingredients, 'text'), ed('Allergens', esc(s.allergens), 'allergens', s.allergens, 'text'),
          ed('Storage instructions', esc(s.storage), 'storage', s.storage, 'text'), ['Status', s.status]
        ])) +
        section('Store inventory', dl([
          ['Status', '<span class="ov-badge ov-badge--' + STATUS_TONE[r.status] + '">' + r.status + '</span>'], ed('Stock on hand', qty(r, r.stock), 'stock', r.stock, 'int'),
          ['Available stock', qty(r, r.available) + (r.reserved ? ' (' + r.reserved + ' reserved)' : '')], ['Shelf quantity', qty(r, r.shelf)], ['Backroom quantity', qty(r, r.backroom)],
          ed('Minimum stock', qty(r, r.min), 'min', r.min, 'int'), ['Target stock', qty(r, r.target)], ['Reorder point', 'Order when it reaches ' + r.reorderPoint],
          ['Reorder quantity', 'Order ' + qty(r, r.reorderQty)], ed('Unit price', money(r.price), 'price', r.price, 'money'), ed('Discount', r.promoPct ? '-' + r.promoPct + '%' : '', 'discount', r.promoPct, 'int'),
          ['Promotion price', r.promo ? money(r.promo) : ''], ed('Supplier', esc(r.supplier), 'supplier', r.supplier, 'text'), ed('Lead time', plural(r.lead, 'day'), 'lead', r.lead, 'int'),
          ed('Average daily sales', qty(r, r.ads), 'ads', r.ads, 'int'),
          ['Days of supply', days + (days === 1 ? ' day' : ' days')], ['Stockout risk', esc(r.risk)], ['Suggested order', r.suggested ? qty(r, r.suggested) : 'None']
        ])) +
        section('Batches &amp; expiry', batchesHtml(r)) +
        section('Store location', dl([
          ['Area name', esc(s.department)], ed('Aisle', 'Aisle ' + r.aisle, 'aisle', r.aisle, 'int'), ed('Shelf / fixture', 'Fixture ' + r.fixture, 'fixture', r.fixture, 'int'),
          ed('Shelf position', esc(r.position), 'position', r.position, 'text'), ['Planogram position', r.planogram]
        ])) +
        section('Activity', activityHtml(r));
  }

  function openDrawer(index) {
    var r = rows.filter(function(x) { return x.sku.index === index; })[0];
    if (!r) return;
    var overlay = document.getElementById('product-drawer');
    overlay.querySelector('.drawer').innerHTML = drawerHtml(r);
    overlay.classList.add('drawer-overlay--open');
    current = index;
    markOpenRow();
  }

  function closeDrawer() {
    var overlay = document.getElementById('product-drawer');
    if (overlay) overlay.classList.remove('drawer-overlay--open');
    current = null;
    markOpenRow();
  }

  /** The row of the product in the open drawer keeps the hover colour, so the table shows which product the drawer is about. */
  function markOpenRow() {
    var view = document.getElementById('products-view');
    if (!view) return;
    Array.prototype.forEach.call(view.querySelectorAll('.products-row--open, .pc-card--open'), function(el) { el.classList.remove('products-row--open', 'pc-card--open'); });
    if (current === null || current < 0) return;
    var el = view.querySelector('.products-row[data-index="' + current + '"], .products-card[data-index="' + current + '"]');
    if (el) el.classList.add(el.classList.contains('products-card') ? 'pc-card--open' : 'products-row--open');
  }

  /* ---------- editing in the drawer ---------- */

  function parseValue(type, text) {
    var t = text.trim();
    if (type === 'text') return t === '' ? { error: 'Required' } : { value: t };
    var n = Number(t.replace('R$', '').replace(',', '.'));
    if (t === '' || isNaN(n) || n < 0) return { error: 'Enter a number' };
    return { value: type === 'int' ? Math.round(n) : Math.round(n * 100) / 100 };
  }

  function startEdit(btn) {
    if (btn.querySelector('input')) return;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'pd-edit__input';
    input.value = btn.getAttribute('data-raw');
    btn.classList.add('pd-edit--editing');
    btn.innerHTML = '';
    btn.appendChild(input);
    input.focus();
    input.select();
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      var res = save ? parseValue(btn.getAttribute('data-type'), input.value) : null;
      if (res && res.error) { done = false; input.classList.add('pd-edit__input--error'); input.title = res.error; input.focus(); return; }
      if (res && String(res.value) !== btn.getAttribute('data-raw')) {
        window.ProductsData.edit(site(), current, btn.getAttribute('data-edit'), res.value);
      }
      refreshAfterEdit();
    }
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', function() { finish(true); });
  }

  function refreshAfterEdit() {
    var r = rows.filter(function(x) { return x.sku.index === current; })[0];
    if (!r) return;
    var body = document.getElementById('pd-body'), top = body ? body.scrollTop : 0;
    document.getElementById('product-drawer').querySelector('.drawer').innerHTML = drawerHtml(r);
    document.getElementById('pd-body').scrollTop = top;
    renderChips();
    renderRows();
    markOpenRow();
  }

  /* ---------- wiring ---------- */

  function build(view) {
    view.dataset.ready = '1';
    view.innerHTML =
      '<div class="products-toolbar products-toolbar--stacked">' +
        '<div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
          '<input type="text" id="products-search" class="products-search__input" placeholder="Search by product, brand, SKU or barcode" autocomplete="off"></div>' +
        '<div class="form-group products-area" id="products-area"></div>' +
        window.ProductCards.toggleHtml(state.view) +
        '<button type="button" class="btn btn--primary btn--medium toolbar-add" id="products-add"><lucide-icon name="plus" style="font-size:16px"></lucide-icon> <span>Add product</span></button>' +
        '<div class="products-chips" id="products-chips"></div>' +
      '</div>' +
      '<div class="table-container products-container"><table class="table table--products table--select"><thead class="table__head"><tr class="table__row" id="products-head"></tr></thead>' +
        '<tbody class="table__body" id="products-body"></tbody></table></div>' +
      '<div class="pc-grid" id="products-cards" hidden></div>' +
      '<div class="drawer-overlay" id="product-drawer"><div class="drawer drawer--right product-drawer"></div></div>';

    areaFilter = window.MultiSelect.create(document.getElementById('products-area'), { options: areaNames(), onChange: renderRows });
    var productsTable = view.querySelector('table');
    // Area name and Product stay in place when the table scrolls sideways: the second one sticks right after the first
    resizer = window.TableResize.create(productsTable, { key: 'products-v5', defaults: WIDTHS, grow: WIDTHS.length - 2, fixed: [0],
      onChange: function(widths) { productsTable.style.setProperty('--sticky-1', widths[1] + 'px'); } });

    view.addEventListener('input', function(e) {
      if (e.target.id !== 'products-search') return;
      state.query = e.target.value.trim().toLowerCase();
      renderRows();
    });
    view.addEventListener('change', function(e) {
      var box = e.target;
      if (!box.classList || !box.classList.contains('products-check')) return;
      if (box.id === 'products-select-all') {
        visibleRows().forEach(function(r) { if (box.checked) selected[r.sku.index] = true; else delete selected[r.sku.index]; });
        renderRows();
        return;
      }
      var idx = +box.getAttribute('data-select'), tr = box.closest('tr');
      if (box.checked) selected[idx] = true; else delete selected[idx];
      if (tr) tr.classList.toggle('products-row--selected', box.checked);
      syncSelectAll();
    });
    view.addEventListener('submit', function(e) {
      if (e.target.id !== 'add-product-form') return;
      e.preventDefault();
      submitAdd(e.target);
    });
    view.addEventListener('click', function(e) {
      var chip = e.target.closest('[data-quick]');
      if (chip) {
        // Clicking the selected filter again unselects it and goes back to all SKUs
        var key = chip.getAttribute('data-quick');
        state.quick = state.quick === key ? 'all' : key;
        renderChips();
        renderRows();
        return;
      }
      var th = e.target.closest('th[data-sort]');
      if (th) {
        var key = th.getAttribute('data-sort');
        state.sortDir = state.sortKey === key ? -state.sortDir : 1;
        state.sortKey = key;
        renderRows();
        return;
      }
      if (e.target.closest('#product-drawer-close') || e.target.id === 'product-drawer') { closeDrawer(); return; }
      if (e.target.closest('#products-add')) { openAddDrawer(); return; }
      if (e.target.closest('.products-cell--select')) return;   // the tick boxes have their own handler (change)
      var vbtn = e.target.closest('.pc-toggle__btn');
      if (vbtn) {
        state.view = vbtn.getAttribute('data-view');
        Array.prototype.forEach.call(view.querySelectorAll('.pc-toggle__btn'), function(b) {
          var on = b === vbtn;
          b.classList.toggle('pc-toggle__btn--active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        renderRows();
        return;
      }
      var edit = e.target.closest('.pd-edit');
      if (edit) { startEdit(edit); return; }
      var disc = e.target.closest('[data-discount]');
      if (disc) { openDiscountMenu(disc, +disc.getAttribute('data-discount')); return; }
      var order = e.target.closest('[data-order]');
      if (order) { askPurchase(+order.getAttribute('data-order')); return; }
      if (e.target.closest('.products-cell--order')) return;
      var row = e.target.closest('.products-row, .products-card');
      if (row) openDrawer(+row.getAttribute('data-index'));
    });
    document.addEventListener('click', function(e) { if (!e.target.closest('#pc-discount-menu, [data-discount]')) closeDiscountMenu(); });
    window.addEventListener('scroll', closeDiscountMenu, true);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('pc-discount-menu')) { closeDiscountMenu(); return; }
      if (e.key === 'Escape' && current !== null) closeDrawer();
    });
    view.addEventListener('keydown', function(e) {
      var row = e.target.closest && e.target.closest('.products-row, .products-card');
      if (row && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(+row.getAttribute('data-index')); }
    });
  }

  function site() { return window.Dropdowns.getCurrentSite(); }

  function openAddDrawer() {
    var overlay = document.getElementById('product-drawer');
    overlay.querySelector('.drawer').innerHTML = '<div class="drawer__header"><button class="drawer__close" id="product-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">Add product</h3></div><div class="drawer__body"><section class="pd-section"><h4 class="pd-section__title">New product of ' + esc(site().storeName) + '</h4>' + window.AddForms.productHtml() + '</section></div>';
    overlay.classList.add('drawer-overlay--open');
    current = -1;
    overlay.querySelector('[name="name"]').focus();
  }

  function submitAdd(form) {
    var res = window.AddForms.readProduct(form, site()), err = document.getElementById('add-form-error');
    if (res.error) { err.textContent = res.error; err.hidden = false; var bad = form.elements[res.field]; if (bad) bad.focus(); return; }
    var added = window.ProductsData.addProduct(site(), res.area, res.data);
    state.query = ''; state.quick = 'all'; state.area = '';
    var search = document.getElementById('products-search'); if (search) search.value = '';
    closeDrawer();
    render();
    if (typeof window.showNotification === 'function') window.showNotification('success', added.sku.name + ' was added to ' + res.area + '. It has no stock yet.');
  }

  function askPurchase(index) {
    var site = window.Dropdowns.getCurrentSite(), program = window.Dropdowns.getCurrentProgram();
    var row = window.ProductsData.getInventory(site).filter(function(r) { return r.sku.index === index; })[0];
    if (!row || window.RequestsData.pendingFor(site, program, row.sku.sku)) return;
    var req = window.RequestsData.createPurchase(site, program, row, { name: 'Kauane Moraes', role: 'Administrator' });
    renderRows();
    var slot = document.getElementById('pd-order');
    if (slot && current === index) slot.innerHTML = drawerOrderHtml(row);
    if (window.RequestsView && window.RequestsView.render) window.RequestsView.render();
    if (typeof window.showNotification === 'function') window.showNotification('success', 'Purchase request ' + req.id + ' created for ' + row.sku.name + '. It is waiting for approval in Requests.');
  }

  window.ProductsTable = {
    init: function() {
      var view = document.getElementById('products-view');
      if (!view) return;
      build(view);
      render();
      // Dropdowns update the current city / store first (their listeners were attached earlier)
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', render);
      });
    },
    render: render,
    sectionsHtml: sectionsHtml,
    detailGroups: detailGroups,
    /** Filter by one of the quick chips: 'all', 'low', 'out' or 'expiring' (used by the shortcuts of the Overview). */
    setQuick: function(key) {
      state.quick = key;
      renderChips();
      renderRows();
    },
    /** Show only one area (used by the area drawer of the map). */
    setArea: function(area) {
      state.quick = 'all';
      if (areaFilter) areaFilter.set(area ? [area] : areaNames());
      renderChips();
      renderRows();
    }
  };
})();
