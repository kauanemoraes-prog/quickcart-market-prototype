// DaVinci Framework - Vanilla JS framework for loading reusable page canvas from HTML files
// Usage: Include script, define content in #page-content, auto-initializes on DOM ready

const DaVinciCanvas = (function() {
    'use strict';

    // Calculate relative path to assets based on page location
    function getAssetsBasePath() {
        const scriptTag = document.currentScript || document.querySelector('script[src*="davinci-canvas.js"]');
        if (!scriptTag) {
            console.warn('Could not find davinci-canvas.js script tag, using default path');
            return './assets';
        }
        
        const scriptSrc = scriptTag.getAttribute('src');
        const match = scriptSrc.match(/^(.*)\/canvas\/davinci-canvas\.js$/);
        return match ? match[1] : './assets';
    }

    const assetsBasePath = getAssetsBasePath();
    // Directory that CONTAINS assets/ (the workspace's .davinci/ folder, or a root in legacy layouts).
    // The workspace-side files that sit alongside assets/ live here: plugins/, files/,
    // canvas-navigation-data.json, davinci-users.json. Prototypes themselves stay at the true
    // workspace root, which is resolved separately via basePathToRoot (../ depth counting).
    const davinciBase = (assetsBasePath.replace(/\/?assets$/, '') || '.');
    const config = {
        canvasPartsPath: `${assetsBasePath}/canvas/parts`,
        designSystemPath: `${assetsBasePath}/design-system`,
        pluginsPath: `${davinciBase}/plugins`,
        navigationDataUrl: `${assetsBasePath}/canvas/canvas-navigation-data.json`,
        usersDataUrl: `${assetsBasePath}/canvas/davinci-users-data.json`,
        canvasParts: ['header', 'main-container', 'footer']
    };

    const IMPERSONATION_STORAGE_KEY = 'davinci:impersonated-user';
    // Global per origin on purpose: the designer's open/closed choice for the ribbon should carry
    // across every prototype in the workspace, not reset on each navigation.
    const RIBBON_COLLAPSED_STORAGE_KEY = 'davinci:ribbon-collapsed';

    // Default footer center region. It lives here rather than as an {{else}} branch in footer.html
    // because config.seed.json ships the SAME string as an editable value — the template only ever
    // renders what resolveChrome hands it, which is what makes "cleared means gone" work.
    // KEEP BYTE-IDENTICAL to assets/canvas/config.seed.json (canvas.footer.center), otherwise a
    // seeded workspace and a config-less one render different markup. Double-quoted JS strings with
    // SINGLE-quoted HTML attributes, exactly as the seed has to write them to stay valid JSON.
    const DEFAULT_FOOTER_CENTER =
        "<span>©2026 Apple Inc. All rights reserved. Apple Confidential - Strictly need to know.</span> " +
        "<a class='footer__link' href='https://globalsecurity.apple.com/products-surprise/confidentiality-disclosure' target='_blank'>Confidential Policies</a> " +
        "<span class='footer__separator'>|</span> " +
        "<span class='footer__disclaimer'><sf-symbol name='exclamationmark.circle'></sf-symbol> This prototype is hosted by Enterprise Github Pages and it's protected under AppleConnect. All logged in Apple employee with its can access it.</span>";

    // Canvas chrome defaults. Overridden per workspace by `canvas` in .davinci/config.json, and per
    // page by window.DAVINCI_CONFIG.canvas. `background`/`textColor` and the two `button*` keys
    // default to null, meaning "set no inline custom property" so canvas-styles.css resolves its own
    // var() fallback chain (and, for the buttons, leaves the design system's styling untouched).
    // `background` and `buttonBackground` are applied via the CSS `background` shorthand, so they
    // take any CSS background value — a color or a gradient. The `*TextColor` keys are colors only.
    const CHROME_DEFAULTS = {
        ribbon: {
            enabled: true,
            collapsible: false,
            collapsedByDefault: false,
            // Seconds the bar stays visible, counting down, before it auto-collapses on a first
            // visit. 0 collapses instantly with no countdown (the pre-countdown behaviour).
            autoHideDelay: 5,
            // Where the pull tab sits along the bar's bottom edge: center | left | right.
            tabPosition: 'center',
            background: null,
            textColor: null,
            // Bottom hairline. Off by default: it was unconditional until it turned out to read as a
            // stray line on any background but the pack's light yellow. `borderColor` only picks the
            // paint — `border` is what shows it — so an unset colour falls back to the pack's border
            // grey through canvas-styles.css.
            border: false,
            borderColor: null,
            // The bar's `.btn` buttons (Change History / Live Editor). Unset = the design
            // system's own button look; textColor deliberately does not reach them, since a button
            // is a component. Add Note is NOT one of these — it is a bare icon in the notes group,
            // styled by the notes* keys below, not here.
            buttonBackground: null,
            buttonTextColor: null,
            buttonBorderColor: null,
            buttonBorderColor: null,
            // The notes group's own frame, independent of the buttons opposite it. Same null
            // meaning: set no inline custom property, so canvas-styles.css keeps resolving its
            // own fallback. `notesBackground` takes any CSS background (colour or gradient);
            // the other two are colours.
            notesBackground: null,
            notesTextColor: null,
            notesBorderColor: null,
            message: 'You are previewing a <strong>Prototype</strong>',
            features: { notes: true, changeHistory: true, liveEditor: true }
        },
        footer: {
            enabled: true,
            left: '',
            center: DEFAULT_FOOTER_CENTER,
            right: ''
        },
        // The top navbar simulates the product's own bar AND carries navigation between the
        // prototype's screens. Shown by default; a workspace sets enabled:false only when the
        // product genuinely has no top bar (a sidebar-nav app, a single full-screen tool) — which
        // also removes prototype-to-prototype navigation, so it is an explicit opt-out, not a default.
        navbar: {
            enabled: true
        }
    };

    // Load external resource (CSS or JS)
    function loadResource(url, type = 'css', attrs = null) {
        return new Promise((resolve, reject) => {
            const element = type === 'css'
                ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: url })
                : Object.assign(document.createElement('script'), { src: url });

            if (attrs) {
                for (const [k, v] of Object.entries(attrs)) {
                    element.setAttribute(k, v);
                }
            }

            element.onload = resolve;
            element.onerror = () => reject(new Error(`Failed to load ${type}: ${url}`));
            document.head.appendChild(element);
        });
    }

    // Resolve the SF Symbols endpoint. The default CDN host sits under the cdn-apple.com suffix,
    // which is NOT on IKEv2 split-tunnel VPN's DNS list — so for users on that VPN the host never
    // resolves and every symbol fetch fails with ERR_NAME_NOT_RESOLVED (renders as ⚠️). Since it's
    // a client-side DNS failure, no CDN/server fix helps. corp.apple.com IS on the split-tunnel
    // list, so we fall back to the corp-routable mirror when a cheap HEAD probe shows the CDN's DNS
    // is unreachable. Must resolve before any <sf-symbol> renders (the component reads its endpoint
    // at construction). See https://sf-saas.apple.com/docs/faq/ikev2-vpn
    const SF_SYMBOLS_CDN = 'https://sf-saas.cdn-apple.com';
    const SF_SYMBOLS_CORP = 'https://sfsymbol-internal.corp.apple.com';
    async function resolveSfSymbolsEndpoint() {
        try {
            // no-cors: any reachable response (even a 403) means DNS+TCP work → use the CDN.
            // A DNS failure rejects in milliseconds → fall back to the corp mirror.
            await fetch(SF_SYMBOLS_CDN, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
            return SF_SYMBOLS_CDN;
        } catch (e) {
            console.warn(`DaVinci: SF Symbols CDN unreachable (${SF_SYMBOLS_CDN}) — likely IKEv2 split-tunnel DNS. Falling back to corp endpoint ${SF_SYMBOLS_CORP}. See https://sf-saas.apple.com/docs/faq/ikev2-vpn`);
            return SF_SYMBOLS_CORP;
        }
    }

    // Fetch JSON or HTML content, supports embedded templates for offline use
    async function fetchContent(url) {
        const filename = url.split('/').pop().replace('.html', '').replace('.json', '');
        const embeddedTemplate = document.getElementById(`davinci-template-${filename}`);

        if (embeddedTemplate) {
            const content = embeddedTemplate.innerHTML.trim();
            if (url.endsWith('.json')) {
                return JSON.parse(content);
            }
            return content;
        }

        const bust = url.includes('?') ? `&_=${Date.now()}` : `?_=${Date.now()}`;
        const response = await fetch(url + bust, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
        return url.endsWith('.json') ? response.json() : response.text();
    }

    // Fetch navigation data: the workspace copy first, then the bundled seed.
    async function fetchNavigationData() {
        // Check embedded template first (offline distribution — avoids CORS on file://)
        const embeddedNav = document.getElementById('davinci-template-canvas-navigation-data');
        if (embeddedNav) {
            return JSON.parse(embeddedNav.innerHTML.trim());
        }

        const workspaceNavUrl = `${davinciBase}/canvas-navigation-data.json`;

        try {
            const response = await fetch(`${workspaceNavUrl}?_=${Date.now()}`, { cache: 'no-store' });
            if (response.ok) return response.json();
        } catch (error) {}

        return fetchContent(config.navigationDataUrl);
    }

    // Fetch impersonation users data (workspace root first, then seed)
    async function fetchUsersData() {
        const embeddedUsers = document.getElementById('davinci-template-davinci-users');
        if (embeddedUsers) {
            try { return JSON.parse(embeddedUsers.innerHTML.trim()); } catch (e) { return null; }
        }

        const workspaceUrl = `${davinciBase}/davinci-users.json`;

        try {
            const response = await fetch(`${workspaceUrl}?_=${Date.now()}`, { cache: 'no-store' });
            if (response.ok) return response.json();
        } catch (error) {}

        try {
            return await fetchContent(config.usersDataUrl);
        } catch (error) {
            return null;
        }
    }

    // Fetch the workspace config (.davinci/config.json). Same three-step shape as the nav and users
    // fetchers: embedded template first (offline / file://), then the workspace file, then null.
    // A missing file is the normal case, not an error — the chrome defaults cover it.
    async function fetchCanvasConfig() {
        const embedded = document.getElementById('davinci-template-config');
        if (embedded) {
            try { return JSON.parse(embedded.innerHTML.trim()); } catch (e) { return null; }
        }

        try {
            const response = await fetch(`${davinciBase}/config.json?_=${Date.now()}`, { cache: 'no-store' });
            if (response.ok) return response.json();
        } catch (error) {}

        return null;
    }

    // Merge one chrome section (ribbon or footer) over a base. Only `features` nests, so it is the
    // single special case; every other key is a scalar or an HTML string and overwrites wholesale.
    function mergeChromeSection(base, override) {
        const out = Object.assign({}, base);
        if (!override || typeof override !== 'object') return out;

        Object.keys(override).forEach(key => {
            const value = override[key];
            if (value === undefined) return;
            if (key === 'features' && value && typeof value === 'object') {
                out.features = Object.assign({}, base.features, value);
            } else {
                out[key] = value;
            }
        });
        return out;
    }

    // Resolve the chrome config from the defaults plus any number of `canvas` blocks, later wins.
    // Because the defaults supply real values (including the footer's center HTML), an ABSENT key
    // means "use the DaVinci default" while a present empty string means "render nothing" — which is
    // exactly the footer-region semantics, with no presence flags needed.
    function resolveChrome() {
        let ribbon = CHROME_DEFAULTS.ribbon;
        let footer = CHROME_DEFAULTS.footer;
        let navbar = CHROME_DEFAULTS.navbar;

        for (let i = 0; i < arguments.length; i++) {
            const source = arguments[i];
            if (!source || typeof source !== 'object') continue;
            ribbon = mergeChromeSection(ribbon, source.ribbon);
            footer = mergeChromeSection(footer, source.footer);
            navbar = mergeChromeSection(navbar, source.navbar);
        }
        return { ribbon: ribbon, footer: footer, navbar: navbar };
    }

    // Impersonation: select active user from users data + localStorage
    function resolveActiveUser(usersData) {
        if (!usersData || !Array.isArray(usersData.users) || usersData.users.length === 0) {
            return null;
        }
        let storedId = null;
        try { storedId = localStorage.getItem(IMPERSONATION_STORAGE_KEY); } catch (e) {}

        const byStoredId = storedId && usersData.users.find(u => u.id === storedId);
        const byDefault = usersData.users.find(u => u.isDefault);
        return byStoredId || byDefault || usersData.users[0];
    }

    // Impersonation: apply permission rules to the current DOM
    function applyPermissions(user) {
        document.querySelectorAll('[data-davinci-perm]').forEach(el => {
            const prev = el.getAttribute('data-davinci-perm');
            el.removeAttribute('data-davinci-perm');
            if (prev === 'readonly' && 'readOnly' in el) el.readOnly = false;
            if (prev === 'readonly') el.removeAttribute('aria-readonly');
            if (prev === 'disabled') el.removeAttribute('aria-disabled');
        });

        if (!user || !user.permissions) return;
        const { hide = [], disable = [], readonly = [] } = user.permissions;

        function markAll(selectors, kind, fn) {
            selectors.forEach(selector => {
                if (!selector) return;
                let nodes;
                try { nodes = document.querySelectorAll(selector); }
                catch (e) { console.warn(`DaVinci: invalid permission selector "${selector}"`, e); return; }
                nodes.forEach(el => {
                    el.setAttribute('data-davinci-perm', kind);
                    if (fn) fn(el);
                });
            });
        }
        markAll(hide, 'hidden');
        markAll(disable, 'disabled', el => el.setAttribute('aria-disabled', 'true'));
        markAll(readonly, 'readonly', el => {
            if ('readOnly' in el) el.readOnly = true;
            else el.setAttribute('aria-readonly', 'true');
        });
    }

    // Impersonation: watch for dynamically-rendered content and re-apply permissions
    function observePermissions(getUser) {
        const target = document.getElementById('app') || document.body;
        if (!target) return;
        let scheduled = false;
        const observer = new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                applyPermissions(getUser());
            });
        });
        observer.observe(target, { childList: true, subtree: true });
    }

    // Impersonation: wire up clicks in the user dropdown to switch persona
    function initializeImpersonationControls() {
        document.addEventListener('click', function(e) {
            const trigger = e.target.closest('[data-davinci-impersonate]');
            if (!trigger) return;
            e.preventDefault();
            e.stopPropagation();
            const id = trigger.getAttribute('data-davinci-impersonate');
            try { localStorage.setItem(IMPERSONATION_STORAGE_KEY, id); } catch (err) {}
            window.location.reload();
        });
    }

    // Initialize event listeners for interactive elements
    function initializeEventListeners() {
        const navMenus = document.querySelectorAll('.nav-menu');
        
        navMenus.forEach(menu => {
            // Handle dropdown toggles for click (mobile and fallback)
            const dropdownButtons = menu.querySelectorAll('.nav-menu__link--dropdown');
            
            dropdownButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const parentItem = this.closest('.nav-menu__item');
                    const siblings = Array.from(parentItem.parentElement.children);
                    siblings.forEach(sibling => {
                        if (sibling !== parentItem) {
                            sibling.classList.remove('nav-menu__item--open');
                        }
                    });
                    parentItem.classList.toggle('nav-menu__item--open');
                });
            });
            const submenuButtons = menu.querySelectorAll('.nav-menu__dropdown-link--submenu');
            
            submenuButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const parentItem = this.closest('.nav-menu__dropdown-item');
                    const siblings = Array.from(parentItem.parentElement.children);
                    siblings.forEach(sibling => {
                        if (sibling !== parentItem) {
                            sibling.classList.remove('nav-menu__dropdown-item--open');
                        }
                    });
                    parentItem.classList.toggle('nav-menu__dropdown-item--open');
                });
            });
            if (!menu.classList.contains('nav-menu--vertical') && window.innerWidth > 768) {
                const dropdownItems = menu.querySelectorAll('.nav-menu__item--has-dropdown');
                
                dropdownItems.forEach(item => {
                    let hoverTimeout;
                    
                    item.addEventListener('mouseenter', function() {
                        clearTimeout(hoverTimeout);
                        hoverTimeout = setTimeout(() => {
                            const siblings = Array.from(item.parentElement.children);
                            siblings.forEach(sibling => {
                                if (sibling !== item) {
                                    sibling.classList.remove('nav-menu__item--open');
                                }
                            });
                            
                            this.classList.add('nav-menu__item--open');
                        }, 100);
                    });
                    
                    item.addEventListener('mouseleave', function() {
                        clearTimeout(hoverTimeout);
                        hoverTimeout = setTimeout(() => {
                            this.classList.remove('nav-menu__item--open');
                        }, 200);
                    });
                });
                const submenuItems = menu.querySelectorAll('.nav-menu__dropdown-item--has-submenu');
                
                submenuItems.forEach(item => {
                    let hoverTimeout;
                    
                    item.addEventListener('mouseenter', function() {
                        clearTimeout(hoverTimeout);
                        hoverTimeout = setTimeout(() => {
                            const siblings = Array.from(item.parentElement.children);
                            siblings.forEach(sibling => {
                                if (sibling !== item) {
                                    sibling.classList.remove('nav-menu__dropdown-item--open');
                                }
                            });
                            
                            this.classList.add('nav-menu__dropdown-item--open');
                        }, 100);
                    });
                    
                    item.addEventListener('mouseleave', function() {
                        clearTimeout(hoverTimeout);
                        hoverTimeout = setTimeout(() => {
                            this.classList.remove('nav-menu__dropdown-item--open');
                        }, 200);
                    });
                });
            }
        });
        const userMenuDropdown = document.querySelector('.top-navbar__user-dropdown');
        if (userMenuDropdown && window.innerWidth > 768) {
            let hoverTimeout;
            userMenuDropdown.addEventListener('mouseenter', function() {
                clearTimeout(hoverTimeout);
                hoverTimeout = setTimeout(() => {
                    // Close all main navigation dropdowns
                    document.querySelectorAll('.nav-menu .nav-menu__item--open').forEach(item => {
                        item.classList.remove('nav-menu__item--open');
                    });
                    
                    this.classList.add('nav-menu__item--open');
                }, 100);
            });
            
            userMenuDropdown.addEventListener('mouseleave', function() {
                clearTimeout(hoverTimeout);
                hoverTimeout = setTimeout(() => {
                    this.classList.remove('nav-menu__item--open');
                }, 200);
            });
        }
        const userMenuButton = document.querySelector('.top-navbar__user-menu');
        if (userMenuButton) {
            userMenuButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const parentItem = this.closest('.nav-menu__item--has-dropdown');
                if (parentItem) {
                    document.querySelectorAll('.nav-menu .nav-menu__item--open').forEach(item => {
                        item.classList.remove('nav-menu__item--open');
                    });
                    parentItem.classList.toggle('nav-menu__item--open');
                }
            });
        }
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.nav-menu') && !e.target.closest('.top-navbar__user-dropdown')) {
                document.querySelectorAll('.nav-menu__item--open').forEach(item => {
                    item.classList.remove('nav-menu__item--open');
                });
                document.querySelectorAll('.nav-menu__dropdown-item--open').forEach(item => {
                    item.classList.remove('nav-menu__dropdown-item--open');
                });
            }
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.nav-menu__item--open').forEach(item => {
                    item.classList.remove('nav-menu__item--open');
                });
                document.querySelectorAll('.nav-menu__dropdown-item--open').forEach(item => {
                    item.classList.remove('nav-menu__dropdown-item--open');
                });
            }
        });

        const projectSelect = document.getElementById('projectSelect');
        const siteSelect = document.getElementById('siteSelect');

        if (projectSelect && siteSelect) {
            siteSelect.addEventListener('change', function() {
                projectSelect.disabled = !this.value;
                if (!this.value) projectSelect.value = '';
            });
        }

        const prototypeInfoBtn = document.getElementById('prototypeInfoBtn');
        const prototypeInfoModal = document.getElementById('prototypeInfoModal');
        const closePrototypeInfoModal = document.getElementById('closePrototypeInfoModal');
        const closePrototypeInfoModalBtn = document.getElementById('closePrototypeInfoModalBtn');

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
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && prototypeInfoModal.classList.contains('modal-overlay--open')) {
                    prototypeInfoModal.classList.remove('modal-overlay--open');
                }
            });
        }
    }

    // Make the pull tab CONTINUE the bar's background instead of restarting it. A background image is
    // positioned against each element's OWN box, so a gradient on the bar also rendered a second,
    // compressed copy inside the 4.4rem tab, and the two never met at the tab's top edge. This
    // measures both boxes and hands the tab the offsets that put the bar's own background box behind
    // it. Rects rather than offsetLeft/offsetTop, because the centered tab is placed with
    // translateX(-50%) and offsetLeft reports the pre-transform position.
    // Two kinds of image, two treatments: a GRADIENT has no intrinsic size and is sized to whatever
    // box it paints in, so bar and tab have to share one stretched box (the --tab-continued class adds
    // the bar's half, canvas-styles.css). A tiled url() keeps its own size and only needs its phase
    // lined up, so the size is left alone there — stretching it would distort the image.
    // Skipped when the resolved background has no image at all: a flat colour fills the whole box
    // whatever size and position say, so there is nothing to line up.
    function initializeRibbonTabBackground() {
        const ribbon = document.querySelector('.prototype-ribbon');
        const handle = document.getElementById('ribbonToggle');
        if (!ribbon || !handle) return;

        const image = getComputedStyle(ribbon).backgroundImage;
        if (image === 'none') return;
        const isGradient = image.includes('gradient(');
        if (isGradient) ribbon.classList.add('prototype-ribbon--tab-continued');

        function sync() {
            const bar = ribbon.getBoundingClientRect();
            const tab = handle.getBoundingClientRect();
            handle.style.setProperty('--davinci-ribbon-tab-bg-pos', `${bar.left - tab.left}px ${bar.top - tab.top}px`);
            if (isGradient) {
                handle.style.setProperty('--davinci-ribbon-tab-bg-size', `${bar.width}px ${bar.height + tab.height}px`);
            }
        }

        sync();
        // The bar's width follows the viewport and its height animates on collapse, so re-measure on
        // both. ResizeObserver fires once on observe and then per frame of that transition; the
        // callback writes background properties only, so it cannot feed back into layout.
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(sync).observe(ribbon);
        } else {
            window.addEventListener('resize', sync);
        }
    }

    // Ribbon collapse: the pull tab plus the first-visit auto-hide countdown. The initial state is
    // rendered by the template (no flash, since the ribbon is injected after the config fetch), so
    // this owns only the transitions. Both paths live here on purpose — a separate countdown timer
    // could otherwise collapse the bar after the reviewer had already opened it by hand.
    function initializeRibbonCollapse(countdownSeconds) {
        const ribbon = document.querySelector('.prototype-ribbon');
        const handle = document.getElementById('ribbonToggle');
        if (!ribbon || !handle) return;

        const countdownEl = document.getElementById('ribbonCountdown');
        let timer = null;

        function cancelCountdown() {
            if (timer) { clearTimeout(timer); timer = null; }
            if (countdownEl && countdownEl.parentNode) countdownEl.remove();
        }

        function apply(collapsed) {
            ribbon.classList.toggle('prototype-ribbon--collapsed', collapsed);
            handle.setAttribute('aria-expanded', String(!collapsed));
            handle.setAttribute('title', collapsed ? 'Show prototype toolbar' : 'Hide prototype toolbar');

            const symbol = handle.querySelector('sf-symbol');
            if (symbol) symbol.setAttribute('name', collapsed ? 'chevron.down' : 'chevron.up');

            // Persists until the browser's storage is cleared, which is also what stops the countdown
            // from ever running again on this origin.
            try { localStorage.setItem(RIBBON_COLLAPSED_STORAGE_KEY, String(collapsed)); } catch (err) {}
        }

        handle.addEventListener('click', function(e) {
            e.preventDefault();
            cancelCountdown();
            apply(!ribbon.classList.contains('prototype-ribbon--collapsed'));
        });

        if (!(countdownSeconds > 0) || !countdownEl) return;

        // setTimeout chain rather than setInterval: the last step needs a different delay, so the
        // reviewer actually sees "0" before the bar goes.
        const numEl = countdownEl.querySelector('.prototype-ribbon__countdown-n');
        let remaining = countdownSeconds;
        (function tick() {
            timer = setTimeout(function() {
                remaining -= 1;
                if (numEl) numEl.textContent = String(Math.max(0, remaining));
                if (remaining > 0) { tick(); return; }
                timer = setTimeout(function() { cancelCountdown(); apply(true); }, 600);
            }, 1000);
        })();
    }

    // Initialize annotation system for adding sticky notes
    function initializeAnnotationSystem(siteTitle) {
        const addNoteBtn = document.getElementById('addNoteBtn');
        const hideNotesToggle = document.getElementById('hideNotesToggle');
        let noteCounter = 0;
        let notes = [];
        let currentContext = getCurrentContext();
        const noteStorageKey = (pathname, context) =>
            `${siteTitle.toLowerCase()}-annotations-${pathname}-${context || 'main'}`;
        let storageKey = noteStorageKey(window.location.pathname, currentContext);

        if (!addNoteBtn || !hideNotesToggle) return;

        /* The handle notes-plus.js talks to. `storageKeyFor` is exposed because
           restoring a deleted note means writing into this system's own key, and
           siteTitle is not otherwise reachable from outside — leaving it private
           only forced a regex hunt through localStorage that failed on a page
           where no note had ever been saved. `confirmRemove` is set by
           notes-plus.js; see the remove handler below. */
        window.DaVinciNotes = window.DaVinciNotes || {};
        window.DaVinciNotes.storageKeyFor = noteStorageKey;
        /* Undo hands a binned note straight back here rather than writing storage and
           reloading the page. The array of notes is private to this closure, so a node
           created from outside would be dropped on the next save — and a reload is both
           jarring and unreliable in an embedded preview. */
        window.DaVinciNotes.restoreNote = function (data, context) {
            createNote(data, context || currentContext);
            updateNotesVisibilityForContext(currentContext);
            saveNotesToStorage();
        };

        loadToggleState();
        loadAllNotesFromStorage();

        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('tabs__tab')) {
                setTimeout(() => {
                    const newContext = getCurrentContext();
                    if (newContext !== currentContext) {
                        currentContext = newContext;
                        storageKey = noteStorageKey(window.location.pathname, currentContext);
                        updateNotesVisibilityForContext(newContext);
                    }
                }, 100);
            }
        });

        function getCurrentContext() {
            const activeTab = document.querySelector('.tabs__tab--active');
            if (activeTab) {
                return activeTab.getAttribute('data-tab') || activeTab.textContent.trim().toLowerCase().replace(/\s+/g, '-');
            }
            return 'main';
        }
        addNoteBtn.addEventListener('click', function() {
            createNote();
        });
        hideNotesToggle.addEventListener('change', function() {
            const isHidden = !this.checked;
            notes.forEach(note => {
                if (isHidden) {
                    note.element.classList.add('annotation-note--hidden');
                } else {
                    note.element.classList.remove('annotation-note--hidden');
                }
            });
            setNotesVisibilityIcon(this.checked);
            saveToggleState();
        });

        /* The icon reports the STATE (eye = notes are on screen), the way a layer
           visibility control does; the tooltip reports the ACTION, because that is what
           a click will do. */
        function setNotesVisibilityIcon(shown) {
            const label = hideNotesToggle.closest('label');
            const symbol = label && label.querySelector('sf-symbol');
            if (symbol) symbol.setAttribute('name', shown ? 'eye' : 'eye.slash');
            const action = shown ? 'Hide notes' : 'Show notes';
            const tip = document.getElementById('hideNotesTip');
            if (tip) tip.textContent = action;
            hideNotesToggle.setAttribute('aria-label', action);
        }

        /* Ribbon tooltips are position:fixed so they can escape the ribbon body's overflow
           clip, which means CSS cannot anchor them — each is placed from its control's rect
           on hover. Any control carrying data-tip="<tip id>" is wired here, so adding one is
           markup only. Re-measuring on every hover is cheap and keeps the tip right after a
           ribbon collapse or a resize has moved the control. Hover only, to match the CSS: the
           tip is not shown on focus (that left it stuck after a click), so there is nothing to
           place then. */
        function initRibbonTooltips() {
            document.querySelectorAll('[data-tip]').forEach(control => {
                if (control.dataset.tipWired) return;
                control.dataset.tipWired = '1';
                control.addEventListener('mouseenter', () => {
                    const tip = document.getElementById(control.dataset.tip);
                    if (!tip) return;
                    const r = control.getBoundingClientRect();
                    tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
                    tip.style.top = `${Math.round(r.bottom + 8)}px`;
                });
            });
        }

        function loadToggleState() {
            try {
                const toggleStateKey = `${siteTitle.toLowerCase()}-annotations-toggle-state`;
                const savedState = localStorage.getItem(toggleStateKey);
                if (savedState !== null) {
                    const isChecked = savedState === 'true';
                    hideNotesToggle.checked = isChecked;
                    if (!isChecked) {
                        setTimeout(() => {
                            notes.forEach(note => {
                                note.element.classList.add('annotation-note--hidden');
                            });
                        }, 100);
                    }
                }
            } catch (error) {
                console.warn('Failed to load toggle state from localStorage:', error);
            }
            // Unconditional: the markup ships `eye` + checked, so this only matters when a
            // saved state flipped it — but reading it back off the checkbox covers both.
            setNotesVisibilityIcon(hideNotesToggle.checked);
            initRibbonTooltips();
        }

        function saveToggleState() {
            try {
                const toggleStateKey = `${siteTitle.toLowerCase()}-annotations-toggle-state`;
                localStorage.setItem(toggleStateKey, hideNotesToggle.checked.toString());
            } catch (error) {
                console.warn('Failed to save toggle state to localStorage:', error);
            }
        }

        function getAllTabContexts() {
            const tabs = document.querySelectorAll('.tabs__tab');
            const contexts = ['main'];
            
            tabs.forEach(tab => {
                const context = tab.getAttribute('data-tab') || tab.textContent.trim().toLowerCase().replace(/\s+/g, '-');
                if (context && !contexts.includes(context)) {
                    contexts.push(context);
                }
            });
            
            return contexts;
        }

        function updateNotesVisibilityForContext(context) {
            notes.forEach(note => {
                if (note.context === context) {
                    note.element.style.display = '';
                } else {
                    note.element.style.display = 'none';
                }
            });
        }

        function loadAllNotesFromStorage() {
            try {
                const allContexts = getAllTabContexts();
                allContexts.forEach(context => {
                    const contextStorageKey = noteStorageKey(window.location.pathname, context);
                    const savedNotes = localStorage.getItem(contextStorageKey);
                    
                    if (savedNotes) {
                        const notesData = JSON.parse(savedNotes);
                        notesData.forEach(noteData => {
                            createNote(noteData, context);
                        });
                    }
                });
                updateNotesVisibilityForContext(currentContext);
            } catch (error) {
                console.warn('Failed to load annotations from localStorage:', error);
            }
        }

        function loadNotesFromStorage() {
            try {
                const savedNotes = localStorage.getItem(storageKey);
                if (savedNotes) {
                    const notesData = JSON.parse(savedNotes);
                    notesData.forEach(noteData => {
                        createNote(noteData, currentContext);
                    });
                }
            } catch (error) {
                console.warn('Failed to load annotations from localStorage:', error);
            }
        }

        function saveNotesToStorage() {
            try {
                const notesByContext = {};
                
                notes.forEach(note => {
                    const context = note.context || currentContext;
                    if (!notesByContext[context]) {
                        notesByContext[context] = [];
                    }
                    notesByContext[context].push({
                        id: note.id,
                        text: note.element.querySelector('.annotation-note__textarea').value,
                        left: note.element.style.left,
                        top: note.element.style.top,
                        isCollapsed: note.isCollapsed
                    });
                });
                
                const allContexts = getAllTabContexts();
                allContexts.forEach(context => {
                    const contextStorageKey = noteStorageKey(window.location.pathname, context);
                    const notesData = notesByContext[context] || [];
                    
                    if (notesData.length > 0) {
                        localStorage.setItem(contextStorageKey, JSON.stringify(notesData));
                    } else {
                        localStorage.removeItem(contextStorageKey);
                    }
                });
            } catch (error) {
                console.warn('Failed to save annotations to localStorage:', error);
            }
        }

        function createNote(savedData = null, context = null) {
            noteCounter++;
            const noteId = savedData ? savedData.id : `note-${Date.now()}-${noteCounter}`;
            const noteContext = context || currentContext;
            const noteElement = document.createElement('div');
            noteElement.className = 'annotation-note';
            noteElement.id = noteId;
            // Readable from the element so notes-plus can bin and restore a note into the
            // tab context it belonged to, rather than guessing 'main' and having it come
            // back hidden.
            noteElement.setAttribute('data-note-context', noteContext);
            if (savedData) {
                noteElement.style.left = savedData.left;
                noteElement.style.top = savedData.top;
            } else {
                noteElement.style.left = `${100 + (noteCounter * 20)}px`;
                noteElement.style.top = `${100 + (noteCounter * 20)}px`;
            }
            
            noteElement.innerHTML = `
                <div class="annotation-note__header">
                    <div class="annotation-note__controls">
                        <button class="annotation-note__btn annotation-note__btn--collapse" title="Collapse note"><sf-symbol name="chevron.up"></sf-symbol></button>
                        <button class="annotation-note__btn annotation-note__btn--remove" title="Delete note"><sf-symbol name="trash"></sf-symbol></button>
                    </div>
                </div>
                <div class="annotation-note__content">
                    <textarea class="annotation-note__textarea" placeholder="Type your note here..."></textarea>
                </div>
                <div class="annotation-note__collapsed-icon">💬</div>
            `;
            
            document.body.appendChild(noteElement);
            const note = {
                id: noteId,
                element: noteElement,
                isCollapsed: savedData ? savedData.isCollapsed : false,
                context: noteContext
            };
            notes.push(note);
            if (savedData && savedData.text) {
                const textarea = noteElement.querySelector('.annotation-note__textarea');
                textarea.value = savedData.text;
                textarea.dispatchEvent(new Event('input'));
            }
            if (savedData && savedData.isCollapsed) {
                noteElement.classList.add('annotation-note--collapsed');
                setCollapseIcon(noteElement.querySelector('.annotation-note__btn--collapse'), true);
            }
            initializeNoteDrag(note);
            initializeNoteControls(note);
            initializeNoteTextarea(note);
            if (!savedData) {
                saveNotesToStorage();
            }
        }

        // Chevron points the way the click goes, matching the ribbon's own pull tab.
        function setCollapseIcon(btn, collapsed) {
            if (!btn) return;
            const symbol = btn.querySelector('sf-symbol');
            if (symbol) symbol.setAttribute('name', collapsed ? 'chevron.down' : 'chevron.up');
            btn.title = collapsed ? 'Expand note' : 'Collapse note';
        }

        function initializeNoteDrag(note) {
            const noteElement = note.element;
            let isDragging = false;
            let hasDragged = false;
            let offsetX = 0;
            let offsetY = 0;

            noteElement.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            function dragStart(e) {
                // closest(), not classList: the control buttons hold an <sf-symbol>, so a
                // click on the visible glyph targets that element rather than the button.
                if (e.target.closest('.annotation-note__textarea, .annotation-note__btn')) {
                    return;
                }

                isDragging = true;
                hasDragged = false;
                const rect = noteElement.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                
                noteElement.style.cursor = 'grabbing';
                e.preventDefault();
            }

            function drag(e) {
                if (isDragging) {
                    e.preventDefault();
                    hasDragged = true;
                    noteElement.style.left = `${e.clientX - offsetX}px`;
                    noteElement.style.top = `${e.clientY - offsetY}px`;
                }
            }

            function dragEnd(e) {
                if (isDragging) {
                    isDragging = false;
                    noteElement.style.cursor = 'move';
                    saveNotesToStorage();
                }
            }
            note.hasDragged = () => hasDragged;
            note.resetDragFlag = () => { hasDragged = false; };
        }

        function initializeNoteControls(note) {
            const collapseBtn = note.element.querySelector('.annotation-note__btn--collapse');
            const removeBtn = note.element.querySelector('.annotation-note__btn--remove');
            collapseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                note.isCollapsed = !note.isCollapsed;
                note.element.classList.toggle('annotation-note--collapsed', note.isCollapsed);
                setCollapseIcon(collapseBtn, note.isCollapsed);
                saveNotesToStorage();
            });

            note.element.addEventListener('click', function(e) {
                if (note.hasDragged && note.hasDragged()) {
                    note.resetDragFlag();
                    return;
                }

                if (note.isCollapsed && !e.target.closest('.annotation-note__btn')) {
                    note.isCollapsed = false;
                    note.element.classList.remove('annotation-note--collapsed');
                    setCollapseIcon(collapseBtn, false);
                    saveNotesToStorage();
                }
            });
            // Notes Plus (notes-plus.js) registers a confirmRemove guard that asks
            // first and keeps a copy in its bin. Without it, or for a note it never
            // adopted, the delete stays immediate.
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const guard = window.DaVinciNotes && window.DaVinciNotes.confirmRemove;
                if (guard && guard(note.element, doRemove)) return;
                doRemove();

                function doRemove() {
                    note.element.remove();
                    notes = notes.filter(n => n.id !== note.id);
                    saveNotesToStorage();
                }
            });
        }

        function initializeNoteTextarea(note) {
            const textarea = note.element.querySelector('.annotation-note__textarea');

            textarea.addEventListener('input', function() {
                saveNotesToStorage();
            });
        }
    }


    // Find the current page in navigation and return its data
    function findCurrentPageData(navigationData) {
        const currentPath = window.location.pathname;
        
        let normalizedPath = currentPath.replace(/\/$/, '').replace(/^\//, '');
        const pathMatch = normalizedPath.match(/(prototypes\/[^\/]+)/);
        if (pathMatch) {
            normalizedPath = pathMatch[1];
        }
        
        for (const item of navigationData.mainNavigation || []) {
            if (item.subItems) {
                for (const subItem of item.subItems) {
                    if (subItem.url && subItem.url !== '#') {
                        const normalizedUrl = subItem.url.replace(/\/$/, '').replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
                        if (normalizedPath === normalizedUrl || normalizedPath.endsWith(normalizedUrl)) {
                            return {
                                label: subItem.label,
                                subHeader: subItem.subHeader,
                                navbarRight: subItem.navbarRight
                            };
                        }
                    }
                }
            }
            if (item.url && item.url !== '#') {
                const normalizedUrl = item.url.replace(/\/$/, '').replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
                if (normalizedPath === normalizedUrl || normalizedPath.endsWith(normalizedUrl)) {
                    return {
                        label: item.label,
                        subHeader: item.subHeader,
                        navbarRight: item.navbarRight
                    };
                }
            }
        }
        return {
            label: navigationData.siteTitle || "DaVinci",
            subHeader: undefined
        };
    }


    // Add active class to current navigation item
    function setActiveNavigationItem() {
        const currentPath = window.location.pathname;
        
        document.querySelectorAll('.nav-menu__link, .nav-menu__dropdown-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href && currentPath.includes(href) && href !== '#') {
                link.classList.add('nav-menu__link--active');
                
                const parentDropdown = link.closest('.nav-menu__item--has-dropdown');
                if (parentDropdown) {
                    parentDropdown.classList.add('nav-menu__item--active');
                }
            }
        });
    }

    // Adjust URLs in navigation data to be relative to current page
    function adjustNavigationUrls(data) {
        const depth = (assetsBasePath.match(/\.\.\//g) || []).length;
        const basePathToRoot = depth > 0 ? '../'.repeat(depth) : './';

        function adjustUrl(url) {
            if (!url || url.startsWith('#') || url.startsWith('http')) {
                return url;
            }
            const cleanUrl = url.replace(/^\.\//, '');
            return basePathToRoot + cleanUrl;
        }
        if (data.homeUrl) {
            data.homeUrl = adjustUrl(data.homeUrl);
        }
        if (data.mainNavigation) {
            data.mainNavigation.forEach(item => {
                if (item.url) item.url = adjustUrl(item.url);
                if (item.subItems) {
                    item.subItems.forEach(subItem => {
                        if (subItem.url) subItem.url = adjustUrl(subItem.url);
                    });
                }
            });
        }
        if (data.userMenu) {
            data.userMenu.forEach(item => {
                if (item.url) item.url = adjustUrl(item.url);
            });
        }
        if (data.footer && data.footer.links) {
            data.footer.links.forEach(link => {
                if (link.url) link.url = adjustUrl(link.url);
            });
        }

        return data;
    }

    // Main initialization function
    async function init(options = {}) {
        try {
            Object.assign(config, options);

            // Chrome config resolves FIRST: it decides which feature scripts are worth loading below.
            // Precedence: window.DAVINCI_CONFIG.canvas (arrived via options) > .davinci/config.json.
            const workspaceConfig = await fetchCanvasConfig();
            const chrome = resolveChrome(workspaceConfig && workspaceConfig.canvas, config.canvas);
            const wantsChangeHistory = chrome.ribbon.enabled && chrome.ribbon.features.changeHistory !== false;
            const wantsNotes = chrome.ribbon.enabled && chrome.ribbon.features.notes !== false;
            const wantsLiveEditor = chrome.ribbon.enabled && chrome.ribbon.features.liveEditor !== false;

            if (typeof Handlebars === 'undefined') {
                await loadResource(`${assetsBasePath}/canvas/handlebars.min.js`, 'js');
            }
            Handlebars.registerHelper('or', function() {
                return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
            });

            // Resolve the active design system's runtime bundle from its pack manifest.
            // Packs are self-describing (design-system.json names its runtime entry points).
            // No manifest => no design system is loaded (a workspace selects one via the
            // prototype flow); we never guess a bundle name.
            let dsRuntime = null;
            try {
                const dsManifest = await fetchContent(`${config.designSystemPath}/design-system.json`);
                if (dsManifest && dsManifest.runtime && dsManifest.runtime.css && dsManifest.runtime.js) {
                    dsRuntime = { css: dsManifest.runtime.css, js: dsManifest.runtime.js };
                }
            } catch (e) { /* no pack manifest present */ }
            if (!dsRuntime) {
                console.warn(`DaVinci: no design-system manifest at ${config.designSystemPath}/design-system.json — no design system will be loaded. Select one via the prototype flow.`);
            }

            // Load CSS and feature-module JS (design-system CSS only when a pack is active).
            // The Live Editor's stylesheet is its own file rather than part of canvas-styles.css:
            // it is larger than the whole canvas stylesheet and only a prototype with the feature
            // on should pay for it.
            await Promise.all([
                ...(dsRuntime ? [loadResource(`${config.designSystemPath}/${dsRuntime.css}`)] : []),
                loadResource(`${config.pluginsPath}/plugins.css`).catch(() => {}),
                loadResource(`${config.canvasPartsPath}/../canvas-styles.css`),
                loadResource(`${assetsBasePath}/canvas/sf-symbols/default.css`),
                loadResource(`${assetsBasePath}/canvas/sf-symbols/replace.css`),
                resolveSfSymbolsEndpoint().then(endpoint =>
                    loadResource(`${assetsBasePath}/canvas/sf-symbols/sf-symbol.js`, 'js', { 'data-endpoint': endpoint })
                ),
                ...(wantsChangeHistory
                    ? [loadResource(`${assetsBasePath}/canvas/change-history-system.js`, 'js')]
                    : []),
                ...(wantsNotes
                    ? [loadResource(`${assetsBasePath}/canvas/notes-plus.js`, 'js')]
                    : []),
                ...(wantsLiveEditor
                    ? [
                        loadResource(`${assetsBasePath}/canvas/live-editor-system.css`),
                        loadResource(`${assetsBasePath}/canvas/live-editor-system.js`, 'js')
                      ]
                    : [])
            ]);

            const [parts, data, changelog] = await Promise.all([
                Promise.all(config.canvasParts.map(async (name) => ({
                    name,
                    html: await fetchContent(`${config.canvasPartsPath}/${name}.html`)
                }))),
                fetchNavigationData().catch(() => ({
                    siteTitle: "DaVinci",
                    siteLogo: "👨🏻‍🎨",
                    mainNavigation: [{ label: "Dashboard", url: "#dashboard" }],
                    user: { username: "User", avatarInitials: "U" },
                    userMenu: [{ label: "Profile", url: "#profile" }],
                    subHeader: { title: "Page Title" },
                    footer: { text: "© 2024 DaVinci", links: [] }
                })),
                // Probe the prototype's changelog up front so the Change History button can be
                // rendered only when there is history to show. Previously the button always
                // rendered and the drawer said "No Change History Available" on open.
                wantsChangeHistory
                    ? fetchContent('./changelog.json').catch(() => null)
                    : Promise.resolve(null)
            ]);

            const hasChangelog = !!(changelog && Array.isArray(changelog.entries) && changelog.entries.length > 0);

            const usersData = await fetchUsersData();
            const activeUser = resolveActiveUser(usersData);
            const resolveAvatarPath = (src) => {
                if (!src) return null;
                if (/^(https?:|data:|\/)/.test(src)) return src;
                return `${davinciBase}/` + src.replace(/^\.\//, '');
            };
            if (activeUser) {
                data.user = {
                    username: activeUser.name,
                    avatarInitials: activeUser.avatarInitials,
                    avatarImage: resolveAvatarPath(activeUser.avatarImage)
                };
                data.impersonationUsers = usersData.users.map(u => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    avatarInitials: u.avatarInitials,
                    avatarImage: resolveAvatarPath(u.avatarImage),
                    isActive: u.id === activeUser.id
                }));
            } else {
                data.impersonationUsers = [];
            }
            data.hasImpersonationUsers = data.impersonationUsers.length > 0;
            data.hasUserMenu = Array.isArray(data.userMenu) && data.userMenu.length > 0;
            // Base for navbar logo/icon in header.html (files/ lives alongside assets/, i.e. under .davinci/).
            data.filesBase = `${davinciBase}/files`;

            adjustNavigationUrls(data);
            const currentPageData = findCurrentPageData(data);
            
            if (currentPageData.subHeader !== undefined) {
                if (typeof currentPageData.subHeader === 'string') {
                    data.subHeader = { title: currentPageData.subHeader };
                } else if (currentPageData.subHeader === null || currentPageData.subHeader === false) {
                    data.subHeader = { title: '' };
                } else {
                    data.subHeader = currentPageData.subHeader;
                }
            } else if (data.subHeader && (data.subHeader.title === undefined || data.subHeader.title === null)) {
                data.subHeader.title = currentPageData.label;
            }
            data.hasSubheader = data.subHeader && ((data.subHeader.title && data.subHeader.title.trim() !== '') || data.subHeader.htmlContent);

            // Per-page navbarRight overrides the global one (a page may set null/false to force the default user menu)
            if (currentPageData.navbarRight !== undefined) {
                data.navbarRight = currentPageData.navbarRight;
            }

            // An explicit position:"replace" is honored even with empty htmlContent — this renders an
            // empty right section (hides the user menu/actions). htmlContent alone triggers before/after.
            if (data.navbarRight && (data.navbarRight.htmlContent || data.navbarRight.position === 'replace')) {
                const pos = data.navbarRight.position || 'before-user';
                data.navbarRight = {
                    htmlContent: data.navbarRight.htmlContent || '',
                    position: pos,
                    before: pos === 'before-user',
                    after: pos === 'after-user',
                    replace: pos === 'replace'
                };
            } else {
                data.navbarRight = null;
            }

            // Chrome (ribbon + footer) template data. Set AFTER adjustNavigationUrls, which reads a
            // vestigial nav-data `footer.links` that nothing has rendered since the footer became
            // config-driven.
            //
            // Collapse state has three outcomes, not two. A stored value always wins and suppresses
            // the countdown: it means the reviewer already chose, so re-running the countdown would
            // undo a deliberate "keep it open".
            let ribbonCollapsed = false;
            let ribbonCountdown = 0;
            if (chrome.ribbon.collapsible) {
                let stored = null;
                try { stored = localStorage.getItem(RIBBON_COLLAPSED_STORAGE_KEY); } catch (e) {}
                if (stored !== null) {
                    ribbonCollapsed = stored === 'true';
                } else if (chrome.ribbon.collapsedByDefault) {
                    const delay = Math.max(0, Math.floor(Number(chrome.ribbon.autoHideDelay)) || 0);
                    // delay 0 => collapse straight away, no countdown. Otherwise start OPEN and
                    // count down, so the reviewer learns the bar exists before it disappears.
                    ribbonCollapsed = delay === 0;
                    ribbonCountdown = delay;
                }
            }

            // Unknown tab positions fall back to centered rather than dropping the modifier class,
            // which would leave the tab unpositioned (no left/transform lives on the base rule).
            const TAB_POSITIONS = ['center', 'left', 'right'];
            let tabPosition = chrome.ribbon.tabPosition || 'center';
            if (!TAB_POSITIONS.includes(tabPosition)) {
                console.warn(`DaVinci: unknown ribbon.tabPosition "${tabPosition}" — using "center". Expected one of: ${TAB_POSITIONS.join(', ')}.`);
                tabPosition = 'center';
            }

            data.ribbon = {
                ...chrome.ribbon,
                collapsed: ribbonCollapsed,
                countdown: ribbonCountdown,
                tabPosition,
                // The config flag is an off switch only; it never forces the button on for a
                // prototype that has no changelog to show.
                showChangeHistory: wantsChangeHistory && hasChangelog,
                // No content precondition here, unlike showChangeHistory: the Live Editor
                // inspects whatever is on the page, so the flag alone decides it.
                showLiveEditor: wantsLiveEditor
            };
            data.footer = {
                ...chrome.footer,
                visible: chrome.footer.enabled !== false &&
                    !!(chrome.footer.left || chrome.footer.center || chrome.footer.right)
            };
            data.navbar = {
                ...chrome.navbar,
                visible: chrome.navbar.enabled !== false
            };

            const pageContent = document.getElementById('page-content')?.innerHTML || '<p>No content defined</p>';
            const canvasData = { ...data, pageContent };
            const renderedHTML = parts.map(({ html }) =>
                Handlebars.compile(html)(canvasData)
            ).join('\n');
            const appContainer = document.getElementById('app');
            if (!appContainer) throw new Error('App container with id="app" not found');
            
            // Inject content into DOM FIRST (before MDS JS loads)
            appContainer.innerHTML = renderedHTML;

            // Ribbon colors as inline custom properties, and only for keys actually configured, so
            // canvas-styles.css keeps resolving its own var() fallback chain otherwise. borderColor
            // and the two button keys pair with the --bordered / --btn-bg / --btn-text modifier
            // classes the template renders: the class is what lets an unset key stay out of the way
            // entirely (no hairline at all; the design system's own button styling).
            const ribbonEl = appContainer.querySelector('.prototype-ribbon');
            if (ribbonEl) {
                if (chrome.ribbon.background) ribbonEl.style.setProperty('--davinci-ribbon-bg', chrome.ribbon.background);
                if (chrome.ribbon.textColor) ribbonEl.style.setProperty('--davinci-ribbon-text', chrome.ribbon.textColor);
                if (chrome.ribbon.borderColor) ribbonEl.style.setProperty('--davinci-ribbon-border', chrome.ribbon.borderColor);
                if (chrome.ribbon.buttonBackground) ribbonEl.style.setProperty('--davinci-ribbon-btn-bg', chrome.ribbon.buttonBackground);
                if (chrome.ribbon.buttonTextColor) ribbonEl.style.setProperty('--davinci-ribbon-btn-text', chrome.ribbon.buttonTextColor);
                if (chrome.ribbon.buttonBorderColor) ribbonEl.style.setProperty('--davinci-ribbon-btn-border', chrome.ribbon.buttonBorderColor);
                // The notes group needs no modifier class of its own: canvas-styles.css owns all
                // three of its properties outright, so each var() can carry a real fallback and an
                // unset key simply resolves to it. The buttons above need the classes because there
                // the fallback is "whatever the design system already does", which a var() cannot say.
                if (chrome.ribbon.notesBackground) ribbonEl.style.setProperty('--davinci-ribbon-notes-bg', chrome.ribbon.notesBackground);
                if (chrome.ribbon.notesTextColor) ribbonEl.style.setProperty('--davinci-ribbon-notes-text', chrome.ribbon.notesTextColor);
                if (chrome.ribbon.notesBorderColor) ribbonEl.style.setProperty('--davinci-ribbon-notes-border', chrome.ribbon.notesBorderColor);
            }

            // NOW load the design system's JavaScript — content is already in DOM so components will be found
            if (dsRuntime) await loadResource(`${config.designSystemPath}/${dsRuntime.js}`, 'js');

            // Load plugins JavaScript (graceful 404 if no plugins exist)
            await loadResource(`${config.pluginsPath}/plugins.js`, 'js').catch(() => {});

            // siteTitle may contain HTML (rendered raw in the navbar via {{{siteTitle}}}).
            // Strip tags for consumers that use it as a plain-text key/label.
            const plainSiteTitle = (data.siteTitle || 'App').replace(/<[^>]*>/g, '').trim() || 'App';

            initializeEventListeners();
            initializeImpersonationControls();
            setActiveNavigationItem();
            if (wantsNotes) {
                initializeAnnotationSystem(plainSiteTitle);
                // After, not before: notes-plus adopts the notes the line above
                // just restored, and binds to a ribbon that is already rendered.
                if (window.NotesPlus) window.NotesPlus.init();
            }
            if (chrome.ribbon.enabled && chrome.ribbon.collapsible) {
                initializeRibbonCollapse(data.ribbon.countdown);
                initializeRibbonTabBackground();
            }

            if (activeUser) {
                applyPermissions(activeUser);
                observePermissions(() => activeUser);
            }

            // Initialize change history system from external module, handing it the changelog already
            // fetched above so opening the drawer costs no second request.
            if (data.ribbon.showChangeHistory && typeof DaVinciChangeHistory !== 'undefined') {
                DaVinciChangeHistory.initialize(plainSiteTitle, changelog);
            }

            // The Live Editor self-boots (it installs its outside-click shield as early as it can,
            // before any component registers a document-level dismiss handler), so all it needs
            // here is the ribbon toggle wired up now that the chrome is really in the DOM. Its own
            // boot() also tries this, so calling it twice is deliberate and idempotent.
            if (data.ribbon.showLiveEditor && typeof DaVinciLiveEditor !== 'undefined') {
                DaVinciLiveEditor.bindRibbonButton();
            }

            console.log('✓ Canvas loaded');
            const canvasReadyEvent = new CustomEvent('davinci:canvas:ready', {
                detail: { timestamp: Date.now(), impersonatedUser: activeUser || null }
            });
            document.dispatchEvent(canvasReadyEvent);

        } catch (error) {
            console.error('Canvas initialization error:', error);
            const appContainer = document.getElementById('app');
            if (appContainer) {
                appContainer.innerHTML = `
                    <div style="padding: 2rem; background: #fee; border: 2px solid #c00; margin: 2rem; border-radius: 8px;">
                        <h2 style="color: #c00; margin: 0 0 1rem 0;">Canvas Error</h2>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Check the browser console for details.</p>
                    </div>
                `;
            }
        }
    }

    return { init, config };
})();

// Auto-initialize when DOM is ready.
// A page may set `window.DAVINCI_CONFIG` BEFORE this script loads to override config
// defaults (merged via init's Object.assign) — e.g. point `designSystemPath` at a local
// pack for in-repo testing without going through the plugin/marketplace fetch flow.
const DAVINCI_AUTOINIT_OPTS = (typeof window !== 'undefined' && window.DAVINCI_CONFIG) || {};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DaVinciCanvas.init(DAVINCI_AUTOINIT_OPTS));
} else {
    DaVinciCanvas.init(DAVINCI_AUTOINIT_OPTS);
}