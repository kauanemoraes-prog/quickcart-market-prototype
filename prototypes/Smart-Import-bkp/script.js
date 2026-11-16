// Smart Import Wizard
class SmartImportWizard {
    constructor() {
        this.currentStep = 3; // Starting at step 3 (Validation)
        this.totalSteps = 4;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateWizardState();
    }

    setupEventListeners() {
        // Next button
        const nextBtn = document.querySelector('.modal-footer .btn-primary');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }

        // Back button
        const backBtn = document.querySelector('.btn-icon-only');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.previousStep());
        }

        // Cancel button
        const cancelBtn = document.querySelector('.modal-footer .btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Reset to step 1
                this.currentStep = 1;
                this.updateWizardState();
            });
        }
    }

    updateWizardState() {
        const steps = document.querySelectorAll('.wizard-step');
        const nextBtn = document.querySelector('.modal-footer .btn-primary');
        const backBtn = document.querySelector('.btn-icon-only');

        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('completed', 'active');

            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });

        // Update button states
        if (backBtn) {
            backBtn.style.visibility = this.currentStep > 1 ? 'visible' : 'hidden';
        }

        if (nextBtn) {
            nextBtn.textContent = this.currentStep === this.totalSteps ? 'Finish' : 'Next';
        }

        // Update modal body content based on step
        this.updateModalContent();
    }

    updateModalContent() {
        const modalBody = document.querySelector('.modal-body');
        const nextBtn = document.querySelector('.modal-footer .btn-primary');
        
        switch(this.currentStep) {
            case 1:
                modalBody.innerHTML = `
                    <div class="step-content">
                        <h3>Download Template</h3>
                        <p>Download the tools import template to get started.</p>
                        <button class="btn-primary" style="margin-top: 20px;">
                            📥 Download Template
                        </button>
                    </div>
                `;
                if (nextBtn) nextBtn.disabled = false;
                break;
            case 2:
                modalBody.innerHTML = `
                    <div class="step-content">
                        <h3>Select File</h3>
                        <div class="file-upload-area">
                            <p>Drag and drop your file here or click to browse</p>
                            <input type="file" accept=".xlsx,.xls,.csv" style="margin-top: 10px;">
                        </div>
                    </div>
                `;
                if (nextBtn) nextBtn.disabled = false;
                break;
            case 3:
                this.renderValidationStep();
                break;
            case 4:
                modalBody.innerHTML = `
                    <div class="step-content">
                        <h3>Import Complete</h3>
                        <p>Your tools data has been successfully imported.</p>
                        <div class="import-summary" style="margin-top: 20px;">
                            <p>✓ Items imported: <strong>5</strong></p>
                            <p>✓ Items updated: <strong>3</strong></p>
                        </div>
                    </div>
                `;
                if (nextBtn) nextBtn.disabled = false;
                break;
        }
    }

    renderValidationStep() {
        const modalBody = document.querySelector('.modal-body');
        const nextBtn = document.querySelector('.modal-footer .btn-primary');
        
        // Sample validation data
        const validationData = this.getSampleValidationData();
        
        // Initialize selection state if not exists
        if (!this.selectedRecords) {
            const allRecords = [
                ...validationData.changedRecords.map(r => r.recordId),
                ...validationData.newRecords.map(r => r.recordId)
            ];
            this.selectedRecords = new Set(allRecords);
        }
        
        // Check if import should be disabled
        const hasErrors = validationData.errors.length > 0;
        const hasNoChanges = validationData.summary.changed === 0;
        const noRecordsSelected = this.selectedRecords.size === 0;
        const importDisabled = hasErrors || hasNoChanges || noRecordsSelected;
        
        if (nextBtn) {
            nextBtn.disabled = importDisabled;
            nextBtn.textContent = `Import (${this.selectedRecords.size})`;
        }
        
        modalBody.innerHTML = `
            <div class="validation-content">
                <!-- Summary Statistics -->
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-value">${validationData.summary.total}</div>
                        <div class="stat-label">Total Records</div>
                    </div>
                    <div class="stat-item stat-new">
                        <div class="stat-value">${validationData.summary.new}</div>
                        <div class="stat-label">New</div>
                    </div>
                    <div class="stat-item stat-changed">
                        <div class="stat-value">${validationData.summary.changed}</div>
                        <div class="stat-label">Changed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${validationData.summary.unchanged}</div>
                        <div class="stat-label">Unchanged</div>
                    </div>
                    <div class="stat-item ${validationData.summary.errors > 0 ? 'stat-error' : ''}">
                        <div class="stat-value">${validationData.summary.errors}</div>
                        <div class="stat-label">Errors</div>
                    </div>
                    <div class="stat-item ${validationData.summary.warnings > 0 ? 'stat-warning' : ''}">
                        <div class="stat-value">${validationData.summary.warnings}</div>
                        <div class="stat-label">Warnings</div>
                    </div>
                </div>

                ${hasNoChanges ? `
                    <div class="info-message">
                        <span class="info-icon">ℹ️</span>
                        <span>No changes detected in the uploaded file. Nothing to import.</span>
                    </div>
                ` : ''}

                <!-- Errors Section -->
                ${validationData.errors.length > 0 ? `
                    <div class="validation-section">
                        <div class="section-header error-header">
                            <span class="section-icon">⚠️</span>
                            <span class="section-title">Errors (${validationData.errors.length})</span>
                        </div>
                        <div class="validation-list">
                            ${validationData.errors.map(error => `
                                <div class="validation-item error-item">
                                    <div class="validation-row">
                                        <span class="row-number">Row ${error.row}</span>
                                        <span class="record-id">${error.recordId}</span>
                                    </div>
                                    <div class="validation-detail">
                                        <strong>${error.field}:</strong> ${error.description}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Warnings Section -->
                ${validationData.warnings.length > 0 ? `
                    <div class="validation-section">
                        <div class="section-header warning-header">
                            <span class="section-icon">⚡</span>
                            <span class="section-title">Warnings (${validationData.warnings.length})</span>
                        </div>
                        <div class="validation-list">
                            ${validationData.warnings.map(warning => `
                                <div class="validation-item warning-item">
                                    <div class="validation-row">
                                        <span class="row-number">Row ${warning.row}</span>
                                        <span class="record-id">${warning.recordId}</span>
                                    </div>
                                    <div class="validation-detail">
                                        <strong>${warning.field}:</strong> ${warning.description}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Changed Records Section -->
                ${validationData.changedRecords.length > 0 ? `
                    <div class="validation-section">
                        <div class="section-header changes-header">
                            <input type="checkbox"
                                   id="select-all-changes"
                                   class="select-all-checkbox"
                                   ${this.selectedRecords.size === validationData.changedRecords.length ? 'checked' : ''}
                                   onchange="wizard.toggleAllRecords(this.checked)">
                            <label for="select-all-changes" class="select-all-label">
                                <span class="section-icon">📝</span>
                                <span class="section-title">Changed Records (${this.selectedRecords.size}/${validationData.changedRecords.length} selected)</span>
                            </label>
                        </div>
                        <div class="changed-records-list">
                            ${validationData.changedRecords.map((record, index) => `
                                <details class="changed-record ${record.hasConflict ? 'has-conflict' : ''}" ${index === 0 ? 'open' : ''}>
                                    <summary class="record-summary">
                                        <input type="checkbox"
                                               class="record-checkbox"
                                               data-record-id="${record.recordId}"
                                               ${this.selectedRecords.has(record.recordId) ? 'checked' : ''}
                                               onchange="wizard.toggleRecord('${record.recordId}', this.checked)"
                                               onclick="event.stopPropagation()">
                                        <span class="record-name">${record.recordId}</span>
                                        ${record.hasConflict ? '<span class="conflict-badge">⚠️ Conflict</span>' : ''}
                                        <span class="changes-count">${record.changes.length} field(s) changed</span>
                                    </summary>
                                    <div class="record-changes">
                                        ${record.hasConflict ? `
                                            <div class="conflict-warning">
                                                <strong>⚠️ Conflict Detected:</strong> This record was modified after the template was downloaded.
                                                <div class="conflict-info">
                                                    <div>Current DB value differs from template baseline.</div>
                                                    <div class="conflict-timestamp">Last modified: ${record.conflictInfo.lastModified} by ${record.conflictInfo.modifiedBy}</div>
                                                </div>
                                            </div>
                                        ` : ''}
                                        ${record.changes.map(change => `
                                            <div class="field-change ${change.hasConflict ? 'field-conflict' : ''}">
                                                <div class="field-name">
                                                    ${change.field}
                                                    ${change.hasConflict ? '<span class="conflict-indicator">⚠️</span>' : ''}
                                                </div>
                                                <div class="value-comparison">
                                                    ${change.hasConflict ? `
                                                        <div class="conflict-resolution">
                                                            <div class="conflict-option">
                                                                <input type="radio"
                                                                       name="conflict-${record.recordId}-${change.field}"
                                                                       id="keep-db-${record.recordId}-${change.field}"
                                                                       value="database"
                                                                       onchange="wizard.resolveConflict('${record.recordId}', '${change.field}', 'database')">
                                                                <label for="keep-db-${record.recordId}-${change.field}" class="conflict-value db-value">
                                                                    <span class="value-label">Keep Database:</span>
                                                                    <span class="value">${change.currentDbValue}</span>
                                                                </label>
                                                            </div>
                                                            <div class="conflict-option">
                                                                <input type="radio"
                                                                       name="conflict-${record.recordId}-${change.field}"
                                                                       id="use-import-${record.recordId}-${change.field}"
                                                                       value="import"
                                                                       checked
                                                                       onchange="wizard.resolveConflict('${record.recordId}', '${change.field}', 'import')">
                                                                <label for="use-import-${record.recordId}-${change.field}" class="conflict-value import-value">
                                                                    <span class="value-label">Use Import:</span>
                                                                    <span class="value">${change.newValue}</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ` : `
                                                        <div class="old-value">
                                                            <span class="value-label">Old:</span>
                                                            <span class="value">${change.oldValue || '(empty)'}</span>
                                                        </div>
                                                        <div class="arrow">→</div>
                                                        <div class="new-value">
                                                            <span class="value-label">New:</span>
                                                            <span class="value">${change.newValue}</span>
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- New Records Section -->
                ${validationData.newRecords.length > 0 ? `
                    <div class="validation-section">
                        <div class="section-header new-records-header">
                            <input type="checkbox"
                                   id="select-all-new"
                                   class="select-all-checkbox"
                                   ${this.selectedRecords.size >= validationData.changedRecords.length &&
                                     validationData.newRecords.every(r => this.selectedRecords.has(r.recordId)) ? 'checked' : ''}
                                   onchange="wizard.toggleAllNewRecords(this.checked)">
                            <label for="select-all-new" class="select-all-label">
                                <span class="section-icon">➕</span>
                                <span class="section-title">New Records (${validationData.newRecords.filter(r => this.selectedRecords.has(r.recordId)).length}/${validationData.newRecords.length} selected)</span>
                            </label>
                        </div>
                        <div class="changed-records-list">
                            ${validationData.newRecords.map((record, index) => `
                                <details class="changed-record new-record" ${index === 0 ? 'open' : ''}>
                                    <summary class="record-summary">
                                        <input type="checkbox"
                                               class="record-checkbox"
                                               data-record-id="${record.recordId}"
                                               ${this.selectedRecords.has(record.recordId) ? 'checked' : ''}
                                               onchange="wizard.toggleRecord('${record.recordId}', this.checked)"
                                               onclick="event.stopPropagation()">
                                        <span class="record-name">${record.recordId}</span>
                                        <span class="new-badge">New</span>
                                        <span class="changes-count">${record.recordType || 'Equipment'}</span>
                                    </summary>
                                    <div class="record-changes">
                                        <div class="new-record-info">
                                            <strong>Creating new ${record.recordType || 'Equipment'} record</strong>
                                        </div>
                                        ${record.fields.map(field => `
                                            <div class="field-change">
                                                <div class="field-name">${field.name}</div>
                                                <div class="value-comparison">
                                                    <div class="new-value single-value">
                                                        <span class="value-label">Value:</span>
                                                        <span class="value">${field.value || '(empty)'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    toggleRecord(recordId, checked) {
        if (checked) {
            this.selectedRecords.add(recordId);
        } else {
            this.selectedRecords.delete(recordId);
        }
        this.updateWizardState();
    }

    toggleAllRecords(checked) {
        const validationData = this.getSampleValidationData();
        if (checked) {
            validationData.changedRecords.forEach(record => {
                this.selectedRecords.add(record.recordId);
            });
        } else {
            // Only clear changed records, not new records
            validationData.changedRecords.forEach(record => {
                this.selectedRecords.delete(record.recordId);
            });
        }
        this.updateWizardState();
    }

    toggleAllNewRecords(checked) {
        const validationData = this.getSampleValidationData();
        if (checked) {
            validationData.newRecords.forEach(record => {
                this.selectedRecords.add(record.recordId);
            });
        } else {
            // Only clear new records, not changed records
            validationData.newRecords.forEach(record => {
                this.selectedRecords.delete(record.recordId);
            });
        }
        this.updateWizardState();
    }

    resolveConflict(recordId, field, resolution) {
        // Store conflict resolution
        if (!this.conflictResolutions) {
            this.conflictResolutions = {};
        }
        if (!this.conflictResolutions[recordId]) {
            this.conflictResolutions[recordId] = {};
        }
        this.conflictResolutions[recordId][field] = resolution;
        
        console.log(`Conflict resolved for ${recordId}.${field}: ${resolution}`);
    }

    getSampleValidationData() {
        // Sample data - in real implementation, this would come from file parsing
        return {
            summary: {
                total: 17,
                new: 2,
                changed: 3,
                unchanged: 12,
                errors: 2,
                warnings: 1
            },
            errors: [
                {
                    row: 3,
                    recordId: 'EQ-ROBOT-001',
                    field: 'Cycle Time',
                    description: 'Invalid value: must be a positive number'
                },
                {
                    row: 7,
                    recordId: 'EQ-CONVEYOR-05',
                    field: 'Workstation',
                    description: 'Referenced workstation "ST-999" does not exist'
                }
            ],
            warnings: [
                {
                    row: 5,
                    recordId: 'EQ-TESTER-03',
                    field: 'Manufacturer',
                    description: 'Manufacturer name differs from existing records'
                }
            ],
            changedRecords: [
                {
                    recordId: 'EQ-ROBOT-002',
                    hasConflict: true,
                    conflictInfo: {
                        lastModified: '2024-03-23 14:30',
                        modifiedBy: 'john.doe@company.com'
                    },
                    changes: [
                        {
                            field: 'Cycle Time',
                            oldValue: '45',
                            newValue: '42',
                            hasConflict: true,
                            currentDbValue: '43'
                        },
                        {
                            field: 'Status',
                            oldValue: 'Active',
                            newValue: 'Maintenance',
                            hasConflict: false
                        }
                    ]
                },
                {
                    recordId: 'EQ-TESTER-01',
                    hasConflict: false,
                    changes: [
                        { field: 'Model', oldValue: 'T-100', newValue: 'T-100A', hasConflict: false },
                        { field: 'Calibration Date', oldValue: '2024-01-15', newValue: '2024-03-20', hasConflict: false },
                        { field: 'Notes', oldValue: '', newValue: 'Updated firmware', hasConflict: false }
                    ]
                },
                {
                    recordId: 'EQ-CONVEYOR-03',
                    hasConflict: false,
                    changes: [
                        { field: 'Speed', oldValue: '1.5', newValue: '1.8', hasConflict: false }
                    ]
                }
            ],
            newRecords: [
                {
                    recordId: 'EQ-LASER-NEW-01',
                    recordType: 'Tools',
                    fields: [
                        { name: 'Tools Name', value: 'EQ-LASER-NEW-01' },
                        { name: 'Short Name', value: 'Laser Cutter 01' },
                        { name: 'Workstation', value: 'ST-ASSEMBLY-03' },
                        { name: 'Cycle Time', value: '35' },
                        { name: 'Manufacturer', value: 'LaserTech Inc.' },
                        { name: 'Model', value: 'LT-5000' },
                        { name: 'Status', value: 'Active' }
                    ]
                },
                {
                    recordId: 'VENDOR-ACME-CORP',
                    recordType: 'Tools Vendor',
                    fields: [
                        { name: 'Vendor Name', value: 'ACME Corporation' },
                        { name: 'Contact Email', value: 'sales@acme.com' },
                        { name: 'Contact Phone', value: '+1-555-0123' },
                        { name: 'Address', value: '123 Industrial Blvd, Tech City' },
                        { name: 'Country', value: 'USA' },
                        { name: 'Status', value: 'Active' }
                    ]
                }
            ]
        };
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateWizardState();
        } else {
            // Finish - reset to step 1
            this.currentStep = 1;
            this.updateWizardState();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateWizardState();
        }
    }
}

// Initialize wizard when DOM is loaded
let wizard;
document.addEventListener('DOMContentLoaded', () => {
    wizard = new SmartImportWizard();
});
