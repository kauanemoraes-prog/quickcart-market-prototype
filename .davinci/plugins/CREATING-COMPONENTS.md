# Creating Plugin Components

Guide for creating new project-specific reusable components for DaVinci.

## When to Create a Plugin Component

**Create a plugin when:**
- A UI pattern is reused across 2+ prototypes
- A designer explicitly asks to make a component reusable
- A component does not exist in MDS and is project-specific

**Do NOT create a plugin when:**
- MDS already has the component (use MDS instead)
- The pattern is used only once (keep it in the prototype)

## Prerequisites

1. Read `.davinci/assets/design-system/components/_component-index.md` to confirm the design system does NOT already provide the component
2. Choose a name with the project prefix: `proj-component-name`

## File Structure

Each plugin component consists of up to 3 files:

```
plugins/
  proj-component-name.html    # REQUIRED — HTML reference with METADATA header
  proj-component-name.css     # OPTIONAL — component-specific styles
  proj-component-name.js      # OPTIONAL — component behaviors
```

## Step-by-Step Process

### 1. Create the HTML File

Use this template:

```html
<!-- PROJ-COMPONENT-NAME -->
<!-- Brief description of what this component does -->

<!-- METADATA
Component: Component Name
Category: [Data Display | Navigation | Feedback | Forms | Overlays | Layout]
Complexity: [Low | Medium | High]

CRITICAL STRUCTURE REQUIREMENTS:
- MUST [requirement 1]
- MUST [requirement 2]

COMMON MISTAKES TO AVOID:
[X] [Mistake 1]
[X] [Mistake 2]

JAVASCRIPT INTEGRATION:
- [How to initialize / interact with the component]
- [Event handlers needed]

COMPANION FILES:
- CSS: proj-component-name.css (or "none")
- JS: proj-component-name.js (or "none")

CORRECT STRUCTURE TEMPLATE:
<div class="proj-component-name">
  [Minimal correct HTML structure here]
</div>

When to prompt: [When to ask user for clarification]
Variants: [List of available variants]
-->

<!-- Copy the exact HTML you need -->

<!-- DEFAULT VARIANT -->
<div class="proj-component-name">
  <!-- Full HTML for default variant -->
</div>

<!-- VARIANT 2 (if applicable) -->
<div class="proj-component-name proj-component-name--compact">
  <!-- Full HTML for variant 2 -->
</div>

<!-- USAGE:
- Key usage notes
- Design token dependencies
- Any integration details
-->
```

### 2. Create Companion CSS (if needed)

```css
/* Plugin component: Component Name */

.proj-component-name {
  padding: var(--space-m);
  border: 1px solid var(--color-separator);
  border-radius: var(--space-xs);
}

.proj-component-name--compact {
  padding: var(--space-s);
}
```

**CSS Rules:**
- MUST use MDS design tokens (`var(--space-*)`, `var(--color-*)`, `var(--font-*)`)
- MUST prefix all class names with the component name to avoid conflicts
- MUST NOT override MDS component styles
- MUST NOT include responsive styles (`@media` queries) — prototypes are desktop-only
- MUST NOT define custom font sizes without consulting `foundation-typography.md`
- Comments follow the `prototype` skill's Comment budget: one identifying line at most, nothing that restates the code

### 3. Create Companion JS (if needed)

```javascript
/* Plugin component: Component Name */

(function() {
  'use strict';

  window.ProjComponentName = {
    init: function() {
      document.querySelectorAll('.proj-component-name').forEach(function(el) {
        // Setup behavior for each instance
      });
    }
  };
})();
```

**JS Rules:**
- MUST use IIFE pattern (same as prototype modules)
- MUST expose module on `window` (e.g., `window.ProjStatCard`)
- MUST NOT listen for `davinci:canvas:ready` — `plugins.js` handles init timing
- MUST NOT conflict with MDS JavaScript behaviors

### 4. Register in Entry Files

**CSS** — Add `@import` to `plugins/plugins.css`:
```css
@import url('proj-component-name.css');
```

**JS** — Add init call to `plugins/plugins.js` inside `DaVinciPlugins.init()`:
```javascript
if (window.ProjComponentName) ProjComponentName.init();
```

### 5. Update the Plugin Index

Add an entry to `plugins/_component-index.md` in the Components table:

```markdown
| **Component Name** | [`proj-component-name.html`](proj-component-name.html) | [`proj-component-name.css`](proj-component-name.css) | [`proj-component-name.js`](proj-component-name.js) | variant1, variant2 | Brief description |
```

Use `—` for CSS or JS columns if the component has no companion file.

## Importing Components from Other Projects

To reuse a plugin component from another DaVinci project:

1. Copy the component files (`*.html`, `*.css`, `*.js`) into your `plugins/` folder
2. Register the CSS `@import` in `plugins.css`
3. Register the JS init in `plugins.js`
4. Add the entry to `_component-index.md`

If the source project uses a different prefix, you may either keep the original prefix or rename to match your project's convention.

## Checklist for New Plugin Components

- [ ] MDS does NOT already have this component
- [ ] File uses project prefix (`proj-`)
- [ ] HTML file has complete METADATA header
- [ ] CSS uses only MDS design tokens
- [ ] CSS class names are all prefixed (no generic names)
- [ ] JS uses IIFE pattern and exposes on `window`
- [ ] `@import` added to `plugins.css` (if CSS exists)
- [ ] Init call added to `plugins.js` (if JS exists)
- [ ] `_component-index.md` is updated
- [ ] Component HTML is pure copy-paste ready
