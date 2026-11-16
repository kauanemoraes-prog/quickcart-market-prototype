# DaVinci Core: Default Foundation Tokens (Colors)

> Shipped default VALUES, editable. These are DaVinci Core's baseline, not a mandate. A project overrides them by pointing the target profile `foundations` block at its own token source (or, in DaVinci Design, by using its bundled design system). Core ships self-contained so the tool works with no external design system.

Design tokens for the Monalisa UI Lib color palette.

## Color System

The color system uses semantic naming with "fill" colors for backgrounds and "glyph" colors for text and icons.

---

## Primary Colors

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| **Base Accent** | `#0071E3` | `--color-base-accent` | Primary brand color, links, primary buttons |
| **Fill Gray** | `#1D1D1F` | `--color-fill-gray` | Primary text, dark backgrounds |
| **Fill White** | `#FFFFFF` | `--color-fill` | Light backgrounds, cards |

---

## Semantic Colors

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| **Success** | `#03A10E` | `--color-fill-green` | Success states, positive actions |
| **Warning** | `#F56300` | `--color-fill-orange` | Warning states, caution |
| **Danger** | `#E30000` | `--color-fill-red` | Error states, destructive actions |
| **Info** | `#0071E3` | `--color-fill-blue` | Informational messages |

---

## Gray Scale

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| **Gray Primary** | `#1D1D1F` | `--color-glyph-gray` | Primary text |
| **Gray Secondary** | `#86868B` | `--color-glyph-gray-secondary` | Secondary text, labels |
| **Gray Tertiary** | `#D2D2D7` | `--color-fill-gray-tertiary` | Borders, dividers |
| **Gray Quaternary** | `#E8E8ED` | `--color-fill-gray-quaternary` | Subtle backgrounds |

---

## Fill Colors (Backgrounds)

### Blue
- `--color-fill-blue`: `#0071E3` - Primary blue
- `--color-fill-blue-secondary`: Lighter blue for hover states

### Green
- `--color-fill-green`: `#03A10E` - Success green

### Orange
- `--color-fill-orange`: `#F56300` - Warning orange

### Red
- `--color-fill-red`: `#E30000` - Error red

### Gray
- `--color-fill-gray`: `#1D1D1F` - Dark gray
- `--color-fill-gray-secondary`: `#86868B` - Medium gray
- `--color-fill-gray-tertiary`: `#D2D2D7` - Light gray
- `--color-fill-gray-quaternary`: `#E8E8ED` - Very light gray

### Neutral
- `--color-fill`: `#FFFFFF` - White
- `--color-fill-secondary`: Very light background
- `--color-fill-tertiary`: Subtle background

---

## Interaction State Colors

Hover / active / focus shades for filled controls (buttons). Each derives from its base fill.

| Base | Hover | Active | Focus |
|------|-------|--------|-------|
| Blue (`--color-fill-blue`) | `--color-fill-blue-hover` `#0077ED` | `--color-fill-blue-active` `#006BD6` | (uses hover) |
| Red (`--color-fill-red`) | `--color-fill-red-hover` `#E60000` | `--color-fill-red-active` `#DD0000` | (uses hover) |
| Green (`--color-fill-green`) | `--color-fill-green-hover` `#04B110` | `--color-fill-green-active` `#039E0D` | (uses hover) |
| Orange (`--color-fill-orange`) | `--color-fill-orange-hover` `#F76D00` | `--color-fill-orange-active` `#F35900` | (uses hover) |
| Gray quaternary (`--color-fill-gray-quaternary`) | `--color-fill-gray-quaternary-hover` `#E0E0E5` | `--color-fill-gray-quaternary-active` `#E6E6EB` | `--color-fill-gray-quaternary-focus` `#F0F0F5` |

---

## Glyph Colors (Text & Icons)

### Text
- `--color-glyph-gray`: `#1D1D1F` - Primary text
- `--color-glyph-gray-secondary`: `#86868B` - Secondary text
- `--color-glyph-gray-tertiary`: Tertiary text

### Links
- `--color-base-accent`: `#0071E3` - Link color
- `--color-base-accent-darker-1`: Darker blue for active links

---

## Usage Examples

### In CSS
```css
/* Using color variables */
.my-element {
  color: var(--color-glyph-gray);
  background-color: var(--color-fill);
  border-color: var(--color-fill-gray-tertiary);
}

/* Primary button */
.btn--primary {
  background-color: var(--color-base-accent);
  color: var(--color-fill);
}

/* Success tag */
.tag--success {
  background-color: var(--color-fill-green);
  color: var(--color-fill);
}
```

### In HTML (Inline Styles)
```html
<!-- Use sparingly, prefer CSS classes -->
<div style="color: var(--color-glyph-gray-secondary);">
  Secondary text
</div>
```

---

## Color Accessibility

- **Text on white**: Use `--color-glyph-gray` for primary text
- **Text on dark**: Use `--color-fill` (white)
- **Links**: Always use `--color-base-accent` for consistency
- **Status colors**: Use semantic colors (success, warning, danger) appropriately

---

## Notes

- All colors are defined in [`src/scss/_variables.scss`](../src/scss/_variables.scss)
- Colors are compiled into [`dist/css/monalisa.min.css`](../dist/css/monalisa.min.css)
- Use CSS variables for consistency and maintainability
- Never hardcode hex values - always use variables

---

**Reference**: Full color showcase in [`../index.html`](../index.html) (Colors Section)
