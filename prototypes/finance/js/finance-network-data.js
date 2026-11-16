/**
 * Network Finance Data
 * Finances of the whole network, built on the data of one store (programs/js/finance-data.js: sales and supplier invoices):
 *   Net Sales and Purchase Spend  come from FinanceData, store by store;
 *   Operating Expenses            utilities, rent, cleaning, security, systems, maintenance and logistics, generated per store;
 *   Labor Cost                    hours and cost per department, generated per store and month (individual pay does not exist here);
 *   Budget                        a monthly budget for some stores only (a store without a budget has no variance).
 * Everything is generated from the store code, so a store always has the same figures and the totals match between cards,
 * tables, charts and reports. A sale is a registered sale, not cash received; an invoice or expense is a record with a payment
 * status: nothing is counted as paid unless its status says so.
 */

(function() {
  'use strict';

  var FD = window.FinanceData, TODAY = FD.today, FIRST = FD.firstDay, DAY = 86400000;
  var DEPARTMENTS = ['Produce', 'Grocery', 'Bakery', 'Butcher', 'Dairy', 'Beverages', 'Cleaning', 'Checkout', 'Receiving & Stock Room', 'Chilled & Frozen', 'Fish Counter', 'Health & Beauty', 'Pet Shop'];
  var STAFF = { 'Checkout': [9, 16], 'Grocery': [6, 10], 'Produce': [4, 7], 'Bakery': [4, 7], 'Butcher': [3, 5], 'Dairy': [2, 4], 'Beverages': [2, 4], 'Cleaning': [2, 3],
    'Receiving & Stock Room': [4, 7], 'Chilled & Frozen': [2, 4], 'Fish Counter': [2, 3], 'Health & Beauty': [2, 3], 'Pet Shop': [1, 2] };
  var WAGE = { 'Checkout': 15.5, 'Grocery': 14.8, 'Produce': 15.2, 'Bakery': 16.5, 'Butcher': 18.5, 'Dairy': 15, 'Beverages': 15, 'Cleaning': 14.2,
    'Receiving & Stock Room': 15.8, 'Chilled & Frozen': 16, 'Fish Counter': 17.5, 'Health & Beauty': 16, 'Pet Shop': 15 };
  var OPEX_SCALE = 0.75;   // operating expenses relative to the base amounts below
  var CHARGES = 0.36;   // benefits and payroll charges over wages and overtime pay
  var OVERTIME_RATE = 1.5;

  var EXPENSE_CATEGORIES = ['Energy & water', 'Rent', 'Maintenance', 'Cleaning & services', 'Security', 'Systems & telecom', 'Transport & logistics'];
  var MONTHLY = [
    { category: 'Energy & water', supplier: 'Luz Brasil Energia', description: 'Electricity', day: 5, base: 11500, terms: 10 },
    { category: 'Energy & water', supplier: 'AquaSul Saneamento', description: 'Water and sewage', day: 7, base: 2600, terms: 10 },
    { category: 'Rent', supplier: ['Imobiliária Central', 'Grupo Mercantil Imóveis', 'Patrimonial Sul'], description: 'Store rent', day: 1, base: 24000, terms: 8, steady: true },
    { category: 'Cleaning & services', supplier: 'LimpaMax Serviços', description: 'Cleaning contract', day: 10, base: 6800, terms: 12, steady: true },
    { category: 'Security', supplier: 'Guarda Forte Segurança', description: 'Security contract', day: 8, base: 5200, terms: 12, steady: true },
    { category: 'Systems & telecom', supplier: 'NetCaixa Sistemas', description: 'Point-of-sale licenses', day: 12, base: 3400, terms: 15, steady: true },
    { category: 'Systems & telecom', supplier: 'ConectaTel', description: 'Internet and telephony', day: 12, base: 1250, terms: 15, steady: true }
  ];
  var MAINTENANCE = [
    ['TecnoFrio Manutenção', 'Refrigeration repair'], ['Reparo Express', 'Checkout equipment service'], ['ElétricaPlus', 'Electrical repair'],
    ['TecnoFrio Manutenção', 'Air conditioning service'], ['Reparo Express', 'Shelving repair'], ['ElétricaPlus', 'Lighting replacement']
  ];

  var stores = [], byCode = {}, caches = { sales: {}, invoices: {}, expenses: {}, labor: {}, expected: {} };

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function days(from, to) { return Math.round((to - from) / DAY) + 1; }
  function minDate(a, b) { return a < b ? a : b; }
  function maxDate(a, b) { return a > b ? a : b; }

  function build() {
    window.ProgramsData.getAll().forEach(function(p) {
      (p.sites || []).forEach(function(site) {
        var st = { code: site.storeCode, name: site.storeName, siteName: site.site, city: p.name, state: p.state, region: p.region, programCode: p.code,
          site: site, scale: 0.8 + (hash(site.storeCode + 'scale') % 50) / 100, hasBudget: hash(site.storeCode + 'budget') % 100 < 76 };
        stores.push(st);
        byCode[st.code] = st;
      });
    });
  }

  /* ---------- sales ---------- */

  function salesOf(store, from, to) {
    var k = store.code + '|' + key(from) + '|' + key(to);
    return caches.sales[k] || (caches.sales[k] = FD.salesBetween(store.site, from, to).total);
  }

  /* ---------- purchases (supplier invoices) ---------- */

  var deptBySku = null;
  function categoryOf(invoice) {
    if (invoice._category) return invoice._category;
    if (!deptBySku) {
      deptBySku = {};
      window.ProductsData.getCatalog().forEach(function(p) { deptBySku[p.sku] = p.department; });
    }
    var byDept = {};
    invoice.lines.forEach(function(l) { var d = deptBySku[l.sku] || 'Other'; byDept[d] = (byDept[d] || 0) + l.amount + l.tax; });
    var best = Object.keys(byDept).sort(function(a, b) { return byDept[b] - byDept[a]; })[0] || 'Other';
    invoice._category = best;
    invoice._byDept = byDept;
    return best;
  }

  function invoicesOf(store) {
    if (!caches.invoices[store.code]) {
      caches.invoices[store.code] = FD.allInvoices(store.site).map(function(i) {
        categoryOf(i);
        return i;
      });
    }
    return caches.invoices[store.code];
  }

  function invoicesIn(store, from, to) {
    return invoicesOf(store).filter(function(i) { return i.date >= from && i.date <= to; });
  }

  /* ---------- operating expenses ---------- */

  function statusFor(due, date, h) {
    var overdueWindow = 60 * DAY;
    if (due < TODAY) return (h % 100 < 90 || TODAY - due > overdueWindow) ? 'Paid' : 'Overdue';
    return (h % 100 < 15 && TODAY - date > 4 * DAY) ? 'Paid' : 'Awaiting payment';
  }

  function expensesOf(store) {
    if (caches.expenses[store.code]) return caches.expenses[store.code];
    var list = [], n = 0, idx = stores.indexOf(store);
    function add(date, item, description, supplier, amount, terms) {
      if (date > TODAY) return;
      var due = addDays(date, terms), h = hash(store.code + '|' + key(date) + '|' + description);
      n++;
      list.push({ id: 'OPX-' + (1000 + idx) + '-' + ('000' + n).slice(-4), date: date, storeCode: store.code, category: item.category, supplier: supplier, description: description,
        amount: round2(amount * OPEX_SCALE), due: due, status: statusFor(due, date, h), document: 'OPX-' + (1000 + idx) + '-' + ('000' + n).slice(-4) + '.pdf' });
    }
    for (var y = FIRST.getFullYear(), m = FIRST.getMonth(); new Date(y, m, 1) <= TODAY; m++) {
      if (m > 11) { m = 0; y++; }
      var label = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m] + ' ' + y;
      MONTHLY.forEach(function(it) {
        var h = hash(store.code + it.description + y + '-' + m);
        var noise = it.steady ? 0.99 + (h % 20) / 1000 : 0.9 + (h % 220) / 1000;
        var supplier = Array.isArray(it.supplier) ? it.supplier[hash(store.code + it.description) % it.supplier.length] : it.supplier;
        add(new Date(y, m, it.day), it, it.description + ' · ' + label, supplier, it.base * store.scale * noise, it.terms);
      });
      var count = hash(store.code + 'maint' + y + '-' + m) % 4;
      for (var k = 0; k < count; k++) {
        var hh = hash(store.code + 'maint' + y + '-' + m + '#' + k), mt = MAINTENANCE[hh % MAINTENANCE.length];
        add(new Date(y, m, 3 + (hh >>> 4) % 24), { category: 'Maintenance' }, mt[1], mt[0], (600 + (hh >>> 8) % 4600) * (0.8 + store.scale / 2), 15);
      }
      for (var d = 1; d <= daysIn(y, m); d++) {
        var date = new Date(y, m, d);
        if (date.getDay() === 1 || (date.getDay() === 4 && hash(store.code + 'log' + key(date)) % 3 === 0)) {
          var hl = hash(store.code + 'log' + key(date));
          add(date, { category: 'Transport & logistics' }, 'Freight and distribution', 'RodoNorte Logística', (1800 + hl % 2400) * store.scale, 15);
        }
      }
    }
    caches.expenses[store.code] = list;
    return list;
  }

  function expensesIn(store, from, to) {
    return expensesOf(store).filter(function(e) { return e.date >= from && e.date <= to; });
  }

  /* ---------- labor: hours and cost per department and month ---------- */

  function laborMonth(store, dept, y, m) {
    var k = store.code + '|' + dept + '|' + y + '-' + m;
    if (caches.labor[k]) return caches.labor[k];
    var range = STAFF[dept], h = hash(store.code + dept), staff = Math.max(1, Math.round((range[0] + (h % (range[1] - range[0] + 1)) * store.scale) * 0.55));
    var hm = hash(k), regular = staff * 176 * (0.96 + (hm % 40) / 1000), overtime = regular * (0.015 + ((hm >>> 6) % 70) / 1000);
    var wage = WAGE[dept] * (0.96 + (h % 80) / 1000);
    var wages = regular * wage, overtimePay = overtime * wage * OVERTIME_RATE, benefits = (wages + overtimePay) * CHARGES;
    return (caches.labor[k] = { regularHours: regular, overtimeHours: overtime, wages: wages, overtimePay: overtimePay, benefits: benefits, cost: wages + overtimePay + benefits });
  }

  /** Labor of one department between two dates: every month it touches counts for the days that fall inside the range. */
  function laborIn(store, dept, from, to) {
    var out = { regularHours: 0, overtimeHours: 0, wages: 0, overtimePay: 0, benefits: 0, cost: 0 };
    var d = new Date(from.getFullYear(), from.getMonth(), 1);
    while (d <= to) {
      var y = d.getFullYear(), m = d.getMonth(), n = daysIn(y, m);
      var a = maxDate(from, new Date(y, m, 1)), b = minDate(to, new Date(y, m, n)), f = days(a, b) / n, lm = laborMonth(store, dept, y, m);
      Object.keys(out).forEach(function(k) { out[k] += lm[k] * f; });
      d = new Date(y, m + 1, 1);
    }
    return out;
  }

  function laborTotal(store, from, to, dept) {
    var t = { regularHours: 0, overtimeHours: 0, wages: 0, overtimePay: 0, benefits: 0, cost: 0 };
    (dept ? [dept] : DEPARTMENTS).forEach(function(d) {
      var l = laborIn(store, d, from, to);
      Object.keys(t).forEach(function(k) { t[k] += l[k]; });
    });
    return t;
  }

  /* ---------- per store totals for a period ---------- */

  function sum(list, field) { return list.reduce(function(n, x) { return n + x[field]; }, 0); }

  /** Everything the Overview needs about one store in a period. */
  function totals(store, from, to) {
    var k = 'tot|' + store.code + '|' + key(from) + '|' + key(to);
    if (caches[k]) return caches[k];
    var sales = salesOf(store, from, to), inv = invoicesIn(store, from, to), exp = expensesIn(store, from, to), lab = laborTotal(store, from, to);
    var overdueInv = inv.filter(function(i) { return i.status === 'Overdue'; }), overdueExp = exp.filter(function(e) { return e.status === 'Overdue'; });
    var t = {
      store: store, net: sales.net, transactions: sales.transactions, purchase: sum(inv, 'total'), opex: sum(exp, 'amount'), labor: lab.cost,
      regularHours: lab.regularHours, overtimeHours: lab.overtimeHours,
      overdueCount: overdueInv.length + overdueExp.length, overdueAmount: sum(overdueInv, 'total') + sum(overdueExp, 'amount'),
      invoices: inv.length, expenses: exp.length
    };
    t.cost = t.purchase + t.opex + t.labor;
    t.budget = budgetFor(store, from, to);
    return (caches[k] = t);
  }

  /** Spend a store had in an ordinary month of 2025, the base of its budget (2% above it). */
  function expectedMonthly(store) {
    if (caches.expected[store.code] != null) return caches.expected[store.code];
    var from = new Date(2025, 0, 1), to = new Date(2025, 11, 31);
    var spend = sum(invoicesIn(store, from, to), 'total') + sum(expensesIn(store, from, to), 'amount') + laborTotal(store, from, to).cost;
    return (caches.expected[store.code] = spend / 12 * 1.02);
  }

  /** Budget of the period (null for a store that has none): the monthly budget for the days that fall in each month. */
  function budgetFor(store, from, to) {
    if (!store.hasBudget) return null;
    var total = 0, d = new Date(from.getFullYear(), from.getMonth(), 1);
    while (d <= to) {
      var y = d.getFullYear(), m = d.getMonth(), n = daysIn(y, m);
      total += expectedMonthly(store) * days(maxDate(from, new Date(y, m, 1)), minDate(to, new Date(y, m, n))) / n;
      d = new Date(y, m + 1, 1);
    }
    return total;
  }

  /* ---------- buckets for the trend chart ---------- */

  function buckets(from, to, g) {
    var out = [], d = from;
    while (d <= to) {
      var end;
      if (g === 'day') end = d;
      else if (g === 'week') end = minDate(addDays(d, 6 - ((d.getDay() + 6) % 7)), to);
      else end = minDate(new Date(d.getFullYear(), d.getMonth() + 1, 0), to);
      out.push({ from: d, to: end, net: 0, purchase: 0, opex: 0, labor: 0 });
      d = addDays(end, 1);
    }
    return out;
  }

  function series(list, from, to, g) {
    var bs = buckets(from, to, g), at = [], i, j;
    for (i = 0; i < bs.length; i++) for (j = 0; j < days(bs[i].from, bs[i].to); j++) at.push(i);
    var at0 = function(d) { var o = Math.round((d - from) / DAY); return o >= 0 && o < at.length ? bs[at[o]] : null; };
    list.forEach(function(store) {
      bs.forEach(function(b) {
        b.net += salesOf(store, b.from, b.to).net;
        b.labor += laborTotal(store, b.from, b.to).cost;
      });
      invoicesIn(store, from, to).forEach(function(inv) { var b = at0(inv.date); if (b) b.purchase += inv.total; });
      expensesIn(store, from, to).forEach(function(e) { var b = at0(e.date); if (b) b.opex += e.amount; });
    });
    return bs;
  }

  build();

  window.NetFinance = {
    today: TODAY, firstDay: FIRST, stores: stores, byCode: byCode, departments: DEPARTMENTS, expenseCategories: EXPENSE_CATEGORIES,
    charges: CHARGES, overtimeRate: OVERTIME_RATE,
    salesOf: salesOf, invoicesIn: invoicesIn, expensesIn: expensesIn, laborIn: laborIn, laborTotal: laborTotal, totals: totals, budgetFor: budgetFor,
    categoryOf: categoryOf, series: series, buckets: buckets, days: days, addDays: addDays
  };
})();
