# Dashboard Prototype

## META
- **Path**: `prototypes/dashboard/`
- **Pages**: `index.html`
- **Stylesheets**: `css/dashboard.css`, plus the shared `../shared-borders.css` and `../shared-accent.css`
- **JS**: `js/dashboard.js`
- **Data**: reuses `../programs/js/data.js` (cities, their stores and the per-store counters derived at the bottom of that file)
- **Navigation entry**: `canvas-navigation-data.json`, "Dashboard" tab, first in `mainNavigation`

## PURPOSE
Network dashboard for the QuickCart Market supermarket chain. It answers: which stores need attention, where the problems concentrate, what was done and what arrives next.

- **Scope select** (header): entire network or one region. The subtitle always states the scope and the store count.
- **Indicators** (five buttons): stores needing attention, products below minimum, overdue tasks, late purchase orders, unavailable equipment. Selecting one changes the store list and the concentration card.
- **Stores needing attention**: the stores behind the selected indicator, most affected first, each with its issue, city, manager and a link to the store detail.
- **Where it concentrates**: stores with the selected issue per region (per state once a region is selected), with the most affected cities.
- **Recent Activity** and **Upcoming Deliveries** in the lower area.
- Primary action **Add Store** opens `../programs/index.html?add=scratch`.

## NOTES
- Deadlines are measured from a fixed reference date (`TODAY` in `js/dashboard.js`, 20 Feb 2026) because the mock data is dated around that time.
- Store counters (low stock, overdue and blocked tasks, late orders, unavailable equipment), suppliers and delivery dates are generated from each store's status in `programs/js/data.js`; they are mock values.
- Activity events are picked from a fixed list in `js/dashboard.js`.
