// DaVinci - Change History System
// Displays changelog from JSON file in a side drawer

const DaVinciChangeHistory = (function() {
    'use strict';

    // Changelog handed over by the canvas at init, so opening the drawer needs no second fetch.
    // Stays null on the legacy standalone path, where loadChangelogData() fetches on demand.
    let preloadedChangelog = null;

    // Initialize change history system
    function initialize(siteTitle, changelog) {
        const changeHistoryBtn = document.getElementById('changeHistoryBtn');

        if (!changeHistoryBtn) return;

        preloadedChangelog = changelog || null;

        // Create drawer HTML structure
        createDrawerStructure();

        // Add click handler to button
        changeHistoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openChangeHistoryDrawer();
        });

        console.log('✓ Change History system initialized');
    }

    // Create the drawer HTML structure
    function createDrawerStructure() {
        const drawerHTML = `
            <div class="drawer-overlay" id="changeHistoryDrawer">
                <div class="drawer drawer--right drawer--medium">
                    <div class="drawer__header">
                        <button class="drawer__close" id="closeChangeHistoryDrawer">
                            <sf-symbol name="xmark"></sf-symbol>
                        </button>
                        <h3 class="drawer__title">Change History</h3>
                    </div>
                    <div class="drawer__body" id="changeHistoryContent">
                        <div style="text-align: center; padding: var(--space-xl); color: var(--color-glyph-gray-secondary);">
                            <p>Loading change history...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append drawer to body
        document.body.insertAdjacentHTML('beforeend', drawerHTML);

        // Setup drawer close handlers
        setupDrawerHandlers();
    }

    // Setup drawer event handlers
    function setupDrawerHandlers() {
        const drawer = document.getElementById('changeHistoryDrawer');
        const closeBtn = document.getElementById('closeChangeHistoryDrawer');

        if (!drawer || !closeBtn) return;

        // Close button click
        closeBtn.addEventListener('click', function() {
            closeDrawer();
        });

        // Click outside drawer to close
        drawer.addEventListener('click', function(e) {
            if (e.target === drawer) {
                closeDrawer();
            }
        });

        // Prevent clicks inside drawer from closing
        const drawerContent = drawer.querySelector('.drawer');
        if (drawerContent) {
            drawerContent.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }

        // Escape key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && drawer.classList.contains('drawer-overlay--open')) {
                closeDrawer();
            }
        });
    }

    // Open the change history drawer
    async function openChangeHistoryDrawer() {
        const drawer = document.getElementById('changeHistoryDrawer');
        if (!drawer) return;

        // Show drawer
        drawer.classList.add('drawer-overlay--open');

        // Load changelog data
        await loadChangelogData();
    }

    // Close the drawer
    function closeDrawer() {
        const drawer = document.getElementById('changeHistoryDrawer');
        if (drawer) {
            drawer.classList.remove('drawer-overlay--open');
        }
    }

    // Load changelog data from JSON file
    async function loadChangelogData() {
        const contentDiv = document.getElementById('changeHistoryContent');
        if (!contentDiv) return;

        // Already handed to us by the canvas — render straight from it.
        if (preloadedChangelog) {
            renderChangelog(preloadedChangelog);
            return;
        }

        try {
            // Try to fetch changelog.json from the current prototype directory
            const response = await fetch('./changelog.json');

            if (!response.ok) {
                throw new Error('Changelog file not found');
            }

            const changelog = await response.json();
            renderChangelog(changelog);

        } catch (error) {
            console.warn('Could not load changelog:', error);
            renderNoChangelog();
        }
    }

    // Render changelog data
    function renderChangelog(changelog) {
        const contentDiv = document.getElementById('changeHistoryContent');
        if (!contentDiv) return;

        // Check if changelog has entries
        if (!changelog || !changelog.entries || changelog.entries.length === 0) {
            renderNoChangelog();
            return;
        }

        let html = '<div class="change-history-entries">';
        
        changelog.entries.forEach((entry, index) => {
            html += renderChangeEntry(entry, index);
        });

        html += '</div>';

        contentDiv.innerHTML = html;
    }

    // Render a single change entry
    function renderChangeEntry(entry, index) {
        let html = `
            <div class="change-entry" style="margin-bottom: var(--space-l);">
        `;

        // Date header
        if (entry.date) {
            html += `<h2 style="font-size: var(--font-size-sm); color: var(--color-glyph-gray); margin: 0 0 var(--space-m) 0; font-weight: 600;">${escapeHtml(entry.date)}</h2>`;
        }

        // Group changes by type
        const changesByType = {};
        if (entry.changes && entry.changes.length > 0) {
            entry.changes.forEach(change => {
                const type = change.type || 'other';
                if (!changesByType[type]) {
                    changesByType[type] = [];
                }
                changesByType[type].push(change.description);
            });
        }

        // Render each type group
        const typeOrder = ['added', 'changed', 'fixed', 'removed', 'deprecated', 'other'];
        typeOrder.forEach(type => {
            if (changesByType[type] && changesByType[type].length > 0) {
                const typeInfo = getChangeTypeInfo(type);
                html += `
                    <div style="margin-bottom: var(--space-m);">
                        <h3 style="font-size: var(--font-size-xs); color: var(--color-glyph-gray); margin: 0 0 var(--space-xs) 0; font-weight: 600; display: flex; align-items: center; gap: var(--space-xs);">
                            <span style="color: ${typeInfo.color}; font-size: 1.6rem; display: inline-flex;"><sf-symbol name="${typeInfo.icon}"></sf-symbol></span>
                            ${typeInfo.label}
                        </h3>
                        <ul style="margin: 0; padding-left: var(--space-m); color: var(--color-glyph-gray-secondary); font-size: var(--font-size-xxs); line-height: var(--line-height-default);">
                `;
                changesByType[type].forEach(description => {
                    html += `<li style="margin-bottom: var(--space-xxs);">${escapeHtml(description)}</li>`;
                });
                html += `
                        </ul>
                    </div>
                `;
            }
        });

        html += '</div>';

        return html;
    }

    // Get icon and label for change type
    function getChangeTypeInfo(type) {
        const types = {
            'added': {
                icon: 'checkmark',
                label: 'Added',
                color: 'var(--color-glyph-green)'
            },
            'changed': {
                icon: 'arrow.turn.left.up',
                label: 'Changed',
                color: 'var(--color-base-accent)'
            },
            'fixed': {
                icon: 'exclamationmark.bubble.circle',
                label: 'Fixed',
                color: 'var(--color-glyph-orange)'
            },
            'removed': {
                icon: 'trash.slash.square.fill',
                label: 'Removed',
                color: 'var(--color-glyph-red)'
            },
            'deprecated': {
                icon: 'xmark.bin.circle.fill',
                label: 'Deprecated',
                color: 'var(--color-glyph-gray-tertiary)'
            },
            'other': {
                icon: 'asterisk.circle.fill',
                label: 'Other',
                color: 'var(--color-glyph-gray-secondary)'
            }
        };
        return types[type] || types['other'];
    }

    // Render no changelog message.
    // Unreachable from the ribbon now that the button only renders when a changelog exists; kept as
    // the fallback for the legacy standalone path, which fetches on open.
    function renderNoChangelog() {
        const contentDiv = document.getElementById('changeHistoryContent');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div class="notification notification--info">
                <div class="notification__icon">ℹ️</div>
                <div class="notification__content">
                    <div class="notification__message">
                        <strong>No Change History Available</strong>
                    </div>
                    <div class="notification__description">
                        This prototype does not have a changelog.json file yet.
                    </div>
                </div>
            </div>
            <div style="margin-top: var(--space-m); padding: var(--space-m); background: var(--color-fill-secondary); border-radius: 0.8rem;">
                <h5 style="font-size: var(--font-size-xxs); color: var(--color-glyph-gray); margin: 0 0 var(--space-xs) 0;">Expected File Location</h5>
                <p style="color: var(--color-glyph-gray-secondary); font-size: var(--font-size-xxs); margin: 0; font-family: monospace;">./changelog.json</p>
            </div>
        `;
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { initialize };
})();
