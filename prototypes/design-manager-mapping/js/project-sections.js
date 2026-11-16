/**
 * Project Sections Module
 * Handles expandable sections, inline editing, and project data management
 */
(function() {
    'use strict';
    
    window.ProjectSections = {
        container: null,
        template: null,
        projectData: null,
        
        init: function() {
            this.container = document.getElementById('incline-projects-container');
            this.template = Handlebars.compile(document.getElementById('incline-project-template').innerHTML);
            
            if (!this.container || !this.template) {
                console.error('ProjectSections: Required elements not found');
                return;
            }
            
            this.initializeData();
        },
        
        initializeData: function() {
            // Mock data - in real app this would come from API
            this.projectData = {
                projects: [
                    {
                        inclineId: 'INCL-001',
                        description: 'Main campus infrastructure project',
                        designManagers: [
                            {
                                id: 'dm-001',
                                name: 'John Smith',
                                description: 'Senior Design Manager - Electrical Systems',
                                mappedVendor: 'QuickCart Market Electrical',
                                isAutoMatched: true
                            },
                            {
                                id: 'dm-002',
                                name: 'Sarah Johnson',
                                description: 'Design Manager - HVAC Systems',
                                mappedVendor: 'QuickCart Market HVAC',
                                isAutoMatched: false
                            },
                            {
                                id: 'dm-003',
                                name: 'Mike Davis',
                                description: 'Design Manager - Plumbing',
                                mappedVendor: null,
                                isAutoMatched: false
                            }
                        ]
                    },
                    {
                        inclineId: 'INCL-002',
                        description: null,
                        designManagers: [
                            {
                                id: 'dm-004',
                                name: 'Lisa Chen',
                                description: 'Design Manager - Structural',
                                mappedVendor: 'QuickCart Market Structural',
                                isAutoMatched: true
                            },
                            {
                                id: 'dm-005',
                                name: 'Robert Wilson',
                                description: null,
                                mappedVendor: null,
                                isAutoMatched: false
                            }
                        ]
                    },
                    {
                        inclineId: 'INCL-003',
                        description: 'Research facility expansion',
                        designManagers: [
                            {
                                id: 'dm-006',
                                name: 'Emily Brown',
                                description: 'Senior Design Manager - Laboratory Systems',
                                mappedVendor: 'QuickCart Market Lab Systems',
                                isAutoMatched: false
                            },
                            {
                                id: 'dm-007',
                                name: 'David Martinez',
                                description: 'Design Manager - Security Systems',
                                mappedVendor: null,
                                isAutoMatched: false
                            }
                        ]
                    }
                ]
            };
            
            // Available vendors per project (mock data)
            this.availableVendors = {
                'INCL-001': ['QuickCart Market Mechanical', 'QuickCart Market Fire Safety', 'QuickCart Market Technology'],
                'INCL-002': ['QuickCart Market Mechanical', 'QuickCart Market Fire Safety', 'QuickCart Market Technology', 'QuickCart Market Landscaping'],
                'INCL-003': ['QuickCart Market Mechanical', 'QuickCart Market Fire Safety', 'QuickCart Market Clean Room']
            };
        },
        
        loadProjects: function() {
            if (!this.container || !this.template) return;
            
            this.container.innerHTML = this.template(this.projectData);
            this.bindEvents();
            this.populateVendorSelects();
            this.updateStats();
        },
        
        bindEvents: function() {
            // Section toggle (expand/collapse)
            this.container.addEventListener('click', (e) => {
                if (e.target.closest('.section-header')) {
                    const header = e.target.closest('.section-header');
                    const projectId = header.dataset.projectId;
                    this.toggleSection(projectId);
                }
            });
            
            // Description editing
            this.container.addEventListener('click', (e) => {
                if (e.target.closest('.btn-edit-description')) {
                    e.stopPropagation(); // Prevent section toggle
                    const btn = e.target.closest('.btn-edit-description');
                    const projectId = btn.dataset.projectId;
                    this.startEditingDescription(projectId);
                }
            });
        },
        
        toggleSection: function(projectId) {
            const content = document.querySelector(`[data-project-id="${projectId}"].section-content`);
            const toggle = document.querySelector(`[data-project-id="${projectId}"].section-toggle`);
            
            if (!content || !toggle) return;
            
            const isExpanded = content.style.display !== 'none';
            
            if (isExpanded) {
                content.style.display = 'none';
                toggle.classList.remove('expanded');
            } else {
                content.style.display = 'block';
                toggle.classList.add('expanded');
            }
        },
        
        startEditingDescription: function(projectId) {
            const descSpan = document.querySelector(`[data-project-id="${projectId}"].section-description`);
            if (!descSpan) return;
            
            const currentText = descSpan.textContent === 'No description' ? '' : descSpan.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'description-edit-input';
            input.value = currentText;
            input.placeholder = 'Enter description';
            
            // Replace span with input
            descSpan.parentNode.replaceChild(input, descSpan);
            input.focus();
            input.select();
            
            // Handle save/cancel
            const saveEdit = () => {
                const newValue = input.value.trim();
                this.saveDescription(projectId, newValue);
                this.loadProjects(); // Refresh to show updated description
            };
            
            const cancelEdit = () => {
                this.loadProjects(); // Refresh to restore original
            };
            
            input.addEventListener('blur', saveEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            });
        },
        
        saveDescription: function(projectId, description) {
            const project = this.projectData.projects.find(p => p.inclineId === projectId);
            if (project) {
                project.description = description || null;
                console.log(`Updated description for ${projectId}:`, description);
            }
        },
        
        populateVendorSelects: function() {
            const selects = this.container.querySelectorAll('.vendor-select');
            
            selects.forEach(select => {
                const projectId = select.dataset.projectId;
                const managerId = select.dataset.managerId;
                
                // Clear existing options except first
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                
                // Get available vendors for this project
                const vendors = this.getAvailableVendorsForProject(projectId);
                
                vendors.forEach(vendor => {
                    const option = document.createElement('option');
                    option.value = vendor;
                    option.textContent = vendor;
                    select.appendChild(option);
                });
                
                // Handle vendor selection
                select.addEventListener('change', (e) => {
                    const selectedVendor = e.target.value;
                    if (selectedVendor) {
                        this.mapManagerToVendor(managerId, selectedVendor);
                    }
                });
            });
        },
        
        getAvailableVendorsForProject: function(projectId) {
            const allVendors = this.availableVendors[projectId] || [];
            const project = this.projectData.projects.find(p => p.inclineId === projectId);
            
            if (!project) return allVendors;
            
            // Filter out vendors already mapped to other managers in this project
            const mappedVendors = project.designManagers
                .filter(dm => dm.mappedVendor)
                .map(dm => dm.mappedVendor);
            
            return allVendors.filter(vendor => !mappedVendors.includes(vendor));
        },
        
        mapManagerToVendor: function(managerId, vendor) {
            // Find and update the manager
            for (let project of this.projectData.projects) {
                const manager = project.designManagers.find(dm => dm.id === managerId);
                if (manager) {
                    manager.mappedVendor = vendor;
                    manager.isAutoMatched = false;
                    console.log(`Mapped ${manager.name} to ${vendor}`);
                    
                    // Refresh the display
                    this.loadProjects();
                    break;
                }
            }
        },
        
        updateStats: function() {
            let totalManagers = 0;
            let mappedCount = 0;
            
            this.projectData.projects.forEach(project => {
                totalManagers += project.designManagers.length;
                mappedCount += project.designManagers.filter(dm => dm.mappedVendor).length;
            });
            
            const totalProjects = this.projectData.projects.length;
            const unmappedCount = totalManagers - mappedCount;
            
            // Update stats in main page
            const totalProjectsEl = document.getElementById('total-projects');
            const totalManagersEl = document.getElementById('total-managers');
            const mappedCountEl = document.getElementById('mapped-count');
            const unmappedCountEl = document.getElementById('unmapped-count');
            
            if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
            if (totalManagersEl) totalManagersEl.textContent = totalManagers;
            if (mappedCountEl) mappedCountEl.textContent = mappedCount;
            if (unmappedCountEl) unmappedCountEl.textContent = unmappedCount;
        },
        
        getProjectData: function() {
            return this.projectData;
        },
        
        addManagersToProject: function(projectId, managers) {
            const project = this.projectData.projects.find(p => p.inclineId === projectId);
            if (!project) return;
            
            managers.forEach(manager => {
                const newManager = {
                    id: 'dm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    name: manager.name,
                    description: manager.description || null,
                    mappedVendor: null,
                    isAutoMatched: false
                };
                project.designManagers.push(newManager);
            });
            
            this.loadProjects();
        }
    };
})();