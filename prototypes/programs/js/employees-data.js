/**
 * Employees Data
 * The people who work in a store: the store manager, one area lead per area (the same leads as the Areas tab)
 * and the staff of each area. Everything is generated from the store, so a store always shows the same team.
 * Tasks assigned from the Employees tab are kept for the session and also feed the Overview's task list.
 */

(function() {
  'use strict';

  var TODAY = new Date(2026, 11, 10);
  var DAY = 86400000;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Areas of the Areas tab (id is the line id there); an area lead is picked from AP_LEADS with the same hash as in lines-table.js
  var AREAS = ['Produce', 'Grocery', 'Bakery', 'Butcher', 'Dairy', 'Beverages', 'Cleaning', 'Checkout', 'Receiving & Stock Room', 'Chilled & Frozen', 'Fish Counter', 'Health & Beauty', 'Pet Shop'];
  var AP_LEADS = ['Marina Costa', 'Rafael Lima', 'Camila Rocha', 'Diego Martins', 'Helena Duarte', 'Tiago Nunes', 'Beatriz Moreira', 'Felipe Araújo'];
  var STAFF_ROLE = {
    'Produce': 'Produce Attendant', 'Bakery': 'Baker', 'Butcher': 'Butcher', 'Fish Counter': 'Fishmonger', 'Checkout': 'Cashier',
    'Receiving & Stock Room': 'Receiving Clerk'
  };
  var FIRST = ['Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Fábio', 'Gabriela', 'Heitor', 'Isadora', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olívia', 'Paulo', 'Renata', 'Samuel', 'Tatiana', 'Vinícius'];
  var LAST = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Ferreira', 'Gomes', 'Lopes', 'Mendes', 'Nogueira', 'Oliveira', 'Pereira', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira'];
  var SHIFTS = ['Opening · 06:00–14:00', 'Closing · 13:00–22:00', 'Full day · 08:00–17:00'];
  var CERTS = {
    'Produce Attendant': ['Food handling'], 'Baker': ['Food handling', 'Oven operation'], 'Butcher': ['Food handling', 'Meat cutting'], 'Fishmonger': ['Food handling', 'Fish preparation'],
    'Cashier': ['Cash handling'], 'Receiving Clerk': ['Forklift', 'Inventory control'], 'Stock Clerk': ['Inventory control'], 'Area Lead': ['Team leadership', 'Inventory control'],
    'Store Manager': ['Team leadership', 'First aid', 'Cash handling']
  };
  var STATUS = ['On shift', 'On shift', 'On shift', 'On break', 'Off today', 'On leave'];

  var assigned = {};   // storeCode -> [task]
  var counter = 0;

  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }

  /** Same hash as lines-table.js (hashNum), so the area leads match the Areas tab. */
  function areasTabHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function slug(name) {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  }

  function phone(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 100000000;
    var n = ('00000000' + h).slice(-8);
    return '+55 11 9' + n.slice(0, 4) + '-' + n.slice(4);
  }

  function fmt(date) { return date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear(); }

  function split(areas) {
    var pcts = areas.length === 1 ? [100] : (areas.length === 2 ? [70, 30] : [50, 30, 20]);
    return areas.slice(0, 3).map(function(a, i) { return { area: a, pct: pcts[i] }; });
  }

  function schedule(h, shift) {
    var off1 = h % 7, off2 = (off1 + 3) % 7, days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(function(d, i) { return { day: d, shift: i === off1 || i === off2 ? 'Off' : shift.split(' · ')[1] }; });
  }

  function build(site, program) {
    var code = site.storeCode, list = [], used = {}, n = hash(code) % 800;

    function person(name, role, areas) {
      var h = hash(code + '|' + name), shift = SHIFTS[h % SHIFTS.length];
      used[name] = true;
      n++;
      list.push({
        id: 'EMP-' + (2000 + n), name: name, role: role, areas: split(areas), primaryArea: areas[0], shift: shift, status: role === 'Store Manager' ? 'On shift' : STATUS[h % STATUS.length],
        contract: h % 5 === 0 ? 'Part-time' : 'Full-time', hired: fmt(new Date(TODAY.getTime() - (200 + h % 2400) * DAY)),
        certifications: CERTS[role] || CERTS['Stock Clerk'], email: slug(name) + '@quickcart.example', phone: phone(name),
        week: schedule(h, shift), manager: role === 'Store Manager' ? 'Regional office' : site.lead
      });
    }

    // Store manager (the store's lead) and area leads, one per area as in the Areas tab
    person(site.lead, 'Store Manager', ['Receiving & Stock Room']);
    var led = {};
    AREAS.forEach(function(area, i) {
      var lead = AP_LEADS[areasTabHash('area' + (i + 1)) % AP_LEADS.length];
      (led[lead] = led[lead] || []).push(area);
    });
    Object.keys(led).forEach(function(lead) {
      if (lead === site.lead) { list[0].areas = split(led[lead]); list[0].primaryArea = led[lead][0]; used[lead] = true; return; }
      person(lead, 'Area Lead', led[lead]);
    });

    // Staff: one or two per area
    AREAS.forEach(function(area, i) {
      var count = (hash(code + area) % 3 === 0) ? 2 : 1;
      for (var k = 0; k < count; k++) {
        var name, tries = 0;
        do {
          var h = hash(code + area + k + tries++);
          name = FIRST[h % FIRST.length] + ' ' + LAST[(h >>> 5) % LAST.length];
        } while (used[name] || AP_LEADS.indexOf(name) !== -1);
        var also = hash(name) % 3 === 0 ? [AREAS[(i + 1) % AREAS.length]] : [];
        person(name, STAFF_ROLE[area] || 'Stock Clerk', [area].concat(also));
      }
    });

    // Tasks already assigned to people (a few each)
    list.forEach(function(e) { e.tasks = baseTasks(e, code); });
    return list;
  }

  var BASE_TASKS = ['Restock shelves', 'Count stock', 'Check expiry dates', 'Fix price labels', 'Reorganize shelf'];

  function baseTasks(e, code) {
    var h = hash(code + e.id), count = e.status === 'On leave' ? 0 : h % 4, out = [];
    for (var i = 0; i < count; i++) {
      var due = new Date(TODAY.getTime() + ((h >>> (i + 3)) % 5 - 1) * DAY);
      out.push({ title: BASE_TASKS[(h + i) % BASE_TASKS.length] + ' · ' + e.areas[0].area, area: e.areas[0].area, priority: i === 0 && h % 3 === 0 ? 'High' : 'Normal', due: due, state: due < TODAY ? 'Open' : (i % 2 ? 'In progress' : 'Open'), note: '', assigned: false });
    }
    return out;
  }

  var cache = {}, added = 0;

  window.EmployeesData = {
    today: TODAY,
    areas: AREAS,
    getForStore: function(site, program) {
      if (!cache[site.storeCode]) cache[site.storeCode] = build(site, program);
      return cache[site.storeCode];
    },
    /** Assign a task to an employee of a store. `task` has title, area, priority, due (Date), note. */
    assign: function(site, program, employeeId, task) {
      var emp = this.getForStore(site, program).filter(function(e) { return e.id === employeeId; })[0];
      if (!emp) return null;
      var t = { title: task.title, area: task.area, product: task.product || '', priority: task.priority, due: task.due, state: 'Open', note: task.note || '', assigned: true, who: emp.name };
      emp.tasks.unshift(t);
      (assigned[site.storeCode] = assigned[site.storeCode] || []).unshift(t);
      return t;
    },
    roles: function() { return Object.keys(CERTS); },
    shifts: SHIFTS,
    /** Adds a person to the team of a store (kept for the session). `data` has name, role, area, shift, contract and, optionally, e-mail and phone. */
    add: function(site, program, data) {
      var team = this.getForStore(site, program), name = data.name.trim(), h = hash(site.storeCode + '|' + name);
      var person = {
        id: 'EMP-' + (9000 + (added++)), name: name, role: data.role, areas: split([data.area]), primaryArea: data.area, shift: data.shift, status: 'On shift',
        contract: data.contract, hired: fmt(TODAY),
        certifications: CERTS[data.role] || CERTS['Stock Clerk'], email: (data.email || slug(name) + '@quickcart.example'), phone: data.phone || phone(name),
        week: schedule(h, data.shift), manager: data.role === 'Store Manager' ? 'Regional office' : site.lead, tasks: []
      };
      team.push(person);
      return person;
    },
    /** Tasks assigned from the Employees tab in this session. */
    assignedTasks: function(site) { return assigned[site.storeCode] || []; }
  };
})();
