/**
 * Programs View Module
 * Two independent switches on the exhibitions page:
 *   - layout:  list (table) or card grid
 *   - grouping: by city (the default table) or by neighborhood (sites)
 * "By exhibition + list" is the original table rendered by TableRenderer. The other
 * three combinations are rendered here from ProgramsData and honour the same
 * search / favorites predicate that ProgramsSearch passes in.
 */

(function() {
  'use strict';

  var view = 'list';          // 'list' | 'card'
  var groupBy = 'exhibition'; // 'exhibition' | 'museum'
  var lastPredicate;

  var STAR = '<lucide-icon name="star" style="font-size:18px"></lucide-icon>';
  var BUILDING = '<lucide-icon name="building-2" style="font-size:20px"></lucide-icon>';
  var CHEVRON_RIGHT = '<lucide-icon name="chevron-right" style="font-size:15px"></lucide-icon>';
  var STAR_SMALL = '<lucide-icon name="star" style="font-size:16px"></lucide-icon>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** A name that opens the contact card (people-popover.js). */
  function personLink(name, role) {
    return '<button type="button" class="person-link" data-person="' + esc(name) + '" data-role="' + esc(role) + '" aria-haspopup="dialog" aria-expanded="false">' + esc(name) + '</button>';
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function detailHref(code, site) {
    return 'program-detail.html?code=' + encodeURIComponent(code) +
      (site ? '&site=' + encodeURIComponent(site) : '');
  }

  /* ---------- data ---------- */

  function filteredPrograms() {
    var data = window.ProgramsData.getAll();
    return typeof lastPredicate === 'function' ? data.filter(lastPredicate) : data;
  }

  /** Group cities by store (site name = neighborhood). Returns [{ name, id, items: [{ program, site }] }]. */
  function groupByMuseum() {
    var map = {};
    filteredPrograms().forEach(function(program) {
      (program.sites || []).forEach(function(site) {
        var m = map[site.site] || (map[site.site] = { name: site.site, id: slug(site.site), items: [] });
        m.items.push({ program: program, site: site });
      });
    });
    return Object.keys(map).sort().map(function(k) { return map[k]; });
  }

  /* ---------- cards ---------- */

  /** Small colored dot, placed at the left inside a tag, showing a site's status. */
  function statusDot(status) {
    return '<span class="status-dot" data-status="' + esc(status) + '" role="img" aria-label="' + esc(status) + '" title="' + esc(status) + '"></span>';
  }

  function exhibitionCardHtml(p) {
    var href = detailHref(p.code);
    var sites = (p.sites || []).map(function(s) {
      return '<a class="program-card__site" href="' + detailHref(p.code, s.site) + '">' + statusDot(s.status) + esc(s.site) + '</a>';
    }).join('');
    return '' +
      '<article class="program-card" data-program-id="' + esc(p.code) + '">' +
        '<button type="button" data-view-managed class="favorite-btn program-card__icon ' + (p.favorite ? 'favorite-btn--active' : '') + '" data-id="' + esc(p.code) + '" aria-label="Toggle favorite">' + STAR + '</button>' +
        '<div class="program-card__body">' +
          '<span class="program-card__label">' + esc(p.state) + ' · ' + esc(p.region) + ' · ' + esc(p.admin) + ' · ' + esc(p.lastUpdate) + '</span>' +
          '<h3 class="program-card__name">' + esc(p.name) + '</h3>' +
        '</div>' +
        '<a href="' + href + '" class="program-card__chevron" aria-label="Open ' + esc(p.name) + '">' + CHEVRON_RIGHT + '</a>' +
        '<div class="program-card__sites" aria-label="Sites">' + sites + '</div>' +
      '</article>';
  }

  function storeCardHtml(m) {
    var it = m.items[0], p = it.program, st = it.site;
    var chips = [
      '<span class="program-card__site">' + statusDot(st.status) + esc(st.statusLabel) + '</span>',
      '<span class="program-card__site">' + st.lowStock + ' low stock</span>',
      '<span class="program-card__site">' + st.overdueTasks + ' overdue</span>'
    ].join('');
    return '' +
      '<article class="program-card" data-museum-id="' + esc(m.id) + '">' +
        '<span class="program-card__icon" aria-hidden="true">' + BUILDING + '</span>' +
        '<div class="program-card__body">' +
          '<span class="program-card__label">' + esc(st.storeCode) + ' · ' + esc(p.name) + ' · ' + esc(p.state) + ' · ' + esc(st.lastUpdate) + '</span>' +
          '<h3 class="program-card__name"><a href="' + detailHref(p.code, m.name) + '" class="program-code-link">' + esc(st.storeName) + '</a></h3>' +
        '</div>' +
        '<div class="program-card__sites" aria-label="Store indicators">' + chips + '</div>' +
      '</article>';
  }

  /* ---------- store table ---------- */

  function counter(n, cls) {
    return '<span class="metric-count' + (n ? ' ' + cls : '') + '">' + esc(n) + '</span>';
  }

  /* Same 10-column grid as the city table; a store has no children, so the chevron column stays empty. */
  function storeTableHtml(stores) {
    var rows = stores.map(function(m) {
      var it = m.items[0], p = it.program, st = it.site;
      return '' +
        '<tr class="table__row table__row--parent" data-museum-id="' + esc(m.id) + '">' +
          '<td class="table__cell table__cell--chevron"></td>' +
          '<td class="table__cell"><a href="' + detailHref(p.code, m.name) + '" class="program-code-link">' + esc(st.storeName) + '</a> <span class="store-code">' + esc(st.storeCode) + ' · ' + esc(p.name) + '</span></td>' +
          '<td class="table__cell">' + esc(p.state) + '</td>' +
          '<td class="table__cell">' + esc(p.region) + '</td>' +
          '<td class="table__cell">' + personLink(st.lead, 'Store Manager') + '</td>' +
          '<td class="table__cell">' + counter(st.lowStock, 'metric-count--warn') + '</td>' +
          '<td class="table__cell">' + counter(st.overdueTasks, 'metric-count--bad') + '</td>' +
          '<td class="table__cell">' + esc(st.lastUpdate) + '</td>' +
          '<td class="table__cell"><span class="status-badge" data-status="' + esc(st.status) + '">' + esc(st.statusLabel) + '</span></td>' +
          '<td class="table__cell"></td>' +
        '</tr>';
    }).join('');

    return '' +
      '<table class="table table--expandable">' +
        '<thead class="table__head table__head--sticky"><tr class="table__row">' +
          '<th class="table__header table__header--chevron"></th>' +
          '<th class="table__header">Store</th>' +
          '<th class="table__header">State</th>' +
          '<th class="table__header">Region</th>' +
          '<th class="table__header">Store Manager</th>' +
          '<th class="table__header">Low stock</th>' +
          '<th class="table__header">Overdue tasks</th>' +
          '<th class="table__header">Last Updated</th>' +
          '<th class="table__header">Status</th>' +
          '<th class="table__header"></th>' +
        '</tr></thead>' +
        '<tbody class="table__body">' + (rows || '<tr class="table__row"><td class="table__cell" colspan="10">No stores match your filters.</td></tr>') + '</tbody>' +
      '</table>';
  }

  /* ---------- containers ---------- */

  function makeContainer(id, className, afterEl) {
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.className = className;
    el.hidden = true;
    afterEl.parentNode.insertBefore(el, afterEl.nextSibling);
    return el;
  }

  function containers() {
    var base = document.querySelector('.table-container:not(.museums-table-container)');
    if (!base) return null;
    var cards = makeContainer('programs-cards', 'program-cards', base);
    var museumTable = makeContainer('museums-table', 'table-container museums-table-container', cards);
    var museumCards = makeContainer('museums-cards', 'program-cards', museumTable);

    if (!cards.dataset.bound) {
      cards.dataset.bound = '1';
      cards.addEventListener('click', function(e) {
        var btn = e.target.closest('.favorite-btn');
        if (btn) window.Favorites.toggleProgramFavorite(btn.getAttribute('data-id'), btn);
      });
      museumTable.addEventListener('click', function(e) {
        var fav = e.target.closest('.favorite-btn');
        if (fav) { window.Favorites.toggleSiteFavorite(fav.getAttribute('data-id'), fav); return; }
        var chev = e.target.closest('.museum-chevron');
        if (!chev) return;
        var id = chev.getAttribute('data-museum');
        var row = museumTable.querySelector('[data-museum-parent="' + id + '"]');
        var parent = chev.closest('.table__row--parent');
        var open = row.style.display === 'none';
        row.style.display = open ? '' : 'none';
        chev.classList.toggle('museum-chevron--expanded', open);
        chev.setAttribute('aria-expanded', open ? 'true' : 'false');
        parent.classList.toggle('table__row--expanded-active', open);
      });
    }
    return { base: base, cards: cards, museumTable: museumTable, museumCards: museumCards };
  }

  function renderCards(el) {
    var data = filteredPrograms();
    el.innerHTML = data.length
      ? data.map(exhibitionCardHtml).join('')
      : '<p class="program-cards__empty">No cities match your filters.</p>';
  }

  function renderMuseumCards(el) {
    var museums = groupByMuseum();
    el.innerHTML = museums.length
      ? museums.map(storeCardHtml).join('')
      : '<p class="program-cards__empty">No stores match your filters.</p>';
  }

  function renderMuseumTable(el) {
    var open = {};
    el.querySelectorAll('.museum-chevron--expanded').forEach(function(b) { open[b.getAttribute('data-museum')] = true; });
    el.innerHTML = storeTableHtml(groupByMuseum());
    Object.keys(open).forEach(function(id) {
      var b = el.querySelector('.museum-chevron[data-museum="' + id + '"]');
      if (b) b.click();
    });
  }

  function apply() {
    var c = containers();
    if (!c) return;
    var card = view === 'card', museum = groupBy === 'museum';
    c.base.hidden = !(!card && !museum);
    c.cards.hidden = !(card && !museum);
    c.museumTable.hidden = !(!card && museum);
    c.museumCards.hidden = !(card && museum);

    if (card && !museum) renderCards(c.cards);
    if (!card && museum) renderMuseumTable(c.museumTable);
    if (card && museum) renderMuseumCards(c.museumCards);

    document.querySelectorAll('.view-toggle__btn').forEach(function(b) {
      var on = b.getAttribute('data-view') === view;
      b.classList.toggle('view-toggle__btn--active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  window.ProgramsView = {
    init: function() {
      // Grey page background for both the list and the card view
      document.body.classList.add('programs-page-grey');

      document.querySelectorAll('.view-toggle__btn').forEach(function(b) {
        b.addEventListener('click', function() {
          view = b.getAttribute('data-view');
          apply();
        });
      });

      var groupSelect = document.getElementById('programs-group-by');
      if (groupSelect) {
        groupSelect.addEventListener('change', function() {
          groupBy = groupSelect.value === 'museum' ? 'museum' : 'exhibition';
          apply();
        });
      }
      apply();
    },
    setGroupBy: function(value) {
      groupBy = value === 'museum' ? 'museum' : 'exhibition';
      var sel = document.getElementById('programs-group-by');
      if (sel) sel.value = groupBy;
      apply();
    },
    refresh: function(predicate) {
      lastPredicate = predicate;
      if (view === 'card' || groupBy === 'museum') apply();
    }
  };
})();
