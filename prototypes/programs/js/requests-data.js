/**
 * Requests Data
 * Purchase requests of a store, in two lists:
 *   products            SKUs that need to be bought (low stock, out of stock, a promotion coming);
 *   equipment/supplies  equipment and consumables that are missing, mostly the ones needed to fix an issue of an area.
 * Each request knows who made it, what it costs, why it exists and its status history (Requested, Approved or Rejected,
 * Ordered, Delivered). The requests are generated from the store, so a store always has the same ones; decisions made in
 * the Requests tab are kept for the session.
 */

(function() {
  'use strict';

  var TODAY = new Date(2026, 11, 10);
  var DAY = 86400000;
  var APPROVER = 'Kauane Moraes';

  var ITEM_COST = {
    'Multimeter': 180, 'Refrigerant gauge set': 640, 'Step ladder': 320, 'Toolbox set': 450, 'Pallet jack': 1950, 'Floor scrubber': 4800, 'Wet vacuum': 780,
    'Label printer': 1350, 'Cold room thermometer': 120, 'Hand truck': 560, 'Drain snake': 210, 'Door gasket': 85, 'Refrigerant R404A': 380, 'Cable ties': 18,
    'Absorbent pads': 35, 'LED light tube': 24, 'Thermal receipt paper': 7, 'Price labels': 12, 'Disinfectant wipes': 22, 'Lubricant spray': 28, 'Drain cleaner': 19,
    'Hydraulic oil': 56, 'Replacement blade': 140, 'Battery pack': 340, 'Pipe sealant tape': 9, 'Plastic bags': 14, 'Meat trays': 26
  };
  var ITEM_VENDOR = {
    'Refrigerant gauge set': 'CoolTech Refrigeration Parts', 'Refrigerant R404A': 'CoolTech Refrigeration Parts', 'Door gasket': 'CoolTech Refrigeration Parts', 'Cold room thermometer': 'CoolTech Refrigeration Parts',
    'Floor scrubber': 'CleanPro Supplies', 'Wet vacuum': 'CleanPro Supplies', 'Absorbent pads': 'CleanPro Supplies', 'Disinfectant wipes': 'CleanPro Supplies', 'Drain cleaner': 'CleanPro Supplies',
    'Thermal receipt paper': 'Atlantic Distribution', 'Price labels': 'Atlantic Distribution', 'Plastic bags': 'Atlantic Distribution', 'Meat trays': 'Atlantic Distribution', 'Label printer': 'Atlantic Distribution'
  };
  var EXTRA_SUPPLIES = [
    { name: 'Thermal receipt paper', type: 'Consumable', area: 'Checkout', qty: 40, reason: 'Regular restock' },
    { name: 'Price labels', type: 'Consumable', area: 'Grocery', qty: 30, reason: 'Regular restock' },
    { name: 'Plastic bags', type: 'Consumable', area: 'Checkout', qty: 60, reason: 'Below the safety level' },
    { name: 'Meat trays', type: 'Consumable', area: 'Butcher', qty: 50, reason: 'Below the safety level' },
    { name: 'Hand truck', type: 'Equipment', area: 'Receiving & Stock Room', qty: 1, reason: 'Replacement for a worn-out one' }
  ];
  var WEIGHTS = [['Pending', 45], ['Approved', 12], ['Ordered', 15], ['Delivered', 18], ['Rejected', 10]];
  var REJECT_NOTES = ['Enough stock in the backroom', 'Over the monthly budget', 'Duplicate of another request', 'Wait for the next promotion cycle'];

  var cache = {}, decisions = {};

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }

  function round2(n) { return Math.round(n * 100) / 100; }

  function pickStatus(h, urgent) {
    var roll = h % 100;
    if (urgent && roll < 60) return 'Pending';
    var acc = 0;
    for (var i = 0; i < WEIGHTS.length; i++) { acc += WEIGHTS[i][1]; if (roll < acc) return WEIGHTS[i][0]; }
    return 'Pending';
  }

  /** The person who made the request: someone who works in the area, or the replenishment system. */
  function requesterFor(staff, area, h, auto) {
    if (auto) return { name: 'Replenishment system', role: 'Automatic suggestion' };
    var pool = staff.filter(function(e) { return e.role !== 'Store Manager' && e.areas.some(function(a) { return a.area === area; }); });
    if (!pool.length) pool = staff.filter(function(e) { return e.role === 'Area Lead'; });
    var e = pool[h % pool.length];
    return { name: e.name, role: e.role };
  }

  /** Requested ... Delivered, according to the final status and the dates. */
  function historyFor(r, h, site) {
    var ev = [{ status: 'Requested', by: r.requestedBy.name, role: r.requestedBy.role, date: r.requestedOn, note: r.reason }];
    if (r.status === 'Pending') return ev;
    var decided = addDays(r.requestedOn, 1 + h % 2);
    ev.push({ status: r.status === 'Rejected' ? 'Rejected' : 'Approved', by: site.lead, role: 'Store Manager', date: decided, note: r.status === 'Rejected' ? REJECT_NOTES[h % REJECT_NOTES.length] : '' });
    if (r.status === 'Approved' || r.status === 'Rejected') return ev;
    var ordered = addDays(decided, 1);
    ev.push({ status: 'Ordered', by: 'Purchasing', role: 'Automatic', date: ordered, note: 'Sent to ' + r.supplier });
    if (r.status === 'Ordered') return ev;
    ev.push({ status: 'Delivered', by: 'Receiving', role: 'Receiving & Stock Room', date: addDays(ordered, 2 + h % 4), note: 'Received and checked against the order' });
    return ev;
  }

  var AGE = { Pending: [0, 9], Approved: [1, 6], Ordered: [4, 12], Delivered: [9, 45], Rejected: [2, 30] };

  function finish(r, h, site) {
    var span = AGE[r.status];
    r.requestedOn = addDays(TODAY, -(span[0] + (h >>> 5) % (span[1] - span[0] + 1)));
    r.neededBy = addDays(r.requestedOn, r.priority === 'Urgent' ? 2 : (r.priority === 'High' ? 5 : 10));
    r.total = round2(r.qty * r.unitCost);
    r.history = historyFor(r, h, site);
    return r;
  }

  function buildProducts(site, program) {
    var inv = window.ProductsData.getInventory(site), staff = window.EmployeesData.getForStore(site, program), out = [], n = 0, code = site.storeCode;
    var needs = inv.filter(function(r) { return r.status !== 'In stock'; }).slice(0, 14);
    // Even a store with no stock problem has a few requests (promotions, seasonal demand)
    var extra = inv.filter(function(r) { return r.status === 'In stock'; })
      .sort(function(x, y) { return hash(code + x.sku.sku + 'x') - hash(code + y.sku.sku + 'x'); }).slice(0, Math.max(3, Math.min(6, 9 - needs.length)));
    needs.concat(extra).forEach(function(r) {
      var s = r.sku, h = hash(code + s.sku + 'req'), urgent = r.status === 'Out of stock', healthy = r.status === 'In stock';
      var qty = healthy ? (s.perCase > 1 ? s.perCase * 2 : 40) : (r.suggested || r.reorderQty);
      var reason = r.status === 'Out of stock' ? 'Out of stock' : (r.status === 'Low stock' ? 'Below minimum stock (' + r.stock + ' of ' + r.min + ')' : (h % 2 ? 'Promotion planned' : 'Seasonal demand'));
      var req = {
        id: 'REQ-P-' + (1000 + hash(code) % 800 + (++n)), kind: 'product', title: s.name, detail: (s.brand === 'Loose' ? '' : s.brand + ' · ') + s.variant + ' · ' + s.size,
        sku: s.sku, area: s.department, supplier: r.supplier, qty: qty, unit: r.unit, unitCost: round2(s.basePrice * 0.68), stockNow: r.stock, stockMin: r.min,
        reason: reason, priority: urgent ? 'Urgent' : (healthy ? 'Normal' : 'High'), status: pickStatus(h, urgent), packLabel: s.packLabel,
        requestedBy: requesterFor(staff, s.department, h, h % 100 < (urgent ? 45 : 20))
      };
      out.push(finish(req, h, site));
    });
    return out;
  }

  function buildSupplies(site, program, areaNames) {
    var staff = window.EmployeesData.getForStore(site, program), out = [], n = 0, code = site.storeCode;
    var add = function(item) {
      var h = hash(code + item.name + item.area + 'sup'), urgent = item.priority === 'Urgent';
      var cost = ITEM_COST[item.name] || 50;
      var req = {
        id: 'REQ-E-' + (2000 + hash(code) % 800 + (++n)), kind: 'supply', title: item.name, detail: item.type, type: item.type, area: item.area,
        related: item.related || '', supplier: ITEM_VENDOR[item.name] || 'Prime Tools Supply', qty: item.qty, unit: 'units', unitCost: cost, stockNow: item.have, stockMin: null,
        reason: item.reason, priority: item.priority || 'Normal', status: pickStatus(h, urgent),
        requestedBy: requesterFor(staff, item.area, h, false)
      };
      out.push(finish(req, h, site));
    };
    areaNames.forEach(function(area) {
      window.AreasData.getIssues(site, area, areaNames).forEach(function(issue) {
        if (window.AreasData.statusOf(issue) === 'Resolved') return;
        issue.resources.forEach(function(res) {
          if (res.availability === 'Available' || res.availability === 'Used') return;
          var missing = res.type === 'Equipment' ? 1 : Math.max(1, res.qty - res.have);
          add({ name: res.name, type: res.type, area: area, qty: missing, have: res.have, reason: res.availability === 'Missing' ? 'Missing, needed to fix an issue' : (res.type === 'Equipment' ? 'To be bought instead of borrowed' : 'Short, needed to fix an issue'),
            related: issue.title, priority: issue.priority });
        });
      });
    });
    EXTRA_SUPPLIES.forEach(function(e, i) { if (hash(code + e.name) % 100 < 70) add({ name: e.name, type: e.type, area: e.area, qty: e.qty, have: hash(code + e.name + 'h') % 6, reason: e.reason, related: '', priority: 'Normal' }); });
    return out;
  }

  function overlay(site, list) {
    var d = decisions[site.storeCode] || {};
    return list.map(function(r) {
      var x = d[r.id];
      if (!x) return r;
      var copy = {};
      Object.keys(r).forEach(function(k) { copy[k] = r[k]; });
      copy.status = x.status;
      copy.history = r.history.concat(x.events);
      return copy;
    });
  }

  function lists(site, program) {
    if (!cache[site.storeCode]) {
      var names = window.DetailData.getLines().map(function(l) { return l.name; });
      cache[site.storeCode] = { products: buildProducts(site, program), supplies: buildSupplies(site, program, names) };
    }
    return cache[site.storeCode];
  }

  window.RequestsData = {
    today: TODAY,
    approver: APPROVER,
    products: function(site, program) { return overlay(site, lists(site, program).products); },
    supplies: function(site, program) { return overlay(site, lists(site, program).supplies); },
    /** The pending purchase request for a product of the store, if there is one. */
    pendingFor: function(site, program, sku) {
      return this.products(site, program).filter(function(r) { return r.sku === sku && r.status === 'Pending'; })[0] || null;
    },
    /** The pending request of an equipment or consumable (asked from the Equipment/Consumables tab or created by an issue), if any. */
    pendingForSupply: function(site, program, name, area) {
      return this.supplies(site, program).filter(function(r) { return r.title === name && r.area === area && r.status === 'Pending'; })[0] || null;
    },
    /** A purchase order asked from the Equipment/Consumables tab: it enters the Requests tab (Equipment/Consumables) as a pending request. */
    createSupply: function(site, program, row, requester) {
      var l = lists(site, program), it = row.item;
      var maxId = l.supplies.reduce(function(m, r) { return Math.max(m, parseInt(String(r.id).replace(/\D+/g, ''), 10) || 0); }, 0);
      var out = row.status === 'Out of stock' || row.status === 'Not in store', low = row.status === 'Low stock';
      var req = {
        id: 'REQ-E-' + (maxId + 1), kind: 'supply', title: it.name, detail: it.type, type: it.type, area: it.area, related: '',
        supplier: row.supplier, qty: row.reorderQty || it.min || 1, unit: 'units', unitCost: it.cost, stockNow: row.qty, stockMin: it.min,
        reason: out ? 'Out of stock' : (low ? 'Below minimum quantity (' + row.qty + ' of ' + it.min + ')' : 'Requested from the Equipment/Consumables tab'),
        priority: out ? 'Urgent' : (low ? 'High' : 'Normal'), status: 'Pending', requestedBy: requester || { name: 'You', role: 'Administrator' }
      };
      req.requestedOn = TODAY;
      req.neededBy = addDays(TODAY, req.priority === 'Urgent' ? 2 : (req.priority === 'High' ? 5 : 10));
      req.total = round2(req.qty * req.unitCost);
      req.history = [{ status: 'Requested', by: req.requestedBy.name, role: req.requestedBy.role, date: TODAY, note: req.reason }];
      l.supplies.unshift(req);
      return req;
    },
    /** A purchase order asked from the Products tab: it enters the Requests tab as a pending request, from the person using the prototype. */
    createPurchase: function(site, program, row, requester) {
      var l = lists(site, program), s = row.sku, h = hash(site.storeCode + s.sku + 'new' + l.products.length);
      var qty = row.suggested || row.reorderQty || (s.perCase > 1 ? s.perCase * 2 : 40);
      var maxId = l.products.reduce(function(m, r) { return Math.max(m, parseInt(String(r.id).replace(/\D+/g, ''), 10) || 0); }, 0);
      var req = {
        id: 'REQ-P-' + (maxId + 1), kind: 'product', title: s.name, detail: (s.brand === 'Loose' ? '' : s.brand + ' · ') + s.variant + ' · ' + s.size,
        sku: s.sku, area: s.department, supplier: row.supplier, qty: qty, unit: row.unit, unitCost: round2(s.basePrice * 0.68), stockNow: row.stock, stockMin: row.min,
        reason: row.status === 'Out of stock' ? 'Out of stock' : (row.status === 'Low stock' ? 'Below minimum stock (' + row.stock + ' of ' + row.min + ')' : 'Requested from the Products tab'),
        priority: row.status === 'Out of stock' ? 'Urgent' : (row.status === 'Low stock' ? 'High' : 'Normal'), status: 'Pending', packLabel: s.packLabel,
        requestedBy: requester || { name: 'You', role: 'Administrator' }
      };
      req.requestedOn = TODAY;
      req.neededBy = addDays(TODAY, req.priority === 'Urgent' ? 2 : (req.priority === 'High' ? 5 : 10));
      req.total = round2(req.qty * req.unitCost);
      req.history = [{ status: 'Requested', by: req.requestedBy.name, role: req.requestedBy.role, date: TODAY, note: req.reason }];
      l.products.unshift(req);
      return req;
    },
    /** Accept or reject a pending request. Returns false when it is not pending any more. */
    decide: function(site, program, id, status, note) {
      var all = this.products(site, program).concat(this.supplies(site, program));
      var r = all.filter(function(x) { return x.id === id; })[0];
      if (!r || r.status !== 'Pending') return false;
      var d = decisions[site.storeCode] || (decisions[site.storeCode] = {});
      d[id] = { status: status, events: [{ status: status === 'Rejected' ? 'Rejected' : 'Approved', by: APPROVER, role: 'Store Manager', date: TODAY, note: note || '' }] };
      return true;
    }
  };
})();
