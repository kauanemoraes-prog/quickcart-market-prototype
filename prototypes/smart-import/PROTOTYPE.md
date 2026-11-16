# Smart Import - Equipment Wizard

## META
- **Path**: `prototypes/smart-import/`
- **Dependencies**: DaVinci Canvas, Monalisa Design System
- **JS Modules**: `js/main.js` (single entry point)

## PURPOSE
Interactive wizard for importing equipment data with validation, conflict resolution, and selective import capabilities.

## UI COMPONENTS (MDS)
- **Modal**: `.modal-overlay`, `.modal`, `.modal__header`, `.modal__body`, `.modal__footer`
- **Buttons**: `.btn.btn--primary`, `.btn.btn--secondary` with sizes `.btn--medium`
- **Checkboxes**: `.checkbox`, `.checkbox__input`, `.checkbox__box`, `.checkbox__label`
- **Radio Buttons**: `.radio`, `.radio__input`, `.radio__circle`, `.radio__label`
- **Notifications**: `.notification.notification--error`, `.notification--warning`, `.notification--success`
- **Tags**: `.tag.tag--success`, `.tag.tag--warning`

## DATA STRUCTURE
```javascript
{
  selectedRecords: Set(['EQ-ROBOT-002', 'EQ-TESTER-01', ...]),
  conflictResolutions: {
    'EQ-ROBOT-002': {
      'CycleTime': 'import' // or 'database'
    }
  }
}
```

**Source**: Hardcoded sample data in `SmartImportWizard.initializeSelections()` (line 45)

## STATE MANAGEMENT
- `selectedRecords`: Set of selected record IDs for import
- `conflictResolutions`: Object storing field-level conflict resolution choices
- Dynamic UI updates via `updateSelectedCount()` and `updateSelectAllStates()`

## KEY FEATURES

### 1. Wizard Progress (lines 15-45 in main.js)
- **Visual Steps**: 4-step progress indicator with completed/active states
- **Navigation**: Back button, Cancel, Import with dynamic count
- **Module**: Integrated in main SmartImportWizard class

### 2. Summary Statistics (lines 60-85 in main.js)
- **Metrics**: Total, New, Changed, Unchanged, Errors, Warnings
- **Visual**: Color-coded stat cards with MDS design tokens
- **Module**: Static display, no separate module needed

### 3. Validation Sections (lines 90-120 in main.js)
- **Errors**: Blocking issues that disable import
- **Warnings**: Non-blocking notifications
- **Module**: Static display with MDS notification components

### 4. Selective Import (lines 125-180 in main.js)
- **Individual Selection**: Checkboxes for each record
- **Bulk Selection**: Select All for changed/new records separately
- **Dynamic Count**: Import button shows selected count
- **Module**: `toggleRecord()`, `toggleAllRecords()`, `updateSelectedCount()`

### 5. Conflict Resolution (lines 185-200 in main.js)
- **Field-Level**: Radio buttons for database vs import value choice
- **Visual Distinction**: Color-coded options (red=database, green=import)
- **State Tracking**: Stores resolution choices in `conflictResolutions`
- **Module**: `resolveConflict()` method

### 6. New Record Creation (lines 205-230 in main.js)
- **Equipment Records**: New equipment with all fields
- **Vendor Records**: New equipment vendors
- **Visual Distinction**: Green borders and "New" tags
- **Module**: Integrated with selective import system

## CUSTOM CSS PATTERNS
- **Wizard Progress**: Custom step indicators with connecting line
- **Stat Cards**: Grid layout with color-coded variants
- **Record Cards**: Expandable cards with conflict highlighting
- **Field Comparisons**: Side-by-side old/new value display
- **Responsive**: Mobile-friendly with stacked layouts

## JAVASCRIPT PATTERNS
- **Init**: DaVinci Canvas event-based initialization (lines 220-250)
- **Data Flow**: Class-based architecture with centralized state
- **Event Handling**: Delegation pattern for dynamic content
- **Module Organization**: Single main.js file with SmartImportWizard class

## INTEGRATION POINTS
- **Canvas**: Uses DaVinci Canvas framework for layout and navigation
- **MDS**: Leverages Monalisa Design System components and tokens
- **Navigation**: Registered in canvas-navigation-data.json

## EDGE CASES HANDLED
- **No Selection**: Import button disabled when no records selected
- **Errors Present**: Import button disabled when validation errors exist
- **Mixed Selection**: Indeterminate state for partial selections
- **Conflict Resolution**: Tracks individual field-level choices
- **Modal Interactions**: Click outside to close, ESC key support

## NOT IMPLEMENTED
- **API Integration**: Mock data only, no backend calls
- **File Upload**: Step 2 file selection is placeholder
- **Template Download**: Step 1 download is placeholder
- **Progress Persistence**: No state persistence between sessions

## PERFORMANCE NOTES
- **Efficient Selection**: Uses Set for O(1) record lookup
- **Event Delegation**: Minimal event listeners for dynamic content
- **CSS Optimization**: Uses MDS design tokens for consistency

## TESTING SCENARIOS
1. **Select/Deselect Records**: Individual and bulk selection
2. **Conflict Resolution**: Choose database vs import values
3. **Import Validation**: Button states based on errors/selection
4. **Responsive Design**: Mobile and desktop layouts
5. **Modal Interactions**: Open/close behaviors

## AI ANALYSIS SHORTCUTS
- **Main Logic**: `prototypes/smart-import/js/main.js:15-220`
- **Event Handlers**: `prototypes/smart-import/js/main.js:25-85`
- **Selection Logic**: `prototypes/smart-import/js/main.js:90-140`
- **Conflict Resolution**: `prototypes/smart-import/js/main.js:185-200`
- **UI Components**: `prototypes/smart-import/index.html:25-200`
- **Custom Styles**: `prototypes/smart-import/styles.css:1-300`