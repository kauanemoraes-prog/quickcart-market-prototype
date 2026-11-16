/**
 * Wizard core — open/close, navigation, persistence.
 * Coordinates step modules: source, scope, items, review.
 */

(function() {
    'use strict';

    var STORAGE_KEY = 'davinci:program-index-draft';
    var TOTAL_STEPS = 5;

    window.PIWizard = {
        init: function() {
            this.modal = document.getElementById('wizard-modal');
            this.closeBtn = document.getElementById('wizard-close');
            this.cancelBtn = document.getElementById('wizard-cancel');
            this.backBtn = document.getElementById('wizard-back');
            this.nextBtn = document.getElementById('wizard-next');
            this.stepperEl = document.getElementById('wizard-stepper');
            this.steps = this.modal.querySelectorAll('.wizard-step');
            this.panels = this.modal.querySelectorAll('.wizard-panel');

            if (!this.modal) return;

            this.state = this.loadState();
            this.current = 1;

            window.PIWizardSource.init(this.state);
            window.PIWizardScope.init(this.state);
            window.PIWizardItems.init(this.state);
            window.PIWizardReview.init(this.state);

            this.closeBtn.addEventListener('click', this.closeAndPersist.bind(this));
            this.cancelBtn.addEventListener('click', this.cancelAndDiscard.bind(this));
            this.backBtn.addEventListener('click', this.goBack.bind(this));
            this.nextBtn.addEventListener('click', this.goNext.bind(this));

            this.steps.forEach(function(stepBtn) {
                stepBtn.addEventListener('click', function() {
                    var n = parseInt(stepBtn.getAttribute('data-step'), 10);
                    this.goTo(n);
                }.bind(this));
            }.bind(this));

            this.modal.addEventListener('click', function(e) {
                if (e.target === this.modal) this.closeAndPersist();
            }.bind(this));

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && this.modal.classList.contains('modal-overlay--open')) {
                    this.closeAndPersist();
                }
            }.bind(this));
        },

        defaultState: function() {
            return {
                source: { program: '', site: '', event: '', version: '' },
                target: { event: '', siteDiffers: false },
                scope: { lines: false, equipment: false, consumables: false, sop: false },
                items: {}
            };
        },

        loadState: function() {
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return this.defaultState();
                var parsed = JSON.parse(raw);
                return Object.assign(this.defaultState(), parsed);
            } catch (e) {
                return this.defaultState();
            }
        },

        persist: function() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
            } catch (e) { /* quota or disabled */ }
        },

        clearPersisted: function() {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        },

        open: function(siteCode) {
            // Always start fresh on each open
            this.state = this.defaultState();
            window.PIWizardSource.state = this.state;
            window.PIWizardScope.state = this.state;
            window.PIWizardItems.state = this.state;
            window.PIWizardReview.state = this.state;
            this.clearPersisted();

            this.targetSiteCode = siteCode || (window.PIData.TARGET_SITES[0] && window.PIData.TARGET_SITES[0].code);
            // Auto-default target build event to first event of the target site
            var site = window.PIData.getSiteByCode(this.targetSiteCode);
            if (site && site.buildEvents.length) {
                this.state.target.event = site.buildEvents[0].id;
            }
            this.updateContextLabel();

            // Refresh UI on step modules to reflect fresh state
            window.PIWizardSource.refresh();
            window.PIWizardScope.refresh();
            window.PIWizardItems.refresh();

            this.modal.classList.add('modal-overlay--open');
            this.modal.setAttribute('aria-hidden', 'false');
            this.updateStepperEnabled();
            this.goTo(1);
        },

        getTargetSite: function() {
            return window.PIData.getSiteByCode(this.targetSiteCode);
        },

        updateContextLabel: function() {
            var ctx = document.getElementById('wizard-context');
            if (ctx) ctx.textContent = window.PIData.TARGET_PROGRAM + ' · ' + this.targetSiteCode;
        },

        closeAndPersist: function() {
            this.persist();
            this.modal.classList.remove('modal-overlay--open');
            this.modal.setAttribute('aria-hidden', 'true');
        },

        cancelAndDiscard: function() {
            this.clearPersisted();
            this.state = this.defaultState();
            window.PIWizardSource.state = this.state;
            window.PIWizardScope.state = this.state;
            window.PIWizardItems.state = this.state;
            window.PIWizardReview.state = this.state;
            window.PIWizardSource.refresh();
            window.PIWizardScope.refresh();
            window.PIWizardItems.refresh();
            this.modal.classList.remove('modal-overlay--open');
            this.modal.setAttribute('aria-hidden', 'true');
        },

        goTo: function(step) {
            if (step < 1 || step > TOTAL_STEPS) return;
            if (this.shouldSkip(step) && step !== 6) return;
            this.current = step;

            this.steps.forEach(function(el) {
                var n = parseInt(el.getAttribute('data-step'), 10);
                el.classList.toggle('is-active', n === step);
                el.classList.toggle('is-completed', n < step);
            });

            this.panels.forEach(function(panel) {
                panel.classList.toggle('is-active', parseInt(panel.dataset.panel, 10) === step);
            });

            this.updateFooter();

            if (step === 1 && window.PIWizardScope.refresh) window.PIWizardScope.refresh();
            if (step === TOTAL_STEPS && window.PIWizardReview.refresh) window.PIWizardReview.refresh();
        },

        goBack: function() {
            if (this.current > 1) this.goTo(this.current - 1);
        },

        goNext: function() {
            if (this.current === TOTAL_STEPS) {
                this.confirm();
                return;
            }
            // Skip steps that are toggled off
            var next = this.current + 1;
            while (next < TOTAL_STEPS && this.shouldSkip(next)) next++;
            this.goTo(next);
        },

        shouldSkip: function(step) {
            if (step === 2) return this.state.scope.lines === false;
            if (step === 3) return this.state.scope.equipment === false;
            if (step === 4) return this.state.scope.consumables === false;
            return false;
        },

        updateFooter: function() {
            this.backBtn.hidden = (this.current === 1);
            if (this.current === TOTAL_STEPS) {
                this.nextBtn.textContent = 'Confirm & Index';
            } else {
                this.nextBtn.textContent = 'Next';
            }
            // Disable Next on step 1 until source AND at least one scope are picked
            var canAdvance = true;
            if (this.current === 1) {
                if (!window.PIWizardSource.isComplete()) canAdvance = false;
                if (!window.PIWizardScope.isComplete()) canAdvance = false;
            }
            this.nextBtn.disabled = !canAdvance;
        },

        updateStepperEnabled: function() {
            var scope = this.state.scope;
            var stepDisabled = {
                2: scope.lines === false,
                3: scope.equipment === false,
                4: scope.consumables === false
            };
            this.steps.forEach(function(el) {
                var n = parseInt(el.getAttribute('data-step'), 10);
                el.disabled = !!stepDisabled[n];
            });
            this.updateFooter();
        },

        confirm: function() {
            // Simulated processing — in a real app this would call the backend
            this.nextBtn.disabled = true;
            this.nextBtn.textContent = 'Processing…';
            var siteCode = this.targetSiteCode;
            setTimeout(function() {
                this.clearPersisted();
                this.modal.classList.remove('modal-overlay--open');
                if (window.PIDrawer && window.PIDrawer.flagSiteAsIndexed) window.PIDrawer.flagSiteAsIndexed(siteCode);
                if (window.PIBuildScheduleDrawer && window.PIBuildScheduleDrawer.close) window.PIBuildScheduleDrawer.close();
                this.showSuccessToast(siteCode);
                this.state = this.defaultState();
            }.bind(this), 900);
        },

        showSuccessToast: function(siteCode) {
            var toast = document.createElement('div');
            toast.className = 'notification notification--success program-index-toast';
            toast.innerHTML =
                '<div class="notification__icon"><lucide-icon name="checkmark.circle.fill"></lucide-icon></div>' +
                '<div class="notification__content">' +
                '<div class="notification__title">Exhibition indexed successfully</div>' +
                '<div class="notification__message">' + window.PIData.TARGET_PROGRAM + ' · ' + siteCode + ' is now indexed and ready.</div>' +
                '</div>';
            toast.style.position = 'fixed';
            toast.style.top = '24px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.zIndex = '2000';
            toast.style.minWidth = '320px';
            document.body.appendChild(toast);
            setTimeout(function() { toast.remove(); }, 4500);
        }
    };

    // Re-evaluate Next button enable state when source/scope changes
    var origPersist = window.PIWizard.persist;
    window.PIWizard.persist = function() {
        origPersist.call(this);
        this.updateFooter();
    };
})();
