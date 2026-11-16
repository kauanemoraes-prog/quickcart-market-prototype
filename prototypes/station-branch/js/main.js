/**
 * Station Branch Prototype Script
 * Handles interactive functionality for the station management interface
 */

/**
 * Initialize the page
 */
function init() {
    console.log('Workstation Branch prototype initializing...');
    
    // Initialize interactions
    initProcessActions();
    initAddItemActions();
    initConnectionSystem();
    
    console.log('Workstation Branch prototype initialized successfully');
}

/**
 * Initialize process info button actions
 */
function initProcessActions() {
    const processInfoBtns = document.querySelectorAll('.process-info-btn');
    
    processInfoBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const stationRow = btn.closest('.station-row');
            const stationName = stationRow ? stationRow.getAttribute('data-station') : 'Unknown';
            
            showProcessInfo(stationName);
        });
    });
}

/**
 * Initialize add item button actions
 */
function initAddItemActions() {
    const addItemBtns = document.querySelectorAll('.add-item-btn');
    
    addItemBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const column = btn.closest('.station-grid__column');
            const stationRow = btn.closest('.station-row');
            const stationName = stationRow ? stationRow.getAttribute('data-station') : 'Unknown';
            
            let itemType = 'item';
            if (column.classList.contains('station-grid__column--specification')) {
                itemType = 'specification';
            } else if (column.classList.contains('station-grid__column--equipment')) {
                itemType = 'equipment';
            } else if (column.classList.contains('station-grid__column--consumable')) {
                itemType = 'consumable';
            }
            
            handleAddItem(itemType, stationName, btn);
        });
    });
}

/**
 * Initialize connection system for dots
 */
function initConnectionSystem() {
    const connectionDots = document.querySelectorAll('.connection-dot');
    const svg = document.getElementById('connectionLines');
    let selectedDot = null;
    let isConnecting = false;
    let connections = [];
    
    connectionDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            handleDotClick(dot, svg);
        });
    });
    
    // Handle dot click for connection
    function handleDotClick(dot, svg) {
        if (!selectedDot) {
            // First dot selected
            selectedDot = dot;
            dot.classList.add('selected');
            isConnecting = true;
            showNotification('info', 'Select another dot to connect');
        } else if (selectedDot === dot) {
            // Same dot clicked - cancel connection
            selectedDot.classList.remove('selected');
            selectedDot = null;
            isConnecting = false;
            showNotification('info', 'Connection cancelled');
        } else {
            // Second dot selected - create connection
            createConnection(selectedDot, dot, svg);
            selectedDot.classList.remove('selected');
            selectedDot = null;
            isConnecting = false;
        }
    }
    
    // Create SVG line between two dots
    function createConnection(dot1, dot2, svg) {
        const rect1 = dot1.getBoundingClientRect();
        const rect2 = dot2.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        
        const x1 = rect1.left + rect1.width / 2 - svgRect.left;
        const y1 = rect1.top + rect1.height / 2 - svgRect.top;
        const x2 = rect2.left + rect2.width / 2 - svgRect.left;
        const y2 = rect2.top + rect2.height / 2 - svgRect.top;
        
        // Create SVG line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', 'connection-line');
        line.setAttribute('data-from', `${dot1.dataset.station}-${dot1.dataset.type}`);
        line.setAttribute('data-to', `${dot2.dataset.station}-${dot2.dataset.type}`);
        
        // Add double-click to remove line
        line.addEventListener('dblclick', () => {
            svg.removeChild(line);
            const connectionIndex = connections.findIndex(conn =>
                conn.from === `${dot1.dataset.station}-${dot1.dataset.type}` &&
                conn.to === `${dot2.dataset.station}-${dot2.dataset.type}`
            );
            if (connectionIndex > -1) {
                connections.splice(connectionIndex, 1);
            }
            showNotification('info', 'Connection removed');
        });
        
        svg.appendChild(line);
        
        // Store connection data
        connections.push({
            from: `${dot1.dataset.station}-${dot1.dataset.type}`,
            to: `${dot2.dataset.station}-${dot2.dataset.type}`,
            element: line
        });
        
        const fromStation = dot1.dataset.station;
        const toStation = dot2.dataset.station;
        showNotification('success', `Connected Workstation ${fromStation} to Workstation ${toStation}`);
    }
    
    // Update SVG size on window resize
    function updateSVGSize() {
        const container = document.querySelector('.station-grid');
        if (container && svg) {
            const rect = container.getBoundingClientRect();
            svg.style.width = rect.width + 'px';
            svg.style.height = rect.height + 'px';
        }
    }
    
    // Initial size setup and resize listener
    updateSVGSize();
    window.addEventListener('resize', updateSVGSize);
}

/**
 * Show process information
 */
function showProcessInfo(stationName) {
    console.log(`Showing process info for Workstation ${stationName}`);
    showNotification('info', `Process details for Workstation ${stationName}`);
}

/**
 * Handle add item actions
 */
function handleAddItem(itemType, stationName, button) {
    // Add visual feedback
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
    
    console.log(`Adding ${itemType} to Workstation ${stationName}`);
    showNotification('success', `Adding ${itemType} to Workstation ${stationName}`);
}

/**
 * CRITICAL: This initialization pattern is required for all prototypes
 */
(function() {
    let initialized = false;
    
    function safeInit() {
        if (initialized) return;
        initialized = true;
        
        try {
            init();
        } catch (err) {
            console.error('Workstation Branch init failed:', err);
        }
    }
    
    // Primary: Listen for canvas ready event
    document.addEventListener('davinci:canvas:ready', safeInit);
    
    // Fallback: If canvas is already loaded or event was missed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (!initialized && document.querySelector('.main-container')) {
                    console.warn('Canvas ready event missed, using fallback initialization');
                    safeInit();
                }
            }, 100);
        });
    } else {
        setTimeout(() => {
            if (!initialized && document.querySelector('.main-container')) {
                console.warn('Canvas ready event missed, using fallback initialization');
                safeInit();
            }
        }, 100);
    }
})();