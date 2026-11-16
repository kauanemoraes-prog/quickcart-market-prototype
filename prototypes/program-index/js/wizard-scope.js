/**
 * Wizard — Scope toggles in Step 1 (Source).
 * Controls which item groups to bring forward + SOP lock based on site differs.
 * Target build event is auto-defaulted in PIWizard.open(), no UI here.
 */

(function() {
    'use strict';

    window.PIWizardScope = {
        init: function(state) {
            this.state = state;
            this.scopeLines = document.getElementById('scope-lines');
            this.scopeEquipment = document.getElementById('scope-equipment');
            this.scopeConsumables = document.getElementById('scope-consumables');
            this.scopeSop = document.getElementById('scope-sop');
            this.sopRow = document.getElementById('scope-sop-row');
            this.sopNote = document.getElementById('scope-sop-note');

            if (!this.scopeLines) return;

            this.populateCounts();
            ['scope-lines', 'scope-equipment', 'scope-consumables', 'scope-sop'].forEach(function(id) {
                var el = document.getElementById(id);
                el && el.addEventListener('change', this.onScopeChange.bind(this));
            }.bind(this));

            this.restoreFromState();
        },

        populateCounts: function() {
            ['lines', 'equipment', 'consumables'].forEach(function(group) {
                var el = document.getElementById('count-' + group);
                if (el) el.textContent = window.PIData.getItemCount(group) + ' items available';
            });
        },

        onScopeChange: function() {
            this.state.scope.lines = this.scopeLines.checked;
            this.state.scope.equipment = this.scopeEquipment.checked;
            this.state.scope.consumables = this.scopeConsumables.checked;
            if (this.scopeSop && !this.scopeSop.disabled) {
                this.state.scope.sop = this.scopeSop.checked;
            }
            if (window.PIWizard) window.PIWizard.updateStepperEnabled();
            this.persist();
        },

        isComplete: function() {
            var s = this.state.scope;
            return !!(s.lines || s.equipment || s.consumables || s.sop);
        },

        refresh: function() {
            this.restoreFromState();
            this.refreshSopLock();
        },

        refreshSopLock: function() {
            var siteCode = window.PIWizard.targetSiteCode || '';
            var sourceSite = window.PIWizardSource.getSourceSiteAlias();
            var siteDiffers = !!sourceSite && sourceSite !== siteCode;
            this.state.target.siteDiffers = siteDiffers;

            if (!this.scopeSop) return;
            this.scopeSop.disabled = siteDiffers;
            if (siteDiffers) {
                this.scopeSop.checked = false;
                this.state.scope.sop = false;
                this.sopRow.classList.add('scope-toggle--locked');
                if (this.sopNote) this.sopNote.textContent = 'Not transferable across sites';
            } else {
                this.sopRow.classList.remove('scope-toggle--locked');
                if (this.sopNote) this.sopNote.textContent = 'Transferable';
            }
        },

        restoreFromState: function() {
            this.scopeLines.checked = this.state.scope.lines === true;
            this.scopeEquipment.checked = this.state.scope.equipment === true;
            this.scopeConsumables.checked = this.state.scope.consumables === true;
        },

        persist: function() {
            if (window.PIWizard && window.PIWizard.persist) window.PIWizard.persist();
        }
    };
})();
