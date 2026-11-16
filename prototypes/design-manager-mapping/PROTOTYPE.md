# Design Manager Mapping Prototype

## META
- **Path**: `prototypes/design-manager-mapping/`
- **Dependencies**: DaVinci Canvas, Monalisa Design System, Handlebars
- **JS Modules**: 4 feature modules + main.js coordinator
- **CSS Modules**: 4 feature stylesheets + main.css coordinator

## PURPOSE
Interactive table within a drawer for mapping Design Managers to Apple Core Vendors, organized by expandable Incline Project sections with inline editing capabilities.

## UI COMPONENTS
- **Drawer** (MDS): Large drawer (904px) with header actions and scrollable body
- **Tables** (MDS): Sortable tables with custom action controls and form selects
- **Forms** (MDS): Select dropdowns, file input, text input for inline editing
- **Buttons** (MDS): Primary, secondary, and custom action buttons
- **Modal** (MDS): Medium modal for CSV import workflow
- **Tags** (MDS): Success tags for mapped status indicators
- **Cards** (Custom): Stats grid cards for summary metrics

## DATA STRUCTURE
**Location**: `js/project-sections.js` lines 25-85
```javascript
projectData: {
  projects: [
    {
      inclineId: string,
      description: string|null,
      designManagers: [
        {
          id: string,
          name: string,
          description: string|null,
          mappedVendor: string|null,
          isAutoMatched: boolean
        }
      ]
    }
  ]
}
```

**Available Vendors**: `js/project-sections.js` lines 87-92
- Per-project vendor lists with 1:1 mapping constraint enforcement

## STATE MANAGEMENT
- **Drawer State**: Open/closed via `drawer-overlay--open` class
- **Section State**: Expanded/collapsed via `display` style and `expanded` class
- **Edit State**: Inline editing replaces DOM elements temporarily
- **Modal State**: Import modal via `modal-overlay--open` class
- **Form State**: Dynamic validation enables/disables import button

## KEY FEATURES

### 1. Expandable Project Sections (`js/project-sections.js`)
- **Toggle**: Click header to expand/collapse (lines 130-145)
- **Visual**: Chevron rotation and content visibility
- **Stats**: Manager count per project in header

### 2. Inline Description Editing (`js/project-sections.js`)
- **Trigger**: Edit button (visible on hover) (lines 147-185)
- **Implementation**: Replace span with input field
- **Save**: Enter key or blur event
- **Cancel**: Escape key restores original

### 3. Vendor Mapping (`js/project-sections.js`)
- **Constraint**: 1:1 mapping per project (lines 217-230)
- **Filtering**: Available vendors exclude already mapped ones
- **Auto-refresh**: Updates display after mapping changes

### 4. Locked State Treatment (`css/mapping-table.css`)
- **Visual**: Locked rows with reduced opacity and lock icons
- **Behavior**: Auto-matched managers cannot be edited/removed
- **Indicators**: Lock icons in status and actions columns

### 5. Edit/Remove Controls (`js/mapping-controls.js`)
- **Edit**: Inline select dropdown with current + available + remove options (lines 25-95)
- **Remove**: Confirmation dialog before unmapping (lines 97-115)
- **Permissions**: Only manual mappings can be modified

### 6. CSV Import (`js/csv-import.js`)
- **Format**: name, description (optional) with header detection (lines 120-165)
- **Validation**: File type and project selection required
- **Processing**: Parses quoted CSV values and adds to selected project

## CUSTOM CSS PATTERNS

### Action Controls (`css/main.css`)
- **Hover States**: Buttons appear/highlight on interaction
- **Icon Filters**: SVG color adjustments for different states
- **Locked Indicators**: Consistent styling for non-editable items

### Project Sections (`css/project-sections.css`)
- **Expandable Headers**: Hover effects and transition animations
- **Inline Editing**: Input field styling with focus states
- **Chevron Animation**: Smooth rotation for expand/collapse

### Table Enhancements (`css/mapping-table.css`)
- **Locked Rows**: Visual treatment for auto-matched items
- **Compact Selects**: Table-cell variant for form controls
- **Action Alignment**: Centered controls with consistent spacing

## JAVASCRIPT PATTERNS

### Module Architecture
- **Feature Modules**: Self-contained functionality with public APIs
- **Event Delegation**: Handles dynamically created elements
- **Data Coordination**: Modules communicate via shared data access

### Initialization (`js/main.js`)
- **Event-Based**: Waits for `davinci:canvas:ready` event
- **Safe Init**: Error handling prevents cascade failures
- **Module Coordination**: Initializes all features in sequence

### Data Flow
1. **Load**: ProjectSections loads mock data and renders templates
2. **Interact**: User actions trigger module-specific handlers
3. **Update**: Data changes refresh display via template re-rendering
4. **Sync**: Stats update automatically after data modifications

## INTEGRATION POINTS

### Canvas Integration
- **Navigation**: Auto-added to `canvas-navigation-data.json`
- **Drawer**: Uses MDS drawer overlay system
- **Events**: Responds to canvas ready event

### MDS Integration
- **Components**: Exact HTML structure from MDS component files
- **Styling**: Relies on MDS CSS for all component appearance
- **Behavior**: Leverages MDS JavaScript for form interactions

### Handlebars Integration
- **Templates**: Dynamic content generation for project sections
- **Data Binding**: Automatic updates when data changes
- **Helpers**: Uses built-in helpers for conditionals and loops

## EDGE CASES HANDLED

### Data Validation
- **Empty Projects**: Handles projects with no managers
- **Missing Descriptions**: Shows "No description" placeholder
- **Invalid CSV**: Error handling for malformed files

### User Interactions
- **Concurrent Editing**: Cancels edit mode when clicking elsewhere
- **Keyboard Navigation**: Enter/Escape handling for inline editing
- **Modal Interactions**: Backdrop and escape key closing

### Constraint Enforcement
- **Vendor Availability**: Filters based on existing mappings
- **Auto-Match Protection**: Prevents editing of system-matched items
- **Project Isolation**: Vendors scoped to individual projects

## NOT IMPLEMENTED
- **Real API Integration**: Uses mock data for demonstration
- **User Permissions**: Admin@Build role checking (UI ready)
- **Bulk Operations**: Multi-select for batch mapping
- **Export Functionality**: CSV/Excel export of current mappings
- **Audit Trail**: Change history tracking
- **Advanced Filtering**: Search/filter within projects

## PERFORMANCE NOTES
- **Template Caching**: Handlebars templates compiled once
- **Event Delegation**: Efficient handling of dynamic elements
- **Selective Updates**: Only affected sections re-render
- **Memory Management**: No memory leaks in event handlers

## TESTING SCENARIOS

### Basic Functionality
1. Open drawer → Projects load with expandable sections
2. Click project header → Section expands/collapses with animation
3. Edit description → Inline editing with save/cancel
4. Map vendor → Select dropdown updates mapping and stats

### Advanced Interactions
1. Edit mapped vendor → Inline select with current + available options
2. Remove mapping → Confirmation dialog and stats update
3. Import CSV → File validation, project selection, data parsing
4. Constraint testing → Verify 1:1 mapping enforcement

### Error Conditions
1. Invalid CSV format → Error message and graceful handling
2. Missing elements → Console errors without breaking functionality
3. Concurrent edits → Proper cancellation and state restoration

## AI ANALYSIS SHORTCUTS

### Quick File Access
- **Main Logic**: `js/project-sections.js` lines 25-280 (data + rendering)
- **Drawer Control**: `js/drawer-manager.js` lines 15-65 (open/close)
- **Mapping Actions**: `js/mapping-controls.js` lines 25-115 (edit/remove)
- **CSV Import**: `js/csv-import.js` lines 120-200 (parsing + validation)
- **Template**: `index.html` lines 85-140 (Handlebars structure)

### Key Functionality Locations
- **Data Structure**: `js/project-sections.js` lines 25-92
- **Section Toggle**: `js/project-sections.js` lines 130-145
- **Inline Editing**: `js/project-sections.js` lines 147-185
- **Vendor Filtering**: `js/project-sections.js` lines 217-230
- **Stats Updates**: `js/project-sections.js` lines 250-270
- **CSV Parsing**: `js/csv-import.js` lines 140-180