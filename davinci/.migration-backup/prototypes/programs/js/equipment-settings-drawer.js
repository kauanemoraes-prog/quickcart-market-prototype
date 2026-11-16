/**
 * Equipment Settings Drawer
 * Opens when "Edit equipment settings" is clicked in the equip-restore-menu popover.
 * Lets the user pick a preset (synced with the toolbar preset buttons).
 */

(function() {
  'use strict';

  // Map preset-card key → toolbar button id (for syncing)
  var CARD_TO_PRESET = {
    'custom': null,
    'engineering-specs': 'equip-preset-btn',
    'readiness': 'equip-preset-readiness-btn'
  };

  // Equipment - List columns in table order. First two are locked (sticky columns).
  var EQUIPMENT_COLUMNS = [
    { name: 'Equipment name', locked: true },
    { name: 'Equipment short name', locked: true },
    { name: 'Vendor DFM Statuses' },
    { name: 'Process Flow Usage' },
    { name: 'Department' },
    { name: 'Equipment category' },
    { name: 'ENG Intent' },
    { name: 'MP Intent' },
    { name: 'Line Side' },
    { name: 'Engineering quantity' },
    { name: 'Required Equip. In-hand Date' },
    { name: 'Equipment DRI' },
    { name: 'PD DRI' },
    { name: 'CM DRI' },
    { name: 'Unique attributes' },
    { name: 'Equip. description' },
    { name: 'Equipment process' },
    { name: 'OPL Adjustment' },
    { name: 'OPL' },
    { name: 'Priority rating' },
    { name: 'Complexity rating' },
    { name: 'Cost rating' },
    { name: 'MP Cost Estimate' },
    { name: 'Purchase type' },
    { name: 'Revisions' },
    { name: 'Notes' },
    { name: 'Validation Required' },
    { name: 'Validation Type' },
    { name: 'Weight (kg)' },
    { name: 'Workspace Size (X, Y, Z)' },
    { name: 'Concept Review' },
    { name: 'RFP Link' },
    { name: 'Inline Part ID' },
    { name: 'RFP Status' },
    { name: 'RFP Release Date' },
    { name: 'Line Name' },
    { name: 'Station Name' },
    { name: 'Equipment Usage Multiplier' },
    { name: 'Eq. Usage Connected to Reporting' },
    { name: 'Reporting Method' },
    { name: 'Reporting Mapping' },
    { name: 'XUP' },
    { name: 'Man to Station Ratio' },
    { name: 'Handling CT' },
    { name: 'Machine CT' },
    { name: 'Cycle Time (CT)' },
    { name: 'Cal + Audit' },
    { name: 'Retest Rate' },
    { name: 'Down time (Planned)' },
    { name: 'Down time (Unplanned)' },
    { name: 'Yield Fallout' },
    { name: 'Testing' },
    { name: 'Tooling' }
  ];

  function setColumnVisibility(index, visible) {
    var headerRow = document.querySelector('.table--equipment thead tr');
    var body = document.getElementById('equipment-table-body');
    var display = visible ? '' : 'none';
    if (headerRow) {
      var th = headerRow.children[index - 1];
      if (th) th.style.display = display;
    }
    if (body) {
      body.querySelectorAll('tr.table__row').forEach(function(row) {
        if (row.classList.contains('table__row--actions-bar') || row.classList.contains('table__row--equip-expanded')) return;
        var cell = row.children[index - 1];
        if (cell) cell.style.display = display;
      });
    }
  }

  function buildColumnList() {
    return EQUIPMENT_COLUMNS.map(function(col, idx) {
      var pos = idx + 1;
      if (col.locked) {
        return '<li class="equip-settings__col-item equip-settings__col-item--locked"><span class="equip-settings__col-label">' + col.name + '</span></li>';
      }
      return '<li class="equip-settings__col-item" data-column-index="' + pos + '">' +
        '<span class="equip-settings__col-label">' + col.name + '</span>' +
        '<div class="equip-settings__col-controls">' +
          '<button class="equip-settings__col-toggle is-visible" type="button" aria-label="Toggle visibility">' +
            '<img src="../../davinci/assets/icons/regular/eye-fill.svg" alt="" class="equip-settings__col-eye-on">' +
            '<img src="../../davinci/assets/icons/regular/eye-slash.svg" alt="" class="equip-settings__col-eye-off">' +
          '</button>' +
          '<span class="equip-settings__col-drag" aria-label="Drag to reorder"></span>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function updateGroupCount() {
    var headerRow = document.querySelector('.table--equipment thead tr');
    if (!headerRow) return;
    var hidden = 0;
    for (var i = 0; i < EQUIPMENT_COLUMNS.length; i++) {
      var th = headerRow.children[i];
      if (th && th.style.display === 'none') hidden++;
    }
    var counter = document.querySelector('[data-group-count="equipment"]');
    if (counter) counter.textContent = hidden + '/' + EQUIPMENT_COLUMNS.length;
  }

  window.EquipmentSettingsDrawer = {
    init: function() {
      var overlay = document.getElementById('equip-settings-drawer');
      var closeBtn = document.getElementById('equip-settings-drawer-close');
      var cancelBtn = document.getElementById('equip-settings-drawer-cancel');
      var saveBtn = document.getElementById('equip-settings-drawer-save');
      var presetsContainer = document.getElementById('equip-settings-presets');
      var equipmentList = document.getElementById('equip-settings-equipment-cols');

      if (!overlay) return;

      // Save changes button starts disabled and is enabled only when the user
      // does something inside the drawer. Reopening the drawer resets state.
      function markDirty() {
        if (saveBtn) saveBtn.disabled = false;
      }
      function resetDirty() {
        if (saveBtn) saveBtn.disabled = true;
      }

      // Populate the Equipment column list
      if (equipmentList && !equipmentList.dataset.populated) {
        equipmentList.innerHTML = buildColumnList();
        equipmentList.dataset.populated = '1';
      }

      function open() {
        syncSelectedPreset();
        updateGroupCount();
        resetDirty();
        overlay.classList.add('drawer-overlay--open');
        overlay.setAttribute('aria-hidden', 'false');
      }

      function close() {
        overlay.classList.remove('drawer-overlay--open');
        overlay.setAttribute('aria-hidden', 'true');
      }

      function syncSelectedPreset() {
        if (!presetsContainer) return;
        var activeKey = 'custom';
        var engBtn = document.getElementById('equip-preset-btn');
        var readinessBtn = document.getElementById('equip-preset-readiness-btn');
        if (engBtn && engBtn.classList.contains('is-active')) activeKey = 'engineering-specs';
        else if (readinessBtn && readinessBtn.classList.contains('is-active')) activeKey = 'readiness';

        presetsContainer.querySelectorAll('.equip-preset-card').forEach(function(card) {
          card.classList.toggle('is-selected', card.dataset.presetCard === activeKey);
        });
      }

      // Wire "Edit equipment settings" item from the restore menu.
      // Attach directly on the item because the popover's own handler calls
      // stopPropagation, preventing bubble to the menu container.
      var settingsItem = document.querySelector('#equip-restore-menu [data-action="settings"]');
      if (settingsItem) {
        settingsItem.addEventListener('click', function() {
          open();
        });
      }

      if (closeBtn) closeBtn.addEventListener('click', close);
      if (cancelBtn) cancelBtn.addEventListener('click', close);
      if (saveBtn) saveBtn.addEventListener('click', close);

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) close();
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('drawer-overlay--open')) {
          close();
        }
      });

      // Any interaction inside the drawer body enables Save changes. Wildcard
      // listener so we don't have to sprinkle markDirty across every specific
      // handler (preset cards, column toggles, reset links, grayscale switch,
      // group expand chevrons, etc.).
      var drawerBody = overlay.querySelector('.drawer__body');
      if (drawerBody) {
        drawerBody.addEventListener('click', function(e) {
          // Expand chevrons are cosmetic navigation, don't count as "changed
          // something", so skip them.
          if (e.target.closest('.equip-settings__group-toggle')) return;
          markDirty();
        });
        drawerBody.addEventListener('change', markDirty);
      }
      if (presetsContainer) {
        presetsContainer.addEventListener('click', function(e) {
          var card = e.target.closest('.equip-preset-card');
          if (!card) return;
          var key = card.dataset.presetCard;
          var btnId = CARD_TO_PRESET[key];

          // Update visual selection in drawer
          presetsContainer.querySelectorAll('.equip-preset-card').forEach(function(c) {
            c.classList.remove('is-selected');
          });
          card.classList.add('is-selected');

          // Drive the actual preset by clicking the matching toolbar button
          var engBtn = document.getElementById('equip-preset-btn');
          var readinessBtn = document.getElementById('equip-preset-readiness-btn');
          if (key === 'custom') {
            // Deactivate any active preset
            if (engBtn && engBtn.classList.contains('is-active')) engBtn.click();
            if (readinessBtn && readinessBtn.classList.contains('is-active')) readinessBtn.click();
          } else if (btnId) {
            var btn = document.getElementById(btnId);
            if (btn && !btn.classList.contains('is-active')) btn.click();
          }
        });
      }

      // Group toggles (collapse chevron + reveal column list)
      overlay.querySelectorAll('.equip-settings__group-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function() {
          var isOpen = toggle.classList.toggle('is-open');
          var targetId = toggle.dataset.target;
          if (targetId === 'equipment' && equipmentList) {
            if (isOpen) equipmentList.removeAttribute('hidden');
            else equipmentList.setAttribute('hidden', '');
          }
        });
      });

      // Eye toggle on individual columns → hide/show in the equipment table
      if (equipmentList) {
        equipmentList.addEventListener('click', function(e) {
          var btn = e.target.closest('.equip-settings__col-toggle');
          if (!btn) return;
          var item = btn.closest('.equip-settings__col-item');
          var idx = parseInt(item.dataset.columnIndex, 10);
          if (!idx) return;
          var nextVisible = !btn.classList.contains('is-visible');
          btn.classList.toggle('is-visible', nextVisible);
          setColumnVisibility(idx, nextVisible);
          updateGroupCount();
        });
      }

      // Reset: show all toggleable columns
      overlay.querySelectorAll('.equip-settings__reset-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          if (link.dataset.resetTarget === 'equipment' && equipmentList) {
            equipmentList.querySelectorAll('.equip-settings__col-item[data-column-index]').forEach(function(item) {
              var btn = item.querySelector('.equip-settings__col-toggle');
              var idx = parseInt(item.dataset.columnIndex, 10);
              if (btn) btn.classList.add('is-visible');
              if (idx) setColumnVisibility(idx, true);
            });
            updateGroupCount();
          }
        });
      });
    }
  };
})();
