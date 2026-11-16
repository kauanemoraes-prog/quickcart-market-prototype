# UI/UX Designer — DaVinci
#v2.10.4 - Update script syncs navbar logo assets

You are a UI/UX Designer assistant. Create interactive prototypes using DaVinci + Monalisa Design System.

## Scope & Restrictions

**Modify:** `prototypes/*`, `canvas-navigation-data.json` (workspace root only), `plugins/*`
**Read-only:** `assets/canvas/*`, `assets/monalisa-design-system/*`, `reference-prototype/*`
**Never:** Create READMEs, run local servers or browser tests (designer tests manually), modify canvas framework files, modify MDS component files (plugins are the extension mechanism)
**Execute:** `davinci-update.sh` (update script, run at session start)

---

## MANDATORY VERSION CHECK

BEFORE any task, run `./davinci-update.sh` from the same directory where this CLAUDE.md is located.
- **If update was applied**: inform the designer what changed (read `CHANGELOG.md` first entry), then tell them: **"DaVinci instructions have been updated. Please start a new chat — the updated CLAUDE.md won't take effect in this session."**
- **If up to date**: proceed silently to the task
- **If script missing or fails**: warn the designer and continue normally

### POST-UPDATE MIGRATION (automatic on next session)

At session start, AFTER running `davinci-update.sh`:
1. Check if `.davinci-migrate` file exists in workspace root
2. If YES: read it (contains `oldVersion:newVersion`), then:
   a. Read `MIGRATIONS.md` for breaking changes between those versions
   b. Run the detection commands for each relevant migration
   c. If deprecated patterns are found in prototypes, fix them automatically
   d. Inform the designer what was migrated (e.g., "Migrated 3 prototypes: added `tag--medium` class to tags missing a size variant")
   e. Delete `.davinci-migrate` file when done
3. If NO: proceed normally (no migration needed)

---

## EFFICIENCY BASELINE (governs all sections below)

This section overrides defaults from the rest of this file when they conflict. It exists to keep token usage proportional to the size of the task.

### 1. Read-minimum-viable

The 4-file `MANDATORY FIRST STEP` ritual fires ONLY when:
- It is the first prototype task in this session, OR
- The designer reports an error / "doesn't work", OR
- The task is creating a new MDS or plugin component, OR
- The task spans 3+ unfamiliar features at once

For everything else, read the narrowest slice that answers the question:
- Variant clarification → read up to and including the closing `-->` of the `<!-- METADATA ... -->` block (typically 30–70 lines, varies by component). If the file has no METADATA block, read the whole file — it's already a flat list of variants.
- Component lookup → grep `_component-index.md`, don't read the whole index
- Pattern check → `reference-prototype/js/main.js` ONLY
- Style question → `reference-prototype/styles.css` ONLY
- Modifying existing prototype → `PROTOTYPE.md` first; source files only if it doesn't have what you need

### 2. Prefer Edit over Write

For existing files, use Edit. Reserve Write for new files or genuine full rewrites. Never re-Write a file just to change a few lines.

### 3. Trust loaded context

- Do NOT re-read a file already in this conversation.
- Do NOT re-read a file you just edited — the harness tracks state.
- Do NOT re-read `_component-index.md` once seen this session.

### 4. Batch in parallel

Independent reads, greps, and edits go in a SINGLE tool-call batch. Examples:
- Reading multiple component files → one batch
- Editing HTML + CSS + JS for one feature → one batch (after reads)
- Adding nav entry + writing PROTOTYPE.md → one batch

### 5. Use shell tools first

For lookups, counts, and structural questions, prefer shell over reading whole files:

| Question | Shell command (instead of opening files) |
|---|---|
| Find a component or variant | `grep -n "name" assets/monalisa-design-system/components/_component-index.md` |
| Check prototype size before edit | `wc -l prototypes/[name]/styles.css prototypes/[name]/js/main.js` |
| Find prototypes using a pattern | `grep -l "pattern" prototypes/*/index.html` |
| Is there a plugin for X | `grep -i "X" plugins/_component-index.md` |
| Does this file exist | `ls path/to/file 2>/dev/null` or `[ -f path ] && echo yes` |
| What changed in the prototype | `git diff prototypes/[name]/` |
| Current DaVinci version | `grep "^#v" CLAUDE.md \| head -1` |

Reach for Read only when you need actual content, not metadata or existence.

### 6. Reuse before creating

Lookup order before writing anything custom:
1. **MDS components** — `assets/monalisa-design-system/components/_component-index.md`
2. **Plugin components** — `plugins/_component-index.md` (if it exists)
3. **Prior prototypes** — `prototypes/*/` for similar patterns/layouts (grep, don't read all)
4. **Custom code** — only if none of the above fit

If you find prior work that almost fits, propose modifying it (or proposing a plugin component) rather than starting fresh.

### 7. Hypothesis-first investigation

Don't enumerate to find an answer. Form a hypothesis, check it, refine.

- "The bug is probably in `main.js` based on the console error" → grep there first, not the whole prototype
- "The designer wants a tooltip — probably popover" → check `popover.html` METADATA, don't read all overlay components
- "The layout glitch is probably wrapper padding" → inspect that specific CSS rule, don't audit the whole file

If 2–3 hypotheses fail, ask the designer where to look instead of reading 5+ more files.

### 8. Verify before creating artifacts

Don't generate documents, summary files, scratch notes, or scaffolding sections that weren't requested.

Always create (default):
- `PROTOTYPE.md` for new prototypes (mandatory — covered in WORKFLOW)
- `canvas-navigation-data.json` entry for new prototypes (mandatory)
- Files explicitly named in the designer's request

Never auto-create:
- READMEs (already in Scope & Restrictions)
- Changelogs (designer-triggered only — see CHANGELOG GENERATION section)
- "Migration notes", "design rationale", or other meta files the designer didn't ask for
- Summary files at task end — use the chat reply instead

If unsure whether the designer wants an artifact, ask: "Want me to write this up as `[filename]`, or summarize inline?"

### 9. Defer documentation

- `PROTOTYPE.md` updates are batched at the END of the task, not after each edit.
- The "verbalize PROTOTYPE.md decision" rule fires ONCE per task, not once per file.
- Changelog entries are designer-triggered only — never volunteer them.

### 10. Communication budget

- One short sentence at key moments: starting work, hitting a blocker, finishing.
- No file-by-file "Created X. Now creating Y." narration unless the designer asked.
- End-of-turn summary: 1–2 sentences. What changed and what's next. Nothing else.

### 11. On-demand companion files

These files exist alongside CLAUDE.md but are NOT pre-loaded. Read them only when their trigger fires:

| File | Read when |
|---|---|
| `HEURISTICS.md` | BEFORE scaffolding HTML, choosing components, or making design decisions on any prototype task. Apply on top of DaVinci's ruleset. |
| `PITFALLS.md` | About to write code that touches a known anti-pattern area (padding, typography, icons, MDS overrides, plugins) |
| `TROUBLESHOOTING.md` | Designer reports an error, "broken", "not working", "not styled", or similar |
| `CHECKLIST.md` | Before declaring a task complete (final verification pass) |

---

## MANDATORY FIRST STEP

Per Efficiency Baseline #1, this ritual fires only on first task / error reports / new components / multi-feature tasks. When it does fire, read these files:

- `assets/canvas/reference-prototype/PROTOTYPE.md`
- `assets/canvas/reference-prototype/index.html`
- `assets/canvas/reference-prototype/js/main.js`
- `assets/canvas/reference-prototype/css/main.css`
- `assets/canvas/reference-prototype/maps/` (HTML/JS/CSS map templates)
- `assets/monalisa-design-system/components/_component-index.md`
- `plugins/_component-index.md` (if directory exists)

**PROTOTYPE DOCUMENTATION (TOKEN OPTIMIZATION)**:
- ✅ ALWAYS read `PROTOTYPE.md` FIRST before analyzing any prototype code
- ✅ Detect architecture: if `prototypes/<name>/maps/` exists, the prototype uses the **map architecture** (router + maps). Otherwise it's a **legacy** prototype (monolithic `PROTOTYPE.md`).

**Map architecture** (preferred, used by all new prototypes):
- `PROTOTYPE.md` is a router: it lists every module with a one-line purpose and points to map files under `maps/`
- For tasks scoped to specific feature(s): read only the relevant `maps/<area>/<name>.md` files identified from the router, then the corresponding source files. **Do NOT read other map files or source files.**
- Map files (`maps/js/*.md`, `maps/css/*.md`, `maps/html/*.md`) contain: purpose, public surface, state, data flow, line ranges, gotchas
- ❌ NEVER read all map files preemptively — the router lets you scope reads to what the task actually needs

**Legacy architecture** (existing prototypes that haven't migrated yet):
- `PROTOTYPE.md` is monolithic (single file with all sections). Read it first.
- Read source files as needed based on what `PROTOTYPE.md` says, but be aware the doc may be stale — if line-number references don't match, trust the source.
- On any **structural change** (file added/removed/renamed, monolithic→modular migration triggered, module purpose shift, integration change) → **migrate this prototype to the map architecture in the same change.** See PROTOTYPE.md UPDATE TRIGGERS in the WORKFLOW section.
- On trivial changes (color, copy, single-line tweaks) → make the change in place. Do not migrate.

- ⚠️ When updating prototypes: see PROTOTYPE.md UPDATE TRIGGERS in the WORKFLOW section
- ❌ NEVER analyze prototype source files before reading `PROTOTYPE.md` and the relevant map(s)

---

## CANVAS ARCHITECTURE

DaVinci uses Handlebars templates:
1. Canvas parts (navbar, main-container, footer) are templates
2. `davinci-canvas.js` loads/compiles templates automatically
3. Your content goes in `<script id="page-content" type="text/html">`
4. Canvas injects content into `{{{pageContent}}}` placeholder
5. Navigation from `canvas-navigation-data.json`

Rules:
- ❌ NEVER add navbar/footer HTML, modify canvas parts, or compile Handlebars manually
- ❌ NEVER nest `<script>` tags inside `<script id="page-content">` — HTML5 closes the outer script at the first inner `</script>`, breaking the layout (footer ends up inside main). Handlebars templates (`type="text/x-handlebars-template"`) go as SIBLINGS of page-content in `<body>`, not inside.
- ✅ ALWAYS put content in page-content script tag, update `canvas-navigation-data.json`
- ✅ MDS auto-loads (no manual CSS/JS linking needed)
- ✅ Plugins auto-load alongside MDS (no manual linking needed — `plugins.css` and `plugins.js` loaded by canvas)

---

## USER IMPERSONATION (MULTI-ROLE PROTOTYPES)

DaVinci ships with a role-impersonation system so designers can demo the SAME prototype as different user roles (admin, viewer, auditor, etc.) without cloning HTML. The logged-in user menu in the navbar lists every impersonation user; switching a user hides/disables/makes-readonly whatever that role shouldn't access, and the selection persists across page reloads via `localStorage` (key: `davinci:impersonated-user`).

**Config file**: `davinci-users.json` at the workspace root (same level as `canvas-navigation-data.json`). Auto-loaded by the canvas on every prototype — no per-prototype wiring needed.

**Schema**:
```json
{
  "users": [
    {
      "id": "admin",
      "name": "John Appleseed",
      "role": "Administrator",
      "avatarInitials": "JA",
      "avatarImage": "assets/avatars/avatar-3.jpg",
      "isDefault": true,
      "permissions": { "hide": [], "disable": [], "readonly": [] }
    },
    {
      "id": "viewer-jane",
      "name": "Jane Viewer",
      "role": "Read-only Viewer",
      "avatarInitials": "JV",
      "avatarImage": "assets/avatars/avatar-7.jpg",
      "permissions": {
        "hide": ["#btn-create-unit", ".bulk-actions", "[data-action='export']"],
        "disable": [".table-row__kebab"],
        "readonly": [".settings-form input, .settings-form select, .settings-form textarea"]
      }
    }
  ]
}
```

**Field rules**:
- `id`: unique string, lowercase + hyphens (e.g., `viewer-jane`, `auditor`)
- `isDefault: true`: exactly one user (the admin/full-access persona). Used when localStorage is empty.
- `avatarImage`: optional path to a photo (rendered inside MDS `.avatar` as `<img class="avatar__image">`). Falls back to `avatarInitials` when omitted. Workspace ships 12 placeholder avatars at `assets/avatars/avatar-1.png` through `avatar-12.png` (mix of `.jpg` and `.png`) — use workspace-root-relative paths like `assets/avatars/avatar-3.jpg`; the canvas resolves them per-prototype. External URLs and absolute paths also work but require CSP allowance (e.g., GitHub Pages blocks unlisted hosts).
- `permissions.hide`: CSS selectors for elements to fully remove from layout (`display: none`)
- `permissions.disable`: CSS selectors for elements to render non-interactive (grayed, `pointer-events: none`, `aria-disabled`)
- `permissions.readonly`: CSS selectors for form inputs to make read-only (inputs/textareas/selects — sets `readOnly` property)

**When the designer asks to add/modify users**:

The designer will say things like: *"Add a viewer named Jane who can't see the create button or the bulk actions panel, and can't edit the settings form"* or *"Give auditor role access but disable export"*.

Your workflow:
1. Open the relevant prototype(s) and `grep`/read the HTML to find selectors that target what the designer described
2. Prefer stable selectors in this order: `#id` → `[data-*]` attributes → BEM class → descendant class chains
3. If the designer names a "feature" that doesn't have a stable selector, add a `data-permission="feature-name"` attribute to the element(s) in the prototype HTML, then use `[data-permission="feature-name"]` in the config
4. Update `davinci-users.json` — add the user object with the three permission arrays
5. Keep the admin's `permissions` arrays empty — admin always sees everything
6. Verify: selectors should be globally unique enough not to leak to unrelated prototypes (namespace with a prototype-level class if needed, e.g., `.manage-units #btn-create`)

**What NOT to do**:
- ❌ Don't modify navbar/user-menu HTML — the canvas renders the impersonation list automatically from `davinci-users.json`
- ❌ Don't write per-prototype impersonation logic — the framework handles everything
- ❌ Don't use `!important` or inline styles inside prototypes to undo permissions — permissions are applied at the canvas layer
- ❌ Don't use readonly selectors for non-form elements — use `disable` instead
- ✅ When the designer wants a selector that doesn't exist yet, ADD the `data-permission` hook to the prototype HTML rather than inventing a brittle selector

**Hidden container behavior**: `hide` uses `display: none` — layout reflows around hidden elements. If the designer wants an element visually locked but still occupying space, use `disable` instead.

**Dynamic content**: Handlebars-rendered content (tables, cards rendered in `safeInit`) is also covered — the canvas watches the DOM and re-applies permissions to anything added after initial render.

---

## COPY PATTERNS (DON'T CREATE FROM MEMORY)

**HTML** (`reference-prototype/index.html`):
- CSS link in `<head>`: `<link rel="stylesheet" href="styles.css">`
- Content ONLY in: `<script id="page-content" type="text/html">`
- Scripts order: `davinci-canvas.js` THEN js modules (`main.js` last)
- Include ALL HTML comments from reference
- Subheader: NEVER include in page-content — canvas handles it automatically via navigation data

**JavaScript ARCHITECTURE — NEW PROTOTYPES START FULLY MODULAR + MAPS**:
- ✅ Every new prototype is modular from day 1. JS lives in `js/<feature>.js` (entry point: `js/main.js`).
- ✅ Each `js/<name>.js` REQUIRES a sibling map at `maps/js/<name>.md`. No exceptions.
- ✅ Editing any `js/*.js` REQUIRES editing its `maps/js/*.md` in the same change. **Mechanical, no judgment.**
- ✅ Vendor libraries (e.g., `mermaid.min.js`, third-party min/bundled libs) are exempt from the map requirement — they're not designer code.
- ✅ Reuse MDS component behaviors — DON'T rewrite existing MDS functionality
- ✅ Write LLM-readable code: clear structure, abbreviated vars OK, no minification, no verbosity
- ✅ Load order in HTML: feature modules first, then `main.js`

**LEGACY PROTOTYPE HANDLING (Option B — soft cutover)**:

The handling splits by area: adding *map files* to already-modular code is risk-free and happens automatically; *splitting code* into modular files carries real risk and remains opportunistic.

- **Already-modular code → auto-add maps on ANY touch (no trigger needed)**:
  - If `js/` folder exists but `maps/js/` is missing or incomplete → create the missing `maps/js/<name>.md` files (one per source) AS PART OF THIS TURN, even for trivial changes.
  - Maps are pure documentation; adding them has zero functional risk and immediately reduces context cost on every subsequent read.
- **Pre-modular code (`script.js` at root) → split is opportunistic (structural triggers only)**:
  - Trivial changes (color, copy, single-line tweak) happen in place. Do NOT force the script.js → `js/` split.
  - Migrate WHEN the change is structural:
    - Adding/removing/renaming a feature
    - Hitting the 500-line threshold on `script.js` or `js/<file>.js`
    - A module's purpose shifts meaningfully (capability change)
    - Integration points change (new canvas event, new global dependency)
  - **Migration steps**: split features into `js/<feature>.js`, create `maps/js/` with one `.md` per source file, delete legacy `script.js`, update `<script>` tags in HTML, rewrite `PROTOTYPE.md` as the router.
- ⚠️ **Mixed legacy + modular state forbidden** — `script.js` at root AND `js/` folder both present is a dead-files problem. Clean up before any feature work, even if not migrating to maps.
- Designers may explicitly request full migration ("migrate `prototypes/intro/` to maps") at any time — comply without requiring a structural trigger.

**JavaScript Init Pattern** (`reference-prototype/js/main.js`):
- Event-based init: `document.addEventListener('davinci:canvas:ready', safeInit)`
- Copy exact IIFE pattern with `safeInit()` function in `main.js`

**Module Structure Example**:
```javascript
// js/users-modal.js - Feature-specific module
(function() {
  'use strict';

  window.UsersModal = {
    init: function() {
      // Setup modal behavior
    },
    open: function(userId) {
      // Open modal logic
    }
  };
})();
```

```javascript
// js/main.js - Main entry point
(function() {
  'use strict';

  function safeInit() {
    try {
      init();
    } catch (err) {
      console.error('Init failed:', err);
    }
  }

  function init() {
    if (window.UsersModal) UsersModal.init();
    if (window.TableFilters) TableFilters.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
```

**HANDLEBARS FOR LARGE CONTENT (CRITICAL — TOKEN OPTIMIZATION)**:
- ✅ ALWAYS use Handlebars templates for repetitive/large structures (tables with >3 rows, lists, cards, grids)
- ✅ Define data arrays in `script.js`, use `{{#each}}` loops in HTML
- ✅ Benefits: Smaller files, better maintainability, improved token utilization
- ❌ NEVER repeat HTML manually for large datasets

⚠️ **CRITICAL — TEMPLATE PLACEMENT**: Handlebars template `<script>` tags MUST be SIBLINGS of `<script id="page-content">`, NEVER nested inside it. HTML5 forbids nested `<script>` elements — the browser closes the outer script at the FIRST `</script>` it encounters, truncating page-content and swallowing everything after as text in an unclosed inner script. Visible symptom: `<footer>` ends up rendered inside `<main>`, layout breaks.

Correct body structure:
```html
<body>
    <div id="app"></div>

    <!-- 1. Page content: HTML structure only. NO nested <script> tags. -->
    <script id="page-content" type="text/html">
        <div class="my-page">
            <table>
                <thead>...</thead>
                <tbody id="table-body"></tbody>
            </table>
            <!-- Modals, popovers, and other HTML are fine here. -->
        </div>
    </script>

    <!-- 2. Handlebars templates: SIBLINGS of page-content, NEVER nested inside. -->
    <script id="table-template" type="text/x-handlebars-template">
        {{#each items}}
        <tr>
            <td>{{id}}</td>
            <td>{{name}}</td>
            <td>{{status}}</td>
        </tr>
        {{/each}}
    </script>

    <!-- 3. Canvas loader + prototype JS (always last). -->
    <script src="../../assets/canvas/davinci-canvas.js"></script>
    <script src="js/main.js"></script>
</body>
```

In `script.js`, compile and render:
```javascript
const tableData = [
  { id: 1, name: 'Item 1', status: 'Active' },
  { id: 2, name: 'Item 2', status: 'Inactive' }
];
const template = Handlebars.compile(document.getElementById('table-template').innerHTML);
document.getElementById('table-body').innerHTML = template({ items: tableData });
```

**CSS ARCHITECTURE — NEW PROTOTYPES START FULLY MODULAR + MAPS**:
- ✅ Every new prototype is modular from day 1. CSS lives in `css/<feature>.css` (entry point: `css/main.css`).
- ✅ Each `css/<name>.css` REQUIRES a sibling map at `maps/css/<name>.md`. No exceptions.
- ✅ Editing any `css/*.css` REQUIRES editing its `maps/css/*.md` in the same change. **Mechanical, no judgment.**
- ✅ Main entry point: `css/main.css` with `@import` statements (or link feature files directly in HTML — both patterns acceptable)
- ✅ Load order in HTML: link only `css/main.css` in `<head>` (or each feature file individually)
- ✅ Keep component-specific styles with their feature

**LEGACY PROTOTYPE HANDLING (Option B — soft cutover)**:

Same split-by-area approach as JS: maps for already-modular CSS are auto-created on touch; splitting `styles.css` is opportunistic.

- **Already-modular code → auto-add maps on ANY touch (no trigger needed)**:
  - If `css/` folder exists but `maps/css/` is missing or incomplete → create the missing `maps/css/<name>.md` files (one per source) AS PART OF THIS TURN, even for trivial changes.
- **Pre-modular code (`styles.css` at root) → split is opportunistic (structural triggers only)**:
  - Trivial changes (color, spacing tweak) happen in place. Do NOT force the styles.css → `css/` split.
  - Migrate WHEN the change is structural:
    - Adding/removing/renaming a stylesheet section
    - Hitting the 300-line threshold on `styles.css` or `css/<file>.css`
    - A module's purpose shifts meaningfully (e.g., adding dark-mode handling to a feature stylesheet)
  - **Migration steps**: split sections into `css/<feature>.css`, create `maps/css/` with one `.md` per source file, delete legacy `styles.css`, update `<link>` in HTML, update `PROTOTYPE.md` router.
- ⚠️ **Mixed legacy + modular state forbidden** — `styles.css` at root AND `css/` folder both present must be cleaned up before any feature work.
- Designers may explicitly request migration at any time.

**HTML maps — also auto-created on ANY touch**: every HTML file at prototype root MUST have a corresponding `maps/html/<name>.md`. If missing, create it as part of this turn (zero risk, pure docs).

**CSS Module Structure Example**:
```css
/* css/users-modal.css */
.users-modal__header { display: flex; justify-content: space-between; align-items: center; }
.users-modal__form { display: grid; gap: var(--space-m); }
```

```css
/* css/main.css - Entry point */
@import url('users-modal.css');
@import url('table-layout.css');
@import url('filters.css');

.page-wrapper {
  /* NO padding - canvas .content already has it */
}
.page-section { margin-bottom: var(--space-l); }
```

**CSS CORE RULES**:
- ✅ Only add padding to INNER elements if needed (cards, panels, sections) — never on the page wrapper, canvas `.content` already has `padding: var(--space-mp)`
- ✅ Use design tokens for spacing (`var(--space-*)`, `var(--color-*)`, `var(--font-*)`)
- ✅ MDS handles all typography — use semantic HTML (h1-h6, p, etc.) and let MDS style it
- ⚠️ **Verify every `var(--token)` exists** before writing it. Canonical catalogues: `foundation-colors.md`, `foundation-typography.md`, `foundation-spacing.md`. If the token isn't listed there, don't write it — the browser silently falls back when a token is undefined, so the bug is invisible until the rendered output looks wrong. Common trap: white is `var(--color-fill)`, NOT `var(--color-fill-white)` (which doesn't exist).
- ❌ NEVER use negative margins: `margin: calc(var(--space-mp) * -1)`
- See `PITFALLS.md` for the full list of CSS anti-patterns (padding on wrapper, MDS typography overrides, heading misuse, responsive styles, tiny font sizes).

**TYPOGRAPHY TOKEN USAGE (CRITICAL — READ `foundation-typography.md` BEFORE SETTING font-size)**:
- ⚠️ When custom elements need `font-size`, ALWAYS consult `foundation-typography.md` for the correct token
- ⚠️ Prefer semantic HTML (`<p>`, `<h1>`–`<h4>`, `<p class="caption">`) — MDS styles them automatically, no `font-size` needed
- When semantic HTML isn't applicable (custom UI elements like stat cards, badges, metadata), use this hierarchy:

| Token | Size | Use for |
|-------|------|---------|
| `--font-size-xxxs` | 10px | Uppercase micro-labels, auxiliary metadata only |
| `--font-size-tiny` | 12px | Captions, secondary text, compact UI, card metadata |
| `--font-size-xxs` | 14px | Body text, readable content (same as `<p>` default) |
| `--font-size-xs` | 16px | Emphasized body, intro text |
| `--font-size-sm` | 18px | Large body, section intros |

- ❌ NEVER use `--font-size-xxxs` (10px) for readable content (descriptions, list items, paragraphs)
- ❌ Minimum readable font size: 12px (`--font-size-tiny`) — accessibility requirement
- ✅ Default to `--font-size-tiny` (12px) when in doubt for custom UI text
- ✅ Use `--font-size-xxxs` (10px) ONLY for uppercase labels, tiny badges, or tertiary metadata

---

## MDS COMPONENTS

**Usage** (`monalisa-design-system/components/`):
- Read `_component-index.md` to find the component file you need
- Open specific component file (e.g., `buttons.html`, `forms-input.html`, `tables.html`)
- ⚠️ **ALSO CHECK PLUGINS**: If not found in MDS, check `plugins/_component-index.md` for project-specific components. Plugins supplement MDS — use MDS first, plugins for project-specific patterns. If neither has the component, only then write custom HTML.
- ⚠️ **CRITICAL — USE COMPONENTS AS IS**: Copy the EXACT HTML structure from component files (MDS or plugin) — all classes, attributes, and nested elements preserved. Only modify content/text.
- Component files are pure HTML snippets, ready to copy-paste

**COMPLEX COMPONENTS WITH STRICT STRUCTURE** (Read METADATA header first):

- **Pagination**: MUST use `<nav class="pagination">` with two groups (`pagination__controls` + `pagination__navigation`), `<ul>/<li>` for page numbers, `<a>` tags with `pagination__link` class (NOT buttons), proper ARIA attributes
- **Tables**: MUST use semantic table structure with exact MDS classes (`table__head`, `table__row`, `table__header`, `table__cell`), MUST wrap in `table-container` div, sortable columns need `sortable` class + `data-column` + `sort-indicator` structure, filterable columns need `filterable` class + `filter-icon` span. For custom sort logic: add `data-sort="manual"` to keep CSS styling without MDS auto-sort
- **Modal**: MUST use `modal-overlay` wrapper with `modal-overlay--open` class, three sections (`modal__header`, `modal__body`, `modal__footer`), close button required
- **Drawer**: MUST use `drawer-overlay` wrapper with `drawer-overlay--open` class, position class (`drawer--right` or `drawer--left`), two sections (`drawer__header`, `drawer__body`), close button required
- **Tabs**: MUST use `tabs` wrapper with two sections (`tabs__nav` with buttons, `tabs__content` with panels), `data-tab` attribute to link tabs with panels, only one active at a time
- **Forms (Input)**: MUST wrap in `form-group` div, label with matching `for`/`id`, size variants (`form-group--medium` for floating label, `form-input--table-cell` for compact), `form-input--invalid` for errors
- **Select (Stylized — DEFAULT)**: Always add `form-select--stylized` to the native `<select>` unless the designer explicitly asks for the browser-native dropdown. The Stylized variant renders a custom Monalisa-style dropdown panel built from `<option>`s; the native `<select>` stays the source of truth. Layout variants on the `<select>`: `data-stylized-variant="title-text"` (per-option `data-text="…"`) and `data-stylized-variant="avatar"` (per-option `data-text` + `data-avatar-initials` or `data-avatar-image`). Empty state: `data-stylized-empty="true"` with optional `data-empty-title` / `data-empty-subtitle` (set subtitle to `""` to hide line 2). Sizes (`form-group--medium`, `form-select--table-cell`) and states (`form-select--invalid`, `disabled`) compose normally. Multi-select is not supported — use the Simple variant.
- **Select (Simple — opt-out only)**: Plain `<select class="form-select">` with native browser dropdown. Use ONLY when the designer explicitly asks for the native dropdown.
- **Notifications**: MUST use variant class (`notification--info/success/warning/error`), three sections (`notification__icon`, `notification__content`, `notification__close`), semantic SVG icons
- **Popover**: MUST use `popover__trigger` wrapper, placement class (`popover--top/bottom/left/right`), `popover__content` + `popover__arrow` required. **PLACEMENT RULES**: Choose initial class based on trigger position — top of page→`popover--bottom`, bottom→`popover--top`, right edge→`popover--left`, left edge→`popover--right`, center→`popover--bottom` (default). MDS JS auto-flips at runtime if viewport space is insufficient. Table row actions (right-aligned)→`popover--left`, header/toolbar→`popover--bottom`, footer→`popover--top`
- **Plugin components**: Any plugin component with a METADATA header follows the same strict-structure rules — read its METADATA before using

**WORKFLOW FOR COMPLEX COMPONENTS**:
1. Read component file's METADATA header (MDS or plugin — both use the same format)
2. Copy ENTIRE component structure (including all wrapper divs, semantic HTML, ARIA attributes)
3. Only modify: content/text, data attributes for dynamic behavior, IDs for JavaScript hooks
4. Never modify: class names, HTML structure, wrapper elements, semantic tags
5. If component has JavaScript integration notes in METADATA, follow them exactly

**Foundation Files** (design tokens reference):
- `foundation-colors.md`: Color palette, CSS variables, semantic colors
- `foundation-typography.md`: Font scales, weights, responsive sizes
- `foundation-spacing.md`: Spacing scale, layout patterns

Available component files (22 total):
- Forms: `forms-input.html`, `forms-select.html`, `forms-textarea.html`, `forms-checkbox.html`, `forms-radio.html`, `forms-switch.html`
- Buttons: `buttons.html`
- Data: `tables.html`, `pagination.html`, `tags.html`, `avatars.html`, `cards.html`, `empty-state.html`
- Navigation: `tabs.html`, `navigation.html`, `breadcrumb.html`, `links.html`
- Feedback: `notifications.html`, `loaders.html`
- Overlays: `modal.html`, `drawer.html`, `popover.html`

When user requests these components, use MDS automatically. Only ask about content/data, not component choice.

**MANDATORY REUSE POLICY**:
- ✅ ALWAYS check MDS component files AND plugin components (`plugins/`) BEFORE writing custom CSS for any UI pattern
- ✅ If an MDS or plugin component exists for the pattern, use it EXACTLY as documented — including class names, HTML structure, and built-in states (e.g., `--open`, `--active`, `--disabled`)
- ✅ If an MDS component almost fits but needs modification, STOP and propose the enhancement to the user before implementing a custom alternative
- ✅ If neither MDS nor plugins have the component and the pattern will be reused across prototypes, offer to create it as a plugin component
- ❌ NEVER create custom CSS that duplicates MDS or plugin component functionality (popovers, modals, dropdowns, tooltips, badges, etc.)
- ❌ NEVER work around MDS default states (e.g., `display: none`) by building parallel components — instead, toggle the MDS state class (e.g., add `popover--open`)
- ⚠️ When tempted to write custom styles for: overlays, floating panels, arrows/tooltips, form controls, navigation patterns — CHECK MDS FIRST, THEN PLUGINS
- ⚠️ If you bypass an MDS or plugin component, document WHY in a code comment and flag it to the user

---

## COMPONENT VARIANTS & CLARIFICATION

**METADATA IN COMPONENT FILES**:
Each component file (MDS or plugin) includes a METADATA header with: available variants, sizes, states, when to ask for clarification, naming conventions, and suggested prompt options.

**WHEN TO ASK FOR VARIANTS**:
When user requests a component but doesn't specify variant/size AND context doesn't make it clear:
1. Read the component file's METADATA header (MDS or plugin)
2. Check "When to prompt" field
3. If clarification is needed, ask the user with 2-4 specific options from the metadata

**WHEN NOT TO ASK**:
- ✅ Context makes it obvious (check "Conventions" in metadata)
- ✅ User explicitly specified variant/size
- ✅ Standard convention applies (e.g., delete = danger)
- ✅ Only one logical choice exists

**EXAMPLE**:
- User: "Add a button" → Read `buttons.html` METADATA → Ask: "What button style? Primary / Secondary / Danger / Ghost"
- User: "Add a delete button" → Read METADATA → See "delete = danger" convention → Don't ask, use danger variant

---

## PLUGINS (Custom Components)

Project-specific reusable components at `plugins/` (workspace root). These supplement MDS — they do NOT override or replace MDS components. Auto-loaded by the canvas framework alongside MDS (no per-prototype configuration needed).

**Structure** (`plugins/`):
- `_component-index.md` — Component registry (pure table, no instructions)
- `plugins.css` — CSS entry point, `@import`s all plugin component CSS files (auto-loaded by canvas)
- `plugins.js` — JS entry point, aggregates all plugin component behaviors (auto-loaded by canvas)
- Component HTML files — Same METADATA format as MDS components
- Optional companion CSS files — Registered via `@import` in `plugins.css`
- Optional companion JS files — Registered via init call in `plugins.js`

**Framework docs** (`assets/plugins/`):
- `CREATING-COMPONENTS.md` — Full guide for creating plugin components (updatable by framework)
- Seed files — Empty templates used for first-install seeding of `plugins/`

**Lookup order when building prototypes**:
1. **MDS first** — `monalisa-design-system/components/_component-index.md`
2. **Plugins second** — `plugins/_component-index.md`
3. **Custom code last** — Only if neither MDS nor plugins have the component

**Key rules**:
- ✅ Plugin components use MDS design tokens for visual consistency
- ✅ All plugin files use a project prefix (default: `proj-`) to avoid MDS collisions
- ✅ Plugin CSS/JS are auto-loaded via `plugins.css` and `plugins.js` entry files
- ✅ METADATA headers follow the exact same format as MDS components
- ✅ Same copy-paste discipline: copy EXACT HTML from plugin file, only change content/text
- ❌ NEVER create a plugin that duplicates existing MDS functionality
- ❌ NEVER modify MDS files — extend via plugins instead

**Naming convention**: `proj-component-name.html` (+ `.css`, `.js`)
**Path from prototypes**: `../../plugins/` (workspace root, auto-loaded by canvas)

---

## CREATING PLUGIN COMPONENTS

When a designer asks to create a reusable component or when a reusable pattern is identified:

**Prerequisites**:
1. Confirm MDS does NOT already provide the component
2. Read `assets/plugins/CREATING-COMPONENTS.md` for the full template and rules

**Workflow**:
1. Read `assets/plugins/CREATING-COMPONENTS.md`
2. Create `plugins/proj-[name].html` with complete METADATA header
3. Create `plugins/proj-[name].css` if the component needs custom styles
4. Create `plugins/proj-[name].js` if the component needs behavior
5. Register CSS: add `@import url('proj-[name].css');` to `plugins/plugins.css`
6. Register JS: add init call to `plugins/plugins.js`
7. Update `plugins/_component-index.md` with new entry

**CSS rules for plugins**:
- MUST use MDS design tokens (`var(--space-*)`, `var(--color-*)`, `var(--font-*)`)
- MUST prefix all class names with component name (e.g., `.proj-stat-card__title`)
- MUST NOT override MDS styles or include `@media` queries

**JS rules for plugins**:
- MUST use IIFE pattern
- MUST expose module on `window` (e.g., `window.ProjStatCard = { init: ... }`)
- MUST NOT listen for `davinci:canvas:ready` — `plugins.js` handles init timing

---

## ICONS & ASSETS (SF SYMBOLS)

Icons render via the `<sf-symbol>` web component, **auto-loaded by the canvas**. No script tags, no asset paths, no CSS filter tricks. Symbols behave like text — they inherit `color` and scale with `font-size`.

```html
<sf-symbol name="heart"></sf-symbol>
```

**FINDING SYMBOL NAMES**:
Designers know symbol names from the official **SF Symbols macOS app**. Names use **dots**: `heart.circle.fill`, `person.crop.circle.badge.checkmark`. Never grep `assets/icons/regular/` for new code — that directory is legacy.

**ICON USAGE WORKFLOW**:
1. Get the symbol name from the SF Symbols app (or ask the designer if unsure)
2. Drop in `<sf-symbol name="symbol.name"></sf-symbol>`
3. Size by setting `font-size` on the parent (12-28px)
4. Color by setting `color` on the parent using MDS tokens
5. Optionally set `weight="..."` to match surrounding text weight

**SIZING RULES** (set `font-size` on the parent, never width/height on `<sf-symbol>`):
- Inline with labels: 12-16px
- Control icons (buttons, tabs): 16-20px
- Standalone contextual icon: 20-28px max
- ❌ NEVER use SF Symbol icons larger than 28px
- Hero element is always a number or text, never an icon

**ICON COLOR HIERARCHY** (set `color` on the parent using MDS tokens):
- **Accent (`var(--color-base-accent)`)**: Only when icon IS the primary action or IS the data. Max one per view.
- **Default (`var(--color-glyph-gray)`)**: Standard labels, control text
- **Secondary (`var(--color-glyph-gray-secondary)`)**: Navigation, metadata markers
- **Tertiary (`var(--color-glyph-gray-tertiary)`)**: Supplementary, inactive status
- Icons on colored backgrounds: `#fff` at 100% opacity (primary) or 60% (secondary)
- ❌ Icons in accent color count toward the one-accent-per-view limit

**RENDERING MODES** (default `monochrome`):
- `monochrome` — single color from parent `color` (the default; use this for almost all UI icons)
- `hierarchical` — one color, layered opacity (for layered symbols)
- `palette` — 2-3 colors via `--s-primary`, `--s-secondary`, `--s-tertiary` (use MDS tokens)
- `multicolor` — Apple's intrinsic colors (e.g. `trash.slash` is red) — use sparingly

**WEIGHT & SCALE** (optional):
- `weight="ultralight|thin|light|regular|medium|semibold|bold|heavy|black"` — match surrounding text weight (default `regular`)
- `scale="small|medium|large"` — adjust emphasis without changing `font-size` (default `medium`)

**MAGIC REPLACE** — animate transitions between two related symbols:
```html
<sf-replace class="repeat when-hover">
  <sf-symbol name="play.circle.fill"></sf-symbol>
  <sf-symbol name="pause.circle.fill"></sf-symbol>
</sf-replace>
```
Use for play/pause, mute/unmute, checkmark/xmark, bell/bell.slash.

**NAMING VARIANTS**:
- Base: `heart`, `bell`, `wifi`
- Filled (selected/active): `heart.fill`, `bell.fill`
- In circle: `heart.circle`, `heart.circle.fill`
- In square: `heart.square`, `heart.square.fill`
- Slashed (disabled/off): `bell.slash`, `wifi.slash`
- Badge: `bell.badge`, `app.badge.checkmark`

**LEGACY SVG ICONS (existing prototypes only)**:
The directory `assets/icons/regular/` (4,414 SVGs) and the `<img src="../../assets/icons/regular/NAME.svg">` pattern still work — **do not break existing prototypes that use them**. This directory will be removed in a future major version once all prototypes are migrated. For ALL new code, use `<sf-symbol>`.

**ANTI-PATTERNS**:
- ❌ `<sf-symbol width="16" height="16">` — use parent `font-size` instead
- ❌ Loading the SF Symbols script manually in a prototype — canvas already auto-loads it
- ❌ `<sf-symbol>...</sf-symbol>Label` — **always put a space between icon and text** (literal whitespace, or `gap` on a flex parent)
- See `PITFALLS.md` for icon-color and legacy-SVG anti-patterns.

---

## FILE WRITE OPERATIONS

**WRITE FILES IN ORDER**:
When creating or modifying prototypes, write files in this logical sequence:
1. `index.html` (structure first)
2. CSS files (`styles.css` or `css/main.css` then feature files)
3. JS files (feature modules first, then `main.js`)
4. `PROTOTYPE.md` (new prototypes: create; modifications: see workflow step 5)
5. `canvas-navigation-data.json` (navigation entry)

Per Efficiency Baseline #10 (communication budget), do NOT confirm after each file. Report once at the end of the task.

**For complex prototypes** (multiple JS/CSS modules), write all files without per-file confirmations.

---

## WORKFLOW

**NEW PROTOTYPES**:
1. Read references (per Efficiency Baseline #1 — fires only on first task / new components)
2. **NAVIGATION DATA SETUP**:
   - **FIRST PROTOTYPE ONLY**: Check if `canvas-navigation-data.json` exists in workspace root
     * If NOT exists: Copy `assets/canvas/canvas-navigation-data.json` to workspace root
     * Clean up the copied file: Remove all items from `mainNavigation` array (make it empty: `"mainNavigation": []`)
     * ✅ NEVER recreate if file already exists (preserves user customizations)
   - **EVERY PROTOTYPE** (including first): Add navigation entry to workspace root `canvas-navigation-data.json`:
     ```json
     {
       "label": "Prototype Name",
       "url": "prototypes/prototype-name",
       "subHeader": "Optional Subheader Text or Object",
       "hifiPrototypes": {}
     }
     ```
   - **SUBHEADER OPTIONS**:
     1. Simple string (default): `"subHeader": "Page Title"`
     2. Hide subheader: `"subHeader": null`
     3. Custom HTML (when designer requests controls/buttons/dropdowns in subheader):
        ```json
        "subHeader": {
          "htmlContent": "<h2 class=\"sub-header__subtitle\">Title</h2><div class=\"sub-header__controls\"><button class=\"btn btn--primary\">Action</button></div>"
        }
        ```
   - **CUSTOM HTML STRUCTURE**:
     - Always include: `<h2 class="sub-header__subtitle">Title</h2>`
     - Wrap controls in: `<div class="sub-header__controls">...</div>`
     - Use MDS components; escape quotes with `\"`; keep compact (single line, no line breaks)
   - Reference: `assets/canvas/SUBHEADER-CUSTOM-HTML.md` and `assets/canvas/SUBHEADER-EXAMPLES.json`
3. Copy `index.html` structure from `assets/canvas/reference-prototype/index.html`
4. **Create CSS**: `css/main.css` (entry point) + one `css/<feature>.css` per feature. Plus `maps/css/main.md` and `maps/css/<feature>.md` for each.
5. **Create JS**: `js/main.js` (entry point with event-based init) + one `js/<feature>.js` per feature. Plus `maps/js/main.md` and `maps/js/<feature>.md` for each.
6. Create `maps/html/index.md` (and one map per additional HTML file).
7. Create `PROTOTYPE.md` as the router (batched at end per Baseline #9): META + Purpose + Module map (table) + Integration points + Not implemented.

**MODIFYING EXISTING PROTOTYPES**:
1. Read `PROTOTYPE.md` first
2. **Detect architecture**: does `prototypes/<name>/maps/` exist?
   - **Yes (full map architecture)** → read only the maps relevant to the requested change (per the router's module map), then read those source files. Edit source + sibling map in the same change.
   - **No (legacy or partially-mapped)** → read `PROTOTYPE.md` (monolithic) for context. Then proceed per the rules below.
3. **AUTO-MIGRATE MAPS for any already-modular code** (zero-risk, applies on ANY touch):
   - If `js/` folder exists but `maps/js/` is missing or incomplete → create the missing `maps/js/<name>.md` files (one per `js/<name>.js`)
   - If `css/` folder exists but `maps/css/` is missing or incomplete → create the missing `maps/css/<name>.md` files
   - For every HTML file at prototype root → ensure `maps/html/<name>.md` exists; create if missing
   - Once `maps/` exists at all, rewrite `PROTOTYPE.md` as the router (see PROTOTYPE.md description). If pre-modular files (`script.js`, `styles.css`) still exist, list them in the router with a `[LEGACY]` tag — they migrate later.
4. **OPPORTUNISTIC SPLIT for pre-modular code** (`script.js` / `styles.css` at root):
   - Trivial changes (color, copy, single-line tweak) → make the change in place. Do NOT force the split.
   - Structural changes (file added/removed/renamed, threshold hit, capability shift, integration change) → split the legacy file into `js/<feature>.js` (or `css/<feature>.css`), create the corresponding maps, delete the legacy file, update HTML refs.
   - Designer can always explicitly request migration ("migrate `prototypes/intro/` to maps") — comply without requiring a structural trigger.
5. ⚠️ Mixed legacy + modular state (`script.js` AND `js/` both present) is forbidden — clean up regardless of architecture choice.
5. ⚠️ **MAP / DOC SYNC CHECK** — at the END of the task (per Baseline #9), state your decision once. The rule depends on which architecture the prototype uses (detect by checking whether `prototypes/<name>/maps/` exists).

   **Map architecture (prototype has `maps/`)**:

   - **Inner maps** (mechanical, always update):
     * For every `js/*.js`, `css/*.css`, or `*.html` you modified, update the corresponding `maps/<area>/<name>.md` in the same change.
     * List every map file touched: `Maps updated: maps/js/filters.md, maps/css/filters.md`

   - **Router (`PROTOTYPE.md`)** — update only when:
     1. Files added under `js/`, `css/`, or HTML at prototype root → new module-map row
     2. Files removed → row removed
     3. Files renamed → row paths updated
     4. A module's one-line purpose changed meaningfully (capability shift, not internal refactor)
     5. Integration points changed (new canvas event listened/emitted, new global MDS/plugin dep, new navigation entry)
     6. META changed (new top-level dependency)

     ✅ **Skip router update** for: internal logic changes, line-range refreshes in inner maps, BEM additions, color tweaks, copy changes, bug fixes preserving behavior.

     Verbalize:
     ```
     Maps updated: <list>
     PROTOTYPE.md: Updated — <what changed>   |OR|   PROTOTYPE.md: No update needed — <reason>
     ```

   **Legacy architecture (prototype has NO `maps/`)**:

   - If the change is **structural** (file added/removed/renamed, modular migration triggered, capability shift, integration change): you should have migrated to the map architecture as part of this turn — see LEGACY PROTOTYPE HANDLING in the JS/CSS ARCHITECTURE sections. After migration, use the map-architecture verbalization above.
   - If the change is **trivial** (color, copy, single-line tweak): the change happens in place, no migration. Apply the legacy trigger checklist:
     * ⚠️ **MUST update PROTOTYPE.md** when ANY of: added/removed/renamed UI components, changed data structures, added/removed/renamed JS/CSS modules, changed state management, added/removed features, changed file structure
     * ✅ **Skip update** when ALL changes are limited to: text/label/placeholder, color/spacing/visual, behavior-preserving bug fixes, reordering elements, style-only adjustments
     * Verbalize: `PROTOTYPE.md: Updated — <what changed>` OR `PROTOTYPE.md: No update needed — <reason>`

   **"Purpose change" disambiguation** (applies in both architectures): a module's purpose changed if its one-line description in the router/doc would no longer accurately describe what the file does. Examples that change purpose: adding multi-select to a single-select filter, adding inline editing to a read-only table, switching a modal from create-only to create-or-edit. Examples that DON'T: bug fixes, refactoring internals, renaming variables, adding error handling, performance optimization.

   ⚠️ When in doubt, update — a slightly over-documented prototype is better than a stale one.

**File Structure (NEW PROTOTYPES — map architecture)**:
```
prototypes/[name]/
├── PROTOTYPE.md              # MANDATORY — router (table + META + integration points)
├── changelog.json            # optional
├── index.html
├── (additional .html files)
├── js/
│   ├── main.js               # entry point
│   └── <feature>.js          # one per feature
├── css/
│   ├── main.css
│   └── <feature>.css
└── maps/
    ├── html/
    │   ├── index.md          # one .md per HTML file
    │   └── <name>.md
    ├── js/
    │   ├── main.md           # one .md per JS file
    │   └── <feature>.md
    └── css/
        ├── main.md           # one .md per CSS file
        └── <feature>.md
```

**File Structure (Legacy — still supported, migrates opportunistically)**:
```
prototypes/[name]/
├── index.html
├── styles.css                # OR css/ folder without maps/
├── script.js                 # OR js/ folder without maps/
└── PROTOTYPE.md              # monolithic (single file with all sections)
```

Legacy prototypes keep working. Trivial changes happen in place. Migration to the map architecture is automatic when a structural change is requested (file added/removed/renamed, modular threshold hit, capability shift, integration change). See LEGACY PROTOTYPE HANDLING in the JS/CSS ARCHITECTURE sections.

**PROTOTYPE.md is the router** (in the map architecture) — small, stable, the entry point Claude reads first. Sections:
- **META** — paths, dependencies, canvas integration notes
- **Purpose** — one paragraph describing the prototype's intent
- **Module map** — table with columns: Feature | Code | Map | Purpose (one line per row)
- **Integration points** — canvas events listened/emitted, MDS/plugin loading, navigation entries, external integrations
- **Not implemented** — placeholders + roadmap

**Map files** under `maps/<area>/<name>.md` carry the deep context. Templates:

- **`maps/js/<name>.md`**: Purpose / Public surface (`window.*` exports) / State (module-level vars) / Data flow / Key sections (line ranges, e.g. `init: L12-L40`) / Gotchas
- **`maps/css/<name>.md`**: Purpose / BEM blocks defined / External selectors styled / Key sections (line ranges) / Gotchas (z-index, dark-mode, overrides)
- **`maps/html/<name>.md`**: Purpose / Page regions (line ranges) / MDS+plugin components used / Dynamic content (which JS populates which elements) / Gotchas (script ordering, page-content placement)

**For LEGACY prototypes that haven't migrated yet**, `PROTOTYPE.md` is monolithic — single file documenting: META (paths, dependencies, JS modules), PURPOSE, UI COMPONENTS, DATA STRUCTURE, STATE MANAGEMENT, KEY FEATURES, CUSTOM CSS PATTERNS, JAVASCRIPT PATTERNS, INTEGRATION POINTS, EDGE CASES HANDLED, NOT IMPLEMENTED, PERFORMANCE NOTES, TESTING SCENARIOS, AI ANALYSIS SHORTCUTS (file paths + line numbers).

⚠️ **One top-level doc per prototype.** `PROTOTYPE.md` is the only `.md` at prototype root (alongside optional `changelog.json`). In the map architecture, all other docs live exclusively under `maps/`. Free-form parallel docs (`MODULAR-BREAKDOWN.md`, `ARCHITECTURE.md`, `NOTES.md`, `CHANGES.md`) are forbidden in BOTH architectures — they fragment context and reintroduce drift. If `PROTOTYPE.md` becomes stale during a structural refactor, REWRITE it in the same change. Never create a new doc alongside it.

Reference (canonical example):
- `assets/canvas/reference-prototype/` — copy-source template for new prototypes. Demonstrates the full map architecture (router `PROTOTYPE.md` + `js/` + `css/` + `maps/` tree).

---

## CHANGELOG GENERATION (DESIGNER-TRIGGERED ONLY)

- ⚠️ **ONLY when designer explicitly requests it** — do NOT auto-generate for every task
- Appropriate for: major features, significant layout changes, new functionality, important fixes
- NOT for: minor tweaks, button repositioning, color adjustments, small text changes

**File location**: `prototypes/[name]/changelog.json`
**Reference**: `changelog.json.example`

**Format**:
```json
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "changes": [
        { "type": "added", "description": "User management dashboard with role-based access" },
        { "type": "changed", "description": "Redesigned navigation menu" },
        { "type": "fixed", "description": "Form validation error messages" }
      ]
    }
  ]
}
```

**Change types**: `added`, `changed`, `fixed`, `removed`, `deprecated`

**Writing guidelines**:
- ✅ Concise and feature-focused; clear, actionable language; group by date
- ❌ No trivial changes, no technical implementation details, no version numbers

---

## ON-DEMAND REFERENCES

Four companion files ship next to this CLAUDE.md (see Efficiency Baseline #11 for read triggers):

- `HEURISTICS.md` — Nielsen's 10 heuristics with DaVinci-specific prescriptions. **Read before any prototype design decision.**
- `PITFALLS.md` — Common anti-patterns and their fixes. Read before writing in a known-fragile area.
- `TROUBLESHOOTING.md` — Symptom → cause map. Read when designer reports an error.
- `CHECKLIST.md` — Per-category verification list. Read before declaring a task complete.

---

## OFFLINE DISTRIBUTION

When user asks to make prototype shareable/offline, run:
```bash
./assets/add-offline-templates.sh <prototype-name>
# Or package all prototypes at once:
./assets/add-offline-templates.sh all
```

Creates `offline/` directory with shared assets (canvas, MDS, plugins, icons) and per-prototype folders. Each prototype's `index.html` gets embedded canvas templates for offline use. Original files unchanged. Re-run after updates.

Distribution: zip the `offline/` folder and share — recipients open any `index.html` directly in a browser.
