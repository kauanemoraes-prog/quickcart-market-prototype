/**
 * Programs Page - Main Entry Point
 * Coordinates all feature modules
 */

(function() {
  'use strict';
  
  /**
   * Initialize the page
   */
  function init() {
    // Render the table
    window.TableRenderer.render();
    
    // Initialize sortable table functionality
    window.TableSort.init();
    
    // Initialize chevron buttons
    window.RowExpander.init();
    
    // Initialize favorite buttons
    window.Favorites.init();
    
    // Initialize action buttons
    window.ActionButtons.init();
    
    // Initialize drawer
    window.Drawer.init();

    // Initialize split-button add-program menu + wizard modal
    if (window.ProgramWizard) window.ProgramWizard.init();
    if (window.ProgramAddMenu) window.ProgramAddMenu.init();

    // Initialize the Index-style "From scratch" drawer + its build-schedule sub-drawer
    if (window.PIDrawer) window.PIDrawer.init();
    if (window.PIBuildScheduleDrawer) window.PIBuildScheduleDrawer.init();

    // Initialize search filter
    if (window.ProgramsSearch) window.ProgramsSearch.init();

    // Initialize list / card view toggle
    if (window.ProgramsView) window.ProgramsView.init();

    console.log('Stores page initialized successfully');
  }
  
  /**
   * Safe initialization wrapper
   */
  function safeInit() {
    try {
      init();
    } catch (err) {
      console.error('Init failed:', err);
    }
  }
  
  /**
   * CRITICAL: This initialization pattern is required for all prototypes
   *
   * The DaVinci Canvas dispatches a 'davinci:canvas:ready' event when
   * it has fully loaded and injected all DOM elements. This is more reliable
   * than arbitrary time delays, especially for hosted solutions with varying
   * network conditions.
   */
  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
