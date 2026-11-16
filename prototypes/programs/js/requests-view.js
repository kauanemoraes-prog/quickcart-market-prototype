/**
 * Requests View
 * The Requests tab of the store page: purchase requests for products, and for equipment and consumables, in two sub-tabs.
 * Every table has what is needed to decide on a purchase (what, how much, how much it costs, why, who asked and when it is
 * needed) and a column fixed on the right with Accept and Reject. The status chips give the history of the requests
 * (Pending, Approved, Ordered, Delivered, Rejected), and a request opens in a drawer with its full status history.
 */

(function() {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var STATUSES = ['Pending', 'Approved', 'Ordered', 'Delivered', 'Rejected'];
  var STATUS_TONE = { 'Pending': 'warning', 'Approved': 'info', 'Ordered': 'info', 'Delivered': 'success', 'Rejected': 'danger', 'Requested': 'muted' };
  var PRIORITY_TONE = { 'Urgent': 'danger', 'High': 'warning', 'Normal': 'muted' };
  var REJECT_REASONS = ['Enough stock in the backroom', 'Over the monthly budget', 'Duplicate of another request', 'Wait for the next promotion cycle', 'Other'];

  // Each column: key, label, starting width, numeric (right-aligned), and how its cell is written
  var COMMON_TAIL = [
    { label: 'Reason', width: 270, cell: function(r) { return esc(r.reason); } },
    { label: 'Priority', sort: function(r) { return ['Urgent', 'High', 'Normal'].indexOf(r.priority); }, width: 120, cell: function(r) { return badge(r.priority, PRIORITY_TONE[r.priority]); } },
    { label: 'Requested by', sort: function(r) { return r.requestedBy.name; }, width: 230, cell: function(r) { return '<span class="rq-two">' + esc(r.requestedBy.name) + '<small>' + esc(r.requestedBy.role) + '</small></span>'; } },
    { label: 'Requested on', sort: function(r) { return r.requestedOn; }, width: 200, cell: function(r) { return fmt(r.requestedOn); } },
    { label: 'Needed by', sort: function(r) { return r.neededBy; }, width: 200, cell: function(r) {
      var late = r.status === 'Pending' && r.neededBy < window.RequestsData.today;
      return '<span class="' + (late ? 'rq-late' : '') + '">' + fmt(r.neededBy) + (late ? ' · overdue' : '') + '</span>';
    } }
  ];
  var TABLES = {
    products: {
      key: 'requests-products-v4',
      columns: [
        { label: 'Request ID', sort: function(r) { return r.id; }, width: 130, mono: true, cell: function(r) { return r.id; } },
        { label: 'Product', sort: function(r) { return r.title; }, width: 201, cell: function(r) { return '<span class="rq-two"><strong>' + esc(r.title) + '</strong><small>' + esc(r.detail) + '</small></span>'; } },
        { label: 'Area name', sort: function(r) { return r.area; }, width: 160, cell: function(r) { return esc(r.area); } },
        { label: 'Status', sort: function(r) { return STATUSES.indexOf(r.status); }, width: 130, cell: function(r) { return badge(r.status, STATUS_TONE[r.status]); } },
        { label: 'SKU', sort: function(r) { return r.sku; }, width: 170, mono: true, cell: function(r) { return esc(r.sku); } },
        { label: 'Supplier', sort: function(r) { return r.supplier; }, width: 200, cell: function(r) { return esc(r.supplier); } },
        { label: 'Quantity', sort: function(r) { return r.qty; }, width: 130, num: true, cell: function(r) { return r.qty + ' ' + r.unit; } },
        { label: 'Unit cost', sort: function(r) { return r.unitCost; }, width: 130, num: true, cell: function(r) { return money(r.unitCost); } },
        { label: 'Total cost', sort: function(r) { return r.total; }, width: 150, num: true, cell: function(r) { return '<strong>' + money(r.total) + '</strong>'; } },
        { label: 'Stock now / min', sort: function(r) { return r.stockNow; }, width: 150, num: true, cell: function(r) { return r.stockNow + ' / ' + r.stockMin; } }
      ].concat(COMMON_TAIL)
    },
    supplies: {
      key: 'requests-supplies-v4',
      columns: [
        { label: 'Request ID', sort: function(r) { return r.id; }, width: 130, mono: true, cell: function(r) { return r.id; } },
        { label: 'Item', sort: function(r) { return r.title; }, width: 195, cell: function(r) { return '<strong>' + esc(r.title) + '</strong>'; } },
        { label: 'Type', sort: function(r) { return r.type; }, width: 130, cell: function(r) { return '<span class="tt-chip tt-chip--' + r.type.toLowerCase() + '">' + r.type + '</span>'; } },
        { label: 'Area name', sort: function(r) { return r.area; }, width: 180, cell: function(r) { return esc(r.area); } },
        { label: 'Status', sort: function(r) { return STATUSES.indexOf(r.status); }, width: 130, cell: function(r) { return badge(r.status, STATUS_TONE[r.status]); } },
        { label: 'Related issue', sort: function(r) { return r.related || ''; }, width: 270, cell: function(r) { return r.related ? esc(r.related) : '<span class="products-none">—</span>'; } },
        { label: 'Supplier', sort: function(r) { return r.supplier; }, width: 220, cell: function(r) { return esc(r.supplier); } },
        { label: 'Quantity', sort: function(r) { return r.qty; }, width: 130, num: true, cell: function(r) { return r.qty + ' ' + r.unit; } },
        { label: 'Unit cost', sort: function(r) { return r.unitCost; }, width: 130, num: true, cell: function(r) { return money(r.unitCost); } },
        { label: 'Total cost', sort: function(r) { return r.total; }, width: 150, num: true, cell: function(r) { return '<strong>' + money(r.total) + '</strong>'; } },
        { label: 'In stock now', sort: function(r) { return r.stockNow; }, width: 140, num: true, cell: function(r) { return String(r.stockNow); } }
      ].concat(COMMON_TAIL)
    }
  };

  // The Actions column fits its two buttons: 12px on the left, the buttons (about 136px) and 8px on the right
  var ACTIONS_WIDTH = 156;
  var state = { sort: { products: null, supplies: null }, tab: 'products', query: '', status: 'Pending', urgent: false, current: null, rejecting: null };
  var resizers = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function badge(text, tone) { return '<span class="ov-badge ov-badge--' + tone + '">' + esc(text) + '</span>'; }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function money(n) { return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function fmt(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  function site() { return window.Dropdowns.getCurrentSite(); }

  function program() { return window.Dropdowns.getCurrentProgram(); }

  function listOf(tab) { return tab === 'products' ? window.RequestsData.products(site(), program()) : window.RequestsData.supplies(site(), program()); }

  function matches(r) {
    // The Urgent button shows what is waiting for a decision and was marked urgent, whatever the status button says
    if (state.urgent ? !(r.status === 'Pending' && r.priority === 'Urgent') : (state.status !== 'All' && r.status !== state.status)) return false;
    var q = state.query;
    return !q || [r.id, r.title, r.detail, r.sku, r.area, r.supplier, r.related, r.requestedBy.name, r.reason].some(function(v) { return String(v || '').toLowerCase().indexOf(q) !== -1; });
  }

  /* ---------- table ---------- */

  function actionsCell(r) {
    if (r.status === 'Pending') {
      return '<div class="rq-actions"><button type="button" class="btn btn--primary btn--small" data-accept="' + r.id + '">Accept</button>' +
        '<button type="button" class="btn btn--secondary btn--small rq-reject" data-reject="' + r.id + '">Reject</button></div>';
    }
    var last = r.history[r.history.length - 1];
    return '<span class="rq-decided">' + esc(last.status) + ' on ' + fmt(last.date) + '</span>';
  }

  function rowHtml(r, columns) {
    return '<tr class="table__row rq-row" data-request="' + r.id + '" tabindex="0">' + columns.map(function(c) {
      return '<td class="rq-cell' + (c.num ? ' rq-cell--num' : '') + (c.mono ? ' rq-cell--mono' : '') + '">' + c.cell(r) + '</td>';
    }).join('') + '<td class="rq-cell rq-cell--actions">' + actionsCell(r) + '</td></tr>';
  }

  function renderTable(tab) {
    var cfg = TABLES[tab], by = state.sort[tab], col = by && cfg.columns[by.index], list = listOf(tab).filter(matches).sort(function(a, b) {
      if (col) {
        var x = col.sort(a), y = col.sort(b);
        var c = typeof x === 'string' ? x.localeCompare(y) : x - y;
        if (c) return c * by.dir;
      }
      return (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || b.requestedOn - a.requestedOn || a.id.localeCompare(b.id);
    });
    document.getElementById('rq-body-' + tab).innerHTML = list.map(function(r) { return rowHtml(r, cfg.columns); }).join('') ||
      '<tr class="table__row"><td class="rq-cell rq-empty" colspan="' + (cfg.columns.length + 1) + '">No requests ' + (state.urgent ? 'urgent and pending ' : (state.status === 'All' ? '' : 'with status ' + state.status.toLowerCase() + ' ')) + 'match your filters.</td></tr>';
  }

  function headHtml(cfg) {
    return cfg.columns.map(function(c, i) { return '<th class="table__header' + (c.num ? ' rq-cell--num' : '') + (c.sort ? ' sortable' : '') + '"' + (c.sort ? ' data-sort="' + i + '"' : '') + '>' + c.label + (c.sort ? '<span class="products-sort">⇅</span>' : '') + '</th>'; }).join('') + '<th class="table__header rq-cell--actions">Actions</th>';
  }

  /* ---------- summary, sub-tabs and chips ---------- */

  function sum(list) { return list.reduce(function(n, r) { return n + r.total; }, 0); }

  function renderChips() {
    var list = listOf(state.tab), urgent = list.filter(function(r) { return r.status === 'Pending' && r.priority === 'Urgent'; }).length;
    var count = function(s) { return s === 'All' ? list.length : list.filter(function(r) { return r.status === s; }).length; };
    var chip = function(s) {
      return '<button type="button" class="products-chip' + (!state.urgent && state.status === s ? ' products-chip--active' : '') + '" data-status="' + s + '" aria-pressed="' + (!state.urgent && state.status === s) + '">' + s + ' <strong>' + count(s) + '</strong></button>';
    };
    var sep = '<span class="rq-chip-sep" role="separator" aria-orientation="vertical"></span>';
    // The decision (All, Pending, Approved, Rejected), then what happens after approval (Ordered, Delivered), then the urgent ones
    document.getElementById('rq-chips').innerHTML = ['All', 'Pending', 'Approved', 'Rejected'].map(chip).join('') + sep + ['Ordered', 'Delivered'].map(chip).join('') + sep +
      '<button type="button" class="products-chip rq-chip-urgent' + (state.urgent ? ' products-chip--active' : '') + '" data-urgent aria-pressed="' + state.urgent + '" title="Requests waiting for a decision that were marked urgent">Urgent <strong>' + urgent + '</strong></button>';
  }

  function renderSubtabs() {
    ['products', 'supplies'].forEach(function(t) {
      var pending = listOf(t).filter(function(r) { return r.status === 'Pending'; }).length;
      var b = document.querySelector('[data-rq-tab="' + t + '"]');
      b.classList.toggle('rq-subtab--active', state.tab === t);
      b.setAttribute('aria-selected', state.tab === t ? 'true' : 'false');
      b.querySelector('.rq-subtab__count').textContent = pending;
      document.getElementById('rq-wrap-' + t).hidden = state.tab !== t;
    });
  }

  /** The count on the Requests tab itself: everything still waiting for a decision. */
  function updateTabBadge() {
    var badgeEl = document.getElementById('pcn-tab-badge');
    if (!badgeEl) return;
    var pending = listOf('products').concat(listOf('supplies')).filter(function(r) { return r.status === 'Pending'; });
    badgeEl.textContent = pending.length;
    badgeEl.classList.toggle('pcn-tab-badge--alert', pending.some(function(r) { return r.priority === 'Urgent'; }));
  }

  function render() {
    var view = document.getElementById('requests-view');
    if (!view || !view.dataset.ready) return;
    renderSubtabs();
    renderChips();
    renderTable('products');
    renderTable('supplies');
    updateTabBadge();
    if (state.current) openDrawer(state.current);
  }

  /* ---------- drawer ---------- */

  function find(id) { return listOf('products').concat(listOf('supplies')).filter(function(r) { return r.id === id; })[0]; }

  function timeline(r) {
    return '<ol class="rq-timeline">' + r.history.map(function(e) {
      return '<li class="rq-timeline__item rq-timeline__item--' + STATUS_TONE[e.status] + '"><span class="rq-timeline__dot"></span><div><strong>' + e.status + '</strong>' +
        '<span>' + esc(e.by) + (e.role ? ' · ' + esc(e.role) : '') + '</span>' + (e.note ? '<span>' + esc(e.note) + '</span>' : '') + '</div><time>' + fmt(e.date) + '</time></li>';
    }).join('') + '</ol>';
  }

  function drawerHtml(r) {
    var dl = function(pairs) { return '<dl class="pd-grid">' + pairs.map(function(p) { return '<div class="pd-grid__item"><dt>' + p[0] + '</dt><dd>' + (p[1] === '' ? '—' : p[1]) + '</dd></div>'; }).join('') + '</dl>'; };
    var sec = function(t, b) { return '<section class="pd-section"><h4 class="pd-section__title">' + t + '</h4>' + b + '</section>'; };
    var product = r.kind === 'product';
    var what = product
      ? [['Product', esc(r.title)], ['Brand · variant · size', esc(r.detail)], ['SKU', esc(r.sku)], ['Area name', esc(r.area)], ['Pack', esc(r.packLabel)], ['Stock now / minimum', r.stockNow + ' / ' + r.stockMin]]
      : [['Item', esc(r.title)], ['Type', r.type], ['Area name', esc(r.area)], ['Related issue', esc(r.related)], ['In stock now', String(r.stockNow)]];
    var actions = r.status === 'Pending'
      ? '<div class="rq-drawer-actions"><button type="button" class="btn btn--primary btn--medium" data-accept="' + r.id + '">Accept request</button><button type="button" class="btn btn--secondary btn--medium rq-reject" data-reject="' + r.id + '">Reject</button></div>' : '';
    return '<div class="drawer__header"><button class="drawer__close" id="request-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">' + r.id + ' — ' + esc(r.title) + '</h3></div><div class="drawer__body">' +
      sec('Request', dl([['Status', badge(r.status, STATUS_TONE[r.status])], ['Priority', badge(r.priority, PRIORITY_TONE[r.priority])]].concat(what).concat([['Reason', esc(r.reason)]]))) +
      sec('Purchase', dl([['Supplier', esc(r.supplier)], ['Quantity', r.qty + ' ' + r.unit], ['Unit cost', money(r.unitCost)], ['Total cost', '<strong>' + money(r.total) + '</strong>']])) +
      sec('Who and when', dl([['Requested by', esc(r.requestedBy.name) + ' · ' + esc(r.requestedBy.role)], ['Requested on', fmt(r.requestedOn)], ['Needed by', fmt(r.neededBy)]])) +
      sec('Status history', timeline(r)) + actions + '</div>';
  }

  function openDrawer(id) {
    var r = find(id);
    if (!r) { closeDrawer(); return; }
    var o = document.getElementById('request-drawer');
    o.querySelector('.drawer').innerHTML = drawerHtml(r);
    o.classList.add('drawer-overlay--open');
    state.current = id;
  }

  function closeDrawer() {
    var o = document.getElementById('request-drawer');
    if (o) o.classList.remove('drawer-overlay--open');
    state.current = null;
  }

  /* ---------- decisions ---------- */

  function notify(message) {
    if (typeof window.showNotification === 'function') window.showNotification('success', message);
  }

  function accept(id) {
    var r = find(id);
    if (!r || !window.RequestsData.decide(site(), program(), id, 'Approved')) return;
    render();
    notify(r.id + ' approved: ' + r.title + ', ' + money(r.total) + '.');
  }

  function openReject(id) {
    var r = find(id);
    if (!r) return;
    state.rejecting = id;
    var d = document.getElementById('request-reject');
    d.querySelector('.rq-dialog').innerHTML = '<h3 class="rq-dialog__title">Reject ' + r.id + '?</h3><p class="rq-dialog__text">' + esc(r.title) + ' · ' + money(r.total) + ' · requested by ' + esc(r.requestedBy.name) + '</p>' +
      '<label class="rq-dialog__field">Reason<select id="reject-reason" class="form-select form-select--stylized">' + REJECT_REASONS.map(function(x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></label>' +
      '<label class="rq-dialog__field">Note for the requester (optional)<textarea id="reject-note" class="form-input" rows="2"></textarea></label>' +
      '<div class="rq-dialog__actions"><button type="button" class="btn btn--secondary btn--medium" data-reject-cancel>Cancel</button><button type="button" class="btn btn--primary btn--medium" data-reject-confirm>Reject request</button></div>';
    d.hidden = false;
    d.querySelector('select').focus();
  }

  function closeReject() {
    document.getElementById('request-reject').hidden = true;
    state.rejecting = null;
  }

  function confirmReject() {
    var id = state.rejecting, reason = document.getElementById('reject-reason').value, note = document.getElementById('reject-note').value.trim();
    var r = find(id);
    closeReject();
    if (!r || !window.RequestsData.decide(site(), program(), id, 'Rejected', reason + (note ? ' · ' + note : ''))) return;
    render();
    notify(r.id + ' rejected.');
  }

  /* ---------- wiring ---------- */

  function build(view) {
    view.dataset.ready = '1';
    var table = function(tab) {
      return '<div class="table-container products-container rq-container" id="rq-wrap-' + tab + '"><table class="table table--requests"><thead class="table__head"><tr class="table__row">' + headHtml(TABLES[tab]) +
        '</tr></thead><tbody class="table__body" id="rq-body-' + tab + '"></tbody></table></div>';
    };
    view.innerHTML =
      '<div class="rq-subtabs" role="tablist" aria-label="Kind of request">' +
        '<button type="button" class="rq-subtab" role="tab" data-rq-tab="products">Products <span class="rq-subtab__count"></span></button>' +
        '<button type="button" class="rq-subtab" role="tab" data-rq-tab="supplies">Equipment/Consumables <span class="rq-subtab__count"></span></button>' +
      '</div>' +
      '<div class="products-toolbar"><div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
        '<input type="text" id="rq-search" class="products-search__input" placeholder="Search by request, item, area, supplier or requester" autocomplete="off"></div>' +
        '<div class="products-chips" id="rq-chips"></div></div>' +
      table('products') + table('supplies') +
      '<div class="drawer-overlay" id="request-drawer"><div class="drawer drawer--right product-drawer"></div></div>' +
      '<div class="rq-dialog-overlay" id="request-reject" hidden><div class="rq-dialog" role="dialog" aria-modal="true"></div></div>';

    ['products', 'supplies'].forEach(function(t) {
      var cols = TABLES[t].columns;
      resizers[t] = window.TableResize.create(document.getElementById('rq-wrap-' + t).querySelector('table'), { key: TABLES[t].key, defaults: cols.map(function(c) { return c.width; }).concat([ACTIONS_WIDTH]), grow: 1,
        onChange: function(widths) { document.getElementById('rq-wrap-' + t).querySelector('table').style.setProperty('--sticky-1', widths[0] + 'px'); } });
      resizers[t].refresh();
    });

    view.addEventListener('input', function(e) {
      if (e.target.id !== 'rq-search') return;
      state.query = e.target.value.trim().toLowerCase();
      renderTable('products');
      renderTable('supplies');
    });
    view.addEventListener('click', function(e) {
      var sortTh = e.target.closest('th[data-sort]');
      if (sortTh) {
        var tab = sortTh.closest('.rq-container').id.replace('rq-wrap-', ''), index = +sortTh.getAttribute('data-sort'), cur = state.sort[tab];
        state.sort[tab] = { index: index, dir: cur && cur.index === index ? -cur.dir : 1 };
        Array.prototype.forEach.call(sortTh.parentNode.children, function(th) {
          var on = th === sortTh, mark = th.querySelector('.products-sort');
          if (!mark) return;
          mark.classList.toggle('products-sort--active', on);
          mark.textContent = on ? (state.sort[tab].dir > 0 ? '↑' : '↓') : '⇅';
          if (on) th.setAttribute('aria-sort', state.sort[tab].dir > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort');
        });
        renderTable(tab);
        return;
      }
      var t = e.target;
      var tab = t.closest('[data-rq-tab]');
      if (tab) { state.tab = tab.getAttribute('data-rq-tab'); render(); return; }
      var st = t.closest('[data-status]');
      if (t.closest('[data-urgent]')) { state.urgent = !state.urgent; render(); return; }
      if (st) { state.urgent = false; var s = st.getAttribute('data-status'); state.status = state.status === s && s !== 'All' ? 'All' : s; render(); return; }
      var ac = t.closest('[data-accept]');
      if (ac) { e.stopPropagation(); accept(ac.getAttribute('data-accept')); return; }
      var rj = t.closest('[data-reject]');
      if (rj) { e.stopPropagation(); openReject(rj.getAttribute('data-reject')); return; }
      if (t.closest('[data-reject-cancel]') || t.id === 'request-reject') { closeReject(); return; }
      if (t.closest('[data-reject-confirm]')) { confirmReject(); return; }
      if (t.closest('#request-drawer-close') || t.id === 'request-drawer') { closeDrawer(); return; }
      var row = t.closest('[data-request]');
      if (row) openDrawer(row.getAttribute('data-request'));
    });
    view.addEventListener('keydown', function(e) {
      var row = e.target.closest && e.target.closest('[data-request]');
      if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(row.getAttribute('data-request')); }
    });
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      if (state.rejecting) closeReject(); else if (state.current) closeDrawer();
    });
  }

  window.RequestsView = {
    init: function() {
      var view = document.getElementById('requests-view');
      if (!view) return;
      // The old PCN table also writes the number on the tab; the number now counts the purchase requests
      if (window.PCNTable) window.PCNTable.updateTabBadge = function() {};
      build(view);
      render();
      // Dropdowns update the current city / store first (their listeners were attached earlier)
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', function() { state.current = null; closeReject(); state.status = 'Pending'; render(); });
      });
    },
    render: render
  };
})();
