/**
 * Consumables Table Module
 * Handles consumables table rendering and view switching
 */

(function() {
  'use strict';

  // Standard column headers (after the 2 sticky leading cells: Station Name + Application name).
  // `sortable` adds the sort indicator; `hasInfo` adds the info-icon SVG.
  // `fieldId` maps the column to its filter chip identifier (cons-filter.js
  // COL_MAP) so the header shortcut and per-column highlight can find it.
  const consumablesColumns = [
    { fieldId: 'cs-name',                 label: 'Material name', sortable: true, hasInfo: true },
    { fieldId: 'cs-vendor',               label: 'Vendor', hasInfo: true },
    { fieldId: 'cs-vendor-pn',            label: 'Vendor PN', sortable: true, hasInfo: true },
    { fieldId: 'cs-eng-intent',           label: 'ENG intent', sortable: true },
    { fieldId: 'cs-mp-intent',            label: 'MP Intent', sortable: true },
    { fieldId: 'cs-type',                 label: 'Material type', sortable: true, hasInfo: true },
    { fieldId: 'cs-category',             label: 'Category', sortable: true, hasInfo: true },
    { fieldId: 'cs-subcategory',          label: 'Subcategory', sortable: true, hasInfo: true },
    { fieldId: 'cs-item-description',     label: 'Item description' },
    { fieldId: 'cs-apple-pn',             label: 'Internal PN', sortable: true, hasInfo: true },
    { fieldId: 'cs-cm-pn',                label: 'CM PN', sortable: true, hasInfo: true },
    { fieldId: 'cs-package',              label: 'Package', sortable: true },
    { fieldId: 'cs-package-uom',          label: 'Package UOM', sortable: true },
    { fieldId: 'cs-package-description',  label: 'Package description', sortable: true },
    { fieldId: 'cs-package-cost',         label: 'Package cost', sortable: true },
    { fieldId: 'cs-purchase-pack',        label: 'Purchase pack', sortable: true },
    { fieldId: 'cs-uom',                  label: 'Unit of measure (UOM)', sortable: true },
    { fieldId: 'cs-cost-per-uom',         label: 'Cost per UOM', sortable: true },
    { fieldId: 'cs-safety-data-sheet',    label: 'Safety data sheet', sortable: true, hasInfo: true },
    { fieldId: 'cs-technical-data-sheet', label: 'Technical data sheet', sortable: true, hasInfo: true },
    { fieldId: 'cs-installed-image',      label: 'Installed/applied image', hasInfo: true },
    { fieldId: 'cs-usage-test-points',    label: 'Usage/test points per unit', sortable: true, hasInfo: true },
    { fieldId: 'cs-retest-rate',          label: 'Retest rate or waste assumption', sortable: true, hasInfo: true },
    { fieldId: 'cs-lifecycle',            label: 'Lifecycle', sortable: true, hasInfo: true },
    { fieldId: 'cs-effective-usage',      label: 'Effective usage per unit', sortable: true, hasInfo: true },
    { fieldId: 'cs-tested-rate',          label: 'Tested rate', sortable: true },
    { fieldId: 'cs-build-duration',       label: 'Build duration', sortable: true, hasInfo: true },
    { fieldId: 'cs-buffer',               label: 'Buffer', sortable: true, hasInfo: true },
    { fieldId: 'cs-eng-daily-usage',      label: 'Engineering daily usage', sortable: true, hasInfo: true },
    { fieldId: 'cs-eng-order-qty',        label: 'Eng. order qty (Calculated)', hasInfo: true }
  ];

  function renderHeaders() {
    const row = document.getElementById('consumables-header-row');
    const tplEl = document.getElementById('consumables-headers-template');
    if (!row || !tplEl || typeof Handlebars === 'undefined') return;
    // Drop any previously-rendered standard headers; the first two sticky <th>s stay.
    while (row.children.length > 2) row.removeChild(row.lastChild);
    const tpl = Handlebars.compile(tplEl.innerHTML);
    const holder = document.createElement('template');
    holder.innerHTML = tpl({ columns: consumablesColumns }).trim();
    Array.prototype.forEach.call(holder.content.children, function(node) {
      row.appendChild(node);
    });
    injectSortIndicators();
  }

  /* MDS sort-indicator inner markup — same as equipment-table.js. Runs after
   * renderHeaders() so every `<span class="sort-indicator" data-mds-sort>`
   * placeholder gets the caret-up + caret-down SVGs. Idempotent. */
  const SORT_INDICATOR_INNER =
    '<span class="sort-indicator__inner" aria-hidden="true">' +
      '<span role="img" aria-label="caret-up" class="sort-indicator__icon sort-indicator__up">' +
        '<lucide-icon name="chevron-up"></lucide-icon>' +
      '</span>' +
      '<span role="img" aria-label="caret-down" class="sort-indicator__icon sort-indicator__down">' +
        '<lucide-icon name="chevron-down"></lucide-icon>' +
      '</span>' +
    '</span>';

  function injectSortIndicators() {
    const slots = document.querySelectorAll('#materials .table--consumables [data-mds-sort]');
    slots.forEach(function(slot) {
      if (slot.childElementCount > 0) return;
      slot.innerHTML = SORT_INDICATOR_INNER;
    });
  }

  window.ConsumablesTable = {
    /**
     * Initialize consumables table functionality
     */
    init: function() {
      if (window.DeleteModal) {
        window.DeleteModal.render({
          modalId: 'cons-delete-modal',
          closeId: 'cons-delete-close',
          cancelId: 'cons-delete-cancel',
          confirmId: 'cons-delete-confirm',
          warningClass: 'cons-delete-warning',
          bodyParagraphs: [
            'The selected material is being used and cannot be deleted.',
            'When confirming, only materials without active usage can be deleted.'
          ]
        });
      }
      renderHeaders();
      this.render();
      this.setupViewToggle();
      this.setupSelection();
      this.setupAddRow();
    },

    /**
     * Render consumables table (full view)
     */
    render: function() {
      const tableBody = document.getElementById('consumables-table-body');
      if (!tableBody) return;

      tableBody.innerHTML = '';

      // MP without a target Build Event: render empty body (header only).
      // Once a target is assigned, MP mirrors the target's data.
      if (window.BuildStages
        && window.BuildStages.getCurrentBuild() === 'Dismantling'
        && !window.BuildStages.getMpTarget()) return;

      const consumablesData = window.DetailData.getConsumables();

      consumablesData.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'table__row';

        row.innerHTML = `
          <td class="table__cell table__cell--cons-name table__cell--sticky-station"><input type="checkbox" class="cons-checkbox"><input type="text" class="form-input form-input--table-cell" value="${item.stationName}"></td>
          <td class="table__cell table__cell--sticky-application"><input type="text" class="form-input form-input--table-cell" value="${item.applicationName}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.consumableName}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.vendor}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.vendorPN}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.engIntent}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.mpIntent}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.consumableType}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.category}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.subcategory}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.itemDescription}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.applePN}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.cmPN}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.package}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.packageUOM}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.packageDescription}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.packageCost}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.purchasePack}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.unitOfMeasure}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.costPerUOM}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.safetyDataSheet}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.technicalDataSheet}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.installedImage}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.usageTestPoints}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.retestRate}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.lifecycle}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.effectiveUsage}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.testedRate}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.buildDuration}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.buffer}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.engineeringDailyUsage}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.engOrderQty}"></td>
        `;

        tableBody.appendChild(row);
      });
      // Reapply active filter chips against the freshly rendered rows so cell
      // hits, row highlights, and hidden rows survive build-stage / view
      // switches. No-op if the filter isn't loaded yet.
      if (window.ConsFilter && typeof window.ConsFilter.reapply === 'function') {
        window.ConsFilter.reapply();
      }
    },

    /**
     * Render simplified consumables table
     */
    renderSimple: function() {
      const tableBody = document.getElementById('consumables-simple-table-body');
      if (!tableBody) return;

      tableBody.innerHTML = '';

      const consumablesData = window.DetailData.getConsumables();

      consumablesData.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'table__row';

        row.innerHTML = `
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.consumableName}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.itemDescription}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.inHandDate}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.consumableType}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.category}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.subcategory}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.vendor}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.vendorPN}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.applePN}"></td>
          <td class="table__cell"><input type="text" class="form-input form-input--table-cell" value="${item.cmPN}"></td>
        `;

        tableBody.appendChild(row);
      });
    },

    /**
     * Wire the "+" button (column header) to insert a new empty consumable row
     * at the top of the full-view table and focus the first editable cell.
     */
    setupAddRow: function() {
      const addBtn = document.getElementById('cons-add-row-btn');
      const tableBody = document.getElementById('consumables-table-body');
      if (!addBtn || !tableBody) return;

      addBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const row = document.createElement('tr');
        row.className = 'table__row table__row--new';

        // 32 columns matching the full consumables view (.render())
        const cells = [
          '<td class="table__cell table__cell--cons-name table__cell--sticky-station"><input type="checkbox" class="cons-checkbox"><input type="text" class="form-input form-input--table-cell" placeholder="Workstation name"></td>',
          '<td class="table__cell table__cell--sticky-application"><input type="text" class="form-input form-input--table-cell" placeholder="Application name"></td>'
        ];
        for (let i = 0; i < 30; i++) {
          cells.push('<td class="table__cell"><input type="text" class="form-input form-input--table-cell" value=""></td>');
        }
        row.innerHTML = cells.join('');

        tableBody.insertBefore(row, tableBody.firstChild);
        const firstInput = row.querySelector('input.form-input--table-cell');
        if (firstInput) firstInput.focus();
      });
    },

    /**
     * Setup view toggle functionality
     */
    setupViewToggle: function() {
      const toggle = document.getElementById('consumables-view-toggle');
      const fullView = document.getElementById('consumables-full-view');
      const simpleView = document.getElementById('consumables-simple-view');

      if (!toggle || !fullView || !simpleView) return;

      toggle.addEventListener('change', () => {
        if (toggle.checked) {
          // Show simple view
          fullView.style.display = 'none';
          simpleView.style.display = 'block';
          this.renderSimple();
        } else {
          // Show full view
          fullView.style.display = 'block';
          simpleView.style.display = 'none';
        }
      });

      // Initialize simple view data
      this.renderSimple();
    },

    /**
     * Setup row selection (checkbox select-all, actions bar, delete, duplicate)
     */
    setupSelection: function() {
      const tableBody = document.getElementById('consumables-table-body');
      const selectAllCb = document.getElementById('cons-select-all');
      const actionsBar = document.getElementById('cons-actions-bar');
      const selectedCount = document.getElementById('cons-selected-count');
      const deleteBtn = document.getElementById('cons-delete-btn');
      const duplicateBtn = document.getElementById('cons-duplicate-btn');
      const deleteModal = document.getElementById('cons-delete-modal');
      const deleteConfirmBtn = document.getElementById('cons-delete-confirm');
      const deleteCancelBtn = document.getElementById('cons-delete-cancel');
      const deleteCloseBtn = document.getElementById('cons-delete-close');

      if (!tableBody || !selectAllCb) return;

      function updateSelectAll() {
        const checkboxes = tableBody.querySelectorAll('.cons-checkbox');
        const checked = tableBody.querySelectorAll('.cons-checkbox:checked');

        if (checked.length === 0) {
          selectAllCb.checked = false;
          selectAllCb.indeterminate = false;
          selectAllCb.classList.remove('cons-checkbox--indeterminate');
          actionsBar.style.display = 'none';
        } else if (checked.length === checkboxes.length) {
          selectAllCb.checked = true;
          selectAllCb.indeterminate = false;
          selectAllCb.classList.remove('cons-checkbox--indeterminate');
          actionsBar.style.display = '';
        } else {
          selectAllCb.checked = false;
          selectAllCb.indeterminate = true;
          selectAllCb.classList.add('cons-checkbox--indeterminate');
          actionsBar.style.display = '';
        }

        if (checked.length > 0) {
          selectedCount.textContent = checked.length + (checked.length === 1 ? ' item selected:' : ' items selected:');
        }
      }

      selectAllCb.addEventListener('change', function() {
        selectAllCb.classList.remove('cons-checkbox--indeterminate');
        selectAllCb.indeterminate = false;
        tableBody.querySelectorAll('.cons-checkbox').forEach(function(cb) {
          cb.checked = selectAllCb.checked;
        });
        updateSelectAll();
      });

      tableBody.addEventListener('change', function(e) {
        if (e.target.classList.contains('cons-checkbox')) {
          updateSelectAll();
        }
      });

      if (deleteBtn && deleteModal) {
        deleteBtn.addEventListener('click', function() {
          deleteModal.classList.add('modal-overlay--open');
        });

        deleteCancelBtn.addEventListener('click', function() {
          deleteModal.classList.remove('modal-overlay--open');
        });

        if (deleteCloseBtn) {
          deleteCloseBtn.addEventListener('click', function() {
            deleteModal.classList.remove('modal-overlay--open');
          });
        }

        deleteConfirmBtn.addEventListener('click', function() {
          tableBody.querySelectorAll('.cons-checkbox:checked').forEach(function(cb) {
            cb.closest('.table__row').remove();
          });
          deleteModal.classList.remove('modal-overlay--open');
          updateSelectAll();
        });

        deleteModal.addEventListener('click', function(e) {
          if (e.target === deleteModal) {
            deleteModal.classList.remove('modal-overlay--open');
          }
        });
      }

      if (duplicateBtn) {
        duplicateBtn.addEventListener('click', function() {
          tableBody.querySelectorAll('.cons-checkbox:checked').forEach(function(cb) {
            const row = cb.closest('.table__row');
            const clone = row.cloneNode(true);
            const cloneCb = clone.querySelector('.cons-checkbox');
            if (cloneCb) cloneCb.checked = false;
            row.insertAdjacentElement('afterend', clone);
          });
          updateSelectAll();
        });
      }
    }
  };
})();
