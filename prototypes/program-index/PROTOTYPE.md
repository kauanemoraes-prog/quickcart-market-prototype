# Program Index Prototype

## META
- **Path**: `prototypes/program-index/`
- **Pages**: `index.html`
- **Stylesheets**: `css/main.css` (entry, `@import`s 6 feature stylesheets — all under 300-line threshold)
- **JS**: `js/` modular architecture — see [Module Reference](#module-reference)
- **Dependencies**: DaVinci Canvas, Monalisa Design System, Handlebars
- **Navigation entry**: `canvas-navigation-data.json` — "Program Index" tab in `mainNavigation`, last position (after Equipment Vendor)

## PURPOSE
Demo of the **Program Index** workflow — bringing forward Lines+Stations, Equipment, and Consumables data from a previous-generation program build into a new-generation program's empty build event.

The flow:
1. User opens a program drawer (target program: H11 + Site BBB, simulated as already created with empty builds)
2. Inside the drawer's **Sites** tab, each row carries a **Program Index** action
3. Clicking it opens a 6-step wizard modal layered over the drawer
4. Wizard guides selection of source (program → build → event → published version), target build event, scope toggles, per-item picks with carry-over/retrofit classification, and final review
5. On confirm, the build event is flagged as indexed and the action button becomes disabled

## UI COMPONENTS

### MDS
- **Drawer** (large, 904px) — program edit drawer with Sites/Program Users/PCN Settings tabs
- **Modal** (large, 800px+) — wizard, layered over the drawer
- **Tables** — sites table inside drawer; item-selection tables in wizard steps 3/4/5
- **Forms** — `form-input`, `form-select`, `form-checkbox` inside drawer + wizard
- **Buttons** — primary/secondary/link variants, sizes medium
- **Tags** — "New Generation" status indicator on landing card
- **Notifications** — success toast on completed indexing
- **Icons via `<sf-symbol>`** — `arrow.right`, `checkmark.circle.fill`, `checkmark.seal.fill`, `exclamationmark.triangle.fill`

### Plugins
None — no plugin components used. Wizard stepper is custom CSS (no MDS or plugin equivalent).

## DATA STRUCTURE

### Source catalog ([js/data.js](js/data.js))
```js
SOURCE_PROGRAMS = [{ code, name, sites }]   // 3 mock programs
BUILDS[programCode] = [{ id, name, siteAlias }]
EVENTS[buildId] = [{ id, name }]
VERSIONS[eventId] = [{ id, label, state: 'published' | 'draft' }]
ITEMS[group] = [{ id, name, subtitle, details }]   // group ∈ {lines, equipment, consumables}
```

### Target context (fixed for demo)
```js
TARGET_PROGRAM = 'H11'
TARGET_SITE   = 'Site BBB'
TARGET_SITE_ROW = { events: [{ id, name, state: 'empty'|'filled'|'indexed' }] }
```

### Wizard state (in-memory + persisted)
```js
{
  source: { program, build, event, version },     // selected ids
  target: { event, siteDiffers },
  scope:  { lines, equipment, consumables, sop },
  items:  { lines: [{id, selected, retrofit}], equipment: [...], consumables: [...] }
}
```
Persisted in `localStorage` under key `davinci:program-index-draft`. Cancel button discards; × button persists.

## STATE MANAGEMENT

| State | Owner | Notes |
|---|---|---|
| Drawer open/close | `PIDrawer` | Toggles `drawer-overlay--open` |
| Active drawer tab | `PIDrawer.initTabs` | Toggles `drawer-tab--active` + `drawer-tab-content--active` |
| Site row indexed flag | `PIDrawer.flagAsIndexed` | Updates `PIData.TARGET_SITE_ROW.indexed` + first event state to `indexed` |
| Wizard open/close | `PIWizard` | Toggles `modal-overlay--open` |
| Current wizard step | `PIWizard.current` | 1–6; `goTo(n)` toggles `is-active` / `is-completed` on `.wizard-step` and `is-active` on `.wizard-panel` |
| Wizard form state | `PIWizard.state` | Single object passed by reference to all step modules; persisted on every change |
| Persistence | `PIWizard.persist`/`clearPersisted` | localStorage key `davinci:program-index-draft` |

## KEY FEATURES

### Landing page
- Single program card showing H11 (new generation) with stats: 1 site, 3 empty events, not indexed
- Single CTA: **Open Program** opens the drawer

### Program drawer (`#program-drawer`)
- Mirrors the existing Add Program drawer pattern from `prototypes/programs/index.html`
- Pre-filled fields (read-only program code H11)
- Three drawer tabs: Sites (active), Program Users, PCN Settings
- Sites tab shows a Handlebars-rendered table — single row "Site BBB" with build "MP-1" containing 3 empty event pills (P1, P2, MP) and a **Program Index** action button
- Action button opens the wizard; once indexed, button shows ✓ Indexed and is disabled

### Wizard modal (`#wizard-modal`)
- 6-step custom stepper with state classes: default → `is-active` → `is-completed`
- Connector lines between steps; clicking any step navigates (skipped steps respect scope toggles)
- Footer: Cancel (link) on left; Back + Next on right; Next becomes "Confirm & Index" on step 6
- Closes via × (persists draft), Cancel button (discards draft), backdrop click (persists), Escape key (persists)

#### Step 1 — Source
- Cascading dropdowns: Program → Build → Event → Version
- Versions filtered to `state === 'published'` only; drafts not selectable
- Live success summary appears once all four are picked
- Next disabled until source is complete

#### Step 2 — Target & Scope
- Route card: source summary → destination (H11 · Site BBB)
- Target Build Event dropdown — only empty events listed; first auto-selected as default
- Scope toggles: Lines + Stations / Equipment / Consumables / SOP Files
- SOP Files row auto-locks (disabled + checkbox cleared) when source site differs from target site (`state.target.siteDiffers`)
- Toggling a group OFF disables its corresponding step in the stepper and skips it on Next

#### Steps 3, 4, 5 — Lines + Stations / Equipment / Consumables
- Shared logic in [js/wizard-items.js](js/wizard-items.js) — same UI pattern per group
- Search input filters rows
- Bulk actions: Select all / Clear / Mark all Carry Over
- Master checkbox in header (with indeterminate state)
- Each row: checkbox + item info + classification toggle (Carry Over / Retrofit pill)
- Footer counter: "X of Y selected"

#### Step 6 — Review
- Route card: source → destination (with target event + Draft state)
- Grid of summary cards per group (Lines, Equipment, Consumables, SOP Files)
- Each card shows counts: Carry Over / Retrofit / Excluded — or "Excluded from this index" if disabled
- Edit button on each card returns to the corresponding step
- Warnings list: SOP excluded due to site mismatch, empty groups, etc.
- Confirm & Index button triggers a 900ms simulated processing, then closes the modal, flags the site row as indexed, and shows a success toast

### Module Reference

| Module | Lines | Exports | Purpose |
|---|---|---|---|
| [js/data.js](js/data.js) | 174 | `PIData` | Mock source programs + items + target context |
| [js/main.js](js/main.js) | 27 | — (entry) | `safeInit` on `davinci:canvas:ready` |
| [js/drawer.js](js/drawer.js) | 77 | `PIDrawer` | Drawer open/close + tabs + sites table render + row action |
| [js/wizard.js](js/wizard.js) | 223 | `PIWizard` | Wizard core: open/close, navigation, persistence, processing |
| [js/wizard-source.js](js/wizard-source.js) | 179 | `PIWizardSource` | Step 1 cascading dropdowns + summary |
| [js/wizard-scope.js](js/wizard-scope.js) | 114 | `PIWizardScope` | Step 2 target event + scope toggles + SOP lock |
| [js/wizard-items.js](js/wizard-items.js) | 159 | `PIWizardItems` | Steps 3/4/5 shared: search, bulk actions, per-row checkbox + radio |
| [js/wizard-review.js](js/wizard-review.js) | 93 | `PIWizardReview` | Step 6 summary cards + warnings |

## CUSTOM CSS PATTERNS

- **Wizard stepper** — custom horizontal stepper at [css/wizard.css](css/wizard.css) (no MDS equivalent). Uses `.wizard-step` button + `.wizard-step__connector` spacers. States: default, `is-active` (accent indicator), `is-completed` (green check via `::before`).
- **Class toggle** — pill-style segmented control for Carry Over / Retrofit at [css/wizard-tables.css](css/wizard-tables.css) — radio buttons styled as pills with `[checked] + .pill` selectors.
- **Build event pills** — small status pills inside Sites table for empty/filled/indexed events at [css/drawer-content.css](css/drawer-content.css).
- **Route card** — origin → destination layout at [css/wizard-steps.css](css/wizard-steps.css), reused inside the review step.
- All spacing/colors/typography via MDS tokens.

## JAVASCRIPT PATTERNS

- **Module pattern** — IIFE + `window.PIX = { init, ... }`. Each step module receives the shared wizard state by reference in its `init(state)` and exposes `refresh()` for UI re-sync.
- **Init pattern** — `safeInit()` invoked from `davinci:canvas:ready`, with fallback to direct call if document is already loaded ([js/main.js](js/main.js)).
- **State by reference** — wizard creates one `state` object and passes it to every step module. Mutations from any module are immediately visible to all others. Persistence is centralized in `PIWizard.persist()`.
- **Handlebars render** — used for sites table ([js/drawer.js](js/drawer.js#L43)) and item rows ([js/wizard-items.js](js/wizard-items.js#L40)) and review cards ([js/wizard-review.js](js/wizard-review.js#L19)).
- **UI re-sync after Cancel** — `PIWizard.cancelAndDiscard()` resets state and calls `refresh()` on all step modules, so the next open shows fresh defaults.

## INTEGRATION POINTS

- **Canvas** — `<script id="page-content">` carries the page; canvas templates inject navbar/footer/subheader automatically.
- **Navigation** — `canvas-navigation-data.json` (workspace root). Tab labeled "Program Index" placed after Equipment Vendor.
- **MDS** — design tokens (`--color-*`, `--space-*`, `--font-*`, `--transition-basic`); all overlay primitives (modal, drawer); form, table, button, notification components.

## EDGE CASES HANDLED

- Source dropdowns cascade — clearing program clears build/event/version; selecting build only enables event dropdown when populated.
- Versions list filters out drafts; if an event has no published versions, the Version dropdown shows "No published versions" and stays disabled.
- Target Build Event dropdown only lists events with `state === 'empty'`; first one auto-selected as default.
- SOP Files toggle auto-disables and clears when source/target sites differ (computed in `PIWizardScope.refresh`).
- Stepper buttons for groups toggled off in scope are disabled (cannot navigate to them).
- `goNext` skips steps that are disabled by scope.
- Modal close mechanisms behave per requirement: Cancel discards localStorage; × persists; backdrop click persists; Escape persists.
- Master checkbox in item tables shows indeterminate state when partially selected.
- Search filter in item steps doesn't lose selection state — checked items remain checked when filter is cleared.
- Once a site is indexed, the Program Index button shows ✓ Indexed and is disabled (one-shot indexing rule).
- Items state is built lazily per group via `ensureGroupState` — fresh state from item catalog when not yet seen.

## NOT IMPLEMENTED

- **Real backend processing** — Confirm & Index uses a 900ms `setTimeout` and a synthetic toast.
- **Visual flag on indexed builds beyond the row pill** — designer will add post-indexing badges later (per design discussion).
- **Multiple sites in the drawer table** — the prototype shows a single Site BBB row to keep focus on the wizard. Adding more rows is straightforward (extend `PIData.TARGET_SITE_ROW` to a list).
- **Item mapping when sites differ** — assumed not needed (items copy directly per discussion).
- **Drawer Save/Cancel for program details** — drawer has no footer; it's an entry context for the wizard, not a full edit form.

## OPEN DESIGN POINTS (recorded during requirements discussion)

These were resolved by the designer during scoping. Captured here so future iterations can revisit if stakeholders disagree:

- **Entry point** — Program Index lives inside the program drawer, per-site row action.
- **Build target** — User selects from empty events; first is the default.
- **Wizard container** — Modal layered over the drawer (not a drawer-on-drawer or full page).
- **Site change → SOP** — Forced exclusion of SOP Files when source/target sites differ.
- **Items mapping** — Items copy as-is across sites; no mapping layer.
- **Indexing one-shot** — Once a build event is indexed, it cannot be re-indexed (button disabled in row).
- **Stepper navigation** — Clickable (any step can be jumped to, except those disabled by scope).
- **Cancel** — Discards everything (clears localStorage + resets in-memory state + UI).
- **Persistence** — × close button persists draft for next open (via localStorage); Cancel button discards.

## TESTING SCENARIOS

1. **Happy path** — Open drawer, click Program Index, select H10 / PRB-1 / P1 / V16 → confirm site differs from BBB → SOP locked → keep all 3 group toggles → step 3/4/5 select all + classify some as retrofit → review → confirm. Verify site row becomes "✓ Indexed" and button disabled.
2. **Same-site source** — If a source program has Site BBB (none in mock data, but the logic), SOP toggle should remain enabled.
3. **Drafts excluded** — Selecting H10 / PRB-1 / P1 → only V1, V8, V12, V16 listed; no V17 (draft).
4. **Empty event** — Selecting H10 / PRB / MP → "No published versions" message.
5. **Scope skip** — In step 2, uncheck Equipment → click Next → wizard jumps from step 3 to step 5. Stepper button for step 4 is disabled.
6. **Cancel discards** — Fill source, close via Cancel → reopen → all fields blank.
7. **× persists** — Fill source, close via × → reopen → fields restored.
8. **Backdrop click** — Click outside modal → persists draft (same as ×).
9. **Escape key** — Same as × (persists).
10. **One-shot lock** — After confirming indexing, the Program Index button on the row is disabled and shows "✓ Indexed".

## AI ANALYSIS SHORTCUTS

- Mock data exports: [js/data.js:117-174](js/data.js#L117-L174)
- Wizard state shape + defaults: [js/wizard.js:42-49](js/wizard.js#L42-L49)
- Persistence: [js/wizard.js:51-67](js/wizard.js#L51-L67)
- Step skip logic: [js/wizard.js:108-115](js/wizard.js#L108-L115)
- Source cascading: [js/wizard-source.js:71-114](js/wizard-source.js#L71-L114)
- SOP auto-lock: [js/wizard-scope.js:80-94](js/wizard-scope.js#L80-L94)
- Items render + ensure-state: [js/wizard-items.js:33-58](js/wizard-items.js#L33-L58)
- Review summary build: [js/wizard-review.js:48-72](js/wizard-review.js#L48-L72)
- Confirm flow + flag-as-indexed: [js/wizard.js:155-178](js/wizard.js#L155-L178)
- Item row Handlebars template: [index.html:392](index.html#L392)
- Review card Handlebars template: [index.html:419](index.html#L419)
