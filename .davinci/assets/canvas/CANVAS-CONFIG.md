# Canvas config: ribbon, navbar and footer

The Canvas chrome (the prototype ribbon at the top, the navbar below it, the footer at the bottom) is
configured per
workspace in **`.davinci/config.json`**, the same file that records the active design system. Nothing
here is required: every key is optional, and an absent key falls back to the DaVinci default.

`config.json` also carries a `_help` block: a short cheat sheet of accepted values, kept beside the
values themselves so you do not have to come here for the common cases. This file is the deep
reference.

## Where it lives

```
.davinci/config.json          the workspace's live config  ← edit this
.davinci/assets/canvas/config.seed.json    the seed it was created from (do not edit)
```

`design-system.sh` creates `config.json` from the seed the first time a design system is selected,
and from then on it only ever rewrites the `designSystem` value. Your `canvas` block survives a
design-system switch.

### When DaVinci adds a new setting

Your `config.json` does not gain new settings on its own: it is your file, and a value present in it
always wins over the built-in default. So after a DaVinci update, a newly added setting is simply
absent from your copy (it still *works* — the built-in default applies — you just cannot see or change
it in the file, and the `_help` cheat sheet may describe an older set of options).

A workspace refresh tells you when that has happened, naming each missing setting, and can add them
for you while keeping every value you have set. Ask DaVinci to "bring my canvas config up to date", or
run the refresh with `--merge-config`. Deleting a setting on purpose still works as before: an absent
setting tracks the DaVinci default, which is why the merge is something you ask for rather than
something that happens automatically.

## Full shape

```json
{
  "designSystem": "monalisa",
  "canvas": {
    "ribbon": {
      "enabled": true,
      "collapsible": false,
      "collapsedByDefault": false,
      "background": "var(--color-fill-yellow)",
      "textColor": "var(--color-glyph-gray)",
      "border": false,
      "borderColor": "",
      "buttonBackground": "",
      "buttonTextColor": "",
      "message": "You are previewing a <strong>Prototype</strong>",
      "features": { "notes": true, "changeHistory": true, "liveEditor": true }
    },
    "footer": {
      "enabled": true,
      "left": "",
      "center": "…",
      "right": ""
    },
    "navbar": {
      "enabled": true
    }
  }
}
```

**`designSystem` must stay the first key.** The resolver that reads it is a small `sed` match that
takes the first hit in the file, so moving it below a long `_help` block risks a mismatch. For the
same reason, never put the literal text `"designSystem":` inside a help string.

## Ribbon

| Key | Values | Default | Notes |
|---|---|---|---|
| `enabled` | `true` \| `false` | `true` | `false` removes the bar **and** its info modal from the page entirely. |
| `collapsible` | `true` \| `false` | `false` | Adds a small pull tab under the bar. |
| `collapsedByDefault` | `true` \| `false` | `false` | Ends up collapsed on a first visit, but shows the bar first with a countdown. Requires `collapsible`. |
| `autoHideDelay` | seconds | `5` | How long that countdown runs. `0` collapses instantly with no countdown. |
| `tabPosition` | `center` \| `left` \| `right` | `center` | Where the pull tab sits. |
| `background` | any CSS **background** | `var(--color-fill-yellow)` | Color *or* gradient. |
| `textColor` | any CSS color | `var(--color-glyph-gray)` | Every label on the bar except the buttons, see below. |
| `border` | `true` \| `false` | `false` | Draws a hairline under the bar and around the tab. |
| `borderColor` | any CSS color | the pack's border gray | That hairline's color. Needs `border: true`. |
| `buttonBackground` | any CSS **background** | unset | The bar's buttons. Unset keeps the design system's. |
| `buttonTextColor` | any CSS color | unset | Those buttons' label and icon. |
| `buttonBorderColor` | any CSS color | unset | Those buttons' border. Unset keeps the design system's. |
| `notesBackground` | any CSS **background** | transparent | The notes group's fill. Unset lets the bar show through. |
| `notesTextColor` | any CSS color | follows `textColor` | The notes group's label and its three icons. |
| `notesBorderColor` | any CSS color | unset (borderless) | The notes group's frame. Unset leaves it transparent. |
| `message` | HTML string | `You are previewing a <strong>Prototype</strong>` | Rendered raw. |
| `features.notes` | `true` \| `false` | `true` | The whole sticky-note system, see below. |
| `features.changeHistory` | `true` \| `false` | `true` | Off switch only, see below. |
| `features.liveEditor` | `true` \| `false` | `true` | Live Editor button, see below. |

### Turning the ribbon off

```json
{ "canvas": { "ribbon": { "enabled": false } } }
```

Useful for clean screenshots or a stakeholder demo. The annotation, change-history and Live Editor
systems are not initialized at all, so nothing is loaded that cannot be reached.

### Collapse tab

```json
{ "canvas": { "ribbon": { "collapsible": true, "tabPosition": "right" } } }
```

`collapsible` adds a small pull tab hanging under the bar. The open/closed choice is remembered in
`localStorage` under `davinci:ribbon-collapsed`, **per browser and shared across every prototype** in
the workspace: collapse it once and it stays collapsed as the reviewer navigates, until they clear
browsing data.

`tabPosition` is `center` (default), `left` or `right`. Left and right are inset by the bar's own
horizontal padding, so the tab lines up with the bar's content: the Add Note button on the left, the
Change History button on the right. Both share one custom property (`--davinci-ribbon-pad-x`), so they
cannot drift apart. An unrecognised value falls back to `center` with a console warning.

Centered is the default but is also the position most likely to sit over the navbar's brand and
navigation when collapsed, so `left` or `right` is often the calmer choice.

### Auto-hide countdown

```json
{ "canvas": { "ribbon": { "collapsible": true, "collapsedByDefault": true, "autoHideDelay": 5 } } }
```

**`collapsedByDefault` does not start collapsed.** The name describes where the bar *ends up*, not how
it starts. On a first visit the bar renders normally, appends "This message will be automatically
hidden in 5…" after the ⓘ icon, counts down to zero, and then collapses. That is deliberate: a bar
that was simply absent taught a reviewer nothing, so they never learned it existed or that a tab
brings it back.

- `autoHideDelay` sets the seconds (default `5`). `0` skips the countdown and collapses immediately,
  which is the old behaviour if you want it.
- The countdown is a **first-visit affordance only**. Once a choice is stored (by the countdown firing
  or by the reviewer clicking the tab) it never runs again on that origin. So a reviewer who opens the
  bar back up keeps it open on the next load rather than watching it hide itself again.
- Clicking the tab mid-count cancels the countdown and honours the click.
- The countdown text is `aria-hidden`: a number changing every second is noise in a screen reader, and
  the ⓘ modal carries the real explanation.

**`collapsedByDefault` requires `collapsible: true` and is ignored without it.** Without the tab there
would be no way to bring the bar back, so it would be gone for good.

### Colors

```json
{ "canvas": { "ribbon": { "background": "#1D1D1F", "textColor": "#FFFFFF" } } }
```

`textColor` covers the text the Canvas owns on that bar: the message, the info icon, the collapse
chevron, and the Show Notes toggle's label. It is set on the bar and inherited, so anything added
there later follows it too.

It stops at the **buttons** (Add Note, Change History). Those are design-system components, and
recoloring only their text would leave them half-restyled, so they have their own pair of keys
instead: `buttonBackground` and `buttonTextColor` (below). The Show Notes *switch* itself, meaning the
track and the knob, is a control rather than text, and also stays the pack's.

There is no automatic contrast adjustment anywhere in this config: if a background makes something
hard to read, set the colors for it or change the background.

The background resolves through three levels, so there is always an answer:

1. your `background` value, if set;
2. `var(--color-fill-yellow)` from the active design system (`#FFE045` in Monalisa, `#FBBF24` in
   Vitruvian, so the bar follows the pack);
3. `#FFD06D`, a raw hex, which is what shows in a `designSystem: "none"` workspace where no tokens
   exist.

### Border

```json
{ "canvas": { "ribbon": { "border": true, "borderColor": "rgba(255, 255, 255, 0.35)" } } }
```

The bar used to carry a 1px gray hairline along its bottom edge unconditionally. It is now **off by
default**, because on anything but the pack's light yellow it reads as a stray line rather than a
boundary, and the color change into the navbar (which has its own shadow) already separates the two.

- `border` is the switch, a plain `true`/`false`. It is not the CSS `border` shorthand: a width or
  style there is ignored.
- `borderColor` only picks the paint, and needs `border: true` to show. A color on its own leaves the
  bar borderless on purpose, so you can park a color in the file and toggle the line with one key.
- Left unset, the color follows the design system (`var(--color-fill-gray-tertiary)`, which Vitruvian
  bridges to its own border gray), with `#D1D1D6` as the last resort in a `designSystem: "none"`
  workspace.
- The bar and the collapse tab are one line: the tab's outline continues the bar's bottom edge rather
  than closing a box around itself, and a collapsed bar drops the line entirely so nothing but the tab
  is left.

On a dark or gradient bar, a translucent white (as above) reads as an edge highlight rather than a
border, which is usually what that bar wants if it wants anything.

### Buttons

```json
{
  "canvas": {
    "ribbon": {
      "background": "#1D1D1F",
      "textColor": "#FFFFFF",
      "buttonBackground": "rgba(255, 255, 255, 0.16)",
      "buttonTextColor": "#FFFFFF"
    }
  }
}
```

Both keys are **unset by default**, and unset means "leave the design system alone", not "use a Canvas
default". So a bar with a custom `background` still shows the pack's own buttons until you say
otherwise, which is usually what you want; reach for these when a dark or saturated bar leaves
them looking stranded.

- `buttonBackground` goes through the `background` shorthand, like the bar's, so a gradient or a
  translucent `rgba()` works as readily as a hex. The button's border is folded into it (it turns
  transparent and the background paints under it), so there is no leftover ring in the pack's color.
- `buttonTextColor` covers the label and its icon together.
- `buttonBorderColor` paints the border the pack already reserves on the button (it is transparent by
  default). Set it alone for an outline-style button, or alongside `buttonBackground` — a set border
  color wins over the transparent one `buttonBackground` would otherwise apply.
- They are independent: set only `buttonTextColor` and the pack's own background, hover and focus
  colors all still apply.
- When `buttonBackground` is set, the pack's hover/focus/active colors are pinned to your value, since
  otherwise they would flash back to the pack's gray on hover. The buttons fade slightly on hover
  instead, which reads the same whatever colors you picked.

They apply to the ribbon's buttons only. Nothing else on the page is touched, including the OK button
in the ⓘ modal.

### Gradients

`background` is applied through the CSS `background` **shorthand**, so it accepts anything that
property does — a gradient as readily as a color:

```json
{
  "canvas": {
    "ribbon": {
      "background": "linear-gradient(90deg, rgba(42,123,155,1) 0%, rgba(87,199,133,1) 50%, rgba(237,221,83,1) 100%)",
      "textColor": "#FFFFFF"
    }
  }
}
```

Anything valid in `background` works: `linear-gradient()`, `radial-gradient()`,
`repeating-linear-gradient()`, multiple comma-separated layers, or `url(...)` for an image.

Two things to know:

- **Give a gradient an explicit `textColor`.** There is no contrast derivation at all, and even less
  chance of a sensible default across a multi-stop gradient. Without it the text stays the pack's
  dark gray.
- **The collapse tab continues the gradient**, rather than repeating it. A background is normally
  positioned against each element's own box, which used to give the 4.4rem tab a compressed copy of
  the whole gradient that never matched the bar above it. The bar and the tab now share one gradient
  box, so the tab shows the slice that sits under it and the seam disappears. It is measured at load
  and re-measured whenever the bar resizes or collapses. A tiled `url(...)` background is handled the
  other way around: it keeps its own size and the tab picks up the tiling where the bar left off.

If a gradient value has a syntax error anywhere in it, CSS discards the whole declaration and the bar
renders **transparent** (which looks white against the page), rather than falling back to the yellow.
Check the value in devtools if that happens: the `background` line on `.prototype-ribbon` will be
struck through.

### Custom message

```json
{ "canvas": { "ribbon": { "message": "Internal review build — <strong>not final</strong>" } } }
```

The info icon that opens the "About These Prototypes" modal is **always** rendered, whatever the
message says. That modal is what tells a reviewer the prototype saves nothing and talks to no backend,
so it is not configurable away.

### Notes

`features.notes` is a plain on/off for the whole sticky-note system. On, the ribbon gets a
**Notes** group — a label, an **Add Note** icon, a **Show/Hide** eye that toggles note visibility,
and a **Copy Notes** icon — and the canvas loads `notes-plus.js` alongside the annotation system.
That group's fill, text and border are themable through `notesBackground` / `notesTextColor` /
`notesBorderColor` above; all three are unset by default, so the group carries no frame or fill of
its own until you give it one. The module is what gives a note everything past a plain text box:

- **Resize** by the corner grip, and a remembered size.
- **Rich text** — bold, italic, underline, strikethrough, bulleted lists, text colour and size, by
  button or by keyboard (⌘B / ⌘I / ⌘U / ⌘⇧X / ⌘⇧8, with ⌘Z / ⌘⇧Z inside the note).
- **Four note colours** (yellow, green, orange, red) so a note can carry meaning. The mapping is the
  designer's.
- **Anchoring** — a note remembers the page element it was dropped on and travels with it on resize
  and scroll, which also means it scrolls with the content rather than floating over it. The stored
  pixel position is the fallback when the anchor cannot be resolved.
- **A delete guard** — deleting a note with text asks first, offers Undo, and keeps the last 10
  deleted notes in a bin.
- **Copy Notes** — puts every note on the page on the clipboard as rich text and plain text,
  numbered in reading order. The button hides while no note is on screen.

There are no sub-toggles: turning `features.notes` off removes the whole system, and nothing loads.

A console API is available on `window.NotesPlus` for the cases the UI does not cover —
`NotesPlus.trash()` and `NotesPlus.restore()` to recover a note deleted a while ago,
`NotesPlus.anchors()` and `NotesPlus.reanchorAll()` when a note is pinned to the wrong thing, and
`NotesPlus.text()` to read the notes out without touching the clipboard.

Notes are stored per page in `localStorage`, under the canvas's own key for text and position and a
`davinci:notes-plus:<pathname>` sidecar for the rest. Losing the sidecar degrades a note to a plain
yellow post-it; it never loses the text.

### Change History

`features.changeHistory` is an **off switch, not a force-on**. With it left at `true` the button
appears only when the prototype has a `prototypes/<name>/changelog.json` with at least one entry.
That is deliberate: the button used to render everywhere and open a drawer that said "No Change
History Available", which read as a broken feature rather than an empty one.

Create the changelog with the `/changelog` command. See the TODO entry "Automatic change-history
generation" for where this is heading.

### Live Editor

`features.liveEditor` is a plain on/off, with no content precondition — unlike `changeHistory`, the
Live Editor inspects whatever is already on the page, so the flag alone decides whether the button
renders. On by default.

It is a **design/dev tool**: a spec inspector and in-place style editor, opened from the ribbon
button or with ⌘I. It opens inert — the prototype behaves normally until you arm the **crosshair**
in the panel header (or hold ⌥ and click, which arms it just for that pick). Armed, hover outlines whatever
is under the pointer and a click **selects** it, filling the panel with that element's computed
colors, spacing, and typography **resolved back to the active design system's tokens**
(`#0071E3` → `--color-base-accent`, `16px` → `--space-mp`). Hover only moves the outline; the panel
always describes the selection, so the values you are reading never change under you.

Click any value to copy it, or, once an element is selected, to edit it in place. The fields are
keyboard-operable too: Tab/⇧Tab walks them in order and opens each on arrival, Enter opens or
commits one, Esc reverts it. Holding **Option/Alt** keeps select mode on so you can walk several
elements (the pin button beside the crosshair does the same permanently); holding **Control** draws
distance lines from the selection to whatever you point at; ⌃R toggles rulers and their guides.
Nothing is ever written to a file: every change is an inline style, and the panel's "Create Prompt"
button exports the accumulated edits as an instruction you can hand to Claude Code to make them
real.

Turn it off for a reviewer-facing prototype where the extra button would be noise:

```json
{ "canvas": { "ribbon": { "features": { "liveEditor": false } } } }
```

With it off, neither the button nor the tool's CSS/JS is loaded at all.

## Footer

Three regions, all optional. The side regions split the leftover space evenly, so the center region
sits in the middle whatever the sides hold.

| Key | Values | Default |
|---|---|---|
| `enabled` | `true` \| `false` | `true` |
| `left` | HTML string | `""` (empty) |
| `center` | HTML string | the Apple copyright block below |
| `right` | HTML string | `""` (empty) |

**Absent and empty mean different things.** Delete a key and you get the DaVinci default; set it to
`""` and the region renders nothing. Only `center` has a non-empty default, so deleting `left` or
`right` is the same as emptying them.

If all three regions end up empty, the footer element is not rendered at all: no residual 3.2rem
strip at the bottom of the page.

```json
{
  "canvas": {
    "footer": {
      "left": "©2026 Apple Inc.",
      "center": "",
      "right": "<span class='footer__disclaimer'><sf-symbol name='exclamationmark.circle'></sf-symbol> Prototype</span>"
    }
  }
}
```

### Classes you can reuse

Authored region HTML can use the footer's own classes so it matches the rest of the chrome:

- `footer__link` — the small blue link style
- `footer__separator` — a `|` divider between items
- `footer__disclaimer` — warning text; its `sf-symbol` renders in orange

### Pasting back a trimmed default

The default `center` includes a hosting disclaimer that only applies to prototypes published to
Enterprise GitHub Pages. If you cleared it and want it back without that sentence:

```json
"center": "<span>©2026 Apple Inc. All rights reserved. Apple Confidential - Strictly need to know.</span> <a class='footer__link' href='https://globalsecurity.apple.com/products-surprise/confidentiality-disclosure' target='_blank'>Confidential Policies</a>"
```

Use single quotes for HTML attributes inside JSON strings, as above, so nothing needs escaping.

## Navbar

The top bar carrying the product's brand, the site navigation, and the user menu.

| Key | Values | Default |
|---|---|---|
| `enabled` | `true` \| `false` | `true` |

```json
{ "canvas": { "navbar": { "enabled": false } } }
```

The navbar does **two jobs at once**: it simulates the product's own top bar, and it is how a
reviewer moves between the prototype's screens (it is driven by `canvas-navigation-data.json`).
Hiding it therefore also removes that navigation — a multi-screen flow becomes unnavigable. So keep
it on unless the product genuinely has no top bar (a sidebar-nav app, a single full-screen tool);
that is the one case where `enabled: false` is the honest choice.

When the navbar is hidden the sub-header still renders if the page defines one, so a screen can keep
its own local header without the global bar.

## Overriding for a single prototype

`config.json` is workspace-wide. To override the chrome for one prototype only, set
`window.DAVINCI_CONFIG.canvas` in that prototype's `index.html`, **before** the canvas script loads.
It takes precedence over the file.

```html
<script>
  window.DAVINCI_CONFIG = {
    canvas: {
      ribbon: { enabled: false },
      footer: { center: "" }
    }
  };
</script>
<script src="../../.davinci/assets/canvas/davinci-canvas.js"></script>
```

## Sharing and publishing

`pack-pages.sh` and `pack-milan.sh` copy `.davinci/config.json` into the build, so a published site
or a Milan upload keeps the chrome you configured. If a shared build shows default chrome, check that
the file made it into the staged `davinci/` folder.

## No design system

A workspace can record `"designSystem": "none"` (via `design-system.sh none <ws>`) for a clean
install where DaVinci only guides and validates. The chrome config still applies, but the Canvas has
no token source, so spacing and color fall back to whatever the browser resolves. This is plumbing
today; see the TODO entry "Guidance-only mode (no design system)".
