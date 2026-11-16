# Station Branch Prototype

## META
- **Path**: `prototypes/station-branch/`
- **Dependencies**: DaVinci Canvas, Monalisa Design System
- **JS Structure**: Single file (`js/main.js`) — 226 lines
- **CSS Structure**: Single file (`styles.css`) — 258 lines

## PURPOSE
Manufacturing station management interface displaying multiple production stations (A-F) with their key processes, specifications, equipment, and consumables in a grid layout.

## UI COMPONENTS
- **MDS Tags**: `tag--success` (ME badge), `tag--primary` (SOP file), `tag--gray` (ENG, MP, Class)
- **MDS Notifications**: Toast notifications via `showNotification(type, message)`
- **Custom Grid Layout**: Station grid with 7 columns (Input, Output, Station, Key process, Specification, Equipment, Consumable)
- **Station Cards**: Color-coded cards with left border accent, MDS tags, and metadata
- **Process Items**: Interactive process display with info buttons
- **Add Item Buttons**: Dashed border buttons for adding new items
- **Connection System**: SVG-based dot connection with animated lines
- **SF Symbols Icons**: house, info-square, doc-viewfinder, gear, drop-keypad-rectangle, plus-magnifyingglass

## DATA STRUCTURE
```javascript
// Station data (hardcoded in HTML)
stations = [
  {
    id: "01", name: "Station A", color: "blue",
    tags: ["ME (success)", "ENG: POR (gray)", "MP: POR (gray)", "Class 1 (gray)", "SOP file (primary)"]
  },
  // ... stations B-F with different colors (gray, green, purple, teal, orange)
  // Stations B, C, E have 4 tags (no SOP); Stations A, D, F have 5 tags (with SOP)
]
```

## STATE MANAGEMENT
- **selectedDot**: Currently selected connection dot (null or DOM element)
- **isConnecting**: Boolean flag for connection mode
- **connections[]**: Array of active SVG connections between dots

## KEY FEATURES

### 1. Station Cards (`styles.css` lines 57-121)
- **Color coding**: 6 color variants (blue, gray, green, purple, teal, orange) with left border + subtle background tint
- **MDS Tags**: Replaced custom badges with MDS `tag` component (success, primary, gray variants)
- **Layout**: Flex container with wrap for tags

### 2. Connection System (`js/main.js` lines 67-165, `styles.css` lines 123-186)
- **Dot-to-dot**: Click dots to create SVG line connections between stations
- **States**: Default, hover (accent), selected (accent + shadow), connecting (orange + pulse animation)
- **Line removal**: Double-click connection line to remove
- **Resize handling**: SVG dimensions update on window resize
- **Colors**: All interactive colors use MDS tokens (`--color-base-accent`, `--color-fill-orange`)

### 3. Process Management (`js/main.js` lines 23-35)
- **Info buttons**: Click to show MDS toast notification with station name
- **Icon**: info-square.svg with accent blue CSS filter

### 4. Add Item Interface (`js/main.js` lines 40-62)
- **Column detection**: Automatically detects item type (specification, equipment, consumable)
- **Visual feedback**: Scale animation on click
- **MDS Notification**: Success toast on add action

### 5. Notifications (`js/main.js` — uses MDS built-in)
- **MDS showNotification()**: Toast function from Monalisa Design System
- **Types used**: 'info' (connections, process details), 'success' (add items, connections created)
- **Auto-dismiss**: Handled by MDS (3 seconds)

## CUSTOM CSS PATTERNS

### Grid Layout (`styles.css` lines 8-55)
- **CSS Grid**: 7-column layout with fixed Input/Output (60px), Station (300px), 4x 1fr
- **Desktop-only**: No responsive breakpoints (canvas enforces 1440px min-width)

### Station Card Colors (`styles.css` lines 67-95)
- Decorative hex colors for 6 station variants (not MDS tokens — MDS lacks purple/teal)
- rgba backgrounds at 5% opacity for subtle tinting

### Interactive Elements (`styles.css` lines 123-258)
- Connection dots with MDS accent color hover/selected states
- Animated SVG lines (dashed → solid on completion)
- Process info button with accent blue icon filter
- Add item buttons with dashed border and accent hover

## JAVASCRIPT PATTERNS

### Init Pattern (`js/main.js` lines 192-227)
- Event-based: `davinci:canvas:ready` event listener
- IIFE with `safeInit()` guard
- Fallback for missed canvas ready event

### Connection System (`js/main.js` lines 67-165)
- Closure-based state (selectedDot, connections array)
- SVG line creation via `createElementNS`
- Bounding rect calculations for line positioning

## INTEGRATION POINTS
- **Canvas Framework**: DaVinci Canvas navigation and layout
- **MDS Components**: Tags (`tag--success`, `tag--primary`, `tag--gray`)
- **MDS JavaScript**: `showNotification(type, message)` toast function
- **MDS Design Tokens**: Spacing, colors, typography via CSS custom properties
- **SF Symbols**: Icons from `assets/icons/regular/`
- **Navigation**: Entry in `canvas-navigation-data.json`

## EDGE CASES HANDLED
- Missing elements: Null checks before event listeners
- Canvas timing: Fallback initialization if ready event missed
- Button feedback: Scale animation with timeout reset
- Connection state: Same-dot click cancels connection mode
- SVG resize: Window resize updates SVG dimensions

## NOT IMPLEMENTED
- Data persistence (no backend/localStorage)
- Modal dialogs for detailed forms
- Drag and drop reordering
- Real-time data sync
- Form validation (add actions are placeholders)

## TESTING SCENARIOS
1. **Station tags**: Verify MDS tag styles render correctly (green ME, blue SOP, gray others)
2. **Connection system**: Click input/output dots to create connections, double-click to remove
3. **Process info**: Click info buttons — toast notification appears at top center
4. **Add items**: Click + buttons — success toast with item type and station name
5. **Notifications**: Verify MDS toast notifications appear and auto-dismiss (3s)
6. **Color coding**: Each station has correct color theme (border + background tint)

## AI ANALYSIS SHORTCUTS
- **Grid layout**: `styles.css` lines 8-55
- **Station colors**: `styles.css` lines 57-95
- **Connection system CSS**: `styles.css` lines 123-186
- **Process/Add item CSS**: `styles.css` lines 188-258
- **Init + event setup**: `js/main.js` lines 9-18
- **Connection JS logic**: `js/main.js` lines 67-165
- **Canvas init pattern**: `js/main.js` lines 192-227
