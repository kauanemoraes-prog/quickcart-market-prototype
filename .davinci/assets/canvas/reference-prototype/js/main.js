// Event-based init on davinci:canvas:ready; no setTimeout fallback.
(function() {
    'use strict';

    const items = [
        { id: 1, name: 'Alpha', status: 'Active' },
        { id: 2, name: 'Beta',  status: 'Pending' },
        { id: 3, name: 'Gamma', status: 'Archived' }
    ];

    function renderItems() {
        const tpl = document.getElementById('items-template');
        const tbody = document.getElementById('items-tbody');
        if (!tpl || !tbody) return;
        const render = Handlebars.compile(tpl.innerHTML);
        tbody.innerHTML = render({ items: items });
    }

    function bindInteractions() {
        const button = document.getElementById('example-button');
        const input  = document.getElementById('example-input');
        const output = document.getElementById('output');
        if (!button || !input || !output) return;

        button.addEventListener('click', function() {
            const value = input.value.trim();
            if (value) {
                output.hidden = false;
                output.querySelector('p').textContent = 'You typed: "' + value + '"';
            } else {
                output.hidden = true;
            }
        });
    }

    function init() {
        renderItems();
        bindInteractions();
        console.log('Reference prototype initialized');
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
