// DaVinci - Context Bullet System
// Manages contextual annotations with read-only support in production

const DaVinciContextSystem = (function() {
    'use strict';

    // Initialize context bullet system for adding contextual annotations
    function initialize(siteTitle) {
        const addContextBtn = document.getElementById('addContextBtn');
        const exportContextsBtn = document.getElementById('exportContextsBtn');
        const hideContextsToggle = document.getElementById('hideContextsToggle');
        let contextCounter = 0;
        let contexts = [];
        let currentContext = getCurrentContext();
        let fileHandle = null;
        let activePopover = null;
        let hasTriedFileSystemAPI = false;
        let hasUnsavedChanges = false;
        let fileContexts = null; // Store the file version for comparison
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (!hideContextsToggle) return;

        // Hide Add Context and Export buttons in production
        if (addContextBtn && !isLocalhost) {
            addContextBtn.style.display = 'none';
        }
        if (exportContextsBtn && !isLocalhost) {
            exportContextsBtn.style.display = 'none';
        }

        // Hide Show Contexts toggle initially in production (will show only if contexts.json exists)
        if (!isLocalhost) {
            hideContextsToggle.parentElement.style.display = 'none';
        }

        loadToggleState();
        loadContextsFromFile();

        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('tabs__tab')) {
                setTimeout(() => {
                    const newContext = getCurrentContext();
                    if (newContext !== currentContext) {
                        currentContext = newContext;
                        updateContextsVisibilityForContext(newContext);
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

        if (addContextBtn) {
            addContextBtn.addEventListener('click', function() {
                createContextBullet();
            });
        }

        if (exportContextsBtn) {
            exportContextsBtn.addEventListener('click', function() {
                exportContextsToFile();
            });
        }

        hideContextsToggle.addEventListener('change', function() {
            const isHidden = !this.checked;
            contexts.forEach(context => {
                if (isHidden) {
                    context.element.classList.add('context-bullet--hidden');
                } else {
                    context.element.classList.remove('context-bullet--hidden');
                }
            });
            saveToggleState();
        });

        function loadToggleState() {
            try {
                const toggleStateKey = `${siteTitle.toLowerCase()}-contexts-toggle-state`;
                const savedState = localStorage.getItem(toggleStateKey);
                if (savedState !== null) {
                    const isChecked = savedState === 'true';
                    hideContextsToggle.checked = isChecked;
                    if (!isChecked) {
                        setTimeout(() => {
                            contexts.forEach(context => {
                                context.element.classList.add('context-bullet--hidden');
                            });
                        }, 100);
                    }
                }
            } catch (error) {
                console.warn('Failed to load context toggle state from localStorage:', error);
            }
        }

        function saveToggleState() {
            try {
                const toggleStateKey = `${siteTitle.toLowerCase()}-contexts-toggle-state`;
                localStorage.setItem(toggleStateKey, hideContextsToggle.checked.toString());
            } catch (error) {
                console.warn('Failed to save context toggle state to localStorage:', error);
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

        function updateContextsVisibilityForContext(context) {
            contexts.forEach(ctx => {
                if (ctx.context === context) {
                    ctx.element.style.display = '';
                } else {
                    ctx.element.style.display = 'none';
                }
            });
        }

        async function requestFileHandle() {
            if (fileHandle) return fileHandle;

            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'contexts.json',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                fileHandle = handle; // Store it for reuse
                return fileHandle;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to get file handle:', error);
                }
                return null;
            }
        }

        async function loadContextsFromFile() {
            try {
                const storageKey = `davinci-contexts-${window.location.pathname}`;
                const savedData = localStorage.getItem(storageKey);
                
                // Try to fetch contexts.json
                let fileData = null;
                try {
                    const response = await fetch('./contexts.json');
                    if (response.ok) {
                        fileData = await response.json();
                        fileContexts = fileData; // Store for comparison
                    }
                } catch (err) {
                    console.log('No contexts.json file found');
                }

                // In production, show toggle only if contexts.json exists and has data
                if (!isLocalhost) {
                    if (fileData && fileData.length > 0) {
                        hideContextsToggle.parentElement.style.display = '';
                    } else {
                        hideContextsToggle.parentElement.style.display = 'none';
                    }
                }

                // Compare localStorage with file
                if (savedData && fileData) {
                    const localData = JSON.parse(savedData);
                    const localHash = JSON.stringify(localData.sort((a, b) => a.id.localeCompare(b.id)));
                    const fileHash = JSON.stringify(fileData.sort((a, b) => a.id.localeCompare(b.id)));
                    
                    if (localHash !== fileHash) {
                        console.warn('⚠️ localStorage differs from contexts.json - using localStorage (unsaved changes)');
                        hasUnsavedChanges = true;
                    }
                    
                    // Load from localStorage (has latest edits)
                    localData.forEach(contextData => {
                        createContextBullet(contextData, contextData.context || currentContext);
                    });
                    updateContextsVisibilityForContext(currentContext);
                    updateExportButtonState();
                    console.log('✓ Loaded from localStorage');
                } else if (savedData) {
                    // Only localStorage exists
                    console.log('📦 Loading from localStorage');
                    const contextsData = JSON.parse(savedData);
                    hasUnsavedChanges = true; // localStorage but no file = unsaved
                    contextsData.forEach(contextData => {
                        createContextBullet(contextData, contextData.context || currentContext);
                    });
                    updateContextsVisibilityForContext(currentContext);
                    updateExportButtonState();
                    console.log('✓ Loaded from localStorage (no file found - unsaved changes)');
                } else if (fileData) {
                    // Only file exists
                    localStorage.setItem(storageKey, JSON.stringify(fileData));
                    fileData.forEach(contextData => {
                        createContextBullet(contextData, contextData.context || currentContext);
                    });
                    updateContextsVisibilityForContext(currentContext);
                    updateExportButtonState();
                    console.log('✓ Loaded from contexts.json and stored in localStorage');
                } else {
                    // No data at all - hide the button
                    updateExportButtonState();
                }
            } catch (error) {
                console.error('Error loading contexts:', error);
            }
        }

        function saveContextsToLocalStorage() {
            try {
                const contextsData = contexts.map(ctx => ({
                    id: ctx.id,
                    number: ctx.number,
                    title: ctx.title || '',
                    radar: ctx.radar || '',
                    comments: ctx.comments || '',
                    left: ctx.element.style.left,
                    top: ctx.element.style.top,
                    context: ctx.context
                }));

                const storageKey = `davinci-contexts-${window.location.pathname}`;
                localStorage.setItem(storageKey, JSON.stringify(contextsData));
                
                // Mark as unsaved and update UI
                hasUnsavedChanges = true;
                updateExportButtonState();
                markUnsavedBullets();
                
                console.log('💾 Saved to localStorage (unsaved changes)');
            } catch (error) {
                console.error('❌ Failed to save to localStorage:', error);
            }
        }

        function updateExportButtonState() {
            if (!exportContextsBtn) return;
            
            // Hide button if no contexts exist OR if everything is saved
            if (contexts.length === 0 || !hasUnsavedChanges) {
                exportContextsBtn.style.display = 'none';
                return;
            }
            
            // Show button only when there are unsaved changes (and we're on localhost)
            if (isLocalhost && hasUnsavedChanges) {
                exportContextsBtn.style.display = '';
                exportContextsBtn.classList.add('btn--warning');
                exportContextsBtn.textContent = '💾 Export Contexts (Unsaved)';
                exportContextsBtn.title = 'You have unsaved changes - export to update contexts.json';
            }
        }

        function markUnsavedBullets() {
            if (!fileContexts) {
                // No file to compare against - mark all as unsaved
                contexts.forEach(ctx => {
                    ctx.element.classList.add('context-bullet--unsaved');
                });
                return;
            }

            // Compare each context with file version
            contexts.forEach(ctx => {
                const fileVersion = fileContexts.find(f => f.id === ctx.id);
                
                if (!fileVersion) {
                    // New context not in file
                    ctx.element.classList.add('context-bullet--unsaved');
                } else {
                    // Check if modified
                    const isModified =
                        fileVersion.title !== ctx.title ||
                        fileVersion.radar !== ctx.radar ||
                        fileVersion.comments !== ctx.comments ||
                        fileVersion.left !== ctx.element.style.left ||
                        fileVersion.top !== ctx.element.style.top;
                    
                    if (isModified) {
                        ctx.element.classList.add('context-bullet--unsaved');
                    } else {
                        ctx.element.classList.remove('context-bullet--unsaved');
                    }
                }
            });
        }

        function exportContextsToFile() {
            try {
                const contextsData = contexts.map(ctx => ({
                    id: ctx.id,
                    number: ctx.number,
                    title: ctx.title || '',
                    radar: ctx.radar || '',
                    comments: ctx.comments || '',
                    left: ctx.element.style.left,
                    top: ctx.element.style.top,
                    context: ctx.context
                }));

                const jsonContent = JSON.stringify(contextsData, null, 2);
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'contexts.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // After export, assume user will update the file
                // Mark as saved and update file contexts
                fileContexts = contextsData;
                hasUnsavedChanges = false;
                updateExportButtonState();
                
                // Remove unsaved markers from all bullets
                contexts.forEach(ctx => {
                    ctx.element.classList.remove('context-bullet--unsaved');
                });
                
                console.log('✓ Exported contexts.json');
                console.log('📋 Save this file to your prototype folder, then refresh to sync');
            } catch (error) {
                console.error('❌ Failed to export contexts:', error);
            }
        }

        function createContextBullet(savedData = null, context = null) {
            const bulletNumber = savedData ? savedData.number : (contextCounter + 1);
            const bulletId = savedData ? savedData.id : `context-${Date.now()}-${bulletNumber}`;
            const bulletContext = context || currentContext;
            
            const bulletElement = document.createElement('div');
            bulletElement.className = 'context-bullet';
            bulletElement.id = bulletId;
            bulletElement.textContent = bulletNumber;
            
            if (savedData) {
                bulletElement.style.left = savedData.left;
                bulletElement.style.top = savedData.top;
            } else {
                bulletElement.style.left = `${150 + (contextCounter * 30)}px`;
                bulletElement.style.top = `${150 + (contextCounter * 30)}px`;
                // New bullets are unsaved by default (orange)
                bulletElement.classList.add('context-bullet--unsaved');
            }
            
            document.body.appendChild(bulletElement);
            
            const contextObj = {
                id: bulletId,
                number: bulletNumber,
                element: bulletElement,
                title: savedData ? savedData.title : '',
                radar: savedData ? savedData.radar : '',
                comments: savedData ? savedData.comments : '',
                context: bulletContext
            };
            
            contexts.push(contextObj);
            contextCounter = Math.max(contextCounter, bulletNumber);
            
            initializeBulletDrag(contextObj);
            initializeBulletClick(contextObj);
            
            if (!savedData) {
                // Open popover for new bullets
                setTimeout(() => openContextPopover(contextObj, false), 100);
            }
        }

        function initializeBulletDrag(context) {
            const bulletElement = context.element;
            let isDragging = false;
            let hasDragged = false;
            let offsetX = 0;
            let offsetY = 0;
            let startX = 0;
            let startY = 0;
            const DRAG_THRESHOLD = 10; // pixels

            bulletElement.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);

            function dragStart(e) {
                isDragging = true;
                hasDragged = false;
                const rect = bulletElement.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                startX = e.clientX;
                startY = e.clientY;
                
                e.preventDefault();
            }

            function drag(e) {
                if (isDragging) {
                    e.preventDefault();
                    
                    // Calculate distance from start position
                    const deltaX = Math.abs(e.clientX - startX);
                    const deltaY = Math.abs(e.clientY - startY);
                    
                    // Only start dragging if moved beyond threshold
                    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
                        if (!hasDragged) {
                            bulletElement.classList.add('context-bullet--dragging');
                        }
                        hasDragged = true;
                        bulletElement.style.left = `${e.clientX - offsetX}px`;
                        bulletElement.style.top = `${e.clientY - offsetY}px`;
                    }
                }
            }

            function dragEnd(e) {
                if (isDragging) {
                    isDragging = false;
                    bulletElement.classList.remove('context-bullet--dragging');
                    if (hasDragged) {
                        saveContextsToLocalStorage();
                    }
                }
            }

            context.hasDragged = () => hasDragged;
            context.resetDragFlag = () => { hasDragged = false; };
        }

        function initializeBulletClick(context) {
            context.element.addEventListener('click', function(e) {
                if (context.hasDragged && context.hasDragged()) {
                    context.resetDragFlag();
                    return;
                }
                
                // In production, always read-only. In localhost, editable unless it has complete data
                const hasCompleteData = context.title && context.title.trim() !== '' &&
                                       context.radar && context.radar.trim() !== '' &&
                                       context.comments && context.comments.trim() !== '';
                const isReadOnly = !isLocalhost || hasCompleteData;
                openContextPopover(context, isReadOnly);
            });
        }

        function openContextPopover(context, isReadOnly) {
            // Close any existing popover
            if (activePopover) {
                activePopover.remove();
            }

            const popover = document.createElement('div');
            popover.className = 'context-popover context-popover--open';
            if (isReadOnly) {
                popover.classList.add('context-popover__read-only');
            }
            
            const bulletRect = context.element.getBoundingClientRect();
            popover.style.left = `${bulletRect.right + 16}px`;
            popover.style.top = `${bulletRect.top}px`;
            
            // Footer buttons logic:
            // - Production: no buttons (read-only view only)
            // - Localhost + Read-only: Edit and Remove buttons
            // - Localhost + Edit mode: Cancel and Save buttons
            const footerButtons = !isLocalhost
                ? ''
                : isReadOnly
                    ? `<button class="btn btn--danger btn--small" data-action="remove">Remove</button>
                       <button class="btn btn--secondary btn--small" data-action="edit">Edit</button>`
                    : `<button class="btn btn--secondary btn--small" data-action="cancel">Cancel</button>
                       <button class="btn btn--primary btn--small" data-action="save">Save</button>`;
            
            popover.innerHTML = `
                <div class="context-popover__content">
                    <div class="context-popover__header">
                        <button class="context-popover__close" aria-label="Close">×</button>
                    </div>
                    <div class="context-popover__body">
                        <div class="form-group form-group--medium">
                            <label class="form-label" for="context-title-${context.id}">
                                Title${!isReadOnly ? ' *' : ''}
                            </label>
                            ${isReadOnly
                                ? `<input type="text" id="context-title-${context.id}" class="form-input" value="${context.title || ''}" readonly>`
                                : `<input type="text" id="context-title-${context.id}" class="form-input" placeholder="Insert title" value="${context.title || ''}" required>
                                   <span class="form-error" id="context-title-error-${context.id}" style="display: none;">Title is required</span>`
                            }
                        </div>
                        <div class="form-group form-group--medium">
                            <label class="form-label" for="context-radar-${context.id}">
                                Radar${!isReadOnly ? ' *' : ''}
                            </label>
                            ${isReadOnly
                                ? `<input type="text" id="context-radar-${context.id}" class="form-input" value="${context.radar}" readonly>`
                                : `<input type="text" id="context-radar-${context.id}" class="form-input" placeholder="Insert Radar ID" value="${context.radar || ''}" required>
                                   <span class="form-error" id="context-radar-error-${context.id}" style="display: none;">Radar is Required</span>`
                            }
                        </div>
                        <div class="form-group form-group--medium">
                            <label class="form-label" for="context-comments-${context.id}">Comments (optional)</label>
                            <span class="char-count" id="context-comments-count-${context.id}">500</span>
                            <textarea id="context-comments-${context.id}" class="form-textarea" placeholder="Insert Comments" maxlength="500" ${isReadOnly ? 'readonly' : ''}>${context.comments || ''}</textarea>
                        </div>
                    </div>
                    ${footerButtons ? `<div class="context-popover__footer">${footerButtons}</div>` : ''}
                </div>
            `;
            
            document.body.appendChild(popover);
            activePopover = popover;
            
            // Position adjustment if popover goes off screen
            const popoverRect = popover.getBoundingClientRect();
            if (popoverRect.right > window.innerWidth) {
                popover.style.left = `${bulletRect.left - popoverRect.width - 16}px`;
            }
            if (popoverRect.bottom > window.innerHeight) {
                popover.style.top = `${window.innerHeight - popoverRect.height - 16}px`;
            }
            
            // Add real-time validation and character count for edit mode
            if (!isReadOnly) {
                const titleInput = popover.querySelector(`#context-title-${context.id}`);
                const radarInput = popover.querySelector(`#context-radar-${context.id}`);
                const commentsInput = popover.querySelector(`#context-comments-${context.id}`);
                const titleError = popover.querySelector(`#context-title-error-${context.id}`);
                const radarError = popover.querySelector(`#context-radar-error-${context.id}`);
                const charCount = popover.querySelector(`#context-comments-count-${context.id}`);
                
                if (titleInput) {
                    titleInput.addEventListener('blur', () => {
                        if (!titleInput.value.trim()) {
                            titleInput.classList.add('form-input--invalid');
                            titleError.style.display = 'block';
                        } else {
                            titleInput.classList.remove('form-input--invalid');
                            titleError.style.display = 'none';
                        }
                    });
                    
                    titleInput.addEventListener('input', () => {
                        if (titleInput.value.trim()) {
                            titleInput.classList.remove('form-input--invalid');
                            titleError.style.display = 'none';
                        }
                    });
                }
                
                if (radarInput) {
                    radarInput.addEventListener('blur', () => {
                        if (!radarInput.value.trim()) {
                            radarInput.classList.add('form-input--invalid');
                            radarError.style.display = 'block';
                        } else {
                            radarInput.classList.remove('form-input--invalid');
                            radarError.style.display = 'none';
                        }
                    });
                    
                    radarInput.addEventListener('input', () => {
                        if (radarInput.value.trim()) {
                            radarInput.classList.remove('form-input--invalid');
                            radarError.style.display = 'none';
                        }
                    });
                }
                
                // Character count for textarea
                if (commentsInput && charCount) {
                    const updateCharCount = () => {
                        const remaining = 500 - commentsInput.value.length;
                        charCount.textContent = remaining;
                    };
                    
                    // Initialize count
                    updateCharCount();
                    
                    // Update on input
                    commentsInput.addEventListener('input', updateCharCount);
                }
            }
            
            // Event listeners
            const closeBtn = popover.querySelector('.context-popover__close');
            const actionButtons = popover.querySelectorAll('[data-action]');
            
            closeBtn.addEventListener('click', () => {
                popover.remove();
                activePopover = null;
            });
            
            actionButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.getAttribute('data-action');
                    handlePopoverAction(action, context, popover);
                });
            });
            
            // Close on escape
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    popover.remove();
                    activePopover = null;
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        }

        function handlePopoverAction(action, context, popover) {
            switch (action) {
                case 'save':
                    const titleInput = popover.querySelector(`#context-title-${context.id}`);
                    const radarInput = popover.querySelector(`#context-radar-${context.id}`);
                    const commentsInput = popover.querySelector(`#context-comments-${context.id}`);
                    const titleError = popover.querySelector(`#context-title-error-${context.id}`);
                    const radarError = popover.querySelector(`#context-radar-error-${context.id}`);
                    
                    // Validate required fields
                    let hasErrors = false;
                    
                    if (!titleInput.value.trim()) {
                        titleInput.classList.add('form-input--invalid');
                        titleError.style.display = 'block';
                        hasErrors = true;
                    } else {
                        titleInput.classList.remove('form-input--invalid');
                        titleError.style.display = 'none';
                    }
                    
                    if (!radarInput.value.trim()) {
                        radarInput.classList.add('form-input--invalid');
                        radarError.style.display = 'block';
                        hasErrors = true;
                    } else {
                        radarInput.classList.remove('form-input--invalid');
                        radarError.style.display = 'none';
                    }
                    
                    if (hasErrors) {
                        return; // Don't save if validation fails
                    }
                    
                    context.title = titleInput.value.trim();
                    context.radar = radarInput.value.trim();
                    context.comments = commentsInput.value.trim();
                    
                    saveContextsToLocalStorage();
                    popover.remove();
                    activePopover = null;
                    break;
                    
                case 'cancel':
                    popover.remove();
                    activePopover = null;
                    // If this was a new context with no data, remove it
                    if (!context.title && !context.radar && !context.comments) {
                        context.element.remove();
                        contexts = contexts.filter(c => c.id !== context.id);
                        // Update button state after removing context
                        updateExportButtonState();
                    }
                    break;
                    
                case 'edit':
                    popover.remove();
                    activePopover = null;
                    openContextPopover(context, false);
                    break;
                    
                case 'remove':
                    if (confirm(`Remove context #${context.number}?`)) {
                        context.element.remove();
                        contexts = contexts.filter(c => c.id !== context.id);
                        reindexContexts();
                        saveContextsToLocalStorage();
                        popover.remove();
                        activePopover = null;
                    }
                    break;
            }
        }

        function reindexContexts() {
            contexts.sort((a, b) => a.number - b.number);
            contexts.forEach((context, index) => {
                context.number = index + 1;
                context.element.textContent = context.number;
            });
            contextCounter = contexts.length;
            
            // After reindexing, update unsaved markers
            markUnsavedBullets();
        }

        // Close popover when clicking outside
        document.addEventListener('click', function(e) {
            if (activePopover &&
                !e.target.closest('.context-popover') &&
                !e.target.closest('.context-bullet')) {
                activePopover.remove();
                activePopover = null;
            }
        });
    }

    return { initialize };
})();
