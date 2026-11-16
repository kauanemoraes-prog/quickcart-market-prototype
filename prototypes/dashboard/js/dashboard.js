/**
 * Dashboard
 * Network view for QuickCart Market, built from the same mock data as the Stores page:
 *   which stores need attention, where the problems concentrate, what was done and what arrives next.
 * The scope select narrows everything to one region; each indicator lists the stores behind its number.
 */

(function() {
  'use strict';

  // The mock data is dated up to 19 Feb 2026, so deadlines are measured from 20 Feb 2026: the same reference date as every other
  // page of the prototype (the store pages and Finance), and it is shown in the header so it is clear what "today" is.
  var TODAY = new Date(2026, 11, 10);
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var ATTENTION_LIMIT = 8;
  var EVENTS = ['Stock count submitted', 'Delivery received', 'Replenishment completed', 'Shelf check done', 'Price labels updated', 'Expiry check completed'];

  // The problems a store can have, with how much each weighs when choosing the main one and ordering the stores:
  // stock that is gone and late purchase orders come first, a product that is only under its minimum comes last.
  var PROBLEMS = [
    { key: 'out', weight: 6, tone: 'danger', count: function(s) { return s.outOfStock; }, text: function(s) { return plural(s.outOfStock, 'product') + ' out of stock'; } },
    { key: 'late', weight: 5, tone: 'danger', count: function(s) { return s.lateOrders; }, text: function(s) { return plural(s.lateOrders, 'late order') + ' · ' + s.supplier; } },
    { key: 'blocked', weight: 4, tone: 'danger', count: function(s) { return s.blockedTasks; }, text: function(s) { return plural(s.blockedTasks, 'blocked task'); } },
    { key: 'equip', weight: 3, tone: 'warning', count: function(s) { return s.equipmentDown; }, text: function(s) { return plural(s.equipmentDown, 'equipment item') + ' unavailable'; } },
    { key: 'overdue', weight: 2, tone: 'warning', count: function(s) { return s.overdueTasks; }, text: function(s) { return plural(s.overdueTasks, 'overdue task'); } },
    { key: 'low', weight: 1, tone: 'warning', count: function(s) { return belowMinimum(s); }, text: function(s) { return plural(belowMinimum(s), 'product') + ' below minimum'; } }
  ];

  /** Products under their minimum that are still on the shelf (the ones with no stock left are counted apart). */
  function belowMinimum(s) { return Math.max(0, s.lowStock - s.outOfStock); }

  /** Every problem of a store, the most serious first: the first one is its main issue. */
  function problemsOf(s) {
    return PROBLEMS.filter(function(p) { return p.count(s) > 0; })
      .sort(function(a, b) { return b.count(s) * b.weight - a.count(s) * a.weight; });
  }

  function mainIssue(s) {
    var list = problemsOf(s);
    if (!list.length) return { tone: 'warning', text: 'Store status: ' + s.status, more: [] };
    return { tone: list[0].tone, text: list[0].text(s), more: list.slice(1).map(function(p) { return p.text(s); }) };
  }

  function totalScore(s) {
    return PROBLEMS.reduce(function(n, p) { return n + p.count(s) * p.weight; }, 0);
  }

  // Each indicator: how to count, which stores it covers, and how a store's issue reads in the list
  var METRICS = {
    attention: {
      icon: 'building-2', label: 'Stores needing attention', title: 'Stores needing attention',
      has: function(s) { return s.status !== 'On track'; },
      score: totalScore,
      issue: mainIssue
    },
    out: {
      icon: 'circle-x', label: 'Out of stock', title: 'Stores with products out of stock',
      has: function(s) { return s.outOfStock > 0; }, score: function(s) { return s.outOfStock; },
      issue: function(s) { return { tone: 'danger', text: plural(s.outOfStock, 'product') + ' out of stock', more: belowMinimum(s) ? [belowMinimum(s) + ' more below minimum'] : [] }; }
    },
    lowStock: {
      icon: 'box', label: 'Low stock', title: 'Stores with products below minimum',
      has: function(s) { return belowMinimum(s) > 0; }, score: belowMinimum,
      issue: function(s) { return { tone: belowMinimum(s) >= 12 ? 'danger' : 'warning', text: plural(belowMinimum(s), 'product') + ' below minimum', more: [] }; }
    },
    overdue: {
      icon: 'clock', label: 'Overdue tasks', title: 'Stores with overdue tasks',
      has: function(s) { return s.overdueTasks > 0; }, score: function(s) { return s.overdueTasks; },
      issue: function(s) { return { tone: 'warning', text: plural(s.overdueTasks, 'overdue task'), more: [] }; }
    },
    blocked: {
      icon: 'circle-alert', label: 'Blocked tasks', title: 'Stores with blocked tasks',
      has: function(s) { return s.blockedTasks > 0; }, score: function(s) { return s.blockedTasks; },
      issue: function(s) { return { tone: 'danger', text: plural(s.blockedTasks, 'blocked task'), more: [] }; }
    },
    lateOrders: {
      icon: 'clipboard-list', label: 'Late purchase orders', title: 'Stores with late purchase orders',
      has: function(s) { return s.lateOrders > 0; }, score: function(s) { return s.lateOrders * 10 + s.pendingOrders; },
      issue: function(s) { return { tone: 'danger', text: plural(s.lateOrders, 'late order') + ' · ' + s.supplier, more: [] }; }
    },
    equipment: {
      icon: 'wrench', label: 'Equipment unavailable', title: 'Stores with unavailable equipment',
      has: function(s) { return s.equipmentDown > 0; }, score: function(s) { return s.equipmentDown; },
      issue: function(s) { return { tone: 'warning', text: plural(s.equipmentDown, 'equipment item') + ' unavailable', more: [] }; }
    }
  };

  var state = { metric: 'attention' };
  var regionFilter = null;   // checkbox dropdown of the regions: a checked region is in the scope

  function regionsInScope() { return regionFilter ? regionFilter.get() : []; }
  function allRegions() { return !regionFilter || regionFilter.isAll(); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseDate(str) {
    var m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(String(str || '').trim());
    return m ? new Date(+m[3], MONTHS[m[2]], +m[1]) : null;
  }

  function daysFromToday(date) {
    return Math.round((date - TODAY) / 86400000);
  }

  function shortDate(date) {
    return date.getDate() + ' ' + MONTH_NAMES[date.getMonth()];
  }

  function detailHref(code, site) {
    return '../programs/program-detail.html?code=' + encodeURIComponent(code) + '&site=' + encodeURIComponent(site);
  }

  function icon(name, size) {
    return '<lucide-icon name="' + name + '" style="font-size:' + (size || 16) + 'px"></lucide-icon>';
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  /** One entry per store (city p, neighborhood s) inside the selected scope. */
  function entries() {
    var out = [];
    window.ProgramsData.getAll().forEach(function(p) {
      if (regionFilter && !regionFilter.shows(p.region)) return;
      p.sites.forEach(function(s) { out.push({ p: p, s: s }); });
    });
    return out;
  }

  function sum(all, key) {
    return all.reduce(function(n, e) { return n + e.s[key]; }, 0);
  }

  function count(all, key) {
    return all.filter(function(e) { return e.s[key] > 0; }).length;
  }

  /* ---------- overview ---------- */

  function renderKpis(all) {
    var attention = all.filter(function(e) { return METRICS.attention.has(e.s); }).length;
    var values = {
      attention: { value: attention, note: 'of ' + plural(all.length, 'store'), tone: attention ? 'warning' : '' },
      out: { value: sum(all, 'outOfStock'), note: 'in ' + plural(count(all, 'outOfStock'), 'store') + ' · no units left', tone: 'danger' },
      lowStock: { value: all.reduce(function(n, e) { return n + belowMinimum(e.s); }, 0), note: 'under the minimum, still on the shelf', tone: 'warning' },
      overdue: { value: sum(all, 'overdueTasks'), note: 'past their deadline, not counting blocked ones', tone: 'warning' },
      blocked: { value: sum(all, 'blockedTasks'), note: 'in ' + plural(count(all, 'blockedTasks'), 'store') + ' · waiting on something', tone: 'danger' },
      lateOrders: { value: sum(all, 'lateOrders'), note: 'of ' + plural(sum(all, 'pendingOrders'), 'pending order'), tone: 'danger' },
      equipment: { value: sum(all, 'equipmentDown'), note: 'in ' + plural(count(all, 'equipmentDown'), 'store'), tone: 'info' }
    };

    document.getElementById('dashboard-kpis').innerHTML = Object.keys(METRICS).map(function(key) {
      var m = METRICS[key], v = values[key];
      return '<button type="button" class="kpi-card' + (v.value && v.tone ? ' kpi-card--' + v.tone : '') + (key === state.metric ? ' kpi-card--active' : '') + '" data-metric="' + key + '" aria-pressed="' + (key === state.metric) + '">' +
        '<span class="kpi-card__icon">' + icon(m.icon, 20) + '</span>' +
        '<span class="kpi-card__body">' +
          '<span class="kpi-card__label">' + esc(m.label) + '</span>' +
          '<span class="kpi-card__value">' + v.value + '</span>' +
          '<span class="kpi-card__note">' + esc(v.note) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
  }

  /* ---------- stores behind the selected indicator ---------- */

  function renderStores(all) {
    var m = METRICS[state.metric];
    var matching = all.filter(function(e) { return m.has(e.s); })
      .sort(function(a, b) { return m.score(b.s) - m.score(a.s); });
    var items = matching.slice(0, ATTENTION_LIMIT);

    document.getElementById('needs-attention-title').textContent = m.title;
    document.getElementById('needs-attention-subtitle').textContent =
      matching.length > items.length ? 'The ' + items.length + ' most affected of ' + plural(matching.length, 'store') : plural(matching.length, 'store');

    document.getElementById('needs-attention-body').innerHTML = items.map(function(e) {
      var p = e.p, s = e.s, issue = m.issue(s);
      return '<tr>' +
        '<td><a class="dashboard-link" href="' + detailHref(p.code, s.site) + '"><strong>' + esc(s.storeName) + '</strong></a> <span class="store-code">' + esc(s.storeCode) + '</span></td>' +
        '<td>' + esc(p.name) + ', ' + esc(p.state) + '</td>' +
        '<td><span class="issue-badge issue-badge--' + issue.tone + '">' + esc(issue.text) + '</span>' +
          (issue.more.length ? ' <span class="issue-more" title="' + esc(issue.more.join(' · ')) + '">+' + issue.more.length + ' more</span>' : '') + '</td>' +
        '<td>' + esc(s.lead) + '</td>' +
        '<td class="dashboard-table__action"><a class="icon-link" href="' + detailHref(p.code, s.site) + '" aria-label="Open ' + esc(s.storeName) + '">' + icon('arrow-up-right', 18) + '</a></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="5" class="dashboard-empty">No store has this issue right now.</td></tr>';
  }

  /* ---------- concentration ---------- */

  /** Stores with the selected issue, per region (or per state once a region is selected), with the cities most affected. */
  function renderConcentration(all) {
    var m = METRICS[state.metric], single = !allRegions() && regionsInScope().length === 1, key = single ? 'state' : 'region';
    var groups = {};
    all.forEach(function(e) {
      var g = groups[e.p[key]] || (groups[e.p[key]] = { name: e.p[key], total: 0, hit: 0, cities: {} });
      g.total++;
      if (m.has(e.s)) {
        g.hit++;
        g.cities[e.p.name] = (g.cities[e.p.name] || 0) + 1;
      }
    });
    // Regions differ in size, so they are ordered by the share of their stores that are affected (then by how many)
    var list = Object.keys(groups).map(function(k) { return groups[k]; })
      .sort(function(a, b) { return b.hit / b.total - a.hit / a.total || b.hit - a.hit || a.name.localeCompare(b.name); });

    document.getElementById('concentration-subtitle').textContent =
      m.label + ' · share of the stores of each ' + (single ? 'state in ' + regionsInScope()[0] : 'region') + ' that are affected, highest first';

    document.getElementById('phase-list').innerHTML = list.map(function(g, i) {
      var cities = Object.keys(g.cities).sort(function(a, b) { return g.cities[b] - g.cities[a] || a.localeCompare(b); });
      // Each city is a link to the Stores page filtered to that city; the others wait behind "+N"
      var link = function(c, hidden) { return '<a class="phase-row__code' + (hidden ? ' phase-row__code--extra' : '') + '" href="../programs/index.html?city=' + encodeURIComponent(c) + '" title="Open the stores of ' + esc(c) + '">' + esc(c) + '</a>'; };
      var shown = cities.map(function(c, k) { return link(c, k >= 4); }).join('');
      var more = cities.length > 4 ? '<button type="button" class="phase-row__more" data-more aria-expanded="false">+' + (cities.length - 4) + '</button>' : '';
      return '<li class="phase-row">' +
        '<span class="phase-row__step">' + (i + 1) + '</span>' +
        '<div class="phase-row__body">' +
          '<div class="phase-row__head"><span class="phase-row__name">' + esc(g.name) + '</span>' +
          '<span class="phase-row__count">' + Math.round(g.hit / g.total * 100) + '% <small>' + g.hit + ' of ' + g.total + ' stores</small></span></div>' +
          '<div class="phase-row__bar" role="img" aria-label="' + g.hit + ' of ' + plural(g.total, 'store') + ' in ' + esc(g.name) + ' (' + Math.round(g.hit / g.total * 100) + '%)">' +
            '<span class="phase-row__fill" style="width:' + Math.round(g.hit / g.total * 100) + '%"></span></div>' +
          '<div class="phase-row__codes">' + shown + more + '</div>' +
        '</div>' +
      '</li>';
    }).join('') || '<li class="dashboard-empty">No stores in this scope.</li>';
  }

  /* ---------- supporting information ---------- */

  function firstPerCity(list) {
    var seen = {};
    return list.filter(function(e) {
      if (seen[e.p.code]) return false;
      seen[e.p.code] = true;
      return true;
    });
  }

  function renderRecentActivity(all) {
    var sorted = all.filter(function(e) { return parseDate(e.s.lastUpdate); })
      .sort(function(a, b) { return parseDate(b.s.lastUpdate) - parseDate(a.s.lastUpdate); });
    var rows = firstPerCity(sorted).slice(0, 6);
    document.getElementById('recent-updates').innerHTML = rows.map(function(e, i) {
      return '<li class="update-row">' +
        '<span class="update-row__icon">' + icon('history', 16) + '</span>' +
        '<div class="update-row__body">' +
          '<a class="dashboard-link" href="' + detailHref(e.p.code, e.s.site) + '"><strong>' + esc(e.s.storeName) + '</strong> · ' + esc(e.p.name) + '</a>' +
          '<span class="update-row__meta">' + EVENTS[(e.p.code.length + e.s.storeCode.length + i * 5 + parseInt(e.s.storeCode.slice(3), 10)) % EVENTS.length] + ' · by ' + esc(e.s.lead) + '</span>' +
        '</div>' +
        '<time class="update-row__date">' + esc(e.s.lastUpdate) + '</time>' +
      '</li>';
    }).join('') || '<li class="dashboard-empty">No recent activity in this scope.</li>';
  }

  /** The next delivery is highlighted; the list below holds the ones after it (one row per city). */
  function renderDeliveries(all) {
    var upcoming = all.filter(function(e) {
      var d = parseDate(e.s.nextDelivery);
      return d && d >= TODAY;
    }).sort(function(a, b) { return parseDate(a.s.nextDelivery) - parseDate(b.s.nextDelivery); });
    var rows = firstPerCity(upcoming);
    var next = rows.shift();
    var highlight = document.getElementById('next-opening');

    if (next) {
      var nd = parseDate(next.s.nextDelivery), nDays = daysFromToday(nd);
      highlight.innerHTML = '<a class="next-opening" href="' + detailHref(next.p.code, next.s.site) + '">' +
        '<span class="next-opening__icon">' + icon('calendar-clock', 22) + '</span>' +
        '<span class="next-opening__body"><small>Next delivery</small>' +
          '<strong>' + esc(next.s.supplier) + '</strong>' +
          '<span>' + esc(next.s.storeName) + ' · ' + esc(next.p.name) + '</span></span>' +
        '<span class="next-opening__when"><strong>' + shortDate(nd) + '</strong><small>' + (nDays === 0 ? 'today' : 'in ' + plural(nDays, 'day')) + '</small></span>' +
      '</a>';
    } else {
      highlight.innerHTML = '';
    }

    document.getElementById('upcoming-openings').innerHTML = rows.slice(0, 5).map(function(e) {
      var d = parseDate(e.s.nextDelivery), days = daysFromToday(d);
      return '<li class="opening-row">' +
        '<span class="opening-row__date"><strong>' + d.getDate() + '</strong><small>' + Object.keys(MONTHS)[d.getMonth()] + '</small></span>' +
        '<div class="opening-row__body">' +
          '<a class="dashboard-link" href="' + detailHref(e.p.code, e.s.site) + '"><strong>' + esc(e.s.supplier) + '</strong></a>' +
          '<span class="opening-row__meta">' + esc(e.s.storeName) + ' · ' + esc(e.p.name) + '</span>' +
        '</div>' +
        '<span class="opening-row__in">in ' + plural(days, 'day') + '</span>' +
      '</li>';
    }).join('') || '<li class="dashboard-empty">No further deliveries scheduled.</li>';
  }

  /* ---------- wiring ---------- */

  function render() {
    var all = entries();
    var scopeParts = ['QuickCart Market', allRegions() ? 'entire network' : (regionsInScope().length === 1 ? 'region ' : 'regions ') + regionsInScope().join(', '), plural(all.length, 'store'),
      'data as of ' + TODAY.getDate() + ' ' + MONTH_NAMES[TODAY.getMonth()] + ' ' + TODAY.getFullYear()];
    document.getElementById('dashboard-scope-text').innerHTML = scopeParts.map(function(t) { return '<span class="dashboard-header__item">' + esc(t) + '</span>'; }).join('');
    renderKpis(all);
    renderStores(all);
    renderConcentration(all);
    renderRecentActivity(all);
    renderDeliveries(all);
  }

  function init() {
    var regions = {};
    window.ProgramsData.getAll().forEach(function(p) { if (p.region) regions[p.region] = true; });
    regionFilter = window.MultiSelect.create(document.getElementById('dashboard-scope'), { options: Object.keys(regions).sort(), label: 'regions', onChange: render });

    document.getElementById('phase-list').addEventListener('click', function(e) {
      var more = e.target.closest('[data-more]');
      if (!more) return;
      var row = more.closest('.phase-row'), open = row.classList.toggle('phase-row--expanded');
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'Show less' : '+' + row.querySelectorAll('.phase-row__code--extra').length;
    });

    document.getElementById('dashboard-kpis').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-metric]');
      if (!btn) return;
      state.metric = btn.getAttribute('data-metric');
      render();
    });
    render();
  }

  function safeInit() {
    try { init(); } catch (err) { console.error('Dashboard init failed:', err); }
  }

  // The canvas dispatches this event once it has injected the page content.
  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
