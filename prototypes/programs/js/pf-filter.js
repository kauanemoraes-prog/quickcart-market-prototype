/* Process Flow filter — replaces the search-bar with a keyword input that opens
 * a two-level filter panel. Level 1 lists every filterable field grouped by
 * category (Line, Station, Operation, Equipment, Consumable, Specification).
 * Fields marked with a chevron open a Level 2 panel showing the underlying
 * dropdown's options preceded by the Contains / Without modifiers.
 *
 * Options popover (⋯) — settings persist in localStorage:
 *  - Behavior:  'filter' (hide non-matches) | 'search' (highlight only)
 *  - Order:     'alpha'  (A→Z within each category) | 'smart' (fields whose label
 *               contains the current input text bubble to the top per category)
 *  - Favorites: 'show' | 'hide' — controls the Favorites section at the top of
 *               the main view (curated combinations, click to reapply)
 *
 * Favorites (replaces the old auto-captured Recent):
 *  - The star button next to the ⋯ button reflects whether the current chip
 *    combination is saved. Empty star ☆ → click saves; filled star ★ → click
 *    removes. Cap is 10, most-recent-first. Hover on a pill reveals a × to
 *    remove; every remove path shows a 5s undo toast.
 *
 * Chip mapping to PF1 columns (visible only):
 *   line-name, description, line-group, level, process-category, target-uph
 * Chips of other categories are still rendered but flagged 'visual only' via
 * a subtle badge — they don't drive filter/highlight because their data isn't
 * exposed on the L1 row.
 */
(function() {
  'use strict';

  var STORAGE = {
    behavior:         'davinci:pf-filter:behavior',
    order:            'davinci:pf-filter:order',
    favoritesVisible: 'davinci:pf-filter:favorites-visible',
    favorites:        'davinci:pf-filter:favorites'
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
      label: 'Assembly area',
      fields: [
        { id: 'factory-area',   label: 'Museum Area',   options: ['Area 1', 'Area 2', 'Area 3'] },
        { id: 'line-group',     label: 'Assembly area Group',     options: ['Lorem ipsum', 'Dolor emet', 'Cleaning Room'] },
        { id: 'level',          label: 'Level',          options: ['Online', 'Offline'] },
        { id: 'line-name',      label: 'Assembly area Name' },
        { id: 'description',    label: 'Description' }
      ]
    },
    {
      id: 'station',
      label: 'Workstation',
      fields: [
        { id: 'department',           label: 'Department',           options: ['TE', 'AE', 'ME', 'DFM', 'Tool'] },
        { id: 'cm-department',        label: 'CM Department',        options: ['Test1'] },
        { id: 'reporting-method',     label: 'Reporting Method',     options: ['Control', 'Insight', 'Non-reporting', 'Run Chart 100%', 'Run Chart Sampling', 'Hive'] },
        { id: 'eng-intent',           label: 'ENG Intent',           options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'mp-intent',            label: 'MP Intent',            options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'environment',          label: 'Environment',          options: ['Class 1', 'Class 10', 'Class 100', 'Class 1,000', 'Class 10,000', 'Class 100,000'] },
        { id: 'key-part',             label: 'Key Part',             options: ['Yes', 'No'] },
        { id: 'handling-ct',          label: 'Handling CT' },
        { id: 'machine-ct',           label: 'Machine CT' },
        { id: 'uph',                  label: 'UPH' },
        { id: 'hc-raw',               label: 'HC Raw' },
        { id: 'hc-adjustment',        label: 'HC Adjustment' },
        { id: 'headcount',            label: 'Headcount' },
        { id: 'qpl-adjustment',       label: 'QPL Adjustment' },
        { id: 'ct-alarm',             label: 'CT Alarm' },
        { id: 'ct-target',            label: 'CT Target' },
        { id: 'man-to-station-ratio', label: 'Man to Workstation Ratio' },
        { id: 'x-up',                 label: 'X-UP' },
        { id: 'cal-audit',            label: 'Cal + Audit' },
        { id: 'retest-rate',          label: 'Retest Rate' },
        { id: 'down-time-planned',    label: 'Down Time (Planned)' },
        { id: 'down-time-unplanned',  label: 'Down Time (Unplanned)' },
        { id: 'yield-fallout',        label: 'Yield Fallout' },
        { id: 'tossing',              label: 'Tossing' },
        { id: 'sampling-rate',        label: 'Sampling Rate' },
        { id: 'contains-sop',         label: 'Contains SOP' },
        { id: 'without-sop',          label: 'Without SOP' },
        { id: 'contains-ct',          label: 'Contains Cycle Time (CT)' },
        { id: 'without-ct',           label: 'Without Cycle Time (CT)' },
        { id: 'contains-equipment',   label: 'Contains Tools' },
        { id: 'without-equipment',    label: 'Without Tools' },
        { id: 'contains-consumables', label: 'Contains Materials' },
        { id: 'without-consumables',  label: 'Without Materials' },
        { id: 'pd-dri',               label: 'PD DRI' },
        { id: 'tpm-dri',              label: 'TPM DRI' },
        { id: 'cm-dri',               label: 'CM DRI' },
        { id: 'station-name',         label: 'Workstation Name' },
        { id: 'reporting-mapping',    label: 'Reporting Mapping' },
        { id: 'version-notes',        label: 'Version Notes' }
      ]
    },
    {
      id: 'operation',
      label: 'Task',
      fields: [
        { id: 'component',              label: 'Component',              options: ['Bracket', 'Housing', 'Cover', 'Screw'] },
        { id: 'enabling-design-feature',label: 'Enabling Design Feature',options: ['Feature A', 'Feature B'] },
        { id: 'process-method',         label: 'Process Method',         options: ['Transfer', 'Press', 'Screw', 'Dwell', 'Weld', 'Bend', 'Buckle', 'Paste', 'Cure', 'Clamp'] },
        { id: 'sub-process-method',     label: 'Sub Process Method',     options: ['Sub A', 'Sub B', 'Sub C'] },
        { id: 'validation-requirement', label: 'Validation Requirement', options: ['Required', 'Optional', 'N/A'] },
        { id: 'is-standalone',          label: 'Is a standalone task' },
        { id: 'contains-specification', label: 'Contains Specification' },
        { id: 'without-specification',  label: 'Without Specification' },
        { id: 'operation-description',  label: 'Task Description' }
      ]
    },
    {
      id: 'equipment',
      label: 'Tools',
      fields: [
        { id: 'eq-department',         label: 'Department',         options: ['TE', 'AE', 'ME', 'DFM', 'Tool'] },
        { id: 'eq-cm-department',      label: 'CM Department',      options: ['Test1'] },
        { id: 'eq-category',           label: 'Category',           options: ['Fixture', 'Machine', 'Tool'] },
        { id: 'eq-eng-intent',         label: 'ENG Intent',         options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'eq-mp-intent',          label: 'MP Intent',          options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'eq-processes',          label: 'Tools Processes',options: ['Process A', 'Process B'] },
        { id: 'eq-name',               label: 'Tools Name' }
      ]
    },
    {
      id: 'consumable',
      label: 'Material',
      fields: [
        { id: 'cons-type',        label: 'Material Type',   options: ['Adhesive', 'Solder', 'Cleaner'] },
        { id: 'cons-category',    label: 'Category',          options: ['Cat A', 'Cat B'] },
        { id: 'cons-subcategory', label: 'Subcategory',       options: ['Sub 1', 'Sub 2'] },
        { id: 'cons-eng-intent',  label: 'ENG Intent',        options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'cons-mp-intent',   label: 'MP Intent',         options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'cons-name',        label: 'Material Name' },
        { id: 'cons-app-name',    label: 'Application Name' }
      ]
    },
    {
      id: 'specification',
      label: 'Specification',
      fields: [
        { id: 'spec-mp-intent',  label: 'MP Intent',  options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] },
        { id: 'spec-eng-intent', label: 'ENG Intent', options: ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'] }
      ]
    }
  ];

  var MODIFIERS = [
    { id: 'contains', label: 'Contains' },
    { id: 'without',  label: 'Without' }
  ];

  /* Column mapping — how each field maps to a PF1 row column.
   *   'text'     → substring match against the inner input's value
   *   'dropdown' → substring match against .equip-dropdown[data-value]
   *   'number'   → substring on input/text value
   */
  var PF1_MAP = {
    'line-name':       { cellSelector: '.proj-nested-table__col-name .line-name', kind: 'text' },
    'description':     { cellSelector: '.proj-nested-table__col-desc',            kind: 'text' },
    'line-group':      { cellSelector: '.proj-nested-table__col-name .line-name .equip-dropdown[data-field="lineGrouping"]', kind: 'dropdown' },
    'level':           { cellSelector: '.equip-dropdown[data-field="level"]',     kind: 'dropdown' },
    'process-category':{ cellSelector: '.equip-dropdown[data-field="processCategory"]', kind: 'dropdown' },
    'target-uph':      { cellSelector: '.proj-nested-table__col-uph',             kind: 'number' }
  };

  var chips = [];
  var chipSeq = 0;
  var favorites = loadFavorites();

  var root, input, chipsHost, panel, panelBody, clearAllBtn, saveBtn, optionsBtn, optionsPop;

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

  function isMappedToPF1(fieldId) { return !!PF1_MAP[fieldId]; }

  /* ---------- chips ---------- */
  function renderChips() {
    chipsHost.innerHTML = chips.map(function(c) {
      var value = c.valueLabel
        ? '<span class="pf-filter__chip-value-row">' +
            '<span class="pf-filter__chip-eq">=</span>' +
            '<span class="pf-filter__chip-value">' + c.valueLabel + '</span>' +
          '</span>'
        : '';
      return '<span class="pf-filter__chip" data-chip-id="' + c.id + '">' +
        '<span class="pf-filter__chip-head">' +
          '<span class="pf-filter__chip-field">' + c.categoryLabel + ' ' + c.fieldLabel + '</span>' +
          '<lucide-icon name="chevron-down" class="pf-filter__chip-caret" style="font-size:10px"></lucide-icon>' +
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

  function clearAll() {
    chips = [];
    input.value = '';
    renderChips();
    applyBehavior();
    input.focus();
  }

  function addChip(categoryLabel, fieldId, fieldLabel, valueLabel) {
    chipSeq += 1;
    chips.push({
      id: 'chip-' + chipSeq,
      categoryLabel: categoryLabel,
      fieldId: fieldId,
      fieldLabel: fieldLabel,
      valueLabel: valueLabel || '',
      mapped: isMappedToPF1(fieldId)
    });
    renderChips();
    applyBehavior();
    // Committing a chip is a "done" action — close the panel so the user sees
    // the table without having to click outside.
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
    saveBtn.setAttribute('data-tooltip', label);
    saveBtn.removeAttribute('title');
  }

  /* Swap the icon in the field so it doubles as a mode indicator — funnel for
   * Filter mode, magnifier for Search mode. */
  function syncFieldIcon() {
    var iconEl = root && root.querySelector('.pf-filter__icon lucide-icon');
    if (!iconEl) return;
    iconEl.setAttribute('name', prefs.behavior === 'filter'
      ? 'line.3.horizontal.decrease'
      : 'magnifyingglass');
  }

  /* Free-text field IDs — always visible in the panel when the user types a
   * query. Because these fields accept any string value (not a fixed list),
   * they're the natural targets for search-by-typing regardless of what column
   * name the user is filtering by. */
  var FREE_TEXT_FIELDS = {
    'line-name':          true,
    'description':        true,
    'station-name':       true,
    'reporting-mapping':  true,
    'operation-description': true,
    'cons-name':          true,
    'cons-app-name':      true,
    'eq-name':            true,
    'spec-name':          true
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
    // Filter panel and options popover are mutually exclusive.
    closeOptions();
    if (root.classList.contains('pf-filter--open')) return;
    root.classList.add('pf-filter--open');
    renderMainView();
  }

  function closePanel() {
    root.classList.remove('pf-filter--open');
  }

  function togglePanel() {
    if (root.classList.contains('pf-filter--open')) closePanel();
    else openPanel();
  }

  /* ---------- table application (PF1 only) ---------- */
  function readCellValue(row, fieldId) {
    var map = PF1_MAP[fieldId];
    if (!map) return null;
    var el = row.querySelector(map.cellSelector);
    if (!el) return null;
    if (map.kind === 'dropdown') return (el.getAttribute('data-value') || '').trim();
    if (map.kind === 'text') {
      var inputEl = el.querySelector('input');
      if (inputEl) return (inputEl.value || '').trim();
      return (el.textContent || '').trim();
    }
    if (map.kind === 'number') {
      var iEl = el.querySelector('input');
      return iEl ? (iEl.value || '').trim() : (el.textContent || '').trim();
    }
    return null;
  }

  function chipMatchesRow(row, chip) {
    if (!chip.mapped) return true;
    var val = readCellValue(row, chip.fieldId);
    if (val == null) return true;
    if (!chip.valueLabel) return val.length > 0;
    if (chip.valueLabel === 'Contains') return val.length > 0;
    if (chip.valueLabel === 'Without')  return val.length === 0;
    return val.toLowerCase().indexOf(chip.valueLabel.toLowerCase()) >= 0;
  }

  function clearBehavior() {
    var tbody = document.getElementById('lines-table-body-2');
    if (!tbody) return;
    tbody.querySelectorAll('.pf-filter-hidden').forEach(function(r) {
      r.classList.remove('pf-filter-hidden');
    });
    // Highlight is applied on td cells (L1 hits) and on L2 dropdowns (station hits).
    tbody.querySelectorAll('.pf-filter-hit').forEach(function(el) {
      el.classList.remove('pf-filter-hit');
    });
  }

  function applyBehavior() {
    clearBehavior();
    var tbody = document.getElementById('lines-table-body-2');
    if (!tbody) return;
    var activeChips = chips.filter(function(c) { return c.mapped; });
    var allChips = chips;
    if (!activeChips.length && !allChips.some(function(c) {
      var f = findField(c.fieldId); return f && f.category.id !== 'line';
    })) return;

    var rows = tbody.querySelectorAll('.proj-nested-table__row--level1');
    rows.forEach(function(row) {
      var allMatch = activeChips.every(function(c) { return chipMatchesRow(row, c); });
      if (prefs.behavior === 'filter') {
        if (!allMatch) {
          row.classList.add('pf-filter-hidden');
          var det = row.nextElementSibling;
          if (det && det.classList.contains('proj-nested-table__detail-row')) {
            det.classList.add('pf-filter-hidden');
          }
        }
      } else {
        activeChips.forEach(function(c) {
          if (!chipMatchesRow(row, c)) return;
          var map = PF1_MAP[c.fieldId];
          if (!map) return;
          var el = row.querySelector(map.cellSelector);
          if (!el) return;
          var cell = el.closest('td') || el;
          cell.classList.add('pf-filter-hit');
        });
      }
    });
    autoExpandSubLineChips();
  }

  /* If any active chip targets a category BELOW the Line level (Station,
   * Operation, Equipment, Consumable, Specification), expand every visible L1
   * row so the user can see the L2 details. Idempotent. */
  function autoExpandSubLineChips() {
    var subLine = chips.some(function(c) {
      var f = findField(c.fieldId);
      return f && f.category.id !== 'line';
    });
    if (!subLine) return;
    var tbody = document.getElementById('lines-table-body-2');
    if (!tbody) return;
    tbody.querySelectorAll(':scope > tr.proj-nested-table__row--level1:not(.pf-filter-hidden)').forEach(function(row) {
      if (row.getAttribute('data-expanded') === 'true') return;
      var btn = row.querySelector('.proj-nested-table__expand-btn');
      if (btn) btn.click();
    });
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
          '<input type="radio" name="pf-behavior" value="filter"' + (isFilter ? ' checked' : '') + '>' +
          '<span class="pf-opts__row-body">' +
            '<span class="pf-opts__row-head"><lucide-icon name="line.3.horizontal.decrease"></lucide-icon><strong>Filter</strong></span>' +
            '<em>Hide rows without match</em>' +
          '</span>' +
        '</label>' +
        '<label class="pf-opts__row">' +
          '<input type="radio" name="pf-behavior" value="search"' + (isSearch ? ' checked' : '') + '>' +
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
            '<input type="checkbox" id="pf-favorites-toggle"' + (favOn ? ' checked' : '') + '>' +
            '<span class="pf-opts__switch-slider"></span>' +
          '</label>' +
        '</div>' +
        '<p class="pf-opts__group-desc">View searches you saved as favorites for Filter/Search</p>' +
      '</section>';
  }

  function openOptions() {
    closePanel();
    optionsPop.hidden = false;
    optionsBtn.setAttribute('aria-expanded', 'true');
    renderOptionsPop();
  }

  function closeOptions() {
    optionsPop.hidden = true;
    optionsBtn.setAttribute('aria-expanded', 'false');
  }

  /* ---------- events ---------- */
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
      }
    });

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearAll();
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
      if (back) { renderMainView(); return; }

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
      var chip = e.target.closest('.pf-filter__chip');
      if (!chip) return;
      e.stopPropagation();
      removeChip(chip.getAttribute('data-chip-id'));
    });

    optionsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (optionsPop.hidden) openOptions();
      else closeOptions();
    });

    optionsPop.addEventListener('click', function(e) { e.stopPropagation(); });
    optionsPop.addEventListener('change', function(e) {
      var t = e.target;
      if (t.name === 'pf-behavior') {
        prefs.behavior = t.value;
        savePref(STORAGE.behavior, prefs.behavior);
        syncFieldIcon();
        applyBehavior();
      } else if (t.id === 'pf-favorites-toggle') {
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
    });

    document.addEventListener('keydown', function(e) {
      // ⌘K (mac) / Ctrl+K (win/linux) focuses the filter and opens the panel.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        input.focus();
        openPanel();
        return;
      }
      if (e.key === 'Escape') {
        if (!optionsPop.hidden) { closeOptions(); return; }
        if (root.classList.contains('pf-filter--open')) {
          closePanel();
          input.blur();
        }
      }
    });
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

  window.PFFilter = {
    init: function() {
      root = document.querySelector('#process-flow-2 .pf-filter');
      if (!root) return;
      input      = root.querySelector('.pf-filter__input');
      chipsHost  = root.querySelector('.pf-filter__chips');
      panel      = root.querySelector('.pf-filter__panel');
      panelBody  = root.querySelector('.pf-filter__panel-body');
      clearAllBtn = root.querySelector('.pf-filter__clear-all');
      saveBtn    = root.querySelector('.pf-filter__save-btn');
      optionsBtn = root.querySelector('.pf-filter__options-btn');
      optionsPop = root.querySelector('.pf-filter__options-pop');
      if (!input || !panel || !panelBody || !chipsHost || !optionsBtn || !optionsPop) return;
      bind();
      syncFieldIcon();
      syncHasContent();
      syncSaveButton();
    }
  };
})();
