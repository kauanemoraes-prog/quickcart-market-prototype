# Programs Prototype

## META
- **Path**: `prototypes/programs/`
- **Pages**: `index.html` (listing), `program-detail.html` (detail)
- **Stylesheets**:
  - Listing: `styles.css` + `dark-mode.css` (sibling files, dark-mode linked last)
  - Detail: `css/main.css` (entry, `@import`s 30 feature stylesheets; the four `dark-mode*.css` files are imported last so they override `base.css` `!important`s for `.content` and `.program-detail-page`). All feature stylesheets are kept under the 300-line CLAUDE.md threshold via per-feature splits.
- **JS**: `js/` modular architecture — see [Module Reference](#module-reference)
- **Dependencies**: DaVinci Canvas, Monalisa Design System, Handlebars, plugins (`proj-dark-mode`, `proj-timeline`, `proj-right-toolbar`, `proj-nested-table`, `proj-progress-drawer`, `proj-station-settings-drawer`)
- **Navigation entry**: `canvas-navigation-data.json` — "Programs" tab in `mainNavigation`

## PURPOSE
Two-page programs management surface:
- **Listing** (`index.html`) — sortable table of 20 programs, each row expands to a nested sites table, with favorites + search + favorites-only filter.
- **Detail** (`program-detail.html`) — per-program view with build-stage timeline, program/site dropdowns, and 5 tabs: Process Flow (lines table, grouped or flat), Equipment List (with comparison view), Consumables, PCN, plus modals/drawers for create/edit flows.

## UI COMPONENTS

### MDS
Tables, table-container, sortable headers, pagination, tabs, modal, drawer, popover, form-input / form-select / form-switch, buttons, tags, notifications, avatars, icons via `<sf-symbol>`.

### Plugins
- `proj-timeline` — build-stage timeline on detail page
- `proj-right-toolbar` — dark-mode + utility toolbar on detail page
- `proj-nested-table` — two-level nested table used by Lines tab
- `proj-progress-drawer` — bottom-anchored progress drawer used by the MP target Assign flow
- `proj-station-settings-drawer` — right-side "Update Station" drawer opened from the L2 Settings link and from the AFMD blocked modal
- `proj-dark-mode` — global dark-mode toggle (canvas-wide)

## DATA STRUCTURE

### Programs (listing + detail dropdown)
```js
{
  code: 'N50',           // unique program code
  name: string,
  admin: string,
  lastUpdate: 'DD MMM YYYY',
  favorite: boolean,
  sites: [{ site, alias, builds, lastUpdate, favorite }]
}
```
Source: [js/data.js](js/data.js) — `window.ProgramsData = { getAll(), findByCode(code) }`

### Detail page (build stages, lines, equipment, consumables)
Exposed via [js/detail-data.js](js/detail-data.js) — `window.DetailData = { getBuildStages(), getLines(), getEquipment(), getConsumables() }`.

### PCN
Mock data extracted to [js/pcn-data.js](js/pcn-data.js) — `window.PcnData = { getAll() }` returns 25 records. `PCNTable` re-exposes the array as `window.PCNTable.pcnData` for the split modules.

## STATE MANAGEMENT
| State | Owner | Notes |
|---|---|---|
| Sort column / direction | `TableSort` (listing) | Re-renders table, re-attaches button handlers |
| Search text + favorites-only | `ProgramsSearch` | Calls `TableRenderer.render(predicate)` |
| Current program / site | `Dropdowns` | URL `?code=N50` seeds initial program |
| Current build stage | `BuildStages` | Default `P2`. The visible timeline is rendered by `ProjTimeline`; clicking a milestone fires the plugin's `onSelect` callback (wired in `detail-main.js`), which updates `BuildStages.currentBuild` and re-renders Process Flow (PF1+PF2), Equipment List, Consumables, and PCN — `MP` empties all four (headers only); other stages restore data. |
| MP mirror target | `BuildStages.mpTarget` | Build stage id (e.g. `'P2'`) selected by an admin via any MP empty state, or `null` while unassigned. `null` ⇒ page root carries `program-detail-page--mp-no-target` while MP is active, swapping the panel content of Process Flow (PF1+PF2), Equipment List, and Consumables for the target-selector empty state. Reset to `null` whenever the program is changed via the Program dropdown. |
| Line grouping (PF2) + dropdown caches | `LinesTable` | `groupState` / `stationState` keyed by id |
| AFMD sync status + selection | `AfmdSync` | `stationStates[stationId]` (mutable in-memory, seeded lazily via hash of stationId). Selection lives on the L2 row's `.afmd-row--selected` class — set via Shift + click on the row. Per L2 sub-table scope. |
| Tab + sub-tab selection | `Tabs`, `EquipmentTabMenu` | Toggles `--active` classes |
| Dark mode | `proj-dark-mode` plugin | `localStorage` key `davinci:dark-mode`, restored via inline `<head>` script before paint |
| Favorites | per-row in `programsData` | Persists across sort/search within session |

## KEY FEATURES

### Listing page (`index.html`)
- Handlebars-rendered table (20 programs, nested `{{#each}}` over sites) — template at [index.html:192](index.html#L192)
- Sortable headers (`code`, `name`, `admin`, `lastUpdate`) via `TableSort`
- Expandable rows with chevron + nested sites table (column alignment via width %s)
- Two-level favorites (parent program + child site)
- Search input + favorites-only switch (combined AND filter) via `ProgramsSearch`
- "Add Program" split-button dropdown (`ProgramAddMenu`) with two options: **From scratch** opens the existing drawer (Sites / Program Users / PCN Settings tabs via `Drawer`), **From existing** opens the 7-step wizard modal (`ProgramWizard`) — only step 1 (New Program) is designed; Next is disabled
- Sticky page header + sticky table header (z-index 100 / 99)

### Detail page (`program-detail.html`)
- Program + site dropdowns; URL param `?code=N50` seeds initial program (`Dropdowns`)
- Build-stage timeline via `proj-timeline` plugin (`BuildStages` provides data)
- Right toolbar via `proj-right-toolbar` (dark-mode toggle + utilities)
- **Process Flow tab** — `LinesTable` renders flat list (tab 1) or grouped list (tab 2) via `proj-nested-table`. Group headers carry drag handle, expand chevron, "Group: [name]" label, and a Line type dropdown that collapses/expands all L1 rows in that group. Changing a line's `lineGrouping` dropdown triggers `refreshGroupedTable(targetGroupId)` and shows an MDS success notification. Lines are also **drag-and-drop reorderable** via the row's hover drag handle: reorder freely within PF1 (flat), or reorder within/across groups in PF2 — dropping onto a row in a different group also reassigns the dragged line's `lineGrouping` to match the target's group and fires the same success notification. Group headers themselves stay in the fixed `GROUP_ORDER` and are not draggable. **Build-level eligibility tag** (`#afmd-eligibility-tag`) sits next to the `V1 - Draft` tag in the page header. Mocked to `ready` (green `checkmark.circle.fill` + "AFMD connected") — real behavior would flip to `unavailable` when the Tier 1 checks fail (project doesn't exist in AFMD, site not configured, or AFMD not reachable), disabling every sync CTA on the page. Not wired to any real check yet.

**AFMD Sync column** (`AfmdSync`) sits between Process Category and Target UPH on L1 (shows aggregate: `All synced` / `N of Y synced` / `N out of sync` / `None synced` / `Attention`) and between Station info and UPH on L2 (per-station 6-state badge + inline CTA). **Multi-select via Shift + click** on any part of an L2 station row (except interactive elements — dropdowns, inputs, CTA button, links). Selecting 1+ stations reveals a per-line actions-bar row between the L2 header and body — `N stations selected: [Sync selected]` — which opens a confirmation modal listing derived AFMD names (1:N). Out-of-sync stations route to a right-side diff drawer with per-field Push / Pull direction (Reporting Method flagged as locked). Bulk execution feedback via the shared `ProjProgressDrawer` plugin (bottom-anchored, full-width progress bar with rotating step labels). **H88-only bulk-sync via checkboxes** — when the URL is `?code=H88`, the page root carries `.program-detail-page--h88` and each L1/L2 row exposes a leading checkbox (hidden by CSS on other programs). L2 checkbox toggles `.afmd-row--selected` on the row (same write path as Shift+click, coexists). L1 checkbox = "select all stations in this line" (auto-expands the line if collapsed, applies to freshly-rendered L2s via `wireDetailRow`); L1 shows checked / unchecked / indeterminate based on its children's mix. Shift+click still mirrors into the L2 checkbox so both affordances stay in sync.
- **Equipment List tab** — `EquipmentTable` (52 columns, many placeholder); presets (`EquipmentPreset`), restore menu (`EquipRestoreMenu`), settings drawer (`EquipmentSettingsDrawer`), tab menu (`EquipmentTabMenu`), comparison view (`EquipmentComparison`)
- **Consumables tab** — `ConsumablesTable` + view drawer (`ConsumablesViewDrawer`)
- **PCN tab** — `PCNTable` (25 records, filters, sort, row kebab actions)
- Modals: file upload, publish wizard, import — opened from toolbar/tab actions
- Column resizing on `.table--pcn`, `.table--consumables`, `.table--equip-compare`, `.table--lines` via `ColumnResizer`

### Module Reference

| Module | Lines | Exports | Used on | Purpose |
|---|---|---|---|---|
| [js/data.js](js/data.js) | 247 | `ProgramsData` | both | 20 programs + nested sites; `getAll`, `findByCode` |
| [js/detail-data.js](js/detail-data.js) | 108 | `DetailData` | detail | Build stages, lines, equipment, consumables |
| [js/main.js](js/main.js) | 61 | — (entry) | listing | `safeInit` on `davinci:canvas:ready`; calls all listing modules |
| [js/detail-main.js](js/detail-main.js) | 131 | — (entry) | detail | Same pattern; guards every detail-module init with `if (window.X)` |
| [js/table-renderer.js](js/table-renderer.js) | 26 | `TableRenderer` | listing | `render(predicate?)` — Handlebars compile + inject |
| [js/table-sort.js](js/table-sort.js) | 72 | `TableSort` | listing | Sort handlers; re-renders + re-attaches button listeners after sort |
| [js/row-expander.js](js/row-expander.js) | 41 | `RowExpander` | listing | Chevron expand/collapse, parent row highlight |
| [js/favorites.js](js/favorites.js) | 57 | `Favorites` | listing | Two-level favorites; site id format `N50-Site A` |
| [js/action-buttons.js](js/action-buttons.js) | 25 | `ActionButtons` | listing | Gear button placeholder (`console.log`) |
| [js/drawer.js](js/drawer.js) | 75 | `Drawer` | listing | Add-program drawer + inner tabs |
| [js/program-add-menu.js](js/program-add-menu.js) | — | `ProgramAddMenu` | listing | Wires the split-button popover menu ("From scratch" → drawer, "From existing" → wizard) |
| [js/program-wizard.js](js/program-wizard.js) | — | `ProgramWizard` | listing | "Add Program from existing" 7-step wizard modal (step 1 designed; open/close/Escape/backdrop) |
| [js/programs-search.js](js/programs-search.js) | 61 | `ProgramsSearch` | listing | Search input + favorites-only filter (combined AND) |
| [js/dropdowns.js](js/dropdowns.js) | 115 | `Dropdowns` | detail | Program + site selects; URL `?code=` param |
| [js/build-stages.js](js/build-stages.js) | 84 | `BuildStages` | detail | Holds `currentBuild` (default `P2`) consulted by table render paths to gate the MP empty-body state; the visible timeline is rendered by `ProjTimeline` and updates `currentBuild` via the plugin's `onSelect` callback wired in [detail-main.js](js/detail-main.js) |
| [js/tabs.js](js/tabs.js) | 45 | `Tabs` | detail | Top-level tab switching |
| [js/lines-table.js](js/lines-table.js) | 854 | `LinesTable` | detail | Lines render (flat/grouped), group move + notification, row drag-and-drop reorder (PF1 free, PF2 within/across groups with auto grouping reassignment). Also binds the L2 **"Settings"** action link (per-station row) to `ProjStationSettingsDrawer.open()`, passing the station's id + name + parent line id |
| [js/afmd-sync.js](js/afmd-sync.js) | ~520 | `AfmdSync` | detail | AFMD Sync per-station status on the Process Flow tab. Paints L1 aggregate badge + L2 per-station 6-state badge (Not synced / In sync / Out of sync / AFMD archived / AFMD deleted / AFMD unavailable). Inline CTA per L2 row: `Sync now` (Not synced) / `Review sync` (Out of sync) / `Retry` (Unavailable). **Multi-select via Shift + click** on any L2 station row (guarded against interactive elements). Selection is per L2 sub-table — an actions-bar row between the L2 thead and body shows `N stations selected: [Sync selected]` while 1+ stations are highlighted. Confirmation modal (`#afmd-confirm-modal`) lists derived AFMD records (1:N — one Apple Core station → N records per vendor, plus a Pallet record; every record name is UPPERCASED as `NOME_DA_STATION_VENDOR`) — auto-generated deterministically from `stationId` hash. When the selection spans mixed eligibility categories (syncable / review / skipped), a summary block explains the breakdown at the top of the modal body. Out-of-sync stations route to a **Review modal** (`#afmd-review-modal` — same MDS modal shell as the confirmation) with per-field Push/Pull direction picker and a plain-language note about Reporting Method being AFMD-managed post-sync. **Duplicate-station-name guard** (`hasDuplicateNameInLine`): clicking `Not synced` on a station whose name matches another station in the same line opens the modal in `blocked` mode instead — a short block message + a `Station Settings` link in the footer that opens `ProjStationSettingsDrawer` (via `window.ProjStationSettingsDrawer.open`) seeded with the offending station. Bulk selections still fall through; the blocked station surfaces as a failure in the results modal via `syncErrorFor`. Demo seeding: `st-3-2` = In sync, `st-3-3` = Not synced (both named "RF Calibration" in the Testing line). **Listens for `davinci:station-settings:save`** dispatched by the drawer plugin — mutates the station's name in `DetailData.getLines()` (same object reference) and updates the visible `.l2__station-name` text so the duplicate guard clears without a full LinesTable re-render. Bulk execution feedback uses the shared `ProjProgressDrawer` plugin (bottom-anchored, full-width): spinner + `Syncing N stations with AFMD…` message + station names as rotating step labels + progress bar. On complete, all synced stations flip to IN_SYNC and a top-right success notification fires. Reporting Method dropdown on L2 becomes read-only + shows an info icon tooltip once the station reaches IN_SYNC. Wraps `LinesTable.render` to auto-repaint after every re-render + observes `#lines-table-body` mutations to paint and wire newly-expanded L2 sub-tables. `window.AfmdSync = { init, repaint, getState, setState, STATES }` |
| [js/pf-filter.js](js/pf-filter.js) | — | `PFFilter` | detail | Process Flow filter (replaces the old `search-bar`). Two-level dropdown panel: main view lists filterable fields grouped by category (Line, Station, Operation, Equipment, Consumable, Specification); parent tags open a sub-view with Contains / Without + option list. Selecting an option renders a chip inside the input (`Category Field` on line 1 + `= Value` in accent on line 2). **Options popover (⋯ button)** with three groups persisted in `localStorage`: Behavior (`filter` hides non-matching rows / `search` highlights matching cells in yellow), Order (`alpha` A→Z or `smart` bubbles up tags whose label matches the typed keyword), Favorites (show/hide the section). **Favorites section** at the top of the main view holds up to 10 user-curated chip combinations (most recent first). A star button next to the ⋯ button toggles whether the current combination is saved (empty ☆ → click saves; filled ★ → click removes). Hover on a pill reveals a × to remove; every remove path (star toggle or pill ×) shows a 5s undo toast bottom-center. Click a pill to reapply. Chip → PF1 column map: `line-name`, `description`, `line-group`, `level`, `process-category`, `target-uph` filter/highlight for real; chips of other categories render with a subtle **"visual"** badge to signal they're not applied to the table. localStorage keys: `davinci:pf-filter:behavior`, `:order`, `:favorites-visible`, `:favorites`. Keyboard: ⌘K / Ctrl+K focuses the input and opens the panel; the ⌘K hint auto-hides once the filter has any content |
| [js/eq-filter.js](js/eq-filter.js) | — | `EqFilter` | detail | Same UX as `PFFilter` scoped to the Equipment List tab. Replaces the old search-bar (`#equipment-search`). Two categories: **Equipment** (35 fields including Department, CM Department, Category, ENG/MP Intent, Purchase Type, Validation Required, Priority/Complexity/Cost, Equipment Processes, Design Review, RFP Release/Status, Quantity, QPL Adjustment, MP Cost, Weight, Workspace W/H/L, Usage Multiplier, In-hand Date, Contains/Without Line Side & Connected & Blank Vendor, DRIs, Name, Short Name, Version Notes) and **Equipment vendor** (17 fields including MP/ENG Intent, Line Side, Design Maturity, Design Manager, DFM Approval, CAD Release, DFM Incline, Lead Time, In-hand, DRI, Vendor, AQID, Vendor PN, CM PN — matched against the vendor sub-table adjacent to each equipment row via `.table__row--equip-expanded`). Line-level match uses `COL_MAP` (nth-of-type into the equipment tr); vendor-level match iterates each vendor tr inside the expanded sub-table via `VENDOR_COL_MAP` — an equipment row bats if ANY of its vendors matches. In Search mode, matching vendor cells get highlighted when the row is expanded. `EquipmentTable.render()` calls `EqFilter.reapply()` at the end so chips survive full rerenders. ⌘K only opens when the Equipment List panel is active. **Favorites** parallel PFFilter: same star toggle, same 10-cap curated list, same hover-× + undo toast. localStorage keys: `davinci:eq-filter:behavior`, `:order`, `:favorites-visible`, `:favorites` — independent from PFFilter. Table was extended with 6 new columns (CM Department, Equipment Design Review, QPL Adjustment, Version Notes, Workspace Height, Workspace Length) and 6 inputs were promoted to dropdowns (Purchase Type, Validation Required, Priority, Complexity, Cost, RFP Status) — total 59 columns (was 53) |
| [js/equipment-table.js](js/equipment-table.js) | 672 | `EquipmentTable` | detail | 52-column equipment table; renders the equipment delete-confirmation modal via `DeleteModal`. Bulk-actions bar `Duplicate` opens `DuplicateEquipmentModal` for per-row rename; the confirm callback clones rows and inserts them at the top of the table body (preserving selection order), writes `newName` into the cloned `.equip-input--name`, and fires an MDS success toast (`N equipment has been duplicated`). |
| [js/equipment-preset.js](js/equipment-preset.js) | 133 | `EquipmentPreset` | detail | Equipment preset selector |
| [js/equip-restore-menu.js](js/equip-restore-menu.js) | 60 | `EquipRestoreMenu` | detail | Restore-removed-equipment menu |
| [js/equipment-settings-drawer.js](js/equipment-settings-drawer.js) | 260 | `EquipmentSettingsDrawer` | detail | Per-equipment settings drawer |
| [js/equipment-tab-menu.js](js/equipment-tab-menu.js) | 53 | `EquipmentTabMenu` | detail | Sub-tab menu inside Equipment List |
| [js/equipment-comparison.js](js/equipment-comparison.js) | 213 | `EquipmentComparison` | detail | Side-by-side comparison view; stage column headers driven by `compareStages` array + Handlebars template |
| [js/consumables-table.js](js/consumables-table.js) | 328 | `ConsumablesTable` | detail | Consumables table + filters; standard column headers driven by `consumablesColumns` array + Handlebars template |
| [js/consumables-view-drawer.js](js/consumables-view-drawer.js) | 124 | `ConsumablesViewDrawer` | detail | Per-consumable view drawer |
| [js/pcn-data.js](js/pcn-data.js) | 490 | `PcnData` | detail | 25 PCN mock records; `getAll()` |
| [js/pcn-table.js](js/pcn-table.js) | 436 | `PCNTable` | detail | PCN table render, group headers, select-all, actions bar, tab badge; exposes `pcnData` / `getDueStatus` / `dueIconHtml` for split modules |
| [js/pcn-filters.js](js/pcn-filters.js) | 132 | `PCNFilters` | detail | Search input + due-date filter; no-results row |
| [js/pcn-row-actions.js](js/pcn-row-actions.js) | 188 | `PCNRowActions` | detail | tbody event delegation: field edits, file links, approve/reject, AC copy, group expand/collapse, `updateFileLink` |
| [js/delete-modal.js](js/delete-modal.js) | 25 | `DeleteModal` | detail | Shared renderer for the standard delete-confirmation modal (equipment + consumables) |
| [js/modal-shell.js](js/modal-shell.js) | 32 | `ModalShell` | detail | Shared renderer for modal overlay shells (import / publish wizard / file-upload); body/footer come from `<script type="text/html">` fragments |
| [js/file-upload-modal.js](js/file-upload-modal.js) | 230 | `FileUploadModal` | detail | File upload modal; calls `PCNRowActions.updateFileLink` after upload |
| [js/publish-wizard.js](js/publish-wizard.js) | 119 | `PublishWizard` | detail | Publish flow modal (3-step wizard); rendered via `ModalShell` |
| [js/import-modal.js](js/import-modal.js) | 59 | `ImportModal` | detail | Import modal; rendered via `ModalShell` |
| [js/duplicate-equipment-modal.js](js/duplicate-equipment-modal.js) | ~100 | `DuplicateEquipmentModal` | detail | Duplicate Equipment modal (rendered via `ModalShell`). Opens from the equipment actions-bar `Duplicate` button with one editable name field per selected row (prefilled `{name}-copy`, floating label = original name). On Confirm, invokes the caller's callback with `[{ row, newName }]`; empty / whitespace-only entries fall back to `{original}-copy`. Cancel / × / Esc / backdrop close the modal without mutating the table. `EquipmentTable` owns the clone insertion — the modal is purely name-collection. |
| [js/column-resizer.js](js/column-resizer.js) | 111 | `ColumnResizer` | detail | `init(selector)` for resizable columns |
| [js/mp-target-selector.js](js/mp-target-selector.js) | 130 | `MPTargetSelector` | detail | Builds the target-selector dropdown for every MP empty state (PF1, PF2, Equipment, Consumables) using the project's `equip-dropdown` pattern (so the menu always opens below the trigger), and wires every Assign button. On Assign, opens `ProjProgressDrawer` with a 5s fake-load (`Locating target` → `Filtering POR items` → `Mirroring` → `Finalizing`); on completion sets `BuildStages.mpTarget`, removes `program-detail-page--mp-no-target`, and shows a top-center MDS success toast. `reset()` clears the target + every empty-state UI, called by `Dropdowns` when the program changes |
| [js/table-renderer.js](js/table-renderer.js) compile + [js/lines-table.js:594](js/lines-table.js#L594) | — | — | both | Canonical Handlebars compile/inject pattern |

### Dark Mode
The detail page and the listing page each scope dark-mode CSS to their own root selector — **the listing's `dark-mode.css` and the detail's `css/dark-mode*.css` files are NOT duplicates and should not be merged**.

- **Listing page**: [dark-mode.css](dark-mode.css) (root, 212 lines) — linked after `styles.css` in [index.html](index.html). Selectors are scoped to listing-specific containers.
- **Detail page**: split into 4 files under `css/`, all `@import`ed as the LAST entries of [css/main.css](css/main.css) so they can override `base.css` `!important`s for `.content` and `.program-detail-page`:
  - [css/dark-mode.css](css/dark-mode.css) (197) — header, dropdowns, build-stages timeline, tabs, process toolbar, equip restore
  - [css/dark-mode-tables.css](css/dark-mode-tables.css) (276) — equipment table, vendor sub-table, actions bar, delete modal, comparison + settings drawer
  - [css/dark-mode-pcn-consumables.css](css/dark-mode-pcn-consumables.css) (280) — consumables + PCN/Lines tables
  - [css/dark-mode-overlays.css](css/dark-mode-overlays.css) (34) — file-upload / import / publish-wizard modals + table catch-all
- **Toggle**: global, via the `proj-dark-mode` plugin (moon icon in `proj-right-toolbar` on detail; standalone on prototypes that opt in).
- **Persistence**: `localStorage` key `davinci:dark-mode`. An inline `<head>` script (e.g. [index.html:7](index.html#L7)) restores the `.dark-mode` class on `<html>` before CSS paints to avoid flash.

## CUSTOM CSS PATTERNS
- Listing page only — sticky page + table headers (z-index 100 / 99), 2rem row height, nested-table column alignment via width %s, chevron 90° rotation, favorite color transitions, negative margin on `.programs-page` to absorb canvas padding.
- Detail page — feature CSS per module under `css/`; do **not** add padding to `.program-detail-page` (canvas `.content` already provides it).
- All spacing/color/typography via MDS tokens.

## JAVASCRIPT PATTERNS
- **Module pattern** — IIFE + `window.X = { init|render, ... }`. Canonical example: [js/data.js:239](js/data.js#L239).
- **Init pattern** — `safeInit()` invoked from `davinci:canvas:ready` (or immediately if doc already loaded). See [js/main.js:40-60](js/main.js#L40-L60) and [js/detail-main.js](js/detail-main.js).
- **Module guards** — `detail-main.js` wraps every non-core module call with `if (window.X)` so missing modules don't break init.
- **Re-init after re-render** — `TableSort` re-renders the listing table, then re-calls `RowExpander.init()`, `Favorites.init()`, `ActionButtons.init()`. The codebase does not use event delegation.
- **Handlebars compile** — `Handlebars.compile(document.querySelector('#tpl-id').innerHTML)(data)` and assign to `container.innerHTML`. Pattern at [js/table-renderer.js:17](js/table-renderer.js#L17).

## INTEGRATION POINTS
- **Canvas** — `<script id="page-content">` carries the page; canvas templates inject navbar/footer/subheader automatically; user-impersonation hooks (`davinci-users.json`) apply at canvas level (none configured for this prototype yet).
- **Navigation** — `canvas-navigation-data.json` (workspace root). Detail page is reached via row link / direct URL with `?code=` param.
- **MDS** — design tokens (`--color-*`, `--space-*`, `--font-*`, `--transition-basic`), sortable table icon (`⇅`), all overlay primitives.
- **Plugins** — auto-loaded by canvas via `plugins/plugins.css` and `plugins/plugins.js`.

## EDGE CASES HANDLED
- Re-init after listing table re-render (sort / search) — all button handlers re-attached.
- Fallback init if `davinci:canvas:ready` event was missed (`document.readyState !== 'loading'` branch).
- Dark-mode flash prevented by inline restore script before CSS paint.
- PF2 group move preserves expanded-group state + auto-expands the destination group.
- L2 station dropdowns rebuilt from `stationState` cache on collapse/re-expand to preserve user edits.
- Empty PF2 groups still render a header row.
- MP build stage gates Process Flow (PF1 + PF2), Equipment List, Consumables, and PCN tables. PCN is always emptied (header only) in MP because the PCN tab is hidden in MP. Process Flow / Equipment / Consumables empty their bodies only while no target is assigned (`BuildStages.mpTarget == null`); once an admin assigns a target via the empty state, those tables re-render with the (mirrored) data. Selecting any non-MP stage restores the standard data. PF2 totals collapse to zero when MP is empty. Additionally, [detail-main.js](js/detail-main.js) toggles a `program-detail-page--mp` class on the page root so MP-only chrome rules in [css/mp.css](css/mp.css) can hide elements that don't apply to a read-only mirror view (PCN tab, Import / Publish buttons), and swaps the page-header version tag's text between `"V1 - Draft"` (any other stage) and `"Read-only"` (MP). When MP is active and `BuildStages.mpTarget` is null, an additional `program-detail-page--mp-no-target` class swaps the panel content of Process Flow (PF1+PF2), Equipment List, and Consumables for the target-selector empty state ([js/mp-target-selector.js](js/mp-target-selector.js)) and hides the version tag entirely; assigning a target on any one of them clears the class for all four (the tag re-appears with `"Read-only"` and the tables fill in). Switching programs via the Program dropdown resets `mpTarget` to null. Mirroring uses [`proj-progress-drawer`](../../.davinci/plugins/proj-progress-drawer.js) for the 5s fake load between Assign click and table render. Once mirrored, `mp.css` enforces read-only on the four panels: form-like controls (`.equip-input`, `.equip-dropdown`, native `input/select/textarea`) get `pointer-events: none`; mutation affordances (drag handles, station action links, add-row links, description popover button) are hidden via `display: none`; bulk-action bars (`#equip-actions-bar`, `#cons-actions-bar`) are forced hidden. View affordances (search, tabs, row-expand chevrons, column-resize) stay enabled. POR intent filtering is not yet applied — every row of the target's data is shown in MP.
- Case-insensitive search across `code`, `name`, `admin`, and nested `sites[].alias`.

## NOT IMPLEMENTED
- Action button on listing — placeholder `console.log`.
- Pagination — full 20-row listing always rendered.
- Backend integration — all data is mock in `js/data.js`, `js/detail-data.js`, `js/pcn-data.js`.
- Several detail-page columns show `—` placeholders.

## PERFORMANCE NOTES
- Listing dataset (20 rows) is small — no virtualization needed.
- Handlebars compile happens per render (cheap at this scale).
- Listing avoids event delegation; sort/search triggers full re-attach.
- `pcn-table.js` is 436 lines after the Tier 2 split (mock data → `pcn-data.js`, filters → `pcn-filters.js`, row actions → `pcn-row-actions.js`); all four are under the 500-line CLAUDE.md threshold.
- `equipment-table.js` is 672 lines (still over threshold) and `lines-table.js` is 627 lines — candidates for a future split if iteration cost becomes a problem.
- All detail CSS files are under the 300-line CLAUDE.md threshold after the Tier 3 split (see [css/main.css](css/main.css) for the full @import list; 31 stylesheets, max 282 lines).

## TESTING SCENARIOS
1. **Listing page** — sort each column (asc/desc), search by code/name/admin/site alias, toggle favorites-only switch, expand/collapse rows, favorite parent + nested site, open Add Program drawer, switch drawer tabs, toggle dark mode.
2. **Detail page** — change program (verify site dropdown repopulates), URL param `?code=N50` seeds correctly, switch build stages (verify MP empties Process Flow + Equipment + Consumables + PCN bodies; other stages restore them), switch each top tab (Process Flow, Equipment List, Consumables, PCN), PF1 flat view + PF2 grouped view + line move via grouping dropdown shows success notification, equipment comparison view pin/unpin, equipment settings drawer, consumables view drawer, PCN filters/sort/row actions, open + close each modal (file upload, publish wizard, import, delete confirmations), resize columns on PCN/consumables/equip-compare/lines, toggle dark mode.
3. **Console / network** — zero errors, zero 404s on both pages in both modes.

## AI ANALYSIS SHORTCUTS
- Programs data: [js/data.js:239-247](js/data.js#L239-L247) (exports)
- Detail data: [js/detail-data.js:94-107](js/detail-data.js#L94-L107) (exports)
- PCN mock data: [js/pcn-data.js](js/pcn-data.js) (25 records, `window.PcnData.getAll`)
- Listing init sequence: [js/main.js:12-35](js/main.js#L12-L35)
- Detail init sequence: [js/detail-main.js:14-107](js/detail-main.js#L14-L107)
- Listing Handlebars template: [index.html:192](index.html#L192)
- Listing script load order: [index.html:264-275](index.html#L264-L275)
- Detail script load order: [program-detail.html:1320-1350](program-detail.html#L1320-L1350)
- Detail Handlebars templates: [program-detail.html:787-1160](program-detail.html#L787-L1160) — includes `lines-l1`, `lines-l1-template-2`, `lines-l2`, `equip-compare-stage-headers`, `consumables-headers`, `delete-confirmation-modal`, `modal-shell`
- Modal body / footer fragments (used by `ModalShell`): `import-modal-body/footer`, `publish-wizard-body/footer`, `file-upload-modal-body/footer` (all `<script type="text/html">` near bottom of templates block)
- Handlebars compile pattern: [js/table-renderer.js:17](js/table-renderer.js#L17), [js/lines-table.js:594](js/lines-table.js#L594), [js/delete-modal.js](js/delete-modal.js), [js/modal-shell.js](js/modal-shell.js)
- PCN module split: render+badge+groups in [js/pcn-table.js](js/pcn-table.js), filters in [js/pcn-filters.js](js/pcn-filters.js), row delegation in [js/pcn-row-actions.js](js/pcn-row-actions.js)
- Detail CSS entry: [css/main.css](css/main.css) — 30 `@import`s; the four `dark-mode*.css` files are last so they override `base.css` `!important`s

## STORE DETAIL TABS (supermarket)
- **Overview** (`js/store-overview.js`, `css/overview.css`): operational summary, not a copy of the other tabs. Header with the store, manager and opening hours plus a sales period selector (only the sales summary follows it); five clickable indicators (Out of stock, Low stock, Tasks needing attention, Orders at risk, Equipment unavailable) that open the Products tab filtered, Purchase Spend, Equipment/Consumables or scroll to Tasks today; **Needs attention** (one list, most urgent first, mixing out of stock, blocked and overdue tasks, late orders, expiry, unavailable equipment, products at risk and requests waiting, each with what, where and a shortcut button); Tasks today (open / overdue / blocked, next tasks, team on shift); Upcoming deliveries; Stock alerts; Expiry alerts; a small Sales summary (net sales, comparison with the previous period, transactions, average ticket). `ProductsTable.setQuick(key)` lets the shortcuts filter the Products tab.
- **Areas** (`js/areas-data.js`, `js/areas-tree.js`, `css/areas-tree.css`): a tree table, Area > Products / Issues & repairs > items. Products are the SKUs sold from the area; issues are things to fix (a freezer door that does not seal) with the equipment and consumables needed, and whether the store has them (a missing consumable puts the issue in *Waiting for parts*). Issues and items can be added from the table (kept for the session). The equipment issues match the Overview's *Equipment unavailable* counter. The old stations/operations table (`js/lines-table.js`) is still loaded but hidden inside `.areas-legacy`.
- **Products** (`js/products-data.js`, `js/products-table.js`, `css/products.css`): SKU table of the selected store (Area name, Product, Brand, Variant, Status, Package Size, Pack, SKU, Barcode, Price, Discount, Promo Price, Stock, Min. Stock, Shelf Location, Expiry Alert). A row opens a drawer with product details, store inventory, batches and expiry, store location and activity. The catalog part (brand, variant, EAN...) is shared; the store part is generated per store and matches the low-stock counters of the Overview. The tab keeps the internal id `equipment-list`.
- **Employees** (`js/employees-data.js`, `js/employees-table.js`, `css/employees.css`): the store team (manager, one area lead per area as in the Areas tab, and staff per area), generated per store. Table: Employee, Role, Usual area, Shift, Status, Open tasks and an Assign task button. A row opens a drawer with profile, usual areas (with the share of time), this week's schedule, open tasks and a form to assign a task (task, area, product, priority, due date, instructions). Assigned tasks are kept for the session and appear first in the Overview's Open tasks. The toolbar, chips, table and drawer styles come from `css/products.css`.
- **Resizable columns** (`js/table-resize.js`): the Products and Employees tables resize every column by dragging the right edge of its header (arrow keys on the focused handle, double click to reset). Widths sit in a `<colgroup>` with a fixed table layout, survive sorting and filtering, and are remembered in localStorage (`bossanova:column-widths:<table>`). The Areas, Consumables and Requests tables use the older `js/column-resizer.js`.
- **Areas map** (`js/store-map.js`, `css/store-map.css`): a List / Map toggle in the Areas toolbar. The map is an isometric SVG floor plan of a large store (34 x 23 grid units) with the 13 areas placed on it (fridges on the back wall, fresh counters on the left, aisles in the middle, checkout lanes at the front), coloured by section (Fresh, Sales floor, Front end, Back of house). Hover highlights an area; clicking one opens the area drawer. The chosen view is remembered in localStorage (`programs:areas-view`). 
- **Area drawer** (`js/area-drawer.js`, styles in `css/store-map.css`): clicking an area on the map opens a drawer over the drawing with every product of that area for the selected store (price and promotion, pack, stock and minimum, shelf location, expiry alert, status). It has a search, the same quick filters as Products, and each product expands in place to its full sheet (details, store inventory, batches and expiry, location, activity, from `ProductsTable.sectionsHtml`). "View in Products tab" opens that tab filtered to the area. The Receiving & Stock Room sells nothing, so it lists the backroom stock of all areas. The drawer takes 70% of the screen and the zoomed map the other 30%. It closes with Esc, the X, a click outside, or when the city or store changes.
- **Tab order**: Overview, Areas, Products, Equipment/Consumables, Requests, Employees, Revenue, Purchase Spend.
- **Revenue and Purchase Spend** (`js/finance-data.js`, `js/finance-view.js`, `css/finance.css`): both tabs share one period selector (day, week, month, quarter, year or a custom range of up to a year, with previous / next arrows) and compare with the period just before. *Revenue*: Gross Sales, Discounts, Returns, Net Sales, Transactions and Average Basket, and a table by date (day, week or month depending on the period) whose rows open into the sales channels; an export button downloads the table as CSV. Receipts are not listed (too many). *Purchase Spend*: Total purchased, invoices awaiting payment, overdue invoices and purchase orders in transit (the same ones as the Overview), a table of supplier invoices (Invoice Date, Supplier, Invoice Number, Purchase Order, Items, Total Amount, Due Date, Payment Status, Documents) with search and status filters, and a drawer per invoice with the products received, taxes and the attached document. All figures are generated per store. Operating Expenses (energy, water, rent, maintenance) is not built yet.
- **Requests** (`js/requests-data.js`, `js/requests-view.js`, `css/requests.css`): purchase requests in two sub-tabs, *Products* and *Equipment/Consumables*. Products come from the store's low-stock, out-of-stock and planned items; equipment and consumables come mostly from what is missing to fix the issues of the Areas tab. Each table shows what is needed to decide a purchase (item, area, supplier, quantity, unit and total cost, stock, reason, priority, who asked, when asked, needed by, status) and an Actions column fixed on the right with Accept and Reject (Reject asks for a reason). The status chips (Pending, Approved, Ordered, Delivered, Rejected) are the order history, and a request opens in a drawer with its full status history. The number on the tab counts the pending requests. Decisions are kept for the session. The old change-request table (`js/pcn-table.js`) is still loaded but hidden inside `.requests-legacy`.
- **Equipment/Consumables** (`js/supplies-data.js`, `js/supplies-table.js`, `css/supplies.css`): same style as Products (search, area dropdown, quick filters, resizable table, drawer per item). It lists the store's equipment and consumables with brand, model, unit, code, unit cost, quantity and minimum, location, supplier, last restocked and status (In stock, Low stock, Out of stock for consumables; In use, Available, Under repair, Not in store for equipment). Items that open issues of the Areas tab are missing are short or out of stock here too, and the equipment of an area with an open equipment issue is *Under repair*. The old consumables table (`js/consumables-table.js`) is still loaded but hidden inside `.supplies-legacy`.
- **Map zoom**: clicking an area animates the map (0.7 s) to zoom into it, centred in the part of the map the open area drawer leaves free; a veil covers everything else, with the clicked area (and its name) drawn again on top. Closing the drawer zooms back out. The drawing sits in `#store-map-scene`; the veil is a layer of `<use>` clones appended on select. Reduced-motion users get the change without animation.
- **Map search and issues**: the search of the Areas toolbar also works in map view (areas that do not match fade). Next to it, the *Show issues* button (map view only, remembered in localStorage `programs:areas-issues`) puts a map pin with the number of open issues over the name of every area that has some (amber, red when one is Urgent, with a soft pulse). Hovering or focusing the pin opens a popover with the issues of the area: title, priority, status, description and which items needed to fix them are missing or short.
- **Area drawer table**: inside the area drawer the products use the same tree table as the Areas tab (rounded toggles, hierarchical numbering, guide lines, white rows with grey children, resizable columns, numbers on the right): product (1) > section (1.1 Product details, 1.2 Store inventory, 1.3 Batches & expiry, 1.4 Store location, 1.5 Activity) > detail rows (1.2.1 …). The sections come from `ProductsTable.detailGroups()`.
- **Map artwork** (`js/store-map-art.js`): the store map is drawn in the style of a flat isometric supermarket illustration: tiled floor on a tan slab, white shelves with rows of colored packages (one palette per area), glass fridges with colored headers, wooden crates of fruit, display counters, orange checkout lanes, a stock room with cartons, shoppers (scaled 1.3x), cashiers, carts, plants and gates. Shelf rows, shoppers and props are depth-sorted together (`order()`), so people stand in front of or behind the shelves. An aisle is several pieces with the same `data-area`; hovering one highlights all of them. `store-map.js` only places the areas and handles the clicks, zoom, signs and issue pins.
- **Employee photos** (`../people-avatars.js`): a photo of a woman for a woman's name and of a man for a man's name, from the 12 sample photos in `.davinci/assets/avatars`. A photo is never shown twice in a team: `PeopleAvatars.assign()` gives each photo to one person (the first of the list, in the order of the Employees table) and the others show their initials. The contact card uses the same assignment for the current store.
- **Fixed columns**: in the Products and Equipment/Consumables tables the first two columns (Area name and Product / Item) stay in place when the table scrolls sideways (`position: sticky`; the offset of the second one is the width of the first, passed by `TableResize` through its `onChange` option, so it follows when the column is resized).
