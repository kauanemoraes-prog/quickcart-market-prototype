# Products (network)

Every product of every store of every city in one table: one row per product and store (about 14,000 rows). Reached from
the **Products** tab of the top navigation, next to Location.

- `index.html` - page shell; uses the data and CSS of `../programs` (store Products tab) so both tables look the same.
- `js/network-products.js` - the table. Columns: Product, Store, City, Area name, Brand, Variant, Status, Package Size, Pack,
  SKU, Barcode, Price, Discount, Promo Price, Stock, Min. Stock, Shelf Location, Expiry Alert. Product and Store are fixed
  columns (shared edge shadow from `programs/css/sticky-shadows.css`).
- Filters: search, City / Store / Area multi-selects (the Store list follows the chosen cities), quick filters (All, Low stock,
  Out of stock, Expiring, Edited). Sorting on the columns that make sense, resizable columns, 50/100/250 rows per page.
- **Editable**: click a cell, type, Enter saves, Esc cancels. Editable: everything except Store, City, Status and Expiry Alert.
  Status follows stock and minimum; Discount and Promo Price follow each other and the Price. Edited cells are tinted, the
  "Edited" filter lists the edited rows and "Reset N edits" undoes all. Edits live in the page only (lost on reload).
- `css/network-products.css` - page header, editable cells, pager.
