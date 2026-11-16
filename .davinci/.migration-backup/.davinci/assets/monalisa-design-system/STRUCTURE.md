# Monalisa UI Lib - File Structure

## SCSS Architecture

The SCSS files are organized as follows:

### Core Files

1. **`src/scss/_variables.scss`** (427 lines)
   - All design tokens as SCSS variables + CSS custom properties
   - Colors (base accent, fill, glyph)
   - Typography (font families, sizes, weights, line heights)
   - Spacing scale
   - Size tokens
   - Opacity values
   - Transitions

2. **`src/scss/_base.scss`** (121 lines)
   - Global resets (`* { box-sizing: border-box }`)
   - HTML base font size (62.5% for rem calculations)
   - Body styles
   - Default link styles
   - Typography scale (h1-h4, body, captions)

### Component Files

4. **`src/scss/components/_button.scss`** (212 lines)
   - Button base styles
   - Size variants (small, medium)
   - Color variants (primary, secondary, danger, success, warning, link)
   - All states (hover, active, focus, disabled)

5. **`src/scss/components/_forms.scss`** (487 lines)
   - Form group and label
   - Text input (with states and variants)
   - Textarea
   - Select dropdown
   - Checkbox (custom styled)
   - Radio button (custom styled)
   - Switch/Toggle

6. **`src/scss/components/_components-all.scss`** (1376 lines)
   - **Notifications** - Inline and toast notifications (4 variants)
   - **Tags** - Label components (5 color variants)
   - **Tables** - Data tables with sortable headers
   - **Pagination** - Page navigation with variants
   - **Tabs** - Tab navigation component
   - **Breadcrumb** - Navigation breadcrumbs
   - **Modals** - Dialog overlays
   - **Drawers** - Side panel overlays
   - **Popovers** - Floating content containers
   - **Navigation Menu** - Multi-level dropdown navigation
   - **Cards** - Content containers
   - **Loaders** - Spinner and skeleton loaders
   - **Avatars** - User avatars (3 sizes)
   - **Empty State** - No content placeholder
   - **Badge Counter** - Numeric counter badges
   - **Links** - Link styles
   - **Responsive styles** - Mobile breakpoints

### Main Entry Point

7. **`src/scss/main.scss`** (15 lines)
   - Imports all files in correct order:
     1. Variables (must be first)
     2. Base styles
     3. Component styles

## Architecture Approach

### Consolidated Structure (Current)
We use **`_components-all.scss`** which contains all component styles in one file. This approach:
- ✅ Simpler to maintain
- ✅ Faster compilation
- ✅ No import dependency issues
- ✅ Production-ready and fully functional

### Future Modularization (Optional)
If needed in the future, `_components-all.scss` can be split into individual component files:
- `_notifications.scss`
- `_tags.scss`
- `_tables.scss`
- `_pagination.scss`
- `_tabs.scss`
- `_breadcrumb.scss`
- `_modals.scss`
- `_drawers.scss`
- `_popovers.scss`
- `_navigation.scss`
- `_cards.scss`
- `_loaders.scss`
- `_avatars.scss`
- `_empty-state.scss`

**Benefits of modularization:**
- Better code organization
- Easier to find specific components
- Potential for selective imports
- Clearer separation of concerns

## JavaScript Structure

### Source Files

1. **`src/js/main.js`**
   - Main entry point
   - Initializes all components on DOM ready
   - Calls initialization functions for each component

2. **`src/js/components/all-components.js`**
   - All component JavaScript functions:
     - Tabs
     - Modals
     - Drawers
     - Notifications (toast system)
     - Popovers
     - Navigation menus
     - Table sorting functionality (integrated)

## Build Output

### CSS Files
- **`dist/css/monalisa.css`** - Unminified (for development/debugging)
- **`dist/css/monalisa.min.css`** - Minified (for production)

### JavaScript Files
- **`dist/js/monalisa.js`** - Unminified (bundled)
- **`dist/js/monalisa.min.js`** - Minified (bundled)

### Build Script
- **`build/bundle-js.js`** - JavaScript bundler using Terser for minification

## Component Documentation

The **`components/`** directory contains:
- **HTML Examples**: Individual component demonstrations (buttons.html, forms-*.html, etc.)
- **Foundation Docs**: Design token documentation (colors, typography, spacing)
- **Guides**:
  - [`README.md`](components/README.md) - Component overview
  - [`MIGRATION-GUIDE.md`](components/MIGRATION-GUIDE.md) - Migration instructions
  - [`CURATION-GUIDE.md`](components/CURATION-GUIDE.md) - Curation guidelines
  - [`_component-index.md`](components/_component-index.md) - Component index

## File Count Summary

### SCSS Files: 6
- 2 core files (variables, base)
- 3 component files (button, forms, components-all)
- 1 main entry file

### JavaScript Files: 2
- 1 main entry file ([`src/js/main.js`](src/js/main.js))
- 1 component module ([`src/js/components/all-components.js`](src/js/components/all-components.js))

### Build Files: 1
- JavaScript bundler script ([`build/bundle-js.js`](build/bundle-js.js))

### Documentation: 30+ files
- Component examples (HTML)
- Foundation documentation (Markdown)
- Migration and curation guides

### Configuration Files: 3
- [`package.json`](package.json)
- [`README.md`](README.md)
- [`STRUCTURE.md`](STRUCTURE.md) (this file)

## SCSS Implementation Status

### ✅ Production Ready
The design system is **fully functional** using a clean, consolidated approach:
- **[`main.scss`](src/scss/main.scss:15)** imports **`components/components-all`**
- **[`_components-all.scss`](src/scss/components/_components-all.scss:1)** contains all 16 component styles (1376 lines)
- All components compile and work correctly
- No missing dependencies or unused files

### 📋 Component File Inventory

**Active SCSS files in `src/scss/components/`:**
1. ✅ [`_button.scss`](src/scss/components/_button.scss) - Button styles
2. ✅ [`_forms.scss`](src/scss/components/_forms.scss) - Form component styles
3. ✅ [`_components-all.scss`](src/scss/components/_components-all.scss) - All other component styles

**Active JavaScript files in `src/js/`:**
1. ✅ [`main.js`](src/js/main.js) - Main entry point
2. ✅ [`components/all-components.js`](src/js/components/all-components.js) - All component logic

All files are actively used and necessary for the build.

## Notes

- The deprecation warnings about @import are expected and can be ignored
- @import will be supported until Dart Sass 3.0.0
- Build output is in `dist/` folder (gitignored)
- All development should be done in the `src/` folder
- The `components/` folder is read-only per project guidelines (documentation only)
- **Current implementation is production-ready** - modularization is optional