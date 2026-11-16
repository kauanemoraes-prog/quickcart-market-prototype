/**
 * Drawer Module — Program drawer + tabs + Sites/Users renders.
 */

(function() {
    'use strict';

    window.PIDrawer = {
        init: function() {
            this.openBtn = document.getElementById('open-program-drawer-btn');
            this.drawer = document.getElementById('program-drawer');
            this.closeBtn = document.getElementById('program-drawer-close');
            this.closeFooterBtn = document.getElementById('program-drawer-close-btn');
            this.addBtn = document.getElementById('program-drawer-add-btn');
            this.sitesBody = document.getElementById('drawer-sites-body');
            this.usersBody = document.getElementById('drawer-users-body');

            if (!this.drawer) return;

            this.openBtn && this.openBtn.addEventListener('click', this.open.bind(this));
            this.closeBtn && this.closeBtn.addEventListener('click', this.close.bind(this));
            this.closeFooterBtn && this.closeFooterBtn.addEventListener('click', this.close.bind(this));
            this.addBtn && this.addBtn.addEventListener('click', this.onAddClick.bind(this));
            this.drawer.addEventListener('click', function(e) {
                if (e.target === this.drawer) this.close();
            }.bind(this));

            // Perform-Index confirmation modal wiring.
            this.performIndexModal = document.getElementById('perform-index-modal');
            var proceedBtn = document.getElementById('perform-index-proceed-btn');
            var sitePicker = document.getElementById('perform-index-site-picker');
            var choiceInputs = this.performIndexModal
                ? this.performIndexModal.querySelectorAll('input[name="perform-index-choice"]')
                : [];
            choiceInputs.forEach(function(input) {
                input.addEventListener('change', function() {
                    if (sitePicker) sitePicker.hidden = input.value !== 'index' || !input.checked;
                });
            });
            if (proceedBtn) proceedBtn.addEventListener('click', function() {
                var checked = this.performIndexModal.querySelector('input[name="perform-index-choice"]:checked');
                var choice = checked ? checked.value : 'add';
                this.closePerformIndexModal();
                if (choice === 'index') {
                    if (window.ProgramWizard) window.ProgramWizard.open({ mode: 'skip-first' });
                } else {
                    this.onAddProgram();
                }
            }.bind(this));
            if (this.performIndexModal) {
                this.performIndexModal.addEventListener('click', function(e) {
                    if (e.target === this.performIndexModal) this.closePerformIndexModal();
                }.bind(this));
            }

            this.initTabs();
            this.renderSites();
            this.renderUsers();
            this.wireRowActions();
            this.wireAddSite();

            // Auto-open when arriving via "?open=drawer" (e.g., "Add Program → From scratch").
            try {
                var params = new URLSearchParams(window.location.search);
                if (params.get('open') === 'drawer') this.open();
            } catch (err) {}
        },

        /**
         * Commit a new program from the "From scratch" drawer into the listing.
         * Grabs Program Code + Name + Admin from the drawer inputs, adds via
         * ProgramsData.add, re-renders the listing table, closes the drawer,
         * and shows an MDS toast.
         */
        onAddProgram: function() {
            var codeEl = document.getElementById('pgm-code');
            var nameEl = document.getElementById('pgm-name');
            var adminEl = document.getElementById('pgm-admin');
            var code = (codeEl && codeEl.value.trim()) || 'NEW';
            var name = (nameEl && nameEl.value.trim()) || '';
            var admin = (adminEl && adminEl.value.trim()) || '';

            if (window.ProgramsData && window.ProgramsData.add) {
                window.ProgramsData.add({
                    code: code,
                    name: name,
                    admin: admin,
                    lastUpdate: '28 Jul 2026',
                    favorite: false,
                    sites: []
                });
            }
            if (window.TableRenderer) window.TableRenderer.render();
            if (window.TableSort) window.TableSort.init();
            if (window.RowExpander) window.RowExpander.init();
            if (window.Favorites) window.Favorites.init();
            if (window.ActionButtons) window.ActionButtons.init();

            this.close();

            if (typeof window.showNotification === 'function') {
                window.showNotification('success', 'Exhibition ' + code + ' has been added.');
            }
        },

        open: function() {
            this.drawer.classList.add('drawer-overlay--open');
        },

        onAddClick: function() {
            if (this.performIndexModal) this.performIndexModal.classList.add('modal-overlay--open');
        },

        closePerformIndexModal: function() {
            if (this.performIndexModal) this.performIndexModal.classList.remove('modal-overlay--open');
        },

        close: function() {
            this.drawer.classList.remove('drawer-overlay--open');
        },

        initTabs: function() {
            var tabs = this.drawer.querySelectorAll('[data-drawer-tab]');
            var contents = this.drawer.querySelectorAll('.drawer-tab-content');

            tabs.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var target = btn.getAttribute('data-drawer-tab');
                    tabs.forEach(function(b) { b.classList.remove('drawer-tab--active'); });
                    contents.forEach(function(c) { c.classList.remove('drawer-tab-content--active'); });
                    btn.classList.add('drawer-tab--active');
                    var panel = document.getElementById('drawer-' + target);
                    if (panel) panel.classList.add('drawer-tab-content--active');
                });
            });
        },

        renderSites: function() {
            if (!this.sitesBody || typeof Handlebars === 'undefined') return;
            var tplEl = document.getElementById('sites-row-template');
            if (!tplEl) return;
            var tpl = Handlebars.compile(tplEl.innerHTML);
            this.sitesBody.innerHTML = tpl({ sites: window.PIData.TARGET_SITES });
            this.wireSiteEditors();
        },

        /**
         * Wire per-row editable fields on the Sites table:
         *  - Site code: autocomplete against SOURCE site codes. Free text allowed too.
         *  - Program Alias: free-text input, persisted back to TARGET_SITES.
         * Called after every renderSites() since the DOM is rebuilt from the template.
         */
        wireSiteEditors: function() {
            if (!this.sitesBody || !window.PIData) return;
            var allSites = this.collectAllSiteCodes();
            var rows = this.sitesBody.querySelectorAll('.sites-table__row');
            rows.forEach(function(row) {
                var siteId = row.getAttribute('data-site-id');
                var target = this.findSiteById(siteId);
                if (!target) return;

                var siteInput = row.querySelector('[data-site-input]');
                var menu = row.querySelector('[data-site-menu]');
                if (siteInput && menu) {
                    var renderMenu = function(filter) {
                        var q = (filter || '').toLowerCase().trim();
                        var matches = allSites.filter(function(code) {
                            return !q || code.toLowerCase().indexOf(q) !== -1;
                        }).slice(0, 8);
                        if (!matches.length) { menu.hidden = true; menu.innerHTML = ''; return; }
                        menu.innerHTML = matches.map(function(code) {
                            return '<li class="site-autocomplete__option" data-value="' + code + '">' + code + '</li>';
                        }).join('');
                        menu.hidden = false;
                    };
                    siteInput.addEventListener('focus', function() { renderMenu(siteInput.value); });
                    siteInput.addEventListener('input', function() {
                        target.code = siteInput.value;
                        renderMenu(siteInput.value);
                    });
                    menu.addEventListener('mousedown', function(e) {
                        var opt = e.target.closest('.site-autocomplete__option');
                        if (!opt) return;
                        e.preventDefault();
                        var val = opt.getAttribute('data-value');
                        siteInput.value = val;
                        target.code = val;
                        menu.hidden = true;
                    });
                    siteInput.addEventListener('blur', function() {
                        setTimeout(function() { menu.hidden = true; }, 120);
                    });
                }

                var aliasInput = row.querySelector('[data-site-alias]');
                if (aliasInput) {
                    aliasInput.addEventListener('input', function() {
                        target.alias = aliasInput.value;
                    });
                }
            }.bind(this));
        },

        /**
         * Union of every SOURCE program's SITES aliases — the autocomplete pool.
         * Deduplicated. Falls back to a small stub list if PIData.SITES is unavailable.
         */
        collectAllSiteCodes: function() {
            if (!window.PIData || !window.PIData.SITES) return [];
            var seen = {};
            var out = [];
            Object.keys(window.PIData.SITES).forEach(function(programCode) {
                (window.PIData.SITES[programCode] || []).forEach(function(site) {
                    var code = (site.alias || '').toString();
                    if (code && !seen[code]) { seen[code] = true; out.push(code); }
                });
            });
            return out.sort();
        },

        findSiteById: function(id) {
            var arr = window.PIData && window.PIData.TARGET_SITES;
            if (!arr) return null;
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].id === id) return arr[i];
            }
            return null;
        },

        renderUsers: function() {
            if (!this.usersBody || typeof Handlebars === 'undefined') return;
            var tplEl = document.getElementById('users-row-template');
            if (!tplEl) return;
            var tpl = Handlebars.compile(tplEl.innerHTML);
            this.usersBody.innerHTML = tpl({ users: window.PIData.PROGRAM_USERS });
        },

        wireRowActions: function() {
            if (!this.sitesBody) return;
            this.sitesBody.addEventListener('click', function(e) {
                var editBtn = e.target.closest('[data-edit-build-schedule]');
                if (editBtn) {
                    var siteCode = editBtn.getAttribute('data-edit-build-schedule');
                    if (window.PIBuildScheduleDrawer) window.PIBuildScheduleDrawer.open(siteCode);
                    return;
                }
                var indexBtn = e.target.closest('[data-index-site]');
                if (indexBtn && !indexBtn.disabled) {
                    // Skip step 1 (New Program details) since the site row already has that context.
                    if (window.ProgramWizard) window.ProgramWizard.open({ mode: 'skip-first' });
                }
            });
        },

        /**
         * Wire the "+" plus button in the Sites table header. Clicking it prepends
         * a brand-new empty site to TARGET_SITES and re-renders so the new row
         * appears at the top of the table. Row count is used to auto-name.
         */
        wireAddSite: function() {
            var addBtn = this.drawer && this.drawer.querySelector('.sites-table__add');
            if (!addBtn) return;
            addBtn.addEventListener('click', function() {
                if (!window.PIData || !window.PIData.TARGET_SITES) return;
                window.PIData.TARGET_SITES.unshift({
                    id: 'site-new-' + Date.now(),
                    code: '',
                    alias: '',
                    indexed: false,
                    buildEvents: []
                });
                this.renderSites();
            }.bind(this));
        },

        flagSiteAsIndexed: function(siteCode) {
            var site = window.PIData.getSiteByCode(siteCode);
            if (site) {
                site.indexed = true;
                site.buildEvents = site.buildEvents.map(function(ev, idx) {
                    return Object.assign({}, ev, { active: idx === 0 ? false : ev.active });
                });
            }
            this.renderSites();
        }
    };
})();
