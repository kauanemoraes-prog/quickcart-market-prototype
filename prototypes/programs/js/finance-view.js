/**
 * Finance View
 * The Revenue and Purchase Spend tabs of the store page. Both share one period selector (day, week, month, quarter, year
 * or a custom range), so changing the period in one tab changes it in the other.
 *
 *   Revenue         summary of the period, and a table of sales by date and sales channel (a row opens into the channels).
 *                   Individual receipts are not listed: there are too many, the data can be exported.
 *   Purchase Spend  summary of what was bought for resale, purchase orders on their way, and a table of supplier invoices;
 *                   an invoice opens in a drawer with the products received, taxes and the attached document.
 */

(function() {
  'use strict';

  var TYPES = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year'], ['custom', 'Custom']];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var PAGE = 1e9;   // every invoice of the period is listed; the table scrolls
  var REV_WIDTHS = [340, 200, 140, 170, 150, 150, 170];
  var PUR_WIDTHS = [190, 230, 140, 120, 110, 160, 190, 170, 130];
  var STATUS_TONE = { 'Paid': 'success', 'Awaiting payment': 'warning', 'Overdue': 'danger' };

  var period = { type: 'month', anchor: null, from: null, to: null, error: '' };
  var rev = { open: {} };
  var pur = { query: '', quick: 'all', limit: PAGE, current: null };
  var resizers = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function money(n) { return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function int(n) { return n.toLocaleString('pt-BR'); }

  function site() { return window.Dropdowns.getCurrentSite(); }

  function fmt(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  function fmtShort(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()]; }

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function parseIso(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function addDays(d, n) { return window.FinanceData.addDays(d, n); }

  function minDate(a, b) { return a < b ? a : b; }

  function days(from, to) { return Math.round((to - from) / 86400000) + 1; }

  /* ---------- the period ---------- */

  /** [from, to] of the period containing `anchor`, and a label. The end is cut at the reference date (no sales in the future). */
  function rangeOf(type, anchor) {
    var today = window.FinanceData.today, y = anchor.getFullYear(), m = anchor.getMonth(), from, to, label;
    if (type === 'day') { from = to = anchor; label = WEEKDAYS[anchor.getDay()] + ', ' + fmt(anchor); }
    else if (type === 'week') {
      from = addDays(anchor, -((anchor.getDay() + 6) % 7)); to = addDays(from, 6);
      label = fmtShort(from) + ' – ' + fmt(to);
    } else if (type === 'month') { from = new Date(y, m, 1); to = new Date(y, m + 1, 0); label = MONTHS[m] + ' ' + y; }
    else if (type === 'quarter') { var q = Math.floor(m / 3); from = new Date(y, q * 3, 1); to = new Date(y, q * 3 + 3, 0); label = 'Q' + (q + 1) + ' ' + y; }
    else { from = new Date(y, 0, 1); to = new Date(y, 11, 31); label = String(y); }
    var clipped = to > today;
    return { from: from, to: minDate(to, today), label: label + (clipped && type !== 'day' ? ' (to date)' : '') };
  }

  function current() {
    if (period.type === 'custom') return { from: period.from, to: period.to, label: fmt(period.from) + ' – ' + fmt(period.to) };
    return rangeOf(period.type, period.anchor);
  }

  /** The period just before, as long as this one, to compare with. */
  function previous(r) {
    var n = days(r.from, r.to);
    if (period.type === 'month') { var m = new Date(r.from.getFullYear(), r.from.getMonth() - 1, 1); return { from: m, to: addDays(m, Math.min(n, new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()) - 1) }; }
    if (period.type === 'quarter') { var q = new Date(r.from.getFullYear(), r.from.getMonth() - 3, 1); return { from: q, to: addDays(q, n - 1) }; }
    if (period.type === 'year') { var y = new Date(r.from.getFullYear() - 1, 0, 1); return { from: y, to: addDays(y, n - 1) }; }
    return { from: addDays(r.from, -n), to: addDays(r.from, -1) };
  }

  function shift(dir) {
    var a = period.anchor, t = period.type;
    if (t === 'day') period.anchor = addDays(a, dir);
    else if (t === 'week') period.anchor = addDays(a, 7 * dir);
    else if (t === 'month') period.anchor = new Date(a.getFullYear(), a.getMonth() + dir, 1);
    else if (t === 'quarter') period.anchor = new Date(a.getFullYear(), a.getMonth() + 3 * dir, 1);
    else period.anchor = new Date(a.getFullYear() + dir, 0, 1);
  }

  /** Last day of the whole period that contains `anchor` (even the part after the reference date). */
  function fullEnd(type, a) {
    if (type === 'day') return a;
    if (type === 'week') return addDays(a, 6 - ((a.getDay() + 6) % 7));
    if (type === 'month') return new Date(a.getFullYear(), a.getMonth() + 1, 0);
    if (type === 'quarter') return new Date(a.getFullYear(), Math.floor(a.getMonth() / 3) * 3 + 3, 0);
    return new Date(a.getFullYear(), 11, 31);
  }

  function periodBarHtml() {
    var r = current(), today = window.FinanceData.today;
    var canNext = period.type !== 'custom' && fullEnd(period.type, period.anchor) < today;
    var seg = TYPES.map(function(t) {
      var on = period.type === t[0];
      return '<button type="button" class="fin-seg__btn' + (on ? ' fin-seg__btn--active' : '') + '" data-period="' + t[0] + '" aria-pressed="' + on + '">' + t[1] + '</button>';
    }).join('');
    var nav = period.type === 'custom'
      ? '<form class="fin-custom" data-custom novalidate><label>From<input type="date" name="from" class="form-input" value="' + iso(period.from) + '" min="' + iso(window.FinanceData.firstDay) + '" max="' + iso(today) + '"></label>' +
        '<label>To<input type="date" name="to" class="form-input" value="' + iso(period.to) + '" min="' + iso(window.FinanceData.firstDay) + '" max="' + iso(today) + '"></label>' +
        '<button type="submit" class="btn btn--primary btn--medium">Apply</button><span class="fin-custom__error"' + (period.error ? '' : ' hidden') + '>' + esc(period.error) + '</span></form>'
      : '<div class="fin-nav"><button type="button" class="fin-nav__btn" data-shift="-1" aria-label="Previous period"><lucide-icon name="chevron-left" style="font-size:16px"></lucide-icon></button>' +
        '<span class="fin-nav__label">' + esc(r.label) + '</span>' +
        '<button type="button" class="fin-nav__btn" data-shift="1" aria-label="Next period"' + (canNext ? '' : ' disabled') + '><lucide-icon name="chevron-right" style="font-size:16px"></lucide-icon></button></div>';
    return '<div class="fin-period"><div class="fin-seg" role="group" aria-label="Period">' + seg + '</div>' + nav +
      (period.type === 'custom' ? '<span class="fin-period__range">' + esc(r.label) + '</span>' : '') + '</div>';
  }

  /* ---------- shared pieces ---------- */

  function delta(now, before, lowerIsBetter) {
    if (!before) return '<span class="fin-delta fin-delta--flat">no data before</span>';
    var pct = (now - before) / before * 100;
    if (Math.abs(pct) < 0.05) return '<span class="fin-delta fin-delta--flat">no change</span>';
    var good = lowerIsBetter ? pct < 0 : pct > 0;
    return '<span class="fin-delta fin-delta--' + (good ? 'good' : 'bad') + '">' + (pct > 0 ? '▲' : '▼') + ' ' + Math.abs(pct).toFixed(1).replace('.', ',') + '% vs previous period</span>';
  }

  function kpi(label, value, note, tone) {
    return '<div class="fin-kpi' + (tone ? ' fin-kpi--' + tone : '') + '"><span class="fin-kpi__label">' + label + '</span><strong class="fin-kpi__value">' + value + '</strong><span class="fin-kpi__note">' + note + '</span></div>';
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
  }

  function resizeTable(key, root, widths) {
    if (resizers[key]) return;
    resizers[key] = window.TableResize.create(root.querySelector('table'), { key: key, defaults: widths, grow: 1 });
    resizers[key].refresh();
  }

  /* ---------- Revenue ---------- */

  function granularity(r) {
    var n = days(r.from, r.to);
    if (period.type === 'day') return 'channel';
    if (period.type === 'week' || period.type === 'month') return 'day';
    if (period.type === 'quarter') return 'week';
    if (period.type === 'year') return 'month';
    return n <= 62 ? 'day' : (n <= 200 ? 'week' : 'month');
  }

  function buckets(r, g) {
    var out = [], d = r.from;
    while (d <= r.to) {
      var end;
      if (g === 'day' || g === 'channel') end = d;
      else if (g === 'week') end = minDate(addDays(d, 6 - ((d.getDay() + 6) % 7)), r.to);
      else end = minDate(new Date(d.getFullYear(), d.getMonth() + 1, 0), r.to);
      var label = g === 'day' || g === 'channel' ? WEEKDAYS[d.getDay()] + ', ' + fmt(d) :
        g === 'week' ? (days(d, end) === 7 ? 'Week of ' + fmtShort(d) : fmtShort(d) + ' – ' + fmtShort(end)) : MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      out.push({ key: iso(d), label: label, from: d, to: end });
      d = addDays(end, 1);
    }
    return out;
  }

  function numCells(t, bold) {
    return '<td class="fin-cell fin-cell--num">' + int(t.transactions) + '</td><td class="fin-cell fin-cell--num">' + money(t.gross) + '</td>' +
      '<td class="fin-cell fin-cell--num">' + money(t.discounts) + '</td><td class="fin-cell fin-cell--num">' + money(t.returns) + '</td>' +
      '<td class="fin-cell fin-cell--num fin-cell--net">' + money(t.net) + '</td>';
  }

  function revenueRows(r) {
    var g = granularity(r), s = site(), rows = [], csv = [['Date', 'Sales Channel', 'Transactions', 'Gross Sales', 'Discounts', 'Returns', 'Net Sales']];
    var line = function(label, channel, t) { csv.push([label, channel, t.transactions, t.gross.toFixed(2), t.discounts.toFixed(2), t.returns.toFixed(2), t.net.toFixed(2)]); };
    buckets(r, g).forEach(function(b) {
      var sales = window.FinanceData.salesBetween(s, b.from, b.to);
      if (g === 'channel') {
        sales.channels.forEach(function(c) {
          rows.push('<tr class="fin-row"><td class="fin-cell">' + esc(b.label) + '</td><td class="fin-cell">' + esc(c.channel) + '</td>' + numCells(c.t) + '</tr>');
          line(b.label, c.channel, c.t);
        });
        return;
      }
      var open = !!rev.open[b.key];
      rows.push('<tr class="fin-row fin-row--parent"><td class="fin-cell"><button type="button" class="fin-toggle' + (open ? ' fin-toggle--open' : '') + '" data-day="' + b.key + '" aria-expanded="' + open + '" aria-label="Show the sales channels of ' + esc(b.label) + '"><lucide-icon name="chevron-down" style="font-size:14px"></lucide-icon></button>' + esc(b.label) + '</td>' +
        '<td class="fin-cell">All channels</td>' + numCells(sales.total) + '</tr>');
      line(b.label, 'All channels', sales.total);
      sales.channels.forEach(function(c) { line(b.label, c.channel, c.t); });
      if (open) sales.channels.forEach(function(c) {
        rows.push('<tr class="fin-row fin-row--child"><td class="fin-cell fin-cell--child"></td><td class="fin-cell">' + esc(c.channel) + '</td>' + numCells(c.t) + '</tr>');
      });
    });
    var total = window.FinanceData.salesBetween(s, r.from, r.to).total;
    rows.push('<tr class="fin-row fin-row--total"><td class="fin-cell">Total</td><td class="fin-cell">All channels</td>' + numCells(total) + '</tr>');
    line('Total', 'All channels', total);
    return { html: rows.join(''), csv: csv, note: g === 'channel' ? 'One row per sales channel' : 'One row per ' + g + ' · open a row to see its sales channels' };
  }

  function renderRevenue() {
    var view = document.getElementById('revenue-view');
    if (!view || !view.dataset.ready) return;
    var r = current(), p = previous(r), s = site(), cur = window.FinanceData.salesBetween(s, r.from, r.to).total, prev = window.FinanceData.salesBetween(s, p.from, p.to).total;
    var basket = cur.transactions ? cur.net / cur.transactions : 0, prevBasket = prev.transactions ? prev.net / prev.transactions : 0;
    document.getElementById('revenue-period').innerHTML = periodBarHtml();
    document.getElementById('revenue-kpis').innerHTML =
      kpi('Gross Sales', money(cur.gross), delta(cur.gross, prev.gross)) +
      kpi('Discounts', money(cur.discounts), delta(cur.discounts, prev.discounts, true)) +
      kpi('Returns', money(cur.returns), delta(cur.returns, prev.returns, true)) +
      kpi('Net Sales', money(cur.net), delta(cur.net, prev.net), 'main') +
      kpi('Transactions', int(cur.transactions), delta(cur.transactions, prev.transactions)) +
      kpi('Average Basket', money(basket), delta(basket, prevBasket));
    var rows = revenueRows(r);
    document.getElementById('revenue-body').innerHTML = rows.html;
    view._csv = rows.csv;
    view._label = r.label;
  }

  function buildRevenue(view) {
    view.dataset.ready = '1';
    view.innerHTML =
      '<div class="fin-period-row"><div id="revenue-period"></div>' +
        '<button type="button" class="btn btn--secondary btn--small" data-export><lucide-icon name="download" style="font-size:14px"></lucide-icon> Export data</button></div>' +
      '<div class="fin-kpis" id="revenue-kpis"></div>' +
      '<div class="table-container products-container"><table class="table table--finance"><thead class="table__head"><tr class="table__row">' +
        ['Date', 'Sales Channel', 'Transactions', 'Gross Sales', 'Discounts', 'Returns', 'Net Sales'].map(function(h, i) { return '<th class="table__header' + (i > 1 ? ' fin-cell--num' : '') + '">' + h + '</th>'; }).join('') +
      '</tr></thead><tbody class="table__body" id="revenue-body"></tbody></table></div>';
    resizeTable('revenue-v2', view, REV_WIDTHS);
    view.addEventListener('click', function(e) {
      var day = e.target.closest('[data-day]');
      if (day) { var k = day.getAttribute('data-day'); if (rev.open[k]) delete rev.open[k]; else rev.open[k] = true; renderRevenue(); return; }
      if (e.target.closest('[data-export]')) {
        var csv = view._csv.map(function(row) { return row.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
        download('revenue-' + site().storeCode + '-' + iso(current().from) + '-' + iso(current().to) + '.csv', csv, 'text/csv');
      }
    });
  }

  /* ---------- Purchase Spend ---------- */

  function invoiceMatches(i) {
    if (pur.quick === 'awaiting' && i.status !== 'Awaiting payment') return false;
    if (pur.quick === 'overdue' && i.status !== 'Overdue') return false;
    if (pur.quick === 'paid' && i.status !== 'Paid') return false;
    var q = pur.query;
    return !q || [i.supplier, i.number, i.po].some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
  }

  function invoiceText(i) {
    var out = ['INVOICE ' + i.number, 'Supplier: ' + i.supplier, 'Purchase order: ' + i.po, 'Invoice date: ' + fmt(i.date), 'Due date: ' + fmt(i.due), '', 'Items received:'];
    i.lines.forEach(function(l) { out.push('  ' + l.qty + ' ' + l.unit + ' x ' + l.brand + ' ' + l.product + ' (' + l.variant + ', ' + l.size + ')  ' + money(l.amount)); });
    out.push('', 'Subtotal: ' + money(i.subtotal), 'Taxes: ' + money(i.tax), 'Total: ' + money(i.total), '', 'Sample document generated for the prototype.');
    return out.join('\n');
  }

  function invoiceRow(i) {
    return '<tr class="table__row products-row" data-invoice="' + i.id + '" tabindex="0">' +
      '<td class="fin-cell">' + fmt(i.date) + '</td><td class="fin-cell">' + esc(i.supplier) + '</td><td class="fin-cell fin-cell--mono">' + i.number + '</td>' +
      '<td class="fin-cell fin-cell--mono">' + i.po + '</td><td class="fin-cell">' + plural(i.products, 'product') + '</td>' +
      '<td class="fin-cell fin-cell--num">' + money(i.total) + '</td><td class="fin-cell">' + fmt(i.due) + '</td>' +
      '<td class="fin-cell"><span class="ov-badge ov-badge--' + STATUS_TONE[i.status] + '">' + i.status + '</span></td>' +
      '<td class="fin-cell"><button type="button" class="tt-add" data-doc="' + i.id + '">Invoice.txt</button></td></tr>';
  }

  function renderPurchases() {
    var view = document.getElementById('purchase-view');
    if (!view || !view.dataset.ready) return;
    var r = current(), p = previous(r), s = site(), fd = window.FinanceData;
    var list = fd.invoicesBetween(s, r.from, r.to), before = fd.invoicesBetween(s, p.from, p.to);
    var sum = function(a) { return a.reduce(function(n, i) { return n + i.total; }, 0); };
    var of = function(status) { return list.filter(function(i) { return i.status === status; }); };
    var awaiting = of('Awaiting payment'), overdue = of('Overdue'), transit = window.StoreOverview ? window.StoreOverview.ordersFor(s) : [];
    document.getElementById('purchase-period').innerHTML = periodBarHtml();
    document.getElementById('purchase-kpis').innerHTML =
      kpi('Total purchased', money(sum(list)), delta(sum(list), sum(before), true) + ' · ' + plural(list.length, 'invoice'), 'main') +
      kpi('Invoices awaiting payment', plural(awaiting.length, 'invoice'), money(sum(awaiting)), awaiting.length ? 'warning' : '') +
      kpi('Overdue invoices', plural(overdue.length, 'invoice'), money(sum(overdue)), overdue.length ? 'danger' : '') +
      kpi('Purchase orders in transit', String(transit.length), 'on their way today', '');
    renderInvoiceTable(list);
  }

  function renderInvoiceTable(list) {
    list = list || window.FinanceData.invoicesBetween(site(), current().from, current().to);
    var counts = { all: list.length, awaiting: 0, overdue: 0, paid: 0 };
    list.forEach(function(i) { counts[i.status === 'Paid' ? 'paid' : (i.status === 'Overdue' ? 'overdue' : 'awaiting')]++; });
    document.getElementById('purchase-chips').innerHTML = [['all', 'All invoices'], ['awaiting', 'Awaiting payment'], ['overdue', 'Overdue'], ['paid', 'Paid']].map(function(x) {
      return '<button type="button" class="products-chip' + (pur.quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (pur.quick === x[0]) + '">' + x[1] + ' <strong>' + counts[x[0]] + '</strong></button>';
    }).join('');
    var shown = list.filter(invoiceMatches).sort(function(a, b) { return b.date - a.date || a.id.localeCompare(b.id); });
    document.getElementById('purchase-body').innerHTML = shown.slice(0, pur.limit).map(invoiceRow).join('') ||
      '<tr class="table__row"><td class="fin-cell products-empty" colspan="9">No invoices in this period.</td></tr>';
  }

  /* ---------- the invoice drawer ---------- */

  function drawerHtml(i) {
    var rows = i.lines.map(function(l) {
      return '<tr><td>' + esc((l.brand === 'Loose' ? '' : l.brand + ' ') + l.product) + '<br><small>' + esc(l.variant + ' · ' + l.size + ' · ' + l.sku) + '</small></td><td>' + l.qty + ' ' + l.unit + '</td><td>' + money(l.unitCost) +
        '</td><td>' + (l.rate ? Math.round(l.rate * 100) + '% · ' + money(l.tax) : 'Exempt') + '</td><td>' + money(l.amount) + '</td></tr>';
    }).join('');
    var dl = function(pairs) { return '<dl class="pd-grid">' + pairs.map(function(p) { return '<div class="pd-grid__item"><dt>' + p[0] + '</dt><dd>' + p[1] + '</dd></div>'; }).join('') + '</dl>'; };
    var sec = function(t, b) { return '<section class="pd-section"><h4 class="pd-section__title">' + t + '</h4>' + b + '</section>'; };
    return '<div class="drawer__header"><button class="drawer__close" id="invoice-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">' + esc(i.supplier) + ' — ' + i.number + '</h3></div><div class="drawer__body">' +
      sec('Invoice', dl([['Supplier', esc(i.supplier)], ['Invoice number', i.number], ['Purchase order', i.po], ['Payment status', '<span class="ov-badge ov-badge--' + STATUS_TONE[i.status] + '">' + i.status + '</span>'],
        ['Invoice date', fmt(i.date)], ['Due date', fmt(i.due)], ['Payment terms', plural(days(i.date, i.due) - 1, 'day')], ['Received', plural(i.products, 'product') + ' · ' + int(i.units) + ' units']])) +
      sec('Products received', '<table class="pd-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit cost</th><th>Tax</th><th>Amount</th></tr></thead><tbody>' + rows + '</tbody></table>') +
      sec('Totals', dl([['Subtotal', money(i.subtotal)], ['Taxes', money(i.tax)], ['Total amount', '<strong>' + money(i.total) + '</strong>']])) +
      sec('Document', '<p class="pd-note">' + i.number + '.txt · attached by the supplier</p><button type="button" class="btn btn--secondary btn--small" data-doc="' + i.id + '"><lucide-icon name="download" style="font-size:14px"></lucide-icon> Download</button>') +
      '</div>';
  }

  function invoiceById(id) {
    return window.FinanceData.allInvoices(site()).filter(function(i) { return i.id === id; })[0];
  }

  function openInvoice(id) {
    var i = invoiceById(id);
    if (!i) return;
    var o = document.getElementById('invoice-drawer');
    o.querySelector('.drawer').innerHTML = drawerHtml(i);
    o.classList.add('drawer-overlay--open');
    pur.current = id;
  }

  function closeInvoice() {
    var o = document.getElementById('invoice-drawer');
    if (o) o.classList.remove('drawer-overlay--open');
    pur.current = null;
  }

  function buildPurchases(view) {
    view.dataset.ready = '1';
    view.innerHTML =
      '<div id="purchase-period"></div><div class="fin-kpis fin-kpis--four" id="purchase-kpis"></div>' +
      '<div class="products-toolbar"><div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
        '<input type="text" id="purchase-search" class="products-search__input" placeholder="Search by supplier, invoice number or purchase order" autocomplete="off"></div>' +
        '<div class="products-chips" id="purchase-chips"></div></div>' +
      '<div class="table-container products-container"><table class="table table--finance"><thead class="table__head"><tr class="table__row">' +
        ['Invoice Date', 'Supplier', 'Invoice Number', 'Purchase Order', 'Items', 'Total Amount', 'Due Date', 'Payment Status', 'Documents'].map(function(h, i) { return '<th class="table__header' + (i === 5 ? ' fin-cell--num' : '') + '">' + h + '</th>'; }).join('') +
      '</tr></thead><tbody class="table__body" id="purchase-body"></tbody></table></div>' +

      '<div class="drawer-overlay" id="invoice-drawer"><div class="drawer drawer--right product-drawer"></div></div>';
    resizeTable('purchases-v2', view, PUR_WIDTHS);
    view.addEventListener('input', function(e) {
      if (e.target.id !== 'purchase-search') return;
      pur.query = e.target.value.trim().toLowerCase();
      pur.limit = PAGE;
      renderInvoiceTable();
    });
    view.addEventListener('click', function(e) {
      var doc = e.target.closest('[data-doc]');
      if (doc) { e.stopPropagation(); var inv = invoiceById(doc.getAttribute('data-doc')); if (inv) download(inv.number + '.txt', invoiceText(inv)); return; }
      var chip = e.target.closest('[data-quick]');
      if (chip) { var k = chip.getAttribute('data-quick'); pur.quick = pur.quick === k ? 'all' : k; pur.limit = PAGE; renderInvoiceTable(); return; }
      if (e.target.closest('#purchase-more')) { pur.limit += PAGE; renderInvoiceTable(); return; }
      if (e.target.closest('#invoice-drawer-close') || e.target.id === 'invoice-drawer') { closeInvoice(); return; }
      var row = e.target.closest('[data-invoice]');
      if (row) openInvoice(row.getAttribute('data-invoice'));
    });
    view.addEventListener('keydown', function(e) {
      var row = e.target.closest && e.target.closest('[data-invoice]');
      if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openInvoice(row.getAttribute('data-invoice')); }
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && pur.current) closeInvoice(); });
  }

  /* ---------- wiring ---------- */

  function renderAll() {
    renderRevenue();
    renderPurchases();
  }

  function onPeriodClick(e) {
    var t = e.target.closest('[data-period]');
    if (t) {
      var type = t.getAttribute('data-period'), r = current();
      if (type === 'custom') { period.from = r.from; period.to = r.to; period.error = ''; }
      else if (period.type === 'custom') period.anchor = r.to;
      period.type = type;
      pur.limit = PAGE;
      renderAll();
      return;
    }
    var s = e.target.closest('[data-shift]');
    if (s && !s.disabled) { shift(+s.getAttribute('data-shift')); pur.limit = PAGE; renderAll(); }
  }

  function onPeriodSubmit(e) {
    if (!e.target.hasAttribute('data-custom')) return;
    e.preventDefault();
    var f = parseIso(e.target.elements.from.value), t = parseIso(e.target.elements.to.value), fd = window.FinanceData;
    if (!f || !t) period.error = 'Choose both dates.';
    else if (f > t) period.error = 'The start date must be before the end date.';
    else if (t > fd.today || f < fd.firstDay) period.error = 'Dates go from ' + fmt(fd.firstDay) + ' to ' + fmt(fd.today) + '.';
    else if (days(f, t) > 366) period.error = 'The range can have at most one year.';
    else { period.error = ''; period.from = f; period.to = t; }
    pur.limit = PAGE;
    renderAll();
  }

  function showSub(name) {
    document.querySelectorAll('[data-fin-tab]').forEach(function(b) {
      var on = b.getAttribute('data-fin-tab') === name;
      b.classList.toggle('rq-subtab--active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    ['revenue', 'purchase-spend'].forEach(function(id) { var p = document.getElementById(id); if (p) p.hidden = id !== name; });
    if (window.StickyTables && window.StickyTables.fit) window.StickyTables.fit();
  }

  window.FinanceView = {
    init: function() {
      var rv = document.getElementById('revenue-view'), pv = document.getElementById('purchase-view');
      period.anchor = window.FinanceData.today;
      if (rv) { buildRevenue(rv); rv.addEventListener('click', onPeriodClick); rv.addEventListener('submit', onPeriodSubmit); }
      if (pv) { buildPurchases(pv); pv.addEventListener('click', onPeriodClick); pv.addEventListener('submit', onPeriodSubmit); }
      document.querySelectorAll('[data-fin-tab]').forEach(function(b) { b.addEventListener('click', function() { showSub(b.getAttribute('data-fin-tab')); }); });
      renderAll();
      // Dropdowns update the current city / store first (their listeners were attached earlier)
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', function() { rev.open = {}; closeInvoice(); renderAll(); });
      });
    },
    render: renderAll,
    /** Opens the Finance tab on one of its sub-tabs ('revenue' or 'purchase-spend'). */
    show: function(name) {
      var tab = document.querySelector('.tabs__tab[data-tab="finance"]');
      if (tab && !tab.classList.contains('tabs__tab--active')) tab.click();
      showSub(name);
    }
  };
})();
