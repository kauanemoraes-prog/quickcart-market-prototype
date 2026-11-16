/**
 * Design Manager Mapping - Main Entry Point
 * Coordinates all feature modules and handles initialization
 */
(function() {
    'use strict';
    
    function safeInit() {
        try {
            init();
        } catch (err) {
            console.error('Design Manager Mapping init failed:', err);
        }
    }
    
    function init() {
        console.log('Initializing Design Manager Mapping prototype...');
        
        // Initialize all feature modules
        if (window.DrawerManager) {
            window.DrawerManager.init();
            console.log('✓ DrawerManager initialized');
        }
        
        if (window.ProjectSections) {
            window.ProjectSections.init();
            console.log('✓ ProjectSections initialized');
        }
        
        if (window.MappingControls) {
            window.MappingControls.init();
            console.log('✓ MappingControls initialized');
        }
        
        if (window.CSVImport) {
            window.CSVImport.init();
            console.log('✓ CSVImport initialized');
        }
        
        console.log('Design Manager Mapping prototype initialized successfully');
    }
    
    // Event-based initialization pattern
    if (document.readyState === 'loading') {
        document.addEventListener('davinci:canvas:ready', safeInit);
    } else {
        safeInit();
    }
})();