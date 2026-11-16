/**
 * Programs Search Module
 * Filters the location table by text query (city, state, region, admin, store, neighborhood, alias),
 * by state and region (selects) and by the "Favorites only" toggle.
 * All filters are combined.
 */

(function() {
  'use strict';

  var state = { query: '', favoritesOnly: false, uf: '', region: '' };

  function has(value, q) {
    return !!value && String(value).toLowerCase().includes(q);
  }

  function matchesQuery(program, q) {
    if (!q) return true;
    if (has(program.code, q) || has(program.name, q) || has(program.state, q) || has(program.region, q) || has(program.admin, q)) return true;
    return (program.sites || []).some(function(s) {
      return has(s.alias, q) || has(s.site, q) || has(s.storeName, q) || has(s.storeCode, q) || has(s.address, q);
    });
  }

  function baseMatch(program) {
    if (state.favoritesOnly && !program.favorite) return false;
    if (state.uf && program.state !== state.uf) return false;
    if (state.region && program.region !== state.region) return false;
    return matchesQuery(program, state.query);
  }

  function buildPredicate() {
    if (!state.query && !state.favoritesOnly && !state.uf && !state.region) return undefined;
    return baseMatch;
  }

  function rerender() {
    window.TableRenderer.render(buildPredicate());
    window.RowExpander.init();
    window.Favorites.init();
    window.ActionButtons.init();
    if (window.ProgramsView) window.ProgramsView.refresh(buildPredicate());
  }

  function fillSelect(id, key, onChange) {
    var select = document.getElementById(id);
    if (!select) return;
    var seen = {};
    window.ProgramsData.getAll().forEach(function(p) { if (p[key]) seen[p[key]] = true; });
    Object.keys(seen).sort().forEach(function(value) {
      var opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
    select.addEventListener('change', function(e) { onChange(e.target.value); });
  }

  window.ProgramsSearch = {
    init: function() {
      var input = document.getElementById('programs-search');
      if (input) {
        input.addEventListener('input', function(e) {
          state.query = (e.target.value || '').trim().toLowerCase();
          rerender();
        });
      }

      // What the page shows, next to the title
      var holder = document.getElementById('programs-header-items');
      if (holder && window.ProgramsData) {
        var all = window.ProgramsData.getAll(), storeCount = all.reduce(function(n, p) { return n + (p.sites ? p.sites.length : 0); }, 0);
        holder.innerHTML = ['QuickCart Market', 'entire network', all.length + ' cities', storeCount + ' stores'].map(function(t) { return '<span class="programs-header__item">' + t + '</span>'; }).join('');
      }

      fillSelect('programs-state-filter', 'state', function(v) { state.uf = v; rerender(); });
      fillSelect('programs-region-filter', 'region', function(v) { state.region = v; rerender(); });

      // Deep link from the dashboard: ?city=Campo Grande filters the list to that city
      var city = new URLSearchParams(window.location.search).get('city');
      if (city && input) {
        input.value = city;
        state.query = city.trim().toLowerCase();
        rerender();
      }

      var favSwitch = document.getElementById('favorites-only');
      if (favSwitch) {
        favSwitch.addEventListener('change', function(e) {
          state.favoritesOnly = !!e.target.checked;
          rerender();
        });
      }
    }
  };
})();
