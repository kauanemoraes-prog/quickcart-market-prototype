# MDS Component Index

Quick reference for all available Monalisa UI Lib components and foundation elements. Each file contains pure HTML snippets or design tokens ready to use in your prototypes.

## 📋 How to Use

1. **Find the component or foundation element** you need in the tables below
2. **Open the file** (e.g., `buttons.html` or `foundation-colors.md`)
3. **Read the METADATA header** for variants, sizes, and prompting guidance
4. **Copy the exact HTML or reference the design tokens**
5. **Paste into your prototype** - MDS CSS/JS handles all styling and behavior automatically

## 🏷️ Component Metadata Format

Each component file now includes a METADATA header with:
- **Variants/Sizes**: Available options (e.g., primary, secondary, small, large)
- **States**: Available states (e.g., default, disabled, invalid)
- **When to prompt**: Guidance on when to ask user for clarification
- **Conventions**: Common use case mappings (e.g., delete=danger button)
- **Prompt question**: Exact question to ask user
- **Prompt options**: Suggested answers with use cases

**Example from buttons.html:**
```html
<!--
METADATA:
- Variants: primary, secondary, success, warning, danger, link
- Sizes: small, medium (NO large size)
- When to prompt: User says "add a button" without specifying type
- Conventions: save=primary, delete=danger, cancel=secondary
- Prompt question: "What button style would you like?"
- Prompt options: Primary (main action), Secondary (alternative), etc.
-->
```

---

## 🎨 Foundation

Design tokens and reference materials for colors, typography, and spacing.

| Element | File | Content | Usage |
|---------|------|---------|-------|
| **Colors** | [`foundation-colors.md`](foundation-colors.md) | Color palette, CSS variables, semantic colors | Reference for color tokens |
| **Typography** | [`foundation-typography.md`](foundation-typography.md) | Font scales, weights, responsive sizes | Reference for typography tokens |
| **Spacing** | [`foundation-spacing.md`](foundation-spacing.md) | Spacing scale, layout patterns | Reference for spacing tokens |

---

## 🎨 Forms

| Component | File | Variants | Sizes | Notes |
|-----------|------|----------|-------|-------|
| **Text Input** | [`forms-input.html`](forms-input.html) | default, disabled, invalid | small (default), medium (48px), table-cell (24px) | Medium size uses floating label with `form-group--medium` |
| **Select** | [`forms-select.html`](forms-select.html) | default, disabled, invalid | small (default), medium (48px), table-cell (24px) | Medium size uses floating label with `form-group--medium` |
| **Textarea** | [`forms-textarea.html`](forms-textarea.html) | default, disabled | default | For multi-line text input |
| **Checkbox** | [`forms-checkbox.html`](forms-checkbox.html) | checked, unchecked, disabled | default | Custom styled checkbox |
| **Radio** | [`forms-radio.html`](forms-radio.html) | checked, unchecked, disabled | default | Custom styled radio button |
| **Switch** | [`forms-switch.html`](forms-switch.html) | on, off, disabled | default (34×18px), small (24×14px) | Toggle switch component |

---

## 🔘 Buttons

| Component | File | Variants | Sizes | Notes |
|-----------|------|----------|-------|-------|
| **Button** | [`buttons.html`](buttons.html) | primary, secondary, success, warning, danger, link | small, medium | No large size available |

---

## 📊 Data Display

| Component | File | Variants | Sizes | Notes |
|-----------|------|----------|-------|-------|
| **Table** | [`tables.html`](tables.html) | sortable, striped, hoverable | default | Sortable tables need `<span class="sort-icon">⇅</span>` in headers |
| **Pagination** | [`pagination.html`](pagination.html) | first page, middle page, last page | default | Includes per-page selector and navigation |
| **Tags** | [`tags.html`](tags.html) | primary, success, warning, danger, gray | default | For labels and status indicators |
| **Pills** | [`pills.html`](pills.html) | grey, blue, orange, yellow, red | default, selected | Compact dismissible labels with color variants |
| **Badge Counter** | [`badge-counter.html`](badge-counter.html) | default | default | Numeric counter badge overlaid on buttons, icons, checkboxes |
| **Avatars** | [`avatars.html`](avatars.html) | initials, image | small (24×24), medium (32×32), large (56×56) | User profile pictures or initials |
| **Cards** | [`cards.html`](cards.html) | with header, simple, with footer | default | Content containers |
| **Empty State** | [`empty-state.html`](empty-state.html) | default | default | When no data is available |
| **Selection List** | [`selection-list.html`](selection-list.html) | default | default | Vertical selectable list with checkmark indicator |

---

## 🧭 Navigation

| Component | File | Variants | Sizes | Notes |
|-----------|------|----------|-------|-------|
| **Tabs** | [`tabs.html`](tabs.html) | default | default | Tab navigation with panels |
| **Navigation Menu** | [`navigation.html`](navigation.html) | with dropdowns, multi-level | default | Horizontal nav with nested menus |
| **Breadcrumb** | [`breadcrumb.html`](breadcrumb.html) | default | default | Shows current location in hierarchy |
| **Links** | [`links.html`](links.html) | default, hover, focus | default | Styled anchor links |

---

## 💬 Feedback

| Component | File | Variants | Sizes | Notes |
|-----------|------|----------|-------|-------|
| **Notifications** | [`notifications.html`](notifications.html) | info, success, warning, error | default | Inline (static) and toast (top-center) variants |
| **Loaders** | [`loaders.html`](loaders.html) | spinner, skeleton | small, medium, large | Loading indicators |

---

## 🪟 Overlays

| Component | File | Variants | Sizes | Notes |
|-----------|------|----------|-------|-------|
| **Modal** | [`modal.html`](modal.html) | default | small (320px), medium (600px), large (800px) | Centered dialog overlay |
| **Drawer** | [`drawer.html`](drawer.html) | left, right | small (400px), medium (600px), large (904px) | Side panel overlay |
| **Popover** | [`popover.html`](popover.html) | top, bottom, left, right | default | Floating content container |

---

## 📝 Usage Examples

### Example 1: Adding a Primary Button
```html
<!-- From buttons.html -->
<button class="btn btn--primary btn--medium">Save Changes</button>
```

### Example 2: Adding a Text Input (Medium Size with Floating Label)
```html
<!-- From forms-input.html -->
<div class="form-group form-group--medium">
  <label class="form-label" for="username">Username</label>
  <input type="text" id="username" class="form-input" placeholder="Enter your username">
</div>
```

### Example 3: Adding a Success Tag
```html
<!-- From tags.html -->
<span class="tag tag--success">Active</span>
```

### Example 4: Adding a Modal
```html
<!-- From modal.html -->
<div class="modal-overlay modal-overlay--open">
  <div class="modal modal--medium">
    <div class="modal__header">
      <h3 class="modal__title">Confirm Action</h3>
      <button class="modal__close">×</button>
    </div>
    <div class="modal__body">
      Are you sure you want to proceed?
    </div>
    <div class="modal__footer">
      <button class="btn btn--secondary btn--medium">Cancel</button>
      <button class="btn btn--primary btn--medium">Confirm</button>
    </div>
  </div>
</div>
```

---

## 🎯 Quick Tips

- **Always copy exact HTML structure** - Don't modify class names or structure
- **MDS handles all styling** - No need to add custom CSS for components
- **Use semantic variants** - primary for main actions, danger for destructive actions
- **Check component file** for all available variants and states
- **Combine components** - Mix and match to build complex UIs

---

## 📚 Additional Resources

- **Full Showcase**: [`../index.html`](../index.html) - Browse all components with live examples
- **CSS Source**: [`../dist/css/monalisa.min.css`](../dist/css/monalisa.min.css) - Compiled styles
- **JS Source**: [`../dist/js/monalisa.min.js`](../dist/js/monalisa.min.js) - Component behaviors
- **Documentation**: [`../STRUCTURE.md`](../STRUCTURE.md) - Design system structure

---

## 🔄 Component File List

All 23 component files:

1. [`avatars.html`](avatars.html) - Avatar sizes and variants
2. [`badge-counter.html`](badge-counter.html) - Numeric counter badge
3. [`breadcrumb.html`](breadcrumb.html) - Breadcrumb navigation
3. [`buttons.html`](buttons.html) - Button variants and sizes
4. [`cards.html`](cards.html) - Card layouts
5. [`drawer.html`](drawer.html) - Drawer overlays
6. [`empty-state.html`](empty-state.html) - Empty state component
7. [`forms-checkbox.html`](forms-checkbox.html) - Checkbox inputs
8. [`forms-input.html`](forms-input.html) - Text inputs (all sizes)
9. [`forms-radio.html`](forms-radio.html) - Radio buttons
10. [`forms-select.html`](forms-select.html) - Select dropdowns (all sizes)
11. [`forms-switch.html`](forms-switch.html) - Toggle switches
12. [`forms-textarea.html`](forms-textarea.html) - Textarea inputs
13. [`links.html`](links.html) - Link styles
14. [`loaders.html`](loaders.html) - Spinner and skeleton loaders
15. [`modal.html`](modal.html) - Modal dialogs
16. [`navigation.html`](navigation.html) - Navigation menus
17. [`notifications.html`](notifications.html) - Notification components
18. [`pagination.html`](pagination.html) - Pagination controls
19. [`popover.html`](popover.html) - Popover overlays
20. [`tables.html`](tables.html) - Data tables
21. [`tabs.html`](tabs.html) - Tab navigation
22. [`tags.html`](tags.html) - Tag labels
23. [`selection-list.html`](selection-list.html) - Selection list

---

**Last Updated**: April 28, 2026
**Total Components**: 24 files
