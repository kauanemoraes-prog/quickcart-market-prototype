/* DaVinci Plugins — Project-level custom component behaviors */
/* Auto-loaded by canvas framework alongside MDS */
/* Add plugin JS modules below or @import individual files */

(function() {
  'use strict';

  window.davinciPlugins = {
    init: function() {
      // Initialize all registered plugin components
      // Each plugin self-registers on window (e.g., window.ProjStatCard)
      // Call their init() here after adding them
    }
  };

  // Auto-init after DOM is ready (canvas loads this after MDS JS)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      DaVinciPlugins.init();
    });
  } else {
    DaVinciPlugins.init();
  }
})();
