/**
 * Column Resizer Module
 * Enables horizontal column resizing for tables
 */

(function() {
    'use strict';

    let isResizing = false;
    let currentColumn = null;
    let startX = 0;
    let startWidth = 0;

    window.ColumnResizer = {
        init: function(tableSelector) {
            // querySelectorAll so multi-instance selectors (e.g., `.table--lines`
            // matches both Process Flow tab 1 and tab 2) all get resize handles.
            var self = this;
            document.querySelectorAll(tableSelector).forEach(function(table) {
                self.makeColumnsResizable(table);
            });
        },

        makeColumnsResizable: function(table) {
            const headers = table.querySelectorAll('.table__header');
            
            headers.forEach((header, index) => {
                // Add resize handle to each header
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'column-resize-handle';
                header.appendChild(resizeHandle);

                // Only set position: relative when the header isn't already
                // positioned (sticky headers already form a positioning context,
                // so overriding would break stickiness).
                if (window.getComputedStyle(header).position === 'static') {
                    header.style.position = 'relative';
                }

                // Add event listeners
                resizeHandle.addEventListener('mousedown', (e) => {
                    this.startResize(e, header);
                });
            });

            // Global mouse move and up listeners
            document.addEventListener('mousemove', (e) => {
                if (isResizing) {
                    this.doResize(e);
                }
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    this.stopResize();
                }
            });
        },

        startResize: function(e, column) {
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            currentColumn = column;
            startX = e.pageX;
            startWidth = column.offsetWidth;

            // Add resizing class to body for cursor
            document.body.classList.add('column-resizing');
            currentColumn.classList.add('column-resizing');
        },

        doResize: function(e) {
            if (!isResizing || !currentColumn) return;

            const diff = e.pageX - startX;
            const newWidth = startWidth + diff;

            // Set minimum width
            const minWidth = 100;
            if (newWidth >= minWidth) {
                currentColumn.style.width = newWidth + 'px';
                currentColumn.style.minWidth = newWidth + 'px';

                // Update corresponding cells in the same column
                const columnIndex = Array.from(currentColumn.parentElement.children).indexOf(currentColumn);
                const table = currentColumn.closest('table');
                const rows = table.querySelectorAll('.table__body .table__row');

                rows.forEach(row => {
                    const cell = row.children[columnIndex];
                    if (cell) {
                        cell.style.width = newWidth + 'px';
                        cell.style.minWidth = newWidth + 'px';
                    }
                });
            }
        },

        stopResize: function() {
            isResizing = false;
            document.body.classList.remove('column-resizing');
            
            if (currentColumn) {
                currentColumn.classList.remove('column-resizing');
                currentColumn = null;
            }
        }
    };
})();
