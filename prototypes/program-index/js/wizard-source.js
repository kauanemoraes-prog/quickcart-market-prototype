/**
 * Wizard — Step 1: Source selection (cascading dropdowns).
 * Source Program → Site → Event → Version (published only).
 * Uses custom ProjSelect dropdown widget (not native select).
 */

(function() {
    'use strict';

    function ProjSelect(rootEl, opts) {
        this.root = rootEl;
        this.trigger = rootEl.querySelector('.proj-select__trigger');
        this.value = rootEl.querySelector('.proj-select__value');
        this.menu = rootEl.querySelector('.proj-select__menu');
        this.placeholder = this.value.getAttribute('data-placeholder') || '';
        this.options = [];
        this.selectedValue = '';
        this.onChange = (opts && opts.onChange) || function() {};

        this.trigger.addEventListener('click', this.toggle.bind(this));
        document.addEventListener('click', this.onOutside.bind(this));
        this.menu.addEventListener('click', this.onMenuClick.bind(this));
    }

    ProjSelect.prototype.toggle = function() {
        if (this.trigger.disabled) return;
        if (!this.menu.hidden) this.close();
        else this.open();
    };

    ProjSelect.prototype.open = function() {
        // Close any other open dropdowns
        document.querySelectorAll('.proj-select.is-open').forEach(function(el) {
            if (el !== this.root) {
                el.classList.remove('is-open');
                var m = el.querySelector('.proj-select__menu');
                if (m) m.hidden = true;
            }
        }.bind(this));
        this.menu.hidden = false;
        this.root.classList.add('is-open');
    };

    ProjSelect.prototype.close = function() {
        this.menu.hidden = true;
        this.root.classList.remove('is-open');
    };

    ProjSelect.prototype.onOutside = function(e) {
        if (!this.root.contains(e.target)) this.close();
    };

    ProjSelect.prototype.onMenuClick = function(e) {
        var btn = e.target.closest('.proj-select__option');
        if (!btn || btn.classList.contains('proj-select__option--empty')) return;
        var val = btn.getAttribute('data-value');
        this.setValue(val);
        this.close();
        this.onChange(val);
    };

    ProjSelect.prototype.setOptions = function(options, placeholder) {
        this.options = options || [];
        if (placeholder) this.placeholder = placeholder;
        if (!this.options.length) {
            this.menu.innerHTML = '<button type="button" class="proj-select__option proj-select__option--empty">' + (placeholder || 'No options') + '</button>';
        } else {
            this.menu.innerHTML = this.options.map(function(opt) {
                return '<button type="button" class="proj-select__option" data-value="' + opt.value + '">' + opt.label + '</button>';
            }).join('');
        }
    };

    ProjSelect.prototype.setValue = function(val) {
        this.selectedValue = val || '';
        if (!this.selectedValue) {
            this.value.textContent = this.placeholder;
            this.value.classList.add('is-placeholder');
        } else {
            var opt = this.options.find(function(o) { return o.value === val; });
            if (opt) {
                this.value.textContent = opt.label;
                this.value.classList.remove('is-placeholder');
            }
        }
        this.menu.querySelectorAll('.proj-select__option').forEach(function(btn) {
            btn.classList.toggle('is-selected', btn.getAttribute('data-value') === this.selectedValue);
        }.bind(this));
    };

    ProjSelect.prototype.setDisabled = function(disabled) {
        this.trigger.disabled = !!disabled;
        this.root.classList.toggle('is-disabled', !!disabled);
        if (disabled) this.close();
    };

    ProjSelect.prototype.setPlaceholder = function(text) {
        this.placeholder = text;
        if (!this.selectedValue) this.value.textContent = text;
    };

    window.PIWizardSource = {
        init: function(state) {
            this.state = state;

            var programRoot = document.getElementById('src-program');
            if (!programRoot) return;

            this.programSel = new ProjSelect(programRoot, { onChange: this.onProgramChange.bind(this) });
            this.siteSel = new ProjSelect(document.getElementById('src-site'), { onChange: this.onSiteChange.bind(this) });
            this.eventSel = new ProjSelect(document.getElementById('src-event'), { onChange: this.onEventChange.bind(this) });
            this.versionSel = new ProjSelect(document.getElementById('src-version'), { onChange: this.onVersionChange.bind(this) });

            this.populatePrograms();
            this.restoreFromState();
        },

        populatePrograms: function() {
            var programs = window.PIData.getSourcePrograms();
            this.programSel.setOptions(programs.map(function(p) {
                return { value: p.code, label: p.code + ' — ' + p.name };
            }), 'Select exhibition…');
        },

        onProgramChange: function(val) {
            this.state.source.program = val;
            this.state.source.site = '';
            this.state.source.event = '';
            this.state.source.version = '';
            this.refreshSiteOptions();
            this.refreshEventOptions();
            this.refreshVersionOptions();
            this.persist();
        },

        onSiteChange: function(val) {
            this.state.source.site = val;
            this.state.source.event = '';
            this.state.source.version = '';
            this.refreshEventOptions();
            this.refreshVersionOptions();
            this.persist();
        },

        onEventChange: function(val) {
            this.state.source.event = val;
            this.state.source.version = '';
            this.refreshVersionOptions();
            this.persist();
        },

        onVersionChange: function(val) {
            this.state.source.version = val;
            this.persist();
        },

        refreshSiteOptions: function() {
            var program = this.state.source.program;
            if (!program) {
                this.siteSel.setOptions([], 'Select site…');
                this.siteSel.setValue('');
                this.siteSel.setDisabled(true);
                return;
            }
            var sites = window.PIData.getSites(program);
            this.siteSel.setOptions(sites.map(function(s) { return { value: s.id, label: s.alias }; }), 'Select site…');
            this.siteSel.setDisabled(false);
            this.siteSel.setValue(this.state.source.site || '');
        },

        refreshEventOptions: function() {
            var site = this.state.source.site;
            if (!site) {
                this.eventSel.setOptions([], 'Select event…');
                this.eventSel.setValue('');
                this.eventSel.setDisabled(true);
                return;
            }
            var events = window.PIData.getEvents(site);
            this.eventSel.setOptions(events.map(function(ev) { return { value: ev.id, label: ev.name }; }), 'Select event…');
            this.eventSel.setDisabled(false);
            this.eventSel.setValue(this.state.source.event || '');
        },

        refreshVersionOptions: function() {
            var ev = this.state.source.event;
            if (!ev) {
                this.versionSel.setOptions([], 'Select version…');
                this.versionSel.setValue('');
                this.versionSel.setDisabled(true);
                return;
            }
            var versions = window.PIData.getVersions(ev);
            if (!versions.length) {
                this.versionSel.setOptions([], 'No published versions');
                this.versionSel.setValue('');
                this.versionSel.setDisabled(true);
                return;
            }
            this.versionSel.setOptions(versions.map(function(v) { return { value: v.id, label: v.label }; }), 'Select version…');
            this.versionSel.setDisabled(false);
            this.versionSel.setValue(this.state.source.version || '');
        },

        restoreFromState: function() {
            this.refresh();
        },

        refresh: function() {
            this.programSel.setValue(this.state.source.program || '');
            this.refreshSiteOptions();
            this.refreshEventOptions();
            this.refreshVersionOptions();
        },

        getSummary: function() {
            var s = this.state.source;
            if (!s.program || !s.site || !s.event || !s.version) return null;
            var site = window.PIData.getSiteById(s.site);
            var event = window.PIData.getEventById(s.event);
            var version = window.PIData.getVersionById(s.version);
            return s.program + ' · ' + (site ? site.alias : '') + ' · ' +
                (event ? event.name : '') + ' · ' + (version ? version.label : '');
        },

        getSourceSiteAlias: function() {
            var site = window.PIData.getSiteById(this.state.source.site);
            return site ? site.alias : '';
        },

        isComplete: function() {
            var s = this.state.source;
            return !!(s.program && s.site && s.event && s.version);
        },

        persist: function() {
            if (window.PIWizard && window.PIWizard.persist) window.PIWizard.persist();
            if (window.PIWizardScope && window.PIWizardScope.refreshSopLock) {
                window.PIWizardScope.refreshSopLock();
            }
        }
    };
})();
