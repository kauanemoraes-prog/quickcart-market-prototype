/**
 * Drawer Module
 * Handles add program drawer functionality with tabs
 */

(function() {
  'use strict';
  
  window.Drawer = {
    /**
     * Initialize drawer functionality
     */
    init: function() {
      const addProgramBtn = document.getElementById('add-program-btn');
      const drawer = document.getElementById('add-program-drawer');
      const closeDrawerBtn = document.getElementById('close-drawer-btn');
      const cancelDrawerBtn = document.getElementById('cancel-drawer-btn');
      
      if (addProgramBtn && drawer) {
        addProgramBtn.addEventListener('click', () => {
          drawer.classList.add('drawer-overlay--open');
        });
      }
      
      if (closeDrawerBtn && drawer) {
        closeDrawerBtn.addEventListener('click', () => {
          drawer.classList.remove('drawer-overlay--open');
        });
      }
      
      if (cancelDrawerBtn && drawer) {
        cancelDrawerBtn.addEventListener('click', () => {
          drawer.classList.remove('drawer-overlay--open');
        });
      }
      
      // Close drawer when clicking overlay
      if (drawer) {
        drawer.addEventListener('click', (e) => {
          if (e.target === drawer) {
            drawer.classList.remove('drawer-overlay--open');
          }
        });
      }
      
      // Initialize drawer tabs
      this.initTabs();
    },
    
    /**
     * Initialize drawer tabs
     */
    initTabs: function() {
      const tabButtons = document.querySelectorAll('[data-drawer-tab]');
      const tabContents = document.querySelectorAll('.drawer-tab-content');
      
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const targetTab = button.getAttribute('data-drawer-tab');
          
          // Remove active class from all tabs and contents
          tabButtons.forEach(btn => btn.classList.remove('tabs__tab--active'));
          tabContents.forEach(content => content.classList.remove('drawer-tab-content--active'));
          
          // Add active class to clicked tab and corresponding content
          button.classList.add('tabs__tab--active');
          const targetContent = document.getElementById(`drawer-${targetTab}`);
          if (targetContent) {
            targetContent.classList.add('drawer-tab-content--active');
          }
        });
      });
    }
  };
})();
