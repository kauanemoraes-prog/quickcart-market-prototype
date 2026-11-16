/**
 * Store Overview
 * Operational summary of the selected store: what needs action and where to go to solve it. The full tables live in
 * the other tabs, so this page only shows exceptions and shortcuts:
 *   five indicators, Needs attention (one short list that mixes stock, tasks, orders, expiry, equipment and requests),
 *   Tasks today, Upcoming deliveries, Stock & expiry alerts and a small sales summary.
 * Counters come from the store record in data.js and are spread over the areas of DetailData, so the
 * numbers add up across the page (an area's problems sum to the indicators at the top).
 * Stock, tasks and orders always describe the situation right now; only the sales summary follows the period selector.
 */

(function() {
  'use strict';

  // Deadlines are measured from the same reference date as the dashboard (the mock data ends 19 Feb 2026)
  var TODAY = new Date(2026, 11, 10);
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];            // the abbreviations used by the dates in data.js, to read them
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];   // what is shown on screen
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var TASK_TYPES = [
    { verb: 'Restock', object: function(p) { return p + ' on the shelf'; } },
    { verb: 'Count stock of', object: function(p) { return p; } },
    { verb: 'Check expiry of', object: function(p) { return p; } },
    { verb: 'Fix price label for', object: function(p) { return p; } },
    { verb: 'Reorganize shelf of', object: function(p) { return p; } }
  ];
  var BLOCK_REASONS = ['Waiting for delivery', 'Out of stock at supplier', 'Equipment unavailable', 'Needs manager approval', 'Price missing in catalog'];
  var PERISHABLE = ['Produce', 'Bakery', 'Butcher', 'Dairy', 'Fish Counter', 'Chilled & Frozen'];
  var STAFF = ['Helena Duarte', 'Tiago Nunes', 'Beatriz Moreira', 'Felipe Araújo', 'Marina Costa', 'Rafael Lima', 'Camila Rocha', 'Gustavo Pinto'];
  var ACTIVITY = ['Stock count submitted', 'Delivery received', 'Stock adjusted', 'Replenishment completed', 'Shelf check done', 'Price labels updated'];
  var ATTENTION_LIMIT = 10, TASK_LIMIT = 5, EXPIRY_LIMIT = 5, STOCK_PRODUCTS_LIMIT = 5;
  var EQUIPMENT = ['Display fridge', 'Price scale', 'Barcode scanner', 'Receipt printer', 'Pallet jack', 'Freezer door'];
  var PERIODS = [
    { key: 'today', label: 'Today', days: 1, compare: 'yesterday' },
    { key: 'week', label: 'Last 7 days', days: 7, compare: 'the previous 7 days' },
    { key: 'month', label: 'Last 30 days', days: 30, compare: 'the previous 30 days' }
  ];
  var period = 'today';
  var focus = '';   // the indicator selected as a filter of Needs attention: out, low, tasks, orders, equip (nothing = all)
  var FOCUS = {
    out: { label: 'Out of stock', go: 'tab=equipment-list;quick=out', open: 'Open in Products' }, low: { label: 'Low stock', go: 'tab=equipment-list;quick=low', open: 'Open in Products' },
    tasks: { label: 'Tasks needing attention', go: 'tab=employees', open: 'Open Employees' }, orders: { label: 'Orders at risk', go: 'tab=purchase-spend', open: 'Open Purchase Spend' },
    equip: { label: 'Equipment unavailable', go: 'tab=consumables', open: 'Open Equipment/Consumables' }
  };

  /** Product names of an area, taken from the catalog shown on the Products tab. */
  function productsOf(area) {
    var names = window.ProductsData.getCatalog().filter(function(p) { return p.department === area; }).map(function(p) { return p.name; });
    return names.length ? names : ['pallets'];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function icon(name, size) { return '<lucide-icon name="' + name + '" style="font-size:' + (size || 16) + 'px"></lucide-icon>'; }

  function addDays(date, n) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n); }

  function fmt(date) { return date.getDate() + ' ' + MONTH_NAMES[date.getMonth()]; }

  function when(date) {
    var days = Math.round((date - TODAY) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return WEEKDAYS[date.getDay()] + ' ' + fmt(date);
  }

  function parseDate(str) {
    var m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(String(str || '').trim());
    return m ? new Date(+m[3], MONTHS.indexOf(m[2]), +m[1]) : null;
  }

  function money(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }

  /** Spread `total` units over the areas, always in the same places for the same store (a smaller total is a subset). */
  function spread(total, count, seed) {
    var out = [];
    for (var i = 0; i < count; i++) out.push(0);
    for (var u = 0; u < total && count; u++) out[(seed + u * 5) % count]++;
    return out;
  }

  function storeData() {
    var program = window.Dropdowns.getCurrentProgram(), site = window.Dropdowns.getCurrentSite();
    var areas = window.DetailData.getLines();
    var seed = parseInt(String(site.storeCode).slice(3), 10) || 0, n = areas.length;
    return {
      program: program, site: site, areas: areas, seed: seed,
      low: spread(site.lowStock, n, seed), oos: spread(site.outOfStock, n, seed), risk: spread(site.stockoutRisk, n, seed + 4),
      overdue: spread(site.overdueTasks, n, seed + 1), blocked: spread(site.blockedTasks, n, seed + 2), equip: spread(site.equipmentDown, n, seed + 3)
    };
  }

  /* ---------- orders, tasks, expiry (built once per render) ---------- */

  function orders(d) {
    var s = d.site, suppliers = window.ProgramsData.suppliers, list = [];
    for (var i = 0; i < Math.min(s.pendingOrders, 4); i++) {
      var late = i < s.lateOrders, items = 8 + (d.seed + i * 7) % 25;
      list.push({
        supplier: suppliers[(d.seed + i) % suppliers.length], number: 'PO-' + (1000 + d.seed * 7 + i), items: items, value: items * (95 + (d.seed + i * 13) % 60),
        late: late, due: late ? addDays(TODAY, -(i + 1) * 2) : addDays(TODAY, (d.seed % 3 === 0 ? 0 : 1) + (i - s.lateOrders) * 2)
      });
    }
    return list;
  }

  /** Blocked first, then overdue, then those due soon. `total` counts every open task, `shown` is the short list. */
  function tasks(d) {
    var list = [], n = 0, soonCount = 2 + d.seed % 3;
    if (!d.areas.length) return { shown: [], total: 0, list: [] };
    function make(areaIdx, state, dueOffset, reason) {
      var area = d.areas[areaIdx], products = productsOf(area.name);
      var type = TASK_TYPES[(d.seed + n) % TASK_TYPES.length], product = products[(d.seed + n) % products.length];
      list.push({
        title: type.verb + ' ' + type.object(product), area: area.name, state: state, reason: reason,
        who: STAFF[(d.seed + n * 3) % STAFF.length], due: addDays(TODAY, dueOffset)
      });
      n++;
    }
    d.blocked.forEach(function(c, i) { for (var k = 0; k < c; k++) make(i, 'Blocked', -(k + 1), BLOCK_REASONS[(d.seed + n) % BLOCK_REASONS.length]); });
    d.overdue.forEach(function(c, i) { for (var k = 0; k < c; k++) make(i, (d.seed + n) % 2 ? 'Open' : 'In progress', -(k + 2)); });
    for (var e = 0; e < soonCount; e++) make((d.seed + e * 4) % d.areas.length, e % 2 ? 'Open' : 'In progress', e + 1);
    // Tasks assigned from the Employees tab come first
    var mine = window.EmployeesData ? window.EmployeesData.assignedTasks(d.site).map(function(t) {
      return { title: t.title, area: t.area, state: t.state, reason: '', who: t.who, due: t.due };
    }) : [];
    list = mine.concat(list);
    return { shown: list.slice(0, TASK_LIMIT), total: list.length, list: list };
  }

  /** Products with a batch close to (or past) its expiry date, the same ones the Products tab lists under "Expiring". */
  function expiring(d) {
    var list = [];
    window.ProductsData.getInventory(d.site).forEach(function(r) {
      var worst = r.batches.filter(function(b) { return b.status !== 'Valid'; }).sort(function(x, y) { return x.days - y.days; })[0];
      if (!worst) return;
      list.push({
        product: r.sku.name + (r.sku.size ? ' · ' + r.sku.size : ''), area: r.sku.department, qty: worst.qty != null ? worst.qty : r.stock,
        days: worst.status === 'Expired' ? -1 : worst.days
      });
    });
    return list.sort(function(x, y) { return x.days - y.days; });
  }

  /* ---------- helpers ---------- */

  function hashOf(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function where(area, key) {
    var h = hashOf(area + key);
    return area + ' · Aisle ' + (1 + h % 9) + ' · Fixture ' + (1 + (h >>> 4) % 6);
  }

  function requestsOf(d) {
    return window.RequestsData ? window.RequestsData.products(d.site, d.program).concat(window.RequestsData.supplies(d.site, d.program)) : [];
  }

  var AREA_CODES = { SP: 11, RJ: 21, MG: 31, PR: 41, RS: 51, SC: 48, BA: 71, PE: 81, CE: 85, GO: 62, MT: 65, MS: 67, ES: 27, DF: 61, AM: 92, PA: 91, MA: 98, PB: 83, RN: 84, AL: 82, SE: 79, PI: 86, TO: 63, RO: 69, AC: 68, AP: 96, RR: 95 };

  /** A phone number for the store, always the same one: the area code of its state and a number made from its code. */
  function phone(site, program) {
    var n = parseInt(String(site.storeCode).replace(/\D/g, ''), 10) || 0, a = String(3000 + (n * 7919) % 6000), b = String(1000 + (n * 104729) % 9000);
    return '(' + (AREA_CODES[program.state] || 11) + ') ' + a + '-' + b;
  }

  /* ---------- sections ---------- */

  function kpiHtml(d, t) {
    var s = d.site, attention = t.list.filter(function(x) { return x.state === 'Blocked' || x.due < TODAY; });
    var blocked = attention.filter(function(x) { return x.state === 'Blocked'; }).length;
    var below = Math.max(0, s.lowStock - s.outOfStock);
    var cards = [
      { icon: 'circle-x', label: 'Out of stock', value: s.outOfStock, note: s.outOfStock ? 'can no longer be sold' : 'every product is available', tone: 'danger', focus: 'out' },
      { icon: 'box', label: 'Low stock', value: below, note: 'below the minimum, still on the shelf', tone: 'warning', focus: 'low' },
      { icon: 'clock', label: 'Tasks needing attention', value: attention.length, note: (attention.length - blocked) + ' overdue · ' + blocked + ' blocked', tone: 'danger', focus: 'tasks' },
      { icon: 'clipboard-list', label: 'Orders at risk', value: s.lateOrders, note: 'of ' + plural(s.pendingOrders, 'pending order'), tone: 'danger', focus: 'orders' },
      { icon: 'wrench', label: 'Equipment unavailable', value: s.equipmentDown, note: 'out of operation', tone: 'info', focus: 'equip' }
    ];
    return cards.map(function(c) {
      return '<button type="button" class="ov-kpi' + (c.value ? ' ov-kpi--' + c.tone : '') + (focus === c.focus ? ' ov-kpi--active' : '') + '" data-focus="' + c.focus + '" aria-pressed="' + (focus === c.focus) + '">' +
        '<span class="ov-kpi__icon">' + icon(c.icon, 18) + '</span>' +
        '<span class="ov-kpi__value">' + c.value + '</span>' +
        '<span class="ov-kpi__label">' + esc(c.label) + '</span>' +
        '<span class="ov-kpi__note">' + esc(c.note) + '</span>' +
      '</button>';
    }).join('');
  }

  /** One list, most urgent first. Every item says what happened, where, and offers the shortcut to solve it. */
  function attentionItems(d, t, list, expiringList) {
    var items = [], s = d.site;
    function add(score, tone, ic, title, meta, label, go, cat) { items.push({ score: score, tone: tone, icon: ic, title: title, meta: meta, label: label, go: go, cat: cat }); }

    d.oos.forEach(function(c, i) {
      var area = d.areas[i], products = productsOf(area.name);
      for (var k = 0; k < c; k++) {
        var name = products[(d.seed + i + k * 3) % products.length];
        add(100 - k, 'danger', 'circle-x', name + ' — out of stock', where(area.name, name), 'View stock', 'tab=equipment-list;quick=out', 'out');
      }
    });
    t.list.forEach(function(x) {
      if (x.state === 'Blocked') add(90, 'danger', 'circle-alert', x.title + ' — blocked', x.area + ' · ' + x.who + (x.reason ? ' · ' + x.reason.toLowerCase() : ''), 'Open area', 'area=' + x.area, 'tasks');
      else if (x.due < TODAY) add(72 - Math.round((TODAY - x.due) / 86400000), 'warning', 'clock', x.title + ' — overdue', x.area + ' · ' + x.who + ' · was due ' + fmt(x.due), 'Reassign', 'tab=employees', 'tasks');
    });
    list.forEach(function(o) {
      if (!o.late) return;
      var days = Math.round((TODAY - o.due) / 86400000);
      add(85, 'danger', 'inbox', o.supplier + ' ' + o.number + ' — ' + plural(days, 'day') + ' late', plural(o.items, 'item') + ' · ' + money(o.value) + ' · was due ' + fmt(o.due), 'Review order', 'tab=purchase-spend', 'orders');
    });
    expiringList.forEach(function(x) {
      if (x.days > 1) return;
      add(x.days <= 0 ? 95 : 78, x.days <= 0 ? 'danger' : 'warning', 'calendar-clock', x.product + ' — ' + expiryText(x.days).toLowerCase(), where(x.area, x.product) + ' · ' + plural(x.qty, 'unit'), 'Check shelf', 'tab=equipment-list;quick=expiring');
    });
    d.equip.forEach(function(c, i) {
      for (var k = 0; k < c; k++) add(80 - k, 'warning', 'wrench', EQUIPMENT[(d.seed + i + k) % EQUIPMENT.length] + ' — unavailable', d.areas[i].name, 'View equipment', 'tab=consumables', 'equip');
    });
    d.low.forEach(function(c, i) {
      var below = Math.max(0, c - d.oos[i]), products = productsOf(d.areas[i].name);
      for (var k = 0; k < below; k++) {
        var name = products[(d.seed + i * 3 + k * 2 + 1) % products.length];
        add(60 - k, 'warning', 'box', name + ' — below the minimum', where(d.areas[i].name, name), 'View stock', 'tab=equipment-list;quick=low', 'low');
      }
    });
    d.risk.forEach(function(c, i) {
      var products = productsOf(d.areas[i].name);
      for (var k = 0; k < c; k++) {
        var name = products[(d.seed + i * 2 + k) % products.length];
        add(70 - k, 'warning', 'triangle-alert', name + ' — may run out before the next restock', where(d.areas[i].name, name), 'Create request', 'tab=pending-pcns');
      }
    });
    requestsOf(d).filter(function(r) { return r.status === 'Pending'; }).forEach(function(r) {
      add(r.priority === 'Urgent' ? 66 : 40, r.priority === 'Urgent' ? 'warning' : 'muted', 'clipboard-list', r.id + ' ' + r.title + ' — waiting for approval', r.area + ' · requested by ' + r.requestedBy.name, 'Review request', 'tab=pending-pcns');
    });
    return items.sort(function(a, b) { return b.score - a.score; });
  }

  /** The items to show: the most urgent of each kind first (stock, tasks, orders, expiry, equipment, requests), then the next most urgent. */
  function featured(items) {
    var seen = {}, first = [], rest = [];
    items.forEach(function(x) { var k = x.cat || x.icon; if (!seen[k]) { seen[k] = true; first.push(x); } else rest.push(x); });
    return first.concat(rest).slice(0, ATTENTION_LIMIT).sort(function(a, b) { return b.score - a.score; });
  }

  function attentionHtml(items) {
    if (!items.length) return '<li class="ov-empty">' + (focus ? 'Nothing under “' + FOCUS[focus].label + '” right now.' : 'Nothing needs attention right now.') + '</li>';
    return featured(items).map(function(x) {
      return '<li class="ov-attn"><span class="ov-attn__icon ov-attn__icon--' + x.tone + '">' + icon(x.icon, 16) + '</span>' +
        '<div class="ov-row__body"><span class="ov-row__title">' + esc(x.title) + '</span><span class="ov-row__meta">' + esc(x.meta) + '</span></div>' +
        '<button type="button" class="ov-attn__action" data-go="' + esc(x.go) + '">' + esc(x.label) + icon('chevron-right', 14) + '</button></li>';
    }).join('');
  }

  function tasksHtml(d, t) {
    var overdue = t.list.filter(function(x) { return x.state !== 'Blocked' && x.due < TODAY; }).length;
    var blocked = t.list.filter(function(x) { return x.state === 'Blocked'; }).length;
    var stat = function(n, label, tone) { return '<div class="ov-stat' + (n && tone ? ' ov-stat--' + tone : '') + '"><strong>' + n + '</strong><span>' + label + '</span></div>'; };
    var staff = window.EmployeesData ? window.EmployeesData.getForStore(d.site, d.program) : [];
    var count = function(st) { return staff.filter(function(e) { return e.status === st; }).length; };
    var next = t.list.slice().sort(function(a, b) { return (a.state === 'Blocked' ? 0 : 1) - (b.state === 'Blocked' ? 0 : 1) || a.due - b.due; }).slice(0, TASK_LIMIT);
    var rows = next.map(function(x) {
      var late = x.due < TODAY, tone = x.state === 'Blocked' ? 'danger' : (x.state === 'In progress' ? 'info' : 'muted');
      return '<li class="ov-row"><div class="ov-row__body"><span class="ov-row__title">' + esc(x.title) + '</span>' +
        '<span class="ov-row__meta">' + esc(x.who + ' · ' + x.area + ' · ' + (late ? 'overdue since ' : 'due ') + when(x.due)) + '</span></div>' +
        '<span class="ov-badge ov-badge--' + tone + '">' + esc(x.state) + '</span></li>';
    }).join('') || '<li class="ov-empty">No open tasks.</li>';
    return '<li class="ov-stats">' + stat(t.list.length, 'open', '') + stat(overdue, 'overdue', 'warning') + stat(blocked, 'blocked', 'danger') + '</li>' + rows +
      (staff.length ? '<li class="ov-note">' + '<span>' + count('On shift') + ' on shift · ' + count('On break') + ' on break · ' + (count('Off today') + count('On leave')) + ' off</span>' +
        '<button type="button" class="ov-card__link" data-go="tab=employees">View team</button></li>' : '');
  }

  /** The orders on their way plus other scheduled deliveries (so a store always shows at least two upcoming ones). */
  function upcoming(d, list) {
    var next = list.filter(function(o) { return !o.late; }), suppliers = window.ProgramsData.suppliers, used = {};
    list.forEach(function(o) { used[o.supplier] = true; });
    for (var k = 0; next.length < 2 && k < suppliers.length; k++) {
      var supplier = suppliers[(d.seed + k * 2 + 1) % suppliers.length];
      if (used[supplier]) continue;
      used[supplier] = true;
      var items = 6 + (d.seed + k * 5) % 16;
      next.push({ supplier: supplier, number: 'PO-' + (1000 + d.seed * 7 + 20 + k), items: items, value: items * (90 + (d.seed + k * 11) % 55), late: false, due: addDays(TODAY, 2 + (d.seed + k) % 4) });
    }
    return next.sort(function(a, b) { return a.due - b.due; });
  }

  function deliveriesHtml(next) {
    if (!next.length) return '<li class="ov-empty">No deliveries scheduled.</li>';
    return next.map(function(o) {
      var today = o.due.getTime() === TODAY.getTime();
      return '<li class="ov-row"><div class="ov-row__body"><span class="ov-row__title">' + esc(o.supplier) + '</span>' +
        '<span class="ov-row__meta">' + plural(o.items, 'item') + ' · ' + o.number + ' · ' + money(o.value) + '</span></div>' +
        '<span class="ov-badge ov-badge--' + (today ? 'info' : 'muted') + '">' + when(o.due) + '</span></li>';
    }).join('');
  }

  function stockAlertsHtml(d) {
    var missing = d.areas.map(function(a, i) { return { name: a.name, oos: d.oos[i], low: Math.max(0, d.low[i] - d.oos[i]) }; })
      .filter(function(r) { return r.oos + r.low > 0; }).sort(function(a, b) { return (b.oos * 3 + b.low) - (a.oos * 3 + a.low); }).slice(0, 4);
    var pending = requestsOf(d).filter(function(r) { return r.status === 'Pending'; }).length;
    // The products themselves: out of stock first, then the ones furthest below their minimum
    var inv = window.ProductsData.getInventory(d.site), ratio = function(a, b) { return (a.stock / a.min) - (b.stock / b.min); };
    var short = inv.filter(function(r) { return r.status !== 'In stock'; }).sort(ratio);
    // A store with few products below the minimum also shows the ones that are about to be: in stock, but under 1.5 times the minimum
    short = short.concat(inv.filter(function(r) { return r.status === 'In stock' && r.stock < r.min * 1.5; }).sort(ratio)).slice(0, STOCK_PRODUCTS_LIMIT);
    var productRows = short.length ? '<li class="ov-subtitle">Products to reorder or watch</li>' + short.map(function(r) {
      var name = r.sku.name + (r.sku.variant && r.sku.variant !== 'Classic' ? ' ' + r.sku.variant : '') + ' · ' + r.sku.brand;
      return '<li class="ov-row"><button type="button" class="ov-row__body ov-row__link" data-go="tab=equipment-list"><span class="ov-row__title">' + esc(name) + '</span>' +
        '<span class="ov-row__meta">' + esc(r.sku.department) + ' · ' + r.stock + ' in stock · minimum ' + r.min + '</span></button>' +
        '<span class="ov-badge ov-badge--' + (r.stock === 0 ? 'danger' : (r.status === 'Low stock' ? 'warning' : 'muted')) + '">' + (r.stock === 0 ? 'Out of stock' : (r.status === 'Low stock' ? 'Low stock' : 'Near minimum')) + '</span></li>';
    }).join('') : '';
    var out = missing.length ? missing.map(function(r) {
      return '<li class="ov-row"><button type="button" class="ov-row__body ov-row__link" data-go="area=' + esc(r.name) + '"><span class="ov-row__title">' + esc(r.name) + '</span>' +
        '<span class="ov-row__meta">' + r.oos + ' out of stock · ' + r.low + ' below minimum</span></button><span class="ov-row__go">' + icon('chevron-right', 16) + '</span></li>';
    }).join('') : '<li class="ov-empty">No product is missing.</li>';
    return out + productRows + '<li class="ov-note">' + icon('clipboard-list', 14) + '<span>' + plural(pending, 'request') + ' waiting for approval</span><button type="button" class="ov-card__link" data-go="tab=pending-pcns">Review requests</button></li>';
  }

  function expiryText(days) {
    return days < 0 ? 'Expired' : (days === 0 ? 'Expires today' : (days === 1 ? 'Expires tomorrow' : 'In ' + days + ' days'));
  }

  function expiryAlertsHtml(expiringList) {
    if (!expiringList.length) return '<li class="ov-empty">Nothing close to its expiry date.</li>';
    return expiringList.slice(0, EXPIRY_LIMIT).map(function(x) {
      return '<li class="ov-row"><div class="ov-row__body"><span class="ov-row__title">' + esc(x.product) + '</span><span class="ov-row__meta">' + esc(x.area) + ' · ' + plural(x.qty, 'unit') + '</span></div>' +
        '<span class="ov-badge ov-badge--' + (x.days <= 1 ? 'danger' : 'warning') + '">' + expiryText(x.days) + '</span></li>';
    }).join('');
  }

  function pct(n) { return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1).replace('.', ',') + '%'; }

  function salesHtml(d) {
    var fd = window.FinanceData, def = PERIODS.filter(function(x) { return x.key === period; })[0];
    if (!fd) return '';
    var to = fd.today, from = fd.addDays(to, -(def.days - 1)), prevTo = fd.addDays(from, -1), prevFrom = fd.addDays(prevTo, -(def.days - 1));
    var cur = fd.salesBetween(d.site, from, to).total, prev = fd.salesBetween(d.site, prevFrom, prevTo).total;
    var delta = prev.net ? (cur.net - prev.net) / prev.net * 100 : 0, ticket = cur.transactions ? cur.net / cur.transactions : 0;
    var money2 = function(n) { return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var tile = function(label, value, note, tone) { return '<div class="ov-sale"><span class="ov-sale__label">' + label + '</span><strong class="ov-sale__value' + (tone ? ' ov-sale__value--' + tone : '') + '">' + value + '</strong><span class="ov-sale__note">' + note + '</span></div>'; };
    return tile('Net sales · ' + def.label.toLowerCase(), money2(cur.net), 'after discounts and returns') +
      tile('Compared with ' + def.compare, (delta >= 0 ? icon('arrow-up-right', 18) : icon('arrow-down-left', 18)) + ' ' + pct(delta), money2(prev.net) + ' before', delta >= 0 ? 'up' : 'down') +
      tile('Transactions', cur.transactions.toLocaleString('pt-BR'), 'receipts issued') +
      tile('Average ticket', money2(ticket), 'net sales per transaction');
  }

  function card(title, subtitle, listHtml, action, id) {
    return '<section class="ov-card"' + (id ? ' id="' + id + '"' : '') + '><header class="ov-card__header"><div><h3 class="ov-card__title">' + title + '</h3>' +
      '<p class="ov-card__subtitle">' + subtitle + '</p></div>' + (action || '') + '</header><ul class="ov-list">' + listHtml + '</ul></section>';
  }

  function render() {
    var el = document.getElementById('store-overview');
    if (!el) return;
    var d = storeData(), p = d.program, s = d.site, t = tasks(d), list = orders(d), exp = expiring(d), all = attentionItems(d, t, list, exp);
    var items = focus ? all.filter(function(x) { return x.cat === focus; }) : all;
    var tone = s.status === 'Delayed' ? 'danger' : (s.status === 'At risk' ? 'warning' : 'success');
    var shown = Math.min(items.length, ATTENTION_LIMIT);
    el.innerHTML =
      '<div class="ov-header"><div>' +
        '<p class="ov-scope">Data as of ' + TODAY.getDate() + ' ' + MONTH_NAMES[TODAY.getMonth()] + ' ' + TODAY.getFullYear() + '. Stock, tasks and orders show the situation on that day. Only the sales summary follows the selected period.</p>' +
      '</div><div class="ov-header__side">' +
        '<label class="ov-period"><span>Sales period</span><select class="form-select" id="ov-period">' +
          PERIODS.map(function(x) { return '<option value="' + x.key + '"' + (x.key === period ? ' selected' : '') + '>' + x.label + '</option>'; }).join('') +
        '</select></label></div></div>' +
      '<div class="ov-kpis">' + kpiHtml(d, t) + '</div>' +
      '<div class="ov-grid ov-grid--main">' +
        card('Needs attention', (focus ? FOCUS[focus].label + ' · ' : '') + 'Showing ' + shown + ' of ' + items.length + ' · most urgent first', attentionHtml(items),
          focus ? '<span class="ov-card__actions"><button type="button" class="ov-card__link" data-go="' + FOCUS[focus].go + '">' + FOCUS[focus].open + '</button><button type="button" class="ov-card__link" data-focus-clear>Show all</button></span>' : '') +
        '<div class="ov-stack">' +
          card('Tasks today', 'Blocked and overdue first', tasksHtml(d, t), '', 'ov-tasks') +
          card('Upcoming deliveries', 'Next suppliers to deliver' + (s.lateOrders ? ' · ' + s.lateOrders + ' order late' : ''), deliveriesHtml(upcoming(d, list)),
            '<button type="button" class="ov-card__link" data-go="tab=purchase-spend">Purchase Spend</button>') +
        '</div>' +
      '</div>' +
      '<div class="ov-grid ov-grid--2">' +
        card('Stock alerts', 'Areas with the most missing products', stockAlertsHtml(d),
          '<button type="button" class="ov-card__link" data-go="tab=equipment-list">Products</button>') +
        '<div class="ov-stack">' +
          card('Expiry alerts', 'Perishables close to their expiry date', expiryAlertsHtml(exp),
            '<button type="button" class="ov-card__link" data-go="tab=equipment-list;quick=expiring">View expiring</button>') +
          '<section class="ov-card ov-card--sales"><header class="ov-card__header"><div><h3 class="ov-card__title">Sales</h3>' +
            '<p class="ov-card__subtitle">Summary only · the full breakdown is in Revenue</p></div>' +
            '<button type="button" class="ov-card__link" data-go="tab=revenue">Open Revenue</button></header>' +
            '<div class="ov-sales" id="ov-sales">' + salesHtml(d) + '</div></section>' +
        '</div>' +
      '</div>';
  }

  /** Opens the Areas tab filtered to one area. */
  function openArea(name) {
    var tab = document.querySelector('.tabs__tab[data-tab="process-flow"]');
    if (tab) tab.click();
    if (window.AreasTree) window.AreasTree.focusArea(name);
  }

  /** A shortcut written as "tab=products;quick=out", "area=Dairy" or "scroll=card-id". */
  function go(spec) {
    var o = {};
    spec.split(';').forEach(function(pair) { var kv = pair.split('='); o[kv[0]] = kv.slice(1).join('='); });
    if (o.scroll) { var target = document.getElementById(o.scroll); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (o.area) { openArea(o.area); return; }
    if ((o.tab === 'revenue' || o.tab === 'purchase-spend') && window.FinanceView) { window.FinanceView.show(o.tab); return; }
    var tab = document.querySelector('.tabs__tab[data-tab="' + o.tab + '"]');
    if (tab) tab.click();
    if (o.quick && window.ProductsTable && window.ProductsTable.setQuick) window.ProductsTable.setQuick(o.quick);
  }

  window.StoreOverview = {
    init: function() {
      render();
      // Dropdowns update the current city / store first (their listeners were attached earlier)
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', render);
      });
      var root = document.getElementById('store-overview');
      if (!root) return;
      root.addEventListener('click', function(e) {
        var pick = e.target.closest('[data-focus]');
        if (pick) { var f = pick.getAttribute('data-focus'); focus = focus === f ? '' : f; render(); return; }
        if (e.target.closest('[data-focus-clear]')) { focus = ''; render(); return; }
        var link = e.target.closest('[data-go]');
        if (link) go(link.getAttribute('data-go'));
      });
      root.addEventListener('change', function(e) {
        if (e.target.id !== 'ov-period') return;
        period = e.target.value;
        var sales = document.getElementById('ov-sales');
        if (sales) sales.innerHTML = salesHtml(storeData());
      });
    },
    render: render,
    /** The purchase orders still on their way to a store (the ones listed on the Overview), for the Purchase Spend tab. */
    ordersFor: function(site) {
      return orders({ site: site, seed: parseInt(String(site.storeCode).slice(3), 10) || 0 });
    }
  };
})();
