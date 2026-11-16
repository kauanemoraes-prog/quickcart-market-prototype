FORMAT EXEMPLAR. `css/main.css` is 451 bytes, under the ~2 KB floor, so a real prototype would carry
no map for it at all — just a `read directly` row in `PROTOTYPE.md`. This map exists to show the
shape. Copy the shape, not the obligation. Note the floor is by SIZE: a big stylesheet defining this
same single block WOULD need its map.

Note what is NOT here: "no padding on the wrapper", "no @media queries", "use MDS tokens". Those are
global rules that already live in the skills and references, so restating them in every map costs
tokens on every read and protects nothing. Nor is there a Key sections list with line numbers — line
numbers go stale on every edit, which is what made maps look wrong after a pure copy change.

---
src: css/main.css
does: minimal prototype-specific overrides — MDS owns typography and layout
blocks: [reference-prototype-page]
overrides: ["#output"]
map-sig: v1 2557619497
---
