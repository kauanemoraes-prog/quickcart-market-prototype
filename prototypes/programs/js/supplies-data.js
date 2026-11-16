/**
 * Supplies Data
 * The equipment and consumables of a store (the Equipment/Consumables tab): what the store has, how many, where it is kept
 * and in what condition. Quantities are generated per store, except for the items that an open issue of the Areas tab is
 * missing: those are short or out of stock here too, so the issue, the request to buy them and this inventory tell the
 * same story.
 */

(function() {
  'use strict';

  var TODAY = new Date(2026, 11, 10);
  var DAY = 86400000;

  // name, type, area, brand, model / variant, unit, code, unit cost, minimum quantity, description
  var CATALOG = [
    // Consumables
    ['Thermal receipt paper', 'Consumable', 'Checkout', 'Rolltec', '80 mm', 'Roll', 'TRP-80', 7, 40, 'Receipt paper for the checkout terminals and label printers'],
    ['Plastic bags', 'Consumable', 'Checkout', 'EcoBag', 'Medium', 'Pack of 100', 'PBG-M', 14, 60, 'Carrier bags handed out at the checkout'],
    ['Price labels', 'Consumable', 'Grocery', 'LabelPro', '40 x 25 mm', 'Roll', 'PLB-40', 12, 30, 'Adhesive shelf and product price labels'],
    ['Meat trays', 'Consumable', 'Butcher', 'PackWell', '250 g', 'Pack of 50', 'MTR-250', 26, 30, 'Foam trays for packed meat'],
    ['Nitrile gloves', 'Consumable', 'Butcher', 'SafeHands', 'Size M', 'Box of 100', 'GLV-M', 38, 10, 'Disposable gloves for the fresh counters'],
    ['Replacement blade', 'Consumable', 'Butcher', 'SharpEdge', '300 mm slicer blade', 'Each', 'SLB-300', 140, 1, 'Spare blade for the meat slicer'],
    ['Bakery paper', 'Consumable', 'Bakery', 'PackWell', '30 cm', 'Pack of 500', 'BKP-30', 31, 20, 'Wrapping paper for bread and pastry'],
    ['Disinfectant wipes', 'Consumable', 'Cleaning', 'CleanPro', 'Tub of 120', 'Tub', 'DWP-120', 22, 20, 'Wipes for counters, scales and handles'],
    ['Battery pack', 'Consumable', 'Cleaning', 'PowerCell', '24 V', 'Each', 'BAT-24', 340, 1, 'Battery for the floor scrubber'],
    ['Absorbent pads', 'Consumable', 'Receiving & Stock Room', 'CleanPro', '40 x 50 cm', 'Pack of 10', 'ABP-10', 35, 20, 'Pads for spills and leaks'],
    ['Cable ties', 'Consumable', 'Receiving & Stock Room', 'FixIt', '300 mm', 'Pack of 100', 'CTI-300', 18, 10, 'Nylon cable ties'],
    ['Lubricant spray', 'Consumable', 'Receiving & Stock Room', 'FixIt', '300 ml', 'Can', 'LUB-300', 28, 6, 'Multi-purpose lubricant'],
    ['Hydraulic oil', 'Consumable', 'Receiving & Stock Room', 'FixIt', '1 L', 'Bottle', 'HYD-1L', 56, 4, 'Oil for pallet jacks'],
    ['Door gasket', 'Consumable', 'Chilled & Frozen', 'CoolTech', 'Freezer door 120 cm', 'Each', 'DGK-120', 85, 2, 'Seal for freezer and cooler doors'],
    ['Refrigerant R404A', 'Consumable', 'Dairy', 'CoolTech', '10.9 kg cylinder', 'Each', 'R404-11', 380, 1, 'Refrigerant for the cooling equipment'],
    ['LED light tube', 'Consumable', 'Grocery', 'BrightLite', '18 W', 'Each', 'LED-18', 24, 12, 'Replacement tubes for the aisle lighting'],
    ['Drain cleaner', 'Consumable', 'Fish Counter', 'CleanPro', '1 L', 'Bottle', 'DCL-1L', 19, 6, 'Unblocks the drains of the wet counters'],
    ['Pipe sealant tape', 'Consumable', 'Produce', 'FixIt', '12 mm', 'Roll', 'PST-12', 9, 10, 'Tape for the plumbing of the misters'],
    // Equipment used to repair things
    ['Multimeter', 'Equipment', 'Receiving & Stock Room', 'VoltPro', 'MM-200', 'Each', 'EQ-MM200', 180, 1, 'Measures voltage, current and resistance'],
    ['Toolbox set', 'Equipment', 'Receiving & Stock Room', 'FixIt', '120 pieces', 'Set', 'EQ-TB120', 450, 1, 'Hand tools for small repairs'],
    ['Step ladder', 'Equipment', 'Receiving & Stock Room', 'ClimbSafe', '5 steps', 'Each', 'EQ-SL5', 320, 1, 'Ladder for shelves and lighting'],
    ['Refrigerant gauge set', 'Equipment', 'Dairy', 'CoolTech', 'RG-4', 'Set', 'EQ-RG4', 640, 1, 'Gauges to check the cooling circuits'],
    ['Cold room thermometer', 'Equipment', 'Chilled & Frozen', 'CoolTech', 'CT-10', 'Each', 'EQ-CT10', 120, 2, 'Digital thermometer for coolers and freezers'],
    ['Wet vacuum', 'Equipment', 'Cleaning', 'CleanPro', 'WV-30', 'Each', 'EQ-WV30', 780, 1, 'Vacuum for liquids'],
    ['Drain snake', 'Equipment', 'Fish Counter', 'CleanPro', '10 m', 'Each', 'EQ-DS10', 210, 1, 'Clears blocked drains'],
    ['Hand truck', 'Equipment', 'Receiving & Stock Room', 'LiftMate', 'HT-250', 'Each', 'EQ-HT250', 560, 2, 'Moves boxes and crates'],
    ['Pallet jack', 'Equipment', 'Receiving & Stock Room', 'LiftMate', 'PJ-2500', 'Each', 'EQ-PJ25', 1950, 2, 'Manual pallet jack, 2.5 t'],
    ['Floor scrubber', 'Equipment', 'Cleaning', 'CleanPro', 'FS-500', 'Each', 'EQ-FS500', 4800, 1, 'Battery floor scrubber'],
    ['Label printer', 'Equipment', 'Checkout', 'LabelPro', 'LP-300', 'Each', 'EQ-LP300', 1350, 2, 'Prints price and shelf labels'],
    // Equipment of the areas
    ['Produce mister', 'Equipment', 'Produce', 'FreshMist', 'FM-8', 'Each', 'EQ-FM8', 2900, 1, 'Mists the produce displays'],
    ['Pallet jack (grocery)', 'Equipment', 'Grocery', 'LiftMate', 'PJ-2500', 'Each', 'EQ-PJG', 1950, 1, 'Pallet jack for the aisles'],
    ['Bread oven', 'Equipment', 'Bakery', 'HeatWorks', 'BO-12', 'Each', 'EQ-BO12', 18500, 1, 'Deck oven of the in-store bakery'],
    ['Meat slicer', 'Equipment', 'Butcher', 'SharpEdge', 'MS-300', 'Each', 'EQ-MS300', 6200, 1, 'Slicer of the meat counter'],
    ['Dairy cooler', 'Equipment', 'Dairy', 'CoolTech', 'DC-250', 'Each', 'EQ-DC250', 14800, 2, 'Display cooler of the dairy aisle'],
    ['Beverage cooler', 'Equipment', 'Beverages', 'CoolTech', 'BC-180', 'Each', 'EQ-BC180', 9600, 3, 'Display cooler for cold drinks'],
    ['Checkout terminal', 'Equipment', 'Checkout', 'PayPoint', 'CT-5', 'Each', 'EQ-CT5', 5400, 6, 'Point of sale terminal'],
    ['Freezer', 'Equipment', 'Chilled & Frozen', 'CoolTech', 'FZ-300', 'Each', 'EQ-FZ300', 16900, 3, 'Frozen aisle freezer'],
    ['Fish ice bed', 'Equipment', 'Fish Counter', 'IceLine', 'IB-2', 'Each', 'EQ-IB2', 7800, 1, 'Ice bed of the fish counter'],
    ['Security gate', 'Equipment', 'Health & Beauty', 'SafeGate', 'SG-2', 'Pair', 'EQ-SG2', 3200, 1, 'Anti-theft gate at the exit'],
    ['Bulk bin', 'Equipment', 'Pet Shop', 'BinWorks', 'BB-6', 'Each', 'EQ-BB6', 1500, 2, 'Bulk food bins of the pet shop']
  ].map(function(r, i) {
    return { index: i, name: r[0], type: r[1], area: r[2], brand: r[3], model: r[4], unit: r[5], code: r[6], cost: r[7], min: r[8], description: r[9] };
  });

  var SUPPLIER_BY_BRAND = { 'CoolTech': 'CoolTech Refrigeration Parts', 'CleanPro': 'CleanPro Supplies' };

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  function addDays(n) { return new Date(TODAY.getTime() + n * DAY); }

  /** What the open issues of the store say about each item: how many the store really has. */
  function issueEffects(site, areaNames) {
    var fx = {};
    areaNames.forEach(function(area) {
      window.AreasData.getIssues(site, area, areaNames).forEach(function(issue) {
        if (window.AreasData.statusOf(issue) === 'Resolved') return;
        issue.resources.forEach(function(r) {
          if (r.availability === 'Missing' || r.availability === 'Borrow from another store') fx[r.name] = { qty: 0, note: r.availability };
          else if (r.availability === 'Short' && !fx[r.name]) fx[r.name] = { qty: r.have, note: 'Short' };
          (fx[r.name] = fx[r.name] || { qty: null, note: '' }).issues = (fx[r.name].issues || []).concat(issue.title);
        });
      });
    });
    return fx;
  }

  var extras = {};   // items added from the tab, kept for the session

  function baseInventory(site) {
    var areaNames = window.DetailData.getLines().map(function(l) { return l.name; }), fx = issueEffects(site, areaNames);
    var broken = {};
    areaNames.forEach(function(area) {
      var title = window.AreasData.equipmentIssueTitle(area);
      if (title && window.AreasData.getIssues(site, area, areaNames).some(function(i) { return i.title === title && window.AreasData.statusOf(i) !== 'Resolved'; })) broken[area] = title;
    });
    var code = site.storeCode;
    return CATALOG.map(function(it) {
      var h = hash(code + '|' + it.code), equipment = it.type === 'Equipment';
      var qty = equipment ? Math.max(it.min, 1) + h % 3 : Math.max(it.min, 1) + h % (it.min * 2 + 2);
      var effect = fx[it.name], repairing = equipment && !!broken[it.area] && isAreaEquipment(it);
      var note = '';
      if (effect && effect.qty != null) { qty = Math.min(qty, effect.qty); note = effect.note; }
      if (!equipment && qty > 0 && qty < it.min && !note) note = 'Low';
      var status;
      if (equipment) status = qty === 0 ? 'Not in store' : (repairing ? 'Under repair' : (h % 3 === 0 ? 'Available' : 'In use'));
      else status = qty === 0 ? 'Out of stock' : (qty < it.min ? 'Low stock' : 'In stock');
      return {
        item: it, qty: qty, status: status, issues: effect ? effect.issues : [], repairIssue: repairing ? broken[it.area] : '',
        supplier: SUPPLIER_BY_BRAND[it.brand] || (equipment ? 'Prime Tools Supply' : 'Atlantic Distribution'),
        location: equipment ? (it.area === 'Receiving & Stock Room' ? 'Stock room · tool cabinet ' + (1 + h % 3) : it.area + ' · on site') : 'Stock room · shelf ' + String.fromCharCode(65 + h % 6) + (1 + (h >>> 4) % 5),
        lastRestocked: addDays(-(3 + (h >>> 6) % 70)), lastChecked: addDays(-(1 + (h >>> 9) % 25)), reorderQty: Math.max(it.min * 2, 1)
      };
    });
  }

  /** The equipment of an area (the one an equipment issue is about), as opposed to the repair tools kept in the stock room. */
  function isAreaEquipment(it) {
    return ['Produce mister', 'Pallet jack (grocery)', 'Bread oven', 'Meat slicer', 'Dairy cooler', 'Beverage cooler', 'Checkout terminal', 'Freezer', 'Fish ice bed', 'Security gate', 'Bulk bin'].indexOf(it.name) !== -1;
  }

  function inventory(site) { return baseInventory(site).concat(extras[site.storeCode] || []); }

  window.SuppliesData = {
    /** Adds an equipment or a consumable to the store. `d`: name, type, area, brand, model, unit, code, cost, min, qty. */
    addItem: function(site, d) {
      var list = extras[site.storeCode] = extras[site.storeCode] || [], equipment = d.type === 'Equipment';
      var it = { index: 1000 + list.length, name: d.name, type: d.type, area: d.area, brand: d.brand, model: d.model, unit: d.unit || 'Each', code: d.code, cost: d.cost, min: d.min, description: d.description || '' };
      var qty = d.qty, status = equipment ? (qty === 0 ? 'Not in store' : 'Available') : (qty === 0 ? 'Out of stock' : (qty < it.min ? 'Low stock' : 'In stock'));
      var row = { item: it, qty: qty, status: status, issues: [], repairIssue: '', supplier: d.supplier || 'Prime Tools Supply', location: d.location || (equipment ? it.area + ' · on site' : 'Stock room'), lastRestocked: addDays(0), lastChecked: addDays(0), reorderQty: Math.max(it.min * 2, 1) };
      list.push(row);
      return row;
    },
    today: TODAY,
    getCatalog: function() { return CATALOG; },
    getInventory: inventory
  };
})();
