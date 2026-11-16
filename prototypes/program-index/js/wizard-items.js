/**
 * Wizard — Steps 2/3/4: Items selection (Lines+Stations, Equipment, Consumables).
 * Lines have nested stations (expandable, cascading select).
 * Equipment/Consumables are flat lists.
 */

(function() {
    'use strict';

    window.PIWizardItems = {
        init: function(state) {
            this.state = state;
            if (typeof Handlebars === 'undefined') return;

            // Register helpers
            Handlebars.registerHelper('lowercase', function(str) {
                return (str || '').toString().toLowerCase().replace(/\s+/g, '-');
            });
            Handlebars.registerHelper('intentClass', function(str) {
                var v = (str || '').toString().toLowerCase().replace(/\s+/g, '-');
                if (v === 'por') return 'por';
                if (v === 'doe') return 'doe';
                if (v === 'mp-evaluation') return 'mpeval';
                return 'default';
            });

            this.templates = {};
            var tplEls = {
                lines: 'lines-row-template',
                equipment: 'equipment-row-template',
                consumables: 'consumables-row-template'
            };
            Object.keys(tplEls).forEach(function(group) {
                var el = document.getElementById(tplEls[group]);
                if (el) this.templates[group] = Handlebars.compile(el.innerHTML);
            }.bind(this));

            ['lines', 'equipment', 'consumables'].forEach(function(group) {
                this.renderGroup(group);
                this.wireGroup(group);
            }.bind(this));
        },

        refresh: function() {
            ['lines', 'equipment', 'consumables'].forEach(function(group) {
                this.renderGroup(group);
            }.bind(this));
        },

        ensureGroupState: function(group) {
            if (!this.state.items[group]) {
                var items = window.PIData.getItems(group);
                this.state.items[group] = items.map(function(it) {
                    var entry = { id: it.id, selected: false, retrofit: false };
                    if (it.stations && it.stations.length) {
                        entry.expanded = false;
                        entry.stations = it.stations.map(function(st) {
                            return { id: st.id, selected: false, retrofit: false };
                        });
                    }
                    return entry;
                });
            }
            return this.state.items[group];
        },

        renderGroup: function(group, filter) {
            this.ensureGroupState(group);
            var tbody = document.querySelector('[data-items-tbody="' + group + '"]');
            var tpl = this.templates[group];
            if (!tbody || !tpl) return;
            var items = window.PIData.getItems(group);
            var stateMap = {};
            this.state.items[group].forEach(function(s) { stateMap[s.id] = s; });

            var filtered = filter ? items.filter(function(it) {
                var q = filter.toLowerCase();
                var hay = (it.name || '') + ' ' + (it.shortName || '') + ' ' +
                    (it.applicationName || '') + ' ' + (it.description || '');
                return hay.toLowerCase().indexOf(q) !== -1;
            }) : items;

            if (!filtered.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="wizard-items-empty">No items match your search.</td></tr>';
            } else {
                var rows = filtered.map(function(it) {
                    var st = stateMap[it.id] || { selected: false, retrofit: false };
                    var row = Object.assign({}, it, st);
                    if (it.stations && it.stations.length) {
                        var stationStateMap = {};
                        (st.stations || []).forEach(function(ss) { stationStateMap[ss.id] = ss; });
                        row.stations = it.stations.map(function(station) {
                            var ss = stationStateMap[station.id] || { selected: false, retrofit: false };
                            return Object.assign({ lineId: it.id }, station, ss);
                        });
                    }
                    return row;
                });
                tbody.innerHTML = tpl({ items: rows });
            }

            this.updateFooter(group);
            this.updateMasterCheck(group);
        },

        wireGroup: function(group) {
            var search = document.querySelector('[data-items-search="' + group + '"]');
            search && search.addEventListener('input', function(e) {
                this.renderGroup(group, e.target.value);
            }.bind(this));

            var bulkBtns = document.querySelectorAll('[data-bulk-action][data-group="' + group + '"]');
            bulkBtns.forEach(function(btn) {
                btn.addEventListener('click', this.onBulkAction.bind(this, group, btn.getAttribute('data-bulk-action')));
            }.bind(this));

            var master = document.querySelector('[data-master-check="' + group + '"]');
            master && master.addEventListener('change', function(e) {
                var checked = e.target.checked;
                this.state.items[group].forEach(function(s) {
                    s.selected = checked;
                    if (s.stations) s.stations.forEach(function(ss) { ss.selected = checked; });
                });
                this.renderGroup(group, search ? search.value : null);
                this.persist();
            }.bind(this));

            var tbody = document.querySelector('[data-items-tbody="' + group + '"]');
            if (!tbody) return;

            tbody.addEventListener('change', function(e) {
                var lineCheck = e.target.closest('[data-item-check]');
                var stationCheck = e.target.closest('[data-station-check]');
                var stationMaster = e.target.closest('[data-station-master]');
                var stationClass = e.target.closest('[data-station-class]');
                var classSel = e.target.closest('[data-item-class]');

                if (lineCheck) {
                    var id = lineCheck.getAttribute('data-item-id');
                    var s = this.findItem(group, id);
                    if (s) {
                        s.selected = lineCheck.checked;
                        if (s.stations) s.stations.forEach(function(ss) { ss.selected = lineCheck.checked; });
                    }
                    this.syncStationCheckboxes(group, id);
                    this.syncStationMaster(group, id);
                    this.updateFooter(group);
                    this.updateMasterCheck(group);
                    this.persist();
                } else if (stationMaster) {
                    var lineId0 = stationMaster.getAttribute('data-station-line');
                    var line0 = this.findItem(group, lineId0);
                    if (line0 && line0.stations) {
                        line0.stations.forEach(function(ss) { ss.selected = stationMaster.checked; });
                        line0.selected = stationMaster.checked;
                        this.syncStationCheckboxes(group, lineId0);
                        this.syncLineCheckbox(group, lineId0, line0.selected);
                    }
                    this.updateFooter(group);
                    this.updateMasterCheck(group);
                    this.persist();
                } else if (stationCheck) {
                    var lineId = stationCheck.getAttribute('data-station-line');
                    var stationId = stationCheck.getAttribute('data-station-id');
                    var line = this.findItem(group, lineId);
                    if (line && line.stations) {
                        var st = line.stations.find(function(ss) { return ss.id === stationId; });
                        if (st) st.selected = stationCheck.checked;
                        line.selected = line.stations.some(function(ss) { return ss.selected; });
                        this.syncLineCheckbox(group, lineId, line.selected);
                        this.syncStationMaster(group, lineId);
                    }
                    this.updateFooter(group);
                    this.updateMasterCheck(group);
                    this.persist();
                } else if (classSel) {
                    var cid = classSel.getAttribute('data-item-id');
                    var cs = this.findItem(group, cid);
                    if (cs) cs.retrofit = (classSel.value === 'retrofit');
                    this.persist();
                } else if (stationClass) {
                    var sLineId = stationClass.getAttribute('data-station-line');
                    var sStId = stationClass.getAttribute('data-station-id');
                    var sLine = this.findItem(group, sLineId);
                    if (sLine && sLine.stations) {
                        var ss = sLine.stations.find(function(x) { return x.id === sStId; });
                        if (ss) ss.retrofit = (stationClass.value === 'retrofit');
                    }
                    this.persist();
                }
            }.bind(this));

            tbody.addEventListener('click', function(e) {
                var chevron = e.target.closest('[data-toggle-stations]');
                if (!chevron) return;
                var key = chevron.getAttribute('data-toggle-stations');
                var parts = key.split('-');
                var grp = parts.shift();
                var lineId = parts.join('-');
                var line = this.findItem(grp, lineId);
                if (!line) return;
                line.expanded = !line.expanded;
                chevron.classList.toggle('is-expanded', line.expanded);
                document.querySelectorAll('[data-station-of="' + grp + '-' + lineId + '"]').forEach(function(row) {
                    if (line.expanded) row.removeAttribute('hidden');
                    else row.setAttribute('hidden', '');
                });
                this.persist();
            }.bind(this));
        },

        syncStationCheckboxes: function(group, lineId) {
            var line = this.findItem(group, lineId);
            if (!line || !line.stations) return;
            line.stations.forEach(function(ss) {
                var el = document.querySelector('[data-station-check="' + group + '"][data-station-line="' + lineId + '"][data-station-id="' + ss.id + '"]');
                if (el) el.checked = ss.selected;
            });
        },

        syncLineCheckbox: function(group, lineId, checked) {
            var el = document.querySelector('[data-item-check="' + group + '"][data-item-id="' + lineId + '"]');
            if (el) el.checked = checked;
        },

        syncStationMaster: function(group, lineId) {
            var master = document.querySelector('[data-station-master="' + group + '"][data-station-line="' + lineId + '"]');
            if (!master) return;
            var line = this.findItem(group, lineId);
            if (!line || !line.stations) {
                master.checked = false;
                master.indeterminate = false;
                return;
            }
            var sel = line.stations.filter(function(ss) { return ss.selected; }).length;
            master.checked = sel === line.stations.length && line.stations.length > 0;
            master.indeterminate = sel > 0 && sel < line.stations.length;
        },

        onBulkAction: function(group, action) {
            var arr = this.state.items[group] || [];
            switch (action) {
                case 'select-all':
                    arr.forEach(function(s) {
                        s.selected = true;
                        if (s.stations) s.stations.forEach(function(ss) { ss.selected = true; });
                    });
                    break;
                case 'select-none':
                    arr.forEach(function(s) {
                        s.selected = false;
                        if (s.stations) s.stations.forEach(function(ss) { ss.selected = false; });
                    });
                    break;
                case 'all-carry':
                    arr.forEach(function(s) {
                        s.retrofit = false;
                        if (s.stations) s.stations.forEach(function(ss) { ss.retrofit = false; });
                    });
                    break;
                case 'all-retrofit':
                    arr.forEach(function(s) {
                        s.retrofit = true;
                        if (s.stations) s.stations.forEach(function(ss) { ss.retrofit = true; });
                    });
                    break;
            }
            this.renderGroup(group);
            this.persist();
        },

        findItem: function(group, id) {
            var arr = this.state.items[group] || [];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].id === id) return arr[i];
            }
            return null;
        },

        updateFooter: function(group) {
            var footer = document.querySelector('[data-items-footer="' + group + '"]');
            if (!footer) return;
            var arr = this.state.items[group] || [];
            var selected = arr.filter(function(s) { return s.selected; }).length;
            footer.textContent = selected + ' of ' + arr.length + ' selected';
        },

        updateMasterCheck: function(group) {
            var master = document.querySelector('[data-master-check="' + group + '"]');
            if (!master) return;
            var arr = this.state.items[group] || [];
            var selected = arr.filter(function(s) { return s.selected; }).length;
            master.checked = (selected === arr.length && arr.length > 0);
            master.indeterminate = (selected > 0 && selected < arr.length);
        },

        getCounts: function(group) {
            var arr = this.state.items[group] || [];
            var carry = 0, retrofit = 0, excluded = 0;
            arr.forEach(function(s) {
                if (!s.selected) excluded++;
                else if (s.retrofit) retrofit++;
                else carry++;
            });
            return { carry: carry, retrofit: retrofit, excluded: excluded, total: arr.length };
        },

        persist: function() {
            if (window.PIWizard && window.PIWizard.persist) window.PIWizard.persist();
        }
    };
})();
