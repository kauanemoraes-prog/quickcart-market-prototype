/**
 * Row Expander Module
 * Handles chevron button functionality for expanding/collapsing rows
 */

(function() {
  'use strict';
  
  window.RowExpander = {
    /**
     * Initialize chevron button functionality for expanding/collapsing rows
     */
    init: function() {
      const chevronButtons = document.querySelectorAll('.chevron-btn');
      
      chevronButtons.forEach(button => {
        button.addEventListener('click', () => {
          const programId = button.getAttribute('data-id');
          const parentRow = button.closest('.table__row--parent');
          const expandedRow = document.querySelector(`.table__row--expanded[data-parent-id="${programId}"]`);
          
          if (expandedRow) {
            const isExpanded = expandedRow.style.display !== 'none';
            
            if (isExpanded) {
              // Collapse
              expandedRow.style.display = 'none';
              button.classList.remove('chevron-btn--expanded');
              parentRow.classList.remove('table__row--expanded-active');
            } else {
              // Expand
              expandedRow.style.display = '';
              button.classList.add('chevron-btn--expanded');
              parentRow.classList.add('table__row--expanded-active');
            }
          }
        });
      });
    }
  };
})();
