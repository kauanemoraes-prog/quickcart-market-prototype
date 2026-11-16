# Help Landing Page

## META
- **Path**: `prototypes/help-landing-page/`
- **Files**:
  - `index.html` — page-content with hero + bento + categories + split + videos + CTA
  - `css/main.css` — entry, layout rhythm, shared section head, `@import`s 6 modules
  - `css/hero.css` — gradient hero with search + chips
  - `css/bento.css` — bento spotlight (1 large + 2 small)
  - `css/categories.css` — 4-column icon cards
  - `css/split.css` — 2-column popular articles + changelog
  - `css/videos.css` — 3-column video thumbnails
  - `css/cta.css` — full-width help CTA card
  - `js/main.js` — IIFE with `safeInit()` bound to `davinci:canvas:ready`
- **Dependencies**: DaVinci canvas, MDS, plugins (auto-loaded)
- **Navigation**: registered in workspace-root `canvas-navigation-data.json` as `Help`

## PURPOSE
Marketing-style landing page for the Help / User Guide section. Layout-driven scaffold with placeholder copy — no live data, all links are `href="#"`.

## LAYOUT GRID (top → bottom)
1. **Hero** (`.help-hero`) — gradient banner: logo, title, subtitle, MDS search input, popular-search chips
2. **Bento spotlight** (`.help-bento`) — 2-col / 2-row grid: 1 large featured guide (spans both rows) + 2 stacked side cards (one accent-colored "What's new", one "Most watched")
3. **Categories** (`.help-categories`) — section head + 4-column grid of icon cards (Programs / Equipment / Stations / Settings)
4. **Split** (`.help-split`) — 2-column: numbered popular-articles list + dated changelog with tags
5. **Videos** (`.help-videos`) — section head + 3-column thumbnail grid with play overlay and duration pill
6. **CTA** (`.help-cta`) — full-width card: intro on the left + two action buttons (Community / Contact support)

## UI COMPONENTS
- **MDS Form Input** (medium / floating label) — hero search field
- **SF Symbols** — atom (hero logo), folder/cube/building/gearshape (categories), sparkles, bell, play, chart-bar, lightbulb, bubble-left-and-bubble-right, envelope, arrow-right
- **Custom layout**: gradient hero, bento grid, icon cards, numbered list, changelog list, video thumbnails, split CTA card

## CUSTOM CSS PATTERNS
- Linear gradients on `.help-hero`, `.help-bento__featured`, and the three `.help-video__thumb` variants — literal hex colors used for the decorative artwork
- All other styling uses MDS design tokens (`var(--space-*)`, `var(--color-*)`, `var(--font-*)`)
- No padding on `.help-landing-page` wrapper — canvas `.content` provides outer padding
- Hover affordances: `transform: translateY(-2px)` on hoverable cards/links + accent border-color
- Heading typography untouched — eyebrows, ranks, dates and tags all use `<span>` with custom classes

## NOT IMPLEMENTED
- Search functionality (input is decorative)
- Chip / category / article / video / CTA destinations (all `href="#"`)
- No JS interactivity — `js/main.js` only logs init

## AI ANALYSIS SHORTCUTS
- Hero: [`css/hero.css`](css/hero.css), markup `index.html` lines 21-39
- Bento: [`css/bento.css`](css/bento.css), markup `index.html` lines 42-72
- Categories: [`css/categories.css`](css/categories.css), markup `index.html` lines 75-105
- Split (popular + changelog): [`css/split.css`](css/split.css), markup `index.html` lines 108-186
- Videos: [`css/videos.css`](css/videos.css), markup `index.html` lines 189-221
- CTA: [`css/cta.css`](css/cta.css), markup `index.html` lines 224-244
