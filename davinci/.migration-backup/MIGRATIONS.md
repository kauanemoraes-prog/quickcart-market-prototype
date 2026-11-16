# DaVinci Migrations

When DaVinci updates introduce breaking changes, this file documents what to search for and how to fix it. After an update, scan all prototypes for deprecated patterns and apply the fixes listed below.

---

## Unreleased

### Map architecture migration — split by area

DaVinci's preferred prototype architecture is `js/` + `css/` + `maps/` with a router-style `PROTOTYPE.md`. **Existing legacy prototypes keep working.** Migration happens in two tiers based on risk:

**Tier 1 — Auto-migrate maps for already-modular code (any touch, zero risk):**

When Claude touches a prototype, it automatically creates missing map files for code that's already in modular form:
- `js/<name>.js` exists → ensure `maps/js/<name>.md` (create if missing)
- `css/<name>.css` exists → ensure `maps/css/<name>.md` (create if missing)
- HTML files at prototype root → ensure `maps/html/<name>.md` (create if missing)

This applies even on trivial changes (color tweaks, copy edits). Maps are pure documentation — adding them carries zero functional risk and immediately reduces context cost on every subsequent read. Once `maps/` exists for any area, `PROTOTYPE.md` is rewritten as the router; pre-modular files (if any remain) get a `[LEGACY]` tag in the router until they migrate.

**Tier 2 — Opportunistic code split for pre-modular files (structural triggers only):**

`script.js` / `styles.css` at prototype root are legacy and stay legacy unless a structural change forces the split:
- Adding/removing/renaming a feature (changes file count or paths)
- Hitting the 500/300-line modular threshold
- A module's purpose shifts meaningfully (capability change)
- Integration points change (new canvas event, new global dependency)
- Designer explicitly requests migration

Trivial changes on pre-modular files happen in place — DO NOT force splitting `script.js` for a one-line color change.

**Audit your workspace** (run from workspace root, optional — for visibility):

```bash
# 1. Pre-modular prototypes (legacy script.js / styles.css at root)
for p in prototypes/*/; do
  { [ -f "$p/script.js" ] || [ -f "$p/styles.css" ]; } && echo "PRE-MODULAR: $p"
done

# 2. Modular but no maps/ directory (Tier 1 auto-migration target on next touch)
for p in prototypes/*/; do
  { [ -d "$p/js" ] || [ -d "$p/css" ]; } && [ ! -d "$p/maps" ] && echo "NO-MAPS: $p"
done

# 3. Map ↔ source mismatch in already-migrated prototypes (orphans either direction)
for p in prototypes/*/; do
  [ -d "$p/maps" ] || continue
  for src in "$p"js/*.js "$p"css/*.css "$p"*.html; do
    [ -e "$src" ] || continue
    name="$(basename "$src")"
    case "$src" in
      *.js)   map="$p/maps/js/${name%.js}.md" ;;
      *.css)  map="$p/maps/css/${name%.css}.md" ;;
      *.html) map="$p/maps/html/${name%.html}.md" ;;
    esac
    [ -f "$map" ] || echo "ORPHAN SOURCE (no map): $src"
  done
done

# 4. Mixed legacy + modular state (always forbidden — dead-files problem)
for p in prototypes/*/; do
  [ -f "$p/script.js" ] && [ -d "$p/js" ] && echo "MIXED JS: $p"
  [ -f "$p/styles.css" ] && [ -d "$p/css" ] && echo "MIXED CSS: $p"
done

# 5. Parallel docs (anything other than PROTOTYPE.md at prototype root — always cleanup)
find prototypes/ -maxdepth 2 -name "*.md" ! -name "PROTOTYPE.md" -type f
```

**Tier 1 migration steps** (Claude performs automatically on next touch of a Tier 1 prototype):

1. For each `js/<name>.js`, create `maps/js/<name>.md` using the JS map template (Purpose / Public surface / State / Data flow / Key sections / Gotchas).
2. For each `css/<name>.css`, create `maps/css/<name>.md` using the CSS map template (Purpose / BEM blocks / External selectors / Key sections / Gotchas).
3. For each HTML file at root, create `maps/html/<name>.md` using the HTML map template (Purpose / Page regions / Components / Dynamic content / Gotchas).
4. Rewrite `PROTOTYPE.md` as the router. If pre-modular files (`script.js`, `styles.css`) still exist, list them in the router with a `[LEGACY]` tag — to migrate later.
5. Delete any parallel doc files; consolidate any unique content into the appropriate map(s).

**Tier 2 migration steps** (when a structural trigger fires):

1. Split the legacy file (`script.js` → `js/<feature>.js`, or `styles.css` → `css/<feature>.css`).
2. Update HTML script/link references.
3. Delete the legacy file.
4. Create maps for the new modular files (Tier 1 step 1 / 2).
5. Update the router to replace any `[LEGACY]` row(s) with proper module rows.

**Always-required cleanup** (regardless of architecture choice):

- Mixed legacy + modular state (`script.js` + `js/` both present) is a dead-files problem — clean up before any feature work, even if not migrating to maps.
- Parallel doc files alongside `PROTOTYPE.md` are forbidden in both architectures — consolidate and delete.

**Reference**:
- `assets/canvas/reference-prototype/` — copy-source template demonstrating the full map architecture

---

### Empty State component restructured

`.empty-state` is now the canonical empty-state pattern reused across every MDS component (lists, dropdowns, tables, dashboards). Visual + structural changes:

- **Background**: white card (`--color-fill`) — was: transparent
- **Padding**: 16px all around — was: 32px top/bottom, 16px sides
- **Icon**: 20px, `--color-glyph-gray-secondary`, full opacity — was: 64px, `--color-glyph-gray-tertiary`, 0.3 opacity
- **Title (line 1)**: body style (14px), `--color-glyph-gray-secondary` — was: h3 (20px, `--color-glyph-gray`)
- **Subtitle (line 2)**: caption (12px), `--color-glyph-gray-tertiary` — was: 14px, `--color-glyph-gray-secondary`. Optional but visible by default.

**Markup**: replace inline SVG icons with `<sf-symbol>` and switch `<h3>` / `<p>` for `<div>`.

```
Before:
<div class="empty-state">
  <div class="empty-state__icon">
    <svg viewBox="..." fill="none">...</svg>
  </div>
  <h3 class="empty-state__title">No items found</h3>
  <p class="empty-state__subtitle">Description text</p>
</div>

After:
<div class="empty-state">
  <sf-symbol class="empty-state__icon" name="tray"></sf-symbol>
  <div class="empty-state__title">No items found</div>
  <div class="empty-state__subtitle">Subtitle with more details.</div>
</div>
```

**Detection (grep):**
```bash
grep -rln 'empty-state__icon' prototypes/ --include="*.html" | xargs grep -L 'sf-symbol'
```

**In-repo prototypes still on the legacy SVG pattern** (need migration before next dist build):
- `prototypes/manage-units/index.html` — two empty-state blocks
- `prototypes/demo-prototype/index.html` — one empty-state block

Existing legacy SVGs still render (currentColor + 20px), but the stroke scales down and looks thin. Migrate to `<sf-symbol>` for the canonical look.

---

## 2.8.0 → 2.9.0

### No breaking changes — additive release

v2.9.0 is additive for designers. Nothing in existing prototypes needs to be migrated.

**What ships new (auto-installed by `davinci-update.sh`):**
- `PITFALLS.md`, `TROUBLESHOOTING.md`, `CHECKLIST.md`, `HEURISTICS.md` arrive at workspace root. Claude reads these on demand. No designer action required.
- `assets/avatars/avatar-1..12.(jpg|png)` — 12 local placeholder avatars. Existing prototypes using `i.pravatar.cc` URLs keep working; switch to local paths when convenient.
- Reference template (`assets/canvas/reference-prototype/`) restructured: `script.js` → `js/main.js`, removed page-wrapper padding and `@media` query. Existing prototypes copied from older references are unaffected.

**No detection commands needed.**

---

## 2.6.4 → 2.7.0

### `--space-sp` (12px) removed

The `--space-sp` token has been removed from the design system. All spacing now follows an 8px grid. Replace any usage of `--space-sp` with `--space-m` (16px) or `--space-s` (8px) depending on context.

**Fix:** Replace with `--space-m` (most cases) or `--space-s` (tight layouts).

```
Before: padding: var(--space-sp);
After:  padding: var(--space-m);
```

**Detection (grep):**
```bash
grep -rn 'space-sp' prototypes/ --include="*.css" --include="*.html"
```

### Heading typography no longer overridden by components

Modal, drawer, card, empty-state, and popover title elements now inherit heading styles from the base typography (h3/h4). If prototypes used custom font-size on these title elements expecting the old component sizes, they may look different.

- Modal/Drawer titles (h3): were 2.6rem, now 2.0rem (h3 default)
- Card titles (h3): were 1.8rem, now 2.0rem (h3 default)
- Empty-state titles (h3): were 1.6rem, now 2.0rem (h3 default)
- Popover titles (h4): were semibold, now bold (h4 default)

**Detection:** Visual review — no automated fix needed. These are styling improvements, not breakage.

---

## 2.6.2 → 2.6.3

### Tags require explicit size class

The `.tag` component no longer has a default size. All tags must include either `tag--tiny` or `tag--medium`.

**Search pattern:** Any `.tag` element that has a color class (e.g., `tag--primary`, `tag--success`, `tag--warning`, `tag--danger`, `tag--gray`) but does NOT have `tag--tiny` or `tag--medium`.

**Fix:** Add `tag--medium` to preserve previous behavior.

```
Before: <span class="tag tag--primary">Label</span>
After:  <span class="tag tag--medium tag--primary">Label</span>
```

**Detection (grep):**
```bash
grep -rn 'class="tag ' prototypes/ | grep -v 'tag--tiny\|tag--medium'
```

---

## 2.6.1 → 2.6.2

### Breadcrumb separator changed from "/" to chevron icon

The breadcrumb component now uses `<img>` chevron-right icons instead of "/" text separators, and introduces `breadcrumb__current` class for the active page.

**Search pattern:** `<span class="breadcrumb__separator">/</span>` or `breadcrumb__link` used for the current (last) page.

**Fix:** Replace separator content with chevron icon, replace last-item `breadcrumb__link` with `breadcrumb__current`.

```
Before: <span class="breadcrumb__separator">/</span>
After:  <span class="breadcrumb__separator"><img src="../../assets/icons/regular/chevron-right.svg" alt="" width="12" height="12"></span>

Before: <span class="breadcrumb__link" style="color: var(--color-fill-gray);">Current Page</span>
After:  <span class="breadcrumb__current">Current Page</span>
```

**Detection (grep):**
```bash
grep -rn 'breadcrumb__separator">/</span>' prototypes/
grep -rn 'breadcrumb__link.*style=.*color' prototypes/
```

---
