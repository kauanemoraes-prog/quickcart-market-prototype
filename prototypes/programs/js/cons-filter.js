/* Consumables filter — same UX as EqFilter but scoped to the Consumables tab.
 *
 * Two-level dropdown panel with categories tuned for the Consumables table
 * (Consumable, Vendor, Metrics). Selecting an option renders a chip inside the
 * input.
 *
 * Options popover (⋯), persisted in localStorage under `davinci:cons-filter:*`
 * keys — completely independent from the other filters:
 *   - Behavior:  'filter' | 'search'
 *   - Order:     'alpha'  | 'smart'
 *   - Favorites: 'show'   | 'hide'
 *
 * Favorites cap 6, header shortcut icons, match navigation, undo toast — all
 * behave exactly like the Equipment filter. Matching maps chips to the
 * Consumables tbody `#consumables-table-body`. */
(function() {
  'use strict';

  var STORAGE = {
    behavior:         'davinci:cons-filter:behavior',
    order:            'davinci:cons-filter:order',
    favoritesVisible: 'davinci:cons-filter:favorites-visible',
    favorites:        'davinci:cons-filter:favorites'
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
      id: 'station',
      label: 'Workstation',
      fields: [
        { id: 'cs-station-name',       label: 'Workstation Name' },
        { id: 'cs-application-name',   label: 'Application Name' }
      ]
    },
    {
      id: 'consumable',
      label: 'Material',
      fields: [
        { id: 'cs-name',               label: 'Material Name' },
        { id: 'cs-type',               label: 'Material Type',   options: ['Adhesive', 'Chemical', 'Film', 'Paste', 'Oil', 'Wire', 'Wipe', 'Safety'] },
        { id: 'cs-category',           label: 'Category',          options: ['Bonding', 'Cleaning', 'Protection', 'Thermal', 'Lubricant', 'Soldering', 'ESD'] },
        { id: 'cs-subcategory',        label: 'Subcategory',       options: ['Tape', 'Solution', 'Surface', 'Interface', 'Synthetic', 'Lead-Free', 'No-Clean', 'Solvent', 'Grounding', 'Disposable'] },
        { id: 'cs-eng-intent',         label: 'ENG Intent',        options: ['Production', 'Maintenance', 'Safety'] },
        { id: 'cs-mp-intent',          label: 'MP Intent',         options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'cs-apple-pn',           label: 'Internal PN' },
        { id: 'cs-cm-pn',              label: 'CM PN' },
        { id: 'cs-item-description',   label: 'Item Description' },
        { id: 'cs-safety-data-sheet',  label: 'Safety Data Sheet' },
        { id: 'cs-technical-data-sheet', label: 'Technical Data Sheet' },
        { id: 'cs-lifecycle',          label: 'Lifecycle' }
      ]
    },
    {
      id: 'vendor',
      label: 'Vendor',
      fields: [
        { id: 'cs-vendor',             label: 'Vendor' },
        { id: 'cs-vendor-pn',          label: 'Vendor PN' }
      ]
    },
    {
      id: 'package',
      label: 'Package',
      fields: [
        { id: 'cs-package',            label: 'Package' },
        { id: 'cs-package-uom',        label: 'Package UOM' },
        { id: 'cs-package-description',label: 'Package Description' },
        { id: 'cs-package-cost',       label: 'Package Cost' },
        { id: 'cs-purchase-pack',      label: 'Purchase Pack' },
        { id: 'cs-uom',                label: 'Unit of Measure (UOM)' },
        { id: 'cs-cost-per-uom',       label: 'Cost per UOM' }
      ]
    },
    {
      id: 'metrics',
      label: 'Metrics',
      fields: [
        { id: 'cs-usage-test-points',  label: 'Usage/Test Points per Unit' },
        { id: 'cs-retest-rate',        label: 'Retest Rate or Waste Assumption' },
        { id: 'cs-effective-usage',    label: 'Effective Usage per Unit' },
        { id: 'cs-tested-rate',        label: 'Tested Rate' },
        { id: 'cs-build-duration',     label: 'Build Duration' },
        { id: 'cs-buffer',             label: 'Buffer' },
        { id: 'cs-eng-daily-usage',    label: 'Engineering Daily Usage' },
        { id: 'cs-eng-order-qty',      label: 'Eng. Order Qty (Calculated)' }
      ]
    }
  ];

  var MODIFIERS = [
    { id: 'contains', label: 'Contains' },
    { id: 'without',  label: 'Without' }
  ];

  /* Column mapping — 1-based nth-of-type index into `#consumables-table-body tr`.
   * Consumables table has 32 columns total. First 2 are the sticky Station Name
   * + Application name; the remaining 30 are rendered from
   * `consumablesColumns` in consumables-table.js. `kind` drives how we read the
   * cell: 'input' → <input> inside td, 'text' → td.textContent trimmed. */
  var COL_MAP = {
    'cs-station-name':          { col: 1,  kind: 'input' },
    'cs-application-name':      { col: 2,  kind: 'input' },
    'cs-name':                  { col: 3,  kind: 'input' },
    'cs-vendor':                { col: 4,  kind: 'input' },
    'cs-vendor-pn':             { col: 5,  kind: 'input' },
    'cs-eng-intent':            { col: 6,  kind: 'input' },
    'cs-mp-intent':             { col: 7,  kind: 'input' },
    'cs-type':                  { col: 8,  kind: 'input' },
    'cs-category':              { col: 9,  kind: 'input' },
    'cs-subcategory':           { col: 10, kind: 'input' },
    'cs-item-description':      { col: 11, kind: 'input' },
    'cs-apple-pn':              { col: 12, kind: 'input' },
    'cs-cm-pn':                 { col: 13, kind: 'input' },
    'cs-package':               { col: 14, kind: 'input' },
    'cs-package-uom':           { col: 15, kind: 'input' },
    'cs-package-description':   { col: 16, kind: 'input' },
    'cs-package-cost':          { col: 17, kind: 'input' },
    'cs-purchase-pack':         { col: 18, kind: 'input' },
    'cs-uom':                   { col: 19, kind: 'input' },
    'cs-cost-per-uom':          { col: 20, kind: 'input' },
    'cs-safety-data-sheet':     { col: 21, kind: 'input' },
    'cs-technical-data-sheet':  { col: 22, kind: 'input' },
    'cs-installed-image':       { col: 23, kind: 'input' },
    'cs-usage-test-points':     { col: 24, kind: 'input' },
    'cs-retest-rate':           { col: 25, kind: 'input' },
    'cs-lifecycle':             { col: 26, kind: 'input' },
    'cs-effective-usage':       { col: 27, kind: 'input' },
    'cs-tested-rate':           { col: 28, kind: 'input' },
    'cs-build-duration':        { col: 29, kind: 'input' },
    'cs-buffer':                { col: 30, kind: 'input' },
    'cs-eng-daily-usage':       { col: 31, kind: 'input' },
    'cs-eng-order-qty':         { col: 32, kind: 'input' }
  };

  /* Consumables has no vendor sub-table, so the vendor map is intentionally
   * empty — `chipMatchesRow` falls through to the standard column lookup. */
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

  function isMapped(fieldId) { return !!(COL_MAP[fieldId] || VENDOR_COL_MAP[fieldId]); }

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
    document.querySelectorAll('#materials .table--consumables > thead .cs-col-shortcut lucide-icon').forEach(function(s) {
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
    'eq-short-name':       true,
    'eq-version-notes':    true,
    'eq-name':             true,
    'eq-station-name':     true,
    'eq-reporting-mapping':true,
    'eq-line-name':        true,
    'vd-aqid':             true,
    'vd-cm-pn':            true,
    'vd-vendor-pn':        true
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
  function readCellValueGeneric(td, kind) {
    if (!td) return null;
    if (kind === 'dropdown') {
      var dd = td.querySelector('.equip-dropdown');
      return dd ? (dd.getAttribute('data-value') || '').trim() : '';
    }
    if (kind === 'text') return (td.textContent || '').trim();
    if (kind === 'button') {
      // Description/Revisions/Notes/ValidationType cells hold a popover trigger.
      // The rendered value lives on data-value on the button (if the popover was
      // saved). Falls back to empty string for the "never edited" state.
      var btn = td.querySelector('.equip-desc-btn');
      return btn ? (btn.getAttribute('data-value') || '').trim() : '';
    }
    var inp = td.querySelector('input');
    if (inp) return (inp.value || '').trim();
    return (td.textContent || '').trim();
  }

  function readCellValue(row, fieldId) {
    var map = COL_MAP[fieldId];
    if (!map) return null;
    var tds = row.children;
    if (!tds || map.col > tds.length) return null;
    return readCellValueGeneric(tds[map.col - 1], map.kind);
  }

  /* Vendor sub-table match: `row` is the main equipment tr; we walk its
   * next sibling (.table__row--equip-expanded) into the inner .table--vendors
   * tbody and test each vendor tr against the chip. Match if ANY vendor bats. */
  function vendorRowsFor(row) {
    var det = row.nextElementSibling;
    if (!det || !det.classList || !det.classList.contains('table__row--equip-expanded')) return [];
    var sub = det.querySelector('.table--vendors tbody');
    if (!sub) return [];
    return Array.prototype.slice.call(sub.querySelectorAll(':scope > tr.table__row'));
  }

  function chipMatchesRow(row, chip) {
    if (!chip.mapped) return true;

    // Vendor-scope chip: the row matches if any of its vendors matches.
    if (VENDOR_COL_MAP[chip.fieldId]) {
      var vMap = VENDOR_COL_MAP[chip.fieldId];
      var vRows = vendorRowsFor(row);
      if (!vRows.length) return false;
      return vRows.some(function(vRow) {
        return cellMatchesChip(vRow.children[vMap.col - 1], vMap.kind, chip, vMap);
      });
    }

    // Standard column chip.
    var map = COL_MAP[chip.fieldId];
    if (!map) return true;
    var td = row.children[map.col - 1];
    if (!td) return true;
    return cellMatchesChip(td, map.kind, chip, null);
  }

  function clearBehavior() {
    var tbody = document.getElementById('consumables-table-body');
    if (!tbody) return;
    tbody.querySelectorAll('.cons-filter-hidden').forEach(function(r) {
      r.classList.remove('cons-filter-hidden');
    });
    tbody.querySelectorAll('.cons-filter-hit').forEach(function(el) {
      el.classList.remove('cons-filter-hit');
    });
    tbody.querySelectorAll('.cons-filter-row-hit').forEach(function(el) {
      el.classList.remove('cons-filter-row-hit');
    });
    tbody.querySelectorAll('.cons-filter-row-hit--focus').forEach(function(el) {
      el.classList.remove('cons-filter-row-hit--focus');
    });
    // Header highlights live in the equipment table's own thead.
    var table = tbody.closest('table');
    if (table) {
      table.querySelectorAll('thead .table__header.cons-filter-hit-header').forEach(function(th) {
        th.classList.remove('cons-filter-hit-header');
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
    var tbody = document.getElementById('consumables-table-body');
    if (tbody) {
      tbody.querySelectorAll(':scope > tr.table__row').forEach(function(row) {
        if (row.classList.contains('table__row--actions-bar') || row.classList.contains('table__row--equip-expanded')) return;
        var td = row.children[colIndex - 1];
        if (td && td.style.display === 'none') tds.push(td);
      });
    }
    // Reveal by clearing inline display and stamping our marker class.
    th.style.display = '';
    th.classList.add('cs-col-revealed');
    tds.forEach(function(td) {
      td.style.display = '';
      td.classList.add('cs-col-revealed');
    });
    // Real DOM badge (not a pseudo) so we can wire tooltip hover on it.
    var badge = document.createElement('span');
    badge.className = 'cs-col-hidden-badge';
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
        entry.th.classList.remove('cs-col-revealed');
      }
      if (entry.badge && entry.badge.parentNode) {
        entry.badge.parentNode.removeChild(entry.badge);
      }
      entry.tds.forEach(function(td) {
        td.style.display = 'none';
        td.classList.remove('cs-col-revealed');
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
    var tbody = document.getElementById('consumables-table-body');
    if (!tbody) { syncEmptyState(false); syncMatchNav(); return; }
    var activeChips = chips.filter(function(c) { return c.mapped; });
    if (!activeChips.length) { syncEmptyState(false); syncMatchNav(); return; }

    var table = tbody.closest('table');
    var headers = table ? table.querySelectorAll(':scope > thead > tr > .table__header') : null;

    // Reveal hidden columns targeted by active chips (55% opacity, eye-slash
    // marker) so the filter is visible even when the view has that column off.
    if (table) {
      activeChips.forEach(function(c) {
        var map = COL_MAP[c.fieldId];
        if (map) revealColumn(map.col, table);
      });
    }

    // Only rows that are actual equipment rows (not expanded vendor sub-tables).
    var rows = tbody.querySelectorAll(':scope > tr.table__row:not(.table__row--equip-expanded):not(.table__row--actions-bar)');

    if (prefs.behavior === 'filter') {
      // FILTER MODE — hide rows without match. Highlight the HEADER of each
      // column referenced by an active chip (not the individual cells).
      var visibleCount = 0;
      rows.forEach(function(row) {
        var allMatch = activeChips.every(function(c) { return chipMatchesRow(row, c); });
        if (!allMatch) {
          row.classList.add('cons-filter-hidden');
          var det = row.nextElementSibling;
          if (det && det.classList && det.classList.contains('table__row--equip-expanded')) {
            det.classList.add('cons-filter-hidden');
          }
        } else {
          visibleCount += 1;
        }
      });
      if (headers) {
        activeChips.forEach(function(c) {
          var map = COL_MAP[c.fieldId];
          if (!map) return; // vendor chips have no top-level header
          var th = headers[map.col - 1];
          if (th) th.classList.add('cons-filter-hit-header');
        });
      }
      syncEmptyState(visibleCount === 0);
      syncMatchNav();
      return;
    }

    // SEARCH MODE — keep every row visible; highlight only rows that match
     // EVERY active chip (AND semantics, same as Filter mode). A row that
     // satisfies only some of the chips gets no row-hit tint AND no cell hits.
     // The whole row gets a soft-yellow tint via `.cons-filter-row-hit`; the
     // specific cells that matched a chip get the stronger yellow via
     // `.cons-filter-hit`. Vendor cells are painted inside the expanded
     // sub-table (visible only when the row is expanded).
    rows.forEach(function(row) {
      var allMatch = activeChips.every(function(c) { return chipMatchesRow(row, c); });
      if (!allMatch) return;
      activeChips.forEach(function(c) {
        var map = COL_MAP[c.fieldId];
        if (map) {
          var td = row.children[map.col - 1];
          if (td && cellMatchesChip(td, map.kind, c, null)) {
            td.classList.add('cons-filter-hit');
          }
          return;
        }
        var vMap = VENDOR_COL_MAP[c.fieldId];
        if (!vMap) return;
        vendorRowsFor(row).forEach(function(vRow) {
          var vTd = vRow.children[vMap.col - 1];
          if (vTd && cellMatchesChip(vTd, vMap.kind, c, vMap)) {
            vTd.classList.add('cons-filter-hit');
          }
        });
      });
      row.classList.add('cons-filter-row-hit');
    });
    // Search mode never hides rows — no empty state needed.
    syncEmptyState(false);
    syncMatchNav();
  }

  /* ---------- match navigation (Search mode only) ----------
   * Navigation is ROW-BASED: matchList collects every visible row that has at
   * least one hit cell (`.cons-filter-row-hit`), not individual cells. This way
   * a row that satisfies a chip combination counts once regardless of how many
   * cells inside it match.
   */
  function collectHits() {
    var tbody = document.getElementById('consumables-table-body');
    if (!tbody) return [];
    return Array.prototype.slice.call(
      tbody.querySelectorAll(':scope > tr.cons-filter-row-hit:not(.cons-filter-hidden)')
    );
  }

  function syncMatchNav() {
    if (!matchNav) return;
    var isSearch = prefs.behavior === 'search';
    if (!isSearch) {
      var tbodyEl = document.getElementById('consumables-table-body');
      var visible = tbodyEl
        ? tbodyEl.querySelectorAll(':scope > tr.table__row:not(.cons-filter-hidden)').length
        : 0;
      if (!chips.length || !chips.some(function(c) { return isMapped(c.fieldId); })) {
        matchNav.hidden = true;
        matchList = [];
        matchIdx = -1;
        matchNav.classList.remove('cs-match-nav--count-only');
        return;
      }
      matchNav.hidden = false;
      matchNav.classList.add('cs-match-nav--count-only');
      if (matchNavCount) {
        matchNavCount.textContent = visible + (visible === 1 ? ' result found' : ' results found');
      }
      matchList = [];
      matchIdx = -1;
      return;
    }
    matchNav.classList.remove('cs-match-nav--count-only');
    matchList = collectHits();
    if (!matchList.length) {
      matchNav.hidden = true;
      matchIdx = -1;
      return;
    }
    matchNav.hidden = false;
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
    var tbody = document.getElementById('consumables-table-body');
    if (tbody) {
      tbody.querySelectorAll('.cons-filter-hit--focus, .cons-filter-row-hit--focus').forEach(function(el) {
        el.classList.remove('cons-filter-hit--focus');
        el.classList.remove('cons-filter-row-hit--focus');
      });
    }
    matchIdx = ((idx % matchList.length) + matchList.length) % matchList.length;
    var target = matchList[matchIdx];
    if (!target) return;
    target.classList.add('cons-filter-row-hit--focus');
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
    if (!emptyState) emptyState = document.getElementById('cons-filter-empty');
    if (!emptyState) return;
    emptyState.hidden = !show;
  }

  /* ---------- chip editor popover ----------
   * Shared singleton, appended to <body>, positioned below the clicked chip's
   * chevron. Lists Contains / Without modifiers, the field's options with a
   * checkmark on the active one, the Relation section (=Equal / ≠Not equal),
   * and Remove. Interacts through data-cs-chip-action on click.
   */
  var chipEditorEl;
  var chipEditorForId = null;

  function ensureChipEditor() {
    if (chipEditorEl) return chipEditorEl;
    chipEditorEl = document.createElement('div');
    chipEditorEl.className = 'cs-chip-editor';
    chipEditorEl.hidden = true;
    chipEditorEl.setAttribute('role', 'dialog');
    document.body.appendChild(chipEditorEl);

    chipEditorEl.addEventListener('click', function(e) {
      e.stopPropagation();
      var actionEl = e.target.closest('[data-cs-chip-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-cs-chip-action');
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

    var checkSvg = '<lucide-icon name="check" class="cs-chip-editor__check" style="font-size:12px"></lucide-icon>';
    function optRow(label, isActive, action, extras) {
      return '<button type="button" class="cs-chip-editor__row' + (isActive ? ' cs-chip-editor__row--active' : '') +
        '" ' + action + '>' +
        '<span class="cs-chip-editor__row-label">' + label + '</span>' +
        (isActive ? checkSvg : '') +
        (extras || '') +
      '</button>';
    }

    var html = '<div class="cs-chip-editor__section-title">Selection options</div>';
    html += optRow('Contains', chip.valueLabel === 'Contains', 'data-cs-chip-action="set-value" data-value="Contains"');
    html += optRow('Without',  chip.valueLabel === 'Without',  'data-cs-chip-action="set-value" data-value="Without"');
    if (opts.length) {
      html += '<div class="cs-chip-editor__divider"></div>';
      opts.forEach(function(o) {
        var label = typeof o === 'string' ? o : o.label;
        var value = typeof o === 'string' ? o : (o.value != null ? o.value : o.label);
        html += optRow(label, chip.valueLabel === value, 'data-cs-chip-action="set-value" data-value="' + value + '"');
      });
    }
    // Relation only makes sense when a value is picked (not a Contains/Without leaf).
    if (chip.valueLabel && !currentIsPresence) {
      html += '<div class="cs-chip-editor__divider"></div>';
      html += '<div class="cs-chip-editor__section-title">Relation</div>';
      html += optRow('<span class="cs-chip-editor__rel-symbol">=</span> Equal',      (chip.relation || 'equal') === 'equal',    'data-cs-chip-action="set-relation" data-relation="equal"');
      html += optRow('<span class="cs-chip-editor__rel-symbol">≠</span> Not equal',  chip.relation === 'not-equal',              'data-cs-chip-action="set-relation" data-relation="not-equal"');
    }
    html += '<div class="cs-chip-editor__divider"></div>';
    html += '<button type="button" class="cs-chip-editor__row cs-chip-editor__row--remove" data-cs-chip-action="remove">Remove</button>';

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
          '<input type="radio" name="cs-behavior" value="filter"' + (isFilter ? ' checked' : '') + '>' +
          '<span class="pf-opts__row-body">' +
            '<span class="pf-opts__row-head"><lucide-icon name="line.3.horizontal.decrease"></lucide-icon><strong>Filter</strong></span>' +
            '<em>Hide rows without match</em>' +
          '</span>' +
        '</label>' +
        '<label class="pf-opts__row">' +
          '<input type="radio" name="cs-behavior" value="search"' + (isSearch ? ' checked' : '') + '>' +
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
            '<input type="checkbox" id="cs-favorites-toggle"' + (favOn ? ' checked' : '') + '>' +
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
      if (t.name === 'cs-behavior') {
        prefs.behavior = t.value;
        savePref(STORAGE.behavior, prefs.behavior);
        syncFieldIcon();
        applyBehavior();
      } else if (t.id === 'cs-favorites-toggle') {
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
        var btn = e.target.closest('[data-cs-nav]');
        if (!btn) return;
        var action = btn.getAttribute('data-cs-nav');
        if (action === 'next') nextMatch();
        else if (action === 'prev') prevMatch();
      });
    }

    // Empty state actions.
    var emptyClear = document.getElementById('cons-filter-empty-clear');
    var emptyAdd   = document.getElementById('cons-filter-empty-add');
    if (emptyClear) emptyClear.addEventListener('click', function(e) {
      e.preventDefault();
      clearAllChips();
    });
    if (emptyAdd) emptyAdd.addEventListener('click', function(e) {
      e.preventDefault();
      // Reuse the existing add-row button behavior so we don't fork logic.
      var addBtn = document.getElementById('cons-add-row-btn');
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
   * Each equipment table th carries `data-cs-field="…"` (added in the HTML).
   * We append a hover-revealed filter icon that opens ConsFilter.openField(fid).
   * The icon element itself is always in the DOM; visibility comes from CSS
  /* Right-side icon group — ensures a single absolutely-positioned flex row
   * holds the shortcut + info + sort so 8px gaps are guaranteed regardless of
   * each icon's intrinsic width. Order (left → right): shortcut, info, sort.
   *
   * If the th has a `.header-info` or `.sort-indicator` in its markup, we move
   * them into the group (once) and prepend the shortcut button in front.
   * Idempotent — the presence of `.cs-col-shortcut` inside the group is the
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
    var ths = document.querySelectorAll('#materials .table--consumables > thead .table__header[data-cs-field]');
    ths.forEach(function(th) {
      wrapHeaderLabel(th);
      if (th.querySelector('.cs-col-shortcut')) return; // already injected
      var fid = th.getAttribute('data-cs-field');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cs-col-shortcut';
      btn.setAttribute('data-cs-field', fid);
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
        window.ConsFilter.openField(fid);
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
    _shortcutTooltip.className = 'cs-col-shortcut-tooltip';
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

  window.ConsFilter = {
    init: function() {
      root = document.querySelector('#materials .pf-filter');
      if (!root) return;
      input      = root.querySelector('.pf-filter__input');
      chipsHost  = root.querySelector('.pf-filter__chips');
      panel      = root.querySelector('.pf-filter__panel');
      panelBody  = root.querySelector('.pf-filter__panel-body');
      clearAllBtn = root.querySelector('.pf-filter__clear-all');
      saveBtn    = root.querySelector('.pf-filter__save-btn');
      optionsBtn = root.querySelector('.pf-filter__options-btn');
      optionsPop = root.querySelector('.pf-filter__options-pop');
      matchNav      = document.getElementById('cs-match-nav');
      matchNavCount = document.getElementById('cs-match-nav-count');
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
