/**
 * Drawer Manager Module
 * Handles opening/closing the mapping drawer
 */
(function() {
    'use strict';
    
    window.DrawerManager = {
        drawer: null,
        openBtn: null,
        closeBtn: null,
        
        init: function() {
            this.drawer = document.getElementById('mapping-drawer');
            this.openBtn = document.getElementById('open-mapping-drawer');
            this.closeBtn = document.getElementById('close-mapping-drawer');
            
            if (!this.drawer || !this.openBtn || !this.closeBtn) {
                console.error('DrawerManager: Required elements not found');
                return;
            }
            
            this.bindEvents();
        },
        
        bindEvents: function() {
            // Open drawer
            this.openBtn.addEventListener('click', () => {
                this.openDrawer();
            });
            
            // Close drawer
            this.closeBtn.addEventListener('click', () => {
                this.closeDrawer();
            });
            
            // Close on backdrop click
            this.drawer.addEventListener('click', (e) => {
                if (e.target === this.drawer) {
                    this.closeDrawer();
                }
            });
            
            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen()) {
                    this.closeDrawer();
                }
            });
        },
        
        openDrawer: function() {
            this.drawer.classList.add('drawer-overlay--open');
            
            // Load projects when drawer opens
            if (window.ProjectSections) {
                window.ProjectSections.loadProjects();
            }
        },
        
        closeDrawer: function() {
            this.drawer.classList.remove('drawer-overlay--open');
        },
        
        isOpen: function() {
            return this.drawer.classList.contains('drawer-overlay--open');
        }
    };
})();