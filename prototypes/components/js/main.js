(function() {
    'use strict';

    let initialized = false;

    function safeInit() {
        if (initialized) return;
        initialized = true;
        init();
    }

    function init() {
        if (window.LinesStations) LinesStations.init();
        if (window.TimelineDemo) TimelineDemo.init();
        if (window.ProjRightToolbar) ProjRightToolbar.init();
    }

    // Primary: Listen for canvas ready event
    document.addEventListener('davinci:canvas:ready', safeInit);

    // Fallback: If canvas is already loaded or event was missed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                if (!initialized && document.querySelector('.main-container')) {
                    console.warn('Canvas ready event missed, using fallback initialization');
                    safeInit();
                }
            }, 100);
        });
    } else {
        setTimeout(function() {
            if (!initialized && document.querySelector('.main-container')) {
                console.warn('Canvas ready event missed, using fallback initialization');
                safeInit();
            }
        }, 100);
    }
})();
