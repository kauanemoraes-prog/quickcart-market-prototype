/**
 * Finance Data
 * Sales (Revenue tab) and purchases from suppliers (Purchase Spend tab) of a store, generated from the store record so a
 * store always shows the same figures. Sales exist for every day up to the reference date; there are far too many
 * receipts to list, so sales are generated per day and sales channel and the tabs only show totals and breakdowns.
 */

(function() {
  'use strict';

  var TODAY = new Date(2026, 11, 10);
  var DAY = 86400000;
  var FIRST_DAY = new Date(2025, 0, 1);

  var CHANNELS = [
    { name: 'In-store checkout', share: 0.7, ticket: 84, returns: 0.011 },
    { name: 'Self-checkout', share: 0.16, ticket: 61, returns: 0.007 },
    { name: 'Click & collect', share: 0.05, ticket: 138, returns: 0.014 },
    { name: 'Delivery app', share: 0.09, ticket: 112, returns: 0.026 }
  ];
  var WEEKDAY = [1.05, 0.82, 0.86, 0.9, 0.95, 1.2, 1.35];   // Sunday first

  // Which areas each supplier delivers to, and the tax rate on what they invoice
  var SUPPLIER_AREAS = {
    'Good Harvest Farm': ['Butcher', 'Fish Counter', 'Chilled & Frozen'],
    'Blue Ridge Dairy': ['Dairy'],
    'Atlantic Distribution': ['Grocery', 'Cleaning', 'Health & Beauty', 'Pet Shop', 'Checkout'],
    'Green Valley Produce': ['Produce'],
    'Coastal Beverages': ['Beverages'],
    'Trigal Industrial Bakery': ['Bakery']
  };
  var INVOICE_CHANCE = { 'Good Harvest Farm': 20, 'Blue Ridge Dairy': 22, 'Atlantic Distribution': 18, 'Green Valley Produce': 30, 'Coastal Beverages': 14, 'Trigal Industrial Bakery': 28 };
  var TAX = { 'Produce': 0, 'Fish Counter': 0, 'Dairy': 0.07, 'Bakery': 0.07 };
  var TERMS = { 'Green Valley Produce': 7, 'Blue Ridge Dairy': 14, 'Trigal Industrial Bakery': 14, 'Good Harvest Farm': 21, 'Coastal Beverages': 28, 'Atlantic Distribution': 28 };

  var salesCache = {}, purchaseCache = {};

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function key(date) { return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(); }

  function addDays(date, n) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n); }

  function round2(n) { return Math.round(n * 100) / 100; }

  /* ---------- sales ---------- */

  /** One record per sales channel for a day: transactions, gross sales, discounts and returns. */
  function salesOfDay(site, date) {
    var k = site.storeCode + '|' + key(date);
    if (salesCache[k]) return salesCache[k];
    var base = 22000 + hash(site.storeCode) % 26000, wd = WEEKDAY[date.getDay()];
    var out = CHANNELS.map(function(ch) {
      var h = hash(k + ch.name), noise = 0.9 + (h % 200) / 1000, tNoise = 0.92 + ((h >>> 8) % 160) / 1000;
      var gross = round2(base * wd * ch.share * noise);
      var tx = Math.max(1, Math.round(gross / (ch.ticket * tNoise)));
      var discounts = round2(gross * (0.04 + ((h >>> 12) % 40) / 1000 + (date.getDay() === 3 ? 0.012 : 0)));
      var returns = round2(gross * (ch.returns * (0.6 + ((h >>> 16) % 80) / 100)));
      return { channel: ch.name, transactions: tx, gross: gross, discounts: discounts, returns: returns, net: round2(gross - discounts - returns) };
    });
    salesCache[k] = out;
    return out;
  }

  function emptyTotals() { return { transactions: 0, gross: 0, discounts: 0, returns: 0, net: 0 }; }

  function add(t, r) {
    t.transactions += r.transactions;
    t.gross = round2(t.gross + r.gross);
    t.discounts = round2(t.discounts + r.discounts);
    t.returns = round2(t.returns + r.returns);
    t.net = round2(t.net + r.net);
    return t;
  }

  /** Sales between two dates (inclusive): totals and the breakdown by channel. */
  function salesBetween(site, from, to) {
    var total = emptyTotals(), channels = {};
    CHANNELS.forEach(function(c) { channels[c.name] = emptyTotals(); });
    for (var d = from; d <= to; d = addDays(d, 1)) {
      salesOfDay(site, d).forEach(function(r) { add(total, r); add(channels[r.channel], r); });
    }
    return { total: total, channels: CHANNELS.map(function(c) { return { channel: c.name, t: channels[c.name] }; }) };
  }

  /* ---------- purchases ---------- */

  function productsFor(areas) {
    return window.ProductsData.getCatalog().filter(function(p) { return areas.indexOf(p.department) !== -1; });
  }

  function buildInvoice(site, supplier, date, n) {
    // A different salt than the one that decided there is an invoice that day, so the two do not correlate
    var h = hash(site.storeCode + supplier + key(date) + '#invoice');
    var pool = productsFor(SUPPLIER_AREAS[supplier]), count = Math.min(pool.length, 4 + h % 7), lines = [], subtotal = 0, tax = 0;
    for (var i = 0; i < count; i++) {
      var p = pool[(h >>> 3 + i * 7) % pool.length];
      if (lines.some(function(l) { return l.sku === p.sku; })) continue;
      var perCase = p.perCase > 1 ? p.perCase : 0, qty = perCase ? perCase * (7 + (h >>> (5 + i)) % 16) : 140 + (h >>> (5 + i)) % 300;
      var unitCost = round2(p.basePrice * (0.62 + ((h >>> (9 + i)) % 10) / 100)), rate = TAX[p.department] != null ? TAX[p.department] : 0.12;
      var amount = round2(qty * unitCost), lineTax = round2(amount * rate);
      lines.push({ product: p.name, brand: p.brand, variant: p.variant, size: p.size, sku: p.sku, qty: qty, unit: p.perCase === 0 ? 'kg' : 'units', unitCost: unitCost, rate: rate, amount: amount, tax: lineTax });
      subtotal = round2(subtotal + amount);
      tax = round2(tax + lineTax);
    }
    var due = addDays(date, TERMS[supplier] + (h % 3));
    // Old invoices are paid; only recent ones can still be overdue
    var paid = due < TODAY ? (h % 100 < 86 || TODAY - due > 60 * DAY) : (h % 100 < 22 && TODAY - date > 4 * DAY);
    var status = paid ? 'Paid' : (due < TODAY ? 'Overdue' : 'Awaiting payment');
    return {
      id: 'INV' + n, date: date, supplier: supplier, number: 'NF-' + (100000 + h % 900000), po: 'PO-' + (5000 + n), lines: lines, subtotal: subtotal, tax: tax,
      total: round2(subtotal + tax), due: due, status: status, products: lines.length, units: lines.reduce(function(a, l) { return a + l.qty; }, 0)
    };
  }

  function purchasesOf(site) {
    if (purchaseCache[site.storeCode]) return purchaseCache[site.storeCode];
    var list = [], n = 0, suppliers = Object.keys(SUPPLIER_AREAS);
    for (var d = FIRST_DAY; d <= TODAY; d = addDays(d, 1)) {
      suppliers.forEach(function(s) {
        if (hash(site.storeCode + s + key(d)) % 100 < INVOICE_CHANCE[s]) list.push(buildInvoice(site, s, d, ++n));
      });
    }
    purchaseCache[site.storeCode] = list;
    return list;
  }

  window.FinanceData = {
    today: TODAY,
    firstDay: FIRST_DAY,
    channels: CHANNELS.map(function(c) { return c.name; }),
    addDays: addDays,
    salesOfDay: salesOfDay,
    salesBetween: salesBetween,
    invoicesBetween: function(site, from, to) {
      return purchasesOf(site).filter(function(i) { return i.date >= from && i.date <= to; });
    },
    allInvoices: purchasesOf
  };
})();
