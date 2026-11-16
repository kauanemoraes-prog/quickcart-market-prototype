/**
 * Smart Import Wizard - Main JavaScript
 * Uses DaVinci Canvas framework and Monalisa Design System
 */

/**
 * Smart Import Wizard Class
 */
class SmartImportWizard {
    constructor() {
        this.currentStep = 3; // Start at validation step
        this.totalSteps = 4;
        this.selectedRecords = new Set();
        this.conflictResolutions = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateWizardDisplay();
        this.updateSelectedCount();
        this.initializeSelections();
    }

    setupEventListeners() {
        // Modal close handlers
        const closeModal = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('wizard-cancel');
        if (closeModal) closeModal.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // Wizard navigation
        const backBtn = document.getElementById('wizard-back');
        const importBtn = document.getElementById('wizard-import');
        if (backBtn) backBtn.addEventListener('click', () => this.previousStep());
        if (importBtn) importBtn.addEventListener('click', () => this.performImport());

        // Select all checkboxes
        const selectAllChanged = document.getElementById('select-all-changed');
        const selectAllNew = document.getElementById('select-all-new');
        if (selectAllChanged) {
            selectAllChanged.addEventListener('change', (e) => this.toggleAllRecords('changed', e.target.checked));
        }
        if (selectAllNew) {
            selectAllNew.addEventListener('change', (e) => this.toggleAllRecords('new', e.target.checked));
        }

        // Individual record checkboxes
        const recordCheckboxes = document.querySelectorAll('.record-checkbox');
        recordCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const recordId = e.target.dataset.record;
                this.toggleRecord(recordId, e.target.checked);
            });
        });

        // Conflict resolution radios
        const conflictRadios = document.querySelectorAll('input[type="radio"][name^="conflict-"]');
        conflictRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const name = e.target.name;
                const parts = name.split('-');
                const recordId = parts[1];
                const field = parts.slice(2).join('-');
                const resolution = e.target.value;
                this.resolveConflict(recordId, field, resolution);
            });
        });

        // Modal overlay click to close
        const modalOverlay = document.getElementById('smart-import-modal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }
    }

    initializeSelections() {
        // Initialize all records as selected
        const recordCheckboxes = document.querySelectorAll('.record-checkbox');
        recordCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                this.selectedRecords.add(checkbox.dataset.record);
            }
        });
        this.updateSelectedCount();
    }

    toggleRecord(recordId, checked) {
        if (checked) {
            this.selectedRecords.add(recordId);
        } else {
            this.selectedRecords.delete(recordId);
        }
        this.updateSelectedCount();
        this.updateSelectAllStates();
    }

    toggleAllRecords(type, checked) {
        const selector = type === 'changed' ? 
            '.validation-section:nth-of-type(3) .record-checkbox' : 
            '.validation-section:nth-of-type(4) .record-checkbox';
        
        const checkboxes = document.querySelectorAll(selector);
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const recordId = checkbox.dataset.record;
            if (checked) {
                this.selectedRecords.add(recordId);
            } else {
                this.selectedRecords.delete(recordId);
            }
        });
        
        this.updateSelectedCount();
    }

    updateSelectAllStates() {
        // Update changed records select all
        const changedCheckboxes = document.querySelectorAll('.validation-section:nth-of-type(3) .record-checkbox');
        const changedChecked = Array.from(changedCheckboxes).filter(cb => cb.checked).length;
        const selectAllChanged = document.getElementById('select-all-changed');
        if (selectAllChanged) {
            selectAllChanged.checked = changedChecked === changedCheckboxes.length;
            selectAllChanged.indeterminate = changedChecked > 0 && changedChecked < changedCheckboxes.length;
        }

        // Update new records select all
        const newCheckboxes = document.querySelectorAll('.validation-section:nth-of-type(4) .record-checkbox');
        const newChecked = Array.from(newCheckboxes).filter(cb => cb.checked).length;
        const selectAllNew = document.getElementById('select-all-new');
        if (selectAllNew) {
            selectAllNew.checked = newChecked === newCheckboxes.length;
            selectAllNew.indeterminate = newChecked > 0 && newChecked < newCheckboxes.length;
        }

        // Update section titles
        const changedTitle = document.querySelector('.validation-section:nth-of-type(3) .validation-section__title');
        const newTitle = document.querySelector('.validation-section:nth-of-type(4) .validation-section__title');
        
        if (changedTitle) {
            changedTitle.textContent = `Changed Records (${changedChecked}/${changedCheckboxes.length} selected)`;
        }
        if (newTitle) {
            newTitle.textContent = `New Records (${newChecked}/${newCheckboxes.length} selected)`;
        }
    }

    updateSelectedCount() {
        const importBtn = document.getElementById('wizard-import');
        if (importBtn) {
            const count = this.selectedRecords.size;
            importBtn.textContent = `Import (${count})`;
            
            // Check if import should be disabled
            const hasErrors = document.querySelectorAll('.notification--error').length > 0;
            const hasNoSelection = count === 0;
            
            importBtn.disabled = hasErrors || hasNoSelection;
        }
    }

    resolveConflict(recordId, field, resolution) {
        if (!this.conflictResolutions[recordId]) {
            this.conflictResolutions[recordId] = {};
        }
        this.conflictResolutions[recordId][field] = resolution;
        
        console.log(`Conflict resolved for ${recordId}.${field}: ${resolution}`);
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateWizardDisplay();
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateWizardDisplay();
        }
    }

    updateWizardDisplay() {
        // Update step indicators
        const steps = document.querySelectorAll('.wizard-step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('wizard-step--completed', 'wizard-step--active');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('wizard-step--completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('wizard-step--active');
            }
        });

        // Show/hide step content
        const stepContents = document.querySelectorAll('.wizard-step-content');
        stepContents.forEach((content, index) => {
            const stepNumber = index + 1;
            content.style.display = stepNumber === this.currentStep ? 'block' : 'none';
        });

        // Update footer buttons
        this.updateFooterButtons();
    }

    updateFooterButtons() {
        const backBtn = document.getElementById('wizard-back');
        const importBtn = document.getElementById('wizard-import');

        // Update back button visibility
        if (backBtn) {
            backBtn.style.visibility = this.currentStep > 1 ? 'visible' : 'hidden';
        }

        // Update import/next button
        if (importBtn) {
            if (this.currentStep === 3) {
                // Validation step - show Import button
                importBtn.textContent = `Import (${this.selectedRecords.size})`;
                importBtn.onclick = () => this.performImport();
                
                // Check if import should be disabled
                const hasErrors = document.querySelectorAll('.notification--error').length > 0;
                const hasNoSelection = this.selectedRecords.size === 0;
                importBtn.disabled = hasErrors || hasNoSelection;
            } else if (this.currentStep === 4) {
                // Import complete step - show Finish button
                importBtn.textContent = 'Finish';
                importBtn.disabled = false;
                importBtn.onclick = () => this.closeModal();
            } else {
                // Other steps - show Next button
                importBtn.textContent = 'Next';
                importBtn.disabled = false;
                importBtn.onclick = () => this.nextStep();
            }
        }
    }

    performImport() {
        if (this.selectedRecords.size === 0) {
            if (window.showNotification) {
                showNotification('warning', 'Please select at least one record to import');
            }
            return;
        }

        // Collect import data
        const importData = {
            selectedRecords: Array.from(this.selectedRecords),
            conflictResolutions: this.conflictResolutions,
            timestamp: new Date().toISOString()
        };

        console.log('Import data:', importData);

        // Show success notification
        if (window.showNotification) {
            showNotification('success', `Successfully imported ${this.selectedRecords.size} record(s)`);
        }

        // Navigate to step 4 (Import Complete)
        this.currentStep = 4;
        this.updateWizardDisplay();
    }

    closeModal() {
        const modal = document.getElementById('smart-import-modal');
        if (modal) {
            modal.classList.remove('modal-overlay--open');
        }
    }

    openModal() {
        const modal = document.getElementById('smart-import-modal');
        if (modal) {
            modal.classList.add('modal-overlay--open');
        }
    }
}

/**
 * Initialize the Smart Import Wizard
 */
function init() {
    // Initialize the wizard
    const wizard = new SmartImportWizard();
    
    // Make wizard globally accessible for debugging
    window.smartImportWizard = wizard;
    
    console.log('Smart Import Wizard initialized successfully');
}

/**
 * CRITICAL: DaVinci Canvas initialization pattern
 * This pattern ensures the wizard initializes after the canvas is ready
 */
(function() {
    let initialized = false;
    
    function safeInit() {
        if (initialized) return;
        initialized = true;
        
        try {
            init();
        } catch (err) {
            console.error('Smart Import initialization failed:', err);
        }
    }
    
    // Primary: Listen for canvas ready event
    document.addEventListener('davinci:canvas:ready', safeInit);
    
    // Fallback: If canvas is already loaded or event was missed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Give canvas a moment to dispatch event
            setTimeout(() => {
                if (!initialized && document.querySelector('.main-container')) {
                    console.warn('Canvas ready event missed, using fallback initialization');
                    safeInit();
                }
            }, 100);
        });
    } else {
        // DOM already loaded, check immediately
        setTimeout(() => {
            if (!initialized && document.querySelector('.main-container')) {
                console.warn('Canvas ready event missed, using fallback initialization');
                safeInit();
            }
        }, 100);
    }
})();