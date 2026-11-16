/**
 * Table Resize
 * Drag the right edge of any column header to resize that column (or focus it and use the arrow keys).
 * Widths live in a <colgroup> with a fixed table layout, so they survive the table body being re-rendered. The table
 * always fills the width of its container: one column (`grow`, the last by default) takes whatever width the others leave
 * (its stored width is its minimum), and when the columns need more room than the screen has, the table scrolls sideways. The
 * header handles are re-attached by refresh() after the header is re-rendered (sorting). Widths are remembered in
 * localStorage under `key`.
 *
 *   var resizer = TableResize.create(table, { key: 'products', defaults: [140, 170, ...], onChange: function(widths) {} });
 *   resizer.refresh();   // after every render of the header
 */

(function() {
  'use strict';

  var MIN = 60;
  var STORAGE = 'bossanova:column-widths:';

  function load(key, count, fixed) {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE + key));
      if (Array.isArray(saved) && saved.length === count && saved.every(function(n, i) { return typeof n === 'number' && n >= ((fixed || []).indexOf(i) !== -1 ? 20 : MIN); })) return saved;
    } catch (e) {}
    return null;
  }

  function save(key, widths) {
    try { localStorage.setItem(STORAGE + key, JSON.stringify(widths)); } catch (e) {}
  }

  function create(table, options) {
    var widths = load(options.key, options.defaults.length, options.fixed) || options.defaults.slice();
    var colgroup = document.createElement('colgroup');
    widths.forEach(function() { colgroup.appendChild(document.createElement('col')); });
    table.insertBefore(colgroup, table.firstChild);
    table.classList.add('table--resizable');

    // The column that takes the width the others leave (the last one unless the caller says otherwise)
    var last = options.grow != null ? options.grow : widths.length - 1;

    function apply() {
      var total = 0;
      widths.forEach(function(w, i) {
        colgroup.children[i].style.width = i === last ? '' : w + 'px';
        total += w;
      });
      table.style.width = '100%';
      table.style.minWidth = total + 'px';
      if (options.onChange) options.onChange(widths.slice());
    }

    function setWidth(i, w) {
      widths[i] = Math.max(MIN, Math.round(w));
      apply();
    }

    function attach(th, i) {
      var handle = document.createElement('div');
      handle.className = 'column-resize-handle';
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', 'Resize column ' + (th.textContent.trim() || (i + 1)));
      handle.tabIndex = 0;
      th.appendChild(handle);

      var startX = 0, startW = 0;
      handle.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startW = th.offsetWidth;   // the column that fills the table may be wider than its saved width
        widths[i] = startW;
        handle.setPointerCapture(e.pointerId);
        document.body.classList.add('column-resizing');
        th.classList.add('column-resizing');
      });
      handle.addEventListener('pointermove', function(e) {
        if (!handle.hasPointerCapture(e.pointerId)) return;
        setWidth(i, startW + e.clientX - startX);
      });
      var stop = function(e) {
        if (!handle.hasPointerCapture(e.pointerId)) return;
        handle.releasePointerCapture(e.pointerId);
        document.body.classList.remove('column-resizing');
        th.classList.remove('column-resizing');
        save(options.key, widths);
      };
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
      // A click on the handle must not sort the column
      handle.addEventListener('click', function(e) { e.stopPropagation(); });
      handle.addEventListener('keydown', function(e) {
        var step = e.shiftKey ? 48 : 16;
        if (e.key === 'ArrowRight') setWidth(i, widths[i] + step);
        else if (e.key === 'ArrowLeft') setWidth(i, widths[i] - step);
        else return;
        e.preventDefault();
        e.stopPropagation();
        save(options.key, widths);
      });
      // Double click: back to the default width
      handle.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        setWidth(i, options.defaults[i]);
        save(options.key, widths);
      });
    }

    apply();

    return {
      /** Call after the header has been (re)rendered. */
      refresh: function() {
        var fixed = options.fixed || [];
        Array.prototype.forEach.call(table.querySelectorAll('thead th'), function(th, i) { if (fixed.indexOf(i) === -1) attach(th, i); });
      }
    };
  }

  window.TableResize = { create: create };
})();
