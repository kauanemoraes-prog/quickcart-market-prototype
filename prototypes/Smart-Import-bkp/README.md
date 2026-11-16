# Smart Import - Equipment Wizard

A recreation of the Smart Import wizard interface for equipment management, currently displaying step 3 (Validation).

## Features

- **Multi-step wizard interface** with 4 steps:
  1. Download cheat sheet/template
  2. Select file
  3. Validation (currently displayed)
  4. Import

- **Dark theme UI** matching the original design
- **Interactive navigation** with Next/Back buttons
- **Step indicators** showing completed, active, and pending steps
- **Responsive modal dialog** with overlay

## Project Structure

```
Smart-Import/
├── index.html      # Main HTML structure
├── styles.css      # Complete styling (dark theme)
├── script.js       # Wizard functionality and interactions
└── README.md       # This file
```

## How to Use

1. Open `index.html` in a web browser
2. The wizard will display at step 3 (Validation) by default
3. Use the navigation buttons to move between steps:
   - **← (Back button)**: Go to previous step
   - **Next button**: Proceed to next step
   - **Cancel button**: Close the wizard

## Features Implemented

### Visual Elements
- ✅ Application header with logo and navigation
- ✅ Program/Site selectors
- ✅ Project timeline with phase indicators
- ✅ Tab navigation (Equipment - List active)
- ✅ Modal wizard dialog
- ✅ Step progress indicators
- ✅ Footer with links

### Wizard Steps
- ✅ Step 1: Download template
- ✅ Step 2: File selection
- ✅ Step 3: Validation (default view)
- ✅ Step 4: Import confirmation

### Interactions
- ✅ Navigate between wizard steps
- ✅ Visual feedback for completed/active steps
- ✅ Modal can be closed via Cancel or overlay click
- ✅ Import button in toolbar opens wizard

## Technologies Used

- HTML5
- CSS3 (with CSS Grid and Flexbox)
- Vanilla JavaScript (ES6+)
- No external dependencies

## Design Notes

The interface recreates the Apple-style design system with:
- Dark theme (#1a1a1a background)
- System fonts (-apple-system, BlinkMacSystemFont)
- Blue accent color (#0a84ff)
- Green success indicators (#30d158)
- Subtle borders and shadows
- Rounded corners and smooth transitions

## Browser Compatibility

Works in all modern browsers that support:
- CSS Grid
- CSS Flexbox
- ES6 JavaScript
- CSS Custom Properties
