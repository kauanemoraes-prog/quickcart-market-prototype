`index.html` is 3,128 bytes, above the ~2 KB floor, so unlike this prototype's `js/` and `css/` maps
this one is NOT just an exemplar — a real prototype would carry it too. Copy the shape AND the
obligation here.

The structural footguns this file used to list here (templates must be siblings of page-content, the
`../../` asset paths, the canvas-event init order) are documented as comments in `index.html` and
`js/main.js` themselves, and in the `canvas` skill. That is where they belong: a map is an index for
finding things, not a second place to keep rules that then have to be kept in sync.

---
src: index.html
does: single demo page — MDS form field, button with SF Symbol, Handlebars-rendered items table
regions: ["#app -> canvas mount", "#page-content -> page markup", "#example-input -> field",
  "#example-button -> action", "#output -> hidden result", "#items-tbody -> table body",
  "#items-template -> handlebars source"]
components: [form-group, form-label, form-input, btn, table, table-container, sf-symbol]
scripts: ["../../.davinci/assets/canvas/davinci-canvas.js", "js/main.js"]
dynamic: ["#items-tbody -> js/main.js via #items-template", "#output -> js/main.js click handler"]
map-sig: v1 573317454
---
