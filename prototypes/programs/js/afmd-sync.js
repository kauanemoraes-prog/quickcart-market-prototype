/**
 * AFMD Sync Module
 * Renders per-station sync status on the Process Flow tab (L1 aggregate + L2 per-station),
 * handles multi-select (shift-click), the bulk actions bar, confirmation modal, diff drawer
 * for Out-of-sync stations, and a minimizable progress dock for bulk execution.
 *
 * Mock-only: no real AFMD call — simulated latency + deterministic per-station state.
 */
(function() {
  'use strict';

  /* Station-level states. Archived / deleted USED to live here but moved to
   * per-record state inside the review modals. */
  var STATES = {
    NOT_SYNCED:    'not-synced',
    IN_SYNC:       'in-sync',
    SYNC_CONFLICT: 'sync-conflict',
    OUT_OF_SYNC:   'out-of-sync',
    UNAVAILABLE:   'unavailable'
  };

  var LABELS = {
    'not-synced':    'Not synced',
    'in-sync':       'In sync',
    'sync-conflict': 'Out of sync',
    'out-of-sync':   'Out of sync',
    'unavailable':   'Out of sync'
  };

  var SF_ICONS = {
    'not-synced':    'arrow.trianglehead.2.clockwise.rotate.90',
    'in-sync':       'checkmark.circle.fill',
    'sync-conflict': 'exclamationmark.circle.fill',
    'out-of-sync':   'exclamationmark.circle.fill',
    'unavailable':   'exclamationmark.circle.fill'
  };

  /* State ownership.
   * `stationStates` is the mutable source of truth for demo. It's seeded lazily
   * via a deterministic hash so refreshing the page yields the same picture. */
  var stationStates = {};

  function hashOf(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function pickState(stationId) {
    /* SMT Line demo: every station (st-1-*) starts as Not synced so the
     * whole line reads as "first-time sync" — including Interposer Flex
     * Tape/Foam Application which will still fail on first attempt via
     * the slash-in-name guard in syncErrorFor. */
    if (/^st-1-\d+$/.test(stationId)) return STATES.NOT_SYNCED;
    /* Cosmetic & QC demo stations — pick specific scenarios so the review
     * modal can show Push, Pull, and user-choice conflict side-by-side. */
    if (stationId === 'st-4-1' || stationId === 'st-4-2' || stationId === 'st-4-3') return STATES.SYNC_CONFLICT;
    /* Testing line duplicate-name demo: st-3-2 and st-3-3 both named
     * "RF Calibration". First one is In sync (was synced before the duplicate
     * appeared); second one is Not synced and gets blocked at sync time by the
     * duplicate-name guard until the user renames it. */
    if (stationId === 'st-3-2') return STATES.IN_SYNC;
    if (stationId === 'st-3-3') return STATES.NOT_SYNCED;
    /* EX04 demo: additionally mark Solder Paste Print (st-1-1) as Not synced
     * so the "select all SMT stations" bulk flow has more than one row. */
    if (forceAllNotSynced()) {
      return stationId === 'st-1-1' ? STATES.NOT_SYNCED : STATES.IN_SYNC;
    }
    /* Distribution biased toward IN_SYNC so more lines land as fully in sync
     * — makes the aggregate mix (some gray, some orange) read clearly in the
     * L1 column of the demo. */
    var n = hashOf(stationId) % 100;
    if (n < 65) return STATES.IN_SYNC;         // 65%
    if (n < 78) return STATES.NOT_SYNCED;      // 13%
    if (n < 88) return STATES.SYNC_CONFLICT;   // 10%
    if (n < 97) return STATES.OUT_OF_SYNC;     //  9%
    return STATES.UNAVAILABLE;                 //  3%
  }

  function getState(stationId) {
    /* When AFMD is unavailable for this build (e.g. project not registered
     * in AFMD), no station can be synced by definition — every station reads
     * as `Not synced` regardless of what the local cache might hold from a
     * previous session on a different program. */
    if (!isAfmdAvailable()) return STATES.NOT_SYNCED;
    if (!stationStates[stationId]) stationStates[stationId] = pickState(stationId);
    var s = stationStates[stationId];
    /* Defensive: legacy caches may hold 'archived' or 'deleted' from the old
     * 6-state station model. Those are record-level states now — coerce any
     * such leftover to OUT_OF_SYNC so nothing renders those labels at station
     * level by accident. */
    if (s === 'archived' || s === 'deleted') return STATES.OUT_OF_SYNC;
    return s;
  }

  function setState(stationId, newState) {
    stationStates[stationId] = newState;
    var row = document.querySelector('[data-station-id="' + stationId + '"]');
    if (row) paintL2Badge(row);
    /* Repaint the owning L1 aggregate badge — walk up from the detail row that
     * contains the L2 sub-table to reach the L1 row that lives immediately above. */
    var detail = row && row.closest('.proj-nested-table__detail-row');
    if (detail) {
      var lineRow = detail.previousElementSibling;
      if (lineRow) paintL1Aggregate(lineRow);
    }
    /* The build-level eligibility tag only shows "AFMD connected" once at
     * least one station has been synced — a transition to IN_SYNC may
     * unhide the tag; a transition away may re-hide it. */
    applyEligibilityMock();
    /* The header button's out-of-sync counter needs to reflect the new state. */
    updateHeaderSyncCount();
  }

  /* Deterministic derived AFMD station names for a given Apple Core station.
   * Real integration would iterate the station's equipment+vendor edges plus
   * add a pallet record — for demo we synthesize 2-4 records + a pallet. */
  function deriveAfmdNames(stationName, stationId) {
    var count = 2 + (hashOf(stationId) % 3);
    var vendors = ['ACME', 'Foxconn', 'Pegatron', 'Wistron', 'Compal', 'Quanta'];
    var equipments = ['ICT-Fixture', 'AOI-Camera', 'Torque-Driver', 'Laser-Marker', 'Vacuum-Chamber', 'Pick-Place'];
    var out = [];
    for (var i = 0; i < count; i++) {
      var v = vendors[(hashOf(stationId) + i) % vendors.length];
      var e = equipments[(hashOf(stationId) + i * 3) % equipments.length];
      out.push((stationName + '_' + v).toUpperCase());
    }
    out.push((stationName + '_Pallet').toUpperCase());
    return out;
  }

  /* Per-record states for a station. What we generate depends on the station's
   * CURRENT state:
   *   in-sync       → every record 'synced'
   *   sync-conflict → at least one 'conflict'; ~50% also have archived/deleted
   *   out-of-sync   → mix of 'archived' and/or 'deleted' + 'synced' (never conflict)
   *   (other)       → all synced (fallback)
   * Returns { name, state, fieldConflicts? } — fieldConflicts is set only on
   * 'conflict' records. */
  function deriveAfmdRecordStates(stationName, stationId) {
    var names = deriveAfmdNames(stationName, stationId);
    var state = getState(stationId);
    var h = hashOf(stationId);
    var n = names.length;
    var result = names.map(function(name) { return { name: name, state: 'synced' }; });

    if (state === STATES.SYNC_CONFLICT) {
      /* Always at least one conflict record; ~50% of stations also carry
       * archived + deleted alongside so we can demo the mixed case.
       * The pallet record (always the last one in `names`) is excluded from
       * the conflict pool — pallets don't carry the field-level attributes
       * that generate real conflicts. */
      var equipCount = n - 1;
      var conflictIdx = h % equipCount;
      result[conflictIdx] = { name: names[conflictIdx], state: 'conflict', fieldConflicts: fieldConflictsFor(stationId, conflictIdx) };
      var withMix = (h % 2 === 0);
      if (withMix && n >= 3) {
        var archIdx = (h + 1) % n;
        if (archIdx === conflictIdx) archIdx = (conflictIdx + 1) % n;
        var delIdx = (h + 2) % n;
        while (delIdx === conflictIdx || delIdx === archIdx) delIdx = (delIdx + 1) % n;
        result[archIdx] = { name: names[archIdx], state: 'archived' };
        result[delIdx] = { name: names[delIdx], state: 'deleted' };
      }
      return result;
    }

    if (state === STATES.OUT_OF_SYNC) {
      /* Only archived / deleted (no field conflicts). Vary the pattern so
       * different Out-of-sync stations show different combinations. */
      var pattern = h % 3; // 0 = archived only, 1 = deleted only, 2 = both
      var aIdx = h % n;
      var dIdx = (h + 1) % n; if (dIdx === aIdx) dIdx = (aIdx + 1) % n;
      if (pattern === 0 || pattern === 2) result[aIdx] = { name: names[aIdx], state: 'archived' };
      if (pattern === 1 || pattern === 2) result[dIdx] = { name: names[dIdx], state: 'deleted' };
      /* Safety: guarantee at least one non-synced record. */
      if (result.every(function(r) { return r.state === 'synced'; })) {
        result[aIdx] = { name: names[aIdx], state: 'archived' };
      }
      return result;
    }

    /* in-sync / not-synced / unavailable → all records read as synced. */
    return result;
  }

  /* Called when the user hits Save on the Sync conflict modal. Marks the
   * conflicts as resolved and re-derives the station state:
   *   if any archived/deleted records remain → OUT_OF_SYNC
   *   otherwise                              → IN_SYNC */
  function resolveConflicts(stationId) {
    var records = deriveAfmdRecordStates(stationLabel(stationId), stationId);
    var hasRemaining = records.some(function(r) {
      return r.state === 'archived' || r.state === 'deleted';
    });
    setState(stationId, hasRemaining ? STATES.OUT_OF_SYNC : STATES.IN_SYNC);
  }

  /* Which resolution flow does this station demo? A conflict station is
   * either a Push scenario (Apple Core edited a value, AFMD is stale) or
   * a Pull scenario (AFMD-side edit, Apple Core is stale). The mock hardwires
   * a couple of Cosmetic & QC stations so the demo can show each side in
   * isolation. Any other conflict station defaults to `pull`. */
  var STATION_DIRECTIONS = {
    'st-4-1': 'both',   // Surface Inspection — user picks Push or Pull
    'st-4-2': 'push',   // Laser Marking — Push example (new equipment)
    'st-4-3': 'push'    // Final QC — Push example (new equipment)
  };
  function syncDirectionFor(stationId) {
    return STATION_DIRECTIONS[stationId] || 'pull';
  }

  /* Deterministic field-level divergence for a single record. Only Department
   * can drift (Process Category is not editable on the AFMD side). The `local`
   * value must match what the L2 station row actually displays — same hash
   * function as LinesTable.defaultDepartment(stationId). Returns a
   * single-field array with the two current values. */
  function fieldConflictsFor(stationId, recordIdx) {
    var deptOpts = ['TE', 'AE', 'ME'];
    var localDept = deptOpts[hashOf(stationId) % 3];
    /* AFMD value differs from local — pick the next option in the wheel,
     * varied by recordIdx so multiple records on the same station show
     * different remote values. */
    var h = hashOf(stationId + '#' + recordIdx);
    var afmdDept = deptOpts[(h + 1) % 3];
    if (afmdDept === localDept) afmdDept = deptOpts[(h + 2) % 3];
    if (afmdDept === localDept) afmdDept = deptOpts[(h + 3) % 3];
    return [{ key: 'department', label: 'Department', local: localDept, remote: afmdDept }];
  }

  /* ============================================================
   * L2 badge — per-station status column.
   * The badge IS the action when the state is actionable. Rendered as a
   * <button> so the whole pill responds to click / keyboard focus. Terminal
   * states render as an inert <span> with the same visual shell.
   * ============================================================ */
  /* The AFMD Sync column shows only TWO visual states: `In sync` (green)
   * for stations fully synchronized with AFMD, and `Out of sync` (orange)
   * for everything else — never synced yet, drifted values, or records
   * archived/deleted on the AFMD side. The internal state still drives
   * WHICH modal opens on click (sync vs review vs informational). */
  var ACTIONS_BY_STATE = {
    'not-synced':    { action: 'sync',        label: 'Not synced',  icon: 'arrow.trianglehead.2.clockwise.rotate.90' },
    'in-sync':       { action: 'view-synced', label: 'In sync',     icon: 'checkmark.circle.fill' },
    'sync-conflict': { action: 'review',      label: 'Out of sync', icon: 'exclamationmark.circle.fill' },
    'out-of-sync':   { action: 'review',      label: 'Out of sync', icon: 'exclamationmark.circle.fill' },
    'unavailable':   { action: 'sync',        label: 'Out of sync', icon: 'exclamationmark.circle.fill' }
  };

  function badgeHtml(state, stationId) {
    var actionable = ACTIONS_BY_STATE[state];
    if (actionable) {
      /* When AFMD is unavailable for the build, the actionable badge stays
       * visible but non-functional. The proj-tooltip plugin gives the user a
       * plain-language reason on hover (pure CSS — no JS required). Hover
       * needs to fire, so we DON'T use pointer-events: none in CSS — clicks
       * are guarded in openConfirmation / openDiffDrawer. */
      var tooltipAttr = !isAfmdAvailable()
        ? ' data-proj-tooltip="AFMD unavailable" data-proj-tooltip-placement="top"'
        : '';
      var html = '<button type="button" class="afmd-badge afmd-badge--' + state + ' afmd-badge--action"' + tooltipAttr + ' ' +
                'data-afmd-action="' + actionable.action + '" data-station-id="' + stationId + '">' +
               '<span class="afmd-badge__icon"><lucide-icon name="' + actionable.icon + '"></lucide-icon></span>' +
               '<span class="afmd-badge__label">' + actionable.label + '</span>' +
             '</button>';
      return html;
    }
    return '<span class="afmd-badge afmd-badge--' + state + '">' +
             '<span class="afmd-badge__icon"><lucide-icon name="' + SF_ICONS[state] + '"></lucide-icon></span>' +
             '<span class="afmd-badge__label">' + LABELS[state] + '</span>' +
           '</span>';
  }

  function paintL2Badge(stationRow) {
    var cell = stationRow.querySelector('.l2__col-afmd');
    if (!cell) return;
    var id = stationRow.getAttribute('data-station-id');
    /* EX03 / AFMD unavailable → clear every per-station cell so the column
     * reads blank; the header Refresh link is what the user acts on. */
    if (!isAfmdAvailable()) {
      cell.innerHTML = '';
      cell.removeAttribute('data-afmd-state');
      applyReportingMethodLock(stationRow, false);
      return;
    }
    var st = getState(id);
    cell.innerHTML = badgeHtml(st, id);
    cell.setAttribute('data-afmd-state', st);
    /* Reporting Method is managed by AFMD once the station is In sync — the
     * L2 dropdown becomes read-only and an info icon explains why. */
    applyReportingMethodLock(stationRow, st === STATES.IN_SYNC);
  }

  /* Toggle the read-only look on the Reporting Method dropdown. Attaches (or
   * removes) a small info icon after it so the user can hover for a
   * plain-language explanation. */
  var REPORTING_LOCK_TOOLTIP = 'Reporting Method has been synced with AFMD and cannot be reverted.';

  function applyReportingMethodLock(stationRow, locked) {
    var dropdown = stationRow.querySelector('.equip-dropdown[data-field="reportingMethod"]');
    if (!dropdown) return;
    dropdown.classList.toggle('afmd-locked-field', locked);
    var next = dropdown.nextElementSibling;
    var hasInfo = next && next.classList && next.classList.contains('afmd-locked-info');
    if (locked && !hasInfo) {
      var info = document.createElement('span');
      info.className = 'afmd-locked-info';
      info.setAttribute('tabindex', '0');
      info.setAttribute('aria-label', REPORTING_LOCK_TOOLTIP);
      info.setAttribute('data-proj-tooltip', REPORTING_LOCK_TOOLTIP);
      info.setAttribute('data-proj-tooltip-placement', 'bottom');
      info.innerHTML = '<lucide-icon name="info.circle.fill"></lucide-icon>';
      dropdown.parentNode.insertBefore(info, dropdown.nextSibling);
    } else if (!locked && hasInfo) {
      next.remove();
    }
  }

  function paintAllL2InLine(lineRow) {
    var detail = lineRow.nextElementSibling;
    if (!detail || !detail.classList.contains('proj-nested-table__detail-row')) return;
    detail.querySelectorAll('[data-station-id]').forEach(paintL2Badge);
  }

  /* ============================================================
   * L1 aggregate badge — "X of Y in sync" summary
   * ============================================================ */
  function collectLineStationIds(lineRow) {
    var line = findLineData(lineRow.getAttribute('data-line-id'));
    if (!line) return [];
    return (line.stations || []).map(function(_, i) { return 'st-' + line.id + '-' + (i + 1); });
  }

  function findLineData(id) {
    var lines = window.DetailData && window.DetailData.getLines ? window.DetailData.getLines() : [];
    for (var i = 0; i < lines.length; i++) if (String(lines[i].id) === String(id)) return lines[i];
    return null;
  }

  /* Duplicate-name guard: AFMD keys records by station name within a line, so
   * two stations sharing the same name inside the same line can't both be
   * created. The blocked station stays Not synced until the designer renames
   * it in Apple Core. Both sides of the duplicate report as blocked — this
   * mirrors AFMD's real behavior where neither record can be authoritatively
   * created without a unique name. */
  function hasDuplicateNameInLine(stationId) {
    var m = /^st-(\d+)-(\d+)$/.exec(stationId);
    if (!m) return false;
    var line = findLineData(m[1]);
    if (!line) return false;
    var stations = line.stations || [];
    var idx = Number(m[2]) - 1;
    var target = stations[idx];
    if (!target) return false;
    return stations.some(function(s, i) { return i !== idx && s.name === target.name; });
  }

  function rollupForLine(stationIds) {
    var buckets = { total: stationIds.length, inSync: 0, notSynced: 0, syncConflict: 0, outOfSync: 0, other: 0 };
    stationIds.forEach(function(id) {
      var s = getState(id);
      if (s === STATES.IN_SYNC) buckets.inSync++;
      else if (s === STATES.NOT_SYNCED) buckets.notSynced++;
      else if (s === STATES.SYNC_CONFLICT) buckets.syncConflict++;
      else if (s === STATES.OUT_OF_SYNC) buckets.outOfSync++;
      else buckets.other++;
    });
    return buckets;
  }

  function paintL1Aggregate(lineRow) {
    var cell = lineRow.querySelector('.proj-nested-table__col-afmd');
    if (!cell) return;
    /* EX03 / AFMD unavailable → leave every L1 aggregate blank too. */
    if (!isAfmdAvailable()) { cell.innerHTML = ''; return; }
    var ids = collectLineStationIds(lineRow);
    if (!ids.length) { cell.innerHTML = ''; return; }
    var r = rollupForLine(ids);
    var outOfSyncCount = r.total - r.inSync;
    /* Nothing out of sync → show a green checkmark so the column reads
     * as "all good" at a glance instead of an empty cell. */
    if (outOfSyncCount === 0) {
      cell.innerHTML = '<span class="afmd-aggregate afmd-aggregate--ok" aria-label="All workstations in sync">' +
                         '<lucide-icon name="checkmark.circle.fill"></lucide-icon>' +
                       '</span>';
      return;
    }
    /* When every non-in-sync station is `Not synced` (first-time sync, no
     * conflict yet), the aggregate reads gray + calm — same visual language
     * as the L2 badge. Otherwise fall back to the orange "Out of sync"
     * attention variant. */
    var allNotSynced = (r.notSynced === outOfSyncCount);
    if (allNotSynced) {
      var label = outOfSyncCount + '/' + r.total + ' Not synced';
      cell.innerHTML = '<span class="afmd-aggregate afmd-aggregate--calm">' +
                         '<lucide-icon name="arrow.trianglehead.2.clockwise.rotate.90" class="afmd-aggregate__icon"></lucide-icon>' +
                         '<span class="afmd-aggregate__label">' + label + '</span>' +
                       '</span>';
      return;
    }
    var attentionLabel = outOfSyncCount + '/' + r.total + ' Out of sync';
    cell.innerHTML = '<span class="afmd-aggregate afmd-aggregate--attention">' +
                       '<lucide-icon name="exclamationmark.circle.fill" class="afmd-aggregate__icon"></lucide-icon>' +
                       '<span class="afmd-aggregate__label">' + attentionLabel + '</span>' +
                     '</span>';
  }

  /* ============================================================
   * Paint everything (called after LinesTable.render + after each L2 expand)
   * ============================================================ */
  function paintAll() {
    document.querySelectorAll('#lines-table-body > .proj-nested-table__row--level1').forEach(function(lineRow) {
      paintL1Aggregate(lineRow);
      paintAllL2InLine(lineRow);
    });
  }

  /* ============================================================
   * Multi-select: Shift + click anywhere on an L2 station row toggles
   * its selection. Selection state lives on the row's DOM class list —
   * no module-level tracking. Each expanded L2 sub-table is its own
   * scope: the actions-bar row shown between the L2 thead and body
   * reflects only that line's selected stations.
   * ============================================================ */
  function selectedIdsIn(l2Table) {
    var ids = [];
    l2Table.querySelectorAll('.proj-nested-table__row--level2.afmd-row--selected').forEach(function(row) {
      ids.push(row.getAttribute('data-station-id'));
    });
    return ids;
  }

  function refreshL2Actions(l2Table) {
    var actions = l2Table.querySelector('.afmd-actions-tbody');
    var countEl = l2Table.querySelector('.afmd-selected-count');
    var syncBtn = l2Table.querySelector('.afmd-actions-sync');
    if (!actions || !countEl || !syncBtn) return;
    var selected = l2Table.querySelectorAll('.proj-nested-table__row--level2.afmd-row--selected');
    var n = selected.length;
    if (n === 0) { actions.hidden = true; return; }
    actions.hidden = false;
    countEl.textContent = n + (n === 1 ? ' workstation selected:' : ' workstations selected:');
    /* Enable sync only if at least one selected station is in a syncable state. */
    var eligible = false;
    selected.forEach(function(row) {
      var s = getState(row.getAttribute('data-station-id'));
      if (s === STATES.NOT_SYNCED || s === STATES.OUT_OF_SYNC || s === STATES.UNAVAILABLE) eligible = true;
    });
    syncBtn.disabled = !eligible;
  }

  function wireL2Table(l2Table) {
    if (l2Table._afmdWired) return;
    l2Table._afmdWired = true;

    /* Shift + click toggles selection on the clicked station row. Guards ensure
     * clicks inside interactive elements (dropdowns, inputs, CTA button, links)
     * are NOT treated as selection gestures. */
    l2Table.addEventListener('click', function(e) {
      if (!e.shiftKey) return;
      if (e.target.closest('.equip-dropdown, .equip-input, input, textarea, select, button, a, [data-afmd-action]')) return;
      var row = e.target.closest('.proj-nested-table__row--level2');
      if (!row || !l2Table.contains(row)) return;
      e.preventDefault();
      row.classList.toggle('afmd-row--selected');
      /* Clear the native text-selection that Shift + click produces so the
       * table stays visually clean. */
      if (window.getSelection) { try { window.getSelection().removeAllRanges(); } catch (_) {} }
      refreshL2Actions(l2Table);
    });

    /* Suppress the native text selection that would otherwise appear while the
     * user shift-clicks across rows. */
    l2Table.addEventListener('mousedown', function(e) {
      if (!e.shiftKey) return;
      if (e.target.closest('.equip-dropdown, .equip-input, input, textarea, select, button, a, [data-afmd-action]')) return;
      if (e.target.closest('.proj-nested-table__row--level2')) e.preventDefault();
    });

    var syncBtn = l2Table.querySelector('.afmd-actions-sync');
    if (syncBtn) {
      /* Same tooltip treatment as the L2 badge — hover explains the disabled state. */
      if (!isAfmdAvailable()) {
        syncBtn.setAttribute('data-proj-tooltip', 'AFMD unavailable');
        syncBtn.setAttribute('data-proj-tooltip-placement', 'top');
      }
      syncBtn.addEventListener('click', function() {
        var ids = selectedIdsIn(l2Table);
        if (!ids.length) return;
        openConfirmation(ids);
        /* Clear the selection so the L2 reads clean once the modal closes. */
        l2Table.querySelectorAll('.afmd-row--selected').forEach(function(r) { r.classList.remove('afmd-row--selected'); });
        refreshL2Actions(l2Table);
      });
    }
  }

  /* ============================================================
   * Confirmation modal — lists derived AFMD names for each selected station.
   * Aggregates across a bulk selection.
   * ============================================================ */
  function ensureConfirmationModal() {
    var m = document.getElementById('afmd-confirm-modal');
    if (m) return m;
    var closeSvg = '<lucide-icon name="x" style="font-size:24px"></lucide-icon>';
    m = document.createElement('div');
    m.id = 'afmd-confirm-modal';
    m.className = 'modal-overlay';
    m.innerHTML =
      '<div class="modal modal--medium afmd-modal">' +
        '<div class="modal__header">' +
          '<h3 class="modal__title">AFMD Sync</h3>' +
          '<button class="modal__close" data-afmd-modal="close" aria-label="Close">' + closeSvg + '</button>' +
        '</div>' +
        '<div class="modal__body">' +
          '<div class="afmd-modal__checking">' +
            '<div class="afmd-modal__checking-spinner"><lucide-icon name="arrow.triangle.2.circlepath"></lucide-icon></div>' +
            '<p class="afmd-modal__checking-msg">Checking AFMD for updates…</p>' +
          '</div>' +
          '<div class="afmd-modal__empty">' +
            '<div class="afmd-modal__empty-icon"><lucide-icon name="checkmark.circle.fill"></lucide-icon></div>' +
            '<p class="afmd-modal__empty-msg">Everything is already in sync with AFMD. Nothing to sync right now.</p>' +
          '</div>' +
          '<div class="afmd-modal__blocked">' +
            '<p class="afmd-modal__blocked-title"></p>' +
            '<p class="afmd-modal__blocked-msg"></p>' +
          '</div>' +
          '<p class="afmd-modal__intro">The following AFMD records will be created or updated. One QuickCart Market workstation produces one AFMD record per tools+vendor combination, plus a separate pallet record.</p>' +
          '<div id="afmd-confirm-summary"></div>' +
          '<div class="afmd-modal__list" id="afmd-confirm-list"></div>' +
        '</div>' +
        '<div class="modal__footer">' +
          '<button class="btn btn--link btn--medium afmd-modal__settings-link" data-afmd-modal="station-settings">Workstation Settings</button>' +
          '<button class="btn btn--secondary btn--medium" data-afmd-modal="close">Cancel</button>' +
          '<button class="btn btn--primary btn--medium" data-afmd-modal="confirm">Sync</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(e) {
      var retry = e.target.closest('[data-afmd-retry]');
      if (retry) {
        e.stopPropagation();
        retrySync(retry.getAttribute('data-afmd-retry'));
        return;
      }
      var settings = e.target.closest('[data-afmd-modal="station-settings"]');
      if (settings) {
        var blockedId = m._blockedStationId;
        closeConfirmation();
        if (blockedId && window.ProjStationSettingsDrawer) {
          var lineMatch = /^st-(\d+)-\d+$/.exec(blockedId);
          ProjStationSettingsDrawer.open({
            stationName: stationLabel(blockedId),
            stationId: blockedId,
            lineId: lineMatch ? lineMatch[1] : ''
          });
        }
        return;
      }
      if (e.target === m || e.target.closest('[data-afmd-modal="close"]')) closeConfirmation();
      if (e.target.closest('[data-afmd-modal="confirm"]')) {
        var ids = m._pendingIds || [];
        var wasOos = m.classList.contains('afmd-modal--oos');
        var direction = m._syncDirection;
        closeConfirmation();
        if (wasOos) {
          /* Save on the Sync conflict modal — apply the pre-decided direction
           * (Push or Pull) for each station. Both directions land at IN_SYNC
           * in the mock; a toast surfaces the outcome. */
          ids.forEach(function(id) { setState(id, STATES.IN_SYNC); });
          showAfmdSuccess(direction === 'push'
            ? 'QuickCart Market values pushed to AFMD.'
            : 'AFMD values pulled to QuickCart Market.');
        } else {
          executeSync(ids);
        }
      }
    });
    return m;
  }

  function openConfirmation(ids) {
    /* Guard: if AFMD is not available for this build, no sync entry point fires. */
    if (!isAfmdAvailable()) return;
    /* Always reset the modal to its "confirm" mode — the same shell is reused
     * by openViewSynced in view-only mode, and we don't want stale state
     * leaking between opens. */
    setModalMode('confirm');
    /* Classify the selection so the modal can tell the user exactly what will
     * happen. `syncable` = eligible for Initial sync (POST). `review` = need
     * the diff drawer before syncing (Out of sync). `skipped` = already in
     * sync, archived, or deleted — no action possible from this modal. */
    var syncable = ids.filter(function(id) {
      var s = getState(id);
      return s === STATES.NOT_SYNCED || s === STATES.UNAVAILABLE;
    });
    var review = ids.filter(function(id) { return getState(id) === STATES.OUT_OF_SYNC; });
    var skipped = ids.filter(function(id) { return getState(id) === STATES.IN_SYNC; });

    /* Duplicate-name block: single-station click on a Not synced station that
     * shares its name with another station in the same line. Show the block
     * message instead of the record list — sync is impossible until the
     * duplicate is resolved by renaming in Apple Core. Bulk selections still
     * fall through to the normal modal; blocked stations surface as failures
     * in the results modal via syncErrorFor. */
    if (ids.length === 1 && syncable.length === 1 && hasDuplicateNameInLine(syncable[0])) {
      return openBlockedByDuplicateName(syncable[0]);
    }

    /* Single Out-of-sync station: skip the modal and route straight to the
     * diff drawer — that's the only meaningful action for it. */
    if (syncable.length === 0 && review.length === 1 && skipped.length === 0) {
      return openDiffDrawer(review[0]);
    }

    /* Otherwise: show the modal with a summary bar at the top explaining
     * how many stations will actually be synced vs. skipped. */
    var m = ensureConfirmationModal();
    var willSync = syncable.length ? syncable : review;
    m._pendingIds = willSync.slice();

    var summaryEl = document.getElementById('afmd-confirm-summary');
    if (summaryEl) summaryEl.innerHTML = buildSummaryHtml(ids.length, syncable, review, skipped);

    var list = document.getElementById('afmd-confirm-list');
    var mode = syncable.length === 0 ? 'review' : 'create';
    list.innerHTML = buildLineGroupedHtml(willSync, mode);

    m.classList.add('modal-overlay--open');
  }

  /* Group station blocks by their parent line so the confirmation modal
   * reads as "Line name → station blocks below" instead of a flat list
   * of stations from multiple lines. Preserves the order of the input
   * list (stations of the same line stay contiguous). */
  function buildLineGroupedHtml(ids, mode) {
    var groups = {};
    var order = [];
    ids.forEach(function(id) {
      var m = /^st-(\d+)-\d+$/.exec(id);
      var lineId = m ? m[1] : 'unknown';
      if (!groups[lineId]) {
        groups[lineId] = [];
        order.push(lineId);
      }
      groups[lineId].push(id);
    });
    return order.map(function(lineId) {
      return (
        '<div class="afmd-modal__line-group">' +
          '<div class="afmd-modal__line-name">' + lineNameFor(lineId) + '</div>' +
          groups[lineId].map(function(id) { return buildStationBlockHtml(id, mode); }).join('') +
        '</div>'
      );
    }).join('');
  }

  function lineNameFor(lineId) {
    var lines = window.DetailData && window.DetailData.getLines ? window.DetailData.getLines() : [];
    for (var i = 0; i < lines.length; i++) {
      if (String(lines[i].id) === String(lineId)) return lines[i].name;
    }
    return 'Assembly area ' + lineId;
  }

  function buildSummaryHtml(totalSelected, syncable, review, skipped) {
    /* Suppress the summary entirely when every selected station is eligible —
     * no need to explain "N of N will sync" when the ratio is 1:1. */
    var willSync = syncable.length || review.length;
    if (skipped.length === 0 && totalSelected === willSync && review.length === 0) return '';

    var lines = [];
    if (syncable.length) {
      lines.push('<li><strong>' + syncable.length + '</strong> workstation' + (syncable.length === 1 ? '' : 's') +
                 ' will be synced with AFMD.</li>');
    }
    if (review.length) {
      lines.push('<li><strong>' + review.length + '</strong> workstation' + (review.length === 1 ? '' : 's') +
                 ' will push local values to AFMD (Sync conflict).</li>');
    }
    if (skipped.length) {
      lines.push('<li><strong>' + skipped.length + '</strong> workstation' + (skipped.length === 1 ? '' : 's') +
                 ' will be skipped (already in sync, archived, or deleted).</li>');
    }
    return (
      '<div class="afmd-modal__summary">' +
        '<p class="afmd-modal__summary-title">You selected <strong>' + totalSelected + '</strong> workstation' +
        (totalSelected === 1 ? '' : 's') + '.</p>' +
        '<ul class="afmd-modal__summary-list">' + lines.join('') + '</ul>' +
      '</div>'
    );
  }

  function closeConfirmation() {
    var m = document.getElementById('afmd-confirm-modal');
    if (m) m.classList.remove('modal-overlay--open');
  }

  /* Toggle the confirmation modal between its modes:
   *   'confirm'  — pre-sync, shows summary + Confirm sync button
   *   'view'     — post-sync informational, records list + Close
   *   'oos'      — Out-of-sync / Sync conflict review, records list + Close/Save
   *   'checking' — wizard step 1: loading spinner while we check AFMD
   *   'empty'    — wizard step 2 no-op: nothing to sync, Close only */
  function setModalMode(mode) {
    var m = document.getElementById('afmd-confirm-modal');
    if (!m) return;
    var titleEl = m.querySelector('.modal__title');
    var introEl = m.querySelector('.afmd-modal__intro');
    var confirmBtn = m.querySelector('[data-afmd-modal="confirm"]');
    var cancelBtn = m.querySelector('.modal__footer [data-afmd-modal="close"]');
    var summaryEl = document.getElementById('afmd-confirm-summary');
    /* Reset all variant classes before applying the current mode. */
    m.classList.remove('afmd-modal--view', 'afmd-modal--oos', 'afmd-modal--has-save', 'afmd-modal--checking', 'afmd-modal--empty', 'afmd-modal--results', 'afmd-modal--blocked', 'afmd-modal--allow-settings');
    if (mode === 'results') {
      m.classList.add('afmd-modal--results');
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (introEl) introEl.textContent = 'Sync results per workstation.';
      if (confirmBtn) confirmBtn.hidden = true;
      if (cancelBtn) cancelBtn.textContent = 'Close';
      if (summaryEl) summaryEl.innerHTML = '';
    } else if (mode === 'view') {
      m.classList.add('afmd-modal--view');
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (introEl) introEl.textContent = 'The following AFMD records are in sync with this workstation.';
      if (confirmBtn) confirmBtn.hidden = true;
      if (cancelBtn) cancelBtn.textContent = 'Close';
      if (summaryEl) summaryEl.innerHTML = '';
    } else if (mode === 'oos') {
      m.classList.add('afmd-modal--oos');
      if (titleEl) titleEl.textContent = 'Sync conflict';
      if (introEl) introEl.textContent = 'This workstation has a sync conflict with AFMD. Review the differences below and decide how to reconcile.';
      /* Confirm button stays available in oos mode too — it becomes Apply when
       * there are field conflicts to resolve. openDiffDrawer relabels it. */
      if (confirmBtn) confirmBtn.hidden = false;
      if (cancelBtn) cancelBtn.textContent = 'Cancel';
      if (summaryEl) summaryEl.innerHTML = '';
    } else if (mode === 'checking') {
      m.classList.add('afmd-modal--checking');
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (cancelBtn) cancelBtn.textContent = 'Cancel';
      if (summaryEl) summaryEl.innerHTML = '';
    } else if (mode === 'empty') {
      m.classList.add('afmd-modal--empty');
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (cancelBtn) cancelBtn.textContent = 'Close';
      if (summaryEl) summaryEl.innerHTML = '';
    } else if (mode === 'blocked') {
      m.classList.add('afmd-modal--blocked');
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (confirmBtn) confirmBtn.hidden = true;
      if (cancelBtn) cancelBtn.textContent = 'Close';
      if (summaryEl) summaryEl.innerHTML = '';
    } else {
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (introEl) introEl.textContent = 'The following AFMD records are out of sync and will be created or updated. One QuickCart Market workstation produces one AFMD record per tools+vendor combination, plus a separate pallet record.';
      if (confirmBtn) confirmBtn.hidden = false;
      if (cancelBtn) cancelBtn.textContent = 'Cancel';
    }
  }

  /* Open the modal shell in "blocked" mode — used when a Not synced station
   * shares its name with another station in the same line. No records list,
   * no Sync CTA; the user must rename the station in Apple Core and retry.
   * The Station Settings footer link is scoped to the RF Calibration demo
   * scenario only (the sole seeded case where renaming resolves the block). */
  function openBlockedByDuplicateName(stationId) {
    var m = ensureConfirmationModal();
    m._pendingIds = [];
    /* Remember which station opened the block so the Station Settings link
     * in the footer knows what to hand to ProjStationSettingsDrawer. */
    m._blockedStationId = stationId;
    setModalMode('blocked');
    var name = stationLabel(stationId);
    if (name === 'RF Calibration') m.classList.add('afmd-modal--allow-settings');
    var titleEl = m.querySelector('.afmd-modal__blocked-title');
    var msgEl = m.querySelector('.afmd-modal__blocked-msg');
    if (titleEl) titleEl.textContent = 'Sync blocked — duplicate workstation name';
    if (msgEl) msgEl.textContent = 'A workstation named "' + name + '" already exists in this assembly area. Rename this workstation to a unique value in QuickCart Market, then try syncing again.';
    m.classList.add('modal-overlay--open');
  }

  /* Open the same modal shell in read-only "view" mode. Shows what's currently
   * synced for a single station — the derived AFMD records list, no confirm CTA. */
  function openViewSynced(stationId) {
    var m = ensureConfirmationModal();
    m._pendingIds = [];
    setModalMode('view');
    document.getElementById('afmd-confirm-list').innerHTML = buildStationBlockHtml(stationId, 'view');
    m.classList.add('modal-overlay--open');
  }

  function stationLabel(id) {
    /* stationId shape: st-<lineId>-<idx>. Look up line + station name from data. */
    var m = /^st-(\d+)-(\d+)$/.exec(id);
    if (!m) return id;
    var line = findLineData(m[1]);
    if (!line) return id;
    var st = (line.stations || [])[Number(m[2]) - 1];
    return (st && st.name) ? st.name : id;
  }

  function buildStationBlockHtml(id, mode) {
    /* mode: 'create' (default) | 'review' | 'view' */
    var name = stationLabel(id);
    var records = deriveAfmdNames(name, id);
    var tag;
    if (mode === 'view') {
      tag = '<span class="afmd-modal__tag afmd-modal__tag--success">In sync</span>';
    } else if (mode === 'review') {
      tag = '<span class="afmd-modal__tag afmd-modal__tag--warn">Push local values</span>';
    } else {
      tag = '<span class="afmd-modal__tag afmd-modal__tag--info">Create in AFMD</span>';
    }
    return (
      '<div class="afmd-modal__station">' +
        '<div class="afmd-modal__station-head">' +
          '<span class="afmd-modal__station-name">' + name + '</span>' +
          tag +
          '<span class="afmd-modal__station-count">' + records.length + ' record' + (records.length === 1 ? '' : 's') + '</span>' +
        '</div>' +
        '<ul class="afmd-modal__records">' +
          records.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
        '</ul>' +
      '</div>'
    );
  }

  /* ============================================================
   * Review modal — used for Sync conflict stations. The direction
   * (Push or Pull) is predetermined per station, so the user just sees
   * the diff and confirms. The visual highlights whichever column will
   * be overwritten so the user knows what's about to change.
   * ============================================================ */
  function openDiffDrawer(stationId) {
    if (!isAfmdAvailable()) return;
    var m = ensureConfirmationModal();
    m._pendingIds = [stationId];
    setModalMode('oos');

    var state = getState(stationId);
    var isConflict = state === STATES.SYNC_CONFLICT;
    var name = stationLabel(stationId);
    var direction = syncDirectionFor(stationId);
    m._syncDirection = direction;

    if (isConflict) {
      document.getElementById('afmd-confirm-list').innerHTML = buildDirectedConflictHtml(name, stationId, direction);
    } else {
      var records = deriveAfmdRecordStates(name, stationId);
      document.getElementById('afmd-confirm-list').innerHTML = buildOosRecordsBlockHtml(name, records);
    }

    /* Title + intro reflect the direction — Push and Pull have distinct
     * framings even though the table is the same shape. */
    var titleEl = m.querySelector('.modal__title');
    var introEl = m.querySelector('.afmd-modal__intro');
    var confirmBtn = m.querySelector('[data-afmd-modal="confirm"]');
    var cancelBtn = m.querySelector('.modal__footer [data-afmd-modal="close"]');

    if (isConflict) {
      m.classList.add('afmd-modal--has-save');
      m.classList.toggle('afmd-modal--push', direction === 'push');
      m.classList.toggle('afmd-modal--pull', direction === 'pull');
      m.classList.toggle('afmd-modal--both', direction === 'both');
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (introEl) {
        if (direction === 'push') {
          introEl.textContent = 'The following AFMD values will be overwritten by QuickCart Market. Review the changes below before confirming.';
        } else if (direction === 'pull') {
          introEl.textContent = 'The following QuickCart Market values will be overwritten by AFMD. Review the changes below before confirming.';
        } else {
          introEl.textContent = 'QuickCart Market and AFMD have different values for this workstation. Choose which to keep.';
        }
      }
      if (confirmBtn) {
        if (direction === 'push') confirmBtn.textContent = 'Push to AFMD';
        else if (direction === 'pull') confirmBtn.textContent = 'Pull from AFMD';
        else confirmBtn.textContent = 'Confirm';
      }
      if (cancelBtn) cancelBtn.textContent = 'Cancel';
      /* Single-direction flows enable the button immediately. The `both`
       * flow waits until the user picks a direction. */
      if (direction === 'both') {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('btn--disabled');
      } else {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('btn--disabled');
      }
    } else {
      m.classList.remove('afmd-modal--has-save', 'afmd-modal--push', 'afmd-modal--pull', 'afmd-modal--both');
      if (titleEl) titleEl.textContent = 'AFMD Sync';
      if (introEl) introEl.textContent = 'Some AFMD records for this workstation changed on the AFMD side. These changes cannot be reconciled from QuickCart Market — resolve them in AFMD.';
      if (cancelBtn) cancelBtn.textContent = 'Close';
    }

    /* Wire the inline Push / Pull picker used by the `both` flow. Same shell
     * as the previous per-record picker but scoped to the single station
     * card. Guard so we only bind once. */
    var listEl = document.getElementById('afmd-confirm-list');
    if (listEl && !listEl._afmdDiffBound) {
      listEl._afmdDiffBound = true;
      listEl.addEventListener('click', function(e) {
        var btn = e.target.closest('.afmd-conflict-btn');
        if (!btn) return;
        var dir = btn.getAttribute('data-dir');
        m._syncDirection = dir;
        listEl.querySelectorAll('.afmd-conflict-btn').forEach(function(b) {
          b.classList.toggle('afmd-conflict-btn--selected', b === btn);
        });
        var msgEl = listEl.querySelector('.afmd-conflict__msg');
        if (msgEl) {
          msgEl.textContent = dir === 'push'
            ? 'QuickCart Market values will overwrite AFMD.'
            : 'AFMD values will overwrite QuickCart Market.';
          msgEl.hidden = false;
        }
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.classList.remove('btn--disabled');
          confirmBtn.textContent = dir === 'push' ? 'Push to AFMD' : 'Pull from AFMD';
        }
      });
    }

    m.classList.add('modal-overlay--open');
  }

  /* Build the layout used for Push / Pull / user-choice conflict resolution.
   * Shows the station header + a diff table with only the diverging fields,
   * with a subtle highlight on the column that will be overwritten.
   *
   * Push scenario → a new equipment was added to the station in Apple Core;
   *   the AFMD side doesn't have that equipment yet. The table shows the new
   *   Equipment + Vendor rows with empty AFMD cells to signal "will be created".
   * Pull scenario → AFMD has a value the Apple Core side doesn't have; the
   *   Core column reads empty.
   * Both scenario → both sides have divergent values for the same field. The
   *   user picks the direction via inline Push / Pull buttons. */
  function buildDirectedConflictHtml(stationName, stationId, direction) {
    /* 'both' — reuse the OOS block renderer, which lists every record and
     * inline-expands the conflicting one with the diff table + Push/Pull
     * picker. Avoids duplicating the station card. */
    if (direction === 'both') {
      var names = deriveAfmdNames(stationName, stationId);
      var conflictIdx = hashOf(stationId) % (names.length - 1);
      var records = names.map(function(name, i) {
        if (i === conflictIdx) {
          return { name: name, state: 'conflict', fieldConflicts: fieldConflictsFor(stationId, i) };
        }
        return { name: name, state: 'synced' };
      });
      return buildOosRecordsBlockHtml(stationName, records);
    }

    /* Every direction now leads with the existing AFMD records list so the
     * user sees what's already in sync before deciding what to change. */
    var existing = deriveAfmdNames(stationName, stationId);
    var existingHtml =
      '<div class="afmd-modal__station">' +
        '<div class="afmd-modal__station-head">' +
          '<span class="afmd-modal__station-name">' + stationName + '</span>' +
          '<span class="afmd-modal__station-count">' + existing.length + ' record' + (existing.length === 1 ? '' : 's') + '</span>' +
        '</div>' +
        '<ul class="afmd-modal__records">' +
          existing.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
        '</ul>' +
      '</div>';

    if (direction === 'push') {
      var addition = newEquipmentFor(stationId);
      var recordName = (stationName + '_' + addition.vendor).toUpperCase();
      var newHtml =
        '<div class="afmd-push">' +
          '<p class="afmd-push__text">' +
            'A new tool (<strong>' + addition.equipment + '</strong> from <strong>' + addition.vendor + '</strong>) was added to this workstation in QuickCart Market. Push creates a new workstation variation in AFMD:' +
          '</p>' +
          '<ul class="afmd-push__records">' +
            '<li>' + recordName + '</li>' +
          '</ul>' +
        '</div>';
      return existingHtml + newHtml;
    }

    /* Pull scenario — table with Core empty, AFMD filled. */
    var emptyCell = '<span class="afmd-conflict-table__empty">—</span>';
    var pullConflicts = fieldConflictsFor(stationId, 0);
    var rowsHtml = pullConflicts.map(function(f) {
      return (
        '<tr>' +
          '<td class="afmd-conflict-table__field">' + f.label + '</td>' +
          '<td class="afmd-conflict-table__val" data-side="core">' + emptyCell + '</td>' +
          '<td class="afmd-conflict-table__val" data-side="afmd">' + f.remote + '</td>' +
        '</tr>'
      );
    }).join('');
    return (
      existingHtml +
      '<div class="afmd-conflict afmd-conflict--' + direction + '">' +
        '<table class="afmd-conflict-table">' +
          '<thead><tr>' +
            '<th class="afmd-conflict-table__field">Field</th>' +
            '<th class="afmd-conflict-table__val" data-side="core">QuickCart Market value</th>' +
            '<th class="afmd-conflict-table__val" data-side="afmd">AFMD value</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  /* Deterministic pick of which existing AFMD record has the conflict. We
   * exclude the pallet (always the last name) since pallets don't carry the
   * field-level attributes that generate real conflicts. */
  function conflictRecordFor(stationName, stationId) {
    var names = deriveAfmdNames(stationName, stationId);
    var pool = names.length - 1;
    return names[hashOf(stationId) % pool];
  }

  /* Deterministic new-equipment pick for the Push demo. Uses the same
   * equipment + vendor pools that `deriveAfmdNames` samples so the record
   * name reads consistently across the flow. `equipmentSlug` is the
   * hyphenated form used inside AFMD record names. */
  function newEquipmentFor(stationId) {
    var vendors = ['ACME', 'Foxconn', 'Pegatron', 'Wistron', 'Compal', 'Quanta'];
    var equipments = [
      { name: 'ICT Fixture',    slug: 'ICT-Fixture' },
      { name: 'AOI Camera',     slug: 'AOI-Camera' },
      { name: 'Torque Driver',  slug: 'Torque-Driver' },
      { name: 'Laser Marker',   slug: 'Laser-Marker' },
      { name: 'Vacuum Chamber', slug: 'Vacuum-Chamber' },
      { name: 'Pick and Place', slug: 'Pick-and-Place' }
    ];
    var h = hashOf(stationId + '#new');
    var eq = equipments[h % equipments.length];
    return {
      equipment: eq.name,
      equipmentSlug: eq.slug,
      vendor: vendors[(h + 1) % vendors.length]
    };
  }

  /* Explain the write direction in plain language once the user picks
   * Push / Pull for a conflict record. */
  function updateConflictMessage(recEl, dir) {
    var msg = recEl.querySelector('.afmd-conflict__msg');
    if (!msg) return;
    if (dir === 'push') {
      msg.textContent = 'QuickCart Market values will overwrite AFMD.';
    } else {
      msg.textContent = 'AFMD values will overwrite QuickCart Market.';
    }
    msg.hidden = false;
  }

  /* Sync button stays disabled until every conflict record has a direction
   * chosen (Push or Pull). Only applies in Sync conflict mode. */
  function refreshConflictConfirmState(m) {
    var confirmBtn = m.querySelector('[data-afmd-modal="confirm"]');
    if (!confirmBtn) return;
    if (!m.classList.contains('afmd-modal--has-save')) return;
    var recs = m.querySelectorAll('.afmd-modal__record[data-record-state="conflict"]');
    var allResolved = recs.length > 0 && Array.prototype.every.call(recs, function(r) {
      return !!r.getAttribute('data-record-dir');
    });
    confirmBtn.disabled = !allResolved;
    confirmBtn.classList.toggle('btn--disabled', !allResolved);
  }

  function buildOosRecordsBlockHtml(stationName, records) {
    var counts = { synced: 0, archived: 0, deleted: 0, conflict: 0 };
    records.forEach(function(r) { counts[r.state]++; });
    var summaryBits = [];
    if (counts.synced)   summaryBits.push('<strong>' + counts.synced + '</strong> in sync');
    if (counts.conflict) summaryBits.push('<strong>' + counts.conflict + '</strong> out of sync');
    if (counts.archived) summaryBits.push('<strong>' + counts.archived + '</strong> archived');
    if (counts.deleted)  summaryBits.push('<strong>' + counts.deleted + '</strong> deleted');
    return (
      '<div class="afmd-modal__station">' +
        '<div class="afmd-modal__station-head">' +
          '<span class="afmd-modal__station-name">' + stationName + '</span>' +
          '<span class="afmd-modal__station-count">' + records.length + ' record' + (records.length === 1 ? '' : 's') + ' · ' + summaryBits.join(' · ') + '</span>' +
        '</div>' +
        '<ul class="afmd-modal__records afmd-modal__records--stateful">' +
          records.map(function(r, i) { return buildRecordItemHtml(r, i); }).join('') +
        '</ul>' +
      '</div>'
    );
  }

  function buildRecordItemHtml(record, idx) {
    var head =
      '<div class="afmd-modal__record-head">' +
        '<span class="afmd-modal__record-name">' + record.name + '</span>' +
        recordStateBadge(record.state) +
      '</div>';
    var fields = '';
    if (record.state === 'conflict' && record.fieldConflicts && record.fieldConflicts.length) {
      var rows = record.fieldConflicts.map(function(f) {
        return (
          '<tr>' +
            '<td class="afmd-conflict-table__field">' + f.label + '</td>' +
            '<td class="afmd-conflict-table__val" data-side="core">' + f.local + '</td>' +
            '<td class="afmd-conflict-table__val" data-side="afmd">' + f.remote + '</td>' +
          '</tr>'
        );
      }).join('');
      fields =
        '<div class="afmd-conflict">' +
          '<table class="afmd-conflict-table">' +
            '<thead><tr>' +
              '<th class="afmd-conflict-table__field">Field</th>' +
              '<th class="afmd-conflict-table__val">QuickCart Market value</th>' +
              '<th class="afmd-conflict-table__val">AFMD value</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
          '<div class="afmd-conflict__actions">' +
            '<button type="button" class="afmd-conflict-btn" data-dir="push">' +
              '<lucide-icon name="arrow.up.right"></lucide-icon>' +
              'Push to AFMD' +
            '</button>' +
            '<button type="button" class="afmd-conflict-btn" data-dir="pull">' +
              '<lucide-icon name="arrow.down.left"></lucide-icon>' +
              'Pull from AFMD' +
            '</button>' +
          '</div>' +
          '<div class="afmd-conflict__msg" hidden></div>' +
        '</div>';
    }
    return (
      '<li class="afmd-modal__record" data-record-state="' + record.state + '">' +
        head + fields +
      '</li>'
    );
  }

  function recordStateBadge(state) {
    var map = {
      'synced':   { icon: 'checkmark.circle.fill',        label: 'In sync',       variant: 'in-sync' },
      'conflict': { icon: 'exclamationmark.circle.fill',  label: 'Out of sync',   variant: 'out-of-sync' },
      'archived': { icon: 'archivebox.fill',               label: 'AFMD archived', variant: 'archived' },
      'deleted':  { icon: 'trash.fill',                    label: 'AFMD deleted',  variant: 'deleted' }
    };
    var m = map[state] || map.synced;
    return (
      '<span class="afmd-badge afmd-badge--' + m.variant + ' afmd-badge--inline">' +
        '<span class="afmd-badge__icon"><lucide-icon name="' + m.icon + '"></lucide-icon></span>' +
        '<span class="afmd-badge__label">' + m.label + '</span>' +
      '</span>'
    );
  }
  /* ============================================================
   * Execute sync — simulated. Uses the shared ProjProgressDrawer plugin
   * (bottom-anchored, full-width) for feedback: single spinner + message
   * + step label + progress bar. On completion, every synced station is
   * flipped to IN_SYNC and a success notification is fired.
   * ============================================================ */
  var NOTIFICATION_SUCCESS_ICON =
    '<lucide-icon name="x" style="font-size:14px"></lucide-icon>';

  var NOTIFICATION_ERROR_ICON =
    '<lucide-icon name="circle-alert" style="font-size:14px"></lucide-icon>';

  function ensureAfmdNotifContainer() {
    var c = document.getElementById('afmd-notifications');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'afmd-notifications';
    c.className = 'lines-notifications';
    document.body.appendChild(c);
    return c;
  }

  function showAfmdSuccess(message) {
    var c = ensureAfmdNotifContainer();
    var n = document.createElement('div');
    n.className = 'notification notification--success';
    n.innerHTML =
      '<div class="notification__icon">' + NOTIFICATION_SUCCESS_ICON + '</div>' +
      '<div class="notification__content"><div class="notification__message">' + message + '</div></div>' +
      '<button class="notification__close" aria-label="Close">×</button>';
    c.appendChild(n);
    var t = setTimeout(function() { n.remove(); }, 3500);
    n.querySelector('.notification__close').addEventListener('click', function() {
      clearTimeout(t);
      n.remove();
    });
  }

  function showAfmdError(title, detail) {
    var c = ensureAfmdNotifContainer();
    var n = document.createElement('div');
    n.className = 'notification notification--error';
    n.innerHTML =
      '<div class="notification__icon">' + NOTIFICATION_ERROR_ICON + '</div>' +
      '<div class="notification__content">' +
        '<div class="notification__title">' + title + '</div>' +
        (detail ? '<div class="notification__message">' + detail + '</div>' : '') +
      '</div>' +
      '<button class="notification__close" aria-label="Close">×</button>';
    c.appendChild(n);
    var t = setTimeout(function() { n.remove(); }, 6000);
    n.querySelector('.notification__close').addEventListener('click', function() {
      clearTimeout(t);
      n.remove();
    });
  }

  /* Track per-station sync attempts so the demo can fail on the first try
   * and succeed on the retry. Persists for the session. */
  var syncAttempts = {};

  function syncErrorFor(id) {
    var name = stationLabel(id);
    /* Duplicate-name block: fires for bulk sync flows where the guard in
     * openConfirmation is bypassed. Retry after the designer renames the
     * station succeeds (mock — attempts counter unblocks it). */
    if (hasDuplicateNameInLine(id) && (syncAttempts[id] || 0) <= 1) {
      return {
        title: 'Sync blocked — duplicate workstation name',
        message: 'A workstation named "' + name + '" already exists in this assembly area. Rename this workstation to a unique value in QuickCart Market, then try syncing again.'
      };
    }
    if (name.indexOf('/') === -1) return null;
    if ((syncAttempts[id] || 0) > 1) return null;
    return {
      title: 'Unable to sync this workstation',
      message: 'The name "' + name + '" contains a slash (/) that can’t be converted automatically. Rename the workstation in QuickCart Market to continue.'
    };
  }

  function executeSync(ids, contextIds) {
    if (!ids.length) return;
    ids.forEach(function(id) { syncAttempts[id] = (syncAttempts[id] || 0) + 1; });
    /* When we're re-syncing after a failure, contextIds carries the full
     * original selection so the results modal re-lists every station (not
     * just the one being retried). */
    var fullList = contextIds && contextIds.length ? contextIds : ids;
    if (!window.ProjProgressDrawer || typeof ProjProgressDrawer.show !== 'function') {
      /* Plugin not loaded — fall back to instant sync so the demo still runs. */
      finalizeSync(ids, fullList);
      return;
    }
    var stationNames = ids.map(stationLabel);
    var msg = 'Syncing ' + ids.length + ' station' + (ids.length === 1 ? '' : 's') + ' with AFMD…';
    /* ~600ms per station, min 2000ms — gives the step labels time to be read. */
    var duration = Math.max(2000, ids.length * 600);
    ProjProgressDrawer.show({
      message: msg,
      steps: stationNames,
      duration: duration,
      onComplete: function() { finalizeSync(ids, fullList); }
    });
  }

  function finalizeSync(syncedIds, contextIds) {
    /* Apply state changes for the ids we actually re-synced this round. */
    syncedIds.forEach(function(id) {
      var err = syncErrorFor(id);
      if (!err) setState(id, STATES.IN_SYNC);
    });
    /* Build results for the FULL context — every station the user originally
     * selected shows up in the results modal, even ones that were already
     * synced on a prior attempt, so the user sees the complete outcome. */
    var results = contextIds.map(function(id) {
      var wasRetried = syncedIds.indexOf(id) !== -1;
      var err = wasRetried ? syncErrorFor(id) : null;
      return { id: id, name: stationLabel(id), ok: !err, error: err };
    });
    openSyncResults(results, contextIds);
  }

  function openSyncResults(results, contextIds) {
    var m = ensureConfirmationModal();
    setModalMode('results');
    var listEl = document.getElementById('afmd-confirm-list');
    if (listEl) listEl.innerHTML = renderSyncResults(results);
    m._syncResults = results;
    m._contextIds = contextIds;
    m.classList.add('modal-overlay--open');
  }

  function renderSyncResults(results) {
    return results.map(function(r) {
      if (r.ok) {
        return (
          '<li class="afmd-modal__result afmd-modal__result--ok">' +
            '<div class="afmd-modal__result-head">' +
              '<lucide-icon name="checkmark.circle.fill" class="afmd-modal__result-icon afmd-modal__result-icon--ok"></lucide-icon>' +
              '<span class="afmd-modal__result-name">' + r.name + '</span>' +
              '<span class="afmd-modal__result-status afmd-modal__result-status--ok">In sync</span>' +
            '</div>' +
          '</li>'
        );
      }
      return (
        '<li class="afmd-modal__result afmd-modal__result--error" data-station-id="' + r.id + '">' +
          '<div class="afmd-modal__result-head">' +
            '<lucide-icon name="exclamationmark.circle.fill" class="afmd-modal__result-icon afmd-modal__result-icon--error"></lucide-icon>' +
            '<span class="afmd-modal__result-name">' + r.name + '</span>' +
            '<button type="button" class="afmd-modal__result-retry" data-afmd-retry="' + r.id + '">' +
              '<lucide-icon name="arrow.clockwise"></lucide-icon>' +
              'Retry' +
            '</button>' +
          '</div>' +
          '<div class="afmd-modal__result-body">' +
            '<div class="afmd-modal__result-title">' + r.error.title + '</div>' +
            '<div class="afmd-modal__result-message">' + r.error.message + '</div>' +
          '</div>' +
        '</li>'
      );
    }).join('');
  }

  function retrySync(id) {
    var m = document.getElementById('afmd-confirm-modal');
    if (!m) return;
    /* Preserve the original full selection so the re-opened results modal
     * shows every station, not just the retried one. */
    var contextIds = (m._contextIds && m._contextIds.length) ? m._contextIds : [id];
    m.classList.remove('modal-overlay--open');
    executeSync([id], contextIds);
  }

  /* ============================================================
   * Inline CTA delegation — handles per-row clicks on the L2 badge column.
   * ============================================================ */
  function bindCtaDelegation() {
    if (document._afmdCtaBound) return;
    document._afmdCtaBound = true;
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-afmd-action]');
      if (!btn) return;
      e.stopPropagation();
      var action = btn.getAttribute('data-afmd-action');
      var id = btn.getAttribute('data-station-id');
      if (action === 'sync' || action === 'retry') openConfirmation([id]);
      else if (action === 'review') openDiffDrawer(id);
      else if (action === 'view-synced') openViewSynced(id);
    });
  }

  /* ============================================================
   * L2 wiring — every newly-inserted L2 sub-table gets its checkboxes
   * and select-all wired up here. Called from the mutation observer.
   * ============================================================ */
  function wireDetailRow(detailRow) {
    var l2 = detailRow.querySelector('.l2__table');
    if (l2) wireL2Table(l2);
    /* EX04 mode: if the parent line's checkbox is checked, propagate to the
     * freshly-rendered L2 station checkboxes. Handles the case where the
     * user checks a line while it's collapsed → we auto-expand, and the
     * new L2 rows need to reflect the L1 selection immediately. */
    if (isH88Mode()) {
      var lineRow = detailRow.previousElementSibling;
      var lineCbx = lineRow ? lineRow.querySelector('.afmd-h88-line-checkbox') : null;
      if (lineCbx && lineCbx.checked) {
        detailRow.querySelectorAll('.afmd-h88-station-checkbox').forEach(function(cbx) {
          cbx.checked = true;
          var sRow = cbx.closest('.proj-nested-table__row--level2');
          if (sRow) sRow.classList.add('afmd-row--selected');
        });
        if (l2) refreshL2Actions(l2);
      }
    }
  }

  function wireAllExistingL2() {
    document.querySelectorAll('.l2__table').forEach(wireL2Table);
  }

  /* ============================================================
   * Repaint hook — LinesTable.render clears the tbody and re-renders every L1.
   * L2 detail rows are added lazily on expand by proj-nested-table. We wrap
   * LinesTable.render to repaint after each render, and observe DOM insertions
   * so newly expanded L2 rows also get painted.
   * ============================================================ */
  function bindRepaintHook() {
    if (window.LinesTable && !window.LinesTable._afmdWrapped) {
      var orig = window.LinesTable.render;
      window.LinesTable.render = function() {
        orig.apply(this, arguments);
        paintAll();
      };
      window.LinesTable._afmdWrapped = true;
    }
    /* Observe every expand — when a detail row appears, paint its L2 stations. */
    var tbody = document.getElementById('lines-table-body');
    if (tbody && !tbody._afmdObserved) {
      tbody._afmdObserved = true;
      var mo = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          m.addedNodes.forEach(function(n) {
            if (!(n instanceof HTMLElement)) return;
            if (n.classList && n.classList.contains('proj-nested-table__detail-row')) {
              /* When a detail row is added, its previous sibling is the L1 line row. */
              n.querySelectorAll('[data-station-id]').forEach(paintL2Badge);
              var lineRow = n.previousElementSibling;
              if (lineRow) paintL1Aggregate(lineRow);
              /* Wire the newly-added L2 sub-table's checkboxes + actions bar. */
              wireDetailRow(n);
            } else if (n.classList && n.classList.contains('proj-nested-table__row--level1')) {
              paintL1Aggregate(n);
            }
          });
        });
      });
      mo.observe(tbody, { childList: true, subtree: false });
    }
  }

  /* ============================================================
   * Build-level eligibility mock — normally "ready", but for the EX03
   * demo program we flip to "unavailable" so the design shows how the
   * disabled state reads across the page.
   * EX04 is a separate demo: AFMD IS available, but every station starts
   * as Not synced — used to demo the "sync everything from scratch" flow
   * from the AFMD Sync button in the header.
   * ============================================================ */
  var AFMD_UNAVAILABLE_PROGRAMS = ['EX03'];
  var ALL_NOT_SYNCED_PROGRAMS = ['EX04'];

  function currentProgramCode() {
    try {
      var p = new URLSearchParams(window.location.search).get('code');
      return (p || '').toUpperCase();
    } catch (e) { return ''; }
  }

  function isAfmdAvailable() {
    return AFMD_UNAVAILABLE_PROGRAMS.indexOf(currentProgramCode()) === -1;
  }

  function forceAllNotSynced() {
    return ALL_NOT_SYNCED_PROGRAMS.indexOf(currentProgramCode()) !== -1;
  }

  function applyEligibilityMock() {
    var tag = document.getElementById('afmd-eligibility-tag');
    if (!tag) return;
    var page = document.querySelector('.program-detail-page');
    if (!isAfmdAvailable()) {
      /* EX03 case: AFMD is unreachable — surface that state prominently
       * with the MDS danger palette + a filled xmark circle so it reads
       * as an alert. */
      tag.hidden = false;
      tag.setAttribute('data-afmd-eligibility', 'unavailable');
      tag.classList.remove('tag--success', 'tag--gray');
      tag.classList.add('tag--danger');
      tag.removeAttribute('title');
      tag.setAttribute('data-proj-tooltip', 'AFMD is not accessible');
      tag.setAttribute('data-proj-tooltip-placement', 'bottom');
      tag.setAttribute('tabindex', '0');
      tag.innerHTML =
        '<lucide-icon name="xmark.circle.fill" class="afmd-eligibility-tag__icon"></lucide-icon>' +
        'AFMD';
      if (page) page.classList.add('program-detail-page--afmd-unavailable');
      return;
    }
    /* AFMD is available. Only claim "connected" once at least one station
     * has actually been synced — otherwise the tag is a lie. Hide entirely
     * until the first sync. */
    if (page) page.classList.remove('program-detail-page--afmd-unavailable');

    /* Out-of-sync branch: only EX04 (or any forceAllNotSynced program) shows
     * the orange "attention" tag. Other programs use the classic behavior —
     * green once anything is synced, hidden otherwise. */
    if (forceAllNotSynced() && anyStationOutOfSync()) {
      tag.hidden = false;
      tag.setAttribute('data-afmd-eligibility', 'attention');
      tag.classList.remove('tag--success', 'tag--gray', 'tag--danger');
      tag.classList.add('tag--warning');
      tag.removeAttribute('title');
      tag.setAttribute('data-proj-tooltip', 'AFMD has records out of sync with QuickCart Market');
      tag.setAttribute('data-proj-tooltip-placement', 'bottom');
      tag.setAttribute('tabindex', '0');
      tag.innerHTML =
        '<lucide-icon name="exclamationmark.circle.fill" class="afmd-eligibility-tag__icon"></lucide-icon>' +
        'AFMD';
      return;
    }

    if (!anyStationSynced()) {
      tag.hidden = true;
      return;
    }
    tag.hidden = false;
    tag.setAttribute('data-afmd-eligibility', 'ready');
    tag.classList.remove('tag--gray', 'tag--danger', 'tag--warning');
    tag.classList.add('tag--success');
    tag.removeAttribute('title');
    tag.setAttribute('data-proj-tooltip', 'Project exists in AFMD + site configured + AFMD accessible');
    tag.setAttribute('data-proj-tooltip-placement', 'bottom');
    tag.setAttribute('tabindex', '0');
    tag.innerHTML =
      '<lucide-icon name="checkmark.circle.fill" class="afmd-eligibility-tag__icon"></lucide-icon>' +
      'AFMD';
  }

  function anyStationOutOfSync() {
    var lines = window.DetailData && window.DetailData.getLines ? window.DetailData.getLines() : [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var stations = line.stations || [];
      for (var j = 0; j < stations.length; j++) {
        var id = 'st-' + line.id + '-' + (j + 1);
        if (getState(id) !== STATES.IN_SYNC) return true;
      }
    }
    return false;
  }

  function anyStationSynced() {
    for (var id in stationStates) {
      if (Object.prototype.hasOwnProperty.call(stationStates, id) && stationStates[id] === STATES.IN_SYNC) {
        return true;
      }
    }
    return false;
  }

  /* Wire the "AFMD Sync" button in the page header — opens the confirmation
   * modal with every station in the program that has something to sync
   * (Not synced / Sync conflict / Out of sync / Unavailable). Skipped by
   * the modal's own filter logic if a station is already synced. */
  function collectAllStationIds() {
    var lines = window.DetailData && window.DetailData.getLines ? window.DetailData.getLines() : [];
    var out = [];
    lines.forEach(function(line) {
      (line.stations || []).forEach(function(_, i) {
        out.push('st-' + line.id + '-' + (i + 1));
      });
    });
    return out;
  }

  function bindHeaderSyncButton() {
    var btn = document.getElementById('afmd-sync-btn');
    if (!btn || btn._afmdBound) return;
    btn._afmdBound = true;
    /* EX03 / AFMD unavailable → Refresh is disabled since there's nothing to
     * check against. The eligibility tag already surfaces the reason. */
    if (!isAfmdAvailable()) {
      btn.disabled = true;
      btn.classList.add('afmd-refresh-link--disabled');
      btn.setAttribute('data-proj-tooltip', 'AFMD unavailable');
      btn.setAttribute('data-proj-tooltip-placement', 'bottom');
    }
    btn.addEventListener('click', function() {
      if (btn.disabled) return;
      runRefreshCheck();
    });
  }

  /* Refresh flow: paints a loading spinner into every AFMD cell (L1 aggregate
   * + every visible L2 per-station), waits a mock delay to represent the
   * round-trip to AFMD, then repaints so any state changes surface. When
   * AFMD itself is unreachable (EX03 mock), the wait ends in an error toast
   * instead of a repaint. */
  var refreshInFlight = false;
  function runRefreshCheck() {
    if (refreshInFlight) return;
    refreshInFlight = true;
    var btn = document.getElementById('afmd-sync-btn');
    if (btn) btn.classList.add('afmd-refresh-link--loading');
    paintAllLoading();
    setTimeout(function() {
      refreshInFlight = false;
      if (btn) btn.classList.remove('afmd-refresh-link--loading');
      paintAll();
      if (!isAfmdAvailable()) {
        showAfmdError(
          'Couldn’t connect to AFMD to check for updates.'
        );
      } else {
        showAfmdSuccess('AFMD refresh complete. Statuses are up to date.');
      }
    }, 1600);
  }

  var LOADING_HTML = '<span class="afmd-loading" aria-label="Checking AFMD"><lucide-icon name="arrow.triangle.2.circlepath"></lucide-icon></span>';

  function paintAllLoading() {
    document.querySelectorAll('#lines-table-body > .proj-nested-table__row--level1').forEach(function(lineRow) {
      var l1Cell = lineRow.querySelector('.proj-nested-table__col-afmd');
      if (l1Cell) l1Cell.innerHTML = LOADING_HTML;
      var detail = lineRow.nextElementSibling;
      if (!detail || !detail.classList.contains('proj-nested-table__detail-row')) return;
      detail.querySelectorAll('[data-station-id]').forEach(function(row) {
        var cell = row.querySelector('.l2__col-afmd');
        if (cell) cell.innerHTML = LOADING_HTML;
      });
    });
  }

  /* Refresh the out-of-sync counter shown as a badge in the top-right corner
   * of the AFMD header button. Hidden when everything is in sync so the
   * button stays clean when there's nothing to do. */
  function updateHeaderSyncCount() {
    var countEl = document.getElementById('afmd-sync-btn-count');
    if (!countEl) return;
    if (!isAfmdAvailable()) { countEl.hidden = true; countEl.textContent = ''; return; }
    var ids = collectAllStationIds();
    var n = 0;
    ids.forEach(function(id) { if (getState(id) !== STATES.IN_SYNC) n++; });
    if (n === 0) { countEl.hidden = true; countEl.textContent = ''; return; }
    countEl.hidden = false;
    countEl.textContent = n > 99 ? '99+' : String(n);
  }

  /* Wizard flow for the header AFMD Sync button:
   *   step 1 — open modal in 'checking' mode with a spinner (mock delay)
   *   step 2 — decide what to show:
   *              • nothing to sync  → 'empty' mode
   *              • something to sync → open confirmation modal populated */
  function startSyncWizard(ids) {
    var m = ensureConfirmationModal();
    setModalMode('checking');
    m.classList.add('modal-overlay--open');
    setTimeout(function() {
      /* Modal may have been closed by the user before the timeout fires — bail. */
      if (!m.classList.contains('modal-overlay--open')) return;
      var toSync = ids.filter(function(id) {
        var s = getState(id);
        return s === STATES.NOT_SYNCED || s === STATES.UNAVAILABLE;
      });
      if (!toSync.length) {
        setModalMode('empty');
      } else {
        /* openConfirmation resets modal mode to 'confirm', populates the list,
         * and reuses the currently-open overlay. */
        openConfirmation(ids);
      }
    }, 1500);
  }

  /* React to ProjStationSettingsDrawer save events. Persists the new station
   * name into DetailData (source of truth for stationLabel and the duplicate
   * check) and updates the visible L2 row so the header text matches without
   * a full LinesTable re-render — expanded rows stay expanded. Once the name
   * is unique, hasDuplicateNameInLine returns false and the next click on
   * the Not synced badge routes to the normal confirmation modal. */
  function bindStationSettingsSaveListener() {
    if (document._afmdStationSaveBound) return;
    document._afmdStationSaveBound = true;
    document.addEventListener('davinci:station-settings:save', function(e) {
      var detail = e.detail || {};
      var stationId = detail.stationId;
      var newName = (detail.stationName || '').trim();
      if (!stationId || !newName) return;

      var m = /^st-(\d+)-(\d+)$/.exec(stationId);
      if (!m) return;
      var line = findLineData(m[1]);
      if (!line || !line.stations) return;
      var idx = Number(m[2]) - 1;
      var station = line.stations[idx];
      if (!station) return;

      /* Mutate the source data — same object reference exposed via getLines. */
      station.name = newName;

      /* Update the visible L2 row's station name so the UI reflects the edit. */
      var row = document.querySelector('[data-station-id="' + stationId + '"]');
      var nameEl = row ? row.querySelector('.l2__station-name') : null;
      if (nameEl) nameEl.textContent = newName;
    });
  }

  /* ============================================================
   * EX04 demo: checkbox-based bulk sync at line (L1) + station (L2)
   * level. Coexists with the existing Shift+click selection — both
   * write to the same `.afmd-row--selected` class and reuse the same
   * per-line actions bar / Sync button. Only visible when the current
   * program is EX04 (URL `?code=EX04`); other programs render nothing
   * because the checkboxes are hidden via CSS.
   * ============================================================ */
  var H88_PROGRAMS = ['EX04'];

  function isH88Mode() {
    return H88_PROGRAMS.indexOf(currentProgramCode()) !== -1;
  }

  function applyH88Mode() {
    var page = document.querySelector('.program-detail-page');
    if (!page) return;
    page.classList.toggle('program-detail-page--h88', isH88Mode());
  }

  /* Master "select all lines" checkbox tri-state — mirrors the mix of
   * individual line checkboxes in the same table. Scoped to the whole
   * table (not the first tbody) because the global actions-bar tbody now
   * sits between thead and data. Indeterminate lines (line checkbox partially
   * populated because only some of its stations are selected) count as
   * "partial", so the master surfaces the mixed state even when no full
   * line is checked. */
  function updateAllLinesCheckboxState(scope) {
    document.querySelectorAll('.afmd-h88-all-checkbox').forEach(function(allCbx) {
      var table = allCbx.closest('table');
      var lineCbxs = (table || document).querySelectorAll('.afmd-h88-line-checkbox');
      if (!lineCbxs.length) { allCbx.checked = false; allCbx.indeterminate = false; return; }
      var fullyChecked = 0;
      var partial = 0;
      lineCbxs.forEach(function(c) {
        if (c.checked) fullyChecked++;
        else if (c.indeterminate) partial++;
      });
      allCbx.checked = fullyChecked === lineCbxs.length;
      allCbx.indeterminate = !allCbx.checked && (fullyChecked > 0 || partial > 0);
    });
  }

  /* Collect every selected station id across all expanded L2 sub-tables. */
  function allSelectedStationIds() {
    var ids = [];
    document.querySelectorAll('.proj-nested-table__row--level2.afmd-row--selected').forEach(function(row) {
      var id = row.getAttribute('data-station-id');
      if (id) ids.push(id);
    });
    return ids;
  }

  /* EX04 global bar sits between the L1 thead and body. Aggregates every
   * L2 selection in the current PF table (PF1 flat or PF2 grouped, each
   * has its own bar rendered in the template). */
  function refreshGlobalActionsBar() {
    document.querySelectorAll('.afmd-actions-tbody--global').forEach(function(tbody) {
      var table = tbody.closest('table');
      var body = table ? table.querySelector('.table__body:not(.afmd-actions-tbody)') : null;
      /* Scope to detail rows within THIS table so PF1 + PF2 don't share counts. */
      var selected = body
        ? body.querySelectorAll('.proj-nested-table__row--level2.afmd-row--selected')
        : [];
      var n = selected.length;
      tbody.hidden = n === 0;
      var countEl = tbody.querySelector('.afmd-selected-count-global');
      if (countEl) countEl.textContent = n + (n === 1 ? ' workstation selected:' : ' workstations selected:');
      var syncBtn = tbody.querySelector('.afmd-actions-sync-global');
      if (syncBtn) {
        /* Enable Sync only if at least one selected station is in a syncable state. */
        var eligible = false;
        selected.forEach(function(row) {
          var s = getState(row.getAttribute('data-station-id'));
          if (s === STATES.NOT_SYNCED || s === STATES.OUT_OF_SYNC || s === STATES.UNAVAILABLE) eligible = true;
        });
        syncBtn.disabled = !eligible;
      }
    });
  }

  function bindGlobalSyncButton() {
    if (document._afmdGlobalSyncBound) return;
    document._afmdGlobalSyncBound = true;
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.afmd-actions-sync-global');
      if (!btn) return;
      var ids = allSelectedStationIds();
      if (!ids.length) return;
      openConfirmation(ids);
      /* Clear selection so the bar reads clean once the modal closes. */
      document.querySelectorAll('.proj-nested-table__row--level2.afmd-row--selected').forEach(function(r) {
        r.classList.remove('afmd-row--selected');
      });
      document.querySelectorAll('.afmd-h88-station-checkbox:checked').forEach(function(c) { c.checked = false; });
      document.querySelectorAll('.afmd-h88-line-checkbox').forEach(function(c) { c.checked = false; c.indeterminate = false; });
      document.querySelectorAll('.afmd-h88-all-checkbox').forEach(function(c) { c.checked = false; c.indeterminate = false; });
      /* Repaint every per-line action bar + the global. */
      document.querySelectorAll('.l2__table').forEach(refreshL2Actions);
      refreshGlobalActionsBar();
    });
  }

  /* Line-level checkbox reflects the state of its stations:
   *   0 checked → unchecked
   *   all checked → checked
   *   partial → indeterminate
   * When the line is collapsed, the L2 sub-table doesn't exist yet, so
   * we can't compute — keep whatever state the L1 checkbox already has
   * (typically what the user last set explicitly). */
  function updateLineCheckboxState(lineRow) {
    if (!lineRow) return;
    var lineCbx = lineRow.querySelector('.afmd-h88-line-checkbox');
    if (!lineCbx) return;
    var detail = lineRow.nextElementSibling;
    if (!detail || !detail.classList.contains('proj-nested-table__detail-row')) return;
    var stationCbxs = detail.querySelectorAll('.afmd-h88-station-checkbox');
    if (!stationCbxs.length) return;
    var total = stationCbxs.length;
    var checked = detail.querySelectorAll('.afmd-h88-station-checkbox:checked').length;
    lineCbx.checked = checked === total;
    lineCbx.indeterminate = checked > 0 && checked < total;
  }

  function bindH88Checkboxes() {
    if (document._afmdH88Bound) return;
    document._afmdH88Bound = true;

    /* Native behavior: clicking an `indeterminate` checkbox transitions it
     * to CHECKED — so a user who partially selected a line's stations,
     * then clicked the line's tri-state box, would end up selecting the
     * entire line instead of clearing it. Override: on click, if the box
     * is currently indeterminate OR checked, force it to unchecked and
     * fire a change event so the cascade path runs the "deselect all"
     * branch. Applied to both the master and the individual line
     * checkboxes so the second click always means "clear my selection". */
    document.addEventListener('click', function(e) {
      var cbx = e.target.closest('.afmd-h88-all-checkbox, .afmd-h88-line-checkbox');
      if (!cbx) return;
      if (cbx.indeterminate) {
        e.preventDefault();
        cbx.indeterminate = false;
        cbx.checked = false;
        cbx.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, true);

    document.addEventListener('change', function(e) {
      var allCbx = e.target.closest('.afmd-h88-all-checkbox');
      if (allCbx) {
        /* Cascade to every visible line checkbox in the same table.
         * (Query the table directly — not the first tbody — because the L1
         * table now has an extra `.afmd-actions-tbody--global` sitting
         * before the data tbody. Reuse the L1 change path via a dispatched
         * event so each line auto-expands + propagates to its L2 stations. */
        var table = allCbx.closest('table');
        var scope = table || document;
        var lineCbxs = scope.querySelectorAll('.afmd-h88-line-checkbox');
        lineCbxs.forEach(function(cbx) {
          if (cbx.checked !== allCbx.checked) {
            cbx.checked = allCbx.checked;
            cbx.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        allCbx.indeterminate = false;
        refreshGlobalActionsBar();
        return;
      }

      var stationCbx = e.target.closest('.afmd-h88-station-checkbox');
      if (stationCbx) {
        var row = stationCbx.closest('.proj-nested-table__row--level2');
        if (!row) return;
        row.classList.toggle('afmd-row--selected', stationCbx.checked);
        var l2Table = row.closest('.l2__table');
        if (l2Table) refreshL2Actions(l2Table);
        var detail = row.closest('.proj-nested-table__detail-row');
        var lineRow = detail ? detail.previousElementSibling : null;
        updateLineCheckboxState(lineRow);
        updateAllLinesCheckboxState();
        refreshGlobalActionsBar();
        return;
      }

      var lineCbx = e.target.closest('.afmd-h88-line-checkbox');
      if (lineCbx) {
        var lRow = lineCbx.closest('.proj-nested-table__row--level1');
        if (!lRow) return;
        /* Ensure the line is expanded so the L2 checkboxes exist. Clicking
         * the expand button routes through proj-nested-table's toggleExpand
         * (synchronous), so the L2 sub-table is present immediately after. */
        var expanded = lRow.getAttribute('data-expanded') === 'true';
        if (!expanded && lineCbx.checked) {
          var btn = lRow.querySelector('.proj-nested-table__expand-btn');
          if (btn) btn.click();
        }
        var lDetail = lRow.nextElementSibling;
        if (!lDetail || !lDetail.classList.contains('proj-nested-table__detail-row')) return;
        var lTable = lDetail.querySelector('.l2__table');
        lDetail.querySelectorAll('.afmd-h88-station-checkbox').forEach(function(cbx) {
          cbx.checked = lineCbx.checked;
          var sRow = cbx.closest('.proj-nested-table__row--level2');
          if (sRow) sRow.classList.toggle('afmd-row--selected', lineCbx.checked);
        });
        /* Clear any partial state since we just forced all-or-nothing. */
        lineCbx.indeterminate = false;
        if (lTable) refreshL2Actions(lTable);
        /* Individual line toggle → update the master "select all" tri-state. */
        updateAllLinesCheckboxState();
        refreshGlobalActionsBar();
        return;
      }
    });

    /* Shift+click also mutates .afmd-row--selected. Mirror it into the L2
     * checkbox and refresh the parent line's tri-state. */
    document.addEventListener('click', function(e) {
      if (!e.shiftKey) return;
      var row = e.target.closest('.proj-nested-table__row--level2');
      if (!row) return;
      /* Run after the existing Shift+click handler in wireL2Table has
       * already toggled the class. */
      setTimeout(function() {
        var cbx = row.querySelector('.afmd-h88-station-checkbox');
        var selected = row.classList.contains('afmd-row--selected');
        if (cbx) cbx.checked = selected;
        var detail = row.closest('.proj-nested-table__detail-row');
        var lineRow = detail ? detail.previousElementSibling : null;
        updateLineCheckboxState(lineRow);
        updateAllLinesCheckboxState();
        refreshGlobalActionsBar();
      }, 0);
    });
  }

  window.AfmdSync = {
    STATES: STATES,
    init: function() {
      applyEligibilityMock();
      applyH88Mode();
      bindCtaDelegation();
      bindRepaintHook();
      bindHeaderSyncButton();
      bindStationSettingsSaveListener();
      bindH88Checkboxes();
      bindGlobalSyncButton();
      paintAll();
      wireAllExistingL2();
      /* Re-evaluate the eligibility tag after paintAll has populated
       * stationStates — we need it to know whether any station is In sync
       * so the tag can decide whether to render "AFMD connected". */
      applyEligibilityMock();
      /* Seed the header button counter now that stationStates is populated. */
      updateHeaderSyncCount();
    },
    /* Called by test tools / other modules if they want to force-paint. */
    repaint: paintAll,
    /* Programmatic entry points for future integration. */
    getState: getState,
    setState: setState,
    isAfmdAvailable: isAfmdAvailable
  };
})();
