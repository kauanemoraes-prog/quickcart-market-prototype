/* proj-right-toolbar.js */
/* Plugin component: Right Toolbar — toggle behavior + nav items */

(function() {
    'use strict';

    var defaultItems = [
        { id: 'settings', icon: 'gearshape.svg', label: 'Settings' },
        { id: 'expand', icon: 'arrow-up-left-and-arrow-down-right.svg', label: 'Open fullscreen mode' },
        { id: 'history', icon: 'clock.svg', label: 'Change log' },
        { id: 'people', icon: 'person.svg', label: 'Active users (3)' },
        { id: 'dark-mode', icon: 'moon.svg', label: 'Dark Mode' }
    ];

    var compiledTemplate;

    function getTemplate() {
        if (!compiledTemplate) {
            var src = document.getElementById('proj-right-toolbar-items-template');
            if (src) compiledTemplate = Handlebars.compile(src.innerHTML);
        }
        return compiledTemplate;
    }

    function renderItems(toolbar, items) {
        var nav = toolbar.querySelector('.proj-right-toolbar__nav');
        var tpl = getTemplate();
        if (!nav || !tpl) return;
        var basePath = toolbar.getAttribute('data-icon-path') || '../../davinci/assets/icons/regular/';
        nav.innerHTML = tpl({ items: items, basePath: basePath });
    }

    function bindNavClicks(toolbar) {
        var nav = toolbar.querySelector('.proj-right-toolbar__nav');
        if (!nav || nav._rtNavBound) return;
        nav._rtNavBound = true;
        nav.addEventListener('click', function(e) {
            var btn = e.target.closest('.proj-right-toolbar__item');
            if (!btn) return;
            var id = btn.getAttribute('data-item-id');
            if (id === 'dark-mode' && window.ProjDarkMode) {
                window.ProjDarkMode.toggle();
            }
        });
    }

    window.ProjRightToolbar = {
        init: function() {
            document.querySelectorAll('.proj-right-toolbar').forEach(function(toolbar) {
                var toggle = toolbar.querySelector('.proj-right-toolbar__toggle');
                if (toggle && !toggle._rtBound) {
                    toggle._rtBound = true;
                    toggle.addEventListener('click', function() {
                        ProjRightToolbar.toggle(toolbar);
                    });
                }
                var nav = toolbar.querySelector('.proj-right-toolbar__nav');
                if (nav && !nav.children.length) {
                    renderItems(toolbar, defaultItems);
                }
                bindNavClicks(toolbar);
            });
            if (window.ProjDarkMode) window.ProjDarkMode.syncToggleState();
        },

        setItems: function(el, items) {
            renderItems(el, items);
        },

        toggle: function(el) {
            el.classList.toggle('proj-right-toolbar--open');
            var isOpen = el.classList.contains('proj-right-toolbar--open');
            var btn = el.querySelector('.proj-right-toolbar__toggle');
            if (btn) btn.setAttribute('aria-label', isOpen ? 'Close toolbar' : 'Open toolbar');
        },

        open: function(el) {
            el.classList.add('proj-right-toolbar--open');
            var btn = el.querySelector('.proj-right-toolbar__toggle');
            if (btn) btn.setAttribute('aria-label', 'Close toolbar');
        },

        close: function(el) {
            el.classList.remove('proj-right-toolbar--open');
            var btn = el.querySelector('.proj-right-toolbar__toggle');
            if (btn) btn.setAttribute('aria-label', 'Open toolbar');
        }
    };
})();
