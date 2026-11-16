(function() {
  'use strict';

  var COLSPAN = 12;

  function renderVendorSubTable(vendors) {
    var rowsHtml = '';
    for (var i = 0; i < vendors.length; i++) {
      var v = vendors[i];
      rowsHtml += '<tr class="vendor-sub-row">';
      rowsHtml += '<td class="vendor-sub-cell vendor-sub-cell--enable">';
      rowsHtml += '<label class="switch switch--small">';
      rowsHtml += '<input type="checkbox" class="switch__input"' + (v.enabled ? ' checked' : '') + '>';
      rowsHtml += '<span class="switch__slider"></span>';
      rowsHtml += '<span class="switch__label">' + v.name + '</span>';
      rowsHtml += '</label>';
      rowsHtml += '</td>';
      rowsHtml += '<td class="vendor-sub-cell">' + v.name + '</td>';
      rowsHtml += '</tr>';
    }

    return '' +
      '<table class="vendor-sub-table">' +
        '<thead><tr>' +
          '<th class="vendor-sub-th vendor-sub-th--enable">Enable</th>' +
          '<th class="vendor-sub-th">Vendor</th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>';
  }

  function bindExpandHandlers(tbody) {
    tbody.addEventListener('click', function(e) {
      var chevron = e.target.closest('.row-chevron');
      if (!chevron) return;

      var rowId = chevron.getAttribute('data-row');
      var dataRow = chevron.closest('.table__row--data');
      var expandedRow = tbody.querySelector('tr[data-expanded-for="' + rowId + '"]');

      if (expandedRow) {
        expandedRow.parentNode.removeChild(expandedRow);
        chevron.classList.remove('row-chevron--expanded');
        return;
      }

      var equip = window.EquipData.getEquipment().find(function(d) { return String(d.id) === rowId; });
      if (!equip || !equip.vendors || !equip.vendors.length) return;

      var newRow = document.createElement('tr');
      newRow.className = 'table__row table__row--expanded';
      newRow.setAttribute('data-expanded-for', rowId);
      newRow.innerHTML = '<td colspan="' + COLSPAN + '">' + renderVendorSubTable(equip.vendors) + '</td>';
      dataRow.parentNode.insertBefore(newRow, dataRow.nextSibling);
      chevron.classList.add('row-chevron--expanded');
    });
  }

  window.EquipTable = {
    init: function() { this.render(); },

    render: function() {
      var tbody = document.getElementById('equip-table-body');
      if (!tbody) return;

      var data = window.EquipData.getEquipment();
      var html = '';

      for (var i = 0; i < data.length; i++) {
        var d = data[i];
        html += '<tr class="table__row table__row--data">';
        html += '<td class="table__cell table__cell--checkbox"><label class="checkbox"><input type="checkbox" class="checkbox__input"><span class="checkbox__box"></span></label></td>';
        html += '<td class="table__cell table__cell--expand"><button class="row-chevron" data-row="' + d.id + '"><lucide-icon name="chevron-right" style="font-size:16px"></lucide-icon></button></td>';
        html += '<td class="table__cell">' + d.name + '</td>';
        html += '<td class="table__cell">' + d.shortName + '</td>';
        html += '<td class="table__cell"><div class="vendor-dfm">';
        html += '<span class="vendor-dfm__count">' + d.vendorDfmApproved + '/' + d.vendorDfmTotal + '</span>';
        html += '<span class="vendor-dfm__status"><lucide-icon name="circle-check" style="font-size:14px"></lucide-icon> ' + d.vendorDfmStatus + '</span>';
        html += '<span class="vendor-dfm__info"><lucide-icon name="info" style="font-size:14px"></lucide-icon></span>';
        html += '</div></td>';
        html += '<td class="table__cell"><span class="process-flow-usage"><span class="process-flow-usage__count">' + d.processFlowUsage + '</span>';
        html += '<span class="process-flow-usage__info"><lucide-icon name="info" style="font-size:14px"></lucide-icon></span>';
        html += '</span></td>';
        html += '<td class="table__cell">' + d.department + '</td>';
        html += '<td class="table__cell">' + d.category + '</td>';
        html += '<td class="table__cell">' + d.engIntent + '</td>';
        html += '<td class="table__cell">' + d.mpIntent + '</td>';
        html += '<td class="table__cell">' + d.riskOpportunity + '</td>';
        html += '<td class="table__cell">' + d.vendor + '</td>';
        html += '</tr>';
      }

      tbody.innerHTML = html;
      bindExpandHandlers(tbody);
    }
  };
})();
