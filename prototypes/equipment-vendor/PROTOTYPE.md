# Equipment Vendor Prototype

## META
- **Path**: `prototypes/equipment-vendor/`
- **Dependencies**: DaVinci Canvas, Monalisa Design System
- **JS Modules**: `js/main.js` (Canvas version), `js/main-standalone.js` (standalone version)
- **CSS Structure**: Single `styles.css` file
- **Canvas Integration**: Uses `<div id="app"></div>` (corrected from wrong `canvas-container`)

## PURPOSE
Equipment Vendor management interface with floating label form fields and enable/disable functionality.

## UI COMPONENTS
- **Card Component** (MDS): Vendor information container with header and body
- **Form Groups Medium** (MDS): Floating label inputs using `form-group--medium`
- **Switch Component** (MDS): Small toggle switch for enable/disable state
- **Form Inputs** (MDS): Standard MDS form inputs with floating labels

## DATA STRUCTURE
```javascript
// Vendor Information Fields (static data, ready for dynamic integration)
{
  vendorName: "ACME Corporation",
  vendorDRI: "John Smith", 
  engIntent: "Sarah Johnson",
  mpIntent: "Manufacturing",
  designManager: "Mike Chen",
  line: "Production A",
  aqid: "AQ-2024-001",
  vpn: "789456",
  cmPN: "123789"
}
```

## STATE MANAGEMENT
- **Vendor Enable State**: Tracked via checkbox input state
- **Form Inputs**: All inputs disabled/enabled based on toggle state
- **Visual Feedback**: Opacity and pointer-events for disabled state

## KEY FEATURES
1. **Vendor Information Card** (`index.html` lines 16-67)
   - Floating label inputs using MDS `form-group--medium`
   - Compact grid layout (2x4) with 8px column gap
   - Enable/disable toggle with visual feedback

2. **Enable/Disable Functionality** (`js/main.js` lines 20-50)
   - Switch component controls all form inputs
   - Visual opacity change when disabled
   - Dynamic label text update (Enabled/Disabled)

## CUSTOM CSS PATTERNS
- **Ultra Compact Layout** (`styles.css` lines 74-80): 8px gap between columns
- **Floating Label Fields** (`styles.css` lines 90-100): MDS medium form groups with size constraints
- **Card Padding** (`styles.css` lines 36-42): Optimized padding (16px right, 20px left)

## JAVASCRIPT PATTERNS
- **Event-based Initialization**: `davinci:canvas:ready` listener pattern
- **Form State Management**: Enable/disable all inputs based on toggle
- **MDS Integration**: Works with `form-input` and `form-group--medium` components

## INTEGRATION POINTS
- **Canvas**: Corrected to use `<div id="app"></div>` (following reference pattern)
- **MDS Components**: Form groups, inputs, switch, and card components
- **Navigation**: Added to mainNavigation array as "Equipment Vendor"

## EDGE CASES HANDLED
- Document ready state checking before initialization
- Error handling with safeInit() wrapper
- Null checks for DOM elements before adding event listeners
- Initial state setting for enable/disable toggle

## NOT IMPLEMENTED
- Multiple vendor cards (currently single card)
- Data persistence (changes not saved)
- API integration for vendor data
- Form validation for required fields

## PERFORMANCE NOTES
- Minimal DOM queries with element caching
- MDS handles all component styling and behavior
- Single event listeners per interactive element
- No external API calls or data fetching

## TESTING SCENARIOS
1. **Canvas Integration**: Page loads correctly in DaVinci Canvas framework
2. **Standalone Version**: Works independently via `standalone.html`
3. **Enable/Disable**: Toggle controls all form inputs correctly
4. **Floating Labels**: MDS medium form groups work as expected
5. **Responsive**: Layout adapts to different screen sizes

## AI ANALYSIS SHORTCUTS
- **Canvas HTML**: `index.html` lines 10-12 (corrected app container)
- **Vendor card structure**: `index.html` lines 16-67
- **Enable/disable logic**: `js/main.js` lines 20-50
- **Compact grid layout**: `styles.css` lines 74-80
- **MDS form integration**: `styles.css` lines 90-100

## CORRECTIONS MADE
- **Fixed Canvas Integration**: Changed `<div id="canvas-container"></div>` to `<div id="app"></div>`
- **Proper MDS Usage**: Updated to use `form-group--medium` with floating labels
- **Script Loading**: Corrected to load only `davinci-canvas.js` (removed handlebars.min.js)
- **Comments**: Added proper Canvas framework comments from reference