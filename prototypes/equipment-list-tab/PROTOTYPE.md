# Equipment List Tab Prototype

## META
- **Path**: `prototypes/equipment-list-tab/`
- **Files**: `index.html`, `css/main.css` + `css/header.css` + `css/tabs.css` + `css/toolbar.css` + `css/table.css` + `css/vendor-sub-table.css` + `css/dark-mode.css`, `js/data.js`, `js/build-stages.js`, `js/table.js`, `js/main.js`
- **Dependencies**: DaVinci Canvas, Monalisa Design System, Plugins (proj-right-toolbar, proj-dark-mode)
- **Navigation**: Main nav - "Equipment List Tab"

## PURPOSE
Program detail page focused on the Equipment – List tab view, showing a table of equipment items with vendor DFM statuses, process flow usage, and sortable columns.

## UI COMPONENTS (MDS)
- **Table** (`.table`, `.table-container`) — Equipment list with 11 columns including checkbox and expand
- **Checkbox** (`.checkbox`) — Row selection and select-all in header
- **Badge Counter** (`.badge-counter`) — PCN pending count on tab
- **Buttons** — Primary (Publish), Secondary (Import, Export), icon buttons

## UI COMPONENTS (Plugins)
- **Right Toolbar** (`proj-right-toolbar`) — Collapsible right-side toolbar panel

## DATA STRUCTURE
```javascript
// Build stages
{ id: string, date: string }  // e.g. { id: 'P1', date: '04/01/2026' }

// Equipment
{
  id: number,
  name: string,           // Equipment name
  shortName: string,      // Short name
  vendorDfmTotal: number, // Total vendor DFM count
  vendorDfmApproved: number, // Approved count
  vendorDfmStatus: string,   // Status label (e.g. 'Approved')
  processFlowUsage: string,  // Usage count (e.g. '01')
  department: string,        // DFM, ME, etc.
  category: string,
  engIntent: string,         // MP Evaluation, POR, etc.
  mpIntent: string,
  riskOpportunity: string,
  vendor: string,
  vendors: [                 // Nested vendors shown in expanded sub-table
    { name: string, enabled: boolean }
  ]
}
```
**Source**: `js/data.js`

## STATE MANAGEMENT
- `BuildStages.currentBuild` — Currently active build stage (default: P1)
- Equipment data is static (rendered once from `EquipData.getEquipment()`)

## KEY FEATURES

### 1. Program Header with Build Stepper
- **Location**: `index.html` lines 20-68, `js/build-stages.js`
- Back button, Program/Site dropdowns, build stage stepper with connecting lines and dates
- Version badge (V8 - Draft), UPH Target, REIHD info with edit icons

### 2. Tabbed Navigation
- **Location**: `index.html` lines 71-102
- 4 tabs: Process Flow, Equipment – List (active), Consumables, PCN – Pending (with badge counter 4)
- Right-side action buttons: Import, Export, Publish, Settings gear

### 3. Toolbar
- **Location**: `index.html` lines 106-139
- Search bar with ⌘K shortcut, info button, Station View tag, eye count 0/83, filter/column icons

### 4. Equipment Table
- **Location**: `index.html` lines 142-204, `js/table.js`
- Columns: checkbox, expand chevron, Equipment name (sortable + add button), Short name (sortable), Vendor DFM Statuses, Process Flow Usage, Department (sortable), Category (sortable), ENG Intent, MP Intent (sortable), Risk and Opportunity (sortable), Vendor
- 3 data rows with vendor DFM status badges and process flow usage indicators
- Click row chevron to expand/collapse a nested vendor sub-table

### 4a. Vendor Sub-table (expanded row)
- **Location**: `js/table.js` `renderVendorSubTable()` and `bindExpandHandlers()`
- **CSS**: `css/vendor-sub-table.css`
- Columns: Enable (switch), Vendor name
- `table-layout: fixed` is used to guarantee the Enable column width
- Enable column has the SAME geometry as the parent checkbox column (width 32px, padding-left 6px), so the "Enable" header text and the switch share the SAME LEFT EDGE (x=6) as the parent's checkbox
- Switch (24px) and "Enable" text overflow the 32px column boundary on the right; this is intentional and visually fine because column boundary controls left-edge alignment
- Alternating row backgrounds (white / fill-secondary)

### 5. Right Toolbar
- Plugin component for expandable right-side panel
- Default items: Settings (gear), Dark Mode (moon) — moon icon toggles global dark mode

### 6. Dark Mode
- Global toggle persisted in `localStorage` (`davinci:dark-mode`)
- Activated by clicking the moon icon in the right toolbar
- CSS: prototype-specific `css/dark-mode.css` overrides; canvas chrome handled by `plugins/proj-dark-mode.css`
- Inline `<head>` script in `index.html` restores the dark-mode class before CSS paints (zero-flash)
- Color palette: 5 neutral tones from #141415 (deepest) to #393B3C (lightest), defined as `--dm-bg-1`..`--dm-bg-5` in the plugin CSS

## JAVASCRIPT PATTERNS

### Initialization
- Event-based: `davinci:canvas:ready` event in `js/main.js`
- IIFE pattern with `safeInit()` function
- Module init order: BuildStages → EquipTable → ProjRightToolbar

### Data Flow
1. Canvas ready → `init()` → modules initialize
2. `BuildStages.render()` builds stepper DOM with connectors
3. `EquipTable.render()` generates table rows from data array

## INTEGRATION POINTS
- Canvas: auto-loaded navbar/footer, subHeader set to `null` (hidden)
- MDS: table, checkbox, badge-counter, buttons, sort-indicator
- Plugins: proj-right-toolbar for side panel

## EDGE CASES HANDLED
- Empty fields render as blank cells
- Build stage click updates active state and re-renders stepper

## NOT IMPLEMENTED
- Tab switching (only Equipment – List content shown)
- Search/filter functionality
- Sort functionality
- Select-all checkbox behavior
- Toolbar icon actions (Station View, column settings)

## AI ANALYSIS SHORTCUTS
- Equipment data: `js/data.js` lines 11-72
- Build stages data: `js/data.js` lines 4-8
- Table rendering: `js/table.js` `EquipTable.render()`
- Row expansion + vendor sub-table: `js/table.js` `bindExpandHandlers()` and `renderVendorSubTable()`
- Build stepper: `js/build-stages.js` lines 7-63
- Init pattern: `js/main.js` lines 1-14
- Switch ↔ checkbox alignment math: `css/vendor-sub-table.css` (top of file)
