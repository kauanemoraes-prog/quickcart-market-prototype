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
            var firstEvent = site.buildEvents && site.buildEvents[0];
            var firstIsPublished = firstEvent && firstEvent.pfStatus === 'Published';

            if (site.indexed) {
                this.indexBtn.textContent = '✓ Indexed';
                this.indexBtn.disabled = true;
                this.indexBtn.removeAttribute('data-proj-tooltip');
                this.indexBtn.removeAttribute('data-proj-tooltip-placement');
            } else if (firstIsPublished) {
                this.indexBtn.textContent = 'Index';
                this.indexBtn.disabled = true;
                this.indexBtn.setAttribute('data-proj-tooltip', 'Index is not available when the first project phase already has published content.');
                this.indexBtn.setAttribute('data-proj-tooltip-placement', 'bottom');
            } else {
                this.indexBtn.textContent = 'Index';
                this.indexBtn.disabled = false;
                this.indexBtn.removeAttribute('data-proj-tooltip');
                this.indexBtn.removeAttribute('data-proj-tooltip-placement');
            }
        },

        onIndexClick: function() {
            if (!this.currentSiteCode) return;
            if (window.PIWizard) window.PIWizard.open(this.currentSiteCode);
        }
    };
})();
