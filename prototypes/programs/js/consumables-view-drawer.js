/**
 * Consumables View Settings Drawer
 * Handles open/close + visibility toggle + reset for the consumables column-config drawer.
 * Toggling the eye icon hides/shows the matching column in the full consumables table.
 */

(function() {
  'use strict';

  // Maps drawer item data-column → column position (1-based) in .table--consumables.
  // Station Name (1) and Application name (2) are locked and not in the map.
  var COLUMN_INDEX = {
    'consumable-name': 3,
    'vendor': 4,
    'vendor-pn': 5,
    'eng-intent': 6,
    'mp-intent': 7,
    'consumable-type': 8,
    'category': 9,
    'subcategory': 10,
    'item-description': 11,
    'apple-pn': 12,
    'cm-pn': 13,
    'package': 14,
    'package-uom': 15,
    'package-description': 16,
    'package-cost': 17,
    'purchase-pack': 18,
    'unit-of-measure': 19,
    'cost-per-uom': 20,
    'safety-data-sheet': 21,
    'technical-data-sheet': 22,
    'installed-image': 23,
    'usage-test-points': 24,
    'retest-rate': 25,
    'lifecycle': 26,
    'effective-usage': 27,
    'tested-rate': 28,
    'build-duration': 29,
    'buffer': 30,
    'engineering-daily-usage': 31,
    'eng-order-qty': 32
  };

  function setColumnVisibility(key, visible) {
    var index = COLUMN_INDEX[key];
    if (!index) return;
    var headerRow = document.querySelector('.table--consumables thead tr');
    var body = document.getElementById('consumables-table-body');
    var display = visible ? '' : 'none';
    if (headerRow) {
      var th = headerRow.children[index - 1];
      if (th) th.style.display = display;
    }
    if (body) {
      body.querySelectorAll('tr').forEach(function(row) {
        var cell = row.children[index - 1];
        if (cell) cell.style.display = display;
      });
    }
  }

  window.ConsumablesViewDrawer = {
    init: function() {
      var openBtn = document.getElementById('cons-view-settings-btn');
      var overlay = document.getElementById('cons-view-drawer');
      var closeBtn = document.getElementById('cons-view-drawer-close');
      var cancelBtn = document.getElementById('cons-view-drawer-cancel');
      var saveBtn = document.getElementById('cons-view-drawer-save');
      var resetLink = document.getElementById('cons-view-drawer-reset');
      var list = document.getElementById('cons-view-drawer-list');

      if (!openBtn || !overlay) return;

      function open() {
        overlay.classList.add('drawer-overlay--open');
      }

      function close() {
        overlay.classList.remove('drawer-overlay--open');
      }

      openBtn.addEventListener('click', open);
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

      if (list) {
        list.addEventListener('click', function(e) {
          var btn = e.target.closest('.cons-view-drawer__toggle');
          if (!btn) return;
          var item = btn.closest('.cons-view-drawer__item');
          var key = item && item.dataset.column;
          var nextVisible = !btn.classList.contains('is-visible');
          btn.classList.toggle('is-visible', nextVisible);
          if (key) setColumnVisibility(key, nextVisible);
        });
      }

      if (resetLink) {
        resetLink.addEventListener('click', function(e) {
          e.preventDefault();
          if (!list) return;
          list.querySelectorAll('.cons-view-drawer__item').forEach(function(item) {
            var btn = item.querySelector('.cons-view-drawer__toggle');
            var key = item.dataset.column;
            if (btn) btn.classList.add('is-visible');
            if (key) setColumnVisibility(key, true);
          });
        });
      }
    }
  };
})();
