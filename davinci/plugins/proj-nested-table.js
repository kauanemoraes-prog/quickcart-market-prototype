/**
 * ProjNestedTable — Reusable nested table plugin component
 *
 * Creates an expandable table where Level 1 rows can expand to reveal
 * a Level 2 detail panel with a completely different column structure.
 *
 * Usage:
 *   var table = ProjNestedTable.create({
 *       tbodyId:          'my-table-body',        // tbody element ID
 *       level1TemplateId: 'my-l1-template',       // Handlebars template ID for L1 rows
 *       level2TemplateId: 'my-l2-template',       // Handlebars template ID for detail panel
 *       data:             [...],                   // L1 data array
 *       dataKey:          'data-item-id',          // row attribute for item lookup
 *       idField:          'id',                    // data property matching dataKey
 *       childrenField:    'children',              // nested array property name
 *       colspan:          10,                      // L1 column count (for detail td)
 *       level1DataKey:    'items',                 // template context: {{#each items}}
 *       level2DataKey:    'children'               // template context: {{#each children}}
 *   });
 *   table.init();
 */
(function() {
    'use strict';

    window.ProjNestedTable = {

        /**
         * Create a new nested table instance
         * @param {Object} config — see usage above
         * @returns {Object} instance with init(), renderLevel1(), toggleExpand()
         */
        create: function(config) {
            var instance = {
                config: config,
                _level1Tpl: null,
                _level2Tpl: null,

                init: function() {
                    this.renderLevel1();
                    this._bindEvents();
                },

                /** Compile and render Level 1 rows into tbody */
                renderLevel1: function() {
                    var tbody = document.getElementById(this.config.tbodyId);
                    var tplEl = document.getElementById(this.config.level1TemplateId);
                    if (!tbody || !tplEl) return;

                    if (!this._level1Tpl) {
                        this._level1Tpl = Handlebars.compile(tplEl.innerHTML);
                    }

                    var ctx = {};
                    ctx[this.config.level1DataKey] = this.config.data;
                    tbody.innerHTML = this._level1Tpl(ctx);
                },

                /** Get or compile the Level 2 template (cached) */
                _getLevel2Template: function() {
                    if (!this._level2Tpl) {
                        var el = document.getElementById(this.config.level2TemplateId);
                        if (el) this._level2Tpl = Handlebars.compile(el.innerHTML);
                    }
                    return this._level2Tpl;
                },

                /** Find a data item by its ID */
                findItem: function(id) {
                    var data = this.config.data;
                    for (var i = 0; i < data.length; i++) {
                        if (data[i][this.config.idField] === id) return data[i];
                    }
                    return null;
                },

                /** Toggle expand/collapse on a Level 1 row */
                toggleExpand: function(row) {
                    var cfg = this.config;
                    var id = row.getAttribute(cfg.dataKey);
                    var expanded = row.getAttribute('data-expanded') === 'true';
                    var nextRow = row.nextElementSibling;

                    if (expanded) {
                        // Collapse: remove detail row
                        if (nextRow && nextRow.classList.contains('proj-nested-table__detail-row')) {
                            nextRow.remove();
                        }
                        row.setAttribute('data-expanded', 'false');
                    } else {
                        // Expand: insert detail row
                        var item = this.findItem(id);
                        var children = item ? item[cfg.childrenField] : null;
                        if (!children || !children.length) return;

                        var tpl = this._getLevel2Template();
                        if (!tpl) return;

                        var ctx = {};
                        ctx[cfg.level2DataKey] = children;
                        var html = tpl(ctx);

                        var detailRow = document.createElement('tr');
                        detailRow.className = 'proj-nested-table__detail-row';
                        var td = document.createElement('td');
                        td.setAttribute('colspan', String(cfg.colspan));
                        td.className = 'proj-nested-table__detail-cell';
                        td.innerHTML = html;
                        detailRow.appendChild(td);

                        row.parentNode.insertBefore(detailRow, row.nextSibling);
                        row.setAttribute('data-expanded', 'true');
                    }
                },

                /** Bind expand/collapse click events via delegation */
                _bindEvents: function() {
                    var self = this;
                    var tbody = document.getElementById(this.config.tbodyId);
                    if (!tbody) return;

                    tbody.addEventListener('click', function(e) {
                        var btn = e.target.closest('.proj-nested-table__expand-btn');
                        if (!btn) return;

                        var row = btn.closest('.proj-nested-table__row--level1');
                        if (row) self.toggleExpand(row);
                    });
                }
            };

            return instance;
        }
    };
})();
