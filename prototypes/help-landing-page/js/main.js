/**
 * Help Landing Page — Main Entry (js/main.js)
 */
(function() {
    'use strict';

    function init() {
        console.log('Help Landing Page initialized');
    }

    function safeInit() {
        try { init(); } catch (err) { console.error('Init failed:', err); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('davinci:canvas:ready', safeInit);
    } else {
        safeInit();
    }
})();
