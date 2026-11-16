# Reference Prototype

## META

- **Path (template)**: `assets/canvas/reference-prototype/`
- **Path (after copy)**: `prototypes/<your-name>/`
- **Dependencies**: DaVinci canvas + MDS (auto-loaded by `davinci-canvas.js`)
- **Canvas integration**: `davinci:canvas:ready` event (event-based init; no `setTimeout` fallback)

## Purpose

Canonical structure designers copy when creating a new prototype. Demonstrates the correct HTML scaffolding, modular file layout (`js/` + `css/` + `maps/`), init pattern, MDS components, and Handlebars templating. Not runnable from its own location — paths assume the 2-deep `prototypes/<name>/` tree.

## Module map

A source file earns a map once it passes **~2 KB**. Below that, reading it whole is cheap enough that
a map cannot win by much, so the `Map` column says `read directly`. The floor is by SIZE, never by
symbol count: a big stylesheet defining one BEM block still needs its map.

`js/main.js` (1,615 B) and `css/main.css` (451 B) sit below the floor, so their maps are format
exemplars only, copy the shape when a file grows past the floor, not the obligation. `index.html`
(3,128 B) is above it and carries a real map.

| Feature | Code | Map | Purpose |
|---|---|---|---|
| Main page | `index.html` | `read directly` (71 lines), exemplar at `maps/html/index.md` | Form input + button + Handlebars-driven items table |
| Init + interactions | `js/main.js` | `read directly` (51 lines), exemplar at `maps/js/main.md` | Renders items table, binds button click |
| Page styles | `css/main.css` | `read directly` (20 lines), exemplar at `maps/css/main.md` | Minimal prototype-specific CSS overrides |

## Integration points

- **Canvas events listened**: `davinci:canvas:ready` (init trigger)
- **MDS components**: `form-group`, `form-input`, `btn`, `table`, `table-container`, `sf-symbol`
- **Plugin components**: none
- **Navigation entry**: register in workspace-root `canvas-navigation-data.json` after copying

## Not implemented

This is a TEMPLATE — copy, rename classes/IDs, and replace content. When extending:
- Add new features as `js/<feature>.js`; add a matching `maps/js/<feature>.md` once it passes ~2 KB
- Add new styles as `css/<feature>.css`; same ~2 KB floor for `maps/css/<feature>.md`
- Add new HTML pages as `<name>.html`; same ~2 KB floor for `maps/html/<name>.md`
- Add a row to the Module map above for every new file, mapped or not

A map indexes **structure** (symbols, BEM blocks, element ids) so the next change can Grep straight
to the right spot. It is YAML front-matter and nothing else: no line numbers, no UI copy, no prose,
and nothing below the closing `---`. It is updated only when that structure changes — never for a
reworded label, a token swap, or an internal logic tweak. Each map ends with a `map-sig:` stamp from
`hooks/map-sig.sh`. No hook checks any of this; a map is small enough that keeping it right is
cheaper than policing it. See the `prototype` skill for the full format.
