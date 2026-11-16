/**
 * Equipment Table Module
 * Handles equipment table rendering with expandable vendor rows
 */

(function() {
  'use strict';

  var vendorData = {
    'Hammer': [
      { vendor: 'Acme', vendorDri: '', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'Amphenol', vendorDri: '', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'Dong A Eltek', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Screwdriver': [
      { vendor: 'Estee', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'test', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Pliers': [
      { vendor: 'Acme', vendorDri: '', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'test', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Wrench': [
      { vendor: 'Amphenol', vendorDri: '', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Drill': [
      { vendor: 'Dong A Eltek', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'Estee', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Saw': [
      { vendor: 'Acme', vendorDri: '', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Sander': [
      { vendor: 'Amphenol', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'Estee', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Grinder': [
      { vendor: 'Dong A Eltek', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Welder': [
      { vendor: 'Acme', vendorDri: '', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'test', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ],
    'Lathe': [
      { vendor: 'Amphenol', vendorDri: '', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' },
      { vendor: 'Estee', vendorDri: '', engIntent: 'POR', mpIntent: 'POR', designManager: '', lineSide: '', aqid: '', vendorPN: '', cmPN: '', leadTime: '', reqInHandDate: 'TBD', reqDfmLockDate: '' }
    ]
  };

  function getVendorCount(equipName) {
    var vendors = vendorData[equipName];
    return vendors ? vendors.length : 0;
  }

  function toggleExpand(equipName, chevronBtn) {
    var expandedRow = document.getElementById('equip-expanded-' + equipName.replace(/\s+/g, '-'));
    var isExpanded = expandedRow && expandedRow.style.display !== 'none';

    if (expandedRow) {
      expandedRow.style.display = isExpanded ? 'none' : 'table-row';
      chevronBtn.classList.toggle('equip-chevron--expanded', !isExpanded);
      chevronBtn.closest('.table__row').classList.toggle('table__row--equip-expanded-active', !isExpanded);
    }
  }

  function vendorDropdown(options, selectedValue) {
    selectedValue = selectedValue || '';
    var selectedLabel = '—';
    var optsHtml = '';
    options.forEach(function(opt) {
      var val = (typeof opt === 'object') ? opt.value : opt;
      var label = (typeof opt === 'object') ? opt.label : opt;
      var isSelected = val === selectedValue;
      if (isSelected) selectedLabel = label;
      optsHtml += '<li class="vendor-select__option' + (isSelected ? ' vendor-select__option--selected' : '') + '" data-value="' + val + '">' + label + '</li>';
    });
    return '<div class="vendor-select" data-value="' + selectedValue + '">' +
      '<button type="button" class="vendor-select__trigger">' +
        '<span class="vendor-select__value">' + selectedLabel + '</span>' +
        '<svg class="vendor-select__chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<ul class="vendor-select__menu">' + optsHtml + '</ul>' +
    '</div>';
  }

  function equipDropdown(options, selectedValue) {
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
    return '<div class="equip-dropdown" data-value="' + selectedValue + '">' +
      '<button type="button" class="equip-dropdown__trigger">' +
        '<span class="equip-dropdown__value">' + selectedLabel + '</span>' +
        '<svg class="equip-dropdown__chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<ul class="equip-dropdown__menu">' + optsHtml + '</ul>' +
    '</div>';
  }

  function buildVendorSubTable(equipName) {
    var vendors = vendorData[equipName] || [];
    var totalCols = 59;
    var rowId = 'equip-expanded-' + equipName.replace(/\s+/g, '-');

    var html = '<tr class="table__row table__row--equip-expanded" id="' + rowId + '" style="display:none;">';
    html += '<td class="table__cell table__cell--equip-expanded" colspan="' + totalCols + '">';
    html += '<table class="table table--vendors">';
    html += '<thead class="table__head"><tr class="table__row">';
    html += '<th class="table__header table__header--vendor-enable">Enable</th>';
    html += '<th class="table__header table__header--vendor-name"><span>Vendor</span><button class="vendor-add-row-btn" aria-label="Add vendor"><img src="../../davinci/assets/icons/regular/plus-circle.svg" alt="" width="18" height="18" class="vendor-add-icon"></button></th>';
    html += '<th class="table__header">Vendor DRI</th>';
    html += '<th class="table__header">ENG Intent</th>';
    html += '<th class="table__header">MP Intent</th>';
    html += '<th class="table__header">Design Manager</th>';
    html += '<th class="table__header">Line Side</th>';
    html += '<th class="table__header">AQID</th>';
    html += '<th class="table__header">Vendor PN</th>';
    html += '<th class="table__header">CM PN</th>';
    html += '<th class="table__header">Equip. Lead Time (Days)</th>';
    html += '<th class="table__header">Required Equip. in-hand Date</th>';
    html += '<th class="table__header">Required DFM Lock Date</th>';
    html += '<th class="table__header table__header--vendor-notes">Notes</th>';
    html += '</tr></thead>';
    html += '<tbody class="table__body">';

    vendors.forEach(function(v) {
      html += '<tr class="table__row">';
      html += '<td class="table__cell table__cell--vendor-enable"><label class="switch switch--small"><input type="checkbox" class="switch__input" checked><span class="switch__slider"></span></label></td>';
      html += '<td class="table__cell">' + v.vendor + '</td>';
      html += '<td class="table__cell"><input type="text" class="vendor-input" value="' + v.vendorDri + '" placeholder=""></td>';
      html += '<td class="table__cell">' + v.engIntent + '</td>';
      html += '<td class="table__cell">' + v.mpIntent + '</td>';
      html += '<td class="table__cell">' + vendorDropdown([{value:'',label:'—'},'Manager A','Manager B'], v.designManager) + '</td>';
      html += '<td class="table__cell">' + vendorDropdown([{value:'',label:'—'},'Left','Right'], v.lineSide) + '</td>';
      html += '<td class="table__cell"><input type="text" class="vendor-input" value="' + v.aqid + '" placeholder=""></td>';
      html += '<td class="table__cell"><input type="text" class="vendor-input" value="' + v.vendorPN + '" placeholder=""></td>';
      html += '<td class="table__cell"><input type="text" class="vendor-input" value="' + v.cmPN + '" placeholder=""></td>';
      html += '<td class="table__cell"><input type="text" class="vendor-input" value="' + v.leadTime + '" placeholder=""></td>';
      html += '<td class="table__cell">' + v.reqInHandDate + '</td>';
      html += '<td class="table__cell"><input type="text" class="vendor-input" value="' + v.reqDfmLockDate + '" placeholder="—"></td>';
      html += '<td class="table__cell table__cell--vendor-notes"><button class="vendor-add-btn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5V11M5 8H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></td>';
      html += '</tr>';
    });

    html += '</tbody></table></td></tr>';
    return html;
  }

  function isMpStage() {
    // MP empties the table only when no target Build Event is assigned.
    return !!(window.BuildStages
      && window.BuildStages.getCurrentBuild() === 'MP'
      && !window.BuildStages.getMpTarget());
  }

  /* Inject the MDS sort-indicator SVG markup into every `.sort-indicator`
   * placeholder in the equipment table thead. Idempotent — runs once at init
   * and skips containers already filled. Keeps the HTML source clean: authors
   * write `<span class="sort-indicator" data-mds-sort></span>` and this function
   * fills in the caret-up + caret-down SVGs per MDS component spec. */
  var SORT_INDICATOR_INNER =
    '<span class="sort-indicator__inner" aria-hidden="true">' +
      '<span role="img" aria-label="caret-up" class="sort-indicator__icon sort-indicator__up">' +
        '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true">' +
          '<path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"></path>' +
        '</svg>' +
      '</span>' +
      '<span role="img" aria-label="caret-down" class="sort-indicator__icon sort-indicator__down">' +
        '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true">' +
          '<path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path>' +
        '</svg>' +
      '</span>' +
    '</span>';

  function injectSortIndicators() {
    var slots = document.querySelectorAll('#equipment-list .table--equipment [data-mds-sort]');
    slots.forEach(function(slot) {
      if (slot.childElementCount > 0) return;
      slot.innerHTML = SORT_INDICATOR_INNER;
    });
  }

  window.EquipmentTable = {
    render: function() {
      injectSortIndicators();
      if (window.DeleteModal) {
        window.DeleteModal.render({
          modalId: 'equip-delete-modal',
          closeId: 'equip-delete-close',
          cancelId: 'equip-delete-cancel',
          confirmId: 'equip-delete-confirm',
          warningClass: 'equip-delete-warning',
          bodyParagraphs: [
            'The selected piece of equipment is being used in the Process Flow and cannot be deleted.',
            'When confirming, only pieces of equipment without process flow usage can be deleted.'
          ]
        });
      }
      var tableBody = document.getElementById('equipment-table-body');
      if (!tableBody) return;

      tableBody.innerHTML = '';

      // MP stage: render empty body (header only).
      if (isMpStage()) return;

      var equipmentData = window.DetailData.getEquipment();

      equipmentData.forEach(function(equip) {
        var vendorCount = getVendorCount(equip.name);
        var row = document.createElement('tr');
        row.className = 'table__row';

        row.innerHTML =
          // 1 Equipment name
          '<td class="table__cell table__cell--equip-name table__cell--sticky-name">' +
            '<input type="checkbox" class="equip-checkbox">' +
            '<button class="equip-chevron" data-equip="' + equip.name + '">' +
              '<svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M1.5 1L6.5 6L1.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<input type="text" class="equip-input equip-input--name" value="' + equip.name + '">' +
          '</td>' +
          // 2 Short name
          '<td class="table__cell table__cell--sticky-short"><input type="text" class="equip-input" value="' + equip.shortName + '"></td>' +
          // 3 Vendor DFM Statuses
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.vendor + '"></td>' +
          // 4 Process Flow Usage
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.usage + '"></td>' +
          // 5 Department
          '<td class="table__cell">' + equipDropdown(['TE', 'AE', 'ME', 'DFM', 'Tool'], equip.type) + '</td>' +
          // 6 CM Department (new)
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, 'Test1'], '') + '</td>' +
          // 7 Equipment category
          '<td class="table__cell">' + equipDropdown(['Manual Fixture', 'Semi Auto Fixture', 'Bench Top Automated Fixture', 'Conveyor', 'Cooling Tunnel', 'FIFO', 'Laser Etching', 'Laser Welding', 'Oven'], equip.category) + '</td>' +
          // 8 ENG Intent
          '<td class="table__cell">' + equipDropdown(['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'], equip.engIntent) + '</td>' +
          // 9 MP Intent
          '<td class="table__cell">' + equipDropdown(['POR', 'DOE', 'Inactive', 'MP Evaluation', 'N/A', 'Offline'], equip.mpIntent) + '</td>' +
          // 10 Line Side
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.lineSide + '"></td>' +
          // 11 Engineering quantity
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.qty + '"></td>' +
          // 12 Required In-hand Date
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.date + '"></td>' +
          // 13 Equipment DRI
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.dri + '"></td>' +
          // 14 PD DRI
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.pdDri + '"></td>' +
          // 15 CM DRI
          '<td class="table__cell"><input type="text" class="equip-input" value="' + equip.cmDri + '"></td>' +
          // 16 Unique attributes
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 17 Equip. description
          '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + equip.name + '" data-field="description"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
          // 18 Equipment process
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 19 Equipment Design Review (new)
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, 'Not started', 'In progress', 'Approved', 'Rejected'], '') + '</td>' +
          // 20 QPL Adjustment (new)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 21 OPL Adjustment
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 22 OPL
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 23 Priority rating dropdown
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, '1', '2', '3', '4', '5'], '') + '</td>' +
          // 24 Complexity rating dropdown
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, '1', '2', '3', '4', '5'], '') + '</td>' +
          // 25 Cost rating dropdown
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, '1', '2', '3', '4', '5'], '') + '</td>' +
          // 26 MP Cost Estimate
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 27 Purchase type dropdown
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, 'Expensed', 'Reimbursed'], '') + '</td>' +
          // 28 Revisions
          '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + equip.name + '" data-field="revisions"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
          // 29 Notes
          '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + equip.name + '" data-field="notes"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
          // 30 Validation Required dropdown
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, 'Yes', 'No'], '') + '</td>' +
          // 31 Validation Type
          '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + equip.name + '" data-field="validationType"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
          // 32 Weight (kg)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 33 Workspace Width
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 34 Workspace Height (new)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 35 Workspace Length (new)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 36 Concept Review
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 37 RFP Link
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 38 Inline Part ID
          '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder="Inline Part ID"></td>' +
          // 39 RFP Status dropdown
          '<td class="table__cell">' + equipDropdown([{value:'',label:'—'}, 'Open', 'In Review', 'Awarded', 'Closed'], '') + '</td>' +
          // 40 RFP Release Date
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 41 Line Name
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 42 Station Name
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 43 Equipment Usage Multiplier
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 44 Eq. Usage Connected to Reporting
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 45 Reporting Method
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 46 Reporting Mapping
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 47 XUP
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 48 Man to Station Ratio
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 49 Handling CT
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 50 Machine CT
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 51 Cycle Time (CT)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 52 Cal + Audit
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 53 Retest Rate
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 54 Down time (Planned)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 55 Down time (Unplanned)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 56 Yield Fallout
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 57 Testing
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 58 Tooling
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>' +
          // 59 Version Notes (new)
          '<td class="table__cell"><input type="text" class="equip-input" value=""></td>';

        tableBody.appendChild(row);

        // Add expanded vendor sub-table row
        var expandedHtml = buildVendorSubTable(equip.name);
        row.insertAdjacentHTML('afterend', expandedHtml);
      });

      // Bind chevron click events
      tableBody.querySelectorAll('.equip-chevron').forEach(function(btn) {
        btn.addEventListener('click', function() {
          toggleExpand(btn.dataset.equip, btn);
        });
      });

      // Bind description popover
      var fieldData = {};
      var fieldLabels = { description: 'Equipment description', revisions: 'Revisions', notes: 'Notes', validationType: 'Validation Type' };
      var popover = document.getElementById('equip-desc-popover');
      var textarea = document.getElementById('equip-desc-textarea');
      var charCount = document.getElementById('desc-char-count');
      var popoverTitle = popover.querySelector('.equip-desc-popover__title');
      var cancelBtn = document.getElementById('equip-desc-cancel');
      var saveBtn = document.getElementById('equip-desc-save');
      var currentDescBtn = null;

      function getKey(btn) {
        return btn.dataset.equip + '__' + btn.dataset.field;
      }

      function openPopover(btn) {
        currentDescBtn = btn;
        var key = getKey(btn);
        popoverTitle.textContent = fieldLabels[btn.dataset.field] || btn.dataset.field;
        textarea.value = fieldData[key] || '';
        charCount.textContent = textarea.value.length;
        popover.style.display = 'block';
        var rect = btn.getBoundingClientRect();
        var containerRect = btn.closest('.equipment-table-container').getBoundingClientRect();
        popover.style.top = (rect.bottom - containerRect.top + 8) + 'px';
        popover.style.left = (rect.left - containerRect.left - 100) + 'px';
        textarea.focus();
      }

      function closePopover() {
        popover.style.display = 'none';
        currentDescBtn = null;
      }

      textarea.addEventListener('input', function() {
        charCount.textContent = textarea.value.length;
      });

      cancelBtn.addEventListener('click', closePopover);

      saveBtn.addEventListener('click', function() {
        if (!currentDescBtn) return;
        var key = getKey(currentDescBtn);
        var val = textarea.value.trim();
        if (val) {
          fieldData[key] = val;
          currentDescBtn.innerHTML = '<img src="../../davinci/assets/icons/regular/text-bubble-fill.svg" alt="" width="20" height="20" class="equip-desc-icon">';
        } else {
          delete fieldData[key];
          currentDescBtn.innerHTML = '<img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon">';
        }
        closePopover();
      });

      document.addEventListener('click', function(e) {
        if (popover.style.display === 'block' && !popover.contains(e.target) && !e.target.closest('.equip-desc-btn')) {
          closePopover();
        }
      });

      tableBody.querySelectorAll('.equip-desc-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          openPopover(btn);
        });
      });

      // Select all checkbox & actions bar
      var selectAllCb = document.getElementById('equip-select-all');
      var actionsBar = document.getElementById('equip-actions-bar');
      var selectedCount = document.getElementById('equip-selected-count');
      var deleteBtn = document.getElementById('equip-delete-btn');
      var duplicateBtn = document.getElementById('equip-duplicate-btn');

      if (selectAllCb) {
        function updateSelectAll() {
          var checkboxes = tableBody.querySelectorAll('.equip-checkbox');
          var checked = tableBody.querySelectorAll('.equip-checkbox:checked');

          if (checked.length === 0) {
            selectAllCb.checked = false;
            selectAllCb.indeterminate = false;
            selectAllCb.classList.remove('equip-checkbox--indeterminate');
            actionsBar.style.display = 'none';
          } else if (checked.length === checkboxes.length) {
            selectAllCb.checked = true;
            selectAllCb.indeterminate = false;
            selectAllCb.classList.remove('equip-checkbox--indeterminate');
            actionsBar.style.display = '';
          } else {
            selectAllCb.checked = false;
            selectAllCb.indeterminate = true;
            selectAllCb.classList.add('equip-checkbox--indeterminate');
            actionsBar.style.display = '';
          }

          if (checked.length > 0) {
            selectedCount.textContent = checked.length + (checked.length === 1 ? ' item selected:' : ' items selected:');
          }
        }

        selectAllCb.addEventListener('change', function() {
          selectAllCb.classList.remove('equip-checkbox--indeterminate');
          selectAllCb.indeterminate = false;
          tableBody.querySelectorAll('.equip-checkbox').forEach(function(cb) {
            cb.checked = selectAllCb.checked;
          });
          updateSelectAll();
        });

        tableBody.addEventListener('change', function(e) {
          if (e.target.classList.contains('equip-checkbox')) {
            updateSelectAll();
          }
        });

        // Delete selected rows - show confirmation modal
        var deleteModal = document.getElementById('equip-delete-modal');
        var deleteConfirmBtn = document.getElementById('equip-delete-confirm');
        var deleteCancelBtn = document.getElementById('equip-delete-cancel');
        var deleteCloseBtn = document.getElementById('equip-delete-close');

        deleteBtn.addEventListener('click', function() {
          deleteModal.classList.add('modal-overlay--open');
        });

        function closeEquipDeleteModal() {
          deleteModal.classList.remove('modal-overlay--open');
        }

        deleteCancelBtn.addEventListener('click', closeEquipDeleteModal);
        if (deleteCloseBtn) deleteCloseBtn.addEventListener('click', closeEquipDeleteModal);

        deleteConfirmBtn.addEventListener('click', function() {
          tableBody.querySelectorAll('.equip-checkbox:checked').forEach(function(cb) {
            var row = cb.closest('.table__row');
            var next = row.nextElementSibling;
            if (next && next.classList.contains('table__row--equip-expanded')) {
              next.remove();
            }
            row.remove();
          });
          deleteModal.classList.remove('modal-overlay--open');
          updateSelectAll();
        });

        deleteModal.addEventListener('click', function(e) {
          if (e.target === deleteModal) {
            deleteModal.classList.remove('modal-overlay--open');
          }
        });

        // Duplicate selected rows — opens the Duplicate Equipment modal so the
        // user can rename each clone before it is inserted. Empty names fall
        // back to `{original}-copy` inside the modal module.
        duplicateBtn.addEventListener('click', function() {
          var rows = Array.prototype.slice.call(
            tableBody.querySelectorAll('.equip-checkbox:checked')
          ).map(function(cb) { return cb.closest('.table__row'); });
          if (rows.length === 0) return;
          if (!window.DuplicateEquipmentModal) return;

          window.DuplicateEquipmentModal.open(rows, function(results) {
            var frag = document.createDocumentFragment();
            results.forEach(function(item) {
              var row = item.row;
              var clone = row.cloneNode(true);
              var cloneCb = clone.querySelector('.equip-checkbox');
              if (cloneCb) cloneCb.checked = false;
              var nameInput = clone.querySelector('.equip-input--name');
              if (nameInput) {
                nameInput.value = item.newName;
                nameInput.setAttribute('value', item.newName);
              }
              frag.appendChild(clone);
              var originalCb = row.querySelector('.equip-checkbox');
              if (originalCb) originalCb.checked = false;
            });
            tableBody.insertBefore(frag, tableBody.firstChild);
            updateSelectAll();
            if (typeof window.showNotification === 'function') {
              var n = results.length;
              window.showNotification('success', n + ' equipment has been duplicated');
            }
          });
        });
      }

      // Custom vendor-select dropdown — open/close + selection
      tableBody.addEventListener('click', function(e) {
        var trigger = e.target.closest('.vendor-select__trigger');
        var option = e.target.closest('.vendor-select__option');

        if (trigger) {
          e.stopPropagation();
          var ws = trigger.parentElement;
          var wasOpen = ws.classList.contains('vendor-select--open');
          document.querySelectorAll('.vendor-select--open').forEach(function(el) {
            el.classList.remove('vendor-select--open');
          });
          if (!wasOpen) ws.classList.add('vendor-select--open');
          return;
        }

        if (option) {
          e.stopPropagation();
          var wrap = option.closest('.vendor-select');
          var label = option.textContent;
          var val = option.dataset.value || '';
          wrap.dataset.value = val;
          var valueEl = wrap.querySelector('.vendor-select__value');
          if (valueEl) valueEl.textContent = label;
          wrap.querySelectorAll('.vendor-select__option--selected').forEach(function(el) {
            el.classList.remove('vendor-select__option--selected');
          });
          option.classList.add('vendor-select__option--selected');
          wrap.classList.remove('vendor-select--open');
        }
      });

      // Custom equip-dropdown — same pattern as vendor-select but with row-hover-aware trigger
      tableBody.addEventListener('click', function(e) {
        var trigger = e.target.closest('.equip-dropdown__trigger');
        var option = e.target.closest('.equip-dropdown__option');

        if (trigger) {
          e.stopPropagation();
          var ws = trigger.parentElement;
          var wasOpen = ws.classList.contains('equip-dropdown--open');
          document.querySelectorAll('.equip-dropdown--open').forEach(function(el) {
            el.classList.remove('equip-dropdown--open');
          });
          if (!wasOpen) ws.classList.add('equip-dropdown--open');
          return;
        }

        if (option) {
          e.stopPropagation();
          var wrap = option.closest('.equip-dropdown');
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
        }
      });

      document.addEventListener('click', function(e) {
        if (!e.target.closest('.equip-dropdown')) {
          document.querySelectorAll('.equip-dropdown--open').forEach(function(el) {
            el.classList.remove('equip-dropdown--open');
          });
        }
      });

      document.addEventListener('click', function(e) {
        if (!e.target.closest('.vendor-select')) {
          document.querySelectorAll('.vendor-select--open').forEach(function(el) {
            el.classList.remove('vendor-select--open');
          });
        }
      });

      // Add new vendor row button (delegated — sub-tables are rendered inline)
      tableBody.addEventListener('click', function(e) {
        var addBtn = e.target.closest('.vendor-add-row-btn');
        if (!addBtn) return;

        var subTable = addBtn.closest('.table--vendors');
        var subTbody = subTable && subTable.querySelector('tbody');
        if (!subTbody) return;

        var newRow = document.createElement('tr');
        newRow.className = 'table__row table__row--new';
        newRow.innerHTML =
          '<td class="table__cell table__cell--vendor-enable"><label class="switch switch--small"><input type="checkbox" class="switch__input" checked><span class="switch__slider"></span></label></td>' +
          '<td class="table__cell"><input type="text" class="vendor-input vendor-input--name" value="" placeholder="Vendor name"></td>' +
          '<td class="table__cell"><input type="text" class="vendor-input" value="" placeholder=""></td>' +
          '<td class="table__cell">' + vendorDropdown([{value:'',label:'—'},'POR','DOE','Inactive','MP Evaluation','N/A','Offline']) + '</td>' +
          '<td class="table__cell">' + vendorDropdown([{value:'',label:'—'},'POR','DOE','Inactive','MP Evaluation','N/A','Offline']) + '</td>' +
          '<td class="table__cell">' + vendorDropdown([{value:'',label:'—'},'Manager A','Manager B']) + '</td>' +
          '<td class="table__cell">' + vendorDropdown([{value:'',label:'—'},'Left','Right']) + '</td>' +
          '<td class="table__cell"><input type="text" class="vendor-input" value="" placeholder=""></td>' +
          '<td class="table__cell"><input type="text" class="vendor-input" value="" placeholder=""></td>' +
          '<td class="table__cell"><input type="text" class="vendor-input" value="" placeholder=""></td>' +
          '<td class="table__cell"><input type="text" class="vendor-input" value="" placeholder=""></td>' +
          '<td class="table__cell"><input type="text" class="vendor-input" value="" placeholder="TBD"></td>' +
          '<td class="table__cell"><input type="text" class="vendor-input" value="" placeholder="—"></td>' +
          '<td class="table__cell table__cell--vendor-notes"><button class="vendor-add-btn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5V11M5 8H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></td>';

        subTbody.insertBefore(newRow, subTbody.firstChild);

        function isRowEmpty() {
          var inputs = newRow.querySelectorAll('.vendor-input');
          var selects = newRow.querySelectorAll('.vendor-select');
          var hasContent = false;
          inputs.forEach(function(i) { if (i.value.trim()) hasContent = true; });
          selects.forEach(function(s) { if (s.dataset.value) hasContent = true; });
          return !hasContent;
        }

        function handleClickOutside(ev) {
          if (!newRow.contains(ev.target)) {
            if (isRowEmpty()) newRow.remove();
            document.removeEventListener('click', handleClickOutside);
          }
        }

        setTimeout(function() {
          document.addEventListener('click', handleClickOutside);
        }, 0);

        var firstInput = newRow.querySelector('.vendor-input--name');
        if (firstInput) firstInput.focus();
      });

      // Add new equipment row button
      var addBtn = document.getElementById('equip-add-row-btn');
      if (addBtn) {
        addBtn.addEventListener('click', function() {
          var newId = 'new-' + Date.now();
          var emptyRow = document.createElement('tr');
          emptyRow.className = 'table__row table__row--new';
          emptyRow.innerHTML =
            '<td class="table__cell table__cell--equip-name table__cell--sticky-name">' +
              '<input type="checkbox" class="equip-checkbox">' +
              '<button class="equip-chevron" data-equip="' + newId + '">' +
                '<svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M1.5 1L6.5 6L1.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</button>' +
              '<input type="text" class="equip-input equip-input--name" value="" placeholder="Equipment name">' +
            '</td>' +
            '<td class="table__cell table__cell--sticky-short"><input type="text" class="equip-input" value="" placeholder="Short name"></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell">' + equipDropdown([{value:'',label:'—'},'TE','AE','ME','DFM','Tool']) + '</td>' +
            '<td class="table__cell">' + equipDropdown([{value:'',label:'—'},'Manual Fixture','Semi Auto Fixture','Bench Top Automated Fixture','Conveyor','Cooling Tunnel','Laser Etching','Laser Welding','Oven']) + '</td>' +
            '<td class="table__cell">' + equipDropdown([{value:'',label:'—'},'POR','DOE','Inactive','MP Evaluation','N/A','Offline']) + '</td>' +
            '<td class="table__cell">' + equipDropdown([{value:'',label:'—'},'POR','DOE','Inactive','MP Evaluation','N/A','Offline']) + '</td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + newId + '" data-field="description"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + newId + '" data-field="revisions"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
            '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + newId + '" data-field="notes"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell table__cell--description"><button class="equip-desc-btn" data-equip="' + newId + '" data-field="validationType"><img src="../../davinci/assets/icons/regular/plus-bubble.svg" alt="" width="20" height="20" class="equip-desc-icon"></button></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>' +
            '<td class="table__cell"><input type="text" class="equip-input" value="" placeholder=""></td>';

          tableBody.insertBefore(emptyRow, tableBody.firstChild);

          // Bind events on new row
          emptyRow.querySelector('.equip-chevron').addEventListener('click', function() {
            toggleExpand(newId, this);
          });
          emptyRow.querySelectorAll('.equip-desc-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();
              openPopover(btn);
            });
          });

          // Remove row if user clicks outside without filling anything
          function checkRowEmpty() {
            var inputs = emptyRow.querySelectorAll('.equip-input');
            var selects = emptyRow.querySelectorAll('.equip-select');
            var hasContent = false;
            inputs.forEach(function(input) {
              if (input.value.trim()) hasContent = true;
            });
            selects.forEach(function(select) {
              if (select.value) hasContent = true;
            });
            return !hasContent;
          }

          function handleClickOutside(e) {
            if (!emptyRow.contains(e.target) && !e.target.closest('.equip-desc-popover')) {
              if (checkRowEmpty()) {
                emptyRow.remove();
              }
              document.removeEventListener('click', handleClickOutside);
            }
          }

          setTimeout(function() {
            document.addEventListener('click', handleClickOutside);
          }, 0);

          // Focus first input
          emptyRow.querySelector('.equip-input--name').focus();
        });
      }

      // If the equipment filter is present, reapply active chips after the
      // full-body rerender so filter/highlight state survives stage changes,
      // preset toggles, add-row, etc. Guarded so equipment-table.js stays
      // functional even without eq-filter loaded.
      if (window.EqFilter && typeof window.EqFilter.reapply === 'function') {
        window.EqFilter.reapply();
      }
    }
  };
})();
