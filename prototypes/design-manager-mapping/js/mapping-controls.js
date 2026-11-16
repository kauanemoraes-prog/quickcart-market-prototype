/**
 * Mapping Controls Module
 * Handles edit and remove actions for mapped Design Managers
 */
(function() {
    'use strict';
    
    window.MappingControls = {
        init: function() {
            this.bindEvents();
        },
        
        bindEvents: function() {
            // Use event delegation for dynamically created elements
            document.addEventListener('click', (e) => {
                if (e.target.closest('.btn-edit')) {
                    const btn = e.target.closest('.btn-edit');
                    const managerId = btn.dataset.managerId;
                    this.editMapping(managerId);
                } else if (e.target.closest('.btn-remove')) {
                    const btn = e.target.closest('.btn-remove');
                    const managerId = btn.dataset.managerId;
                    this.removeMapping(managerId);
                }
            });
        },
        
        editMapping: function(managerId) {
            const manager = this.findManagerById(managerId);
            if (!manager || manager.isAutoMatched) {
                console.warn('Cannot edit auto-matched manager');
                return;
            }
            
            // Find the manager's row
            const row = document.querySelector(`[data-manager-id="${managerId}"]`);
            if (!row) return;
            
            const statusCell = row.querySelector('.mapping-status');
            if (!statusCell) return;
            
            // Get project ID to filter available vendors
            const projectSection = row.closest('.incline-project-section');
            const projectId = projectSection ? projectSection.dataset.projectId : null;
            
            // Create select dropdown
            const select = document.createElement('select');
            select.className = 'form-select form-select--table-cell vendor-select-edit';
            select.dataset.managerId = managerId;
            select.dataset.projectId = projectId;
            
            // Add current mapping as first option
            const currentOption = document.createElement('option');
            currentOption.value = manager.mappedVendor;
            currentOption.textContent = manager.mappedVendor;
            currentOption.selected = true;
            select.appendChild(currentOption);
            
            // Add separator
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            select.appendChild(separator);
            
            // Add available vendors
            const availableVendors = this.getAvailableVendorsForEdit(projectId, managerId);
            availableVendors.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor;
                option.textContent = vendor;
                select.appendChild(option);
            });
            
            // Add "Remove mapping" option
            const removeOption = document.createElement('option');
            removeOption.value = '';
            removeOption.textContent = 'Remove mapping';
            select.appendChild(removeOption);
            
            // Replace status content with select
            const originalContent = statusCell.innerHTML;
            statusCell.innerHTML = '';
            statusCell.appendChild(select);
            
            select.focus();
            
            // Handle selection
            const handleSelection = () => {
                const newVendor = select.value;
                
                if (newVendor === '') {
                    // Remove mapping
                    this.removeMapping(managerId);
                } else if (newVendor !== manager.mappedVendor) {
                    // Update mapping
                    this.updateMapping(managerId, newVendor);
                } else {
                    // No change, restore original
                    statusCell.innerHTML = originalContent;
                }
            };
            
            const cancelEdit = () => {
                statusCell.innerHTML = originalContent;
            };
            
            select.addEventListener('change', handleSelection);
            select.addEventListener('blur', cancelEdit);
            select.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSelection();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            });
        },
        
        removeMapping: function(managerId) {
            const manager = this.findManagerById(managerId);
            if (!manager || manager.isAutoMatched) {
                console.warn('Cannot remove auto-matched manager');
                return;
            }
            
            // Confirm removal
            if (!confirm(`Remove mapping for ${manager.name}?`)) {
                return;
            }
            
            // Update data
            manager.mappedVendor = null;
            
            console.log(`Removed mapping for ${manager.name}`);
            
            // Refresh display
            if (window.ProjectSections) {
                window.ProjectSections.loadProjects();
            }
        },
        
        updateMapping: function(managerId, newVendor) {
            const manager = this.findManagerById(managerId);
            if (!manager) return;
            
            // Update data
            manager.mappedVendor = newVendor;
            
            console.log(`Updated mapping for ${manager.name} to ${newVendor}`);
            
            // Refresh display
            if (window.ProjectSections) {
                window.ProjectSections.loadProjects();
            }
        },
        
        findManagerById: function(managerId) {
            if (!window.ProjectSections) return null;
            
            const projectData = window.ProjectSections.getProjectData();
            if (!projectData) return null;
            
            for (let project of projectData.projects) {
                const manager = project.designManagers.find(dm => dm.id === managerId);
                if (manager) return manager;
            }
            
            return null;
        },
        
        getAvailableVendorsForEdit: function(projectId, managerId) {
            if (!window.ProjectSections) return [];
            
            const projectData = window.ProjectSections.getProjectData();
            if (!projectData) return [];
            
            const project = projectData.projects.find(p => p.inclineId === projectId);
            if (!project) return [];
            
            // Get all available vendors for this project
            const allVendors = window.ProjectSections.availableVendors[projectId] || [];
            
            // Filter out vendors already mapped to OTHER managers in this project
            const mappedVendors = project.designManagers
                .filter(dm => dm.mappedVendor && dm.id !== managerId)
                .map(dm => dm.mappedVendor);
            
            return allVendors.filter(vendor => !mappedVendors.includes(vendor));
        }
    };
})();