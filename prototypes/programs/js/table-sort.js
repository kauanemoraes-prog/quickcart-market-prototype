/**
 * Table Sort Module
 * Handles sortable table functionality
 */

(function() {
  'use strict';
  
  let currentSort = { column: null, direction: 'asc' };
  
  window.TableSort = {
    /**
     * Initialize sortable table functionality
     */
    init: function() {
      const headers = document.querySelectorAll('.table__header.sortable');
      
      headers.forEach(header => {
        header.addEventListener('click', () => {
          const column = header.getAttribute('data-column');
          
          // Toggle direction if same column, otherwise default to ascending
          if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.direction = 'asc';
          }
          currentSort.column = column;
          
          // Remove sorted class from all headers
          headers.forEach(h => h.classList.remove('sorted'));
          
          // Add sorted class to current header
          header.classList.add('sorted');
          
          // Sort the data
          this.sortData(column, currentSort.direction);
          
          // Re-render the table
          window.TableRenderer.render();
          
          // Re-initialize buttons after re-render
          window.RowExpander.init();
          window.Favorites.init();
          window.ActionButtons.init();
        });
      });
    },
    
    /**
     * Sort the programs data
     */
    sortData: function(column, direction) {
      const programsData = window.ProgramsData.getAll();
      
      programsData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle different data types
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
  };
})();
