/**
 * CSV Import Module
 * Handles CSV file import functionality for Design Managers
 */
(function() {
    'use strict';
    
    window.CSVImport = {
        modal: null,
        importBtn: null,
        closeBtn: null,
        cancelBtn: null,
        confirmBtn: null,
        fileInput: null,
        projectSelect: null,
        
        init: function() {
            this.modal = document.getElementById('import-modal');
            this.importBtn = document.getElementById('import-csv-btn');
            this.closeBtn = document.getElementById('close-import-modal');
            this.cancelBtn = document.getElementById('cancel-import');
            this.confirmBtn = document.getElementById('confirm-import');
            this.fileInput = document.getElementById('csv-file');
            this.projectSelect = document.getElementById('target-project');
            
            if (!this.modal || !this.importBtn) {
                console.error('CSVImport: Required elements not found');
                return;
            }
            
            this.bindEvents();
            this.populateProjectSelect();
        },
        
        bindEvents: function() {
            // Open modal
            this.importBtn.addEventListener('click', () => {
                this.openModal();
            });
            
            // Close modal
            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', () => {
                    this.closeModal();
                });
            }
            
            if (this.cancelBtn) {
                this.cancelBtn.addEventListener('click', () => {
                    this.closeModal();
                });
            }
            
            // Close on backdrop click
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
            
            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen()) {
                    this.closeModal();
                }
            });
            
            // File input change
            if (this.fileInput) {
                this.fileInput.addEventListener('change', () => {
                    this.validateForm();
                });
            }
            
            // Project select change
            if (this.projectSelect) {
                this.projectSelect.addEventListener('change', () => {
                    this.validateForm();
                });
            }
            
            // Confirm import
            if (this.confirmBtn) {
                this.confirmBtn.addEventListener('click', () => {
                    this.processImport();
                });
            }
        },
        
        populateProjectSelect: function() {
            if (!this.projectSelect || !window.ProjectSections) return;
            
            const projectData = window.ProjectSections.getProjectData();
            if (!projectData) return;
            
            // Clear existing options except first
            while (this.projectSelect.children.length > 1) {
                this.projectSelect.removeChild(this.projectSelect.lastChild);
            }
            
            // Add project options
            projectData.projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.inclineId;
                option.textContent = `${project.inclineId}${project.description ? ' - ' + project.description : ''}`;
                this.projectSelect.appendChild(option);
            });
        },
        
        openModal: function() {
            this.modal.classList.add('modal-overlay--open');
            this.resetForm();
        },
        
        closeModal: function() {
            this.modal.classList.remove('modal-overlay--open');
            this.resetForm();
        },
        
        isOpen: function() {
            return this.modal.classList.contains('modal-overlay--open');
        },
        
        resetForm: function() {
            if (this.fileInput) this.fileInput.value = '';
            if (this.projectSelect) this.projectSelect.value = '';
            this.validateForm();
        },
        
        validateForm: function() {
            const hasFile = this.fileInput && this.fileInput.files.length > 0;
            const hasProject = this.projectSelect && this.projectSelect.value;
            
            const isValid = hasFile && hasProject;
            
            if (this.confirmBtn) {
                this.confirmBtn.disabled = !isValid;
            }
        },
        
        processImport: function() {
            const file = this.fileInput.files[0];
            const projectId = this.projectSelect.value;
            
            if (!file || !projectId) {
                alert('Please select both a file and target project.');
                return;
            }
            
            // Validate file type
            if (!file.name.toLowerCase().endsWith('.csv')) {
                alert('Please select a CSV file.');
                return;
            }
            
            // Read and parse CSV
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csvData = e.target.result;
                    const managers = this.parseCSV(csvData);
                    
                    if (managers.length === 0) {
                        alert('No valid data found in CSV file.');
                        return;
                    }
                    
                    // Import managers
                    this.importManagers(projectId, managers);
                    
                } catch (error) {
                    console.error('CSV parsing error:', error);
                    alert('Error parsing CSV file. Please check the format.');
                }
            };
            
            reader.onerror = () => {
                alert('Error reading file.');
            };
            
            reader.readAsText(file);
        },
        
        parseCSV: function(csvData) {
            const lines = csvData.split('\n').filter(line => line.trim());
            const managers = [];
            
            // Skip header if it exists (check if first line contains 'name' or 'description')
            let startIndex = 0;
            if (lines.length > 0) {
                const firstLine = lines[0].toLowerCase();
                if (firstLine.includes('name') || firstLine.includes('description')) {
                    startIndex = 1;
                }
            }
            
            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Parse CSV line (handle quoted values)
                const values = this.parseCSVLine(line);
                
                if (values.length > 0 && values[0].trim()) {
                    const manager = {
                        name: values[0].trim(),
                        description: values.length > 1 ? values[1].trim() : null
                    };
                    
                    // Remove empty description
                    if (!manager.description) {
                        manager.description = null;
                    }
                    
                    managers.push(manager);
                }
            }
            
            return managers;
        },
        
        parseCSVLine: function(line) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            
            values.push(current);
            return values;
        },
        
        importManagers: function(projectId, managers) {
            if (!window.ProjectSections) {
                alert('Project system not available.');
                return;
            }
            
            // Add managers to project
            window.ProjectSections.addManagersToProject(projectId, managers);
            
            // Show success message
            const count = managers.length;
            alert(`Successfully imported ${count} Design Manager${count !== 1 ? 's' : ''} to ${projectId}.`);
            
            // Close modal
            this.closeModal();
            
            console.log(`Imported ${count} managers to ${projectId}:`, managers);
        }
    };
})();