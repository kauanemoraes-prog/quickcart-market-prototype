/**
 * Supplies Table
 * The Equipment/Consumables tab of the store page, in the style of the Products tab: search, area dropdown, quick filters, a
 * table with resizable columns and a drawer per item. It lists the equipment and the consumables the store has, how many,
 * where they are kept and in what condition. Data comes from SuppliesData; the table follows the City / Store dropdowns.
 */

(function() {
  'use strict';

  var COLUMNS = [
    { key: 'area', label: 'Area name', sort: true }, { key: 'name', label: 'Item', sort: true }, { key: 'type', label: 'Type', sort: true }, { key: 'brand', label: 'Brand', sort: true },
    { key: 'status', label: 'Status', sort: true }, { key: 'model', label: 'Model / Variant' }, { key: 'unit', label: 'Unit' }, { key: 'code', label: 'Code', sort: true }, { key: 'cost', label: 'Unit cost', sort: true, num: true },
    { key: 'qty', label: 'Quantity', sort: true, num: true }, { key: 'min', label: 'Min. quantity', num: true }, { key: 'location', label: 'Location' },
    { key: 'supplier', label: 'Supplier', sort: true }, { key: 'restocked', label: 'Last restocked', sort: true },
    { key: 'order', label: 'Purchase order', order: true }
  ];
  var WIDTHS = [170, 210, 130, 140, 140, 190, 130, 130, 120, 110, 130, 240, 220, 190, 144];
  var STATUS_ORDER = { 'Out of stock': 0, 'Not in store': 1, 'Under repair': 2, 'Low stock': 3, 'In stock': 4, 'Available': 5, 'In use': 6 };
  var STATUS_TONE = { 'In stock': 'success', 'Low stock': 'warning', 'Out of stock': 'danger', 'In use': 'info', 'Available': 'success', 'Under repair': 'warning', 'Not in store': 'danger' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var state = { query: '', area: '', quick: 'all', sortKey: 'status', sortDir: 1, view: 'table' };
  var rows = [];
  var resizer = null;
  var areaFilter = null;
  var current = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) { return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function fmt(date) { return date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear(); }

  function site() { return window.Dropdowns.getCurrentSite(); }

  function value(r, key) {
    switch (key) {
      case 'area': return r.item.area;
      case 'name': return r.item.name;
      case 'type': return r.item.type;
      case 'brand': return r.item.brand;
      case 'code': return r.item.code;
      case 'cost': return r.item.cost;
      case 'qty': return r.qty;
      case 'supplier': return r.supplier;
      case 'restocked': return r.lastRestocked.getTime();
      case 'status': return STATUS_ORDER[r.status];
      default: return '';
    }
  }

  function areaNames() { return window.DetailData.getLines().map(function(a) { return a.name; }); }

  /* ---------- table ---------- */

  function matches(r) {
    if (areaFilter && !areaFilter.shows(r.item.area)) return false;
    if (state.quick === 'equipment' && r.item.type !== 'Equipment') return false;
    if (state.quick === 'consumable' && r.item.type !== 'Consumable') return false;
    if (state.quick === 'low' && r.status !== 'Low stock') return false;
    if (state.quick === 'out' && r.status !== 'Out of stock' && r.status !== 'Not in store') return false;
    if (state.quick === 'repair' && r.status !== 'Under repair') return false;
    var q = state.query;
    if (!q) return true;
    var it = r.item;
    return [it.name, it.brand, it.model, it.code, it.area, r.supplier].some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
  }

  function visibleRows() {
    var key = state.sortKey, dir = state.sortDir;
    return rows.filter(matches).sort(function(a, b) {
      var x = value(a, key), y = value(b, key);
      var c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return (c || a.item.index - b.item.index) * dir;
    });
  }

  function rowHtml(r) {
    var it = r.item;
    return '<tr class="table__row products-row" data-index="' + it.index + '" tabindex="0">' +
      '<td class="table__cell">' + esc(it.area) + '</td>' +
      '<td class="table__cell products-cell--name"><span class="products-clip">' + esc(it.name) + '</span></td>' +
      '<td class="table__cell"><span class="tt-chip tt-chip--' + it.type.toLowerCase() + '">' + it.type + '</span></td>' +
      '<td class="table__cell">' + esc(it.brand) + '</td>' +
      '<td class="table__cell"><span class="ov-badge ov-badge--' + STATUS_TONE[r.status] + '">' + r.status + '</span></td>' +
      '<td class="table__cell">' + esc(it.model) + '</td>' +
      '<td class="table__cell">' + esc(it.unit) + '</td>' +
      '<td class="table__cell products-cell--mono">' + esc(it.code) + '</td>' +
      '<td class="table__cell products-cell--num">' + money(it.cost) + '</td>' +
      '<td class="table__cell products-cell--num">' + r.qty + '</td>' +
      '<td class="table__cell products-cell--num">' + it.min + '</td>' +
      '<td class="table__cell">' + esc(r.location) + '</td>' +
      '<td class="table__cell">' + esc(r.supplier) + '</td>' +
      '<td class="table__cell">' + fmt(r.lastRestocked) + '</td>' +
      '<td class="table__cell products-cell--order">' + orderButton(r) + '</td></tr>';
  }

  function headHtml() {
    return COLUMNS.map(function(c) {
      var active = state.sortKey === c.key;
      return '<th class="table__header' + (c.num ? ' products-cell--num' : '') + (c.order ? ' products-cell--order' : '') + (c.sort ? ' sortable' : '') + '"' + (c.sort ? ' data-sort="' + c.key + '"' : '') +
        (active ? ' aria-sort="' + (state.sortDir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' + c.label +
        (c.sort ? '<span class="products-sort' + (active ? ' products-sort--active' : '') + '">' + (active ? (state.sortDir > 0 ? '↑' : '↓') : '⇅') + '</span>' : '') + '</th>';
    }).join('');
  }

  function renderChips() {
    var n = function(f) { return rows.filter(function(r) {
      return f === 'all' ? true : f === 'equipment' ? r.item.type === 'Equipment' : f === 'consumable' ? r.item.type === 'Consumable' : f === 'low' ? r.status === 'Low stock' :
        f === 'out' ? (r.status === 'Out of stock' || r.status === 'Not in store') : r.status === 'Under repair';
    }).length; };
    var chips = [['all', 'All items'], ['equipment', 'Equipment'], ['consumable', 'Consumables'], ['low', 'Low stock'], ['out', 'Out of stock'], ['repair', 'Under repair']];
    document.getElementById('supplies-chips').innerHTML = chips.map(function(x) {
      return '<button type="button" class="products-chip' + (state.quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (state.quick === x[0]) + '">' + x[1] + ' <strong>' + n(x[0]) + '</strong></button>';
    }).join('');
  }

  function renderRows() {
    var list = visibleRows();
    document.getElementById('supplies-head').innerHTML = headHtml();
    if (resizer) resizer.refresh();
    document.getElementById('supplies-body').innerHTML = list.map(rowHtml).join('') ||
      '<tr class="table__row"><td class="table__cell products-empty" colspan="' + COLUMNS.length + '">No items match your filters.</td></tr>';
    renderCards(list);
    markOpen();
  }

  /** The card view: the same items as the table, one card per item. */
  /** The purchase order button of a card: it asks for one, or says it was already asked. */
  function orderButton(r) {
    var asked = window.RequestsData && window.RequestsData.pendingForSupply(site(), window.Dropdowns.getCurrentProgram(), r.item.name, r.item.area);
    return asked
      ? '<button type="button" class="btn btn--secondary btn--small" disabled title="' + esc(asked.id) + ' is waiting for approval in Requests">Requested</button>'
      : '<button type="button" class="btn ' + (r.status === 'In stock' || r.status === 'Available' || r.status === 'In use' ? 'btn--secondary' : 'btn--primary') + ' btn--small" data-order="' + r.item.index + '">Purchase order</button>';
  }

  function askPurchase(index) {
    var program = window.Dropdowns.getCurrentProgram();
    var row = rows.filter(function(x) { return x.item.index === index; })[0];
    if (!row || window.RequestsData.pendingForSupply(site(), program, row.item.name, row.item.area)) return;
    var req = window.RequestsData.createSupply(site(), program, row, { name: 'Kauane Moraes', role: 'Administrator' });
    renderRows();
    if (window.RequestsView && window.RequestsView.render) window.RequestsView.render();
    if (typeof window.showNotification === 'function') window.showNotification('success', 'Purchase request ' + req.id + ' created for ' + row.item.name + '. It is waiting for approval in Requests.');
  }

  function renderCards(list) {
    var grid = document.getElementById('supplies-cards'), cards = state.view === 'cards';
    document.querySelector('#supplies-view .products-container').hidden = cards;
    grid.hidden = !cards;
    if (!cards) return;
    // Cards are in alphabetical order (name, then brand and model), whatever the table is sorted by
    grid.innerHTML = list.slice().sort(function(a, b) {
      return a.item.name.localeCompare(b.item.name, 'pt-BR') || a.item.brand.localeCompare(b.item.brand, 'pt-BR') || a.item.model.localeCompare(b.item.model, 'pt-BR') || a.item.index - b.item.index;
    }).map(function(r) {
      var it = r.item;
      return window.ProductCards.card({
        name: it.name, brand: it.brand, variant: it.model, size: it.unit, pack: it.type === 'Equipment' ? 'Box' : 'Pack', codes: [['Code', it.code]],
        price: money(it.cost),
        status: r.status, tone: STATUS_TONE[r.status], headline: r.qty + ' ' + (r.qty === 1 ? 'unit' : 'units') + ' · min. ' + it.min,
        footer: orderButton(r), attrs: 'data-index="' + it.index + '"', cls: 'supplies-card', art: false
      });
    }).join('') || '<p class="pc-empty">No items match your filters.</p>';
  }

  /** The row or card of the item in the open drawer keeps the hover colour. */
  function markOpen() {
    var view = document.getElementById('supplies-view');
    if (!view) return;
    Array.prototype.forEach.call(view.querySelectorAll('.products-row--open, .pc-card--open'), function(el) { el.classList.remove('products-row--open', 'pc-card--open'); });
    if (current === null || current < 0) return;
    var el = view.querySelector('.products-row[data-index="' + current + '"], .supplies-card[data-index="' + current + '"]');
    if (el) el.classList.add(el.classList.contains('supplies-card') ? 'pc-card--open' : 'products-row--open');
  }

  function render() {
    var view = document.getElementById('supplies-view');
    if (!view || !view.dataset.ready) return;
    rows = window.SuppliesData.getInventory(site());
    renderChips();
    renderRows();
    if (current !== null) closeDrawer();
  }

  /* ---------- drawer ---------- */

  function dl(pairs) {
    return '<dl class="pd-grid">' + pairs.map(function(p) {
      return '<div class="pd-grid__item"><dt>' + p[0] + '</dt><dd>' + (p[1] === '' ? '—' : p[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function section(title, body) {
    return '<section class="pd-section"><h4 class="pd-section__title">' + title + '</h4>' + body + '</section>';
  }

  function drawerHtml(r) {
    var it = r.item, equipment = it.type === 'Equipment';
    var used = r.issues.length ? '<ul class="pd-activity">' + r.issues.map(function(t) { return '<li><strong>' + esc(t) + '</strong><span>Open issue that needs this item</span><time></time></li>'; }).join('') + '</ul>'
      : '<p class="pd-note">No open issue needs this item right now.</p>';
    if (r.repairIssue) used = '<ul class="pd-activity"><li><strong>' + esc(r.repairIssue) + '</strong><span>This equipment is being repaired</span><time></time></li></ul>' + (r.issues.length ? used : '');
    return '<div class="drawer__header"><button class="drawer__close" id="supply-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">' + esc(it.name) + ' — ' + esc(it.model) + '</h3></div><div class="drawer__body">' +
      section('Item details', dl([['Area name', esc(it.area)], ['Type', it.type], ['Brand', esc(it.brand)], ['Model / variant', esc(it.model)], ['Code', esc(it.code)], ['Unit', esc(it.unit)],
        ['Unit cost', money(it.cost)], ['Supplier', esc(r.supplier)], ['Description', esc(it.description)]])) +
      section('Store inventory', dl([['Status', '<span class="ov-badge ov-badge--' + STATUS_TONE[r.status] + '">' + r.status + '</span>'], ['Quantity', String(r.qty)], ['Minimum quantity', String(it.min)],
        ['Location', esc(r.location)], ['Last restocked', fmt(r.lastRestocked)], ['Last checked', fmt(r.lastChecked)], ['Reorder quantity', String(r.reorderQty)]])) +
      section(equipment ? 'Repairs and issues' : 'Needed for', used) + '</div>';
  }

  function openDrawer(index) {
    var r = rows.filter(function(x) { return x.item.index === index; })[0];
    if (!r) return;
    var o = document.getElementById('supply-drawer');
    o.querySelector('.drawer').innerHTML = drawerHtml(r);
    o.classList.add('drawer-overlay--open');
    current = index;
    markOpen();
  }

  function closeDrawer() {
    var o = document.getElementById('supply-drawer');
    if (o) o.classList.remove('drawer-overlay--open');
    current = null;
    markOpen();
  }

  function openAddDrawer() {
    var o = document.getElementById('supply-drawer');
    o.querySelector('.drawer').innerHTML = '<div class="drawer__header"><button class="drawer__close" id="supply-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">Add item</h3></div><div class="drawer__body"><section class="pd-section"><h4 class="pd-section__title">New equipment or consumable of ' + esc(site().storeName) + '</h4>' + window.AddForms.itemHtml() + '</section></div>';
    o.classList.add('drawer-overlay--open');
    current = -1;
    o.querySelector('[name="name"]').focus();
  }

  function submitAdd(form) {
    var res = window.AddForms.readItem(form, site()), err = document.getElementById('add-form-error');
    if (res.error) { err.textContent = res.error; err.hidden = false; var bad = form.elements[res.field]; if (bad) bad.focus(); return; }
    var added = window.SuppliesData.addItem(site(), res.data);
    state.query = ''; state.quick = 'all';
    var search = document.getElementById('supplies-search'); if (search) search.value = '';
    closeDrawer();
    render();
    if (typeof window.showNotification === 'function') window.showNotification('success', added.item.name + ' was added to ' + added.item.area + '.');
  }

  /* ---------- wiring ---------- */

  function build(view) {
    view.dataset.ready = '1';
    view.innerHTML =
      '<div class="products-toolbar products-toolbar--stacked">' +
        '<div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
          '<input type="text" id="supplies-search" class="products-search__input" placeholder="Search by item, brand, code or supplier" autocomplete="off"></div>' +
        '<div class="form-group products-area" id="supplies-area"></div>' +
        window.ProductCards.toggleHtml(state.view) +
        '<button type="button" class="btn btn--primary btn--medium toolbar-add" id="supplies-add"><lucide-icon name="plus" style="font-size:16px"></lucide-icon> <span>Add item</span></button>' +
        '<div class="products-chips" id="supplies-chips"></div>' +
      '</div>' +
      '<div class="table-container products-container"><table class="table table--products table--supplies"><thead class="table__head"><tr class="table__row" id="supplies-head"></tr></thead>' +
        '<tbody class="table__body" id="supplies-body"></tbody></table></div>' +
      '<div class="pc-grid" id="supplies-cards" hidden></div>' +
      '<div class="drawer-overlay" id="supply-drawer"><div class="drawer drawer--right product-drawer"></div></div>';
    var suppliesTable = view.querySelector('table');
    // Same as the Products table: the first two columns (Area name and Item) stay in place when it scrolls sideways
    areaFilter = window.MultiSelect.create(document.getElementById('supplies-area'), { options: areaNames(), onChange: renderRows });
    resizer = window.TableResize.create(suppliesTable, { key: 'supplies-v3', defaults: WIDTHS, grow: WIDTHS.length - 2,
      onChange: function(widths) { suppliesTable.style.setProperty('--sticky-1', widths[0] + 'px'); } });

    view.addEventListener('input', function(e) {
      if (e.target.id !== 'supplies-search') return;
      state.query = e.target.value.trim().toLowerCase();
      renderRows();
    });
    view.addEventListener('submit', function(e) {
      if (e.target.id !== 'add-item-form') return;
      e.preventDefault();
      submitAdd(e.target);
    });
    view.addEventListener('click', function(e) {
      var chip = e.target.closest('[data-quick]');
      if (chip) { var k = chip.getAttribute('data-quick'); state.quick = state.quick === k ? 'all' : k; renderChips(); renderRows(); return; }
      var th = e.target.closest('th[data-sort]');
      if (th) {
        var key = th.getAttribute('data-sort');
        state.sortDir = state.sortKey === key ? -state.sortDir : 1;
        state.sortKey = key;
        renderRows();
        return;
      }
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
      var order = e.target.closest('[data-order]');
      if (order) { askPurchase(+order.getAttribute('data-order')); return; }
      if (e.target.closest('#supplies-add')) { openAddDrawer(); return; }
      if (e.target.closest('#supply-drawer-close') || e.target.id === 'supply-drawer') { closeDrawer(); return; }
      if (e.target.closest('.products-cell--order')) return;
      var row = e.target.closest('.products-row, .supplies-card');
      if (row) openDrawer(+row.getAttribute('data-index'));
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && current !== null) closeDrawer(); });
    view.addEventListener('keydown', function(e) {
      var row = e.target.closest && e.target.closest('.products-row, .supplies-card');
      if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(+row.getAttribute('data-index')); }
    });
  }

  window.SuppliesTable = {
    init: function() {
      var view = document.getElementById('supplies-view');
      if (!view) return;
      build(view);
      render();
      // Dropdowns update the current city / store first (their listeners were attached earlier)
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', render);
      });
    },
    render: render
  };
})();
