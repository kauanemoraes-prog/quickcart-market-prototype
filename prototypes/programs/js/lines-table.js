/**
 * Lines Table Module
 * Uses ProjNestedTable plugin for expandable rows
 */

(function() {
  'use strict';

  function buildDropdown(options, selectedValue, field) {
    selectedValue = selectedValue || '';
    var selectedLabel = '—';
    var optsHtml = '';
    options.forEach(function(opt) {
      var val = (typeof opt === 'object') ? opt.value : opt;
      var label = (typeof opt === 'object') ? opt.label : opt;
      var isSelected = val === selectedValue;
      if (isSelected) selectedLabel = label;
      optsHtml += '<li class="equip-dropdown__option' + (isSelected ? ' equip-dropdown__option--selected' : '') + '" data-value="' + val + '">' + label + '</li>';
    });
    var fieldAttr = field ? ' data-field="' + field + '"' : '';
    return '<div class="equip-dropdown" data-value="' + selectedValue + '"' + fieldAttr + '>' +
      '<button type="button" class="equip-dropdown__trigger">' +
        '<span class="equip-dropdown__value">' + selectedLabel + '</span>' +
        '<lucide-icon name="chevron-down" class="equip-dropdown__chevron" style="font-size:10px"></lucide-icon>' +
      '</button>' +
      '<ul class="equip-dropdown__menu">' + optsHtml + '</ul>' +
    '</div>';
  }

  function buildInput(value, placeholder, field) {
    var fieldAttr = field ? ' data-field="' + field + '"' : '';
    return '<input type="text" class="equip-input" value="' + (value || '') + '" placeholder="' + (placeholder || '') + '"' + fieldAttr + '>';
  }

  /* Find the line object backing a given row element. Updates here propagate so that
   * any future re-render of the table reflects the latest user edits. */
  function findLineFromElement(el) {
    var row = el.closest('[data-line-id]');
    if (!row) return null;
    var id = row.getAttribute('data-line-id');
    var lines = window.DetailData.getLines();
    for (var i = 0; i < lines.length; i++) {
      if (String(lines[i].id) === id) return lines[i];
    }
    return null;
  }

  /* Dynamic counts per line — derived from the stations / processes / equipment
   * structure (not stored as static fields). The header row sums these across all lines. */
  function computeLineCounts(line) {
    var stations = line.stations || [];
    var processCount = 0;
    var allEquip = [];
    var allCons = [];
    stations.forEach(function(st) {
      var processes = st.processes || [];
      processCount += processes.length;
      processes.forEach(function(p) {
        (p.equipment || []).forEach(function(e) { allEquip.push(e); });
        (p.consumables || []).forEach(function(c) { allCons.push(c); });
      });
    });
    return {
      stationCount: stations.length,
      processCount: processCount,
      hc: typeof line.hc === 'number' ? line.hc : 0,
      equipCount: allEquip.length,
      uniqueEquipCount: new Set(allEquip).size,
      uniqueCons: new Set(allCons).size
    };
  }

  function updateHeaderTotals(totals) {
    /* Process Flow 1 — old single-cell stats grid (one .line-stats--header) */
    document.querySelectorAll('.line-stats--header').forEach(function(headerStats) {
      var values = headerStats.querySelectorAll('strong');
      if (values.length < 6) return;
      values[0].textContent = totals.stationCount;
      values[1].textContent = totals.processCount;
      values[2].textContent = totals.hc;
      values[3].textContent = totals.equipCount;
      values[4].textContent = totals.uniqueEquipCount;
      values[5].textContent = totals.uniqueCons;
    });

    /* Process Flow 2 — separate stat columns with their own total elements */
    function setText(id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    }
    setText('pf2-total-pcns', totals.pcns || 0);
    setText('pf2-total-stations', totals.stationCount);
    setText('pf2-total-processes', totals.processCount);
    setText('pf2-total-hc', totals.hc);
    setText('pf2-total-cons', totals.uniqueCons);
    setText('pf2-total-eq', totals.equipCount + ' | ' + totals.uniqueEquipCount);
  }

  /* ------------------------------------------------------------------
   * Persistent state for non-line dropdowns.
   *
   * Line-row dropdowns mutate `line[field]` directly (the source of truth lives in
   * DetailData.getLines()), so they survive re-renders for free. Group rows and L2
   * stations don't have an owning data object that the page already mutates, so we
   * keep a local cache here. Keyed by groupId / stationId so the lookup is O(1)
   * each render and detached from index-based positions (groups can re-order).
   * ------------------------------------------------------------------ */
  var groupState = {};   // groupState[groupId] = { lineType: 'Housing', ... }
  var stationState = {}; // stationState[stationId] = { department: 'TE', ... }

  function getGroupValue(groupId, field, fallback) {
    var g = groupState[groupId];
    return (g && g[field] !== undefined) ? g[field] : fallback;
  }
  function setGroupValue(groupId, field, value) {
    if (!groupState[groupId]) groupState[groupId] = {};
    groupState[groupId][field] = value;
  }
  function getStationValue(stationId, field, fallback) {
    var s = stationState[stationId];
    return (s && s[field] !== undefined) ? s[field] : fallback;
  }
  function setStationValue(stationId, field, value) {
    if (!stationState[stationId]) stationState[stationId] = {};
    stationState[stationId][field] = value;
  }

  /* Deterministic pick from a list based on stationId — used to seed varied
   * defaults for demo data (e.g. Departments rotate through TE/AE/ME instead
   * of all being ME). Same stationId always returns the same value. */
  function pickByHash(stationId, options) {
    var hash = 0;
    for (var i = 0; i < stationId.length; i++) {
      hash = ((hash << 5) - hash + stationId.charCodeAt(i)) | 0;
    }
    return options[Math.abs(hash) % options.length];
  }
  function hashNum(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    return Math.abs(hash);
  }

  /* Assembly Plan (tab 1) display data. The mock lines only carry names and counts, so the lead, status,
   * readiness and dates are derived from the ids: stable between renders, but fictitious. */
  var AP_LEADS = ['Marina Costa', 'Rafael Lima', 'Camila Rocha', 'Diego Martins', 'Helena Duarte', 'Tiago Nunes', 'Beatriz Moreira', 'Felipe Araújo'];
  var AP_STATUS = ['On track', 'On track', 'At risk', 'On track', 'Delayed', 'On track'];
  var AP_READINESS = ['Ready', 'Ready', 'In progress', 'Ready', 'Blocked', 'In progress'];
  var AP_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function apDate(seed) {
    var d = new Date(2026, 11, 10 - 1 - (hashNum(seed) % 28));
    return ('0' + d.getDate()).slice(-2) + ' ' + AP_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  var GALLERY_OPTIONS = ['Sales floor', 'Fresh section', 'Front end', 'Back of house'];
  var ZONE_OPTIONS = ['Aisle 1', 'Aisle 2', 'Aisle 3'];
  function apGallery(lineId) {
    var n = Number(lineId) || hashNum(String(lineId));
    return GALLERY_OPTIONS[(n - 1 + 4) % 4];
  }
  function apZone(lineId) {
    var n = Number(lineId) || hashNum(String(lineId));
    return ZONE_OPTIONS[(n - 1 + 3) % 3];
  }

  function defaultDepartment(stationId) {
    return pickByHash(stationId, ['TE', 'AE', 'ME']);
  }

  /* Color strip on the left of each L2 station cell — one hue per Department
   * so the visual identity matches the tag below the station name. Falls back
   * to the ME green for any department not listed. */
  var DEPARTMENT_COLORS = {
    ME: '#A4D787',   // green
    AE: '#F2D96F',   // amber-yellow
    TE: '#F2A5C0'    // rose-pink
  };

  /* Rebuild a station object's dropdown HTML strings from current state. Called right
   * before each L2 expand so the user's previous selections survive collapse/re-expand
   * (the L2 template re-renders from these HTML strings each time it opens). */
  function refreshStationDropdowns(st) {
    st.departmentDropdown = buildDropdown(DEPARTMENT_OPTIONS, getStationValue(st.id, 'department', defaultDepartment(st.id)), 'department');
    st.reportingMethodDropdown = buildDropdown(REPORTING_METHOD_OPTIONS, getStationValue(st.id, 'reportingMethod', 'Control'), 'reportingMethod');
    st.engIntentDropdown = buildDropdown(ENG_INTENT_OPTIONS, getStationValue(st.id, 'engIntent', 'POR'), 'engIntent');
    st.mpIntentDropdown = buildDropdown(MP_INTENT_OPTIONS, getStationValue(st.id, 'mpIntent', 'POR'), 'mpIntent');
    st.environmentDropdown = buildDropdown(ENVIRONMENT_OPTIONS, getStationValue(st.id, 'environment', ''), 'environment');
    st.cmDepartmentDropdown = buildDropdown(CM_DEPARTMENT_OPTIONS, getStationValue(st.id, 'cmDepartment', ''), 'cmDepartment');
  }

  var EMPTY_OPTION = { value: '', label: '—' };
  var LINE_TYPE_OPTIONS = [EMPTY_OPTION, 'Housing', 'Main'];
  var LEVEL_OPTIONS = [EMPTY_OPTION, 'Online', 'Offline'];
  var PROCESS_CATEGORY_OPTIONS = [EMPTY_OPTION, 'FATP', 'Repair', 'SMT'];
  var LINE_GROUPING_OPTIONS = [EMPTY_OPTION, 'Cleaning Room', 'Lorem ipsum', 'Dolor emet'];

  /* Group order in the rendered table — independent of the dropdown order so we can
   * pin the visual sequence the design specifies. Each entry has `value` (matches
   * `line.lineGrouping`) and `displayName` (rendered after "Line group:"). The empty-
   * value group captures any line with no grouping assigned and displays "-". */
  var GROUP_ORDER = [
    { value: '',              displayName: '-' },
    { value: 'Lorem ipsum',   displayName: 'Lorem ipsum' },
    { value: 'Dolor emet',    displayName: 'Dolor emet' },
    { value: 'Cleaning Room', displayName: 'Cleaning Room' }
  ];

  function groupIdFromName(name) {
    if (!name) return 'group-empty';
    return 'group-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  /* Build the `groups` array consumed by lines-l1-template / lines-l1-template-2.
   * Always emits every configured group in fixed order — empty groups still render
   * a header (per design spec) so the user can drop lines into them later. */
  function buildGroups(lineRows) {
    return GROUP_ORDER.map(function(cfg, i) {
      var groupId = groupIdFromName(cfg.value);
      var lineType = getGroupValue(groupId, 'lineType', '');
      var lines = lineRows.filter(function(row) { return row.lineGrouping === cfg.value; });
      return {
        id: groupId,
        index: String(i + 1).padStart(2, '0'),
        name: cfg.displayName,
        lineType: lineType,
        lineTypeDropdown: buildDropdown(LINE_TYPE_OPTIONS, lineType, 'lineType'),
        lines: lines
      };
    });
  }

  /* Toggle visibility of every level-1 row (and any expanded L2 detail row) that belongs
   * to the clicked group. Rows are matched via the data-group-id attribute we stamp during
   * render — the group header carries `data-expanded` so its chevron rotation stays in sync. */
  function bindGroupExpandHandler() {
    if (document._linesGroupExpandBound) return;
    document._linesGroupExpandBound = true;

    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.proj-nested-table__group-expand-btn');
      if (!btn) return;
      var groupRow = btn.closest('.proj-nested-table__row--group');
      if (!groupRow) return;
      var tbody = groupRow.parentNode;
      var groupId = groupRow.getAttribute('data-group-id');
      var expanded = groupRow.getAttribute('data-expanded') === 'true';
      var next = !expanded;
      groupRow.setAttribute('data-expanded', String(next));

      // Show/hide all level1 rows (and their adjacent L2 detail rows) under this group.
      var rows = tbody.querySelectorAll('.proj-nested-table__row--level1[data-group-id="' + groupId + '"]');
      rows.forEach(function(row) {
        row.classList.toggle('proj-nested-table__row--hidden', !next);
        var detail = row.nextElementSibling;
        if (detail && detail.classList.contains('proj-nested-table__detail-row')) {
          detail.classList.toggle('proj-nested-table__row--hidden', !next);
        }
      });
    });
  }

  /* L2 sub-table dropdowns */
  var DEPARTMENT_OPTIONS = ['TE', 'AE', 'ME', 'DFM', 'Tool'];
  var REPORTING_METHOD_OPTIONS = ['Control', 'Insight', 'Non-reporting', 'Run Chart 100%', 'Run Chart Sampling', 'Hive'];
  var ENG_INTENT_OPTIONS = ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'];
  var MP_INTENT_OPTIONS = ['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'];
  var ENVIRONMENT_OPTIONS = ['Class 1', 'Class 10', 'Class 100', 'Class 1,000', 'Class 10,000', 'Class 100,000', 'Create'];
  var CM_DEPARTMENT_OPTIONS = ['Test1'];

  /* Portal an open dropdown menu to `document.body` and pin it as `position: fixed`
   * anchored to its trigger. Why portal: every ancestor (`.l2`, `.table-container`,
   * possibly a transformed root) creates its own stacking / containing context, so
   * even `position: fixed + z-index: 99999` inside the table gets clipped or stacked
   * behind sibling rows. Detaching to <body> sidesteps all of that. */
  function positionDropdownMenu(wrap) {
    var trigger = wrap.querySelector('.equip-dropdown__trigger');
    var menu = wrap.querySelector('.equip-dropdown__menu') ||
               document.querySelector('.equip-dropdown__menu[data-portaled="' + wrap._menuId + '"]');
    if (!trigger || !menu) return;

    // Tag the wrap+menu with a shared id so we can re-pair them after portaling.
    if (!wrap._menuId) {
      wrap._menuId = 'dd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      menu.setAttribute('data-portaled', wrap._menuId);
      menu._ownerWrap = wrap;
      menu._originalParent = menu.parentNode;
    }

    // Move into <body> so no ancestor's transform/overflow/stacking can clip it.
    if (menu.parentNode !== document.body) {
      document.body.appendChild(menu);
    }

    var rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = rect.left + 'px';
    menu.style.minWidth = rect.width + 'px';
    menu.style.zIndex = '10000';
    menu.style.display = 'block';
  }

  function resetDropdownMenu(wrap) {
    if (!wrap) return;
    var menu = wrap.querySelector('.equip-dropdown__menu');
    if (!menu && wrap._menuId) {
      menu = document.querySelector('.equip-dropdown__menu[data-portaled="' + wrap._menuId + '"]');
    }
    if (!menu) return;

    // Put the menu back where it came from so the next open uses the same DOM lookup.
    if (menu._originalParent && menu.parentNode !== menu._originalParent) {
      menu._originalParent.appendChild(menu);
    }

    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.minWidth = '';
    menu.style.zIndex = '';
    menu.style.display = '';
  }

  function closeAllLinesDropdowns() {
    // Wrappers may already have lost the --open class; iterate all known wrappers in
    // the lines table that have a tagged menu id (and any still-open ones).
    document.querySelectorAll('.table--lines .equip-dropdown--open').forEach(function(el) {
      el.classList.remove('equip-dropdown--open');
      resetDropdownMenu(el);
    });
    // Defensive: also clean up any orphaned portaled menus
    document.querySelectorAll('body > .equip-dropdown__menu[data-portaled]').forEach(function(menu) {
      if (menu._ownerWrap) resetDropdownMenu(menu._ownerWrap);
    });
  }

  /* Dropdown open/close handler — toggles `.equip-dropdown--open` on the wrapper.
   * Document-level so it works for both equipment and lines tables. */
  function bindDropdownHandler() {
    if (document._linesDropdownBound) return;
    document._linesDropdownBound = true;

    document.addEventListener('click', function(e) {
      var trigger = e.target.closest('.equip-dropdown__trigger');
      var option = e.target.closest('.equip-dropdown__option');

      if (trigger) {
        var ws = trigger.parentElement;
        // Only handle here if inside the lines table — equipment-table.js owns its own handler
        if (!ws.closest('.table--lines')) return;
        e.stopPropagation();
        var wasOpen = ws.classList.contains('equip-dropdown--open');
        closeAllLinesDropdowns();
        if (!wasOpen) {
          ws.classList.add('equip-dropdown--open');
          positionDropdownMenu(ws);
        }
        return;
      }

      if (option) {
        // Menu may be portaled to <body>, in which case the option is no longer
        // a descendant of `.equip-dropdown`. Fall back to the owner stored on the menu.
        var wrap = option.closest('.equip-dropdown');
        if (!wrap) {
          var menu = option.closest('.equip-dropdown__menu');
          wrap = menu && menu._ownerWrap;
        }
        if (!wrap || !wrap.closest('.table--lines')) return;
        e.stopPropagation();
        var label = option.textContent;
        var val = option.dataset.value || '';
        wrap.dataset.value = val;
        var valueEl = wrap.querySelector('.equip-dropdown__value');
        if (valueEl) valueEl.textContent = label;
        wrap.querySelectorAll('.equip-dropdown__option--selected').forEach(function(el) {
          el.classList.remove('equip-dropdown__option--selected');
        });
        option.classList.add('equip-dropdown__option--selected');
        wrap.classList.remove('equip-dropdown--open');
        resetDropdownMenu(wrap);

        // Persist to underlying data so future re-renders (and L2 re-expands) keep the
        // selection. Three possible contexts: group header row, L2 station row, or
        // ordinary L1 line row — checked in that order because line rows ALSO carry a
        // data-group-id, so we must distinguish group HEADER rows specifically.
        var field = wrap.getAttribute('data-field');
        if (field) {
          var groupRow = wrap.closest('.proj-nested-table__row--group');
          var stationRow = wrap.closest('[data-station-id]');
          if (groupRow) {
            setGroupValue(groupRow.getAttribute('data-group-id'), field, val);
          } else if (stationRow) {
            setStationValue(stationRow.getAttribute('data-station-id'), field, val);
          } else {
            var line = findLineFromElement(wrap);
            if (line) {
              var oldVal = line[field];
              line[field] = val;
              // The mapped data array (groupedTableInstance.config.data) holds copies of
              // the source `lineGrouping` made at initial render time — buildGroups()
              // filters on those copies, so we must mirror the change there too or the
              // line won't actually move groups on re-render.
              if (groupedTableInstance) {
                var lineRow = wrap.closest('[data-line-id]');
                var mappedItem = lineRow && groupedTableInstance.findItem(lineRow.getAttribute('data-line-id'));
                if (mappedItem) mappedItem[field] = val;
              }
              // Changing a line's grouping rebuilds PF2's L1 so the line lands in its new
              // section. Preserve currently-open groups + auto-open the destination group
              // so the user sees the move, then surface a success notification.
              if (field === 'lineGrouping' && oldVal !== val) {
                refreshGroupedTable(groupIdFromName(val));
                showSuccessNotification('Assembly area moved to <strong>' + (label || '-') + '</strong>.');
              }
            }
          }
        }

        // Line Grouping is mirrored in the small tag under the Line name
        if (field === 'lineGrouping') {
          var row = wrap.closest('[data-line-id]');
          var tag = row && row.querySelector('.line-name__tag');
          if (tag) tag.textContent = label;
        }
      }
    });

    /* Close any open dropdown on outside click. Both the wrapper AND the menu count
     * as "inside" — the menu may be portaled to <body>, detached from its wrapper. */
    document.addEventListener('click', function(e) {
      if (e.target.closest('.equip-dropdown')) return;
      if (e.target.closest('.equip-dropdown__menu')) return;
      closeAllLinesDropdowns();
    });

    /* Close on scroll — fixed-positioned menu would otherwise float in place
     * while the trigger underneath scrolls away. Captures every scroll event. */
    window.addEventListener('scroll', closeAllLinesDropdowns, true);
    window.addEventListener('resize', closeAllLinesDropdowns);
  }

  /* Persist text-input edits onto the underlying line data. Listens at document level
   * to capture all input events inside the lines table. */
  function bindInputHandler() {
    if (document._linesInputBound) return;
    document._linesInputBound = true;

    document.addEventListener('input', function(e) {
      var input = e.target;
      if (!input.matches || !input.matches('.equip-input')) return;
      if (!input.closest('.table--lines')) return;
      var field = input.getAttribute('data-field');
      var line = findLineFromElement(input);
      if (field && line) line[field] = input.value;
    });
  }

  /* "Station info" toolbar toggle — when active, shows UPH..Last Update column range
   * (which includes Department, Station Type, all metric columns, and CM Department).
   * When inactive, those columns are hidden via the parent .tabs__panel state class. */
  /* Assembly Plan: the chevron on a workstation row shows / hides its operations (Operation, Sequence,
   * Duration). The operation rows sit in the same table as the workstations, so they share its columns. */
  /* Assembly Plan: workstations can be reordered inside their area with the drag handle, like the areas
   * themselves. The operation rows of a workstation travel with it, and the new order is written back to the
   * area's `stations` array so it survives a re-render. */
  var stationDragBound = false;
  function bindStationDragReorder() {
    if (stationDragBound) return;
    var tbody = document.getElementById('lines-table-body');
    if (!tbody) return;
    stationDragBound = true;
    var dragged = null;

    function groupOf(row) {
      var rows = [row];
      var next = row.nextElementSibling;
      while (next && (next.classList.contains('ap-op-row') || next.classList.contains('ap-gap'))) { rows.push(next); next = next.nextElementSibling; }
      return rows;
    }

    tbody.addEventListener('mousedown', function(e) {
      var handle = e.target.closest('.ap-l2 .proj-nested-table__drag-handle');
      var row = handle && handle.closest('tr[data-station-id]');
      if (row) row.setAttribute('draggable', 'true');
    });

    tbody.addEventListener('dragstart', function(e) {
      var row = e.target.closest && e.target.closest('.ap-l2 tr[data-station-id]');
      if (!row) return;
      dragged = row;
      row.classList.add('is-dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', row.getAttribute('data-station-id')); } catch (_) {}
    });

    tbody.addEventListener('dragover', function(e) {
      if (!dragged) return;
      var row = e.target.closest('.ap-l2 tr[data-station-id]');
      if (!row || row === dragged || row.parentNode !== dragged.parentNode) return;
      e.preventDefault();
      tbody.querySelectorAll('.drop-before, .drop-after').forEach(function(r) { r.classList.remove('drop-before', 'drop-after'); });
      var rect = row.getBoundingClientRect();
      row.classList.add((e.clientY - rect.top) > rect.height / 2 ? 'drop-after' : 'drop-before');
    });

    tbody.addEventListener('drop', function(e) {
      if (!dragged) return;
      var target = e.target.closest('.ap-l2 tr[data-station-id]');
      if (!target || target === dragged || target.parentNode !== dragged.parentNode) return;
      e.preventDefault();
      var rect = target.getBoundingClientRect();
      var after = (e.clientY - rect.top) > rect.height / 2;
      var anchor = after ? (groupOf(target).pop().nextElementSibling) : target;
      var parent = dragged.parentNode;
      groupOf(dragged).forEach(function(r) { parent.insertBefore(r, anchor || null); });

      // Write the new order back to the area's stations
      var m = /^st-(.+)-\d+$/.exec(dragged.getAttribute('data-station-id'));
      var lines = window.DetailData && window.DetailData.getLines ? window.DetailData.getLines() : null;
      if (m && lines) {
        var line = lines.filter(function(l) { return String(l.id) === m[1]; })[0];
        if (line && line.stations) {
          var names = Array.prototype.map.call(parent.querySelectorAll('tr[data-station-id] .ap-l2-name-text'), function(c) { return c.textContent.trim(); });
          line.stations.sort(function(a, b) { return names.indexOf(a.name) - names.indexOf(b.name); });
        }
      }
      // Keep the "01 | Station" numbers in step with the new order
      Array.prototype.forEach.call(parent.querySelectorAll('tr[data-station-id] .ap-l2-num'), function(el, i) {
        el.textContent = String(i + 1).padStart(2, '0');
      });
    });

    tbody.addEventListener('dragend', function() {
      tbody.querySelectorAll('.ap-l2 .is-dragging, .ap-l2 .drop-before, .ap-l2 .drop-after').forEach(function(r) { r.classList.remove('is-dragging', 'drop-before', 'drop-after'); });
      tbody.querySelectorAll('.ap-l2 [draggable="true"]').forEach(function(r) { r.removeAttribute('draggable'); });
      dragged = null;
    });
  }

  /* Assembly Plan: the operations table of a workstation (level 3). Rows reorder with their handle, the "+"
   * in the header adds an operation; the order and the new operation are written back to the station's
   * `processes`, and the Sequence numbers and the station's Operations count follow. */
  var operationEditBound = false;
  function bindOperationEdit() {
    if (operationEditBound) return;
    var tbody = document.getElementById('lines-table-body');
    if (!tbody) return;
    operationEditBound = true;
    var dragged = null;

    function stationFor(opRow) {
      var id = opRow.getAttribute('data-op-for');
      var m = /^st-(.+)-\d+$/.exec(id || '');
      var lines = window.DetailData && window.DetailData.getLines ? window.DetailData.getLines() : null;
      if (!m || !lines) return null;
      var line = lines.filter(function(l) { return String(l.id) === m[1]; })[0];
      var stRow = tbody.querySelector('tr[data-station-id="' + id + '"]');
      var nameEl = stRow && stRow.querySelector('.ap-l2-name-text');
      var st = line && line.stations && nameEl ? line.stations.filter(function(s) { return s.name === nameEl.textContent.trim(); })[0] : null;
      return st ? { line: line, st: st, stRow: stRow } : null;
    }

    function renumber(table) {
      Array.prototype.forEach.call(table.querySelectorAll('tbody tr.ap-ops__row .ap-op-seq'), function(el, i) {
        el.textContent = String(i + 1).padStart(2, '0');
      });
    }

    tbody.addEventListener('mousedown', function(e) {
      var handle = e.target.closest('.ap-ops .proj-nested-table__drag-handle');
      var row = handle && handle.closest('tr.ap-ops__row');
      if (row) row.setAttribute('draggable', 'true');
    });

    tbody.addEventListener('dragstart', function(e) {
      var row = e.target.closest && e.target.closest('tr.ap-ops__row');
      if (!row) return;
      dragged = row;
      row.classList.add('is-dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'operation'); } catch (_) {}
    });

    tbody.addEventListener('dragover', function(e) {
      if (!dragged) return;
      var row = e.target.closest('tr.ap-ops__row');
      if (!row || row === dragged || row.parentNode !== dragged.parentNode) return;
      e.preventDefault();
      tbody.querySelectorAll('.ap-ops .drop-before, .ap-ops .drop-after').forEach(function(r) { r.classList.remove('drop-before', 'drop-after'); });
      var rect = row.getBoundingClientRect();
      row.classList.add((e.clientY - rect.top) > rect.height / 2 ? 'drop-after' : 'drop-before');
    });

    tbody.addEventListener('drop', function(e) {
      if (!dragged) return;
      var target = e.target.closest('tr.ap-ops__row');
      if (!target || target === dragged || target.parentNode !== dragged.parentNode) return;
      e.preventDefault();
      var rect = target.getBoundingClientRect();
      var after = (e.clientY - rect.top) > rect.height / 2;
      dragged.parentNode.insertBefore(dragged, after ? target.nextElementSibling : target);
      var table = dragged.closest('table.ap-ops');
      renumber(table);
      var info = stationFor(dragged.closest('tr.ap-op-row'));
      if (info && info.st.processes) {
        var names = Array.prototype.map.call(table.querySelectorAll('tbody tr.ap-ops__row .ap-op-name'), function(c) { return c.textContent.trim(); });
        info.st.processes.sort(function(a, b) { return names.indexOf(a.name) - names.indexOf(b.name); });
      }
    });

    tbody.addEventListener('dragend', function() {
      tbody.querySelectorAll('.ap-ops .is-dragging, .ap-ops .drop-before, .ap-ops .drop-after').forEach(function(r) { r.classList.remove('is-dragging', 'drop-before', 'drop-after'); });
      tbody.querySelectorAll('.ap-ops [draggable="true"]').forEach(function(r) { r.removeAttribute('draggable'); });
      dragged = null;
    });

    tbody.addEventListener('click', function(e) {
      var btn = e.target.closest('.ap-ops__add');
      if (!btn) return;
      var opRow = btn.closest('tr.ap-op-row');
      var info = stationFor(opRow);
      if (!info) return;
      var name = 'New operation';
      var n = (info.st.processes || (info.st.processes = [])).length + 1;
      info.st.processes.push({ name: name });
      var secs = 20 + (hashNum(info.line.id + info.st.name + name + n) % 100);
      var duration = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
      var table = btn.closest('table.ap-ops');
      var tr = document.createElement('tr');
      tr.className = 'table__row ap-ops__row';
      tr.innerHTML =
        '<td class="table__cell ap-ops__index"><span class="proj-nested-table__drag-handle" title="Drag to reorder"><lucide-icon name="grip-vertical" style="font-size:16px"></lucide-icon></span></td>' +
        '<td class="table__cell ap-op-name">' + name + '</td>' +
        '<td class="table__cell ap-op-seq">' + String(n).padStart(2, '0') + '</td>' +
        '<td class="table__cell ap-op-duration">' + duration + '</td>' +
        '<td class="table__cell" colspan="5"></td>';
      table.querySelector('tbody').appendChild(tr);
      var count = info.stRow.querySelector('td.ap-col-num');
      if (count) count.textContent = n;
    });
  }

  var operationToggleBound = false;
  function bindOperationToggle() {
    if (operationToggleBound) return;
    var tbody = document.getElementById('lines-table-body');
    if (!tbody) return;
    operationToggleBound = true;
    tbody.addEventListener('click', function(e) {
      var btn = e.target.closest('.ap-op-toggle');
      if (!btn) return;
      var row = btn.closest('[data-station-id]');
      var id = row.getAttribute('data-station-id');
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      tbody.querySelectorAll('.ap-op-row[data-op-for="' + id + '"]').forEach(function(r) { r.hidden = !open; });
    });
  }

  function bindStationInfoToggle() {
    document.querySelectorAll('.js-toggle-station-info').forEach(function(btn) {
      if (btn._stationInfoBound) return;
      btn._stationInfoBound = true;
      btn.addEventListener('click', function() {
        var active = btn.classList.toggle('tag-btn--active');
        var panel = btn.closest('.tabs__panel');
        if (panel) panel.classList.toggle('tabs__panel--no-station-info', !active);
      });
    });
  }

  /* ------------------------------------------------------------------
   * Build-stage gating: clicking "Dismantling" in the timeline makes both Process Flow tabs
   * (PF1 flat + PF2 grouped) render with an empty body (header only). Any other
   * stage restores the normal flat / grouped view.
   * ------------------------------------------------------------------ */
  function isMpStage() {
    // MP empties the table only when no target Build Event is assigned.
    // Once a target is set, MP renders the (mirrored) data normally.
    return !!(window.BuildStages
      && window.BuildStages.getCurrentBuild() === 'Dismantling'
      && !window.BuildStages.getMpTarget());
  }

  /* Pre P1 always renders empty (header only) — the earliest stage has no
   * process flow data yet, regardless of MP mirror target. */
  function isPrePreStage() {
    return !!(window.BuildStages
      && window.BuildStages.getCurrentBuild() === 'Planning');
  }

  function shouldEmptyBody() {
    return isMpStage() || isPrePreStage();
  }

  function computeTotalsFromMappedData(data) {
    var t = { pcns: 0, stationCount: 0, processCount: 0, hc: 0, equipCount: 0, uniqueEquipCount: 0, uniqueCons: 0 };
    data.forEach(function(item) {
      t.pcns += item.pcns || 0;
      t.stationCount += item.stationCount || 0;
      t.processCount += item.processCount || 0;
      t.hc += item.hc || 0;
      t.equipCount += item.equipCount || 0;
      t.uniqueEquipCount += item.uniqueEquipCount || 0;
      t.uniqueCons += item.uniqueCons || 0;
    });
    return t;
  }

  function updatePf2Totals(totals) {
    function setText(id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    }
    setText('pf2-total-pcns', totals.pcns || 0);
    setText('pf2-total-stations', totals.stationCount);
    setText('pf2-total-processes', totals.processCount);
    setText('pf2-total-hc', totals.hc);
    setText('pf2-total-cons', totals.uniqueCons);
    setText('pf2-total-eq', totals.equipCount + ' | ' + totals.uniqueEquipCount);
  }

  /* References to both PF1 (flat) and PF2 (grouped) table instances. Populated in
   * render() and used by refreshForStage to honor the MP-stage empty state across
   * both tabs, and by the lineGrouping change handler to re-render PF2 when a line
   * moves between groups. */
  var flatTableInstance = null;
  var groupedTableInstance = null;

  /* Re-render PF2 after a line moves groups, preserving which groups were expanded so
   * the user doesn't lose visual context. Also expands the destination group (if
   * provided) so the just-moved line is immediately visible in its new section. When
   * the build stage is MP, PF2 is rendered empty and totals are zeroed. */
  function refreshGroupedTable(targetGroupId) {
    if (!groupedTableInstance) return;
    var tbody = document.getElementById(groupedTableInstance.config.tbodyId);
    if (!tbody) return;

    // Snapshot current expansion state before the re-render blows it away.
    var expanded = {};
    tbody.querySelectorAll('.proj-nested-table__row--group[data-expanded="true"]').forEach(function(row) {
      expanded[row.getAttribute('data-group-id')] = true;
    });
    if (targetGroupId) expanded[targetGroupId] = true;

    groupedTableInstance.renderLevel1();

    if (shouldEmptyBody()) {
      // MP (unassigned) or Pre P1 → PF2 body empty; totals collapse to zero.
      updatePf2Totals({ pcns: 0, stationCount: 0, processCount: 0, hc: 0, equipCount: 0, uniqueEquipCount: 0, uniqueCons: 0 });
      return;
    }

    // Recompute totals from current data (reflects any line moves between groups).
    updatePf2Totals(computeTotalsFromMappedData(groupedTableInstance.config.data));

    // Restore expansion: mark group rows expanded and unhide their child line rows.
    Object.keys(expanded).forEach(function(gid) {
      var groupRow = tbody.querySelector('.proj-nested-table__row--group[data-group-id="' + gid + '"]');
      if (groupRow) groupRow.setAttribute('data-expanded', 'true');
      tbody.querySelectorAll('.proj-nested-table__row--level1[data-group-id="' + gid + '"]').forEach(function(lineRow) {
        lineRow.classList.remove('proj-nested-table__row--hidden');
      });
    });
  }

  /* ------------------------------------------------------------------
   * Success notifications (MDS notification--success) for line-group moves.
   * Auto-dismiss after 3s, manual close via the × button. Container is created
   * once and lives in the body, fixed-positioned at the top-right.
   * ------------------------------------------------------------------ */
  var NOTIFICATION_SUCCESS_ICON =
    '<lucide-icon name="x" style="font-size:14px"></lucide-icon>';

  function ensureNotificationContainer() {
    var c = document.getElementById('lines-notifications');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'lines-notifications';
    c.className = 'lines-notifications';
    document.body.appendChild(c);
    return c;
  }

  function showSuccessNotification(message) {
    var c = ensureNotificationContainer();
    var n = document.createElement('div');
    n.className = 'notification notification--success';
    n.innerHTML =
      '<div class="notification__icon">' + NOTIFICATION_SUCCESS_ICON + '</div>' +
      '<div class="notification__content"><div class="notification__message">' + message + '</div></div>' +
      '<button class="notification__close" aria-label="Close">×</button>';
    c.appendChild(n);
    var timeout = setTimeout(function() { n.remove(); }, 3000);
    n.querySelector('.notification__close').addEventListener('click', function() {
      clearTimeout(timeout);
      n.remove();
    });
  }

  /* ------------------------------------------------------------------
   * PF1 drag-and-drop reorder — arm the L1 row when the user grabs the
   * `.proj-nested-table__drag-handle`, then reorder within `#lines-table-body`.
   * The expanded detail row (if present) rides along so the L2 stations stay
   * with their parent Line. The underlying `linesData` order is updated so
   * subsequent re-renders (build stage change, filter reapply, etc.) reflect
   * the new order.
   * ------------------------------------------------------------------ */
  function initFlatDragReorder() {
    var tbody = document.getElementById('lines-table-body');
    if (!tbody || tbody._pf1DragBound) return;
    tbody._pf1DragBound = true;
    var dragged = null;

    tbody.addEventListener('mousedown', function(e) {
      var handle = e.target.closest('.proj-nested-table__drag-handle');
      if (!handle) return;
      var row = handle.closest('.proj-nested-table__row--level1');
      if (row && row.parentNode === tbody) row.setAttribute('draggable', 'true');
    });

    tbody.addEventListener('dragstart', function(e) {
      var row = e.target.closest('.proj-nested-table__row--level1');
      if (!row || row.parentNode !== tbody) return;
      dragged = row;
      row.classList.add('is-dragging');
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', row.getAttribute('data-line-id') || '');
      } catch (_) {}
    });

    tbody.addEventListener('dragover', function(e) {
      if (!dragged) return;
      var row = e.target.closest('.proj-nested-table__row--level1');
      if (!row || row === dragged || row.parentNode !== tbody) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      tbody.querySelectorAll('.drop-before, .drop-after').forEach(function(r) {
        r.classList.remove('drop-before', 'drop-after');
      });
      var rect = row.getBoundingClientRect();
      var isAfter = (e.clientY - rect.top) > rect.height / 2;
      row.classList.add(isAfter ? 'drop-after' : 'drop-before');
    });

    tbody.addEventListener('drop', function(e) {
      if (!dragged) return;
      var target = e.target.closest('.proj-nested-table__row--level1');
      if (!target || target === dragged || target.parentNode !== tbody) return;
      e.preventDefault();
      var rect = target.getBoundingClientRect();
      var isAfter = (e.clientY - rect.top) > rect.height / 2;

      // Grab the dragged row's optional detail sibling so it rides along.
      var draggedDetail = dragged.nextElementSibling;
      if (!draggedDetail || !draggedDetail.classList ||
          !draggedDetail.classList.contains('proj-nested-table__detail-row')) {
        draggedDetail = null;
      }

      // Pick the anchor sibling based on target + its own detail row.
      var anchor;
      if (isAfter) {
        anchor = target.nextElementSibling;
        if (anchor && anchor.classList && anchor.classList.contains('proj-nested-table__detail-row')) {
          anchor = anchor.nextElementSibling;
        }
      } else {
        anchor = target;
      }

      tbody.insertBefore(dragged, anchor || null);
      if (draggedDetail) tbody.insertBefore(draggedDetail, dragged.nextSibling);

      // Persist to the underlying data so future renders keep the new order.
      var lines = window.DetailData && window.DetailData.getLines ? window.DetailData.getLines() : null;
      if (lines) {
        var fromId = dragged.getAttribute('data-line-id');
        var toId   = target.getAttribute('data-line-id');
        var fromIdx = -1, toIdx = -1;
        for (var i = 0; i < lines.length; i++) {
          if (String(lines[i].id) === fromId) fromIdx = i;
          if (String(lines[i].id) === toId)   toIdx = i;
        }
        if (fromIdx >= 0 && toIdx >= 0) {
          var moved = lines.splice(fromIdx, 1)[0];
          if (fromIdx < toIdx) toIdx -= 1;
          lines.splice(isAfter ? toIdx + 1 : toIdx, 0, moved);
        }
      }

      // Refresh the visible row-number index labels so they match the new order.
      var idx = 1;
      tbody.querySelectorAll(':scope > .proj-nested-table__row--level1 .proj-nested-table__row-number').forEach(function(el) {
        el.textContent = String(idx).padStart(2, '0');
        idx += 1;
      });

      // Filter chips may have painted state that references old positions —
      // ask the filter to re-apply so highlights stay accurate.
      if (window.PF1Filter && typeof window.PF1Filter.reapply === 'function') {
        window.PF1Filter.reapply();
      }
    });

    tbody.addEventListener('dragend', function() {
      tbody.querySelectorAll('.is-dragging, .drop-before, .drop-after').forEach(function(r) {
        r.classList.remove('is-dragging', 'drop-before', 'drop-after');
      });
      tbody.querySelectorAll('[draggable="true"]').forEach(function(r) {
        r.removeAttribute('draggable');
      });
      dragged = null;
    });
  }

  /* Wire the "Settings" link inside each L2 station row to the shared
   * ProjStationSettingsDrawer plugin. Delegate is document-level and bound
   * once so it survives re-renders of both PF1 and PF2 tables. */
  function bindStationSettingsLink() {
    if (document._linesStationSettingsBound) return;
    document._linesStationSettingsBound = true;
    document.addEventListener('click', function(e) {
      var link = e.target.closest('[data-station-settings-open="true"]');
      if (!link) return;
      e.preventDefault();
      if (!window.ProjStationSettingsDrawer) return;
      var row = link.closest('[data-station-id]');
      var stationId = row ? row.getAttribute('data-station-id') : '';
      var nameEl = row ? row.querySelector('.l2__station-name') : null;
      var stationName = nameEl ? nameEl.textContent.trim() : '';
      /* stationId shape: st-<lineId>-<idx>. Strip to lineId for lookup. */
      var m = /^st-(\d+)-\d+$/.exec(stationId || '');
      var lineId = m ? m[1] : '';
      ProjStationSettingsDrawer.open({
        stationName: stationName,
        stationId: stationId,
        lineId: lineId
      });
    });
  }

  window.LinesTable = {
    /* Called by BuildStages when the user clicks a stage in the timeline. Re-renders
     * both PF1 and PF2 to honor the MP-stage empty state (or to restore the normal
     * flat / grouped views when leaving MP). */
    refreshForStage: function() {
      if (flatTableInstance) flatTableInstance.renderLevel1();
      refreshGroupedTable(null);
      // Restore filter chip highlights after both tabs re-render.
      if (window.PF1Filter && typeof window.PF1Filter.reapply === 'function') window.PF1Filter.reapply();
      if (window.PFFilter && typeof window.PFFilter.reapply === 'function') window.PFFilter.reapply();
    },
    render: function() {
      var linesData = window.DetailData.getLines();

      var totals = { pcns: 0, stationCount: 0, processCount: 0, hc: 0, equipCount: 0, uniqueEquipCount: 0, uniqueCons: 0 };

      var data = linesData.map(function(line) {
        /* Gallery and Zone live on the line itself, so a change made with the dropdowns survives re-renders */
        if (!line.gallery) line.gallery = apGallery(line.id);
        if (!line.zone) line.zone = apZone(line.id);
        var stations = (line.stations || []).map(function(st, i) {
          var stationId = 'st-' + line.id + '-' + (i + 1);
          var dept = getStationValue(stationId, 'department', defaultDepartment(stationId));
          var station = {
            id: stationId,
            index: String(i + 1).padStart(2, '0'),
            name: st.name,
            color: DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS.ME,
            department: dept,
            tags: [
              { label: dept, type: 'primary' },
              { label: 'ENG: Production', type: 'gray' },
              { label: 'MP: Standard', type: 'gray' }
            ],
            keyProcesses: (st.processes || []).map(function(p, j) {
              return { index: String(j + 1).padStart(2, '0'), name: p.name, equipment: '' };
            }),
            /* Assembly Plan columns */
            areaName: line.name,
            func: (st.processes && st.processes[0] && st.processes[0].name) || '—',
            operations: (st.processes || []).length,
            operationRows: (st.processes || []).map(function(p, k) {
              var secs = 20 + (hashNum(line.id + st.name + p.name) % 100);
              return {
                seq: String(k + 1).padStart(2, '0'),
                name: p.name,
                duration: String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0')
              };
            }),
            stationLead: pickByHash('lead' + line.id + st.name, AP_LEADS),
            readiness: pickByHash('ready' + line.id + st.name, AP_READINESS),
            stLastUpdated: apDate('st' + line.id + st.name)
          };
          // Initial dropdowns are state-aware (no-op on first run, populated after edits)
          refreshStationDropdowns(station);
          return station;
        });

        var counts = computeLineCounts(line);
        var pcnsVal = typeof line.pcns === 'number' ? line.pcns : 0;
        totals.pcns += pcnsVal;
        totals.stationCount += counts.stationCount;
        totals.processCount += counts.processCount;
        totals.hc += counts.hc;
        totals.equipCount += counts.equipCount;
        totals.uniqueEquipCount += counts.uniqueEquipCount;
        totals.uniqueCons += counts.uniqueCons;

        return {
          id: String(line.id),
          index: String(line.id).padStart(2, '0'),
          name: line.name,
          nameTag: line.nameTag || '',
          nameInput: buildInput(line.name, 'Assembly area name', 'name'),
          description: line.description,
          descriptionInput: buildInput(line.description, 'Description', 'description'),
          lineType: line.lineType || '',
          lineTypeDropdown: buildDropdown(LINE_TYPE_OPTIONS, line.lineType, 'lineType'),
          level: line.level || '',
          levelDropdown: buildDropdown(LEVEL_OPTIONS, line.level, 'level'),
          condSop: line.condSop || '',
          processCategory: line.processCategory || '',
          processCategoryDropdown: buildDropdown(PROCESS_CATEGORY_OPTIONS, line.processCategory, 'processCategory'),
          lineGrouping: line.lineGrouping || '',
          lineGroupingDropdown: buildDropdown(LINE_GROUPING_OPTIONS, line.lineGrouping, 'lineGrouping'),
          targetUPH: line.targetUPH,
          targetUPHInput: buildInput(line.targetUPH, '', 'targetUPH'),
          pcns: typeof line.pcns === 'number' ? line.pcns : 0,
          stationCount: counts.stationCount,
          processCount: counts.processCount,
          hc: counts.hc,
          equipCount: counts.equipCount,
          uniqueEquipCount: counts.uniqueEquipCount,
          uniqueCons: counts.uniqueCons,
          /* Assembly Plan columns */
          gallery: line.gallery,
          zone: line.zone,
          galleryDropdown: buildDropdown(GALLERY_OPTIONS, line.gallery, 'gallery'),
          zoneDropdown: buildDropdown(ZONE_OPTIONS, line.zone, 'zone'),
          areaLead: pickByHash('area' + line.id, AP_LEADS),
          areaStatus: pickByHash('area-status' + line.id, AP_STATUS),
          lastUpdated: apDate('area' + line.id),
          stations: stations
        };
      });

      /* Render into both Process Flow tabs.
       * Tab 1 uses lines-l1-template — FLAT list, no group headers. The Line Grouping
       * dropdown stays in column 3 of each line row, but rows are not nested under any
       * grouping section.
       * Tab 2 uses lines-l1-template-2 — grouped under "Group: …" header rows. The
       * "Line type:" dropdown lives in each group header, and there is no per-line
       * Line Type column. */
      var tabsConfig = [
        { tbodyId: 'lines-table-body',   templateId: 'assembly-l1-template', level2TemplateId: 'assembly-l2-template', colspan: 8, grouped: false },
        { tbodyId: 'lines-table-body-2', templateId: 'lines-l1-template-2', level2TemplateId: 'lines-l2-template', colspan: 13, grouped: true }
      ];
      tabsConfig.forEach(function(cfg) {
        if (!document.getElementById(cfg.tbodyId)) return;
        var table = ProjNestedTable.create({
          tbodyId: cfg.tbodyId,
          level1TemplateId: cfg.templateId,
          level2TemplateId: cfg.level2TemplateId,
          data: data,
          dataKey: 'data-line-id',
          idField: 'id',
          childrenField: 'stations',
          colspan: cfg.colspan,
          level1DataKey: 'lines',
          level2DataKey: 'stations'
        });
        // Override renderLevel1: tab 2 gets the grouped context (recomputed from current
        // `data` each render, so lineGrouping mutations move lines between groups);
        // tab 1 stays flat. findItem still sees the flat `data` array so L2 expand
        // keeps working for both tabs.
        var grouped = cfg.grouped;
        table.renderLevel1 = function() {
          var tbody = document.getElementById(this.config.tbodyId);
          var tplEl = document.getElementById(this.config.level1TemplateId);
          if (!tbody || !tplEl) return;
          if (!this._level1Tpl) this._level1Tpl = Handlebars.compile(tplEl.innerHTML);
          // Build stage = MP (unassigned) or Pre P1 → render empty body (header only)
          // for both PF1 and PF2. Any other stage uses the normal grouped/flat output.
          if (shouldEmptyBody()) {
            tbody.innerHTML = '';
            return;
          }
          tbody.innerHTML = grouped
            ? this._level1Tpl({ groups: buildGroups(this.config.data) })
            : this._level1Tpl({ lines: this.config.data });
        };
        table.init();
        // Refresh station dropdown HTML from state BEFORE the plugin's expand listener
        // runs (capture phase). This way the override sits next to the plugin instead of
        // wrapping its toggleExpand — keeps the plugin's expand logic untouched, and
        // collapse/re-expand cycles still preserve user edits.
        (function(tableInstance) {
          var tb = document.getElementById(tableInstance.config.tbodyId);
          if (!tb) return;
          tb.addEventListener('click', function(e) {
            var btn = e.target.closest('.proj-nested-table__expand-btn');
            if (!btn) return;
            var row = btn.closest('.proj-nested-table__row--level1');
            if (!row) return;
            var item = tableInstance.findItem(row.getAttribute(tableInstance.config.dataKey));
            if (item && item.stations) item.stations.forEach(refreshStationDropdowns);
          }, true);
        })(table);
        // Stash both instances — flat (PF1) and grouped (PF2). The grouped one is also
        // used by the lineGrouping change handler to re-render only PF2 when a line
        // moves between groups; both are used by refreshForStage on MP toggle.
        if (grouped) groupedTableInstance = table;
        else flatTableInstance = table;
      });
      updateHeaderTotals(totals);
      bindDropdownHandler();
      bindInputHandler();
      bindStationInfoToggle();
      bindOperationToggle();
      bindStationDragReorder();
      bindOperationEdit();
      bindGroupExpandHandler();
      bindStationSettingsLink();
      initFlatDragReorder();
    }
  };
})();
