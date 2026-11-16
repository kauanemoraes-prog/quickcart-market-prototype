/**
 * Add forms
 * The forms to add a product (Products tab) and an equipment or consumable (Equipment/Consumables tab) to the store.
 *   AddForms.productHtml() / AddForms.readProduct(form, site)  ->  { data, area } or { error, field }
 *   AddForms.itemHtml()    / AddForms.readItem(form, site)     ->  { data } or { error, field }
 * They use the form styles of the Employees tab (emp-form).
 */

(function() {
  'use strict';

  var PACKS = ['Single', 'Pack of 2', 'Pack of 4', 'Pack of 6', 'Pack of 12'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function opts(list, sel) { return list.map(function(v) { return '<option' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join(''); }
  function areas() { return window.DetailData.getLines().map(function(l) { return l.name; }); }

  function money(text) {
    var t = String(text).trim().replace(/^R\$\s*/, '');
    var v = Number(t.indexOf(',') > -1 ? t.replace(/\./g, '').replace(',', '.') : t);
    return isFinite(v) && v >= 0 && t !== '' ? Math.round(v * 100) / 100 : null;
  }
  function count(text) { var t = String(text).trim(); return /^\d+$/.test(t) ? parseInt(t, 10) : null; }

  function field(label, input, wide) { return '<label class="emp-form__field' + (wide ? ' emp-form__field--wide' : '') + '">' + label + input + '</label>'; }
  function input(name, extra) { return '<input type="text" name="' + name + '" class="form-input" autocomplete="off" ' + (extra || '') + '>'; }
  function select(name, list, sel) { return '<select name="' + name + '" class="form-select form-select--stylized">' + opts(list, sel) + '</select>'; }

  window.AddForms = {
    productHtml: function() {
      return '<form class="emp-form" id="add-product-form" novalidate>' +
        field('Area', select('area', areas())) +
        field('Product name *', input('name'), true) +
        field('Brand *', input('brand', 'list="add-product-brands"') + '<datalist id="add-product-brands">' + window.ProductsData.brands().map(function(b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist>') +
        field('Variant', input('variant')) +
        field('Package size', input('size', 'placeholder="For example, 1 L"')) +
        field('Pack', select('pack', PACKS)) +
        field('SKU *', input('sku')) +
        field('Barcode', input('ean', 'inputmode="numeric"')) +
        field('Price *', input('price', 'placeholder="R$ 0,00" inputmode="decimal"')) +
        field('Min. stock', input('min', 'value="100" inputmode="numeric"')) +
        field('Shelf location', input('location'), true) +
        '<p class="emp-form__hint" style="grid-column:1/-1;margin:0;font-size:var(--font-size-tiny);color:var(--color-glyph-gray-secondary)">The product starts with no stock (Out of stock) until the first delivery is received.</p>' +
        '<p class="emp-form__error" id="add-form-error" hidden></p>' +
        '<div class="emp-form__actions"><button type="submit" class="btn btn--primary btn--medium">Add product</button></div></form>';
    },
    readProduct: function(form, site) {
      var v = {};
      ['area', 'name', 'brand', 'variant', 'size', 'pack', 'sku', 'ean', 'price', 'min', 'location'].forEach(function(k) { v[k] = form.elements[k].value.trim(); });
      if (!v.name) return { error: 'Enter the product name.', field: 'name' };
      if (!v.brand) return { error: 'Enter the brand.', field: 'brand' };
      if (!v.sku) return { error: 'Enter the SKU.', field: 'sku' };
      var price = money(v.price), min = count(v.min || '0');
      if (price == null) return { error: 'Enter the price, like 12,90.', field: 'price' };
      if (min == null) return { error: 'The minimum stock must be a whole number.', field: 'min' };
      if (window.ProductsData.getInventory(site).some(function(r) { return r.sku.sku.toLowerCase() === v.sku.toLowerCase(); })) return { error: 'The SKU ' + v.sku + ' already exists in this store.', field: 'sku' };
      return { area: v.area, data: { name: v.name, brand: v.brand, variant: v.variant, size: v.size, packQty: v.pack === 'Single' ? 1 : parseInt(v.pack.replace(/\D/g, ''), 10), sku: v.sku, ean: v.ean, price: price, min: min, location: v.location } };
    },
    itemHtml: function() {
      return '<form class="emp-form" id="add-item-form" novalidate>' +
        field('Type', select('type', ['Equipment', 'Consumable'], 'Consumable')) +
        field('Area', select('area', areas())) +
        field('Item name *', input('name'), true) +
        field('Brand', input('brand')) +
        field('Model / variant', input('model')) +
        field('Code *', input('code')) +
        field('Unit', input('unit', 'value="Each"')) +
        field('Unit cost', input('cost', 'placeholder="R$ 0,00" inputmode="decimal"')) +
        field('Quantity in store', input('qty', 'value="1" inputmode="numeric"')) +
        field('Minimum quantity', input('min', 'value="1" inputmode="numeric"')) +
        field('Supplier', input('supplier')) +
        '<p class="emp-form__error" id="add-form-error" hidden></p>' +
        '<div class="emp-form__actions"><button type="submit" class="btn btn--primary btn--medium">Add item</button></div></form>';
    },
    readItem: function(form, site) {
      var v = {};
      ['type', 'area', 'name', 'brand', 'model', 'code', 'unit', 'cost', 'qty', 'min', 'supplier'].forEach(function(k) { v[k] = form.elements[k].value.trim(); });
      if (!v.name) return { error: 'Enter the item name.', field: 'name' };
      if (!v.code) return { error: 'Enter the code.', field: 'code' };
      var cost = v.cost ? money(v.cost) : 0, qty = count(v.qty), min = count(v.min);
      if (cost == null) return { error: 'Enter the cost, like 12,90.', field: 'cost' };
      if (qty == null) return { error: 'The quantity must be a whole number.', field: 'qty' };
      if (min == null) return { error: 'The minimum quantity must be a whole number.', field: 'min' };
      if (window.SuppliesData.getInventory(site).some(function(r) { return r.item.code.toLowerCase() === v.code.toLowerCase(); })) return { error: 'The code ' + v.code + ' already exists in this store.', field: 'code' };
      return { data: { type: v.type, area: v.area, name: v.name, brand: v.brand || '—', model: v.model || '—', code: v.code, unit: v.unit || 'Each', cost: cost, qty: qty, min: min, supplier: v.supplier } };
    }
  };
})();
