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
            this.sitesBody = document.getElementById('drawer-sites-body');
            this.usersBody = document.getElementById('drawer-users-body');

            if (!this.drawer) return;

            this.openBtn && this.openBtn.addEventListener('click', this.open.bind(this));
            this.closeBtn && this.closeBtn.addEventListener('click', this.close.bind(this));
            this.closeFooterBtn && this.closeFooterBtn.addEventListener('click', this.close.bind(this));
            this.drawer.addEventListener('click', function(e) {
                if (e.target === this.drawer) this.close();
            }.bind(this));

            this.initTabs();
            this.renderSites();
            this.renderUsers();
            this.wireRowActions();
        },

        open: function() {
            this.drawer.classList.add('drawer-overlay--open');
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
                var btn = e.target.closest('[data-edit-build-schedule]');
                if (!btn) return;
                var siteCode = btn.getAttribute('data-edit-build-schedule');
                if (window.PIBuildScheduleDrawer) window.PIBuildScheduleDrawer.open(siteCode);
            });
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
