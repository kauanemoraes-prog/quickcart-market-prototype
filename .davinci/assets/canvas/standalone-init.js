// DaVinci Standalone Loader
// Lightweight runtime that renders header (ribbon + navbar + subheader) + page content + footer
// without canvas authoring features (annotations, change history)

(function() {
    'use strict';

    Handlebars.registerHelper('or', function() {
        return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    });

    // Parse embedded navigation data
    var navDataEl = document.getElementById('standalone-nav-data');
    var data = navDataEl ? JSON.parse(navDataEl.textContent) : {};

    // Get page content from script tag
    var pageContentEl = document.getElementById('page-content');
    data.pageContent = pageContentEl ? pageContentEl.innerHTML : '';

    // Determine subheader visibility
    data.hasSubheader = data.subHeader && (
        (data.subHeader.title && data.subHeader.title.trim() !== '') ||
        data.subHeader.htmlContent
    );

    // The header template gates the navbar on navbar.visible (canvas.navbar.enabled in the full
    // runtime). This lightweight path has no config resolution, so default it visible — otherwise
    // an absent flag reads as false and the whole top bar disappears.
    if (!data.navbar) data.navbar = { visible: true };

    // Compile and render header
    var headerEl = document.getElementById('standalone-template-header');
    var headerHtml = '';
    if (headerEl) {
        headerHtml = Handlebars.compile(headerEl.innerHTML)(data);
    }

    // Compile and render footer
    var footerEl = document.getElementById('standalone-template-footer');
    var footerHtml = '';
    if (footerEl) {
        footerHtml = Handlebars.compile(footerEl.innerHTML)(data);
    }

    // Build the page DOM
    var app = document.getElementById('app');
    if (app) {
        app.innerHTML = headerHtml + '<main class="content">' + data.pageContent + '</main>' + footerHtml;
    }

    // Initialize Prototype Info Modal
    var prototypeInfoBtn = document.getElementById('prototypeInfoBtn');
    var prototypeInfoModal = document.getElementById('prototypeInfoModal');
    var closePrototypeInfoModal = document.getElementById('closePrototypeInfoModal');
    var closePrototypeInfoModalBtn = document.getElementById('closePrototypeInfoModalBtn');

    if (prototypeInfoBtn && prototypeInfoModal) {
        prototypeInfoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            prototypeInfoModal.classList.add('modal-overlay--open');
        });
        if (closePrototypeInfoModal) {
            closePrototypeInfoModal.addEventListener('click', function() {
                prototypeInfoModal.classList.remove('modal-overlay--open');
            });
        }
        if (closePrototypeInfoModalBtn) {
            closePrototypeInfoModalBtn.addEventListener('click', function() {
                prototypeInfoModal.classList.remove('modal-overlay--open');
            });
        }
        prototypeInfoModal.addEventListener('click', function(e) {
            if (e.target === prototypeInfoModal) {
                prototypeInfoModal.classList.remove('modal-overlay--open');
            }
        });
    }

    // Initialize navbar dropdown interactions
    var navMenus = document.querySelectorAll('.nav-menu');
    navMenus.forEach(function(menu) {
        var dropdownButtons = menu.querySelectorAll('.nav-menu__link--dropdown');
        dropdownButtons.forEach(function(button) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var parentItem = this.closest('.nav-menu__item');
                var siblings = Array.from(parentItem.parentElement.children);
                siblings.forEach(function(sibling) {
                    if (sibling !== parentItem) sibling.classList.remove('nav-menu__item--open');
                });
                parentItem.classList.toggle('nav-menu__item--open');
            });
        });

        if (window.innerWidth > 768) {
            var dropdownItems = menu.querySelectorAll('.nav-menu__item--has-dropdown');
            dropdownItems.forEach(function(item) {
                var hoverTimeout;
                item.addEventListener('mouseenter', function() {
                    clearTimeout(hoverTimeout);
                    var self = this;
                    hoverTimeout = setTimeout(function() {
                        Array.from(self.parentElement.children).forEach(function(sibling) {
                            if (sibling !== self) sibling.classList.remove('nav-menu__item--open');
                        });
                        self.classList.add('nav-menu__item--open');
                    }, 100);
                });
                item.addEventListener('mouseleave', function() {
                    var self = this;
                    clearTimeout(hoverTimeout);
                    hoverTimeout = setTimeout(function() {
                        self.classList.remove('nav-menu__item--open');
                    }, 200);
                });
            });
        }
    });

    // User menu dropdown
    var userMenuDropdown = document.querySelector('.top-navbar__user-dropdown');
    if (userMenuDropdown && window.innerWidth > 768) {
        var hoverTimeout;
        userMenuDropdown.addEventListener('mouseenter', function() {
            clearTimeout(hoverTimeout);
            var self = this;
            hoverTimeout = setTimeout(function() {
                document.querySelectorAll('.nav-menu .nav-menu__item--open').forEach(function(item) {
                    item.classList.remove('nav-menu__item--open');
                });
                self.classList.add('nav-menu__item--open');
            }, 100);
        });
        userMenuDropdown.addEventListener('mouseleave', function() {
            var self = this;
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(function() {
                self.classList.remove('nav-menu__item--open');
            }, 200);
        });
    }

    // Close dropdowns on outside click / Escape
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-menu') && !e.target.closest('.top-navbar__user-dropdown')) {
            document.querySelectorAll('.nav-menu__item--open').forEach(function(item) {
                item.classList.remove('nav-menu__item--open');
            });
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.nav-menu__item--open').forEach(function(item) {
                item.classList.remove('nav-menu__item--open');
            });
            if (prototypeInfoModal && prototypeInfoModal.classList.contains('modal-overlay--open')) {
                prototypeInfoModal.classList.remove('modal-overlay--open');
            }
        }
    });

    // Note: davinci:canvas:ready is dispatched by an inline script AFTER prototype JS loads
})();
