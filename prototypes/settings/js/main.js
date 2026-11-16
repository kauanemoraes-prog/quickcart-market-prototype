(function() {
    'use strict';

    var initialized = false;

    function safeInit() {
        if (initialized) return;
        initialized = true;
        try {
            init();
        } catch (err) {
            console.error('Init failed:', err);
        }
    }

    function init() {
        console.log('Settings prototype initialized');
    }

    document.addEventListener('davinci:canvas:ready', safeInit);

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
