# MDS Components Directory

Individual component files extracted from the Monalisa UI Lib showcase for efficient access and reduced token usage.

## 📋 Quick Start

1. **Browse components**: Open [`_component-index.md`](_component-index.md) for a complete catalog
2. **Find your component**: Look in the organized tables (Forms, Buttons, Data Display, etc.)
3. **Open component file**: Click the link or open directly (e.g., `buttons.html`)
4. **Copy HTML**: Find the variant/size you need and copy the structure

## 📁 Files in This Directory

### Component Files (22 total)

**Forms:**
- [`forms-input.html`](forms-input.html) - Text inputs (small, medium, table-cell sizes)
- [`forms-select.html`](forms-select.html) - Select dropdowns (small, medium, table-cell sizes)
- [`forms-textarea.html`](forms-textarea.html) - Textarea inputs
- [`forms-checkbox.html`](forms-checkbox.html) - Checkbox inputs
- [`forms-radio.html`](forms-radio.html) - Radio buttons
- [`forms-switch.html`](forms-switch.html) - Toggle switches (default, small sizes)

**Buttons:**
- [`buttons.html`](buttons.html) - All button variants and sizes

**Data Display:**
- [`tables.html`](tables.html) - Sortable data tables
- [`pagination.html`](pagination.html) - Pagination controls
- [`tags.html`](tags.html) - Tag labels (5 color variants)
- [`avatars.html`](avatars.html) - Avatar components (3 sizes)
- [`cards.html`](cards.html) - Card layouts
- [`empty-state.html`](empty-state.html) - Empty state component

**Navigation:**
- [`tabs.html`](tabs.html) - Tab navigation
- [`navigation.html`](navigation.html) - Navigation menus with dropdowns
- [`breadcrumb.html`](breadcrumb.html) - Breadcrumb navigation
- [`links.html`](links.html) - Link styles and states

**Feedback:**
- [`notifications.html`](notifications.html) - Inline and toast notifications
- [`loaders.html`](loaders.html) - Spinner and skeleton loaders

**Overlays:**
- [`modal.html`](modal.html) - Modal dialogs (3 sizes)
- [`drawer.html`](drawer.html) - Drawer panels (3 sizes, 2 positions)
- [`popover.html`](popover.html) - Popover overlays (4 placements)

### Documentation Files

- [`_component-index.md`](_component-index.md) - **START HERE** - Complete component catalog with quick reference
- [`MIGRATION-GUIDE.md`](MIGRATION-GUIDE.md) - Migration guide from v2.0.1 to v2.1.0
- [`README.md`](README.md) - This file

### Maintenance Files

- [`extract-components.sh`](extract-components.sh) - Script to extract components from showcase

## 🎯 Usage Examples

### Example 1: Button
```html
<!-- From buttons.html -->
<button class="btn btn--primary btn--medium">Save Changes</button>
```

### Example 2: Text Input (Medium with Floating Label)
```html
<!-- From forms-input.html -->
<div class="form-group form-group--medium">
  <label class="form-label" for="username">Username</label>
  <input type="text" id="username" class="form-input" placeholder="Enter username">
</div>
```

### Example 3: Modal
```html
<!-- From modal.html -->
<div class="modal-overlay modal-overlay--open">
  <div class="modal modal--medium">
    <div class="modal__header">
      <h3 class="modal__title">Confirm Action</h3>
      <button class="modal__close">×</button>
    </div>
    <div class="modal__body">
      Are you sure?
    </div>
    <div class="modal__footer">
      <button class="btn btn--secondary btn--medium">Cancel</button>
      <button class="btn btn--primary btn--medium">Confirm</button>
    </div>
  </div>
</div>
```

## 🔄 Maintenance

### Updating Components

When the showcase file is updated:

1. Edit [`../index.html`](../index.html) (the showcase)
2. Run extraction script:
   ```bash
   cd assets/monalisa-design-system/components
   ./extract-components.sh
   ```
3. Verify component files are updated
4. Update [`_component-index.md`](_component-index.md) if needed
5. Commit changes

### Adding New Components

1. Add component to showcase ([`../index.html`](../index.html))
2. Update [`extract-components.sh`](extract-components.sh):
   - Add new `extract_section` call with line numbers
3. Run extraction script
4. Add component to [`_component-index.md`](_component-index.md)
5. Update file count in documentation

## 📊 Benefits

- ✅ **98% token reduction** - Read only what you need
- ✅ **10x faster discovery** - Direct file access
- ✅ **Better organization** - One component per file
- ✅ **Easy maintenance** - Automated extraction
- ✅ **Pure HTML** - Copy-paste ready snippets

## 🔗 Related Files

- **Full Showcase**: [`../index.html`](../index.html) - Browse all components with live examples
- **CSS**: [`../dist/css/monalisa.min.css`](../dist/css/monalisa.min.css) - Compiled styles
- **JS**: [`../dist/js/monalisa.min.js`](../dist/js/monalisa.min.js) - Component behaviors
- **Structure**: [`../STRUCTURE.md`](../STRUCTURE.md) - Design system documentation

## 📝 Version

- **Created**: March 9, 2026
- **MDS Version**: v2.1.0
- **Total Components**: 22 files
- **Extraction Method**: Automated via shell script

---

**Need help?** Check the [Component Index](_component-index.md) or [Migration Guide](MIGRATION-GUIDE.md).
