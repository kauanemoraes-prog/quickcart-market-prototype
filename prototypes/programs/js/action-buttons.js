/**
 * Action Buttons Module
 * Handles action button functionality
 */

(function() {
  'use strict';
  
  window.ActionButtons = {
    /**
     * Initialize action button functionality
     */
    init: function() {
      const actionButtons = document.querySelectorAll('.action-btn');
      
      actionButtons.forEach(button => {
        button.addEventListener('click', () => {
          const code = button.getAttribute('data-id');
          console.log(`Action button clicked for exhibition: ${code}`);
          // Add your action logic here
        });
      });
    }
  };
})();
