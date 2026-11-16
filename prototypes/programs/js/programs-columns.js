/**
 * Programs Columns Module
 * Drag the right edge of any column header to resize it. The main table and the tables
 * inside each expanded row have the same columns in the same positions, so they share one
 * width per column (--col-w2 .. --col-w10) and stay aligned. Widths are written as CSS custom
 * properties on <html>, so re-rendered rows pick them up.
 */

(function() {
  'use strict';

  var HIT = 8; // px from the right edge that count as the resize handle
  var MIN = 80;
  var state = { w2: 200, w3: 90, w4: 130, w5: 171, w6: 140, w7: 140, w8: 160, w9: 150, w10: 80 };

  var drag = null;

  function apply() {
    var root = document.documentElement.style;
    Object.keys(state).forEach(function(k) { root.setProperty('--col-' + k, state[k] + 'px'); });
  }

  /** Which state key a header cell controls (null = not resizable). */
  function keyFor(th) {
    var table = th.closest('table');
    if (!table || !(table.classList.contains('table--nested') || table.classList.contains('table--expandable'))) return null;
    // Logical column of the header's right edge, counting colspans (a header can span columns)
    var idx = 0;
    for (var el = th; el; el = el.previousElementSibling) idx += el.colSpan || 1;
    return idx >= 2 && idx <= 10 ? 'w' + idx : null;
  }

  function onDown(e) {
    var th = e.target.closest && e.target.closest('.table--expandable > thead .table__header, .table--nested > thead .table__header');
    if (!th) return;
    var rect = th.getBoundingClientRect();
    if (e.clientX < rect.right - HIT) return;
    var key = keyFor(th);
    if (!key) return;
    e.preventDefault();
    e.stopPropagation();
    drag = { key: key, startX: e.clientX, startW: state[key] };
    document.body.classList.add('column-resizing');
  }

  function onMove(e) {
    if (!drag) return;
    state[drag.key] = Math.max(MIN, Math.round(drag.startW + e.clientX - drag.startX));
    apply();
  }

  function onUp() {
    if (!drag) return;
    drag = null;
    document.body.classList.remove('column-resizing');
    // The mouseup lands on the header and would fire a click (sorting): swallow it once.
    var swallow = function(e) { e.stopPropagation(); e.preventDefault(); };
    document.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(function() { document.removeEventListener('click', swallow, true); }, 0);
  }

  document.addEventListener('mousedown', onDown, true);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  apply();
})();
