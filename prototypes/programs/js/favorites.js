/**
 * Favorites Module
 * Handles favorite button functionality for both parent and nested rows
 */

(function() {
  'use strict';
  
  window.Favorites = {
    /**
     * Initialize favorite button functionality
     */
    init: function() {
      const favoriteButtons = document.querySelectorAll('.favorite-btn:not([data-view-managed])');
      
      favoriteButtons.forEach(button => {
        const id = button.getAttribute('data-id');
        
        // Add click handler
        button.addEventListener('click', () => {
          // Check if it's a nested favorite (contains hyphen)
          if (id.includes('-')) {
            this.toggleSiteFavorite(id, button);
          } else {
            this.toggleProgramFavorite(id, button);
          }
        });
      });
    },
    
    /**
     * Toggle program favorite
     */
    toggleProgramFavorite: function(programCode, button) {
      const program = window.ProgramsData.findByCode(programCode);
      if (program) {
        program.favorite = !program.favorite;
        button.classList.toggle('favorite-btn--active');
      }
    },
    
    /**
     * Toggle site favorite
     */
    toggleSiteFavorite: function(id, button) {
      const [programCode, siteName] = id.split('-');
      const program = window.ProgramsData.findByCode(programCode);
      if (program) {
        const site = program.sites.find(s => s.site === siteName);
        if (site) {
          site.favorite = !site.favorite;
          button.classList.toggle('favorite-btn--active');
        }
      }
    }
  };
})();
