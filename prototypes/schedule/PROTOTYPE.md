# Schedule Prototype

## META
- **Path**: `prototypes/schedule/`
- **Pages**: `index.html`
- **Stylesheets**: `css/schedule.css`, shared `../gantt.css`, `../shared-borders.css`, `../shared-accent.css`, `../shared-chrome.css`
- **JS**: `js/schedule.js`; shared `../schedule-model.js` (phase windows per placement) and `../gantt.js` (renderer)
- **Data**: `../programs/js/data.js`
- **Navigation entry**: `canvas-navigation-data.json`, "Schedule" tab after "Exhibitions"

## PURPOSE
The complete Gantt timeline. One row per exhibition at a museum (a "placement"), grouped by exhibition or by museum.

- Phase blocks: Planning, Preparation, Installation, Opening, Dismantling. The phase in progress is outlined in the placement's status color (green on track, amber at risk, red delayed); past phases are faded.
- Milestones: the opening date (filled diamond, dated) and the closing date (hollow diamond). A dashed line marks today (20 Feb 2026).
- Filters: exhibition, museum, phase (current phase), status, and a time range. "Clear filters" resets the first four.
- A block, a milestone or a row label opens the exhibition detail for that museum (`program-detail.html?code=…&site=…`).

The dashboard shows only the next openings, using the same renderer.

## NOTES
- Phase dates are derived from the opening date (see `schedule-model.js`), not stored in the data.
