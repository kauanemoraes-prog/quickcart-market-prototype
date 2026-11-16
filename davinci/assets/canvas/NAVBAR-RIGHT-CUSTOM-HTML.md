# Navbar Right Custom HTML Injection

## Overview

The DaVinci top navbar right section can be customized by adding a `navbarRight` property to your `canvas-navigation-data.json`. This lets you inject buttons, dropdowns, action icons, badges, or any HTML alongside (or in place of) the built-in user dropdown — without touching the canvas template.

Unlike `subHeader` (which is configured per-page), `navbarRight` is configured **once at the root level** of `canvas-navigation-data.json` and applies to every page in the workspace.

## Configuration

Add `navbarRight` at the root of `canvas-navigation-data.json`:

```json
{
  "siteTitle": "My Workspace",
  "navbarRight": {
    "htmlContent": "<button class=\"btn btn--primary btn--small\">Upgrade</button>",
    "position": "before-user"
  },
  "mainNavigation": [ ... ]
}
```

### Fields

- **`htmlContent`** (string, required) — Raw HTML to render. Escape inner double quotes (`\"`).
- **`position`** (string, optional) — Where to place the content. Defaults to `"before-user"`.

### Position Options

| Position | Behavior | Auto-wrapped |
|----------|----------|--------------|
| `before-user` (default) | Renders BEFORE the user dropdown | Yes — wrapped in `.top-navbar__actions` |
| `after-user` | Renders AFTER the user dropdown | Yes — wrapped in `.top-navbar__actions` |
| `replace` | Replaces the entire right section, including the user dropdown | No — you control the full markup |

> **Hiding the right section:** an explicit `"position": "replace"` is honored even when `htmlContent` is empty (`""`), rendering an **empty** right section — i.e. no user dropdown, no actions. Use `{ "htmlContent": "", "position": "replace" }` (globally or per-page) to omit the right section entirely. Note this differs from `"navbarRight": null`, which forces the **default user dropdown** back.

For `before-user` and `after-user`, the canvas wraps your `htmlContent` in a `<div class="top-navbar__actions">` flex container (gap: `var(--space-s)`) so multiple children align cleanly without extra CSS. For `replace`, you render whatever you want as-is.

### Per-page override

The root `navbarRight` applies to every page, but any item in `mainNavigation` can carry its own `navbarRight` that **overrides the global one for that page only**. This is how you apply a custom right section to most pages while keeping the default user dropdown on a few.

- A per-page `navbarRight` object (with `htmlContent` + `position`) replaces the global config on that page.
- A per-page `"navbarRight": null` (or `false`) forces the **default user dropdown** back on that page, ignoring the global config.
- Omitting `navbarRight` on an item → the page inherits the global config.

```json
{
  "navbarRight": {
    "htmlContent": "<span>by <img src=\"../../files/venturus.png\" alt=\"Venturus\"></span>",
    "position": "replace"
  },
  "mainNavigation": [
    { "label": "Home", "url": "prototypes/intro" },
    { "label": "Demo Prototype", "url": "prototypes/demo-prototype", "navbarRight": null }
  ]
}
```

Here every page shows the Venturus lockup except **Demo Prototype**, which keeps the built-in user dropdown.

## Examples

### Example 1: Action buttons before the user dropdown (default)

```json
"navbarRight": {
  "htmlContent": "<button class=\"btn btn--ghost btn--small\" title=\"Notifications\"><sf-symbol name=\"bell\"></sf-symbol></button><button class=\"btn btn--primary btn--small\">Upgrade</button>",
  "position": "before-user"
}
```

### Example 2: Environment selector after the user dropdown

```json
"navbarRight": {
  "htmlContent": "<select class=\"form-select\" style=\"min-width: 14rem;\"><option value=\"\">Select Environment</option><option value=\"prod\">Production</option><option value=\"staging\">Staging</option><option value=\"dev\">Development</option></select>",
  "position": "after-user"
}
```

### Example 3: Full replacement (custom user dropdown + extras)

When you need fine-grained control — for example, a different user dropdown layout or a notification badge next to a custom avatar — use `replace` and include the full markup yourself:

```json
"navbarRight": {
  "htmlContent": "<span class=\"badge-counter__anchor\"><button class=\"btn btn--ghost btn--small\" title=\"Notifications\"><sf-symbol name=\"bell\"></sf-symbol></button><span class=\"badge-counter\">3</span></span><button class=\"btn btn--ghost btn--small\" title=\"Settings\"><sf-symbol name=\"gearshape\"></sf-symbol></button><div class=\"top-navbar__user-dropdown nav-menu__item nav-menu__item--has-dropdown\"><button class=\"top-navbar__user-menu nav-menu__link nav-menu__link--dropdown\"><div class=\"avatar avatar--medium\">JA</div><span class=\"top-navbar__user-name\">John Appleseed</span></button></div>",
  "position": "replace"
}
```

⚠️ With `position: "replace"`, the built-in user dropdown (including the user-impersonation menu) is removed. If you still want impersonation to work, you must include compatible markup yourself.

## Best Practices

### 1. Use MDS Components

Leverage the active design system's components for consistent UI:
- Buttons: `btn`, `btn--ghost`, `btn--primary`, `btn--small`
- Forms: `form-select`, `form-input`
- Icons: `<sf-symbol name="...">` (auto-loaded by the canvas)
- Tags / badges: `tag`, `tag--accent`, `badge-counter`

### 2. Keep HTML Compact

Since this goes in JSON, put HTML on one line and escape inner quotes:

```json
"htmlContent": "<button class=\"btn btn--primary\">Action</button>"
```

### 3. Prefer `before-user` for Most Cases

`before-user` is the default because it preserves the built-in user dropdown (and impersonation menu) on its right edge — matching standard navbar conventions. Reach for `after-user` only when the content needs to be visually closer to the page edge, and for `replace` only when you need to restructure the entire right section.

### 4. Don't Hard-Code Widths

Use MDS spacing tokens (`var(--space-*)`) and let the flex container handle alignment. Avoid `width`/`height` declarations except where genuinely needed (e.g., min-width on a `<select>`).

### 5. Honor User Impersonation Selectors

If your custom markup includes elements that should be hidden, disabled, or made read-only per user role (see `davinci-users.json`), give them stable IDs or `data-*` attributes so impersonation rules can target them.

## Hiding the Custom Content

Omit the `navbarRight` property entirely (or leave `htmlContent` empty/falsy) and the canvas falls back to the default: just the built-in user dropdown.

## Technical Details

### Template Logic

The header template (`assets/canvas/parts/header.html`) uses this logic inside `.top-navbar__right`:

```handlebars
{{#if navbarRight.replace}}
  {{{navbarRight.htmlContent}}}
{{else}}
  {{#if navbarRight.before}}
  <div class="top-navbar__actions">{{{navbarRight.htmlContent}}}</div>
  {{/if}}
  <!-- ...built-in user dropdown... -->
  {{#if navbarRight.after}}
  <div class="top-navbar__actions">{{{navbarRight.htmlContent}}}</div>
  {{/if}}
{{/if}}
```

### Normalization

In `davinci-canvas.js`, `data.navbarRight` is normalized once before the template renders:

```javascript
if (data.navbarRight && data.navbarRight.htmlContent) {
  const pos = data.navbarRight.position || 'before-user';
  data.navbarRight = {
    htmlContent: data.navbarRight.htmlContent,
    position: pos,
    before: pos === 'before-user',
    after: pos === 'after-user',
    replace: pos === 'replace'
  };
} else {
  data.navbarRight = null;
}
```

The boolean helpers (`before`, `after`, `replace`) keep the Handlebars template free of comparison helpers.

### Styling

The auto-wrap container is defined in `assets/canvas/canvas-styles.css`:

```css
.top-navbar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-s);
}
```

It's a tighter `gap` than `.top-navbar__right` (which uses `var(--space-m)`) so grouped buttons sit visually as one unit, distinct from the user dropdown.

## Troubleshooting

### Content Not Showing

1. Verify `navbarRight` is at the **root** of `canvas-navigation-data.json` — not nested inside a navigation item.
2. Verify `htmlContent` is a non-empty string.
3. Check the browser console for JSON parse errors (a trailing comma in the file will silently drop the property).

### HTML Renders as Escaped Text

The template uses triple braces `{{{htmlContent}}}` so HTML is rendered raw. If you see escaped text (`&lt;button&gt;`) in the DOM, you've likely escaped your HTML twice in the JSON. Use plain `<` and `>` in `htmlContent`; only the inner `"` quotes need escaping (as `\"`).

### Position Has No Effect

Allowed values are exactly `"before-user"`, `"after-user"`, `"replace"`. Anything else falls back to `"before-user"` because the normalizer defaults unknown values silently. Double-check spelling and the hyphen.

### `replace` Removes the User Dropdown

That's by design. If you still want a user dropdown, include the `.top-navbar__user-dropdown` markup yourself in `htmlContent`.

## Related Files

- [`assets/canvas/parts/header.html`](parts/header.html) — Header template
- [`assets/canvas/davinci-canvas.js`](davinci-canvas.js) — Canvas framework logic
- [`assets/canvas/canvas-styles.css`](canvas-styles.css) — Canvas-specific styles (defines `.top-navbar__actions`)
- [`canvas-navigation-data.json`](../../canvas-navigation-data.json) — Navigation configuration (workspace root)
- [`assets/canvas/SUBHEADER-CUSTOM-HTML.md`](SUBHEADER-CUSTOM-HTML.md) — Companion docs for subheader customization
