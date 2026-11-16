/**
 * Areas Data
 * What each area of a store needs besides its products: issues to fix (a freezer door that does not seal, a broken
 * label strip) with the equipment and consumables needed to fix them. Generated from the store record, so the
 * equipment issues match the "Equipment unavailable" counter of the Overview. Issues and items added in the Areas tab
 * are kept for the session.
 */

(function() {
  'use strict';

  var EQUIPMENT = ['Multimeter', 'Refrigerant gauge set', 'Step ladder', 'Toolbox set', 'Pallet jack', 'Floor scrubber', 'Wet vacuum', 'Label printer', 'Cold room thermometer', 'Hand truck', 'Drain snake'];
  var CONSUMABLES = ['Door gasket', 'Refrigerant R404A', 'Cable ties', 'Absorbent pads', 'LED light tube', 'Thermal receipt paper', 'Price labels', 'Disinfectant wipes', 'Lubricant spray', 'Drain cleaner', 'Hydraulic oil', 'Replacement blade', 'Battery pack', 'Pipe sealant tape'];

  // The equipment issue each area can have: title, detail, and what it takes to fix it: [name, quantity]
  var EQUIPMENT_ISSUE = {
    'Produce': ['Produce mister not working', 'Water mist nozzles are clogged and the produce is drying out', [['Toolbox set', 1], ['Step ladder', 1]], [['Pipe sealant tape', 2], ['Drain cleaner', 1]]],
    'Grocery': ['Pallet jack wheel broken', 'Front wheel is cracked, the jack is unsafe to use', [['Toolbox set', 1], ['Hand truck', 1]], [['Lubricant spray', 1]]],
    'Bakery': ['Bread oven not heating evenly', 'Bottom heating element is failing, uneven baking', [['Multimeter', 1], ['Toolbox set', 1]], [['Lubricant spray', 1], ['Cable ties', 10]]],
    'Butcher': ['Meat slicer blade is dull', 'The blade needs to be replaced, cuts are tearing', [['Toolbox set', 1]], [['Replacement blade', 1], ['Lubricant spray', 1], ['Disinfectant wipes', 20]]],
    'Dairy': ['Dairy cooler above 5 °C', 'Display cooler is holding 7 °C, products at risk', [['Multimeter', 1], ['Refrigerant gauge set', 1], ['Cold room thermometer', 1]], [['Refrigerant R404A', 1], ['Cable ties', 10]]],
    'Beverages': ['Beverage cooler compressor noise', 'Loud rattle every time the compressor starts', [['Toolbox set', 1], ['Multimeter', 1]], [['Lubricant spray', 1]]],
    'Cleaning': ['Floor scrubber battery dead', 'The battery does not hold a charge', [['Multimeter', 1]], [['Battery pack', 1]]],
    'Checkout': ['Checkout terminal freezing', 'Lane 3 terminal restarts during payment', [['Toolbox set', 1], ['Label printer', 1]], [['Thermal receipt paper', 4], ['Cable ties', 10]]],
    'Receiving & Stock Room': ['Pallet jack hydraulic leak', 'Oil on the floor at the dock', [['Pallet jack', 1], ['Toolbox set', 1], ['Wet vacuum', 1]], [['Hydraulic oil', 2], ['Absorbent pads', 6]]],
    'Chilled & Frozen': ['Freezer door not sealing', 'Gasket is torn and frost is building up on the door', [['Step ladder', 1], ['Toolbox set', 1], ['Cold room thermometer', 1]], [['Door gasket', 2], ['Cable ties', 10]]],
    'Fish Counter': ['Fish ice bed drain blocked', 'Melt water is pooling under the counter', [['Drain snake', 1], ['Wet vacuum', 1]], [['Drain cleaner', 2], ['Absorbent pads', 4]]],
    'Health & Beauty': ['Security gate false alarms', 'The gate beeps without tagged items', [['Multimeter', 1], ['Toolbox set', 1]], [['Cable ties', 10]]],
    'Pet Shop': ['Bulk bin gate jammed', 'The gate will not close and food is spilling', [['Toolbox set', 1]], [['Lubricant spray', 1], ['Absorbent pads', 2]]]
  };
  // Smaller repairs any area can have
  var MINOR_ISSUES = [
    ['Shelf label strips broken', 'Several shelf-edge strips came off', [['Step ladder', 1]], [['Price labels', 50]]],
    ['Ceiling light out', 'Lighting over the aisle is too dim', [['Step ladder', 1]], [['LED light tube', 2]]],
    ['Spill next to the display', 'Needs cleaning and a warning sign', [['Floor scrubber', 1]], [['Absorbent pads', 4], ['Disinfectant wipes', 10]]]
  ];
  // The Chilled & Frozen area is the example of an area with many issues: more open ones and a history of closed ones
  var SHOWCASE_AREA = 'Chilled & Frozen';
  var SHOWCASE_OPEN = [
    ['Freezer light flickering', 'The LED strip over the freezer aisle flickers', [['Step ladder', 1], ['Multimeter', 1]], [['LED light tube', 2], ['Cable ties', 10]]],
    ['Frost on the aisle floor', 'Condensation freezes near the door and the floor is slippery', [['Floor scrubber', 1], ['Wet vacuum', 1]], [['Absorbent pads', 6], ['Disinfectant wipes', 10]]]
  ];
  var SHOWCASE_RESOLVED = [
    ['Thermostat replaced', 'The display temperature was drifting, a new thermostat was fitted', [['Multimeter', 1], ['Toolbox set', 1]], [['Cable ties', 10]]],
    ['Door handle tightened', 'Loose handle on the frozen aisle door', [['Toolbox set', 1]], [['Lubricant spray', 1]]],
    ['Compressor serviced', 'Yearly service done, filters cleaned', [['Refrigerant gauge set', 1], ['Toolbox set', 1]], [['Refrigerant R404A', 1]]]
  ];
  var RESOLVED_GENERIC = [
    ['Shelf label strips replaced', 'All the strips of the aisle were replaced', [['Step ladder', 1]], [['Price labels', 50]]],
    ['Ceiling light replaced', 'A new tube was fitted over the aisle', [['Step ladder', 1]], [['LED light tube', 2]]],
    ['Spill cleaned', 'Floor cleaned and dried', [['Floor scrubber', 1]], [['Absorbent pads', 4]]]
  ];
  var FIXERS = ['Marina Costa', 'Rafael Lima', 'Camila Rocha', 'Diego Martins', 'Helena Duarte', 'Tiago Nunes', 'Beatriz Moreira', 'Felipe Araújo'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var BASE_STATUS = ['Open', 'In progress', 'Open'];

  var added = {};     // storeCode -> { issues: [issue] }
  var cache = {};
  var counter = 0;

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  /** Spread `total` units over the areas, in the same places as the Overview does (so the numbers add up). */
  function spread(total, count, seed) {
    var out = [];
    for (var i = 0; i < count; i++) out.push(0);
    for (var u = 0; u < total && count; u++) out[(seed + u * 5) % count]++;
    return out;
  }

  function resource(code, type, name, qty, forced, used) {
    if (used) return { type: type, name: name, qty: qty, have: qty, availability: 'Used' };
    var h = hash(code + name + type);
    var have = type === 'Equipment' ? 1 : (forced != null ? forced : h % (qty + 4));
    var availability;
    if (type === 'Equipment') availability = h % 6 === 0 ? 'Borrow from another store' : 'Available';
    else availability = have >= qty ? 'Available' : (have > 0 ? 'Short' : 'Missing');
    return { type: type, name: name, qty: qty, have: have, availability: availability };
  }

  function makeIssue(code, id, area, template, priority, base, ready) {
    var h = hash(code + id), resolved = base === 'Resolved';
    var resources = template[2].map(function(e) { return resource(code, 'Equipment', e[0], e[1], null, resolved); })
      .concat(template[3].map(function(c) { return resource(code, 'Consumable', c[0], c[1], ready ? c[1] : null, resolved); }));
    var detail = template[1];
    if (resolved) {
      var d = new Date(2026, 11, 10 - (2 + h % 26));
      detail = 'Fixed on ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' by ' + FIXERS[h % FIXERS.length] + ' · ' + template[1];
    }
    return { id: id, area: area, title: template[0], detail: detail, priority: priority, base: base || BASE_STATUS[h % BASE_STATUS.length], resources: resources, added: false };
  }

  /** Status shown for an issue: waiting for parts when a consumable is short or missing. */
  function statusOf(issue) {
    if (issue.base === 'Resolved') return 'Resolved';
    var short = issue.resources.some(function(r) { return r.type === 'Consumable' && r.availability !== 'Available'; });
    return short ? 'Waiting for parts' : issue.base;
  }

  function build(site, areaNames) {
    var code = site.storeCode, seed = parseInt(String(code).slice(3), 10) || 0, n = areaNames.length;
    var equipDown = spread(site.equipmentDown, n, seed + 3), byArea = {};
    areaNames.forEach(function(area, i) {
      var list = [];
      for (var k = 0; k < equipDown[i]; k++) list.push(makeIssue(code, 'I' + (++counter), area, EQUIPMENT_ISSUE[area], k === 0 && (seed + i) % 2 ? 'Urgent' : 'High'));
      if (area === SHOWCASE_AREA) {
        SHOWCASE_OPEN.forEach(function(t, k) { list.push(makeIssue(code, 'I' + (++counter), area, t, k ? 'High' : 'Normal', k ? 'Open' : 'In progress', !k)); });
      } else if ((hash(code + area) % 100) < 30) {
        list.push(makeIssue(code, 'I' + (++counter), area, MINOR_ISSUES[hash(code + area + 'm') % MINOR_ISSUES.length], 'Normal'));
      }
      if (area === SHOWCASE_AREA) SHOWCASE_RESOLVED.forEach(function(t) { list.push(makeIssue(code, 'I' + (++counter), area, t, 'Normal', 'Resolved')); });
      else if ((hash(code + area + 'r') % 100) < 35) list.push(makeIssue(code, 'I' + (++counter), area, RESOLVED_GENERIC[hash(code + area + 'g') % RESOLVED_GENERIC.length], 'Normal', 'Resolved'));
      byArea[area] = list;
    });
    return byArea;
  }

  function storeAdded(site) {
    return added[site.storeCode] || (added[site.storeCode] = {});
  }

  window.AreasData = {
    equipmentIssueTitle: function(area) { return EQUIPMENT_ISSUE[area] ? EQUIPMENT_ISSUE[area][0] : ''; },
    equipment: EQUIPMENT,
    consumables: CONSUMABLES,
    statusOf: statusOf,
    /** Issues of an area in a store (generated ones first, then the ones added in this session). */
    getIssues: function(site, area, areaNames) {
      if (!cache[site.storeCode]) cache[site.storeCode] = build(site, areaNames);
      var extra = storeAdded(site)[area] || [];
      return extra.concat(cache[site.storeCode][area] || []);
    },
    addIssue: function(site, area, data) {
      var list = storeAdded(site);
      var issue = { id: 'I' + (++counter), area: area, title: data.title, detail: data.detail || '', priority: data.priority || 'Normal', base: 'Open', resources: [], added: true };
      (list[area] = list[area] || []).unshift(issue);
      return issue;
    },
    addResource: function(site, areaNames, issueId, data) {
      var all = [], self = this;
      areaNames.forEach(function(a) { all = all.concat(self.getIssues(site, a, areaNames)); });
      var issue = all.filter(function(i) { return i.id === issueId; })[0];
      if (!issue) return null;
      var r = resource(site.storeCode, data.type, data.name, data.qty);
      issue.resources.push(r);
      return r;
    }
  };
})();
