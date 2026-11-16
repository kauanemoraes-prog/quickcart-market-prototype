# Finance (network)

Finances of the whole network, to compare stores, cities and regions. Reached from the **Finance** tab of the top navigation.
It summarizes and compares; the details live in the store pages (Revenue, Purchase Spend), which the store drawer links to
(`program-detail.html?code=..&site=..&tab=revenue`).

- `index.html` - page shell (uses `../programs` data, CSS and the multi-select, table-resize and finance scripts).
- `js/finance-network-data.js` - `window.NetFinance`: per store and period it gives Net Sales and supplier invoices (from
  `programs/js/finance-data.js`), generated Operating Expenses (utilities, rent, cleaning, security, systems, maintenance,
  logistics), generated Labor Cost (hours and cost per department and month, no individual pay), budgets (about 3 in 4 stores
  have one) and the trend series. Everything is deterministic, so cards, tables, charts and reports agree.
- `js/finance-network.js` - the UI. Top: period (Day, Week, Month, Quarter, Year, Custom), "Compare with" (previous period or
  same period last year, disabled when there is no data), Region / State / City / Store filters (they cascade), section filters
  (category, supplier, department) and Clear filters. The subtitle always states period and scope ("February 2026 · all 83 stores").
  - **Overview**: six clickable indicators (Net Sales, Purchase Spend, Operating Expenses, Labor Cost, Invoices Overdue, Budget
    Variance, each with change vs the comparison and number of stores), a trend chart (series on/off in the legend, Day/Week/Month,
    click a point to open that bucket) and **Store Financial Comparison** (sortable; purchases, expenses, labor and total cost as
    absolute values and as % of net sales; changes vs previous; budget variance; status with the reasons; row opens a store drawer).
  - **Spend**: Purchase Spend (totals, awaiting/overdue, orders in transit, bars by supplier / product category / store that filter
    on click, invoice table with a drawer of items and a document) and Operating Expenses (composition by category, group by
    store / city / region / category / supplier, expense table with a drawer and a document).
  - **Labor**: aggregated by store, department or both; hours, overtime, cost, % of net sales, change. Locked when "Viewing as" is
    Operations team. Individual pay never exists in the page.
  - **Generate report**: financial by store, store comparison, spend by category, spend by supplier, pending and overdue
    invoices, labor by store and department; CSV or PDF (print dialog). Each report states period, comparison, scope, filters,
    viewing access, generation date and data notes (missing budgets, restricted labor, empty scope).
- Definitions: net sales are registered sales, not cash received; invoices and expenses count by their date and carry a payment
  status; profit is not calculated (no full cost model).
