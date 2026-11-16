/**
 * Network Employees
 * Everyone who works in the network in one searchable list, to find people, see how the teams are spread and spot the stores
 * with too few people on shift. It is the same people as the Employees tab of each store (EmployeesData builds them from the
 * store), shown here with operational data only: no pay and no personal data. A row opens the Employees tab of its store.
 */

(function() {
  'use strict';

  // The columns of the list; the last one is the store, so the list can be read store by store
  var COLUMNS = [
    { key: 'select', label: '', width: 44, select: true },
    { key: 'name', label: 'Employee', sort: true, width: 230 },
    { key: 'role', label: 'Role', sort: true, width: 160 },
    { key: 'city', label: 'City', sort: true, width: 170 },
    { key: 'store', label: 'Store', sort: true, width: 180 },
    { key: 'department', label: 'Department', sort: true, width: 190 },
    { key: 'shift', label: 'Shift', sort: true, width: 190 },
    { key: 'status', label: 'Status', sort: true, width: 130 }
  ];
  var STATUS_TONE = { 'On shift': 'success', 'On break': 'warning', 'Off today': 'muted', 'On leave': 'info' };
  var STATUS_ORDER = { 'On shift': 0, 'On break': 1, 'Off today': 2, 'On leave': 3 };
  var PAGE_SIZES = [50, 100, 250];
  var MIN_ON_SHIFT = 10;    // a store with fewer people on shift than this has too little coverage

  var all = [], stores = [], regions = [], cities = [], coverage = {}, shown = [];
  var selectedIds = {};   // the people ticked in the table, by link of their row
  var state = { query: '', quick: 'all', sortKey: 'name', sortDir: 1, page: 0, size: 100 };
  var filters = {}, resizer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function number(n) { return n.toLocaleString('pt-BR'); }

  function initials(name) { return name.split(/\s+/).map(function(w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase(); }

  /* ---------- data: one row per person ---------- */

  function build() {
    window.ProgramsData.getAll().forEach(function(p) {
      if (cities.indexOf(p.name) === -1) cities.push(p.name);
      if (p.region && regions.indexOf(p.region) === -1) regions.push(p.region);
      (p.sites || []).forEach(function(site) {
        var label = site.storeName + ' · ' + p.name;
        stores.push({ label: label, city: p.name, region: p.region, code: site.storeCode, site: site, program: p });
        var team = window.EmployeesData.getForStore(site, p);
        coverage[site.storeCode] = team.filter(function(e) { return e.status === 'On shift'; }).length;
        team.forEach(function(e) {
          all.push({
            id: e.id, name: e.name, role: e.role, city: p.name, region: p.region, store: site.storeName, storeLabel: label, storeCode: site.storeCode,
            department: e.primaryArea + (e.areas.length > 1 ? ' +' + (e.areas.length - 1) : ''), shift: e.shift, status: e.status,
            href: '../programs/program-detail.html?code=' + encodeURIComponent(p.code) + '&site=' + encodeURIComponent(site.siteName) + '&tab=employees'
          });
        });
      });
    });
    regions.sort();
  }

  function lowCoverage(r) { return coverage[r.storeCode] < MIN_ON_SHIFT; }

  /* ---------- filtering, sorting and paging ---------- */

  function inScope(r) {
    return filters.region.shows(r.region) && filters.city.shows(r.city) && filters.store.shows(r.storeLabel);
  }

  function matches(r) {
    if (state.quick === 'coverage' ? !lowCoverage(r) : (state.quick !== 'all' && r.status !== state.quick)) return false;
    var q = state.query;
    return !q || [r.name, r.id, r.role, r.city, r.store, r.department].some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
  }

  function value(r, key) { return key === 'status' ? STATUS_ORDER[r.status] : r[key]; }

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
      case 'name': return '<span class="emp-who"><span class="emp-avatar emp-avatar--initials">' + esc(initials(r.name)) + '</span><span class="products-cell--name">' + esc(r.name) + '</span></span>';
      case 'store': return '<span class="products-clip">' + esc(r.store) + '</span>' + (lowCoverage(r) ? ' <span class="ov-badge ov-badge--warning" title="Fewer than ' + MIN_ON_SHIFT + ' people on shift in this store">Low coverage</span>' : '');
      case 'status': return '<span class="ov-badge ov-badge--' + STATUS_TONE[r.status] + '">' + r.status + '</span>';
      default: return esc(r[c.key]);
    }
  }

  function rowHtml(r) {
    return '<tr class="table__row products-row ne-row' + (selectedIds[r.href] ? ' products-row--selected' : '') + '" data-href="' + esc(r.href) + '" tabindex="0" title="Open the Employees tab of ' + esc(r.store) + '">' + COLUMNS.map(function(c) {
      if (c.select) return '<td class="table__cell products-cell--select"><input type="checkbox" class="products-check" data-select="' + esc(r.href) + '"' + (selectedIds[r.href] ? ' checked' : '') + ' aria-label="Select ' + esc(r.name) + '"></td>';
      return '<td class="table__cell">' + cellHtml(r, c) + '</td>';
    }).join('') + '</tr>';
  }

  function headHtml() {
    return COLUMNS.map(function(c) {
      var active = state.sortKey === c.key;
      if (c.select) return '<th class="table__header products-cell--select"><input type="checkbox" class="products-check" id="ne-select-all" aria-label="Select all employees"></th>';
      return '<th class="table__header' + (c.sort ? ' sortable' : '') + '"' + (c.sort ? ' data-sort="' + c.key + '"' : '') +
        (active ? ' aria-sort="' + (state.sortDir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' + c.label +
        (c.sort ? '<span class="products-sort' + (active ? ' products-sort--active' : '') + '">' + (active ? (state.sortDir > 0 ? '↑' : '↓') : '⇅') + '</span>' : '') + '</th>';
    }).join('');
  }

  function renderChips() {
    var scoped = all.filter(inScope), c = { all: scoped.length, 'On shift': 0, 'On break': 0, 'Off today': 0, 'On leave': 0, coverage: 0 }, seen = {}, lowStores = 0;
    scoped.forEach(function(r) {
      c[r.status]++;
      if (!seen[r.storeCode]) { seen[r.storeCode] = true; if (lowCoverage(r)) lowStores++; }
    });
    var chips = [['all', 'All employees', c.all], ['On shift', 'On shift', c['On shift']], ['On break', 'On break', c['On break']], ['Off today', 'Off today', c['Off today']], ['On leave', 'On leave', c['On leave']]];
    document.getElementById('ne-chips').innerHTML = chips.map(function(x) {
      return '<button type="button" class="products-chip' + (state.quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (state.quick === x[0]) + '">' +
        x[1] + ' <strong>' + number(x[2]) + '</strong></button>';
    }).join('') + '<span class="rq-chip-sep" role="separator"></span><button type="button" class="products-chip rq-chip-urgent' + (state.quick === 'coverage' ? ' products-chip--active' : '') + '" data-quick="coverage" aria-pressed="' + (state.quick === 'coverage') +
      '" title="Stores with fewer than ' + MIN_ON_SHIFT + ' people on shift today">Low coverage <strong>' + number(lowStores) + (lowStores === 1 ? ' store' : ' stores') + '</strong></button>';
  }

  function renderPager(total, from, to) {
    document.getElementById('np-pager').innerHTML =
      '<span>' + (total ? 'Showing ' + number(from + 1) + '–' + number(to) + ' of ' + number(total) : 'No employee matches the filters') + '</span>' +
      '<span class="np-pager__controls"><label>Rows per page <select class="form-select" id="np-size">' +
        PAGE_SIZES.map(function(n) { return '<option' + (n === state.size ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
        '<button type="button" class="btn btn--secondary btn--small" data-page="-1"' + (state.page === 0 ? ' disabled' : '') + '>Previous</button>' +
        '<button type="button" class="btn btn--secondary btn--small" data-page="1"' + (to >= total ? ' disabled' : '') + '>Next</button></span>';
  }

  function renderRows() {
    shown = visible();
    var pages = Math.max(1, Math.ceil(shown.length / state.size));
    if (state.page >= pages) state.page = pages - 1;
    var from = state.page * state.size, to = Math.min(shown.length, from + state.size);
    document.getElementById('ne-body').innerHTML = shown.slice(from, to).map(rowHtml).join('') ||
      '<tr class="table__row"><td class="table__cell products-empty" colspan="' + COLUMNS.length + '">No employee matches the filters.</td></tr>';
    renderChips();
    renderPager(shown.length, from, to);
    syncSelectAll();
  }

  /** The people shown on the current page. */
  function pageRows() { return shown.slice(state.page * state.size, state.page * state.size + state.size); }

  /** The box in the header: ticked when everyone on the page is selected, half-ticked when only some are. */
  function syncSelectAll() {
    var box = document.getElementById('ne-select-all');
    if (!box) return;
    var rows = pageRows(), n = rows.filter(function(r) { return selectedIds[r.href]; }).length;
    box.checked = rows.length > 0 && n === rows.length;
    box.indeterminate = n > 0 && n < rows.length;
  }

  function renderHead() {
    document.getElementById('ne-head').innerHTML = headHtml();
    resizer.refresh();
  }

  function subtitle() {
    var low = stores.filter(function(s) { return coverage[s.code] < MIN_ON_SHIFT; }).length;
    var parts = ['QuickCart Market', 'entire network', number(all.length) + ' employees in ' + number(stores.length) + ' stores', low ? number(low) + (low === 1 ? ' store' : ' stores') + ' with low coverage' : 'every store has enough people on shift'];
    document.getElementById('np-subtitle').innerHTML = parts.map(function(t) { return '<span class="np-header__item">' + esc(t) + '</span>'; }).join('');
  }

  /* ---------- adding an employee ---------- */

  function openAdd() {
    var overlay = document.getElementById('ne-drawer'), drawer = overlay.querySelector('.drawer');
    drawer.innerHTML = '<div class="drawer__header"><button class="drawer__close" id="ne-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button><h3 class="drawer__title">Add employee</h3></div>' +
      '<div class="drawer__body"><section class="pd-section"><h4 class="pd-section__title">New team member</h4>' +
      window.EmployeeForm.html({ stores: stores.map(function(s) { return { value: s.code, label: s.label }; }) }) + '</section></div>';
    overlay.classList.add('drawer-overlay--open');
    drawer.querySelector('[name="name"]').focus();
  }

  function closeAdd() { document.getElementById('ne-drawer').classList.remove('drawer-overlay--open'); }

  function submitAdd(form) {
    var code = form.elements.store.value, st = stores.filter(function(s) { return s.code === code; })[0];
    var team = window.EmployeesData.getForStore(st.site, st.program);
    var res = window.EmployeeForm.read(form, team.map(function(e) { return e.name; })), err = document.getElementById('add-employee-error');
    if (res.error) { err.textContent = res.error; err.hidden = false; var bad = form.querySelector('[name="' + res.field + '"]'); if (bad) bad.focus(); return; }
    var e = window.EmployeesData.add(st.site, st.program, res.data);
    all.push({ id: e.id, name: e.name, role: e.role, city: st.city, region: st.region, store: st.site.storeName, storeLabel: st.label, storeCode: code, department: e.primaryArea, shift: e.shift, status: e.status,
      href: '../programs/program-detail.html?code=' + encodeURIComponent(st.program.code) + '&site=' + encodeURIComponent(st.site.siteName) + '&tab=employees' });
    coverage[code] = team.filter(function(x) { return x.status === 'On shift'; }).length;
    state.query = ''; state.quick = 'all'; state.page = 0;
    document.getElementById('ne-search').value = '';
    closeAdd();
    subtitle();
    renderRows();
    if (typeof window.showNotification === 'function') window.showNotification('success', e.name + ' was added to ' + st.site.storeName + '.');
  }

  function init() {
    var view = document.getElementById('network-employees');
    if (!view || view.dataset.ready) return;
    view.dataset.ready = '1';
    build();
    subtitle();

    view.innerHTML =
      '<div class="products-toolbar np-toolbar">' +
        '<div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
          '<input type="text" id="ne-search" class="products-search__input" placeholder="Search by name, ID, role, store or city" autocomplete="off"></div>' +
        '<div class="form-group products-area" id="ne-region"></div><div class="form-group products-area" id="ne-city"></div><div class="form-group products-area" id="ne-store"></div>' +
        '<div class="products-chips np-chips" id="ne-chips"></div>' +
      '</div>' +
      '<div class="table-container products-container"><table class="table table--employees table--network-employees"><thead class="table__head"><tr class="table__row" id="ne-head"></tr></thead><tbody class="table__body" id="ne-body"></tbody></table></div>' +
      '<div class="np-pager" id="np-pager"></div>' +
      '<div class="drawer-overlay" id="ne-drawer"><div class="drawer drawer--right product-drawer"></div></div>';

    // Region narrows the cities and the stores, the city narrows the stores
    var refreshStores = function() {
      var chosen = cities.filter(filters.city.shows);
      filters.store.setOptions(stores.filter(function(s) { return chosen.indexOf(s.city) !== -1; }).map(function(s) { return s.label; }));
    };
    filters.region = window.MultiSelect.create(document.getElementById('ne-region'), { options: regions, label: 'regions', onChange: function() {
      var inRegion = {};
      stores.forEach(function(s) { if (filters.region.shows(s.region)) inRegion[s.city] = true; });
      filters.city.setOptions(cities.filter(function(c) { return inRegion[c]; }));
      refreshStores();
      state.page = 0;
      renderRows();
    } });
    filters.city = window.MultiSelect.create(document.getElementById('ne-city'), { options: cities, label: 'cities', onChange: function() { refreshStores(); state.page = 0; renderRows(); } });
    filters.store = window.MultiSelect.create(document.getElementById('ne-store'), { options: stores.map(function(s) { return s.label; }), label: 'stores', onChange: function() { state.page = 0; renderRows(); } });

    var table = view.querySelector('table');
    resizer = window.TableResize.create(table, { key: 'network-employees-v3', defaults: COLUMNS.map(function(c) { return c.width; }), grow: 4, fixed: [0] });
    renderHead();
    renderRows();

    view.addEventListener('input', function(e) {
      if (e.target.id !== 'ne-search') return;
      state.query = e.target.value.trim().toLowerCase();
      state.page = 0;
      renderRows();
    });
    view.addEventListener('submit', function(e) {
      if (e.target.id !== 'add-employee-form') return;
      e.preventDefault();
      submitAdd(e.target);
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAdd(); });
    view.addEventListener('change', function(e) {
      if (e.target.id === 'np-size') { state.size = +e.target.value; state.page = 0; renderRows(); }
    });
    view.addEventListener('click', function(e) {
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
      if (pg) { state.page += +pg.getAttribute('data-page'); renderRows(); document.getElementById('ne-body').scrollIntoView({ block: 'start' }); return; }
      if (e.target.closest('#ne-drawer-close') || e.target.id === 'ne-drawer') { closeAdd(); return; }
      if (e.target.closest('.products-cell--select')) return;   // the tick boxes have their own handler (change)
      var row = e.target.closest('tr[data-href]');
      if (row) window.location.href = row.getAttribute('data-href');
    });
    view.addEventListener('change', function(e) {
      var box = e.target;
      if (!box.classList || !box.classList.contains('products-check')) return;
      if (box.id === 'ne-select-all') {
        pageRows().forEach(function(r) { if (box.checked) selectedIds[r.href] = true; else delete selectedIds[r.href]; });
        renderRows();
        return;
      }
      var id = box.getAttribute('data-select'), tr = box.closest('tr');
      if (box.checked) selectedIds[id] = true; else delete selectedIds[id];
      if (tr) tr.classList.toggle('products-row--selected', box.checked);
      syncSelectAll();
    });
    view.addEventListener('keydown', function(e) {
      var row = e.target.closest && e.target.closest('tr[data-href]');
      if (row && e.target.tagName !== 'INPUT' && e.key === 'Enter') window.location.href = row.getAttribute('data-href');
    });
  }

  document.addEventListener('click', function(e) { if (e.target.closest('#ne-add')) openAdd(); });

  function safeInit() {
    try { init(); } catch (err) { console.error('Network employees init failed:', err); }
  }

  // The canvas dispatches this event once it has injected the page content.
  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
