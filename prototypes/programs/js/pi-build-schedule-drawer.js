/**
 * Build Schedule Drawer — opens on top of program drawer.
 * Lists build events for a site + provides the "Index" button that triggers the wizard.
 */

(function() {
    'use strict';

    window.PIBuildScheduleDrawer = {
        currentSiteCode: null,

        init: function() {
            this.drawer = document.getElementById('build-schedule-drawer');
            this.closeBtn = document.getElementById('build-schedule-close');
            this.closeFooterBtn = document.getElementById('build-schedule-close-btn');
            this.indexBtn = document.getElementById('build-schedule-index-btn');
            this.titleEl = document.getElementById('build-schedule-title');
            this.body = document.getElementById('build-schedule-body');

            if (!this.drawer) return;

            // Register shared helper if not already
            if (typeof Handlebars !== 'undefined' && !Handlebars.helpers.lowercase) {
                Handlebars.registerHelper('lowercase', function(str) {
                    return (str || '').toString().toLowerCase().replace(/\s+/g, '-');
                });
            }

            this.closeBtn && this.closeBtn.addEventListener('click', this.close.bind(this));
            this.closeFooterBtn && this.closeFooterBtn.addEventListener('click', this.close.bind(this));
            this.indexBtn && this.indexBtn.addEventListener('click', this.onIndexClick.bind(this));

            this.drawer.addEventListener('click', function(e) {
                if (e.target === this.drawer) this.close();
            }.bind(this));

            this.initRowDrag();
        },

        /**
         * Drag-and-drop reorder for the build-event rows. Row becomes draggable
         * only when the user grabs the .bs-table__handle so text selection on
         * inputs still works. Locked rows (MP) don't have a handle and can't be
         * dragged.
         */
        initRowDrag: function() {
            if (!this.body) return;
            var body = this.body;
            var self = this;
            var dragged = null;

            body.addEventListener('mousedown', function(e) {
                var handle = e.target.closest('.bs-table__handle');
                if (!handle) return;
                var row = handle.closest('.bs-table__row');
                if (row) row.setAttribute('draggable', 'true');
            });

            body.addEventListener('dragstart', function(e) {
                var row = e.target.closest('.bs-table__row');
                if (!row) return;
                dragged = row;
                row.classList.add('is-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', 'row');
            });

            body.addEventListener('dragover', function(e) {
                var row = e.target.closest('.bs-table__row');
                if (!row || row === dragged) return;
                if (row.classList.contains('bs-table__row--locked')) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                body.querySelectorAll('.bs-table__row').forEach(function(r) {
                    r.classList.remove('drop-before', 'drop-after');
                });
                var rect = row.getBoundingClientRect();
                var isAfter = (e.clientY - rect.top) > rect.height / 2;
                row.classList.add(isAfter ? 'drop-after' : 'drop-before');
            });

            body.addEventListener('drop', function(e) {
                var target = e.target.closest('.bs-table__row');
                if (!target || !dragged || target === dragged) return;
                if (target.classList.contains('bs-table__row--locked')) return;
                e.preventDefault();
                var rect = target.getBoundingClientRect();
                var isAfter = (e.clientY - rect.top) > rect.height / 2;
                if (isAfter) {
                    target.parentNode.insertBefore(dragged, target.nextSibling);
                } else {
                    target.parentNode.insertBefore(dragged, target);
                }
            });

            body.addEventListener('dragend', function() {
                body.querySelectorAll('.bs-table__row').forEach(function(r) {
                    r.classList.remove('is-dragging', 'drop-before', 'drop-after');
                    r.removeAttribute('draggable');
                });
                dragged = null;
                // Re-evaluate Index button based on the new DOM order.
                self.updateIndexButton(null);
            });
        },

        open: function(siteCode) {
            var site = window.PIData.getSiteByCode(siteCode);
            if (!site) return;

            this.currentSiteCode = siteCode;
            if (this.titleEl) this.titleEl.textContent = 'Preparation schedule for ' + siteCode;
            this.renderEvents(site);
            this.updateIndexButton(site);
            this.drawer.classList.add('drawer-overlay--open');
        },

        close: function() {
            this.drawer.classList.remove('drawer-overlay--open');
        },

        renderEvents: function(site) {
            if (!this.body || typeof Handlebars === 'undefined') return;
            var tplEl = document.getElementById('bs-row-template');
            if (!tplEl) return;
            var tpl = Handlebars.compile(tplEl.innerHTML);
            this.body.innerHTML = tpl({ events: site.buildEvents });
        },

        updateIndexButton: function(site) {
            if (!this.indexBtn) return;
            var firstEvent = site && site.buildEvents && site.buildEvents[0];
            // When no site is passed, read the current DOM order (post-drag).
            var firstPfStatus = firstEvent ? firstEvent.pfStatus : this.getFirstDomPfStatus();
            var isEmpty = firstPfStatus === 'Empty';
            var indexed = site && site.indexed;

            if (indexed) {
                this.indexBtn.textContent = '✓ Indexed';
                this.indexBtn.disabled = true;
                this.indexBtn.removeAttribute('data-proj-tooltip');
                this.indexBtn.removeAttribute('data-proj-tooltip-placement');
            } else if (!isEmpty) {
                this.indexBtn.textContent = 'Index';
                this.indexBtn.disabled = true;
                this.indexBtn.setAttribute('data-proj-tooltip', 'Index can only be performed when the first Project Phase is Empty.');
                this.indexBtn.setAttribute('data-proj-tooltip-placement', 'bottom');
            } else {
                this.indexBtn.textContent = 'Index';
                this.indexBtn.disabled = false;
                this.indexBtn.removeAttribute('data-proj-tooltip');
                this.indexBtn.removeAttribute('data-proj-tooltip-placement');
            }
        },

        /**
         * Read the pfStatus of the first (top-most) row currently in the DOM.
         * Used after drag reorder to re-evaluate the Index button state without
         * mutating the underlying data.
         */
        getFirstDomPfStatus: function() {
            if (!this.body) return null;
            var firstRow = this.body.querySelector('.bs-table__row');
            if (!firstRow) return null;
            var pfTag = firstRow.querySelector('.bs-pf-tag');
            return pfTag ? pfTag.textContent.trim() : null;
        },

        onIndexClick: function() {
            if (!this.currentSiteCode) return;
            if (window.ProgramWizard) window.ProgramWizard.open({ mode: 'skip-first' });
        }
    };
})();
