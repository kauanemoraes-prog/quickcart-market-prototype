/* Process Flow 1 filter — same UX as PF2Filter but scoped to the Process Flow tab.
 *
 * Two-level dropdown panel with categories tuned for the Consumables table
 * (Line, Station, Operation, Equipment, Consumable, Specification). Selecting an option renders a chip inside the
 * input.
 *
 * Options popover (⋯), persisted in localStorage under `davinci:pf1-filter:*`
 * keys — completely independent from the other filters:
 *   - Behavior:  'filter' | 'search'
 *   - Order:     'alpha'  | 'smart'
 *   - Favorites: 'show'   | 'hide'
 *
 * Favorites cap 6, header shortcut icons, match navigation, undo toast — all
 * behave exactly like the Equipment filter. Matching maps chips to the
 * Consumables tbody `#lines-table-body`. */
(function() {
  'use strict';

  var STORAGE = {
    behavior:         'davinci:pf1-filter:behavior',
    order:            'davinci:pf1-filter:order',
    favoritesVisible: 'davinci:pf1-filter:favorites-visible',
    favorites:        'davinci:pf1-filter:favorites'
  };
  var FAVORITES_CAP = 6;

  function loadPref(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function savePref(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function loadFavorites() {
    try {
      var raw = localStorage.getItem(STORAGE.favorites);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveFavoritesList(list) {
    try { localStorage.setItem(STORAGE.favorites, JSON.stringify(list)); } catch (e) {}
  }

  var prefs = {
    behavior:         loadPref(STORAGE.behavior,         'filter'),
    order:            loadPref(STORAGE.order,            'alpha'),
    favoritesVisible: loadPref(STORAGE.favoritesVisible, 'show')
  };

  var CATEGORIES = [
    {
      id: 'line',
      label: 'Area',
      fields: [
        { id: 'line-name',   label: 'Area Name' },
        { id: 'gallery',     label: 'Section', options: ['Sales floor', 'Fresh section', 'Front end', 'Back of house'] },
        { id: 'zone',        label: 'Aisle',   options: ['Aisle 1', 'Aisle 2', 'Aisle 3'] },
        { id: 'description', label: 'Description' },
        { id: 'area-lead',   label: 'Area Lead' },
        { id: 'area-status', label: 'Status', options: ['On track', 'At risk', 'Delayed'] }
      ]
    },
    {
      id: 'station',
      label: 'Station',
      fields: [
        { id: 'station-name',      label: 'Station Name' },
        { id: 'station-function',  label: 'Function' },
        { id: 'station-lead',      label: 'Station Lead' },
        { id: 'station-readiness', label: 'Readiness', options: ['Ready', 'In progress', 'Blocked'] }
      ]
    }
  ];

  var MODIFIERS = [
    { id: 'contains', label: 'Contains' },
    { id: 'without',  label: 'Without' }
  ];

  /* Column mapping — how each field maps to a PF1 row cell.
   * PF1 has 14 columns: Line (index), Line name, Line Grouping, Description,
   * Level, Cond. SOP, Process Category, Target UPH, PCNs, Station #, Process #,
   * HC #, Cons. #, Equip. #. Fields not mapped here render as "visual only"
   * chips (badge label). */
  var COL_MAP = {
    'line-name':   { cellSelector: '.proj-nested-table__col-name .line-name', kind: 'text' },
    'gallery':     { cellSelector: '.ap-col-gallery .equip-dropdown',        kind: 'dropdown' },
    'zone':        { cellSelector: '.ap-col-zone .equip-dropdown',           kind: 'dropdown' },
    'description': { cellSelector: '.proj-nested-table__col-desc',            kind: 'text' },
    'area-lead':   { cellSelector: '.ap-col-lead',                            kind: 'text' },
    'area-status': { cellSelector: '.ap-col-status',                          kind: 'text' }
  };

  /* Station-level chip → cell inside each workstation row of an area's expanded detail. An area matches a
   * station chip if ANY of its stations matches. `headerNth` is the 1-based position of the header cell in the
   * workstation table's header row (the first header cell spans the spacer and the name column). */
  var STATION_L2_MAP = {
    'station-name':      { sel: '.ap-l2-name-text', kind: 'text', headerNth: 1 },
    'station-function':  { sel: '.ap-l2-function',  kind: 'text', headerNth: 3 },
    'station-lead':      { sel: '.ap-l2-lead',      kind: 'text', headerNth: 5 },
    'station-readiness': { sel: '.ap-l2-readiness', kind: 'text', headerNth: 6 }
  };

  /* PF1 rows have no expanded sub-table, so vendor mapping is empty. */
  var VENDOR_COL_MAP = {};

  var chips = [];
  var chipSeq = 0;
  var favorites = loadFavorites();

  var root, input, chipsHost, panel, panelBody, clearAllBtn, saveBtn, optionsBtn, optionsPop;
  var matchNav, matchNavCount, matchList, matchIdx;

  function findField(fieldId) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      var cat = CATEGORIES[i];
      for (var j = 0; j < cat.fields.length; j++) {
        if (cat.fields[j].id === fieldId) {
          return { field: cat.fields[j], category: cat };
        }
      }
    }
    return null;
  }

  function isMapped(fieldId) {
    return !!(COL_MAP[fieldId] || STATION_L2_MAP[fieldId] || VENDOR_COL_MAP[fieldId]);
  }

  /* ---------- chips ---------- */
  function renderChips() {
    chipsHost.innerHTML = chips.map(function(c) {
      var relSymbol = c.relation === 'not-equal' ? '≠' : '=';
      var value = c.valueLabel
        ? '<span class="pf-filter__chip-value-row">' +
            '<span class="pf-filter__chip-eq">' + relSymbol + '</span>' +
            '<span class="pf-filter__chip-value">' + c.valueLabel + '</span>' +
          '</span>'
        : '';
      return '<span class="pf-filter__chip" data-chip-id="' + c.id + '">' +
        '<span class="pf-filter__chip-head">' +
          '<span class="pf-filter__chip-field">' + c.categoryLabel + ' ' + c.fieldLabel + '</span>' +
          '<button type="button" class="pf-filter__chip-edit" data-chip-edit="' + c.id + '" aria-label="Edit filter">' +
            '<lucide-icon name="chevron-down" class="pf-filter__chip-caret" style="font-size:10px"></lucide-icon>' +
          '</button>' +
        '</span>' +
        value +
      '</span>';
    }).join('');
    syncHasContent();
    syncSaveButton();
  }

  function syncHasContent() {
    var hasText = (input.value || '').length > 0;
    var hasChips = chips.length > 0;
    root.classList.toggle('pf-filter--has-content', hasText || hasChips);
    if (clearAllBtn) clearAllBtn.hidden = !(hasText || hasChips);
    // Drop the placeholder once chips exist — the chips themselves signal what
    // the filter is doing, so "Type keywords..." reads as redundant clutter.
    input.placeholder = hasChips ? '' : 'Type keywords...';
  }

  function addChip(categoryLabel, fieldId, fieldLabel, valueLabel) {
    chipSeq += 1;
    chips.push({
      id: 'chip-' + chipSeq,
      categoryLabel: categoryLabel,
      fieldId: fieldId,
      fieldLabel: fieldLabel,
      valueLabel: valueLabel || '',
      relation: 'equal',
      mapped: isMapped(fieldId)
    });
    // Clear the keyword hint left over from a header-shortcut open (openField
    // writes the field label into the input; it shouldn't persist as a chip
    // is committed).
    input.value = '';
    renderChips();
    applyBehavior();
    // Committing a chip is always a "done" action — close the panel so the
    // user sees the filter result without having to click outside.
    closePanel();
  }

  function removeChip(id) {
    chips = chips.filter(function(c) { return c.id !== id; });
    renderChips();
    applyBehavior();
  }

  /* ---------- favorites ---------- */
  function chipsSignature(list) {
    return list.map(function(c) { return c.fieldId + '=' + (c.valueLabel || ''); }).sort().join('|');
  }

  function snapshotFromChips() {
    return {
      sig: chipsSignature(chips),
      savedAt: Date.now(),
      chips: chips.map(function(c) {
        return {
          categoryLabel: c.categoryLabel,
          fieldId: c.fieldId,
          fieldLabel: c.fieldLabel,
          valueLabel: c.valueLabel,
          relation: c.relation || 'equal',
          mapped: c.mapped
        };
      })
    };
  }

  function formatSavedDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var mm = String(d.getMonth() + 1);
    var dd = String(d.getDate());
    var yy = String(d.getFullYear()).slice(-2);
    if (mm.length < 2) mm = '0' + mm;
    if (dd.length < 2) dd = '0' + dd;
    return mm + '/' + dd + '/' + yy;
  }

  function currentIsFavorited() {
    if (!chips.length) return false;
    var sig = chipsSignature(chips);
    return favorites.some(function(f) { return f.sig === sig; });
  }

  function saveCurrentAsFavorite() {
    if (!chips.length) return;
    var snap = snapshotFromChips();
    favorites = favorites.filter(function(f) { return f.sig !== snap.sig; });
    favorites.unshift(snap);
    if (favorites.length > FAVORITES_CAP) favorites = favorites.slice(0, FAVORITES_CAP);
    saveFavoritesList(favorites);
    syncSaveButton();
    reRenderMainIfOpen();
    showToast('Filter saved to Favorites');
  }

  function removeFavoriteBySig(sig) {
    var idx = -1;
    for (var i = 0; i < favorites.length; i++) {
      if (favorites[i].sig === sig) { idx = i; break; }
    }
    if (idx < 0) return;
    var removed = favorites[idx];
    var removedAt = idx;
    favorites.splice(idx, 1);
    saveFavoritesList(favorites);
    syncSaveButton();
    reRenderMainIfOpen();
    showUndoToast('Favorite removed', function() {
      favorites.splice(Math.min(removedAt, favorites.length), 0, removed);
      if (favorites.length > FAVORITES_CAP) favorites = favorites.slice(0, FAVORITES_CAP);
      saveFavoritesList(favorites);
      syncSaveButton();
      reRenderMainIfOpen();
    });
  }

  function removeFavoriteByIdx(idx) {
    var fav = favorites[idx];
    if (fav) removeFavoriteBySig(fav.sig);
  }

  function applyFavorite(idx) {
    var snap = favorites[idx];
    if (!snap) return;
    chips = snap.chips.map(function(c) {
      chipSeq += 1;
      return {
        id: 'chip-' + chipSeq,
        categoryLabel: c.categoryLabel,
        fieldId: c.fieldId,
        fieldLabel: c.fieldLabel,
        valueLabel: c.valueLabel,
        relation: c.relation || 'equal',
        mapped: c.mapped
      };
    });
    renderChips();
    applyBehavior();
    closePanel();
  }

  function clearAllFavorites() {
    if (!favorites.length) return;
    var backup = favorites.slice();
    favorites = [];
    saveFavoritesList(favorites);
    syncSaveButton();
    reRenderMainIfOpen();
    showUndoToast('All favorites removed', function() {
      favorites = backup;
      saveFavoritesList(favorites);
      syncSaveButton();
      reRenderMainIfOpen();
    });
  }

  function reRenderMainIfOpen() {
    if (!root) return;
    if (root.classList.contains('pf-filter--open') && panelBody &&
        panelBody.getAttribute('data-view') === 'main') {
      renderMainView();
    }
  }

  function syncSaveButton() {
    if (!saveBtn) return;
    var has = chips.length > 0;
    saveBtn.hidden = !has;
    var saved = currentIsFavorited();
    // The star disables (no more room) only when we're at the cap AND the
    // current combination isn't already saved — otherwise the user can still
    // click to UNsave it, which frees a slot back.
    var atCap = favorites.length >= FAVORITES_CAP && !saved;
    saveBtn.disabled = atCap;
    saveBtn.classList.toggle('pf-filter__save-btn--disabled', atCap);
    saveBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    saveBtn.classList.toggle('pf-filter__save-btn--saved', saved);
    var label = atCap
      ? 'Maximum of ' + FAVORITES_CAP + ' favorites allowed.'
      : (saved ? 'Remove from Favorites' : 'Save current filter as favorite');
    saveBtn.setAttribute('aria-label', label);
    // Set data-tooltip for the custom CSS tooltip (fires on hover of the
    // disabled button, which native `title` can't do reliably fast). Clear
    // `title` to avoid the browser's default slow tooltip showing on top.
    saveBtn.setAttribute('data-tooltip', label);
    saveBtn.removeAttribute('title');
  }

  /* Swap the icon in the field AND on every column header shortcut so both
   * double as a mode indicator — funnel for Filter mode (hides non-matching
   * rows) and magnifier for Search mode (highlights matches). Runs on init
   * and any time the user toggles Behavior. Header shortcuts use the `.circle`
   * variant so they stay visually distinct from the field icon. */
  function syncFieldIcon() {
    var isFilter = prefs.behavior === 'filter';
    var fieldName = isFilter ? 'line.3.horizontal.decrease' : 'magnifyingglass';
    var headerName = isFilter ? 'line.3.horizontal.decrease' : 'magnifyingglass';
    var iconEl = root && root.querySelector('.pf-filter__icon lucide-icon');
    if (iconEl) iconEl.setAttribute('name', fieldName);
    document.querySelectorAll('#process-flow .table--lines > thead .pf1-col-shortcut lucide-icon').forEach(function(s) {
      s.setAttribute('name', headerName);
    });
  }

  /* Free-text field IDs — always visible in the panel when the user types a
   * query. Because these fields accept any string value (not a fixed list),
   * they're the natural targets for search-by-typing regardless of what column
   * name the user is filtering by. Matches the shortlist in the design spec:
   *   Equipment: Short Name, Version Notes, Equipment Name
   *   Station:   Station Name, Reporting Mapping
   *   Vendor:    AQID, CM PN, Vendor PN
   *   Line:      Line Name */
  var FREE_TEXT_FIELDS = {
    'line-name':             true,
    'description':           true,
    'station-name':          true,
    'reporting-mapping':     true,
    'operation-description': true,
    'cons-name':             true,
    'cons-app-name':          true,
    'eq-name':               true
  };

  /* ---------- panel views ---------- */
  function sortedFields(cat, query) {
    var list = cat.fields.slice();
    if (query) {
      var q = query.toLowerCase();
      list = list.filter(function(f) {
        return f.label.toLowerCase().indexOf(q) >= 0 || FREE_TEXT_FIELDS[f.id];
      });
    }
    return list.sort(function(a, b) {
      return a.label.localeCompare(b.label);
    });
  }

  function renderFavoritesSection() {
    if (prefs.favoritesVisible !== 'show' || !favorites.length) return '';
    var rows = favorites.map(function(snap, i) {
      var chipsHtml = snap.chips.map(function(c) {
        var val = c.valueLabel ? '= ' + c.valueLabel : '';
        return '<span class="pf-filter__fav-chip">' + c.fieldLabel + (val ? ' ' + val : '') + '</span>';
      }).join('');
      return '<div class="pf-filter__fav-row" data-fav-idx="' + i + '" role="button" tabindex="0">' +
        '<span class="pf-filter__fav-chips">' + chipsHtml + '</span>' +
        '<button type="button" class="pf-filter__fav-remove" data-fav-remove="' + i + '" aria-label="Remove favorite">' +
          '<lucide-icon name="x" style="font-size:10px"></lucide-icon>' +
        '</button>' +
      '</div>';
    }).join('');
    return '<section class="pf-filter__favorites">' +
      '<div class="pf-filter__fav-header">' +
        '<h4 class="pf-filter__group-title pf-filter__fav-title">Favorites</h4>' +
        '<div class="pf-filter__fav-actions">' +
          '<button type="button" class="pf-filter__fav-clear-all" data-fav-clear-all>Clear favorites</button>' +
          '<button type="button" class="pf-filter__fav-hide" data-fav-hide aria-label="Hide Favorites section">' +
            '<lucide-icon name="x" style="font-size:12px"></lucide-icon>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="pf-filter__fav-list">' + rows + '</div>' +
    '</section>';
  }

  function renderMainView() {
    var query = (input.value || '').trim();
    var groups = CATEGORIES.map(function(cat) {
      var fields = sortedFields(cat, query);
      if (!fields.length) return '';
      var tags = fields.map(function(f) {
        var hasSub = Array.isArray(f.options) && f.options.length > 0;
        var chevron = hasSub
          ? '<lucide-icon name="chevron-right" class="pf-filter__tag-caret" style="font-size:8px"></lucide-icon>'
          : '';
        return '<button type="button" class="pf-filter__tag' + (hasSub ? ' pf-filter__tag--parent' : '') +
          '" data-field-id="' + f.id + '">' + f.label + chevron + '</button>';
      }).join('');
      return '<section class="pf-filter__group">' +
        '<h4 class="pf-filter__group-title">' + cat.label + '</h4>' +
        '<div class="pf-filter__tag-row">' + tags + '</div>' +
      '</section>';
    }).join('');
    panelBody.innerHTML = renderFavoritesSection() + groups;
    panelBody.setAttribute('data-view', 'main');
    panelBody.scrollTop = 0;
  }

  function renderSubView(fieldId) {
    var found = findField(fieldId);
    if (!found || !found.field.options) return;
    var field = found.field;

    var modHtml = MODIFIERS.map(function(m) {
      return '<button type="button" class="pf-filter__option pf-filter__option--modifier" data-field-id="' + field.id + '" data-value="' + m.label + '">' + m.label + '</button>';
    }).join('');

    var optHtml = field.options.map(function(opt) {
      return '<button type="button" class="pf-filter__option" data-field-id="' + field.id + '" data-value="' + opt + '">' + opt + '</button>';
    }).join('');

    panelBody.innerHTML =
      '<button type="button" class="pf-filter__back" data-pf-back>' +
        '<lucide-icon name="chevron-left" style="font-size:8px"></lucide-icon>' +
        '<span>' + field.label + '</span>' +
      '</button>' +
      '<div class="pf-filter__sub-list">' +
        modHtml +
        '<div class="pf-filter__sub-divider"></div>' +
        optHtml +
      '</div>';
    panelBody.setAttribute('data-view', 'sub');
    panelBody.setAttribute('data-field-id', fieldId);
    panelBody.scrollTop = 0;
  }

  function openPanel() {
    // Filter panel and options popover are mutually exclusive — opening one
    // dismisses the other so both never share the screen.
    closeOptions();
    if (root.classList.contains('pf-filter--open')) return;
    root.classList.add('pf-filter--open');
    renderMainView();
  }

  function closePanel() {
    root.classList.remove('pf-filter--open');
    // Clear any keyword hint written by openField — otherwise "MP Intent" would
    // stick around in the input after the panel closes without a selection.
    if (input && input.value && !chips.length) {
      input.value = '';
      syncHasContent();
    } else if (input && input.value) {
      // If chips exist, only clear if the current value happens to match a
      // field label (i.e. it was a header-shortcut hint, not user-typed).
      var val = input.value;
      var isHint = CATEGORIES.some(function(cat) {
        return cat.fields.some(function(f) { return f.label === val; });
      });
      if (isHint) { input.value = ''; syncHasContent(); }
    }
  }

  function togglePanel() {
    if (root.classList.contains('pf-filter--open')) closePanel();
    else openPanel();
  }

  /* ---------- table application ---------- */
  function readCellValueGeneric(el, kind) {
    if (!el) return null;
    if (kind === 'dropdown') return (el.getAttribute('data-value') || '').trim();
    if (kind === 'text') {
      var inputEl = el.querySelector('input');
      if (inputEl) return (inputEl.value || '').trim();
      return (el.textContent || '').trim();
    }
    if (kind === 'number') {
      var iEl = el.querySelector('input');
      return iEl ? (iEl.value || '').trim() : (el.textContent || '').trim();
    }
    return null;
  }

  function readCellValue(row, fieldId) {
    var map = COL_MAP[fieldId];
    if (!map) return null;
    var el = row.querySelector(map.cellSelector);
    return readCellValueGeneric(el, map.kind);
  }

  /* PF1 has no expanded sub-table, so vendor-side lookups always return []. */
  function vendorRowsFor(/*row*/) { return []; }

  /* Return the L2 station rows inside the detail row of a Line. If the L1 row
   * isn't expanded yet, expand it silently so we can inspect the stations;
   * `applyBehavior` handles the final expand/collapse state afterwards. */
  function stationRowsFor(row) {
    var det = row.nextElementSibling;
    if (!det || !det.classList || !det.classList.contains('proj-nested-table__detail-row')) {
      // Not expanded — trigger the plugin's expand button to render L2.
      var btn = row.querySelector('.proj-nested-table__expand-btn');
      if (btn) btn.click();
      det = row.nextElementSibling;
    }
    if (!det || !det.classList || !det.classList.contains('proj-nested-table__detail-row')) return [];
    return Array.prototype.slice.call(det.querySelectorAll('.proj-nested-table__row--level2'));
  }

  function stationCellMatches(l2row, chip) {
    var map = STATION_L2_MAP[chip.fieldId];
    if (!map) return false;
    var el = l2row.querySelector(map.sel);
    if (!el) return false;
    var val;
    if (map.kind === 'dropdown') val = (el.getAttribute('data-value') || '').trim();
    else if (map.kind === 'value') val = (el.value || '').trim();
    else val = (el.textContent || '').trim();
    if (!chip.valueLabel) return val.length > 0;
    if (chip.valueLabel === 'Contains') return val.length > 0;
    if (chip.valueLabel === 'Without')  return val.length === 0;
    var baseMatch = val.toLowerCase().indexOf(chip.valueLabel.toLowerCase()) >= 0;
    if (chip.relation === 'not-equal') return !baseMatch;
    return baseMatch;
  }

  function chipMatchesRow(row, chip) {
    if (!chip.mapped) return true;
    // Station-level chip: line matches if ANY of its stations matches. Probe
    // the L2 detail row — if the L1 wasn't expanded already, restore its
    // collapsed state after probing so we don't leave rows expanded that the
    // user didn't intend (final expansion pass in autoExpandSubLineChips
    // opens matching rows anyway).
    if (STATION_L2_MAP[chip.fieldId]) {
      var wasExpanded = row.getAttribute('data-expanded') === 'true';
      var stations = stationRowsFor(row);
      var match = stations.length ? stations.some(function(s) { return stationCellMatches(s, chip); }) : false;
      if (!match && !wasExpanded) {
        var btn = row.querySelector('.proj-nested-table__expand-btn');
        if (btn) btn.click();
      }
      return match;
    }
    // Line-level chip: read from the L1 row directly.
    var val = readCellValue(row, chip.fieldId);
    if (val == null) return true;
    if (!chip.valueLabel) return val.length > 0;
    if (chip.valueLabel === 'Contains') return val.length > 0;
    if (chip.valueLabel === 'Without')  return val.length === 0;
    var baseMatch = val.toLowerCase().indexOf(chip.valueLabel.toLowerCase()) >= 0;
    if (chip.relation === 'not-equal') return !baseMatch;
    return baseMatch;
  }

  function clearBehavior() {
    var tbody = document.getElementById('lines-table-body');
    if (!tbody) return;
    tbody.querySelectorAll('.pf1-filter-hidden').forEach(function(r) {
      r.classList.remove('pf1-filter-hidden');
    });
    tbody.querySelectorAll('.pf1-filter-hit').forEach(function(el) {
      el.classList.remove('pf1-filter-hit');
    });
    tbody.querySelectorAll('.pf1-filter-row-hit').forEach(function(el) {
      el.classList.remove('pf1-filter-row-hit');
    });
    tbody.querySelectorAll('.pf1-filter-row-hit--focus').forEach(function(el) {
      el.classList.remove('pf1-filter-row-hit--focus');
    });
    // Header highlights live in the equipment table's own thead.
    var table = tbody.closest('table');
    if (table) {
      table.querySelectorAll('thead .table__header.pf1-filter-hit-header').forEach(function(th) {
        th.classList.remove('pf1-filter-hit-header');
      });
    }
    restoreHiddenColumns();
  }

  /* ---------- reveal hidden columns while filtered ----------
   * A column can be hidden via the settings drawer (inline `style.display=none`
   * on its th + every td). When a chip targets a hidden column, we reveal it
   * temporarily at 55% opacity and stamp an eye-slash icon on the header — so
   * the user sees the filter is landing somewhere real. When the chip is
   * removed (or the value cleared), restoreHiddenColumns puts `display:none`
   * back exactly on the elements that had it.
   *
   * We remember originals in `revealedColumns` (a Set of column indices with
   * the elements we touched), so we never re-hide a column that the user has
   * since manually unhidden through the drawer.
   */
  var revealedColumns = {};   // { colIndex: { th: Element, tds: Element[] } }

  function revealColumn(colIndex, table) {
    if (revealedColumns[colIndex]) return; // already revealed this cycle
    var headerRow = table.querySelector(':scope > thead > tr');
    if (!headerRow) return;
    var th = headerRow.children[colIndex - 1];
    if (!th || th.style.display !== 'none') return; // not hidden, nothing to reveal
    var tds = [];
    var tbody = document.getElementById('lines-table-body');
    if (tbody) {
      tbody.querySelectorAll(':scope > tr.table__row').forEach(function(row) {
        if (row.classList.contains('table__row--actions-bar') || row.classList.contains('table__row--equip-expanded')) return;
        var td = row.children[colIndex - 1];
        if (td && td.style.display === 'none') tds.push(td);
      });
    }
    // Reveal by clearing inline display and stamping our marker class.
    th.style.display = '';
    th.classList.add('pf1-col-revealed');
    tds.forEach(function(td) {
      td.style.display = '';
      td.classList.add('pf1-col-revealed');
    });
    // Real DOM badge (not a pseudo) so we can wire tooltip hover on it.
    var badge = document.createElement('span');
    badge.className = 'pf1-col-hidden-badge';
    badge.setAttribute('aria-label', 'Hidden column');
    badge.innerHTML =
      '<lucide-icon name="eye-off" style="font-size:14px"></lucide-icon>';
    badge._tooltipText = 'Hidden column';
    badge.addEventListener('mouseenter', function() { showShortcutTooltip(badge); });
    badge.addEventListener('mouseleave', hideShortcutTooltip);
    th.appendChild(badge);
    revealedColumns[colIndex] = { th: th, tds: tds, badge: badge };
  }

  function restoreHiddenColumns() {
    Object.keys(revealedColumns).forEach(function(k) {
      var entry = revealedColumns[k];
      if (entry.th) {
        entry.th.style.display = 'none';
        entry.th.classList.remove('pf1-col-revealed');
      }
      if (entry.badge && entry.badge.parentNode) {
        entry.badge.parentNode.removeChild(entry.badge);
      }
      entry.tds.forEach(function(td) {
        td.style.display = 'none';
        td.classList.remove('pf1-col-revealed');
      });
    });
    revealedColumns = {};
  }

  function cellMatchesChip(td, kind, chip, vMap) {
    var val = readCellValueGeneric(td, kind);
    if (val == null) return false;
    var presence = vMap ? vMap.presence : (COL_MAP[chip.fieldId] && COL_MAP[chip.fieldId].presence);
    var baseMatch;
    if (presence === 'contains') baseMatch = val.length > 0;
    else if (presence === 'without') baseMatch = val.length === 0;
    else if (!chip.valueLabel) baseMatch = val.length > 0;
    else if (chip.valueLabel === 'Contains') baseMatch = val.length > 0;
    else if (chip.valueLabel === 'Without') baseMatch = val.length === 0;
    else baseMatch = val.toLowerCase().indexOf(chip.valueLabel.toLowerCase()) >= 0;
    // Invert when the user picked "≠ Not equal" in the chip editor. Presence
    // leaves are exempt — Contains/Without already express their own negation.
    if (chip.relation === 'not-equal' && !presence &&
        chip.valueLabel !== 'Contains' && chip.valueLabel !== 'Without') {
      return !baseMatch;
    }
    return baseMatch;
  }

  function applyBehavior() {
    clearBehavior();
    var tbody = document.getElementById('lines-table-body');
    if (!tbody) { syncEmptyState(false); syncMatchNav(); return; }
    // Recompute .mapped for every chip on each apply — older chips (e.g. ones
    // restored from a Favorite saved before STATION_L2_MAP existed) might
    // still have a stale value.
    chips.forEach(function(c) { c.mapped = isMapped(c.fieldId); });
    var activeChips = chips.filter(function(c) { return c.mapped; });
    if (!activeChips.length) { syncEmptyState(false); syncMatchNav(); autoExpandSubLineChips(); return; }

    // Only L1 rows (Lines) — detail rows are skipped when we test rows.
    var rows = tbody.querySelectorAll(':scope > tr.proj-nested-table__row--level1');

    if (prefs.behavior === 'filter') {
      var visibleCount = 0;
      var stationChips = activeChips.filter(function(c) { return STATION_L2_MAP[c.fieldId]; });
      rows.forEach(function(row) {
        var allMatch = activeChips.every(function(c) { return chipMatchesRow(row, c); });
        if (!allMatch) {
          row.classList.add('pf1-filter-hidden');
          var det = row.nextElementSibling;
          if (det && det.classList && det.classList.contains('proj-nested-table__detail-row')) {
            det.classList.add('pf1-filter-hidden');
          }
        } else {
          visibleCount += 1;
          // Filter mode with station-level chips also hides L2 stations that
          // don't personally satisfy EVERY station chip — a matching line
          // shows only the stations that actually caused the match.
          if (stationChips.length) {
            stationRowsFor(row).forEach(function(sRow) {
              var allStationMatch = stationChips.every(function(c) { return stationCellMatches(sRow, c); });
              if (!allStationMatch) sRow.classList.add('pf1-filter-hidden');
            });
          }
        }
      });
      // FILTER mode signals the target COLUMN via a header highlight — the row
      // filter itself already tells the user which rows survived. For station
      // chips we highlight the L2 header (inside every visible expanded line);
      // for line chips we highlight the L1 header.
      var table = tbody.closest('table');
      var l1Headers = table ? table.querySelectorAll(':scope > thead > tr > .table__header') : null;
      activeChips.forEach(function(c) {
        if (STATION_L2_MAP[c.fieldId]) {
          var pos = STATION_L2_MAP[c.fieldId].headerNth;
          if (!pos) return;
          tbody.querySelectorAll(':scope > tr.proj-nested-table__detail-row:not(.pf1-filter-hidden) .l2__table > thead > tr > .table__header:nth-of-type(' + pos + ')').forEach(function(th) {
            th.classList.add('pf1-filter-hit-header');
          });
          return;
        }
        if (l1Headers) {
          var th = table.querySelector(':scope > thead > tr > .table__header[data-pf1-field="' + c.fieldId + '"]');
          if (th) th.classList.add('pf1-filter-hit-header');
        }
      });
      syncEmptyState(visibleCount === 0);
      syncMatchNav();
      autoExpandSubLineChips();
      return;
    }

    // SEARCH MODE — every row stays visible; only rows/cells that match get
    // painted. Line-level chip → `.pf1-filter-row-hit` on the L1 row + hit on
    // the matched L1 cell. Station-level chip → `.pf1-filter-row-hit` on the
    // matched L2 station row + hit on that station's cell (the L1 line stays
    // untouched so the row backdrop doesn't wash over stations that didn't
    // match).
    rows.forEach(function(row) {
      var allMatch = activeChips.every(function(c) { return chipMatchesRow(row, c); });
      if (!allMatch) return;
      var hasLineChip = false;
      activeChips.forEach(function(c) {
        if (STATION_L2_MAP[c.fieldId]) {
          stationRowsFor(row).forEach(function(sRow) {
            if (!stationCellMatches(sRow, c)) return;
            var sEl = sRow.querySelector(STATION_L2_MAP[c.fieldId].sel);
            var sCell = sEl && (sEl.closest('td') || sEl);
            if (sCell) sCell.classList.add('pf1-filter-hit');
            sRow.classList.add('pf1-filter-row-hit');
          });
          return;
        }
        hasLineChip = true;
        // Line-level chip → paint the L1 cell.
        var map = COL_MAP[c.fieldId];
        if (!map) return;
        var el = row.querySelector(map.cellSelector);
        if (!el) return;
        var val = readCellValueGeneric(el, map.kind);
        if (val == null) return;
        var m;
        if (!c.valueLabel) m = val.length > 0;
        else if (c.valueLabel === 'Contains') m = val.length > 0;
        else if (c.valueLabel === 'Without')  m = val.length === 0;
        else m = val.toLowerCase().indexOf(c.valueLabel.toLowerCase()) >= 0;
        if (c.relation === 'not-equal') m = !m;
        if (m) {
          var cell = el.closest('td') || el;
          cell.classList.add('pf1-filter-hit');
        }
      });
      // Only tint the L1 row when at least one chip was line-level. Station-
      // only chips already tint the matching L2 rows above.
      if (hasLineChip) row.classList.add('pf1-filter-row-hit');
    });
    // Search mode never hides rows — no empty state needed.
    syncEmptyState(false);
    syncMatchNav();
    autoExpandSubLineChips();
  }

  /* Post-filter expansion pass: chipMatchesRow may have opened rows to inspect
   * their L2 stations. Now enforce the desired state based on match result:
   *   - Row matched (has `.pf1-filter-row-hit` in Search mode, or is not
   *     hidden in Filter mode) AND at least one station chip is active
   *     → expand so the user can see the L2 match.
   *   - Row did NOT match (hidden in Filter mode, or no row-hit in Search
   *     mode) → collapse if it was auto-opened during probing.
   *   - No station chips → don't touch expansion state. */
  function autoExpandSubLineChips() {
    var hasStationChip = chips.some(function(c) { return STATION_L2_MAP[c.fieldId]; });
    var tbody = document.getElementById('lines-table-body');
    if (!tbody) return;
    var isSearch = prefs.behavior === 'search';
    tbody.querySelectorAll(':scope > tr.proj-nested-table__row--level1').forEach(function(row) {
      var isHidden = row.classList.contains('pf1-filter-hidden');
      // A line counts as matching if:
      //   - Filter mode: it wasn't hidden.
      //   - Search mode: it either got a row-hit itself (line-level chip) OR
      //     its expanded detail row contains any L2 station row with a hit
      //     (station-level chip paints the station row, not the line).
      var det = row.nextElementSibling;
      var hasDetail = det && det.classList && det.classList.contains('proj-nested-table__detail-row');
      var isMatch;
      if (isHidden) {
        isMatch = false;
      } else if (!isSearch) {
        isMatch = true;
      } else if (row.classList.contains('pf1-filter-row-hit')) {
        isMatch = true;
      } else {
        isMatch = hasDetail && !!det.querySelector('.pf1-filter-row-hit');
      }
      var isExpanded = row.getAttribute('data-expanded') === 'true';
      var btn = row.querySelector('.proj-nested-table__expand-btn');
      if (!btn) return;
      if (!isMatch && isExpanded) {
        btn.click();
        return;
      }
      if (isMatch && hasStationChip && !isExpanded) {
        btn.click();
      }
    });
  }

  /* ---------- match navigation (Search mode only) ----------
   * Navigation is ROW-BASED: matchList collects every visible row that has at
   * least one hit cell (`.pf1-filter-row-hit`), not individual cells. This way
   * a row that satisfies a chip combination counts once regardless of how many
   * cells inside it match.
   */
  function collectHits() {
    var tbody = document.getElementById('lines-table-body');
    if (!tbody) return [];
    // Pick up both L1 rows AND L2 station rows carrying the row-hit class —
    // station-level chips paint the L2 station row, so nav must step through
    // those individually.
    return Array.prototype.slice.call(
      tbody.querySelectorAll('tr.pf1-filter-row-hit:not(.pf1-filter-hidden)')
    );
  }

  function syncMatchNav() {
    if (!matchNav) return;
    var isSearch = prefs.behavior === 'search';
    // Filter mode → count visible L1 matches (rows not hidden). Nav arrows
    // are hidden via `.pf1-match-nav--count-only` because in Filter mode all
    // matches are already visible; there's nothing to step through.
    if (!isSearch) {
      var tbody = document.getElementById('lines-table-body');
      var visible = tbody
        ? tbody.querySelectorAll(':scope > tr.proj-nested-table__row--level1:not(.pf1-filter-hidden)').length
        : 0;
      // Show the total only when at least one chip is applied.
      if (!chips.length || !chips.some(function(c) { return isMapped(c.fieldId); })) {
        matchNav.hidden = true;
        matchList = [];
        matchIdx = -1;
        matchNav.classList.remove('pf1-match-nav--count-only');
        return;
      }
      matchNav.hidden = false;
      matchNav.classList.add('pf1-match-nav--count-only');
      if (matchNavCount) {
        matchNavCount.textContent = visible + (visible === 1 ? ' result found' : ' results found');
      }
      matchList = [];
      matchIdx = -1;
      return;
    }
    matchNav.classList.remove('pf1-match-nav--count-only');
    matchList = collectHits();
    if (!matchList.length) {
      matchNav.hidden = true;
      matchIdx = -1;
      return;
    }
    matchNav.hidden = false;
    // Preserve current index if still valid, otherwise reset to first.
    if (matchIdx < 0 || matchIdx >= matchList.length) matchIdx = 0;
    focusMatch(matchIdx, /*scroll*/ false);
    updateMatchCount();
  }

  function updateMatchCount() {
    if (!matchNavCount) return;
    if (!matchList.length) { matchNavCount.textContent = '0 of 0'; return; }
    matchNavCount.textContent = (matchIdx + 1) + ' of ' + matchList.length;
  }

  function focusMatch(idx, scroll) {
    if (!matchList.length) return;
    // Clear previous focus on both cell-level (legacy) and row-level markers.
    var tbody = document.getElementById('lines-table-body');
    if (tbody) {
      tbody.querySelectorAll('.pf1-filter-hit--focus, .pf1-filter-row-hit--focus').forEach(function(el) {
        el.classList.remove('pf1-filter-hit--focus');
        el.classList.remove('pf1-filter-row-hit--focus');
      });
    }
    matchIdx = ((idx % matchList.length) + matchList.length) % matchList.length;
    var target = matchList[matchIdx];
    if (!target) return;
    target.classList.add('pf1-filter-row-hit--focus');
    if (scroll) {
      // Scroll INSIDE the table container only — never let the page window
      // scroll, otherwise the sticky page header (build stages, tabs) drops out
      // of view. `block: 'nearest'` moves the row into view with the minimum
      // scroll delta; `scrollIntoViewOptions` doesn't touch ancestors that
      // aren't overflow-scrollable, so the outer page stays where it is.
      scrollRowIntoTable(target);
    }
    updateMatchCount();
  }

  /* Scroll the equipment table container just enough to bring `row` fully into
   * view, without ever scrolling the window (which would push the page header
   * off screen). Falls back to no-op if we can't find the scroll container. */
  function scrollRowIntoTable(row) {
    var container = row.closest('.table-container') || row.closest('[class*="table-container"]');
    if (!container) return;
    var containerRect = container.getBoundingClientRect();
    var rowRect = row.getBoundingClientRect();
    // Account for the sticky thead height so the row sits below it, not under it.
    var thead = container.querySelector('.table__head');
    var stickyOffset = thead ? thead.getBoundingClientRect().height : 0;
    var topDelta = rowRect.top - containerRect.top - stickyOffset;
    var bottomDelta = rowRect.bottom - containerRect.bottom;
    if (topDelta < 0) {
      container.scrollBy({ top: topDelta, behavior: 'smooth' });
    } else if (bottomDelta > 0) {
      container.scrollBy({ top: bottomDelta, behavior: 'smooth' });
    }
  }

  function nextMatch() { focusMatch(matchIdx + 1, true); }
  function prevMatch() { focusMatch(matchIdx - 1, true); }

  function clearAllChips() {
    if (!chips.length && !(input && input.value)) return;
    chips = [];
    if (input) input.value = '';
    renderChips();
    applyBehavior();
    if (input) input.focus();
  }

  /* Empty state — shown when Filter mode hides every row (0 matches) and there
   * are active chips. Hidden in Search mode (rows never disappear there) and
   * when there are no active chips. */
  var emptyState;
  function syncEmptyState(show) {
    if (!emptyState) emptyState = document.getElementById('pf1-filter-empty');
    if (!emptyState) return;
    emptyState.hidden = !show;
  }

  /* ---------- chip editor popover ----------
   * Shared singleton, appended to <body>, positioned below the clicked chip's
   * chevron. Lists Contains / Without modifiers, the field's options with a
   * checkmark on the active one, the Relation section (=Equal / ≠Not equal),
   * and Remove. Interacts through data-pf1-chip-action on click.
   */
  var chipEditorEl;
  var chipEditorForId = null;

  function ensureChipEditor() {
    if (chipEditorEl) return chipEditorEl;
    chipEditorEl = document.createElement('div');
    chipEditorEl.className = 'pf1-chip-editor';
    chipEditorEl.hidden = true;
    chipEditorEl.setAttribute('role', 'dialog');
    document.body.appendChild(chipEditorEl);

    chipEditorEl.addEventListener('click', function(e) {
      e.stopPropagation();
      var actionEl = e.target.closest('[data-pf1-chip-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-pf1-chip-action');
      var chipId = chipEditorForId;
      var chip = chips.filter(function(c) { return c.id === chipId; })[0];
      if (!chip) return;
      if (action === 'remove') {
        chips = chips.filter(function(c) { return c.id !== chipId; });
        renderChips();
        applyBehavior();
        closeChipEditor();
        return;
      }
      if (action === 'set-value') {
        chip.valueLabel = actionEl.getAttribute('data-value') || '';
        renderChips();
        applyBehavior();
        closeChipEditor();
        return;
      }
      if (action === 'set-relation') {
        chip.relation = actionEl.getAttribute('data-relation') || 'equal';
        renderChips();
        applyBehavior();
        closeChipEditor();
        return;
      }
    });
  }

  function renderChipEditorFor(chip) {
    var found = findField(chip.fieldId);
    if (!found) return;
    var opts = (found.field.options || []).slice();
    var currentIsPresence = chip.valueLabel === 'Contains' || chip.valueLabel === 'Without';

    var checkSvg = '<lucide-icon name="check" class="pf1-chip-editor__check" style="font-size:12px"></lucide-icon>';
    function optRow(label, isActive, action, extras) {
      return '<button type="button" class="pf1-chip-editor__row' + (isActive ? ' pf1-chip-editor__row--active' : '') +
        '" ' + action + '>' +
        '<span class="pf1-chip-editor__row-label">' + label + '</span>' +
        (isActive ? checkSvg : '') +
        (extras || '') +
      '</button>';
    }

    var html = '<div class="pf1-chip-editor__section-title">Selection options</div>';
    html += optRow('Contains', chip.valueLabel === 'Contains', 'data-pf1-chip-action="set-value" data-value="Contains"');
    html += optRow('Without',  chip.valueLabel === 'Without',  'data-pf1-chip-action="set-value" data-value="Without"');
    if (opts.length) {
      html += '<div class="pf1-chip-editor__divider"></div>';
      opts.forEach(function(o) {
        var label = typeof o === 'string' ? o : o.label;
        var value = typeof o === 'string' ? o : (o.value != null ? o.value : o.label);
        html += optRow(label, chip.valueLabel === value, 'data-pf1-chip-action="set-value" data-value="' + value + '"');
      });
    }
    // Relation only makes sense when a value is picked (not a Contains/Without leaf).
    if (chip.valueLabel && !currentIsPresence) {
      html += '<div class="pf1-chip-editor__divider"></div>';
      html += '<div class="pf1-chip-editor__section-title">Relation</div>';
      html += optRow('<span class="pf1-chip-editor__rel-symbol">=</span> Equal',      (chip.relation || 'equal') === 'equal',    'data-pf1-chip-action="set-relation" data-relation="equal"');
      html += optRow('<span class="pf1-chip-editor__rel-symbol">≠</span> Not equal',  chip.relation === 'not-equal',              'data-pf1-chip-action="set-relation" data-relation="not-equal"');
    }
    html += '<div class="pf1-chip-editor__divider"></div>';
    html += '<button type="button" class="pf1-chip-editor__row pf1-chip-editor__row--remove" data-pf1-chip-action="remove">Remove</button>';

    chipEditorEl.innerHTML = html;
  }

  function positionChipEditor(chipEl) {
    var rect = chipEl.getBoundingClientRect();
    chipEditorEl.style.position = 'fixed';
    chipEditorEl.style.top = (rect.bottom + 4) + 'px';
    chipEditorEl.style.left = rect.left + 'px';
    chipEditorEl.style.minWidth = Math.max(rect.width, 220) + 'px';
    chipEditorEl.style.zIndex = '1200';
  }

  function openChipEditor(chip, chipEl) {
    ensureChipEditor();
    chipEditorForId = chip.id;
    renderChipEditorFor(chip);
    positionChipEditor(chipEl);
    chipEditorEl.hidden = false;
  }

  function closeChipEditor() {
    if (!chipEditorEl) return;
    chipEditorEl.hidden = true;
    chipEditorForId = null;
  }

  /* ---------- options popover ---------- */
  function renderOptionsPop() {
    var isFilter = prefs.behavior === 'filter';
    var isSearch = prefs.behavior === 'search';
    var favOn = prefs.favoritesVisible === 'show';
    optionsPop.innerHTML =
      '<h4 class="pf-opts__header">Filter/Search Settings</h4>' +
      '<section class="pf-opts__group">' +
        '<h5 class="pf-opts__title">Behavior</h5>' +
        '<label class="pf-opts__row">' +
          '<input type="radio" name="pf1-behavior" value="filter"' + (isFilter ? ' checked' : '') + '>' +
          '<span class="pf-opts__row-body">' +
            '<span class="pf-opts__row-head"><lucide-icon name="line.3.horizontal.decrease"></lucide-icon><strong>Filter</strong></span>' +
            '<em>Hide rows without match</em>' +
          '</span>' +
        '</label>' +
        '<label class="pf-opts__row">' +
          '<input type="radio" name="pf1-behavior" value="search"' + (isSearch ? ' checked' : '') + '>' +
          '<span class="pf-opts__row-body">' +
            '<span class="pf-opts__row-head"><lucide-icon name="magnifyingglass"></lucide-icon><strong>Search</strong></span>' +
            '<em>Highlight matches, keep all rows</em>' +
          '</span>' +
        '</label>' +
      '</section>' +
      '<section class="pf-opts__group">' +
        '<div class="pf-opts__group-head">' +
          '<h5 class="pf-opts__title">Favorites</h5>' +
          '<label class="pf-opts__switch">' +
            '<input type="checkbox" id="pf1-favorites-toggle"' + (favOn ? ' checked' : '') + '>' +
            '<span class="pf-opts__switch-slider"></span>' +
          '</label>' +
        '</div>' +
        '<p class="pf-opts__group-desc">View searches you saved as favorites for Filter/Search</p>' +
      '</section>';
  }

  function openOptions() {
    // Filter panel and options popover are mutually exclusive — see openPanel.
    closePanel();
    optionsPop.hidden = false;
    optionsBtn.setAttribute('aria-expanded', 'true');
    renderOptionsPop();
  }

  function closeOptions() {
    optionsPop.hidden = true;
    optionsBtn.setAttribute('aria-expanded', 'false');
  }

  function bind() {
    // Toggle: mousedown handles closing (fires BEFORE the browser sets focus,
    // so we can preventDefault to skip the focus that would re-open the panel).
    // Opening is driven by the focus handler for both mouse and keyboard.
    input.addEventListener('mousedown', function(e) {
      if (root.classList.contains('pf-filter--open') && document.activeElement === input) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
        input.blur();
      }
    });
    input.addEventListener('focus', function() {
      openPanel();
    });
    input.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    input.addEventListener('input', function() {
      syncHasContent();
      if (root.classList.contains('pf-filter--open') && panelBody.getAttribute('data-view') === 'main') {
        renderMainView();
      }
    });
    input.addEventListener('keydown', function(e) {
      // Backspace / Delete on an empty input removes the last chip so users can
      // undo committed filters straight from the keyboard.
      if ((e.key === 'Backspace' || e.key === 'Delete') && !input.value && chips.length) {
        e.preventDefault();
        removeChip(chips[chips.length - 1].id);
        return;
      }
      // Enter / Shift+Enter navigate matches when Search mode is active — same
      // gesture the WhatsApp / browser find bar uses.
      if (e.key === 'Enter' && matchList && matchList.length && prefs.behavior === 'search') {
        e.preventDefault();
        if (e.shiftKey) prevMatch(); else nextMatch();
      }
    });

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearAllChips();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!chips.length) return;
        if (currentIsFavorited()) removeFavoriteBySig(chipsSignature(chips));
        else saveCurrentAsFavorite();
      });
    }

    panel.addEventListener('click', function(e) {
      e.stopPropagation();

      var favClearAll = e.target.closest('[data-fav-clear-all]');
      if (favClearAll) {
        clearAllFavorites();
        return;
      }

      var favHide = e.target.closest('[data-fav-hide]');
      if (favHide) {
        prefs.favoritesVisible = 'hide';
        savePref(STORAGE.favoritesVisible, prefs.favoritesVisible);
        reRenderMainIfOpen();
        return;
      }

      var favRemove = e.target.closest('[data-fav-remove]');
      if (favRemove) {
        removeFavoriteByIdx(parseInt(favRemove.getAttribute('data-fav-remove'), 10));
        return;
      }

      var favRow = e.target.closest('.pf-filter__fav-row');
      if (favRow) {
        applyFavorite(parseInt(favRow.getAttribute('data-fav-idx'), 10));
        return;
      }

      var back = e.target.closest('[data-pf-back]');
      if (back) {
        // Clear the header-shortcut hint when the user manually navigates back
        // to the main list — otherwise Smart order would still be filtering by
        // the field label.
        var val = input.value;
        if (val) {
          var isHint = CATEGORIES.some(function(cat) {
            return cat.fields.some(function(f) { return f.label === val; });
          });
          if (isHint) { input.value = ''; syncHasContent(); }
        }
        renderMainView();
        return;
      }

      var tag = e.target.closest('.pf-filter__tag');
      if (tag) {
        var fieldId = tag.getAttribute('data-field-id');
        var found = findField(fieldId);
        if (found && found.field.options) {
          // If the user already typed a value that matches one of the field's
          // options (or Contains/Without), commit the chip directly instead
          // of forcing them to pick again from the sub-view.
          var typed = (input.value || '').trim();
          if (typed) {
            var lc = typed.toLowerCase();
            var picked = null;
            if (lc === 'contains') picked = 'Contains';
            else if (lc === 'without') picked = 'Without';
            else {
              for (var oi = 0; oi < found.field.options.length; oi++) {
                var opt = found.field.options[oi];
                if (String(opt).toLowerCase() === lc) { picked = String(opt); break; }
              }
            }
            if (picked) {
              addChip(found.category.label, found.field.id, found.field.label, picked);
              closePanel();
              return;
            }
          }
          renderSubView(fieldId);
        } else if (found) {
          addChip(found.category.label, found.field.id, found.field.label, '');
          closePanel();
        }
        return;
      }

      var option = e.target.closest('.pf-filter__option');
      if (option) {
        var fid = option.getAttribute('data-field-id');
        var val = option.getAttribute('data-value');
        var f = findField(fid);
        if (f) addChip(f.category.label, f.field.id, f.field.label, val);
        closePanel();
        return;
      }
    });

    chipsHost.addEventListener('click', function(e) {
      var chipEl = e.target.closest('.pf-filter__chip');
      if (!chipEl) return;
      e.stopPropagation();
      var chipId = chipEl.getAttribute('data-chip-id');
      var chip = chips.filter(function(c) { return c.id === chipId; })[0];
      if (!chip) return;
      openChipEditor(chip, chipEl);
    });

    optionsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (optionsPop.hidden) openOptions();
      else closeOptions();
    });

    optionsPop.addEventListener('click', function(e) { e.stopPropagation(); });
    optionsPop.addEventListener('change', function(e) {
      var t = e.target;
      if (t.name === 'pf1-behavior') {
        prefs.behavior = t.value;
        savePref(STORAGE.behavior, prefs.behavior);
        syncFieldIcon();
        applyBehavior();
      } else if (t.id === 'pf1-favorites-toggle') {
        prefs.favoritesVisible = t.checked ? 'show' : 'hide';
        savePref(STORAGE.favoritesVisible, prefs.favoritesVisible);
        reRenderMainIfOpen();
      }
    });

    document.addEventListener('click', function(e) {
      if (!root.contains(e.target)) {
        closePanel();
        closeOptions();
      }
      if (chipEditorEl && !chipEditorEl.hidden &&
          !chipEditorEl.contains(e.target) && !e.target.closest('.pf-filter__chip')) {
        closeChipEditor();
      }
    });

    // Match nav pill — prev/next/clear.
    if (matchNav) {
      matchNav.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-pf1-nav]');
        if (!btn) return;
        var action = btn.getAttribute('data-pf1-nav');
        if (action === 'next') nextMatch();
        else if (action === 'prev') prevMatch();
      });
    }

    // Empty state actions.
    var emptyClear = document.getElementById('pf1-filter-empty-clear');
    var emptyAdd   = document.getElementById('pf1-filter-empty-add');
    if (emptyClear) emptyClear.addEventListener('click', function(e) {
      e.preventDefault();
      clearAllChips();
    });
    if (emptyAdd) emptyAdd.addEventListener('click', function(e) {
      e.preventDefault();
      // Reuse the existing add-row button behavior so we don't fork logic.
      var addBtn = document.getElementById('pf1-add-row-btn');
      if (addBtn) addBtn.click();
    });

    document.addEventListener('keydown', function(e) {
      // ⌘K / Ctrl+K opens THIS filter only when the Equipment List tab is active.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        var panelEl = document.getElementById('consumables');
        if (!panelEl || !panelEl.classList.contains('tabs__panel--active')) return;
        e.preventDefault();
        input.focus();
        openPanel();
        return;
      }
      if (e.key === 'Escape') {
        if (chipEditorEl && !chipEditorEl.hidden) { closeChipEditor(); return; }
        if (!optionsPop.hidden) { closeOptions(); return; }
        if (root.classList.contains('pf-filter--open')) {
          closePanel();
          input.blur();
        }
      }
    });
  }

  /* ---------- header shortcut icons ----------
   * Each equipment table th carries `data-pf1-field="…"` (added in the HTML).
   * We append a hover-revealed filter icon that opens PF1Filter.openField(fid).
   * The icon element itself is always in the DOM; visibility comes from CSS
  /* Right-side icon group — ensures a single absolutely-positioned flex row
   * holds the shortcut + info + sort so 8px gaps are guaranteed regardless of
   * each icon's intrinsic width. Order (left → right): shortcut, info, sort.
   *
   * If the th has a `.header-info` or `.sort-indicator` in its markup, we move
   * them into the group (once) and prepend the shortcut button in front.
   * Idempotent — the presence of `.pf1-col-shortcut` inside the group is the
   * guard for re-runs. */
  /* Wrap the header's leading text node in a `.th-label` span so it can carry
   * its own `overflow: hidden; text-overflow: ellipsis` — plain text nodes
   * inside a `<th>` don't get truncated by CSS ellipsis because table cells
   * grow to fit non-wrapping content. Idempotent; skips headers already wrapped
   * or whose first meaningful child is not a text node (e.g. `eq-name` starts
   * with a checkbox). */
  function wrapHeaderLabel(th) {
    if (th.querySelector(':scope > .th-label')) return;
    var first = th.firstChild;
    // Trim leading empty whitespace text nodes.
    while (first && first.nodeType === Node.TEXT_NODE && !first.textContent.trim()) {
      var next = first.nextSibling;
      th.removeChild(first);
      first = next;
    }
    if (!first || first.nodeType !== Node.TEXT_NODE || !first.textContent.trim()) return;
    var span = document.createElement('span');
    span.className = 'th-label';
    span.textContent = first.textContent;
    th.replaceChild(span, first);
  }

  function injectHeaderShortcutIcons() {
    var ths = document.querySelectorAll('#process-flow .table--lines > thead .table__header[data-pf1-field]');
    ths.forEach(function(th) {
      wrapHeaderLabel(th);
      if (th.querySelector('.pf1-col-shortcut')) return; // already injected
      var fid = th.getAttribute('data-pf1-field');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf1-col-shortcut';
      btn.setAttribute('data-pf1-field', fid);
      btn.setAttribute('aria-label', 'Filter/search shortcut');
      // Tooltip is rendered via a body-portaled element (see showShortcutTooltip)
      // rather than a proj-tooltip pseudo — the table-container has overflow:auto
      // which clips anything above the thead, so we can't rely on the CSS-only
      // tooltip here.
      btn._tooltipText = 'Filter/search shortcut';
      btn.innerHTML = '<lucide-icon></lucide-icon>';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        hideShortcutTooltip();
        window.PF1Filter.openField(fid);
      });
      btn.addEventListener('mouseenter', function() { showShortcutTooltip(btn); });
      btn.addEventListener('mouseleave', hideShortcutTooltip);
      btn.addEventListener('focus', function() { showShortcutTooltip(btn); });
      btn.addEventListener('blur', hideShortcutTooltip);

      var group = document.createElement('span');
      group.className = 'th-icon-group';
      group.appendChild(btn);
      var info = th.querySelector('.header-info');
      if (info) group.appendChild(info);
      var sort = th.querySelector('.sort-indicator');
      if (sort) group.appendChild(sort);
      th.appendChild(group);
    });
  }

  /* Body-portaled tooltip so the bubble escapes the table-container's overflow
   * clip. Positions itself above the target and shifts horizontally if it would
   * overflow the viewport. Single reusable element. */
  var _shortcutTooltip;
  function ensureShortcutTooltip() {
    if (_shortcutTooltip) return _shortcutTooltip;
    _shortcutTooltip = document.createElement('div');
    _shortcutTooltip.className = 'pf1-col-shortcut-tooltip';
    _shortcutTooltip.hidden = true;
    document.body.appendChild(_shortcutTooltip);
    return _shortcutTooltip;
  }
  function showShortcutTooltip(btn) {
    var tip = ensureShortcutTooltip();
    tip.textContent = btn._tooltipText || '';
    tip.hidden = false;
    // Position after making visible so we can measure width.
    var rect = btn.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();
    var top = rect.top - tipRect.height - 8;
    var left = rect.left + rect.width / 2 - tipRect.width / 2;
    // Keep the bubble within the viewport horizontally.
    var vw = window.innerWidth;
    if (left < 8) left = 8;
    if (left + tipRect.width > vw - 8) left = vw - tipRect.width - 8;
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
    // Arrow position relative to the bubble.
    var arrowLeft = rect.left + rect.width / 2 - left;
    tip.style.setProperty('--arrow-left', arrowLeft + 'px');
  }
  function hideShortcutTooltip() {
    if (_shortcutTooltip) _shortcutTooltip.hidden = true;
  }

  /* ---------- toast (favorites save/remove feedback) ----------
   * Body-portaled singleton pill, bottom-center. showUndoToast keeps the toast
   * open for 5s with an Undo button that reverses the last remove; showToast
   * is a plain confirmation (2.5s, no button). Both share the same DOM node,
   * so a newer toast supersedes an older one.
   */
  var _toastEl, _toastTimer;
  function ensureToast() {
    if (_toastEl) return _toastEl;
    _toastEl = document.createElement('div');
    _toastEl.className = 'pf-filter-toast';
    _toastEl.hidden = true;
    document.body.appendChild(_toastEl);
    return _toastEl;
  }
  function hideToast() {
    if (_toastEl) _toastEl.hidden = true;
  }
  function showToast(msg) {
    var el = ensureToast();
    clearTimeout(_toastTimer);
    el.innerHTML = '<span class="pf-filter-toast__msg">' + msg + '</span>';
    el.hidden = false;
    _toastTimer = setTimeout(hideToast, 2500);
  }
  function showUndoToast(msg, onUndo) {
    var el = ensureToast();
    clearTimeout(_toastTimer);
    el.innerHTML =
      '<span class="pf-filter-toast__msg">' + msg + '</span>' +
      '<button type="button" class="pf-filter-toast__undo">Undo</button>';
    el.hidden = false;
    var used = false;
    el.querySelector('.pf-filter-toast__undo').addEventListener('click', function() {
      if (used) return;
      used = true;
      onUndo();
      hideToast();
    });
    _toastTimer = setTimeout(hideToast, 5000);
  }

  window.PF1Filter = {
    init: function() {
      root = document.querySelector('#process-flow .pf-filter');
      if (!root) return;
      input      = root.querySelector('.pf-filter__input');
      chipsHost  = root.querySelector('.pf-filter__chips');
      panel      = root.querySelector('.pf-filter__panel');
      panelBody  = root.querySelector('.pf-filter__panel-body');
      clearAllBtn = root.querySelector('.pf-filter__clear-all');
      saveBtn    = root.querySelector('.pf-filter__save-btn');
      optionsBtn = root.querySelector('.pf-filter__options-btn');
      optionsPop = root.querySelector('.pf-filter__options-pop');
      matchNav      = document.getElementById('pf1-match-nav');
      matchNavCount = document.getElementById('pf1-match-nav-count');
      matchList = [];
      matchIdx  = -1;
      if (!input || !panel || !panelBody || !chipsHost || !optionsBtn || !optionsPop) return;
      bind();
      injectHeaderShortcutIcons();
      syncFieldIcon();
      syncHasContent();
      syncSaveButton();
    },
    // Re-apply on demand — EquipmentTable.render() calls this so chips survive
    // full-table rerenders (build-stage change, preset toggle, add row, etc.).
    reapply: function() { applyBehavior(); },
    // Column header shortcut — called by the ▼ icon that appears on hover of a
    // table__header. If the field has options, opens the sub-view (Contains /
    // Without + option list) AND writes the field name into the keyword input
    // as a visual hint. If it's a leaf, adds an empty chip directly.
    openField: function(fieldId) {
      var found = findField(fieldId);
      if (!found) return;
      openPanel();
      if (found.field.options && found.field.options.length) {
        // Reflect the field label in the input so the user sees which column
        // they're filtering. The panel is already showing the sub-view.
        input.value = found.field.label;
        syncHasContent();
        renderSubView(fieldId);
      } else {
        addChip(found.category.label, found.field.id, found.field.label, '');
        closePanel();
      }
      input.focus();
    }
  };
})();
