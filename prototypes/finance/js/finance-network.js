/**
 * Network Finance
 * The Finance page: finances of the whole network, to compare stores, cities and regions.
 *   Overview  indicators, the Store Financial Comparison table and a trend chart;
 *   Spend     purchase spend (supplier invoices) and operating expenses, with their documents;
 *   Labor     labor cost by store and department, aggregated (individual pay is never shown and the tab is locked
 *             for people without access);
 *   Reports   "Generate report" exports the filtered data as CSV or PDF.
 * The period, the comparison and the geography filters apply to every card, table and chart.
 * Data: js/finance-network-data.js.
 */

(function() {
  'use strict';

  var NF = window.NetFinance;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var TYPES = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year'], ['custom', 'Custom']];
  var STATUS_TONE = { 'Paid': 'success', 'Awaiting payment': 'warning', 'Overdue': 'danger' };
  var SERIES = [{ key: 'net', label: 'Net Sales', color: '#7180AC' }, { key: 'purchase', label: 'Purchase Spend', color: '#E8A33D' },
    { key: 'opex', label: 'Operating Expenses', color: '#2BA3E8' }, { key: 'labor', label: 'Labor Cost', color: '#3CA66A' }];

  var state = {
    tab: 'overview', period: { type: 'month', anchor: NF.today, from: null, to: null, error: '' }, compare: 'previous', access: 'finance',
    cmp: { quick: 'all', query: '', focus: 'net' }, trend: { gran: 'auto', on: { net: true, purchase: true, opex: false, labor: false } },
    spend: { kind: 'purchase', group: 'store' }, pur: { status: 'all', query: '' }, exp: { status: 'all', query: '' }, labor: { view: 'store' }
  };
  var geo = {}, extra = {}, grids = {}, scoped = [], lastRange = null;

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function plural(n, w) { return n.toLocaleString('pt-BR') + ' ' + w + (n === 1 ? '' : 's'); }
  function money(n) { return (n < 0 ? '−' : '') + 'R$ ' + Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function money0(n) { return (Math.round(n) < 0 ? '−' : '') + 'R$ ' + Math.abs(Math.round(n)).toLocaleString('pt-BR'); }
  function int(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function pct(n, d) { return (n).toFixed(d == null ? 1 : d).replace('.', ',') + '%'; }
  function fmt(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtDay(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseIso(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDays(d, n) { return NF.addDays(d, n); }
  function days(a, b) { return NF.days(a, b); }
  function minDate(a, b) { return a < b ? a : b; }
  function sum(list, f) { return list.reduce(function(n, x) { return n + (typeof f === 'function' ? f(x) : x[f]); }, 0); }
  function can(what) { return what === 'labor' ? state.access === 'finance' : true; }
  function el(id) { return document.getElementById(id); }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
  }

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

  /* ---------- the period ---------- */

  function rangeOf(type, anchor) {
    var today = NF.today, y = anchor.getFullYear(), m = anchor.getMonth(), from, to, label;
    if (type === 'day') { from = to = anchor; label = WEEKDAYS[anchor.getDay()] + ', ' + fmt(anchor); }
    else if (type === 'week') { from = addDays(anchor, -((anchor.getDay() + 6) % 7)); to = addDays(from, 6); label = fmtDay(from) + ' – ' + fmt(to); }
    else if (type === 'month') { from = new Date(y, m, 1); to = new Date(y, m + 1, 0); label = MONTHS[m] + ' ' + y; }
    else if (type === 'quarter') { var q = Math.floor(m / 3); from = new Date(y, q * 3, 1); to = new Date(y, q * 3 + 3, 0); label = 'Q' + (q + 1) + ' ' + y; }
    else { from = new Date(y, 0, 1); to = new Date(y, 11, 31); label = String(y); }
    var clipped = to > today;
    return { from: from, to: minDate(to, today), label: label + (clipped && type !== 'day' ? ' (to date)' : '') };
  }

  function current() {
    var p = state.period;
    if (p.type === 'custom') return { from: p.from, to: p.to, label: fmt(p.from) + ' – ' + fmt(p.to) };
    return rangeOf(p.type, p.anchor);
  }

  function previous(r) {
    var n = days(r.from, r.to), t = state.period.type;
    if (t === 'month') { var m = new Date(r.from.getFullYear(), r.from.getMonth() - 1, 1); return { from: m, to: addDays(m, Math.min(n, new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()) - 1) }; }
    if (t === 'quarter') { var q = new Date(r.from.getFullYear(), r.from.getMonth() - 3, 1); return { from: q, to: addDays(q, n - 1) }; }
    if (t === 'year') { var y = new Date(r.from.getFullYear() - 1, 0, 1); return { from: y, to: addDays(y, n - 1) }; }
    return { from: addDays(r.from, -n), to: addDays(r.from, -1) };
  }

  function lastYear(r) {
    return { from: new Date(r.from.getFullYear() - 1, r.from.getMonth(), r.from.getDate()), to: new Date(r.to.getFullYear() - 1, r.to.getMonth(), r.to.getDate()) };
  }

  /** The range to compare with, or null when the data does not go back that far. */
  function comparison(r) {
    var c = state.compare === 'year' ? lastYear(r) : previous(r);
    return c.from < NF.firstDay ? null : c;
  }

  function compareLabel() { return state.compare === 'year' ? 'same period last year' : 'previous period'; }

  function shift(dir) {
    var p = state.period, a = p.anchor, t = p.type;
    if (t === 'day') p.anchor = addDays(a, dir);
    else if (t === 'week') p.anchor = addDays(a, 7 * dir);
    else if (t === 'month') p.anchor = new Date(a.getFullYear(), a.getMonth() + dir, 1);
    else if (t === 'quarter') p.anchor = new Date(a.getFullYear(), a.getMonth() + 3 * dir, 1);
    else p.anchor = new Date(a.getFullYear() + dir, 0, 1);
  }

  function fullEnd(type, a) {
    if (type === 'day') return a;
    if (type === 'week') return addDays(a, 6 - ((a.getDay() + 6) % 7));
    if (type === 'month') return new Date(a.getFullYear(), a.getMonth() + 1, 0);
    if (type === 'quarter') return new Date(a.getFullYear(), Math.floor(a.getMonth() / 3) * 3 + 3, 0);
    return new Date(a.getFullYear(), 11, 31);
  }

  function periodHtml() {
    var p = state.period, r = current(), today = NF.today;
    var seg = TYPES.map(function(t) {
      var on = p.type === t[0];
      return '<button type="button" class="fin-seg__btn' + (on ? ' fin-seg__btn--active' : '') + '" data-period="' + t[0] + '" aria-pressed="' + on + '">' + t[1] + '</button>';
    }).join('');
    var nav = p.type === 'custom'
      ? '<form class="fin-custom" data-custom novalidate><label>From<input type="date" name="from" class="form-input" value="' + iso(p.from) + '" min="' + iso(NF.firstDay) + '" max="' + iso(today) + '"></label>' +
        '<label>To<input type="date" name="to" class="form-input" value="' + iso(p.to) + '" min="' + iso(NF.firstDay) + '" max="' + iso(today) + '"></label>' +
        '<button type="submit" class="btn btn--primary btn--medium">Apply</button><span class="fin-custom__error"' + (p.error ? '' : ' hidden') + '>' + esc(p.error) + '</span></form>'
      : '<div class="fin-nav"><button type="button" class="fin-nav__btn" data-shift="-1" aria-label="Previous period"><lucide-icon name="chevron-left" style="font-size:16px"></lucide-icon></button>' +
        '<span class="fin-nav__label">' + esc(r.label) + '</span>' +
        '<button type="button" class="fin-nav__btn" data-shift="1" aria-label="Next period"' + (fullEnd(p.type, p.anchor) < today ? '' : ' disabled') + '><lucide-icon name="chevron-right" style="font-size:16px"></lucide-icon></button></div>';
    return '<div class="fin-period"><div class="fin-seg" role="group" aria-label="Period">' + seg + '</div>' + nav + '</div>';
  }

  /** "Compare with", at the right of the tabs. */
  function compareHtml() {
    var lastYearOk = lastYear(current()).from >= NF.firstDay;
    return '<label class="nf-compare">Compare with<select id="nf-compare" class="form-select form-select--stylized"><option value="previous"' + (state.compare === 'previous' ? ' selected' : '') + '>Previous period</option>' +
      '<option value="year"' + (state.compare === 'year' ? ' selected' : '') + (lastYearOk ? '' : ' disabled') + '>Same period last year' + (lastYearOk ? '' : ' (no data)') + '</option></select></label>';
  }

  /* ---------- scope: geography and the filters of each section ---------- */

  function uniq(list, f) {
    var seen = {}, out = [];
    list.forEach(function(x) { var v = f(x); if (!seen[v]) { seen[v] = true; out.push(v); } });
    return out.sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  function inGeo(s) {
    return geo.region.shows(s.region) && geo.state.shows(s.state) && geo.city.shows(s.city) && geo.store.shows(s.name + ' · ' + s.city);
  }

  function updateScope() {
    scoped = NF.stores.filter(inGeo);
  }

  function cascade(from) {
    var regions = NF.stores.filter(function(s) { return geo.region.shows(s.region); });
    if (from === 'region') geo.state.setOptions(uniq(regions, function(s) { return s.state; }));
    var states = regions.filter(function(s) { return geo.state.shows(s.state); });
    if (from === 'region' || from === 'state') geo.city.setOptions(uniq(states, function(s) { return s.city; }));
    var cities = states.filter(function(s) { return geo.city.shows(s.city); });
    if (from !== 'store') geo.store.setOptions(uniq(cities, function(s) { return s.name + ' · ' + s.city; }));
  }

  function filtersActive() {
    var any = !(geo.region.isAll() && geo.state.isAll() && geo.city.isAll() && geo.store.isAll());
    Object.keys(extra).forEach(function(k) { if (extra[k] && !extra[k].isAll()) any = true; });
    return any || state.pur.status !== 'all' || state.exp.status !== 'all' || state.pur.query || state.exp.query || state.cmp.quick !== 'all' || state.cmp.query;
  }

  function scopeLabel() {
    var r = current();
    return r.label + ' · ' + (scoped.length === NF.stores.length ? 'all ' + scoped.length + ' stores' : plural(scoped.length, 'store'));
  }

  function filterSummary() {
    var parts = [];
    [['region', 'Region'], ['state', 'State'], ['city', 'City'], ['store', 'Store']].forEach(function(g) {
      if (!geo[g[0]].isAll()) parts.push(g[1] + ': ' + (geo[g[0]].get().length <= 3 ? geo[g[0]].get().join(', ') : geo[g[0]].get().length + ' selected'));
    });
    if (state.tab === 'spend') {
      var ex = state.spend.kind === 'purchase' ? ['pcat', 'Product category'] : ['ecat', 'Expense category'];
      if (extra[ex[0]] && !extra[ex[0]].isAll()) parts.push(ex[1] + ': ' + extra[ex[0]].get().join(', '));
      var sp = state.spend.kind === 'purchase' ? 'psup' : 'esup';
      if (extra[sp] && !extra[sp].isAll()) parts.push('Supplier: ' + extra[sp].get().join(', '));
    }
    if (state.tab === 'labor' && extra.dept && !extra.dept.isAll()) parts.push('Department: ' + extra.dept.get().join(', '));
    return parts.length ? parts.join(' · ') : 'No filters';
  }

  /* ---------- aggregation ---------- */

  function aggregate(list, range) {
    var a = { stores: list.length, net: 0, purchase: 0, opex: 0, labor: 0, cost: 0, overdueCount: 0, overdueAmount: 0, budget: 0, budgetCost: 0, budgetStores: 0, regularHours: 0, overtimeHours: 0 };
    list.forEach(function(s) {
      var t = NF.totals(s, range.from, range.to);
      a.net += t.net; a.purchase += t.purchase; a.opex += t.opex; a.labor += t.labor; a.cost += t.cost;
      a.overdueCount += t.overdueCount; a.overdueAmount += t.overdueAmount; a.regularHours += t.regularHours; a.overtimeHours += t.overtimeHours;
      if (t.budget != null) { a.budgetStores++; a.budget += t.budget; a.budgetCost += t.cost; }
    });
    return a;
  }

  /** "▲ 4,2% vs previous period": kind says what a rise means (sales: good, spend: needs context, risk: bad). */
  function delta(now, before, kind) {
    if (before == null) return '<span class="fin-delta fin-delta--flat">no data to compare</span>';
    if (!before) return '<span class="fin-delta fin-delta--flat">no data before</span>';
    var p = (now - before) / before * 100;
    if (Math.abs(p) < 0.05) return '<span class="fin-delta fin-delta--flat">no change vs ' + compareLabel() + '</span>';
    var tone = kind === 'sales' ? (p > 0 ? 'good' : 'bad') : (kind === 'risk' ? (p > 0 ? 'bad' : 'good') : (p > 0 ? 'watch' : 'good'));
    return '<span class="fin-delta fin-delta--' + tone + '"' + (kind === 'spend' && p > 0 ? ' title="Spending usually rises with sales: check the percentage of net sales"' : '') + '>' +
      (p > 0 ? '▲' : '▼') + ' ' + pct(Math.abs(p)) + ' vs ' + compareLabel() + '</span>';
  }

  function changePct(now, before) { return before ? (now - before) / before * 100 : null; }

  /* ---------- generic table with sorting, paging and resizing ---------- */

  function Grid(opts) {
    var host = el(opts.host), sort = { key: opts.sortKey, dir: opts.sortDir || 1 }, page = 0, size = opts.size || 50, rows = [], resizer = null, table;

    function value(r, c) { return c.value ? c.value(r) : r[c.key]; }

    function ordered() {
      var c = opts.columns.filter(function(x) { return x.key === sort.key; })[0];
      var list = opts.rows().slice();
      if (!c) return list;
      return list.sort(function(a, b) {
        var x = value(a, c), y = value(b, c);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        var d = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
        return d * sort.dir;
      });
    }

    function head() {
      return opts.columns.map(function(c) {
        var active = sort.key === c.key;
        return '<th class="table__header' + (c.num ? ' products-cell--num' : '') + (c.sort ? ' sortable' : '') + '"' + (c.sort ? ' data-sort="' + c.key + '"' : '') +
          (active ? ' aria-sort="' + (sort.dir > 0 ? 'ascending' : 'descending') + '"' : '') + (c.title ? ' title="' + esc(c.title) + '"' : '') + '>' + esc(c.label) +
          (c.sort ? '<span class="products-sort' + (active ? ' products-sort--active' : '') + '">' + (active ? (sort.dir > 0 ? '↑' : '↓') : '⇅') + '</span>' : '') + '</th>';
      }).join('');
    }

    function build() {
      host.innerHTML = '<div class="table-container products-container"><table class="table table--netfin' + (opts.sticky ? ' table--netfin--sticky2' : '') + '"><thead class="table__head"><tr class="table__row"></tr></thead><tbody class="table__body"></tbody></table></div><div class="np-pager"></div>';
      table = host.querySelector('table');
      resizer = window.TableResize.create(table, { key: opts.key, defaults: opts.columns.map(function(c) { return c.width || 140; }), grow: opts.grow != null ? opts.grow : opts.columns.length - 1,
        onChange: function(w) { table.style.setProperty('--sticky-1', w[0] + 'px'); } });
      host.addEventListener('click', function(e) {
        var th = e.target.closest('th[data-sort]');
        if (th) { var k = th.getAttribute('data-sort'); sort.dir = sort.key === k ? -sort.dir : (opts.columns.filter(function(c) { return c.key === k; })[0].num ? -1 : 1); sort.key = k; page = 0; api.render(); return; }
        var pg = e.target.closest('[data-page]');
        if (pg) { page += +pg.getAttribute('data-page'); api.render(); return; }
        var tr = e.target.closest('tbody tr[data-i]');
        if (tr && opts.onRow && !e.target.closest('a,button')) opts.onRow(rows[+tr.getAttribute('data-i')]);
        else if (tr && opts.onAction) opts.onAction(e, rows[+tr.getAttribute('data-i')]);
      });
      host.addEventListener('change', function(e) { if (e.target.classList.contains('nf-size')) { size = +e.target.value; page = 0; api.render(); } });
    }

    var api = {
      sortBy: function(key, dir) { sort.key = key; sort.dir = dir; page = 0; },
      resetPage: function() { page = 0; },
      render: function() {
        host = el(opts.host);
        if (!table || !host.contains(table)) build();
        rows = ordered();
        var pages = Math.max(1, Math.ceil(rows.length / size));
        if (page >= pages) page = pages - 1;
        var from = page * size, to = Math.min(rows.length, from + size);
        table.querySelector('thead tr').innerHTML = head();
        table.querySelector('tbody').innerHTML = rows.slice(from, to).map(function(r, i) {
          return '<tr class="table__row products-row' + (opts.rowClass ? ' ' + opts.rowClass(r) : '') + '" data-i="' + (from + i) + '" tabindex="0">' + opts.columns.map(function(c) {
            return '<td class="table__cell' + (c.num ? ' products-cell--num' : '') + (c.mono ? ' products-cell--mono' : '') + '">' + c.html(r) + '</td>';
          }).join('') + '</tr>';
        }).join('') || '<tr class="table__row"><td class="table__cell products-empty" colspan="' + opts.columns.length + '">' + esc(opts.empty || 'Nothing matches the filters.') + '</td></tr>';
        resizer.refresh();
        host.querySelector('.np-pager').innerHTML = rows.length > 25 ?
          '<span>' + (rows.length ? 'Showing ' + int(from + 1) + '–' + int(to) + ' of ' + int(rows.length) : '') + '</span><span class="np-pager__controls"><label>Rows per page <select class="form-select nf-size">' +
          [25, 50, 100, 250].map(function(n) { return '<option' + (n === size ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
          '<button type="button" class="btn btn--secondary btn--small" data-page="-1"' + (page === 0 ? ' disabled' : '') + '>Previous</button>' +
          '<button type="button" class="btn btn--secondary btn--small" data-page="1"' + (to >= rows.length ? ' disabled' : '') + '>Next</button></span>' :
          '<span>' + plural(rows.length, 'row') + '</span>';
        return rows;
      },
      rows: function() { return rows; }
    };
    return api;
  }

  /* ---------- Overview ---------- */

  function statusOf(t, prev, withLabor) {
    var flags = [], net = t.net, cost = withLabor ? t.cost : t.purchase + t.opex;
    function flag(sev, text) { flags.push({ sev: sev, text: text }); }
    if (t.budget != null && withLabor) {
      var over = (t.cost - t.budget) / t.budget * 100;
      if (over > 10) flag(2, 'Over budget by ' + pct(over, 0)); else if (over > 5) flag(1, 'Over budget by ' + pct(over, 0));
    }
    if (net && cost > net) flag(2, 'Costs above net sales');
    if (t.overdueCount) flag(t.overdueAmount > net * 0.03 ? 2 : 1, plural(t.overdueCount, 'overdue invoice'));
    var ch = prev ? changePct(net, prev.net) : null;
    if (ch != null && ch < -10) flag(2, 'Net sales down ' + pct(Math.abs(ch), 0)); else if (ch != null && ch < -5) flag(1, 'Net sales down ' + pct(Math.abs(ch), 0));
    if (withLabor && net && t.labor / net > 0.17) flag(t.labor / net > 0.2 ? 2 : 1, 'Labor at ' + pct(t.labor / net * 100, 0) + ' of sales');
    flags.sort(function(a, b) { return b.sev - a.sev; });
    return { level: flags.length ? flags[0].sev : 0, label: flags.length ? flags[0].text : 'On track', all: flags.map(function(f) { return f.text; }) };
  }

  function comparisonRows() {
    var r = current(), c = comparison(r), withLabor = can('labor'), q = state.cmp.query.toLowerCase();
    return scoped.map(function(s) {
      var t = NF.totals(s, r.from, r.to), p = c ? NF.totals(s, c.from, c.to) : null, st = statusOf(t, p, withLabor);
      var row = { store: s, name: s.name, place: s.city + ' / ' + s.state, net: t.net, purchase: t.purchase, opex: t.opex, labor: t.labor, cost: withLabor ? t.cost : t.purchase + t.opex,
        purchasePct: t.net ? t.purchase / t.net * 100 : null, opexPct: t.net ? t.opex / t.net * 100 : null, laborPct: t.net ? t.labor / t.net * 100 : null,
        costPct: t.net ? (withLabor ? t.cost : t.purchase + t.opex) / t.net * 100 : null, netChange: p ? changePct(t.net, p.net) : null,
        costChange: p ? changePct(withLabor ? t.cost : t.purchase + t.opex, withLabor ? p.cost : p.purchase + p.opex) : null,
        budgetVar: t.budget != null && withLabor ? (t.cost - t.budget) / t.budget * 100 : null, status: st, t: t };
      return row;
    }).filter(function(r) {
      if (state.cmp.quick === 'attention' && r.status.level < 2) return false;
      if (state.cmp.quick === 'watch' && r.status.level !== 1) return false;
      if (state.cmp.quick === 'ok' && r.status.level !== 0) return false;
      return !q || (r.name + ' ' + r.place + ' ' + r.store.region).toLowerCase().indexOf(q) !== -1;
    });
  }

  function pctCell(v, hot, warm) {
    if (v == null) return '<span class="products-none">—</span>';
    return '<span class="' + (hot != null && v > hot ? 'nf-hot' : (warm != null && v > warm ? 'nf-warm' : '')) + '">' + pct(v) + '</span>';
  }

  function changeCell(v, kind) {
    if (v == null) return '<span class="products-none">—</span>';
    var good = kind === 'sales' ? v > 0 : v < 0;
    return '<span class="fin-delta fin-delta--' + (Math.abs(v) < 0.05 ? 'flat' : (good ? 'good' : (kind === 'sales' ? 'bad' : 'watch'))) + '">' + (v > 0 ? '▲' : (v < 0 ? '▼' : '')) + ' ' + pct(Math.abs(v)) + '</span>';
  }

  function comparisonColumns() {
    var L = can('labor');
    var cols = [
      { key: 'name', label: 'Store', sort: true, width: 190, html: function(r) { return '<span class="products-clip">' + esc(r.name) + '</span>'; } },
      { key: 'place', label: 'City / State', sort: true, width: 190, html: function(r) { return '<span class="products-clip">' + esc(r.place) + '</span>'; } },
      { key: 'net', label: 'Net Sales', sort: true, num: true, width: 140, html: function(r) { return money0(r.net); } },
      { key: 'purchase', label: 'Purchase Spend', sort: true, num: true, width: 150, html: function(r) { return money0(r.purchase); } },
      { key: 'purchasePct', label: 'Purchases % of Net Sales', sort: true, num: true, width: 170, html: function(r) { return pctCell(r.purchasePct, 62, 56); } },
      { key: 'opex', label: 'Operating Expenses', sort: true, num: true, width: 160, html: function(r) { return money0(r.opex); } },
      { key: 'opexPct', label: 'Expenses % of Net Sales', sort: true, num: true, width: 170, html: function(r) { return pctCell(r.opexPct, 14, 11); } }
    ];
    if (L) cols.push(
      { key: 'labor', label: 'Labor Cost', sort: true, num: true, width: 130, html: function(r) { return money0(r.labor); } },
      { key: 'laborPct', label: 'Labor % of Net Sales', sort: true, num: true, width: 160, html: function(r) { return pctCell(r.laborPct, 17, 15); } });
    cols.push(
      { key: 'cost', label: 'Total Cost per Store', sort: true, num: true, width: 160, title: 'Purchase spend + operating expenses' + (L ? ' + labor cost' : ''), html: function(r) { return money0(r.cost); } },
      { key: 'costPct', label: 'Total Cost % of Net Sales', sort: true, num: true, width: 180, html: function(r) { return pctCell(r.costPct, 90, 80); } },
      { key: 'netChange', label: 'Net Sales vs. ' + compareLabel(), sort: true, num: true, width: 190, html: function(r) { return changeCell(r.netChange, 'sales'); } },
      { key: 'costChange', label: 'Costs vs. ' + compareLabel(), sort: true, num: true, width: 190, html: function(r) { return changeCell(r.costChange, 'cost'); } });
    if (L) cols.push({ key: 'budgetVar', label: 'Budget Variance', sort: true, num: true, width: 150, title: 'Actual spend against the budget; stores without a budget show a dash', html: function(r) { return r.budgetVar == null ? '<span class="products-none">no budget</span>' : '<span class="' + (r.budgetVar > 5 ? 'nf-hot' : '') + '">' + (r.budgetVar > 0 ? '+' : '') + pct(r.budgetVar) + '</span>'; } });
    cols.push({ key: 'status', label: 'Status', sort: true, width: 250, value: function(r) { return r.status.level * 100 - r.status.all.length; },
      html: function(r) { return '<span class="ov-badge ov-badge--' + ['success', 'warning', 'danger'][r.status.level] + '" title="' + esc(r.status.all.join(' · ') || 'Nothing to flag') + '">' + esc(r.status.label) + '</span>' + (r.status.all.length > 1 ? ' <span class="nf-more">+' + (r.status.all.length - 1) + '</span>' : ''); } });
    return cols;
  }

  function overviewHtml() {
    return '<div class="fin-kpis nf-kpis" id="nf-kpis"></div>' +
      '<section class="fin-card nf-card" id="nf-trend-card"><div class="nf-card__head"><div><h3 class="fin-card__title">Trend</h3><p class="nf-card__sub" id="nf-trend-sub"></p></div>' +
        '<div class="nf-card__tools"><div class="nf-legend" id="nf-legend"></div><div class="fin-seg" id="nf-gran" role="group" aria-label="Granularity"></div></div></div>' +
        '<div class="nf-chart" id="nf-chart"></div></section>' +
      '<section class="fin-card nf-card" id="nf-cmp-card"><div class="nf-card__head"><div><h3 class="fin-card__title">Store Financial Comparison</h3><p class="nf-card__sub" id="nf-cmp-sub"></p></div>' +
        '<div class="nf-card__tools"><div class="products-search nf-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon><input type="text" id="nf-cmp-search" class="products-search__input" placeholder="Filter by store, city or region" autocomplete="off"></div>' +
        '<div class="products-chips" id="nf-cmp-chips"></div></div></div>' +
        '<div class="nf-callout" id="nf-callout" hidden></div><div id="nf-cmp-grid"></div></section>';
  }

  /** An indicator card: a button with three states (default, hover, selected). `active` marks the one the view is showing. */
  function kpiHtml(label, value, note, tone, go, extraHtml, active) {
    return '<button type="button" class="fin-kpi nf-kpi' + (tone && tone !== 'main' ? ' fin-kpi--' + tone : '') + (active ? ' nf-kpi--active' : '') + '"' + (go ? ' data-go="' + go + '"' : '') + ' aria-pressed="' + !!active + '"><span class="fin-kpi__label">' + label + '</span><strong class="fin-kpi__value">' + value + '</strong>' +
      (extraHtml || '') + '<span class="fin-kpi__note">' + note + '</span></button>';
  }

  function renderOverview() {
    var r = current(), c = comparison(r), a = aggregate(scoped, r), b = c ? aggregate(scoped, c) : null, L = can('labor');
    var n = plural(a.stores, 'store');
    var budgetCard;
    if (!L) budgetCard = kpiHtml('Budget Variance', 'Restricted', 'Includes labor, which your access does not cover', '', '');
    else if (!a.budgetStores) budgetCard = kpiHtml('Budget Variance', '—', 'No budget registered for these stores', '', '');
    else {
      var v = a.budgetCost - a.budget, vp = a.budget ? v / a.budget * 100 : 0;
      budgetCard = kpiHtml('Budget Variance', (v > 0 ? '+' : '') + money0(v), '<span class="fin-delta fin-delta--' + (v > 0 ? 'bad' : 'good') + '">' + (v > 0 ? 'Over budget ' : 'Under budget ') + pct(Math.abs(vp)) + '</span> · ' + a.budgetStores + ' of ' + n + ' with a budget',
        v / a.budget > 0.05 ? 'danger' : '', 'sort=budgetVar', '', state.cmp.focus === 'budget');
    }
    el('nf-kpis').innerHTML =
      kpiHtml('Net Sales', money0(a.net), delta(a.net, b && b.net, 'sales') + ' · ' + n, '', 'sort=net', '', state.cmp.focus === 'net') +
      kpiHtml('Purchase Spend', money0(a.purchase), delta(a.purchase, b && b.purchase, 'spend') + ' · ' + n, '', 'spend=purchase') +
      kpiHtml('Operating Expenses', money0(a.opex), delta(a.opex, b && b.opex, 'spend') + ' · ' + n, '', 'spend=opex') +
      (L ? kpiHtml('Labor Cost', money0(a.labor), delta(a.labor, b && b.labor, 'spend') + ' · ' + n, '', 'tab=labor') : kpiHtml('Labor Cost', 'Restricted', 'Labor cost is hidden for your access', '', '')) +
      kpiHtml('Invoices Overdue', int(a.overdueCount), money0(a.overdueAmount) + ' · ' + delta(a.overdueCount, b && b.overdueCount, 'risk'), a.overdueCount ? 'danger' : '', 'overdue=1') +
      budgetCard;
    renderTrend();
    el('nf-cmp-sub').textContent = 'Absolute values depend on store size, so compare the percentages of net sales. Click a row to open the store.';
    renderCallout(a);
    el('nf-cmp-chips').innerHTML = [['all', 'All'], ['attention', 'Attention'], ['watch', 'Watch'], ['ok', 'On track']].map(function(x) {
      return '<button type="button" class="products-chip' + (state.cmp.quick === x[0] ? ' products-chip--active' : '') + '" data-cmpquick="' + x[0] + '" aria-pressed="' + (state.cmp.quick === x[0]) + '">' + x[1] + '</button>';
    }).join('');
    ensureGrid('cmp', function() {
      return new Grid({ host: 'nf-cmp-grid', key: 'nf-cmp-' + (L ? 'f' : 'o'), columns: comparisonColumns(), rows: comparisonRows, sortKey: 'net', sortDir: -1, sticky: true, size: 25,
        onRow: function(row) { openStoreDrawer(row.store); }, empty: 'No store matches the filters.', grow: comparisonColumns().length - 1 });
    }, L ? 'f' : 'o').render();
  }

  function renderCallout(a) {
    var nets = scoped.map(function(s) { return NF.totals(s, current().from, current().to).net; }).filter(function(v) { return v > 0; });
    var box = el('nf-callout');
    if (nets.length < 2) { box.hidden = true; return; }
    var lo = Math.min.apply(null, nets), hi = Math.max.apply(null, nets);
    box.hidden = hi / lo < 1.6;
    box.innerHTML = 'Stores differ in size: net sales go from <strong>' + money0(lo) + '</strong> to <strong>' + money0(hi) + '</strong> in this period, so absolute values are hard to compare. Use the percentage columns.';
  }

  function ensureGrid(name, make, variant) {
    if (!grids[name] || grids[name].variant !== variant) { grids[name] = make(); grids[name].variant = variant; }
    return grids[name];
  }

  /* ---------- trend chart ---------- */

  function granularity() {
    var r = current(), n = days(r.from, r.to), g = state.trend.gran;
    if (g === 'auto') return n <= 45 ? 'day' : (n <= 200 ? 'week' : 'month');
    if (g === 'day' && n > 120) return 'week';
    return g;
  }

  function bucketLabel(b, g) {
    if (g === 'day') return WEEKDAYS[b.from.getDay()] + ', ' + fmt(b.from);
    if (g === 'week') return days(b.from, b.to) === 7 ? 'Week of ' + fmt(b.from) : fmt(b.from) + ' – ' + fmt(b.to);
    return MONTHS[b.from.getMonth()] + ' ' + b.from.getFullYear();
  }

  function shortMoney(v) {
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' mi';
    if (v >= 1e3) return 'R$ ' + Math.round(v / 1e3) + ' mil';
    return 'R$ ' + Math.round(v);
  }

  function renderTrend() {
    var r = current(), g = granularity(), n = days(r.from, r.to);
    var active = SERIES.filter(function(s) { return state.trend.on[s.key] && (s.key !== 'labor' || can('labor')); });
    el('nf-trend-sub').textContent = scopeLabel() + ' · by ' + g + ' · click a point to open that ' + (g === 'day' ? 'day' : g) + ' in the period';
    el('nf-legend').innerHTML = SERIES.filter(function(s) { return s.key !== 'labor' || can('labor'); }).map(function(s) {
      return '<button type="button" class="nf-legend__item' + (state.trend.on[s.key] ? ' is-on' : '') + '" data-series="' + s.key + '" aria-pressed="' + !!state.trend.on[s.key] + '"><i style="background:' + s.color + '"></i>' + s.label + '</button>';
    }).join('');
    el('nf-gran').innerHTML = [['auto', 'Auto'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(function(x) {
      var dis = x[0] === 'day' && n > 120;
      return '<button type="button" class="fin-seg__btn' + (state.trend.gran === x[0] ? ' fin-seg__btn--active' : '') + '" data-gran="' + x[0] + '"' + (dis ? ' disabled title="Too many days for this period"' : '') + '>' + x[1] + '</button>';
    }).join('');
    var bs = NF.series(scoped, r.from, r.to, g);
    lastRange = { buckets: bs, g: g, active: active };
    var W = 1000, H = 280, pl = 70, pr = 16, pt = 14, pb = 34, iw = W - pl - pr, ih = H - pt - pb;
    var max = 0;
    active.forEach(function(s) { bs.forEach(function(b) { max = Math.max(max, b[s.key]); }); });
    if (!active.length || !max) { el('nf-chart').innerHTML = '<p class="nf-empty">' + (active.length ? 'No data in this period.' : 'Turn on a series in the legend.') + '</p>'; return; }
    var step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step * 2) / 2 * step;
    var x = function(i) { return pl + (bs.length === 1 ? iw / 2 : i * iw / (bs.length - 1)); };
    var y = function(v) { return pt + ih - v / top * ih; };
    var grid = '', labels = '';
    for (var k = 0; k <= 4; k++) { var gv = top * k / 4; grid += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(gv) + '" y2="' + y(gv) + '" class="nf-grid"/><text x="' + (pl - 8) + '" y="' + (y(gv) + 4) + '" text-anchor="end" class="nf-axis">' + shortMoney(gv) + '</text>'; }
    var every = Math.max(1, Math.ceil(bs.length / 8));
    bs.forEach(function(b, i) {
      if (i % every) return;
      var lab = g === 'month' ? MONTHS[b.from.getMonth()] + ' ' + b.from.getFullYear() : fmtDay(b.from);
      labels += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" class="nf-axis">' + lab + '</text>';
    });
    var lines = active.map(function(s) {
      var d = bs.map(function(b, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(b[s.key]).toFixed(1); }).join(' ');
      return '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
        (bs.length <= 40 ? bs.map(function(b, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(b[s.key]).toFixed(1) + '" r="3" fill="#fff" stroke="' + s.color + '" stroke-width="2"/>'; }).join('') : '');
    }).join('');
    el('nf-chart').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="nf-svg" role="img" aria-label="Trend of the selected series">' + grid + labels + lines +
      '<line class="nf-cursor" x1="0" x2="0" y1="' + pt + '" y2="' + (pt + ih) + '" hidden/><rect class="nf-hit" x="' + pl + '" y="' + pt + '" width="' + iw + '" height="' + ih + '" fill="transparent"/></svg><div class="nf-tip" hidden></div>';
    lastRange.geom = { W: W, pl: pl, iw: iw, n: bs.length };
  }

  function chartMove(e) {
    var svg = el('nf-chart').querySelector('svg');
    if (!svg || !lastRange) return;
    var rect = svg.getBoundingClientRect(), gm = lastRange.geom, px = (e.clientX - rect.left) / rect.width * gm.W;
    var i = gm.n === 1 ? 0 : Math.max(0, Math.min(gm.n - 1, Math.round((px - gm.pl) / gm.iw * (gm.n - 1))));
    var b = lastRange.buckets[i], xx = gm.pl + (gm.n === 1 ? gm.iw / 2 : i * gm.iw / (gm.n - 1));
    var cur = svg.querySelector('.nf-cursor'), tip = el('nf-chart').querySelector('.nf-tip');
    cur.hidden = false; cur.setAttribute('x1', xx); cur.setAttribute('x2', xx);
    tip.hidden = false;
    tip.innerHTML = '<strong>' + esc(bucketLabel(b, lastRange.g)) + '</strong>' + lastRange.active.map(function(s) { return '<span><i style="background:' + s.color + '"></i>' + s.label + '<b>' + money0(b[s.key]) + '</b></span>'; }).join('');
    var left = xx / gm.W * rect.width;
    tip.style.left = Math.min(Math.max(left + 12, 0), rect.width - 230) + 'px';
    tip.dataset.i = i;
  }

  function chartClick() {
    var tip = el('nf-chart').querySelector('.nf-tip');
    if (!tip || tip.hidden || !lastRange) return;
    var b = lastRange.buckets[+tip.dataset.i];
    if (lastRange.g === 'day') return;
    state.period = { type: 'custom', anchor: b.from, from: b.from, to: b.to, error: '' };
    state.trend.gran = 'day';
    renderAll();
  }

  /* ---------- store drawer ---------- */

  function drawerShell(title, body) {
    return '<div class="drawer__header"><button class="drawer__close" data-close-drawer aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button><h3 class="drawer__title" data-sentence>' + title + '</h3></div><div class="drawer__body">' + body + '</div>';
  }

  function openDrawer(html) {
    var o = el('nf-drawer');
    o.querySelector('.drawer').innerHTML = html;
    o.classList.add('drawer-overlay--open');
  }

  function closeDrawer() { el('nf-drawer').classList.remove('drawer-overlay--open'); }

  /** A donut with the total in the middle; each part is an arc of the ring, the legend is the table below it. */
  function donutHtml(parts, total) {
    var R = 74, C = 2 * Math.PI * R, GAP = 3, off = 0;
    var arcs = parts.map(function(p) {
      var len = total ? p[1] / total * C : 0, seg = Math.max(0, len - GAP);
      var el = '<circle cx="100" cy="100" r="' + R + '" fill="none" stroke="' + p[2] + '" stroke-width="26" stroke-dasharray="' + seg.toFixed(2) + ' ' + (C - seg).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"><title>' + esc(p[0]) + ' · ' + money0(p[1]) + '</title></circle>';
      off += len;
      return el;
    }).join('');
    return '<div class="nf-donut"><svg viewBox="0 0 200 200" role="img" aria-label="Share of each part of the labor cost"><g transform="rotate(-90 100 100)">' +
      '<circle cx="100" cy="100" r="' + R + '" fill="none" stroke="#E0E0E4" stroke-width="26" class="nf-donut__track"/>' + arcs + '</g></svg>' +
      '<div class="nf-donut__center"><strong>' + money0(total) + '</strong><span>labor cost</span></div></div>';
  }

  function bars(items, total, opts) {
    var max = Math.max.apply(null, items.map(function(i) { return i.value; }).concat([1]));
    return '<ul class="nf-bars">' + items.map(function(i) {
      return '<li><button type="button" class="nf-bar"' + (i.go ? ' data-go="' + esc(i.go) + '"' : ' disabled') + '><span class="nf-bar__name">' + esc(i.name) + '</span>' +
        '<span class="nf-bar__track"><span class="nf-bar__fill" style="width:' + Math.max(2, i.value / max * 100) + '%;background:' + (i.color || '#7180AC') + '"></span></span>' +
        '<span class="nf-bar__value">' + money0(i.value) + '</span><span class="nf-bar__share">' + pct(total ? i.value / total * 100 : 0, 0) + '</span></button></li>';
    }).join('') + '</ul>';
  }

  function openStoreDrawer(s) {
    var r = current(), c = comparison(r), t = NF.totals(s, r.from, r.to), p = c ? NF.totals(s, c.from, c.to) : null, L = can('labor');
    var exp = NF.expensesIn(s, r.from, r.to), byCat = {};
    exp.forEach(function(e) { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    var catItems = Object.keys(byCat).sort(function(a, b) { return byCat[b] - byCat[a]; }).map(function(k) { return { name: k, value: byCat[k] }; });
    var st = statusOf(t, p, L), cost = L ? t.cost : t.purchase + t.opex;
    var href = function(tab) { return '../programs/program-detail.html?code=' + encodeURIComponent(s.programCode) + '&site=' + encodeURIComponent(s.siteName) + '&tab=' + tab; };
    var grid = function(pairs) { return '<dl class="pd-grid">' + pairs.map(function(x) { return '<div class="pd-grid__item"><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl>'; };
    openDrawer(drawerShell(esc(s.name) + ' · ' + esc(s.city) + ', ' + esc(s.state),
      '<p class="np-form-note">' + esc(scopeLabelFor(r)) + ' · ' + esc(s.region) + ' region · <span class="ov-badge ov-badge--' + ['success', 'warning', 'danger'][st.level] + '">' + esc(st.label) + '</span></p>' +
      '<section class="pd-section"><h4 class="pd-section__title">Summary</h4>' + grid([
        ['Net Sales', money0(t.net) + '<br>' + delta(t.net, p && p.net, 'sales')], ['Purchase Spend', money0(t.purchase) + (t.net ? '<br><small>' + pct(t.purchase / t.net * 100) + ' of net sales</small>' : '')],
        ['Operating Expenses', money0(t.opex) + (t.net ? '<br><small>' + pct(t.opex / t.net * 100) + ' of net sales</small>' : '')],
        [L ? 'Labor Cost' : 'Labor Cost', L ? money0(t.labor) + (t.net ? '<br><small>' + pct(t.labor / t.net * 100) + ' of net sales</small>' : '') : 'Restricted'],
        ['Total cost', money0(cost) + (t.net ? '<br><small>' + pct(cost / t.net * 100) + ' of net sales</small>' : '')],
        ['Budget', !L ? 'Restricted' : (t.budget == null ? 'No budget registered' : money0(t.budget) + '<br><small>' + (t.cost > t.budget ? '+' : '') + pct((t.cost - t.budget) / t.budget * 100) + ' actual vs budget</small>')],
        ['Overdue', t.overdueCount ? plural(t.overdueCount, 'invoice') + '<br><small>' + money0(t.overdueAmount) + '</small>' : 'None']]) + '</section>' +
      '<section class="pd-section"><h4 class="pd-section__title">Operating expenses by category</h4>' + (catItems.length ? bars(catItems, t.opex) : '<p class="pd-note">No expenses in this period.</p>') + '</section>' +
      '<section class="pd-section"><h4 class="pd-section__title">Go to the store</h4><div class="nf-links"><a class="btn btn--secondary btn--small" href="' + href('revenue') + '">Revenue</a>' +
        '<a class="btn btn--secondary btn--small" href="' + href('purchase-spend') + '">Purchase Spend</a><a class="btn btn--secondary btn--small" href="' + href('overview') + '">Store overview</a></div>' +
        '<p class="np-form-note">Filter the whole page to this store: <button type="button" class="nf-inline" data-go="store=' + esc(s.name + ' · ' + s.city) + '">Show only ' + esc(s.name) + '</button></p></section>'));
  }

  function scopeLabelFor(r) { return r.label + (comparison(r) ? ' · compared with ' + compareLabel() : ''); }

  /* ---------- Spend ---------- */

  function purchaseRows() {
    var r = current(), q = state.pur.query.toLowerCase(), out = [];
    scoped.forEach(function(s) {
      NF.invoicesIn(s, r.from, r.to).forEach(function(i) {
        if (state.pur.status !== 'all' && i.status !== state.pur.status) return;
        if (!extra.psup.shows(i.supplier) || !extra.pcat.shows(i._category)) return;
        if (q && [i.supplier, i.number, i.po, s.name, s.city].join(' ').toLowerCase().indexOf(q) === -1) return;
        out.push({ inv: i, store: s, date: i.date, storeName: s.name, supplier: i.supplier, number: i.number, po: i.po, category: i._category, items: i.products, total: i.total, due: i.due, status: i.status });
      });
    });
    return out;
  }

  function expenseRows() {
    var r = current(), q = state.exp.query.toLowerCase(), out = [];
    scoped.forEach(function(s) {
      NF.expensesIn(s, r.from, r.to).forEach(function(e) {
        if (state.exp.status !== 'all' && e.status !== state.exp.status) return;
        if (!extra.esup.shows(e.supplier) || !extra.ecat.shows(e.category)) return;
        if (q && [e.supplier, e.description, e.category, s.name, s.city].join(' ').toLowerCase().indexOf(q) === -1) return;
        out.push({ exp: e, store: s, date: e.date, storeName: s.name, category: e.category, supplier: e.supplier, description: e.description, amount: e.amount, due: e.due, status: e.status });
      });
    });
    return out;
  }

  function statusBadge(s) { return '<span class="ov-badge ov-badge--' + STATUS_TONE[s] + '">' + s + '</span>'; }

  function invoiceText(i, s) {
    var out = ['INVOICE ' + i.number, 'Store: ' + s.name + ' (' + s.city + ')', 'Supplier: ' + i.supplier, 'Purchase order: ' + i.po, 'Invoice date: ' + fmt(i.date), 'Due date: ' + fmt(i.due), 'Payment status: ' + i.status, '', 'Items received:'];
    i.lines.forEach(function(l) { out.push('  ' + l.qty + ' ' + l.unit + ' x ' + l.brand + ' ' + l.product + ' (' + l.variant + ', ' + l.size + ')  ' + money(l.amount)); });
    out.push('', 'Subtotal: ' + money(i.subtotal), 'Taxes: ' + money(i.tax), 'Total: ' + money(i.total), '', 'Sample document generated for the prototype.');
    return out.join('\n');
  }

  function expenseText(e, s) {
    return ['EXPENSE ' + e.id, 'Store: ' + s.name + ' (' + s.city + ')', 'Category: ' + e.category, 'Supplier: ' + e.supplier, 'Description: ' + e.description, 'Date: ' + fmt(e.date), 'Due date: ' + fmt(e.due),
      'Amount: ' + money(e.amount), 'Payment status: ' + e.status, '', 'Sample document generated for the prototype.'].join('\n');
  }

  function openInvoiceDrawer(row) {
    var i = row.inv, s = row.store;
    openDrawer(drawerShell('Invoice ' + esc(i.number),
      '<p class="np-form-note">' + esc(s.name) + ' · ' + esc(s.city) + ', ' + esc(s.state) + ' · ' + statusBadge(i.status) + '</p>' +
      '<section class="pd-section"><h4 class="pd-section__title">Invoice</h4><dl class="pd-grid">' +
        [['Supplier', esc(i.supplier)], ['Purchase order', esc(i.po)], ['Category', esc(i._category)], ['Invoice date', fmt(i.date)], ['Due date', fmt(i.due)], ['Destination store', esc(s.name)], ['Subtotal', money(i.subtotal)], ['Taxes', money(i.tax)], ['Total', '<strong>' + money(i.total) + '</strong>']]
          .map(function(x) { return '<div class="pd-grid__item"><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl></section>' +
      '<section class="pd-section"><h4 class="pd-section__title">Items received</h4><table class="pd-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit cost</th><th>Amount</th></tr></thead><tbody>' +
        i.lines.map(function(l) { return '<tr><td>' + esc(l.brand + ' ' + l.product) + '<br><small>' + esc(l.variant + ' · ' + l.size + ' · ' + l.sku) + '</small></td><td>' + l.qty + ' ' + l.unit + '</td><td>' + money(l.unitCost) + '</td><td>' + money(l.amount) + '</td></tr>'; }).join('') +
      '</tbody></table></section>' +
      '<section class="pd-section"><h4 class="pd-section__title">Document</h4><button type="button" class="tt-add" data-doc-invoice="' + i.id + '|' + s.code + '">Invoice ' + esc(i.number) + '.txt</button></section>'));
  }

  function openExpenseDrawer(row) {
    var e = row.exp, s = row.store;
    openDrawer(drawerShell(esc(e.description),
      '<p class="np-form-note">' + esc(s.name) + ' · ' + esc(s.city) + ', ' + esc(s.state) + ' · ' + statusBadge(e.status) + '</p>' +
      '<section class="pd-section"><h4 class="pd-section__title">Expense</h4><dl class="pd-grid">' +
        [['Category', esc(e.category)], ['Supplier', esc(e.supplier)], ['Date', fmt(e.date)], ['Due date', fmt(e.due)], ['Amount', '<strong>' + money(e.amount) + '</strong>'], ['Record', esc(e.id)]]
          .map(function(x) { return '<div class="pd-grid__item"><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl></section>' +
      '<section class="pd-section"><h4 class="pd-section__title">Document</h4><button type="button" class="tt-add" data-doc-expense="' + e.id + '|' + s.code + '">' + esc(e.document) + '</button></section>'));
  }

  function openTransitDrawer() {
    var list = [];
    scoped.forEach(function(s) { window.StoreOverview.ordersFor(s.site).forEach(function(o) { list.push({ o: o, s: s }); }); });
    list.sort(function(a, b) { return (b.o.late - a.o.late) || (a.o.due - b.o.due); });
    var late = list.filter(function(x) { return x.o.late; }).length;
    openDrawer(drawerShell('Purchase orders in transit',
      '<p class="np-form-note">' + plural(list.length, 'order') + ' on their way to ' + plural(scoped.length, 'store') + ' · ' + late + ' late. These orders are not invoices yet: they are not in Purchase Spend until the supplier invoices them.</p>' +
      '<table class="pd-table"><thead><tr><th>Store</th><th>Supplier</th><th>Order</th><th>Items</th><th>Value</th><th>Expected</th></tr></thead><tbody>' +
      list.map(function(x) { return '<tr><td>' + esc(x.s.name) + '<br><small>' + esc(x.s.city) + '</small></td><td>' + esc(x.o.supplier) + '</td><td>' + x.o.number + '</td><td>' + x.o.items + '</td><td>' + money0(x.o.value) + '</td><td>' + (x.o.late ? '<span class="ov-badge ov-badge--danger">Late · ' + fmtDay(x.o.due) + '</span>' : fmt(x.o.due)) + '</td></tr>'; }).join('') + '</tbody></table>'));
  }

  function spendHtml() {
    return '<div class="rq-subtabs nf-subtabs" role="tablist">' +
      '<button type="button" class="rq-subtab" role="tab" data-spend="purchase">Purchase Spend</button><button type="button" class="rq-subtab" role="tab" data-spend="opex">Operating Expenses</button></div>' +
      '<div id="nf-spend-body"></div>';
  }

  function statusChips(group, current) {
    var counts = group.counts;
    return ['all', 'Awaiting payment', 'Overdue', 'Paid'].map(function(s) {
      return '<button type="button" class="products-chip' + (current === s ? ' products-chip--active' : '') + '" data-' + group.attr + '="' + s + '" aria-pressed="' + (current === s) + '">' + (s === 'all' ? 'All' : s) + ' <strong>' + int(counts[s]) + '</strong></button>';
    }).join('');
  }

  function groupSum(rows, f, v) {
    var m = {};
    rows.forEach(function(r) { var k = f(r); m[k] = (m[k] || 0) + v(r); });
    return Object.keys(m).sort(function(a, b) { return m[b] - m[a]; }).map(function(k) { return { name: k, value: m[k] }; });
  }

  function renderPurchaseSpend() {
    var r = current(), c = comparison(r), body = el('nf-spend-body');
    // numbers of the whole scope, before the filters of the table, so the filters can be changed
    var all = [];
    scoped.forEach(function(s) { NF.invoicesIn(s, r.from, r.to).forEach(function(i) { all.push({ inv: i, store: s }); }); });
    var before = [];
    if (c) scoped.forEach(function(s) { NF.invoicesIn(s, c.from, c.to).forEach(function(i) { before.push(i); }); });
    var total = sum(all, function(x) { return x.inv.total; }), prevTotal = c ? sum(before, 'total') : null;
    var of = function(st) { return all.filter(function(x) { return x.inv.status === st; }); };
    var awaiting = of('Awaiting payment'), overdue = of('Overdue');
    var transit = 0, transitValue = 0;
    scoped.forEach(function(s) { window.StoreOverview.ordersFor(s.site).forEach(function(o) { transit++; transitValue += o.value; }); });
    var rows = purchaseRows(), shownTotal = sum(rows, 'total');
    var counts = { all: all.length, 'Awaiting payment': awaiting.length, Overdue: overdue.length, Paid: all.length - awaiting.length - overdue.length };
    var supplierItems = groupSum(all, function(x) { return x.inv.supplier; }, function(x) { return x.inv.total; }).slice(0, 8).map(function(i) { i.go = 'psup=' + i.name; return i; });
    var catItems = [], byCat = {};
    all.forEach(function(x) { Object.keys(x.inv._byDept).forEach(function(d) { byCat[d] = (byCat[d] || 0) + x.inv._byDept[d]; }); });
    catItems = Object.keys(byCat).sort(function(a, b) { return byCat[b] - byCat[a]; }).slice(0, 8).map(function(k) { return { name: k, value: byCat[k], go: 'pcat=' + k, color: '#E8A33D' }; });
    var storeItems = groupSum(all, function(x) { return x.store.name + ' · ' + x.store.city; }, function(x) { return x.inv.total; }).slice(0, 8).map(function(i) { i.go = 'store=' + i.name; i.color = '#2BA3E8'; return i; });
    body.innerHTML =
      '<div class="fin-kpis fin-kpis--four nf-kpis">' +
        kpiHtml('Total purchases', money0(total), delta(total, prevTotal, 'spend') + ' · ' + plural(all.length, 'invoice'), '', 'pstatus=all', '', state.pur.status === 'all') +
        kpiHtml('Awaiting payment', plural(awaiting.length, 'invoice'), money0(sum(awaiting, function(x) { return x.inv.total; })), awaiting.length ? 'warning' : '', 'pstatus=Awaiting payment', '', state.pur.status === 'Awaiting payment') +
        kpiHtml('Overdue', plural(overdue.length, 'invoice'), money0(sum(overdue, function(x) { return x.inv.total; })), overdue.length ? 'danger' : '', 'pstatus=Overdue', '', state.pur.status === 'Overdue') +
        kpiHtml('Purchase orders in transit', int(transit), money0(transitValue) + ' on their way', '', 'transit=1') + '</div>' +
      '<div class="nf-trio"><section class="fin-card nf-card"><h3 class="fin-card__title">By supplier</h3>' + (supplierItems.length ? bars(supplierItems, total) : '<p class="nf-empty">No invoices.</p>') + '</section>' +
        '<section class="fin-card nf-card"><h3 class="fin-card__title">By product category</h3>' + (catItems.length ? bars(catItems, total) : '<p class="nf-empty">No invoices.</p>') + '</section>' +
        '<section class="fin-card nf-card"><h3 class="fin-card__title">By store</h3>' + (storeItems.length ? bars(storeItems, total) : '<p class="nf-empty">No invoices.</p>') + '</section></div>' +
      '<section class="fin-card nf-card"><div class="nf-card__head"><div><h3 class="fin-card__title">Invoices</h3><p class="nf-card__sub">' + plural(rows.length, 'invoice') + ' · ' + money0(shownTotal) + ' · click a row to see its items</p></div>' +
        '<div class="nf-card__tools"><div class="products-search nf-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon><input type="text" id="nf-pur-search" class="products-search__input" placeholder="Search by supplier, invoice, order or store" autocomplete="off" value="' + esc(state.pur.query) + '"></div>' +
        '<div class="products-chips">' + statusChips({ attr: 'pstatus', counts: counts }, state.pur.status) + '</div></div></div><div id="nf-pur-grid"></div></section>';
    ensureGrid('pur', function() {
      return new Grid({ host: 'nf-pur-grid', key: 'nf-pur-v1', sortKey: 'date', sortDir: -1, sticky: true, size: 50, empty: 'No invoice matches the filters.', grow: 9, rows: purchaseRows, onRow: openInvoiceDrawer,
        onAction: function(e, row) { var d = e.target.closest('[data-doc-invoice]'); if (d) download('invoice-' + row.inv.number + '.txt', invoiceText(row.inv, row.store)); },
        columns: [
          { key: 'date', label: 'Invoice Date', sort: true, width: 150, html: function(r) { return fmt(r.date); } },
          { key: 'storeName', label: 'Store', sort: true, width: 170, html: function(r) { return '<span class="products-clip">' + esc(r.storeName) + '</span>'; } },
          { key: 'supplier', label: 'Supplier', sort: true, width: 210, html: function(r) { return esc(r.supplier); } },
          { key: 'number', label: 'Invoice Number', sort: true, mono: true, width: 140, html: function(r) { return r.number; } },
          { key: 'po', label: 'Purchase Order', sort: true, mono: true, width: 130, html: function(r) { return r.po; } },
          { key: 'category', label: 'Category', sort: true, width: 150, html: function(r) { return esc(r.category); } },
          { key: 'items', label: 'Items', sort: true, num: true, width: 90, html: function(r) { return r.items; } },
          { key: 'total', label: 'Total Amount', sort: true, num: true, width: 140, html: function(r) { return money(r.total); } },
          { key: 'due', label: 'Due Date', sort: true, width: 150, html: function(r) { return fmt(r.due); } },
          { key: 'status', label: 'Payment Status', sort: true, width: 150, html: function(r) { return statusBadge(r.status); } },
          { key: 'doc', label: 'Document', width: 170, html: function(r) { return '<button type="button" class="tt-add" data-doc-invoice="1">Invoice.txt</button>'; } }
        ] });
    }, 'p').render();
  }

  function renderOpexSpend() {
    var r = current(), c = comparison(r), body = el('nf-spend-body');
    var all = [], before = [];
    scoped.forEach(function(s) { NF.expensesIn(s, r.from, r.to).forEach(function(e) { all.push({ exp: e, store: s }); }); if (c) NF.expensesIn(s, c.from, c.to).forEach(function(e) { before.push({ exp: e, store: s }); }); });
    var total = sum(all, function(x) { return x.exp.amount; }), prevTotal = c ? sum(before, function(x) { return x.exp.amount; }) : null;
    var of = function(st) { return all.filter(function(x) { return x.exp.status === st; }); };
    var awaiting = of('Awaiting payment'), overdue = of('Overdue');
    var cats = groupSum(all, function(x) { return x.exp.category; }, function(x) { return x.exp.amount; });
    var prevCats = {};
    before.forEach(function(x) { prevCats[x.exp.category] = (prevCats[x.exp.category] || 0) + x.exp.amount; });
    var colors = ['#7180AC', '#E8A33D', '#2BA3E8', '#3CA66A', '#D9534F', '#9B6FD0', '#8A8F99'];
    var palette = {};
    NF.expenseCategories.forEach(function(k, i) { palette[k] = colors[i % colors.length]; });
    var rows = expenseRows(), shownTotal = sum(rows, 'amount');
    var counts = { all: all.length, 'Awaiting payment': awaiting.length, Overdue: overdue.length, Paid: all.length - awaiting.length - overdue.length };
    var gdim = { store: ['Store', function(x) { return x.store.name + ' · ' + x.store.city; }], city: ['City', function(x) { return x.store.city + ' / ' + x.store.state; }], region: ['Region', function(x) { return x.store.region; }],
      category: ['Category', function(x) { return x.exp.category; }], supplier: ['Supplier', function(x) { return x.exp.supplier; }] }[state.spend.group];
    var groups = {}, prevGroups = {};
    all.forEach(function(x) { var k = gdim[1](x); (groups[k] = groups[k] || { n: 0, v: 0 }); groups[k].n++; groups[k].v += x.exp.amount; });
    before.forEach(function(x) { var k = gdim[1](x); prevGroups[k] = (prevGroups[k] || 0) + x.exp.amount; });
    var gl = Object.keys(groups).sort(function(a, b) { return groups[b].v - groups[a].v; }).slice(0, 12);
    var goFor = { store: function(k) { return 'store=' + k; }, category: function(k) { return 'ecat=' + k; }, supplier: function(k) { return 'esup=' + k; } }[state.spend.group];
    body.innerHTML =
      '<div class="fin-kpis fin-kpis--four nf-kpis">' +
        kpiHtml('Operating expenses', money0(total), delta(total, prevTotal, 'spend') + ' · ' + plural(all.length, 'record'), '', 'estatus=all', '', state.exp.status === 'all') +
        kpiHtml('Awaiting payment', plural(awaiting.length, 'record'), money0(sum(awaiting, function(x) { return x.exp.amount; })), awaiting.length ? 'warning' : '', 'estatus=Awaiting payment', '', state.exp.status === 'Awaiting payment') +
        kpiHtml('Overdue', plural(overdue.length, 'record'), money0(sum(overdue, function(x) { return x.exp.amount; })), overdue.length ? 'danger' : '', 'estatus=Overdue', '', state.exp.status === 'Overdue') +
        kpiHtml('Largest category', cats.length ? esc(cats[0].name) : '—', cats.length ? money0(cats[0].value) + ' · ' + pct(cats[0].value / total * 100, 0) + ' of the total' : 'No expenses', '', cats.length ? 'ecat=' + cats[0].name : '') + '</div>' +
      '<div class="nf-duo"><section class="fin-card nf-card"><h3 class="fin-card__title">Composition by category</h3>' +
        (total ? '<div class="nf-stack" role="img" aria-label="Operating expenses by category">' + cats.map(function(k) { return '<span style="flex:' + k.value + ';background:' + palette[k.name] + '" title="' + esc(k.name) + ' · ' + money0(k.value) + '"></span>'; }).join('') + '</div>' +
        '<table class="pd-table nf-cattable"><thead><tr><th>Category</th><th>Amount</th><th>Share</th><th>vs ' + compareLabel() + '</th></tr></thead><tbody>' + cats.map(function(k) {
          return '<tr><td><button type="button" class="nf-inline" data-go="ecat=' + esc(k.name) + '"><i class="nf-dot" style="background:' + palette[k.name] + '"></i>' + esc(k.name) + '</button></td><td>' + money0(k.value) + '</td><td>' + pct(k.value / total * 100, 0) + '</td><td>' + (c ? changeCell(changePct(k.value, prevCats[k.name] || 0) , 'cost') : '—') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="nf-empty">No expenses in this period.</p>') + '</section>' +
      '<section class="fin-card nf-card"><div class="nf-card__head"><div><h3 class="fin-card__title">Group by</h3><p class="nf-card__sub">Top 12 by amount</p></div>' +
        '<div class="fin-seg" role="group" aria-label="Group by">' + [['store', 'Store'], ['city', 'City'], ['region', 'Region'], ['category', 'Category'], ['supplier', 'Supplier']].map(function(g) {
          return '<button type="button" class="fin-seg__btn' + (state.spend.group === g[0] ? ' fin-seg__btn--active' : '') + '" data-group="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div></div>' +
        (gl.length ? '<table class="pd-table"><thead><tr><th>' + gdim[0] + '</th><th>Records</th><th>Amount</th><th>Share</th><th>vs ' + compareLabel() + '</th></tr></thead><tbody>' + gl.map(function(k) {
          var g = groups[k];
          return '<tr><td>' + (goFor ? '<button type="button" class="nf-inline" data-go="' + esc(goFor(k)) + '">' + esc(k) + '</button>' : esc(k)) + '</td><td>' + g.n + '</td><td>' + money0(g.v) + '</td><td>' + pct(g.v / total * 100, 0) + '</td><td>' + (c ? changeCell(changePct(g.v, prevGroups[k] || 0), 'cost') : '—') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="nf-empty">No expenses in this period.</p>') + '</section></div>' +
      '<section class="fin-card nf-card"><div class="nf-card__head"><div><h3 class="fin-card__title">Expenses</h3><p class="nf-card__sub">' + plural(rows.length, 'record') + ' · ' + money0(shownTotal) + ' · click a row to see it</p></div>' +
        '<div class="nf-card__tools"><div class="products-search nf-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon><input type="text" id="nf-exp-search" class="products-search__input" placeholder="Search by supplier, description, category or store" autocomplete="off" value="' + esc(state.exp.query) + '"></div>' +
        '<div class="products-chips">' + statusChips({ attr: 'estatus', counts: counts }, state.exp.status) + '</div></div></div><div id="nf-exp-grid"></div></section>';
    ensureGrid('exp', function() {
      return new Grid({ host: 'nf-exp-grid', key: 'nf-exp-v1', sortKey: 'date', sortDir: -1, sticky: true, size: 50, empty: 'No expense matches the filters.', grow: 8, rows: expenseRows, onRow: openExpenseDrawer,
        onAction: function(e, row) { var d = e.target.closest('[data-doc-expense]'); if (d) download(row.exp.document.replace('.pdf', '.txt'), expenseText(row.exp, row.store)); },
        columns: [
          { key: 'date', label: 'Date', sort: true, width: 150, html: function(r) { return fmt(r.date); } },
          { key: 'storeName', label: 'Store', sort: true, width: 170, html: function(r) { return '<span class="products-clip">' + esc(r.storeName) + '</span>'; } },
          { key: 'category', label: 'Category', sort: true, width: 170, html: function(r) { return esc(r.category); } },
          { key: 'supplier', label: 'Supplier', sort: true, width: 210, html: function(r) { return esc(r.supplier); } },
          { key: 'description', label: 'Description', sort: true, width: 300, html: function(r) { return esc(r.description); } },
          { key: 'amount', label: 'Amount', sort: true, num: true, width: 140, html: function(r) { return money(r.amount); } },
          { key: 'due', label: 'Due Date', sort: true, width: 150, html: function(r) { return fmt(r.due); } },
          { key: 'status', label: 'Payment Status', sort: true, width: 150, html: function(r) { return statusBadge(r.status); } },
          { key: 'doc', label: 'Document', width: 190, html: function(r) { return '<button type="button" class="tt-add" data-doc-expense="1">' + esc(r.exp.document) + '</button>'; } }
        ] });
    }, 'e').render();
  }

  function renderSpend() {
    document.querySelectorAll('[data-spend]').forEach(function(b) {
      var on = b.getAttribute('data-spend') === state.spend.kind;
      b.classList.toggle('rq-subtab--active', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (state.spend.kind === 'purchase') renderPurchaseSpend(); else renderOpexSpend();
  }

  /* ---------- Labor ---------- */

  function laborRows() {
    var r = current(), c = comparison(r), depts = NF.departments.filter(function(d) { return extra.dept.shows(d); }), out = [], v = state.labor.view;
    function pack(label, place, dept, cur, prev, net, store) {
      return { store: store, name: label, place: place, dept: dept, regular: cur.regularHours, overtime: cur.overtimeHours, cost: cur.cost, pct: net ? cur.cost / net * 100 : null, change: prev ? changePct(cur.cost, prev.cost) : null, cur: cur };
    }
    function sumLab(list) { var t = { regularHours: 0, overtimeHours: 0, wages: 0, overtimePay: 0, benefits: 0, cost: 0 }; list.forEach(function(x) { Object.keys(t).forEach(function(k) { t[k] += x[k]; }); }); return t; }
    if (v === 'department') {
      var net = sum(scoped, function(s) { return NF.totals(s, r.from, r.to).net; });
      depts.forEach(function(d) {
        var cur = sumLab(scoped.map(function(s) { return NF.laborIn(s, d, r.from, r.to); })), prev = c ? sumLab(scoped.map(function(s) { return NF.laborIn(s, d, c.from, c.to); })) : null;
        out.push(pack('All stores (' + scoped.length + ')', '—', d, cur, prev, net, null));
      });
    } else {
      scoped.forEach(function(s) {
        var net = NF.totals(s, r.from, r.to).net;
        if (v === 'store') {
          var cur = sumLab(depts.map(function(d) { return NF.laborIn(s, d, r.from, r.to); })), prev = c ? sumLab(depts.map(function(d) { return NF.laborIn(s, d, c.from, c.to); })) : null;
          out.push(pack(s.name, s.city + ' / ' + s.state, depts.length === NF.departments.length ? 'All departments' : plural(depts.length, 'department'), cur, prev, net, s));
        } else {
          depts.forEach(function(d) { out.push(pack(s.name, s.city + ' / ' + s.state, d, NF.laborIn(s, d, r.from, r.to), c ? NF.laborIn(s, d, c.from, c.to) : null, net, s)); });
        }
      });
    }
    return out;
  }

  function laborHtml() {
    if (!can('labor')) {
      return '<section class="fin-card nf-lock"><lucide-icon name="lock" style="font-size:28px"></lucide-icon><h3>Labor cost is restricted</h3>' +
        '<p>Your access does not include labor cost. Ask the Finance team for access to see the cost of teams by store and department.</p>' +
        '<p class="nf-lock__note">Individual salaries and pay are never shown on this page, with or without access.</p></section>';
    }
    return '<div id="nf-labor-body"></div>';
  }

  function renderLabor() {
    el('nf-labor-wrap').innerHTML = laborHtml();
    if (!can('labor')) return;
    var r = current(), c = comparison(r), a = aggregate(scoped, r), b = c ? aggregate(scoped, c) : null, body = el('nf-labor-body');
    var depts = NF.departments.filter(function(d) { return extra.dept.shows(d); });
    var tot = { wages: 0, overtimePay: 0, benefits: 0, cost: 0, regularHours: 0, overtimeHours: 0 };
    var byDept = {};
    scoped.forEach(function(s) { depts.forEach(function(d) { var l = NF.laborIn(s, d, r.from, r.to); Object.keys(tot).forEach(function(k) { tot[k] += l[k]; }); byDept[d] = (byDept[d] || 0) + l.cost; }); });
    var prevTot = 0, prevReg = 0, prevOt = 0;
    if (c) scoped.forEach(function(s) { depts.forEach(function(d) { var l = NF.laborIn(s, d, c.from, c.to); prevTot += l.cost; prevReg += l.regularHours; prevOt += l.overtimeHours; }); });
    var net = a.net, prevNet = b ? b.net : null, share = net ? tot.cost / net * 100 : null, prevShare = prevNet ? prevTot / prevNet * 100 : null;
    var deptItems = Object.keys(byDept).sort(function(x, y) { return byDept[y] - byDept[x]; }).map(function(k) { return { name: k, value: byDept[k], go: 'dept=' + k, color: '#3CA66A' }; });
    var parts = [['Wages and regular hours', tot.wages, '#7180AC'], ['Overtime pay', tot.overtimePay, '#E8A33D'], ['Benefits and payroll charges', tot.benefits, '#3CA66A']];
    var rows = laborRows(), views = [['store', 'By store'], ['department', 'By department'], ['both', 'Store and department']];
    body.innerHTML =
      '<div class="fin-kpis nf-kpis">' +
        kpiHtml('Labor Cost', money0(tot.cost), delta(tot.cost, c ? prevTot : null, 'spend') + ' · ' + plural(a.stores, 'store'), '', '') +
        kpiHtml('Labor % of Net Sales', share == null ? '—' : pct(share), prevShare == null ? 'no data to compare' : '<span class="fin-delta fin-delta--' + (share <= prevShare ? 'good' : 'watch') + '">' + (share > prevShare ? '▲' : '▼') + ' ' + pct(Math.abs(share - prevShare)).replace('%', ' pt') + ' vs ' + compareLabel() + '</span>', '', '') +
        kpiHtml('Regular hours', int(tot.regularHours) + ' h', delta(tot.regularHours, c ? prevReg : null, 'spend'), '', '') +
        kpiHtml('Overtime hours', int(tot.overtimeHours) + ' h', delta(tot.overtimeHours, c ? prevOt : null, 'spend') + ' · ' + pct(tot.regularHours ? tot.overtimeHours / tot.regularHours * 100 : 0) + ' of regular hours', '', '') + '</div>' +
      '<div class="nf-duo"><section class="fin-card nf-card"><h3 class="fin-card__title">Cost by department</h3>' + (deptItems.length ? bars(deptItems, tot.cost) : '<p class="nf-empty">No department selected.</p>') + '</section>' +
        '<section class="fin-card nf-card nf-card--donut"><h3 class="fin-card__title">What the cost is made of</h3>' + donutHtml(parts, tot.cost) +
          '<table class="pd-table"><thead><tr><th>Component</th><th>Amount</th><th>Share</th></tr></thead><tbody>' + parts.map(function(p) { return '<tr><td><i class="nf-dot" style="background:' + p[2] + '"></i>' + p[0] + '</td><td>' + money0(p[1]) + '</td><td>' + pct(tot.cost ? p[1] / tot.cost * 100 : 0, 0) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<p class="np-form-note">Overtime is paid at ' + (NF.overtimeRate * 100).toFixed(0) + '% of the hourly wage and charges are ' + (NF.charges * 100).toFixed(0) + '% of wages and overtime. Individual pay is never shown.</p></section></div>' +
      '<section class="fin-card nf-card"><div class="nf-card__head"><div><h3 class="fin-card__title">Labor cost</h3><p class="nf-card__sub">Aggregated by store and department · no individual pay</p></div>' +
        '<div class="fin-seg" role="group" aria-label="View">' + views.map(function(v) { return '<button type="button" class="fin-seg__btn' + (state.labor.view === v[0] ? ' fin-seg__btn--active' : '') + '" data-laborview="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div></div><div id="nf-labor-grid"></div></section>';
    ensureGrid('labor', function() {
      return new Grid({ host: 'nf-labor-grid', key: 'nf-labor-v1', sortKey: 'cost', sortDir: -1, sticky: true, size: 50, empty: 'No labor data for the filters.', grow: 7, rows: laborRows,
        onRow: function(row) { if (row.store) openStoreDrawer(row.store); else state.tab !== 'labor' || (extra.dept.set([row.dept]), renderAll()); },
        columns: [
          { key: 'name', label: 'Store', sort: true, width: 190, html: function(r) { return '<span class="products-clip">' + esc(r.name) + '</span>'; } },
          { key: 'place', label: 'City / State', sort: true, width: 190, html: function(r) { return '<span class="products-clip">' + esc(r.place) + '</span>'; } },
          { key: 'dept', label: 'Department', sort: true, width: 190, html: function(r) { return esc(r.dept); } },
          { key: 'regular', label: 'Regular Hours', sort: true, num: true, width: 140, html: function(r) { return int(r.regular) + ' h'; } },
          { key: 'overtime', label: 'Overtime Hours', sort: true, num: true, width: 150, html: function(r) { return int(r.overtime) + ' h'; } },
          { key: 'cost', label: 'Labor Cost', sort: true, num: true, width: 140, html: function(r) { return money0(r.cost); } },
          { key: 'pct', label: 'Labor % of Net Sales', sort: true, num: true, width: 170, html: function(r) { return pctCell(r.pct, 17, 15); } },
          { key: 'change', label: 'Change vs. ' + compareLabel(), sort: true, num: true, width: 190, html: function(r) { return changeCell(r.change, 'cost'); } }
        ] });
    }, 'l').render();
  }

  /* ---------- reports ---------- */

  var REPORTS = [
    ['stores', 'Financial report by store'], ['compare', 'Store comparison'], ['categories', 'Spend by category'], ['suppliers', 'Spend by supplier'],
    ['pending', 'Pending and overdue invoices'], ['labor', 'Labor cost by store and department']
  ];

  function reportData(kind) {
    var r = current(), c = comparison(r), L = can('labor'), notes = [], head, rows = [];
    if (!scoped.length) notes.push('No store matches the filters: the report is empty.');
    var noBudget = scoped.filter(function(s) { return !s.hasBudget; }).length;
    if (kind === 'stores' || kind === 'compare') {
      if (!L) notes.push('Labor cost is left out: your access does not include it, so totals cover purchase spend and operating expenses only.');
      if (noBudget && L) notes.push(plural(noBudget, 'store') + ' have no budget registered: their budget columns are empty and they are left out of budget variance.');
      notes.push('Net sales are registered sales, not cash received. Spend is by invoice or expense date, not by payment.');
    }
    if (kind === 'stores') {
      head = ['Store', 'City', 'State', 'Region', 'Net Sales', 'Purchase Spend', 'Operating Expenses'].concat(L ? ['Labor Cost'] : []).concat(['Total Cost'], L ? ['Budget', 'Budget Variance'] : []);
      scoped.forEach(function(s) {
        var t = NF.totals(s, r.from, r.to);
        rows.push([s.name, s.city, s.state, s.region, t.net.toFixed(2), t.purchase.toFixed(2), t.opex.toFixed(2)].concat(L ? [t.labor.toFixed(2)] : []).concat([(L ? t.cost : t.purchase + t.opex).toFixed(2)],
          L ? [t.budget == null ? '' : t.budget.toFixed(2), t.budget == null ? '' : (t.cost - t.budget).toFixed(2)] : []));
      });
    } else if (kind === 'compare') {
      var list = comparisonRows();
      head = ['Store', 'City / State', 'Net Sales', 'Purchase Spend', 'Purchases % of Net Sales', 'Operating Expenses', 'Expenses % of Net Sales'].concat(L ? ['Labor Cost', 'Labor % of Net Sales'] : [])
        .concat(['Total Cost', 'Total Cost % of Net Sales', 'Net Sales change %', 'Costs change %'], L ? ['Budget Variance %'] : [], ['Status']);
      list.forEach(function(x) {
        var f = function(v) { return v == null ? '' : v.toFixed(2); };
        rows.push([x.name, x.place, x.net.toFixed(2), x.purchase.toFixed(2), f(x.purchasePct), x.opex.toFixed(2), f(x.opexPct)].concat(L ? [x.labor.toFixed(2), f(x.laborPct)] : [])
          .concat([x.cost.toFixed(2), f(x.costPct), f(x.netChange), f(x.costChange)], L ? [f(x.budgetVar)] : [], [x.status.all.join('; ') || 'On track']));
      });
      if (!c) notes.push('There is no data for the comparison period, so the change columns are empty.');
    } else if (kind === 'categories') {
      head = ['Type', 'Category', 'Amount', 'Share of type %'];
      var pm = {}, em = {};
      scoped.forEach(function(s) {
        NF.invoicesIn(s, r.from, r.to).forEach(function(i) { Object.keys(i._byDept).forEach(function(d) { pm[d] = (pm[d] || 0) + i._byDept[d]; }); });
        NF.expensesIn(s, r.from, r.to).forEach(function(e) { em[e.category] = (em[e.category] || 0) + e.amount; });
      });
      [['Purchase Spend (product category)', pm], ['Operating Expenses (expense category)', em]].forEach(function(g) {
        var tot = 0; Object.keys(g[1]).forEach(function(k) { tot += g[1][k]; });
        Object.keys(g[1]).sort(function(a, b) { return g[1][b] - g[1][a]; }).forEach(function(k) { rows.push([g[0], k, g[1][k].toFixed(2), (tot ? g[1][k] / tot * 100 : 0).toFixed(1)]); });
      });
    } else if (kind === 'suppliers') {
      head = ['Type', 'Supplier', 'Records', 'Amount', 'Share of type %'];
      var ps = {}, es = {};
      scoped.forEach(function(s) {
        NF.invoicesIn(s, r.from, r.to).forEach(function(i) { (ps[i.supplier] = ps[i.supplier] || { n: 0, v: 0 }); ps[i.supplier].n++; ps[i.supplier].v += i.total; });
        NF.expensesIn(s, r.from, r.to).forEach(function(e) { (es[e.supplier] = es[e.supplier] || { n: 0, v: 0 }); es[e.supplier].n++; es[e.supplier].v += e.amount; });
      });
      [['Product supplier (invoices)', ps], ['Service supplier (expenses)', es]].forEach(function(g) {
        var tot = 0; Object.keys(g[1]).forEach(function(k) { tot += g[1][k].v; });
        Object.keys(g[1]).sort(function(a, b) { return g[1][b].v - g[1][a].v; }).forEach(function(k) { rows.push([g[0], k, g[1][k].n, g[1][k].v.toFixed(2), (tot ? g[1][k].v / tot * 100 : 0).toFixed(1)]); });
      });
    } else if (kind === 'pending') {
      head = ['Type', 'Date', 'Store', 'Supplier', 'Number or description', 'Amount', 'Due Date', 'Payment Status'];
      scoped.forEach(function(s) {
        NF.invoicesIn(s, r.from, r.to).forEach(function(i) { if (i.status !== 'Paid') rows.push(['Purchase invoice', iso(i.date), s.name, i.supplier, i.number, i.total.toFixed(2), iso(i.due), i.status]); });
        NF.expensesIn(s, r.from, r.to).forEach(function(e) { if (e.status !== 'Paid') rows.push(['Operating expense', iso(e.date), s.name, e.supplier, e.description, e.amount.toFixed(2), iso(e.due), e.status]); });
      });
      rows.sort(function(a, b) { return (a[7] === 'Overdue' ? 0 : 1) - (b[7] === 'Overdue' ? 0 : 1) || a[6].localeCompare(b[6]); });
      notes.push('Only records not yet paid are listed. Their status is the one registered today.');
    } else {
      head = ['Store', 'City', 'State', 'Department', 'Regular Hours', 'Overtime Hours', 'Labor Cost', 'Labor % of Net Sales'];
      scoped.forEach(function(s) {
        var net = NF.totals(s, r.from, r.to).net;
        NF.departments.filter(function(d) { return extra.dept.shows(d); }).forEach(function(d) {
          var l = NF.laborIn(s, d, r.from, r.to);
          rows.push([s.name, s.city, s.state, d, l.regularHours.toFixed(1), l.overtimeHours.toFixed(1), l.cost.toFixed(2), net ? (l.cost / net * 100).toFixed(2) : '']);
        });
      });
      notes.push('Aggregated by store and department. Individual pay is not part of this report.');
    }
    if (!rows.length) notes.push('No rows for the selected period and filters: the data is incomplete or empty.');
    return { head: head, rows: rows, notes: notes };
  }

  function reportMeta(kind) {
    var r = current(), c = comparison(r), name = REPORTS.filter(function(x) { return x[0] === kind; })[0][1];
    return [['Report', name], ['Period', r.label + ' (' + iso(r.from) + ' to ' + iso(r.to) + ')'], ['Compared with', c ? compareLabel() + ' (' + iso(c.from) + ' to ' + iso(c.to) + ')' : 'No comparison data'],
      ['Scope', plural(scoped.length, 'store') + ' of ' + NF.stores.length], ['Filters', filterSummary()], ['Viewing as', state.access === 'finance' ? 'Finance team' : 'Operations team (labor restricted)'], ['Generated on', new Date().toLocaleString('en-GB')]];
  }

  function reportCsv(kind) {
    var d = reportData(kind), q = function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var lines = reportMeta(kind).map(function(m) { return q(m[0]) + ',' + q(m[1]); });
    d.notes.forEach(function(n) { lines.push(q('Note') + ',' + q(n)); });
    lines.push('');
    lines.push(d.head.map(q).join(','));
    d.rows.forEach(function(row) { lines.push(row.map(q).join(',')); });
    return '﻿' + lines.join('\n');
  }

  function reportPdf(kind) {
    var d = reportData(kind), meta = reportMeta(kind);
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(meta[0][1]) + '</title><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:11px;color:#1d1d1f;margin:24px}h1{font-size:18px;margin:0 0 8px}' +
      'dl{display:grid;grid-template-columns:130px 1fr;gap:2px 12px;margin:0 0 12px}dt{color:#6e6e73}dd{margin:0}.note{margin:4px 0;color:#8a5a00}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:4px 6px;border-bottom:1px solid #e0e0e4;text-align:left}th{background:#f3f3f3}</style></head><body>' +
      '<h1>' + esc(meta[0][1]) + '</h1><dl>' + meta.slice(1).map(function(m) { return '<dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd>'; }).join('') + '</dl>' +
      d.notes.map(function(n) { return '<p class="note">Note: ' + esc(n) + '</p>'; }).join('') +
      '<table><thead><tr>' + d.head.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      d.rows.slice(0, 1500).map(function(row) { return '<tr>' + row.map(function(v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      (d.rows.length > 1500 ? '<p class="note">Showing the first 1.500 of ' + int(d.rows.length) + ' rows. Use CSV for the full list.</p>' : '') + '</body></html>';
    var frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    frame.contentDocument.open(); frame.contentDocument.write(html); frame.contentDocument.close();
    setTimeout(function() { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(function() { frame.remove(); }, 2000); }, 300);
  }

  function openReportDrawer() {
    var r = current();
    openDrawer(drawerShell('Generate report',
      '<p class="np-form-note">The report uses the period, comparison and filters now active: <strong>' + esc(scopeLabel()) + '</strong> · ' + esc(filterSummary()) + '. It includes the period, scope, filters and generation date, and says when data is incomplete.</p>' +
      '<form class="emp-form" id="nf-report-form" novalidate>' +
        '<label class="emp-form__field emp-form__field--wide">Report<select name="kind" class="form-select form-select--stylized">' + REPORTS.map(function(x) {
          var locked = x[0] === 'labor' && !can('labor');
          return '<option value="' + x[0] + '"' + (locked ? ' disabled' : '') + '>' + x[1] + (locked ? ' (no access)' : '') + '</option>'; }).join('') + '</select></label>' +
        '<fieldset class="emp-form__field emp-form__field--wide nf-format"><legend>Format</legend><label><input type="radio" name="format" value="csv" checked> CSV (opens in a spreadsheet)</label><label><input type="radio" name="format" value="pdf"> PDF (opens the print dialog: choose Save as PDF)</label></fieldset>' +
        '<div class="emp-form__actions"><button type="submit" class="btn btn--primary btn--medium">Generate</button></div></form>'));
  }

  /* ---------- page ---------- */

  function filterBarHtml() {
    return '<div class="nf-top"><div class="rq-subtabs nf-subtabs" role="tablist"><button type="button" class="rq-subtab" role="tab" data-nftab="overview">Overview</button><button type="button" class="rq-subtab" role="tab" data-nftab="spend">Spend</button><button type="button" class="rq-subtab" role="tab" data-nftab="labor">Labor</button></div><div id="nf-compare-host"></div></div>' +
      '<div class="nf-filters"><div class="nf-geo">' +
      '<div class="form-group products-area" id="nf-region"></div><div class="form-group products-area" id="nf-state"></div><div class="form-group products-area" id="nf-city"></div><div class="form-group products-area" id="nf-store"></div>' +
      '<button type="button" class="btn btn--secondary btn--small" id="nf-clear">Clear filters</button></div><div id="nf-period"></div></div>' +
      '<div id="nf-extra" class="nf-extra nf-extra--bar"></div>';
  }

  function extraHtml() {
    var t = state.tab, k = state.spend.kind;
    el('nf-extra').innerHTML = (t === 'spend' ? (k === 'purchase' ? '<span class="form-group products-area" data-extra="pcat"></span><span class="form-group products-area" data-extra="psup"></span>' :
      '<span class="form-group products-area" data-extra="ecat"></span><span class="form-group products-area" data-extra="esup"></span>') : '') + (t === 'labor' && can('labor') ? '<span class="form-group products-area" data-extra="dept"></span>' : '');
    document.querySelectorAll('[data-extra]').forEach(function(host) { var m = extra[host.getAttribute('data-extra')]; host.appendChild(m.host); });
  }

  function makeExtra(key, options, label) {
    var host = document.createElement('div');
    host.className = 'nf-extra__host';
    extra[key] = window.MultiSelect.create(host, { options: options, label: label, onChange: function() { grids.pur && grids.pur.resetPage(); grids.exp && grids.exp.resetPage(); grids.labor && grids.labor.resetPage(); renderBody(); } });
    extra[key].host = host;
  }

  function supplierOptions(kind) {
    var set = {};
    NF.stores.slice(0, 8).forEach(function(s) { if (kind === 'p') NF.invoicesIn(s, NF.firstDay, NF.today).forEach(function(i) { set[i.supplier] = 1; }); else NF.expensesIn(s, NF.firstDay, NF.today).forEach(function(e) { set[e.supplier] = 1; }); });
    return Object.keys(set).sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  function headerStatus() {
    // The period and the stores only: today's date is in the top bar, and "(to date)" and "data up to" said the same thing twice
    var parts = scopeLabel().replace(' (to date)', '').split(' · ');
    el('nf-subtitle').innerHTML = parts.map(function(t) { return '<span class="nf-header__item">' + esc(t) + '</span>'; }).join('');
  }

  function renderBody() {
    updateScope();
    headerStatus();
    document.querySelectorAll('[data-tab-panel]').forEach(function(p) { p.hidden = p.getAttribute('data-tab-panel') !== state.tab; });
    document.querySelectorAll('[data-nftab]').forEach(function(b) {
      var on = b.getAttribute('data-nftab') === state.tab;
      b.classList.toggle('rq-subtab--active', on);
      b.setAttribute('aria-selected', String(on));
    });
    el('nf-clear').hidden = !filtersActive();
    if (state.tab === 'overview') renderOverview();
    else if (state.tab === 'spend') renderSpend();
    else renderLabor();
  }

  function renderAll() {
    el('nf-period').innerHTML = periodHtml();
    el('nf-compare-host').innerHTML = compareHtml();
    extraHtml();
    renderBody();
  }

  function clearFilters() {
    geo.region.setOptions(uniq(NF.stores, function(s) { return s.region; })); geo.region.set(uniq(NF.stores, function(s) { return s.region; }));
    geo.state.setOptions(uniq(NF.stores, function(s) { return s.state; })); geo.state.set(uniq(NF.stores, function(s) { return s.state; }));
    geo.city.setOptions(uniq(NF.stores, function(s) { return s.city; })); geo.city.set(uniq(NF.stores, function(s) { return s.city; }));
    var stores = uniq(NF.stores, function(s) { return s.name + ' · ' + s.city; });
    geo.store.setOptions(stores); geo.store.set(stores);
    Object.keys(extra).forEach(function(k) { extra[k].set(allOf(k)); });
    state.pur.status = 'all'; state.exp.status = 'all'; state.pur.query = ''; state.exp.query = ''; state.cmp.quick = 'all'; state.cmp.query = '';
    var s1 = el('nf-cmp-search'); if (s1) s1.value = '';
    Object.keys(grids).forEach(function(k) { grids[k].resetPage(); });
    renderAll();
  }

  function allOf(k) {
    if (k === 'dept') return NF.departments;
    if (k === 'ecat') return NF.expenseCategories;
    if (k === 'esup') return supplierOptions('e');
    if (k === 'psup') return supplierOptions('p');
    return deptNames();
  }

  function deptNames() { return NF.departments; }

  /** A shortcut written as "tab=labor", "spend=opex", "psup=Name", "store=Name · City"... */
  function go(spec) {
    var i = spec.indexOf('='), k = spec.slice(0, i), v = spec.slice(i + 1);
    if (k === 'tab') { state.tab = v; renderAll(); return; }
    if (k === 'spend') { state.tab = 'spend'; state.spend.kind = v; renderAll(); return; }
    if (k === 'overdue') { state.tab = 'spend'; state.spend.kind = 'purchase'; state.pur.status = 'Overdue'; grids.pur && grids.pur.resetPage(); renderAll(); return; }
    if (k === 'sort') { state.cmp.focus = v === 'budgetVar' ? 'budget' : 'net'; grids.cmp && grids.cmp.sortBy(v, -1); renderBody(); el('nf-cmp-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (k === 'pstatus') { state.tab = 'spend'; state.spend.kind = 'purchase'; state.pur.status = v; renderAll(); return; }
    if (k === 'estatus') { state.tab = 'spend'; state.spend.kind = 'opex'; state.exp.status = v; renderAll(); return; }
    if (k === 'transit') { openTransitDrawer(); return; }
    if (k === 'store') { geo.store.set([v]); closeDrawer(); renderAll(); return; }
    if (extra[k]) { extra[k].set([v]); if (k === 'dept') state.tab = 'labor'; renderAll(); return; }
  }

  function init() {
    var root = el('network-finance');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    root.innerHTML = filterBarHtml() +
      '<div data-tab-panel="overview">' + overviewHtml() + '</div><div data-tab-panel="spend" hidden>' + spendHtml() + '</div><div data-tab-panel="labor" hidden>' + '<div id="nf-labor-wrap"></div>' + '</div>' +
      '<div class="drawer-overlay" id="nf-drawer"><div class="drawer drawer--right product-drawer"></div></div>';

    var p = state.period; var r0 = rangeOf('month', NF.today); p.from = r0.from; p.to = r0.to;
    var regions = uniq(NF.stores, function(s) { return s.region; }), states = uniq(NF.stores, function(s) { return s.state; }), cities = uniq(NF.stores, function(s) { return s.city; }), storeNames = uniq(NF.stores, function(s) { return s.name + ' · ' + s.city; });
    var mk = function(id, opts, label, from) { return window.MultiSelect.create(el(id), { options: opts, label: label, onChange: function() { if (from) cascade(from); Object.keys(grids).forEach(function(k) { grids[k].resetPage(); }); renderBody(); } }); };
    geo.region = mk('nf-region', regions, 'regions', 'region'); geo.state = mk('nf-state', states, 'states', 'state'); geo.city = mk('nf-city', cities, 'cities', 'city'); geo.store = mk('nf-store', storeNames, 'stores', 'store');
    makeExtra('pcat', NF.departments, 'categories'); makeExtra('psup', supplierOptions('p'), 'suppliers'); makeExtra('ecat', NF.expenseCategories, 'categories'); makeExtra('esup', supplierOptions('e'), 'suppliers'); makeExtra('dept', NF.departments, 'departments');
    updateScope();
    renderAll();

    root.addEventListener('click', function(e) {
      var t = e.target;
      var b;
      if ((b = t.closest('[data-period]'))) {
        var type = b.getAttribute('data-period'), cur = current();
        if (type === 'custom') { p.type = 'custom'; p.from = cur.from; p.to = cur.to; p.error = ''; } else { p.type = type; p.anchor = type === 'custom' ? p.anchor : (state.period.type === 'custom' ? cur.to : p.anchor); }
        Object.keys(grids).forEach(function(k) { grids[k].resetPage(); }); renderAll(); return;
      }
      if ((b = t.closest('[data-shift]'))) { shift(+b.getAttribute('data-shift')); renderAll(); return; }
      if ((b = t.closest('[data-nftab]'))) { state.tab = b.getAttribute('data-nftab'); renderAll(); return; }
      if ((b = t.closest('[data-spend]'))) { state.spend.kind = b.getAttribute('data-spend'); renderAll(); return; }
      if ((b = t.closest('[data-go]'))) { go(b.getAttribute('data-go')); return; }
      if ((b = t.closest('[data-series]'))) { var s = b.getAttribute('data-series'); state.trend.on[s] = !state.trend.on[s]; renderTrend(); return; }
      if ((b = t.closest('[data-gran]'))) { state.trend.gran = b.getAttribute('data-gran'); renderTrend(); return; }
      if ((b = t.closest('[data-cmpquick]'))) { var q = b.getAttribute('data-cmpquick'); state.cmp.quick = state.cmp.quick === q ? 'all' : q; grids.cmp && grids.cmp.resetPage(); renderOverview(); el('nf-clear').hidden = !filtersActive(); return; }
      if ((b = t.closest('[data-pstatus]'))) { var ps = b.getAttribute('data-pstatus'); state.pur.status = state.pur.status === ps && ps !== 'all' ? 'all' : ps; grids.pur && grids.pur.resetPage(); renderBody(); return; }
      if ((b = t.closest('[data-estatus]'))) { var es = b.getAttribute('data-estatus'); state.exp.status = state.exp.status === es && es !== 'all' ? 'all' : es; grids.exp && grids.exp.resetPage(); renderBody(); return; }
      if ((b = t.closest('[data-group]'))) { state.spend.group = b.getAttribute('data-group'); renderBody(); return; }
      if ((b = t.closest('[data-laborview]'))) { state.labor.view = b.getAttribute('data-laborview'); grids.labor && grids.labor.resetPage(); renderBody(); return; }
      if (t.closest('#nf-clear')) { clearFilters(); return; }
      if (t.closest('[data-close-drawer]') || t.id === 'nf-drawer') { closeDrawer(); return; }
      if ((b = t.closest('[data-doc-invoice]')) && b.getAttribute('data-doc-invoice').indexOf('|') > -1) {
        var ids = b.getAttribute('data-doc-invoice').split('|'), st = NF.byCode[ids[1]], inv = NF.invoicesIn(st, NF.firstDay, NF.today).filter(function(i) { return i.id === ids[0]; })[0];
        if (inv) download('invoice-' + inv.number + '.txt', invoiceText(inv, st));
        return;
      }
      if ((b = t.closest('[data-doc-expense]')) && b.getAttribute('data-doc-expense').indexOf('|') > -1) {
        var ie = b.getAttribute('data-doc-expense').split('|'), se = NF.byCode[ie[1]], ex = NF.expensesIn(se, NF.firstDay, NF.today).filter(function(x) { return x.id === ie[0]; })[0];
        if (ex) download(ex.document.replace('.pdf', '.txt'), expenseText(ex, se));
      }
    });
    root.addEventListener('change', function(e) {
      if (e.target.id === 'nf-compare') { state.compare = e.target.value; renderAll(); }
    });
    root.addEventListener('input', function(e) {
      if (e.target.id === 'nf-cmp-search') { state.cmp.query = e.target.value.trim(); grids.cmp && grids.cmp.resetPage(); grids.cmp.render(); el('nf-clear').hidden = !filtersActive(); }
      else if (e.target.id === 'nf-pur-search') { state.pur.query = e.target.value.trim(); grids.pur.resetPage(); grids.pur.render(); updateCaption('pur'); }
      else if (e.target.id === 'nf-exp-search') { state.exp.query = e.target.value.trim(); grids.exp.resetPage(); grids.exp.render(); updateCaption('exp'); }
    });
    root.addEventListener('submit', function(e) {
      e.preventDefault();
      if (e.target.hasAttribute('data-custom')) {
        var f = parseIso(e.target.elements.from.value), t = parseIso(e.target.elements.to.value);
        if (!f || !t) p.error = 'Enter both dates.'; else if (f > t) p.error = 'The start date must be before the end date.'; else if (f < NF.firstDay || t > NF.today) p.error = 'There is data from ' + fmt(NF.firstDay) + ' to ' + fmt(NF.today) + '.';
        else { p.error = ''; p.from = f; p.to = t; }
        renderAll();
      } else if (e.target.id === 'nf-report-form') {
        var kind = e.target.elements.kind.value, format = e.target.elements.format.value, name = 'finance-' + kind + '-' + iso(current().from) + '-' + iso(current().to);
        if (format === 'csv') { download(name + '.csv', reportCsv(kind), 'text/csv;charset=utf-8'); toast('CSV report generated.'); } else { reportPdf(kind); toast('Choose Save as PDF in the print dialog.'); }
        closeDrawer();
      }
    });
    el('nf-chart').addEventListener('mousemove', chartMove);
    el('nf-chart').addEventListener('mouseleave', function() { var t = el('nf-chart').querySelector('.nf-tip'), c = el('nf-chart').querySelector('.nf-cursor'); if (t) t.hidden = true; if (c) c.hidden = true; });
    el('nf-chart').addEventListener('click', chartClick);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDrawer(); });

    // Header: who is looking, and the report
    el('nf-access').addEventListener('change', function(e) { state.access = e.target.value; Object.keys(grids).forEach(function(k) { delete grids[k]; }); renderAll(); });
    el('nf-report').addEventListener('click', openReportDrawer);
  }

  function updateCaption(which) {
    var rows = grids[which].rows(), card = el('nf-' + (which === 'pur' ? 'pur' : 'exp') + '-grid').closest('.fin-card'), sub = card && card.querySelector('.nf-card__sub');
    if (sub) sub.textContent = plural(rows.length, which === 'pur' ? 'invoice' : 'record') + ' · ' + money0(sum(rows, which === 'pur' ? 'total' : 'amount')) + ' · click a row to see ' + (which === 'pur' ? 'its items' : 'it');
  }

  function safeInit() {
    try { init(); } catch (err) { console.error('Network finance init failed:', err); }
  }

  if (document.readyState === 'loading') document.addEventListener('davinci:canvas:ready', safeInit); else safeInit();
})();
