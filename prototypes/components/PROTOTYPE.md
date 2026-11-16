# Components Prototype

## META
- **Path**: `prototypes/components/`
- **Dependencies**: DaVinci Canvas, MDS, Handlebars, Plugins (proj-nested-table, proj-timeline, proj-right-toolbar)

### File Structure
```
prototypes/components/
├── index.html                        # Showcase page with live examples
├── css/
│   ├── main.css                      # @imports entry point
│   ├── showcase.css                  # Showcase layout styles
│   ├── nested-table-lines.css        # USE CASE — Lines column widths
│   └── nested-table-stations.css     # USE CASE — Stations detail panel
├── js/
│   ├── lines-stations.js             # USE CASE — Lines/Stations data + config
│   ├── timeline-demo.js              # USE CASE — Timeline demo scenarios
│   └── main.js                       # Entry point (safeInit)
└── PROTOTYPE.md
```

### Plugin Dependencies
Base components are now plugins (auto-loaded CSS, per-prototype JS):
- **Nested Table**: `assets/plugins/proj-nested-table.{html,css,js}`
- **Timeline**: `assets/plugins/proj-timeline.{html,css,js}`
- **Right Toolbar**: `plugins/proj-right-toolbar.{html,css,js}`

## PURPOSE
Showcase of custom Apple Core plugin components, built on MDS. Each component section includes a description, API reference, and live interactive example.

## PAGE LAYOUT (Showcase)
Inspired by Monalisa Design System showcase. Structure:
- **Intro**: Page description
- **Page-level MDS Tabs**: One tab per component (Nested Table, Timeline, Right Toolbar)
- **Tab content**: Title → description → API reference → live example(s)
- CSS classes: `showcase-intro__*`, `component-section__*`, `component-group__*`, `component-example__*`, `component-api__*`, `tabs`/`tabs__*` (MDS)

## COMPONENTS

### Nested Table (`ProjNestedTable`)
Expandable multilevel table. Level 1 rows expand to reveal Level 2 detail panels with different column structures.

**Plugin source**: `assets/plugins/proj-nested-table.{html,css,js}`

**Shared CSS tokens** (defined on `.proj-nested-table`):
- `--nt-color-accent`: Blue accent (#0071E3)
- `--nt-filter-icon-accent`: SVG icon filter for accent color

**API**: See `assets/plugins/proj-nested-table.js` JSDoc (lines 1-22) and live API table in `index.html`.

**Use case**: Lines → Stations (see `js/lines-stations.js`)

### Timeline (`ProjTimeline`)
Horizontal read-only milestone timeline with progress line. Milestones show label (top), state circle, and value (bottom).

**Plugin source**: `assets/plugins/proj-timeline.{html,css,js}`

**Base states** (derived from `current` and `draft` flags):
- `past`: 10px blue filled dot (before current)
- `current`: 14px blue filled dot + white checkmark
- `draft`: 14px white dot, gray border + gray checkmark (current + draft flag)
- `future`: 10px white dot, 1px gray tertiary border

**Modifier** (agnostic — overlays any base state):
- `selected`: 20px blue outer ring around the base dot

**Layout**: `inline-block` with `flex; gap: 70px` for dynamic width. All circles use a 20px layout container. Gray track line spans circle-to-circle (JS-positioned); blue progress fills to current milestone.

**CSS tokens** (defined on `.proj-timeline`):
- `--tl-color-accent`: Blue accent (#0071E3)
- `--tl-color-track`: Track line gray (#C7C7CC)
- `--tl-circle-container`: 20px (layout box)
- `--tl-dot-size`: 14px (inner dot for all base states)

**API**: See `assets/plugins/proj-timeline.js` JSDoc (lines 1-22) and live API tables in `index.html`.

**Demo**: Six scenarios in `js/timeline-demo.js` — 3-dot and 6-dot variants with different current/selected/draft combinations.

### Right Toolbar (`ProjRightToolbar`)
Fixed right-side collapsible panel. Collapsed: 30px (chevron only). Expanded: 300px with ease-in-out animation.

**Plugin source**: `plugins/proj-right-toolbar.{html,css,js}`

**API**: `init()` auto-binds toggles + renders default items, `toggle(el)`, `open(el)`, `close(el)`, `setItems(el, items)` for per-prototype nav items.

**Nav items**: Configurable via `defaultItems` array in JS or per-instance via `setItems()`. Format: `{ id, icon, label }`. Icons always visible (40px column); labels slide in on open.

**States**: Closed (default, 40px) → Open (`--open` class, 300px). Chevron rotates 180° on open.

**Demo**: Live instance on page — click chevron at right viewport edge to toggle.

## NOT IMPLEMENTED
- Multi-level key processes within stations
- Drag-and-drop reordering
- Editable cells
- Header summary totals

## AI ANALYSIS SHORTCUTS
- Showcase layout CSS: `css/showcase.css`
- Page structure: `index.html:18-264` (showcase sections)
- Tabs wrapper: `index.html:28-264` (MDS tabs nav + content)
- **Nested Table**:
  - Plugin component: `assets/plugins/proj-nested-table.{css,js,html}`
  - Use case: `js/lines-stations.js`
  - L1 template: `index.html:267-292`
  - L2 template: `index.html:294-424`
  - Use-case CSS: `css/nested-table-lines.css`, `css/nested-table-stations.css`
- **Timeline**:
  - Plugin component: `assets/plugins/proj-timeline.{css,js,html}`
  - Demo: `js/timeline-demo.js`
  - Template: `index.html:426-448`
  - Section: `index.html:155-258`
