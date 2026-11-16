/**
 * Tabs Module
 * Handles tab switching functionality with localStorage persistence
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'programs:program-detail:active-tab:v2';

  window.Tabs = {
    /**
     * Initialize tab functionality
     */
    init: function() {
      const tabButtons = document.querySelectorAll('.tabs__tab');
      const tabPanels = document.querySelectorAll('.tabs__panel');

      const activate = (targetTab) => {
        const targetButton = document.querySelector(`.tabs__tab[data-tab="${targetTab}"]`);
        const targetPanel = document.getElementById(targetTab);
        if (!targetButton || !targetPanel) return false;

        tabButtons.forEach(btn => btn.classList.remove('tabs__tab--active'));
        tabPanels.forEach(panel => panel.classList.remove('tabs__panel--active'));

        targetButton.classList.add('tabs__tab--active');
        targetPanel.classList.add('tabs__panel--active');
        return true;
      };

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const targetTab = button.getAttribute('data-tab');
          activate(targetTab);
        });
      });

      // A store always opens on its first tab (Store overview); ?tab= is handled by the page
      localStorage.removeItem(STORAGE_KEY);
    }
  };
})();
