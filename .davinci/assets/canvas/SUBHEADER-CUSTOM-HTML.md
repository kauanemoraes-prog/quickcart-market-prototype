# Subheader Custom HTML Injection

## Overview

The DaVinci subheader now supports both simple string titles AND custom HTML content injection. This allows you to create rich, interactive subheaders with controls, buttons, forms, and any other HTML elements.

## Usage Methods

### Method 1: Simple String Title (Backward Compatible)

The traditional approach still works - just provide a string:

```json
{
  "label": "My Page",
  "url": "prototypes/my-page",
  "subHeader": "Simple Page Title"
}
```

### Method 2: Object with Title Property

You can also use an object with a `title` property:

```json
{
  "label": "My Page",
  "url": "prototypes/my-page",
  "subHeader": {
    "title": "Page Title"
  }
}
```

### Method 3: Custom HTML Content (NEW!)

Inject custom HTML using the `htmlContent` property:

```json
{
  "label": "Manage Units",
  "url": "prototypes/manage-units",
  "subHeader": {
    "htmlContent": "<h2 class=\"sub-header__subtitle\">Manage Units</h2><div class=\"sub-header__controls\"><button class=\"btn btn--primary\">Add Unit</button></div>"
  }
}
```

## Examples

### Example 1: Subheader with Controls

```json
{
  "label": "Dashboard",
  "url": "prototypes/dashboard",
  "subHeader": {
    "htmlContent": "<h2 class=\"sub-header__subtitle\">Dashboard</h2><div class=\"sub-header__controls\"><select class=\"form-select\"><option>All Sites</option><option>Site A</option></select><button class=\"btn btn--primary\">Export</button></div>"
  }
}
```

### Example 2: Subheader with Search

```json
{
  "label": "Users",
  "url": "prototypes/users",
  "subHeader": {
    "htmlContent": "<div style=\"display: flex; justify-content: space-between; align-items: center; width: 100%;\"><h2 class=\"sub-header__subtitle\">User Management</h2><input type=\"search\" class=\"form-input\" placeholder=\"Search users...\" style=\"max-width: 300px;\"></div>"
  }
}
```

### Example 3: Subheader with Tabs

```json
{
  "label": "Reports",
  "url": "prototypes/reports",
  "subHeader": {
    "htmlContent": "<h2 class=\"sub-header__subtitle\">Reports</h2><div class=\"tabs\"><button class=\"tabs__tab tabs__tab--active\">Overview</button><button class=\"tabs__tab\">Details</button><button class=\"tabs__tab\">Analytics</button></div>"
  }
}
```

## Best Practices

### 1. **Maintain Consistent Styling**

Always include the standard subheader classes for consistency:

```html
<h2 class="sub-header__subtitle">Your Title</h2>
```

### 2. **Use Flexbox for Layout**

The `.sub-header__content` container uses flexbox. Structure your HTML accordingly:

```html
<h2 class="sub-header__subtitle">Title</h2>
<div class="sub-header__controls">
  <!-- Your controls here -->
</div>
```

### 3. **Keep HTML Compact**

Since this goes in JSON, keep HTML on one line or use proper escaping:

```json
"htmlContent": "<h2 class=\"sub-header__subtitle\">Title</h2><div class=\"sub-header__controls\"><button>Action</button></div>"
```

### 4. **Escape Quotes Properly**

Always escape double quotes inside the JSON string:

```json
"htmlContent": "<div class=\"my-class\">Content</div>"
```

### 5. **Use MDS Components**

Leverage the active design system's components for consistent UI:

- Buttons: `btn`, `btn--primary`, `btn--secondary`
- Forms: `form-select`, `form-input`, `form-checkbox`
- Tags: `tag`, `tag--success`, `tag--warning`

## Hiding the Subheader

To hide the subheader for a specific page, set `subHeader` to `null` or `false`:

```json
{
  "label": "Home",
  "url": "prototypes/intro",
  "subHeader": null
}
```

## Technical Details

### Template Logic

The subheader template (inlined in [`assets/canvas/parts/header.html`](parts/header.html)) uses this logic:

```handlebars
{{#if hasSubheader}}
<div class="sub-header">
    <div class="sub-header__content">
        {{#if subHeader.htmlContent}}
            {{{subHeader.htmlContent}}}
        {{else}}
            <h2 class="sub-header__subtitle">{{subHeader.title}}</h2>
        {{/if}}
    </div>
</div>
{{/if}}
```

### Visibility Logic

The subheader is shown when:
- `subHeader.title` exists and is not empty, OR
- `subHeader.htmlContent` exists

This is controlled in [`davinci-canvas.js`](davinci-canvas.js):

```javascript
data.hasSubheader = data.subHeader && 
  ((data.subHeader.title && data.subHeader.title.trim() !== '') || 
   data.subHeader.htmlContent);
```

## Migration Guide

### From Manual HTML to Navigation Data

If you currently have custom subheader HTML in your prototype's `index.html`:

**Before:**
```html
<!-- In prototypes/my-page/index.html -->
<div class="sub-header">
    <div class="sub-header__content">
        <h2 class="sub-header__subtitle">My Page</h2>
        <button class="btn btn--primary">Action</button>
    </div>
</div>
```

**After:**
```json
// In canvas-navigation-data.json
{
  "label": "My Page",
  "url": "prototypes/my-page",
  "subHeader": {
    "htmlContent": "<h2 class=\"sub-header__subtitle\">My Page</h2><button class=\"btn btn--primary\">Action</button>"
  }
}
```

Then remove the manual HTML from your prototype's `index.html`.

## Troubleshooting

### Subheader Not Showing

1. Check that `htmlContent` or `title` is not empty
2. Verify JSON syntax (no trailing commas, proper escaping)
3. Check browser console for errors

### HTML Not Rendering

1. Ensure you're using triple braces `{{{htmlContent}}}` in the template (already done)
2. Check for unescaped quotes in your HTML string
3. Validate your HTML structure

### Styles Not Applied

1. Verify you're using correct MDS class names
2. Check that MDS CSS is loaded (should be automatic)
3. Inspect element in browser DevTools to see applied styles

## Related Files

- [`assets/canvas/parts/header.html`](parts/header.html) - Header template (contains inlined subheader markup)
- [`assets/canvas/davinci-canvas.js`](davinci-canvas.js) - Canvas framework logic
- [`canvas-navigation-data.json`](../../canvas-navigation-data.json) - Navigation configuration
- [`assets/canvas/canvas-styles.css`](canvas-styles.css) - Canvas-specific styles
