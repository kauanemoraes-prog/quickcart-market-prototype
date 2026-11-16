# Component Curation Guide

## Goal

Create **pure, prototype-ready HTML** for each component - exactly what a designer would copy-paste into their prototype. No showcase wrappers, no display divs, just the component.

## ✅ Already Curated (22/22) - COMPLETE! 🎉

### Forms (6 components)
- [x] **buttons.html** - All button variants and sizes
- [x] **forms-input.html** - Text inputs (small, medium, table-cell)
- [x] **forms-select.html** - Select dropdowns (small, medium, table-cell)
- [x] **forms-textarea.html** - Textarea
- [x] **forms-checkbox.html** - Checkbox
- [x] **forms-radio.html** - Radio buttons
- [x] **forms-switch.html** - Toggle switches (default, small)

### Data Display (5 components)
- [x] **tables.html** - Sortable tables
- [x] **pagination.html** - Pagination controls
- [x] **avatars.html** - Avatar sizes
- [x] **cards.html** - Card layouts
- [x] **empty-state.html** - Empty state

### Navigation (4 components)
- [x] **tabs.html** - Tab navigation
- [x] **navigation.html** - Nav menu with dropdowns
- [x] **breadcrumb.html** - Breadcrumb
- [x] **links.html** - Link styles

### Feedback (3 components)
- [x] **tags.html** - All tag color variants
- [x] **notifications.html** - Inline & toast notifications
- [x] **loaders.html** - Spinner & skeleton loaders

### Overlays (3 components)
- [x] **modal.html** - Modal dialogs (3 sizes)
- [x] **drawer.html** - Drawer panels (3 sizes, 2 positions)
- [x] **popover.html** - Popover overlays (4 placements)

## 📝 Curation Process

For each component:

### 1. Open the Showcase
Open [`../index.html`](../index.html) and find the component section

### 2. Identify the Core HTML
Look for the actual component HTML that would be used in a prototype. For example:

**Showcase has:**
```html
<div class="component-group">
  <h3 class="component-group__title">Button Variants</h3>
  <div class="component-showcase">
    <button class="btn btn--primary btn--medium">Primary</button>  ← THIS
    <button class="btn btn--secondary btn--medium">Secondary</button>  ← THIS
  </div>
  <div class="code-block">...</div>
</div>
```

**Extract only:**
```html
<button class="btn btn--primary btn--medium">Primary</button>
<button class="btn btn--secondary btn--medium">Secondary</button>
```

### 3. Include All Variants
Make sure to include:
- All size variants (small, medium, large, etc.)
- All color/style variants (primary, secondary, success, etc.)
- All state examples (default, disabled, invalid, etc.)
- All position variants (left, right, top, bottom, etc.)

### 4. Add Section Comments
Use HTML comments to organize variants:
```html
<!-- PRIMARY BUTTONS -->
<button class="btn btn--primary btn--small">Small Primary</button>
<button class="btn btn--primary btn--medium">Medium Primary</button>

<!-- SECONDARY BUTTONS -->
<button class="btn btn--secondary btn--small">Small Secondary</button>
```

### 5. Add Usage Notes
At the end, add a usage comment:
```html
<!-- USAGE:
- Always include both variant and size classes
- Medium is the default size
- Use semantic variants appropriately
-->
```

## 📋 Template Structure

```html
<!-- COMPONENT NAME -->
<!-- Brief description -->
<!-- Copy the exact HTML you need -->

<!-- VARIANT 1 -->
<actual-component-html>...</actual-component-html>

<!-- VARIANT 2 -->
<actual-component-html>...</actual-component-html>

<!-- USAGE:
- Key usage notes
- Important patterns
- Common gotchas
-->
```

## ✅ Examples of Good Curation

### buttons.html (Perfect Example)
- ✅ Only `<button>` tags
- ✅ All variants organized by type
- ✅ Clear section comments
- ✅ Usage notes at end
- ❌ No showcase wrappers
- ❌ No display divs

### tags.html (Perfect Example)
- ✅ Only `<span class="tag">` tags
- ✅ All color variants
- ✅ Usage examples
- ✅ Usage notes
- ❌ No showcase wrappers

## 🎯 What to Extract

### For Simple Components (buttons, tags, avatars)
Just the component tags with all variants

### For Form Components (inputs, selects, checkboxes)
The complete form-group structure:
```html
<div class="form-group">
  <label class="form-label" for="id">Label</label>
  <input type="text" id="id" class="form-input" placeholder="...">
</div>
```

### For Complex Components (modal, drawer, tables)
The complete component structure with all parts:
```html
<div class="modal-overlay">
  <div class="modal modal--medium">
    <div class="modal__header">...</div>
    <div class="modal__body">...</div>
    <div class="modal__footer">...</div>
  </div>
</div>
```

### For Navigation Components (tabs, nav-menu)
The complete navigation structure:
```html
<div class="tabs">
  <div class="tabs__nav">
    <button class="tabs__tab tabs__tab--active">Tab 1</button>
  </div>
  <div class="tabs__content">
    <div class="tabs__panel tabs__panel--active">Content 1</div>
  </div>
</div>
```

## 🚫 What NOT to Include

- ❌ `<div class="component-group">`
- ❌ `<div class="component-showcase">`
- ❌ `<h3 class="component-group__title">`
- ❌ `<div class="code-block">`
- ❌ `<pre>` tags with code snippets
- ❌ Showcase-specific styling divs
- ❌ Display/demo wrappers

## 💡 Pro Tips

1. **Think like a designer**: What would you copy-paste into a prototype?
2. **Keep it minimal**: Only the component HTML, nothing more
3. **Be complete**: Include all variants and sizes
4. **Add context**: Use comments to organize and explain
5. **Test mentally**: Could this HTML be dropped directly into a prototype?

## 🔄 Next Steps

1. Manually curate each of the 20 remaining components
2. Follow the template structure
3. Test each component file
4. Update this checklist as you complete each one

---

**Status**: 22/22 components curated - COMPLETE! 🎉
**Remaining**: 0 components
**Approach**: Manual curation for perfect, prototype-ready HTML
