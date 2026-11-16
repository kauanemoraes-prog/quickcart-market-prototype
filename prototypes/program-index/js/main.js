/**
 * Program Index — entry point.
 * Initializes drawer + wizard once the canvas is ready.
 */

(function() {
    'use strict';

    function init() {
        if (window.PIDrawer) window.PIDrawer.init();
        if (window.PIBuildScheduleDrawer) window.PIBuildScheduleDrawer.init();
        if (window.PIWizard) window.PIWizard.init();
    }

    function safeInit() {
        try {
            init();
        } catch (err) {
            console.error('Exhibition Index init failed:', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('davinci:canvas:ready', safeInit);
    } else {
        safeInit();
    }
})();
