
# Icons come from SF Symbols (web component)

Icons render via the `<sf-symbol>` web component, auto-loaded by the DaVinci canvas. No imports, no asset paths, no CSS filter tricks — icons behave like text.

```html
<sf-symbol name="heart"></sf-symbol>
```

### Finding symbol names

Open the **SF Symbols** macOS app (Apple's official symbol catalog), find the symbol you want, and copy its name. Names use **dots**, e.g. `heart.circle.fill`, `person.crop.circle.badge.checkmark`.

> Legacy SVG icons in `assets/icons/regular/*.svg` still work in older prototypes (`<img src="...svg">`). Don't use them in new code — `<sf-symbol>` is the standard.

### Sizing — via parent `font-size`

Icons inherit size from their parent's `font-size`. Never set `width`/`height` on the symbol.

```html
<span style="font-size: 16px">
  <sf-symbol name="star.fill"></sf-symbol> 16px star
</span>
```

| Context | font-size | Notes |
|---|---|---|
| Inline with body text | 12-16px | Match cap-height of surrounding text |
| Control icons (buttons, tabs) | 16-20px | |
| Standalone contextual | 20-28px | Maximum |

Never larger than 28px. The hero element of a view is always a number or text, never an icon.

### Color — via parent `color` with MDS tokens

Icons inherit `currentColor`. Set `color:` on the parent using MDS color tokens — same hierarchy as text.

```html
<span style="color: var(--color-glyph-gray); font-size: 24px">
  <sf-symbol name="bell"></sf-symbol> Notifications
</span>
```

| Role | MDS token |
|---|---|
| Primary / accent action | `var(--color-base-accent)` |
| Default / labels | `var(--color-glyph-gray)` |
| Secondary / metadata | `var(--color-glyph-gray-secondary)` |
| Tertiary / inactive | `var(--color-glyph-gray-tertiary)` |
| On colored background | `#fff` (or `#fff` at 60% opacity for secondary) |

**Color hierarchy rules** (same as text):
- **Accent-colored icon**: only when the icon IS the primary action or IS the data. Max one per view.
- **No multi-colored icons**: don't pair icons in different accents on the same view.
- **No icon + label redundancy**: a clock icon next to the word "Time" is redundant. Use one.

### Weight — match the surrounding text weight

```html
<span style="font-weight: 600">
  <sf-symbol name="cloud.sun" weight="semibold"></sf-symbol> Today
</span>
```

Available: `ultralight`, `thin`, `light`, `regular` (default), `medium`, `semibold`, `bold`, `heavy`, `black`.

### Scale — adjust emphasis without changing `font-size`

```html
<sf-symbol name="plus.circle" scale="small"></sf-symbol>
<sf-symbol name="plus.circle" scale="medium"></sf-symbol>  <!-- default -->
<sf-symbol name="plus.circle" scale="large"></sf-symbol>
```

### Rendering modes

Default is `monochrome` (single color from parent `color`). Other modes for specific design needs:

| Mode | Use when |
|---|---|
| `monochrome` (default) | Standard UI icons, inherits parent color |
| `hierarchical` | One color, varying opacity per layer — for layered symbols |
| `palette` | 2-3 distinct colors per layer — set via `--s-primary`, `--s-secondary`, `--s-tertiary` |
| `multicolor` | Apple's intrinsic colors (e.g. `trash.slash` is red) — use sparingly |

```html
<sf-symbol name="folder.badge.plus" mode="hierarchical"></sf-symbol>

<sf-symbol name="folder.badge.plus" mode="palette"
           style="--s-primary: var(--color-base-accent);
                  --s-secondary: var(--color-glyph-gray-tertiary);"></sf-symbol>
```

### Magic Replace — animated state transitions

Wrap two related symbols in `<sf-replace>` for smooth transitions:

```html
<sf-replace class="repeat when-hover">
  <sf-symbol name="play.circle.fill"></sf-symbol>
  <sf-symbol name="pause.circle.fill"></sf-symbol>
</sf-replace>
```

Good for: play/pause, mute/unmute, checkmark/xmark, bell/bell.slash. Hover-trigger or programmatic.

### Naming variants reference

SF Symbols share consistent suffix patterns:

- **Base**: `heart`, `bell`, `wifi`
- **Filled**: `heart.fill` — selected/active states
- **In circle**: `heart.circle`, `heart.circle.fill`
- **In square**: `heart.square`, `heart.square.fill`
- **Slashed**: `bell.slash`, `wifi.slash` — disabled/off states
- **Badge**: `bell.badge`, `app.badge.checkmark` — with notification badge
- **Localized**: `signature.zh`, `checklist.rtl` — language/script-specific

### Anti-patterns

- ❌ Setting `width`/`height` on `<sf-symbol>` — use parent `font-size`
- ❌ Setting `fill` on `<sf-symbol>` — use parent `color`
- ❌ CSS filter tricks for color — symbols inherit `currentColor` natively
- ❌ Mixing `<img src="...svg">` and `<sf-symbol>` in new code — pick `<sf-symbol>`
- ❌ Icons larger than 28px
- ❌ Multiple accent-colored icons in one view
- ❌ `<sf-symbol>...</sf-symbol>Label` — **always put a space between icon and text** (literal whitespace, or `gap` on a flex parent)
