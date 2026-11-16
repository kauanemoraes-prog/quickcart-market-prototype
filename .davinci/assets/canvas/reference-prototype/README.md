# Reference Prototype

Canonical structure designers copy when creating a new prototype. See [`PROTOTYPE.md`](PROTOTYPE.md) for the router and [`maps/`](maps/) for per-source documentation.

## Usage

1. Copy this entire folder to `prototypes/<your-name>/`
2. Rename page title, BEM classes, and IDs
3. Replace content in `index.html`, `js/main.js`, `css/main.css`
4. Customize `PROTOTYPE.md` (router) and the maps under `maps/`
5. Register the prototype in workspace-root `canvas-navigation-data.json`

## Architecture

DaVinci's map architecture: `PROTOTYPE.md` is a small router pointing to per-source map files under `maps/`. Every source file (`js/*.js`, `css/*.css`, `*.html`) has a corresponding map at `maps/<area>/<name>.md` carrying the deep context (purpose, public surface, line ranges, gotchas).

When you add a new source file, create its sibling map in the same change. When you edit a source file, update its map in the same change. See CLAUDE.md for full rules.
