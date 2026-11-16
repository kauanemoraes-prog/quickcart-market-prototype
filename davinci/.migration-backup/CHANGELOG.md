# Changelog

All notable changes to the DaVinci Distribution will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.10.4] - 2026-06-19

### Update script syncs navbar logo assets


## [2.10.3] - 2026-06-19

### Showcase & navbar fixes

- fixing componnents orders in mds showcase
- adding disclaimer of download
- Fix build-dist to ship navbar logo assets (Venturus) in distribution


## [2.10.2] - 2026-06-16

### Navbar component bug fixes

- updating diagrams
- fix navigation to add Venturus reference and other cosmetics


## [2.10.1] - 2026-06-15

### Navbar branding + per-page navbar-right

- intro protos update
- MDS rename to Monalisa UI Lib
- ditch roocode support
- add pittfall for colors
- fix 404 link
- removing stale file
- empty state component revamp
- updating colors migration table


## [2.10.0] - 2026-06-03

### Prototype map files architecture

- fixing styling of lebel inside select components
- adding custom dropdown styles + revamped empty state component


## [2.9.6] - 2026-05-27

### Maintenance release

- Fix: footer no longer contributes to the overall height of `<main>`, restoring correct page layout.

## [2.9.5] - 2026-05-27

### Faster davinci-update

- Fix: `davinci-update.sh` now syncs `assets/` with `rsync -a --delete` instead of `rm -rf && cp -R`. The old approach rewrote all ~4,500 files on every update (98% of which is the legacy `icons/regular/` SVG set), causing painfully slow updates on machines with cloud sync (iCloud/Dropbox/OneDrive), antivirus scanning, or Spotlight reindexing. rsync only rewrites changed files.
- Perf: legacy `assets/icons/regular/` (4,414 SVGs) is now excluded from rsync once seeded — the icons never change, so subsequent updates skip stat'ing them entirely. Self-heals if the directory is missing locally or removed from a future release.

## [2.9.4] - 2026-05-27

### Build & update reliability fixes

- Fix: `build-dist.sh` now mirrors `assets/` with `rsync` instead of explicit per-subdir `cp`. Eliminates the failure mode behind the v2.9.0 (missing `sf-symbols/`) and v2.9.1 (missing `avatars/`) hotfixes — any new asset subdir ships automatically without editing the build script.
- Fix: `davinci-update.sh` now reads `.update-manifest` shipped inside the release to determine which root files to sync (CLAUDE.md, MIGRATIONS.md, companion docs, YAML, self). Replaces the hardcoded file list that required touching the script for every new companion file. Self-recovery precheck reuses the same manifest so missing-file detection stays in sync automatically. Legacy fallback retained for pre-2.9.4 releases.
- Fix: `build-dist.sh` auto-changelog injection now skips when `## [<version>]` heading already exists, preventing duplicate entries when a curated changelog entry was written before the build.

## [2.9.3] - 2026-05-22

### Hotfix: davinci-update.sh self-recovery for missing companion files

- Fix: `davinci-update.sh` now detects when expected companion files (`PITFALLS.md`, `TROUBLESHOOTING.md`, `CHECKLIST.md`, `HEURISTICS.md`, `MIGRATIONS.md`, `CLAUDE.md`) are missing and forces a re-sync — even when the local version matches the remote and the last-check timestamp is recent. Designers stuck on 2.9.x with missing companion files (because their previous old script's file list didn't include them) recover automatically on next `./davinci-update.sh` run, with no manual `.version` / `.davinci-last-check` cleanup needed.

## [2.9.2] - 2026-05-21

### Hotfix: avatar images missing from distribution

- Fix: `build-dist.sh` now copies `assets/avatars/` (12 placeholder avatars) into `Dist/`. v2.9.0 and v2.9.1 were missing these files, causing "Failed to load resource: avatar-N.jpg 404" on designer workspaces using impersonation. Re-run `./davinci-update.sh` to get the fix.

## [2.9.1] - 2026-05-21

### Hotfix: SF Symbols files missing from distribution

- Fix: `build-dist.sh` now copies `assets/canvas/sf-symbols/` (default.css, replace.css, sf-symbol.js) into `Dist/`. v2.9.0 was missing these files, causing "Canvas Error: Failed to load css: ../../assets/canvas/sf-symbols/default.css" on designer workspaces after auto-update. Re-run `./davinci-update.sh` to get the fix.

## [2.9.0] - 2026-05-21

### Token economy refactor, SF SaaS, fixed avatars

- Adding SF SaaS to DaVinci — canvas auto-loads `<sf-symbol>` web component, updated icons.md and SF SYMBOLS sections in CLAUDE files; legacy SVG path still supported for existing prototypes
- Fix for CORS policy on SF SaaS
- Adding fixed avatars — 12 local placeholder images at `assets/avatars/avatar-1..12.(jpg|png)` replace `i.pravatar.cc` URLs; updated `davinci-users.json`, MDS `avatars.html`, and impersonation field rules
- Token economy refactor: added `EFFICIENCY BASELINE` to CLAUDE.md / CLAUDE-DIST.md (11 pillars governing token usage); extracted PITFALLS, TROUBLESHOOTING, and CHECKLIST from always-loaded files into on-demand companion files
- Added `HEURISTICS.md` — Nielsen's 10 usability heuristics with DaVinci-specific prescriptions, applied before scaffolding any prototype
- Added `CLAUDE-EFFICIENCY-GENERIC.md` — framework-agnostic baseline for use in other Claude projects
- Fixed footer-rendered-inside-main bug caused by nested `<script>` tags inside `<script id="page-content">`; hardened with CANVAS ARCHITECTURE rule, corrected HANDLEBARS example, and updated reference prototype
- Reference prototype modernized: `script.js` → `js/main.js`, removed page-wrapper padding and `@media` query, added Handlebars table demo, added template-only header comment
- Fixed architecture prototype: missing JS for mermaid
- Removed dev-side `MANDATORY VERSION CHECK` from `CLAUDE.md` — explicit no-auto-update section added to prevent overwriting in-progress source. Designer-facing check remains in `CLAUDE-DIST.md`
- Build scripts (`build-dist.sh`, `davinci-update.sh`) updated to copy and distribute the four new companion files

## [2.8.0] - 2026-05-13

### User impersonation, build speedup, dead parts cleanup

- fixing footer responsiviness
- Add MIGRATIONS.md maintenance reminder to dev instructions
- Add 2.7.0 migration entries to MIGRATIONS.md


## [2.7.0] - 2026-05-12

### 8px grid system, heading typography, migrations, pills component

- fixing spacing for majority of components to use 8px increments (and 4px only for text spacing between icons)
- adding capability of self fix after components update


## [2.6.4] - 2026-05-12

### Fix pill icon size, tabs height, add migrations system

- Fix pill icon size, tabs height, add migrations system


## [2.6.3] - 2026-05-12

### Tag sizes, pill tabs, tabs redesign, pills component

- MDS updates: tag sizes, pill tabs variant, tabs redesign


## [2.6.2] - 2026-05-12

### Fix spacing, breadcrumb redesign, add pills component

- adding new pill component
- fixing a few MDS css's
- fixes on offline export mode


## [2.6.1] - 2026-04-30

### Fix table sort and filter icon behavior

- fix table icon issue
- ocluding training roadmap from docs
- fixing versioning bug


## [2.6.0] - 2026-04-30

### Table sort indicators and filter icons

- fixing table status indicator and adding sorting
- adding missing doc to custom navbar feature
- moving MDS showcase to its own prototype
- fixing typography responsives
- architecture updates
- adding new badge counter component to MDS
- tidying up menu
- removing "canvas" from "DaVinci Canvas" mentions (comsetics)
- adding new components and update documentation
- fix step counter


## [1.1.0] - 2026-04-30

### Table sort indicators and filter icons

- fixing table status indicator and adding sorting
- adding missing doc to custom navbar feature
- moving MDS showcase to its own prototype
- fixing typography responsives
- architecture updates
- adding new badge counter component to MDS
- tidying up menu
- removing "canvas" from "DaVinci Canvas" mentions (comsetics)
- adding new components and update documentation
- fix step counter


## [2.5.5] - 2026-04-22

### Move user plugins to workspace root

- add check to auto release via GH or SSH


## [2.5.4] - 2026-04-22

### Preserve user plugin files during updates


## [2.5.3] - 2026-04-17

### Fix offline distribution script

- fix: embed unified `header.html` template (replaces outdated navbar/subheader/ribbon split)
- fix: embedded template IDs now match canvas framework (`davinci-template-header`)
- add: copy `change-history-system.js`, plugin files, and icons to offline package
- fix: path fixups for `header.html` in offline depth
- add: stale-asset detection on re-runs
- fix: `build-dist.sh` file paths for `davinci-update.sh` and `ui-ux-designer-export.yaml`


## [2.5.2] - 2026-04-16

### Intro prototype: visual polish, DRY content, designer-friendly setup guide

- Setup guide: CSS modular migration (styles.css → css/ folder with 5 modules)
- New visual components: terminal blocks, callout boxes, settings cards, action badges
- DRY content: wizard is single source of truth, reference guide built dynamically via JS
- Shared steps (1-3) shown once, then AI tool selector, then tool-specific steps
- Apple Homebrew callout: warns designers it's different from regular Homebrew
- SSH passphrase guidance: always press Enter (no passphrase)
- Claude Code shown first as default in reference guide
- Tool selector upgraded from toggle buttons to wizard-style cards

## [2.5.1] - 2026-04-16

### Fix update script for sandboxed environments

- fix: update script — revert to gh api, skip icons, fix timeout stall
- adding components and updating help
- gitignore: ignore entire Dist/ folder
- Remove Dist/ from git tracking (now in .gitignore)
- Add Dist/ to .gitignore


## [2.5.0] - 2026-04-16

### Custom components, Claude Code support, interactive setup wizard

- Intro page overhaul: setup wizard, Claude Code support, tool-agnostic docs
- add components capability docs
- adding custom component capabilities


## [2.4.6] - 2026-04-15

### PROTOTYPE.md: inline trigger checklist into workflow step


## [2.4.5] - 2026-04-15

### PROTOTYPE.md: mandatory verbalization for update decisions


## [2.4.4] - 2026-04-13

### Fix MDS docs: correct token names for colors, typography, line-heights


## [2.4.3] - 2026-04-13

### White bg for sub-header, updated subtitle typography


## [2.4.2] - 2026-04-13

### Simplify update script: gh-only auth, remove SSH dependency


## [2.4.2] - 2026-04-13

### Simplify update script: gh-only auth, remove SSH dependency


## [2.4.1] - 2026-04-13

### MDS Table hi-fi spec, fill-secondary contrast fix, Tag margin cleanup

- fixing table heights
- update to color to enhance contrast
- changes to auto-update
- MDS: replace fill-secondary #FBFBFD with #F3F3F3 for better contrast


## [2.4.0] - 2026-04-10

### SSH version check, auto-setup gh CLI, streamlined release


## [2.3.9] - 2026-04-09

### Enforce PROTOTYPE.md updates with objective trigger checklist


## [2.3.8] - 2026-04-08

### Fix MDS vulnerabilities, cleanup build process, fix changelog display


## [2.3.7] - 2026-04-08

### Add network timeouts and fix mktemp on macOS


## [2.3.6] - 2026-04-08

### Fix auto-update: safe file sync and self-exec guard


## [2.3.5] - 2026-04-08

### Move version check to customInstructions for Roo enforcement


## [2.3.4] - 2026-04-08

### Run version check every task with daily cache


## [2.3.3] - 2026-04-08

### Lightweight version check on every task


## [2.3.2] - 2026-04-08

### Fix update script GH_HOST for enterprise GitHub


## [2.3.1] - 2026-04-07

### Auto-generated changelog & build fixes

- Add v2.3.0 changelog entry
- fix gh dist


## [2.3.0] - 2026-04-07

### Added
- Auto-update script (`davinci-update.sh`) — AI checks for DaVinci updates at session start and applies them seamlessly
- Mandatory version check instruction in CLAUDE.md and YAML — ensures designers always run on the latest version
- Version auto-sync across all files during build (CLAUDE.md, YAML, package.json, intro prototype)

### Changed
- Streamlined release process — single `./build-dist.sh` command now handles version bump, file patching, build, commit, tag, and optional GitHub release
- Root `CLAUDE.md` is now the single source of truth (eliminated stale `assets/CLAUDE.md` duplicate)
- Simplified `package.json` scripts — removed redundant version/release commands, kept only `build`
- ZIP now includes CLAUDE.md, YAML, and update script (previously excluded)
- VERSION JSON simplified — removed hardcoded component versions

### Fixed
- Synced `package.json` version with actual release version (was stuck at 2.0.0)

## [2.2.0] - 2026-03-30

### Added
- Added subheader custom HTML injection capability
  - Subheader template now supports `htmlContent` property for injecting custom HTML
  - Enables interactive controls (buttons, dropdowns, search, filters) in subheader
  - Maintains backward compatibility with simple string titles
- Added comprehensive subheader documentation (`assets/canvas/SUBHEADER-CUSTOM-HTML.md`)
- Added subheader examples reference file (`assets/canvas/SUBHEADER-EXAMPLES.json`) with 9 practical patterns
- Updated build script to automatically include subheader documentation in distributions

### Changed
- Updated UI/UX Designer mode to v2.2.0 with automatic subheader HTML generation
  - LLM now detects when designer requests controls in subheader
  - Automatically generates properly escaped JSON with MDS components
  - Includes comprehensive examples and troubleshooting guidance
- Enhanced Canvas framework subheader visibility logic to support both title and htmlContent properties
- Updated `assets/canvas/davinci-canvas.js` hasSubheader check for custom HTML support
- Updated Canvas and Monalisa Design System component versions to 2.2

### Documentation
- Added detailed usage guide with 3 methods: simple string, hide subheader, custom HTML
- Added 8 real-world examples: controls, search, tabs, multiple controls, etc.
- Added best practices for HTML structure, quote escaping, and MDS component usage
- Added migration guide for converting manual subheader HTML to navigation data
- Added troubleshooting section for common subheader issues

## [2.0.3] - 2026-03-09

### Changed
- Updated distribution build process for version 2.0.3
- Refined package structure and documentation

## [2.0.0] - 2026-03-09

### Added
- Added SF Symbols icon library with 4,414+ icons in `assets/icons/regular/`
- Added 22 individual MDS component files for efficient component access
- Added component index catalog (`_component-index.md`) for quick component discovery
- Added MDS component extraction script for automated maintenance
- Added comprehensive migration guide for MDS component extraction
- Added color migration documentation and prototype
- Added colors handoff example prototype
- Added UI/UX Designer mode export configuration (YAML)

### Changed
- **BREAKING**: Standardized icon usage to regular style only (removed bold and light variants)
- **MAJOR**: Restructured Monalisa Design System with modular component files (98% token reduction)
- Updated UI/UX Designer profile to v2.0.0 with component file references
- Optimized styles and scripts for better performance across all prototypes
- Improved asset organization and loading efficiency
- Updated build script to only copy regular icons directory
- Enhanced documentation structure with component-specific files
- Canvas now loads MDS JavaScript sequentially after content injection (previously parallel)

### Fixed
- **CRITICAL**: Fixed MDS JavaScript component initialization timing issue
  - Popovers and other JS-dependent components now work on first usage without manual re-initialization
  - Reordered Canvas script loading to inject content before loading MDS JavaScript
  - Removed 100+ lines of workaround code from test prototype
  - Components are now found by MDS initialization on first try
- Updated `assets/canvas/davinci-canvas.js` to load MDS JS after content injection
- Cleaned up `prototypes/mds-components-test/js/main.js` (removed manual popover initialization)
- Fixed icon loading and display issues
- Fixed build script to handle missing icon variant directories
- Fixed JavaScript module loading patterns in UI/UX Designer mode
- Fixed CSS and JS file organization for better maintainability

### Performance
- 98% token usage reduction per component lookup (80,000 → 1,300 tokens)
- 10x faster component discovery with direct file access
- 20-30% faster prototype creation overall
- Minimal performance impact from sequential JS loading: ~25-50ms additional load time (imperceptible)

### Documentation
- Added comprehensive architecture analysis in `plans/mds-js-components-architecture-analysis.md`
- Added implementation summary in `plans/mds-js-components-fix-implementation.md`
- Updated `prototypes/mds-components-test/PROTOTYPE.md` to reflect automatic popover handling

## [1.5.1] - 2026-02-24

### Fixed
- Fixed JavaScript module loading and initialization patterns in UI/UX Designer mode export configuration

## [1.5.0] - 2026-02-24

### Added
- Added prototype information modal accessible via help button (?) in navbar
- Added comprehensive help documentation explaining prototype limitations and DaVinci tool purpose
- Added modal functionality for displaying prototype usage guidelines

### Changed
- Enhanced navbar with interactive help button
- Improved user understanding of prototype static nature and data persistence limitations
- Updated build script to optimize distribution package structure

### Removed
- Removed deprecated CSS files from Monalisa Design System (migrated to consolidated monalisa.css)
- Removed deprecated JavaScript files (showcase.js, table-sort.js) in favor of modular structure

## [1.4.1] - 2026-02-12

### Added
- Added `files` folder to distribution package containing `icon.png` for proper icon support

### Changed
- Updated build script to include files folder with icon.png in the distribution zip

## [1.4.0] - Previous Release

### Added
- DaVinci framework
- Monalisa Design System
- Canvas navigation and styles
- Reference prototype
- Offline templates support
