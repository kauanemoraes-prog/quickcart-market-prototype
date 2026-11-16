/**
 * Wizard — Step 5: Review (panoramic summary + selected items table).
 */

(function() {
    'use strict';

    function classifyLabel(retrofit) {
        return retrofit
            ? '<span class="review-class review-class--retrofit">Retrofit</span>'
            : '<span class="review-class review-class--carry">Carry Over</span>';
    }

    function escapeHtml(s) {
        return (s || '').toString()
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.PIWizardReview = {
        init: function(state) {
            this.state = state;
            this.cardTplEl = document.getElementById('review-card-template');
            this.detailsTplEl = document.getElementById('review-details-template');
            this.gridEl = document.getElementById('review-grid');
            this.detailsEl = document.getElementById('review-details');
            this.warnEl = document.getElementById('review-warnings');
            this.routeSource = document.getElementById('review-source');
            this.routeDest = document.getElementById('review-destination');

            if (!this.cardTplEl || !this.gridEl || typeof Handlebars === 'undefined') return;
            this.cardTpl = Handlebars.compile(this.cardTplEl.innerHTML);
            if (this.detailsTplEl) this.detailsTpl = Handlebars.compile(this.detailsTplEl.innerHTML);

            this.gridEl.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-review-edit]');
                if (!btn) return;
                var step = parseInt(btn.getAttribute('data-review-edit'), 10);
                if (window.PIWizard) window.PIWizard.goTo(step);
            });
        },

        refresh: function() {
            if (!this.cardTpl) return;

            this.routeSource.textContent = window.PIWizardSource.getSummary() || '—';
            var siteCode = window.PIWizard.targetSiteCode || '';
            var site = window.PIWizard.getTargetSite();
            var event = site && site.buildEvents.find(function(ev) {
                return ev.id === this.state.target.event;
            }.bind(this));
            this.routeDest.textContent = window.PIData.TARGET_PROGRAM + ' · ' + siteCode +
                (event ? ' · ' + event.name : '') + ' · Draft';

            var groups = [
                this.buildLinesCard(2, this.state.scope.lines !== false),
                this.buildEquipmentCard(3, this.state.scope.equipment !== false),
                this.buildConsumablesCard(4, this.state.scope.consumables !== false),
                this.buildSopCard()
            ];

            this.gridEl.innerHTML = this.cardTpl({ groups: groups });
            this.renderDetails();
            this.renderWarnings();
        },

        buildLinesCard: function(step, enabled) {
            var title = 'Assembly areas + Workstations';
            if (!enabled) {
                return { title: title, step: step, disabled: true };
            }
            var c = window.PIWizardItems.getCounts('lines');
            var linesState = this.state.items.lines || [];
            var allLines = window.PIData.getItems('lines');

            var linesTotal = 0;
            var offlineSelected = 0;
            var stAE = 0, stME = 0, stTE = 0;

            allLines.forEach(function(line) {
                var st = linesState.find(function(s) { return s.id === line.id; });
                if (!st || !st.selected) return;
                linesTotal++;
                if ((line.status || '').toLowerCase() === 'offline') offlineSelected++;
                (line.stations || []).forEach(function(station) {
                    var ss = (st.stations || []).find(function(x) { return x.id === station.id; });
                    if (!ss || !ss.selected) return;
                    if (station.discipline === 'AE') stAE++;
                    else if (station.discipline === 'ME') stME++;
                    else if (station.discipline === 'TE') stTE++;
                });
            });

            return {
                title: title,
                step: step,
                disabled: false,
                carry: c.carry,
                retrofit: c.retrofit,
                excluded: c.excluded,
                extra: [
                    { label: 'Assembly areas', value: linesTotal },
                    { label: 'Offline (selected)', value: offlineSelected },
                    { label: 'Workstations AE', value: stAE },
                    { label: 'Workstations ME', value: stME },
                    { label: 'Workstations TE', value: stTE }
                ]
            };
        },

        buildEquipmentCard: function(step, enabled) {
            var title = 'Tools';
            if (!enabled) {
                return { title: title, step: step, disabled: true };
            }
            var c = window.PIWizardItems.getCounts('equipment');
            var eqState = this.state.items.equipment || [];
            var allEq = window.PIData.getItems('equipment');

            var eqAE = 0, eqME = 0, eqTE = 0;
            allEq.forEach(function(eq) {
                var st = eqState.find(function(s) { return s.id === eq.id; });
                if (!st || !st.selected) return;
                if (eq.discipline === 'AE') eqAE++;
                else if (eq.discipline === 'ME') eqME++;
                else if (eq.discipline === 'TE') eqTE++;
            });

            return {
                title: title,
                step: step,
                disabled: false,
                carry: c.carry,
                retrofit: c.retrofit,
                excluded: c.excluded,
                extra: [
                    { label: 'Tools AE', value: eqAE },
                    { label: 'Tools ME', value: eqME },
                    { label: 'Tools TE', value: eqTE }
                ]
            };
        },

        buildConsumablesCard: function(step, enabled) {
            var title = 'Materials';
            if (!enabled) {
                return { title: title, step: step, disabled: true };
            }
            var c = window.PIWizardItems.getCounts('consumables');
            var selected = c.carry + c.retrofit;
            return {
                title: title,
                step: step,
                disabled: false,
                simple: true,
                selectedCount: selected,
                excluded: c.excluded
            };
        },

        buildSopCard: function() {
            return {
                title: 'SOP Files',
                step: 1,
                disabled: true
            };
        },

        renderDetails: function() {
            if (!this.detailsEl || !this.detailsTpl) return;
            var sections = [];

            if (this.state.scope.lines !== false) {
                sections.push(this.buildLinesSection());
            }
            if (this.state.scope.equipment !== false) {
                sections.push(this.buildEquipmentSection());
            }
            if (this.state.scope.consumables !== false) {
                sections.push(this.buildConsumablesSection());
            }

            this.detailsEl.innerHTML = this.detailsTpl({ sections: sections });
        },

        buildLinesSection: function() {
            var state = this.state.items.lines || [];
            var allLines = window.PIData.getItems('lines');
            var rows = [];
            allLines.forEach(function(line) {
                var st = state.find(function(s) { return s.id === line.id; }) || {};
                if (!st.selected) return;
                rows.push({
                    cells: [
                        '<strong>' + escapeHtml(line.name) + '</strong>',
                        'Group ' + escapeHtml(line.group),
                        escapeHtml(line.status),
                        escapeHtml(line.type),
                        (st.stations || []).filter(function(ss) { return ss.selected; }).length + ' of ' + (line.stations || []).length + ' stations'
                    ]
                });
            });
            return {
                title: 'Assembly areas + Workstations',
                count: rows.length,
                columns: ['Assembly area name', 'Group', 'Status', 'Type', 'Workstations'],
                items: rows
            };
        },

        buildEquipmentSection: function() {
            var state = this.state.items.equipment || [];
            var allEq = window.PIData.getItems('equipment');
            var rows = [];
            allEq.forEach(function(eq) {
                var st = state.find(function(s) { return s.id === eq.id; }) || {};
                if (!st.selected) return;
                rows.push({
                    cells: [
                        '<strong>' + escapeHtml(eq.name) + '</strong>',
                        escapeHtml(eq.shortName),
                        escapeHtml(eq.engIntent),
                        escapeHtml(eq.mpIntent),
                        classifyLabel(st.retrofit)
                    ]
                });
            });
            return {
                title: 'Tools',
                count: rows.length,
                columns: ['Tools name', 'Short name', 'Eng intent', 'MP intent', 'Classification'],
                items: rows
            };
        },

        buildConsumablesSection: function() {
            var state = this.state.items.consumables || [];
            var allCo = window.PIData.getItems('consumables');
            var rows = [];
            allCo.forEach(function(co) {
                var st = state.find(function(s) { return s.id === co.id; }) || {};
                if (!st.selected) return;
                rows.push({
                    cells: [
                        escapeHtml(co.applicationName),
                        '<strong>' + escapeHtml(co.name) + '</strong>',
                        escapeHtml(co.engIntent),
                        escapeHtml(co.mpIntent),
                        classifyLabel(st.retrofit)
                    ]
                });
            });
            return {
                title: 'Materials',
                count: rows.length,
                columns: ['Application', 'Material name', 'Eng intent', 'MP intent', 'Classification'],
                items: rows
            };
        },

        renderWarnings: function() {
            if (!this.warnEl) return;
            var warnings = [];

            if (this.state.target.siteDiffers) {
                warnings.push('Source and destination sites differ — SOP Files have been excluded automatically.');
            }

            ['lines', 'equipment', 'consumables'].forEach(function(group) {
                if (this.state.scope[group] === false) return;
                var c = window.PIWizardItems.getCounts(group);
                if (c.carry + c.retrofit === 0) {
                    warnings.push('No items selected for ' + group + '. The group will be empty after indexing.');
                }
            }.bind(this));

            this.warnEl.innerHTML = warnings.map(function(w) {
                return '<div class="wizard-review-warning"><lucide-icon name="exclamationmark.triangle.fill"></lucide-icon><span>' + w + '</span></div>';
            }).join('');
        }
    };
})();
