FORMAT EXEMPLAR. `js/main.js` is 1,615 bytes, under the ~2 KB floor, so a real prototype would
carry no map for it at all, just a `read directly` row in `PROTOTYPE.md`. This map exists to show the
shape. Copy the shape, not the obligation.

The whole file is front-matter. There is nothing below the closing fence, and that is the point:
`does:` is the only line composed by hand, and every other field is transcribed from
`map-sig.sh --list`. A map that grows prose, line numbers, a TRAPS list or a Gotchas section has
stopped being an index. A constraint a reader would get wrong goes in one short source comment, never
a banner or a paragraph (see the Comment budget).

---
src: js/main.js
does: entry point — renders the items table, binds the example button
exports: []
symbols: [renderItems, bindInteractions, init, safeInit]
state: [items]
dom: ["#items-template", "#items-tbody", "#example-input", "#example-button", "#output"]
deps: []
map-sig: v1 2768901338
---
