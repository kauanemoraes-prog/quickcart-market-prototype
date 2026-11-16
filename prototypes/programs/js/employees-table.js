/**
 * Employees Table
 * The Employees tab of the store page: who works in the store, where they usually work and what they have to do.
 * A row opens the person in a drawer (profile, work, open tasks) with a form to assign them a new task.
 * Assigned tasks also show up in the Overview's task list.
 */

(function() {
  'use strict';

  var COLUMNS = [
    { key: 'select', label: '', select: true },
    { key: 'id', label: 'Employee ID', sort: true }, { key: 'name', label: 'Employee', sort: true }, { key: 'role', label: 'Role', sort: true }, { key: 'area', label: 'Usual area', sort: true },
    { key: 'shift', label: 'Shift' }, { key: 'status', label: 'Status', sort: true }, { key: 'tasks', label: 'Open tasks', sort: true, num: true }, { key: 'action', label: '' }
  ];
  var STATUS_TONE = { 'On shift': 'success', 'On break': 'info', 'Off today': 'muted', 'On leave': 'warning' };
  var TASK_TYPES = ['Restock shelves', 'Count stock', 'Check expiry dates', 'Fix price labels', 'Reorganize shelf', 'Receive delivery', 'Clean area', 'Inspect equipment'];
  var PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var state = { query: '', area: '', quick: 'all', sortKey: 'name', sortDir: 1 };
  var people = [];
  var resizer = null;
  var areaFilter = null;
  // Starting width of each column, in the order of COLUMNS
  var WIDTHS = [44, 130, 250, 160, 190, 210, 120, 110, 140];
  var currentId = null;
  var selected = {};   // the people ticked in the table, by employee id

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function fmt(date) { return date.getDate() + ' ' + MONTHS[date.getMonth()]; }

  function initials(name) {
    var parts = name.trim().split(/\s+/);
    return ((parts[0] || '')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  /** The photo of the person (a woman's photo for a woman's name, a man's for a man's); the initials if there is no photo. */
  function avatar(name, cls) {
    return window.PeopleAvatars ? window.PeopleAvatars.img(name, cls) : '<span class="' + cls + ' ' + cls + '--initials">' + esc(initials(name)) + '</span>';
  }

  function site() { return window.Dropdowns.getCurrentSite(); }

  function program() { return window.Dropdowns.getCurrentProgram(); }

  function value(e, key) {
    switch (key) {
      case 'id': return e.id;
      case 'name': return e.name;
      case 'role': return e.role;
      case 'area': return e.primaryArea;
      case 'status': return e.status;
      case 'tasks': return e.tasks.length;
      default: return '';
    }
  }

  /* ---------- table ---------- */

  function matches(e) {
    if (areaFilter && !e.areas.some(function(a) { return areaFilter.shows(a.area); })) return false;
    if (state.quick !== 'all' && e.status !== state.quick) return false;
    var q = state.query;
    if (!q) return true;
    return [e.name, e.id, e.role, e.email, e.areas.map(function(a) { return a.area; }).join(' ')].some(function(v) { return String(v).toLowerCase().indexOf(q) !== -1; });
  }

  function visible() {
    var key = state.sortKey, dir = state.sortDir;
    return people.filter(matches).sort(function(a, b) {
      // The store manager (the admin of the store) stays on top, whatever the sorting
      if ((a.role === 'Store Manager') !== (b.role === 'Store Manager')) return a.role === 'Store Manager' ? -1 : 1;
      var x = value(a, key), y = value(b, key);
      var c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return (c || a.name.localeCompare(b.name)) * dir;
    });
  }

  function areaCell(e) {
    var title = e.areas.map(function(a) { return a.area + ' ' + a.pct + '%'; }).join(', ');
    return '<span title="' + esc(title) + '">' + esc(e.primaryArea) + '</span>' + (e.areas.length > 1 ? ' <span class="ov-badge ov-badge--muted">+' + (e.areas.length - 1) + '</span>' : '');
  }

  function rowHtml(e) {
    var admin = e.role === 'Store Manager';
    return '<tr class="table__row products-row' + (admin ? ' emp-row--admin' : '') + (selected[e.id] ? ' products-row--selected' : '') + '" data-id="' + e.id + '" tabindex="0">' +
      '<td class="table__cell products-cell--select"><input type="checkbox" class="products-check" data-select="' + e.id + '"' + (selected[e.id] ? ' checked' : '') + ' aria-label="Select ' + esc(e.name) + '"></td>' +
      '<td class="table__cell products-cell--mono">' + e.id + '</td>' +
      '<td class="table__cell"><span class="emp-who">' + avatar(e.name, 'emp-avatar') +
        '<span class="emp-who__text"><span class="products-cell--name">' + esc(e.name) + '</span></span></span></td>' +
      '<td class="table__cell">' + (admin ? '<span class="emp-admin-tag">' + esc(e.role) + '</span>' : esc(e.role)) + '</td>' +
      '<td class="table__cell">' + areaCell(e) + '</td>' +
      '<td class="table__cell">' + esc(e.shift) + '</td>' +
      '<td class="table__cell"><span class="ov-badge ov-badge--' + STATUS_TONE[e.status] + '">' + e.status + '</span></td>' +
      '<td class="table__cell products-cell--num">' + e.tasks.length + '</td>' +
      '<td class="table__cell emp-action"><button type="button" class="btn btn--secondary btn--small" data-assign="' + e.id + '">Assign task</button></td>' +
    '</tr>';
  }

  function headHtml() {
    return COLUMNS.map(function(c) {
      var active = state.sortKey === c.key;
      if (c.select) return '<th class="table__header products-cell--select"><input type="checkbox" class="products-check" id="employees-select-all" aria-label="Select all employees"></th>';
      return '<th class="table__header' + (c.num ? ' products-cell--num' : '') + (c.sort ? ' sortable' : '') + '"' + (c.sort ? ' data-sort="' + c.key + '"' : '') +
        (active ? ' aria-sort="' + (state.sortDir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' + c.label +
        (c.sort ? '<span class="products-sort' + (active ? ' products-sort--active' : '') + '">' + (active ? (state.sortDir > 0 ? '↑' : '↓') : '⇅') + '</span>' : '') + '</th>';
    }).join('');
  }

  function renderChips() {
    var count = function(s) { return people.filter(function(e) { return e.status === s; }).length; };
    var chips = [['all', 'All employees', people.length], ['On shift', 'On shift', count('On shift')], ['On break', 'On break', count('On break')],
      ['Off today', 'Off today', count('Off today')], ['On leave', 'On leave', count('On leave')]];
    document.getElementById('employees-chips').innerHTML = chips.map(function(x) {
      return '<button type="button" class="products-chip' + (state.quick === x[0] ? ' products-chip--active' : '') + '" data-quick="' + x[0] + '" aria-pressed="' + (state.quick === x[0]) + '">' +
        x[1] + ' <strong>' + x[2] + '</strong></button>';
    }).join('');
  }

  function renderRows() {
    var list = visible();
    document.getElementById('employees-head').innerHTML = headHtml();
    if (resizer) resizer.refresh();
    document.getElementById('employees-body').innerHTML = list.map(rowHtml).join('') ||
      '<tr class="table__row"><td class="table__cell products-empty" colspan="' + COLUMNS.length + '">No employees match your filters.</td></tr>';
    syncSelectAll(list);
  }

  /** The box in the header: ticked when every person shown is selected, half-ticked when only some are. */
  function syncSelectAll(list) {
    var box = document.getElementById('employees-select-all');
    if (!box) return;
    list = list || visible();
    var n = list.filter(function(p) { return selected[p.id]; }).length;
    box.checked = list.length > 0 && n === list.length;
    box.indeterminate = n > 0 && n < list.length;
  }

  function render() {
    var view = document.getElementById('employees-view');
    if (!view || !view.dataset.ready) return;
    people = window.EmployeesData.getForStore(site(), program());
    // Every photo goes to one person only: the first of the team get one, the others show their initials
    if (window.PeopleAvatars) window.PeopleAvatars.assign(people.map(function(e) { return e.name; }));
    renderChips();
    renderRows();
    closeDrawer();
  }

  /* ---------- drawer ---------- */

  /** A small copy icon after a value; clicking it puts the value on the clipboard. */
  function copyBtn(value) {
    return ' <button type="button" class="emp-copy" data-copy="' + esc(value) + '" title="Copy" aria-label="Copy ' + esc(value) + '"><lucide-icon name="copy" style="font-size:14px"></lucide-icon></button>';
  }

  function copyText(text, btn) {
    var done = function() {
      btn.classList.add('emp-copy--done');
      btn.title = 'Copied';
      setTimeout(function() { btn.classList.remove('emp-copy--done'); btn.title = 'Copy'; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, done); return; }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    ta.remove(); done();
  }

  function dl(pairs) {
    return '<dl class="pd-grid">' + pairs.map(function(p) {
      return '<div class="pd-grid__item"><dt>' + p[0] + '</dt><dd>' + (p[1] === '' ? '—' : p[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function section(title, body) {
    return '<section class="pd-section"><h4 class="pd-section__title">' + title + '</h4>' + body + '</section>';
  }

  function areasHtml(e) {
    return '<ul class="emp-areas">' + e.areas.map(function(a) {
      return '<li><span>' + esc(a.area) + '</span><span class="emp-areas__bar"><span style="width:' + a.pct + '%"></span></span><strong>' + a.pct + '%</strong></li>';
    }).join('') + '</ul>';
  }

  function weekHtml(e) {
    return '<div class="emp-week">' + e.week.map(function(d) {
      return '<div class="emp-week__day' + (d.shift === 'Off' ? ' emp-week__day--off' : '') + '"><strong>' + d.day + '</strong><span>' + esc(d.shift) + '</span></div>';
    }).join('') + '</div>';
  }

  function tasksHtml(e) {
    if (!e.tasks.length) return '<p class="pd-note">No open tasks.</p>';
    var tone = { 'Open': 'muted', 'In progress': 'info', 'Blocked': 'danger' };
    return '<ul class="pd-activity emp-tasks">' + e.tasks.map(function(t) {
      var late = t.due < window.EmployeesData.today;
      return '<li><strong>' + esc(t.title) + (t.assigned ? ' <span class="ov-badge ov-badge--info">New</span>' : '') + '</strong>' +
        '<span>' + esc(t.area) + ' · ' + t.priority + ' priority' + (t.note ? ' · ' + esc(t.note) : '') + '</span>' +
        '<time class="' + (late ? 'emp-late' : '') + '">' + (late ? 'Overdue ' : 'Due ') + fmt(t.due) + '</time></li>';
    }).join('') + '</ul>';
  }

  function productOptions(area) {
    var seen = {}, names = [];
    window.ProductsData.getCatalog().forEach(function(p) { if (p.department === area && !seen[p.name]) { seen[p.name] = true; names.push(p.name); } });
    return '<option value="">No specific product</option>' + names.map(function(n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
  }

  function formHtml(e) {
    var due = new Date(window.EmployeesData.today.getTime() + 86400000), iso = due.getFullYear() + '-' + ('0' + (due.getMonth() + 1)).slice(-2) + '-' + ('0' + due.getDate()).slice(-2);
    var opt = function(list, sel) { return list.map(function(v) { return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join(''); };
    return (e.status === 'On leave' ? '<p class="pd-note">' + esc(e.name) + ' is on leave. The task waits for the return, so choose a due date after it.</p>' : '') +
      '<form class="emp-form" id="assign-form" novalidate>' +
        '<label class="emp-form__field">Task<select name="type" class="form-select form-select--stylized">' + opt(TASK_TYPES, TASK_TYPES[0]) + '</select></label>' +
        '<label class="emp-form__field">Area<select name="area" class="form-select form-select--stylized">' + opt(window.EmployeesData.areas, e.primaryArea) + '</select></label>' +
        '<label class="emp-form__field">Product<select name="product" class="form-select form-select--stylized">' + productOptions(e.primaryArea) + '</select></label>' +
        '<label class="emp-form__field">Priority<select name="priority" class="form-select form-select--stylized">' + opt(PRIORITIES, 'Normal') + '</select></label>' +
        '<label class="emp-form__field">Due date<input type="date" name="due" class="form-input" value="' + iso + '" min="2026-12-10"></label>' +
        '<label class="emp-form__field emp-form__field--wide">Instructions<textarea name="note" class="form-input" rows="2" placeholder="Optional"></textarea></label>' +
        '<p class="emp-form__error" id="assign-error" hidden></p>' +
        '<div class="emp-form__actions"><button type="submit" class="btn btn--primary btn--medium">Assign task</button></div>' +
      '</form>';
  }

  function drawerHtml(e) {
    return '<div class="drawer__header"><button class="drawer__close" id="employee-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title emp-drawer-title">' + avatar(e.name, 'emp-avatar emp-avatar--large') + '<span>' + esc(e.name) + ' — ' + esc(e.role) + '</span></h3></div>' +
      '<div class="drawer__body">' +
        section('Profile', dl([
          ['Employee ID', e.id], ['Role', esc(e.role)], ['Status today', '<span class="ov-badge ov-badge--' + STATUS_TONE[e.status] + '">' + e.status + '</span>'], ['Contract', e.contract],
          ['Hired on', e.hired], ['Reports to', esc(e.manager)], ['E-mail', esc(e.email) + copyBtn(e.email)], ['Phone', esc(e.phone) + copyBtn(e.phone)]
        ])) +
        section('Where they work', areasHtml(e) + dl([['Usual shift', esc(e.shift)], ['Certifications', esc(e.certifications.join(', '))]])) +
        section('This week', weekHtml(e)) +
        section('Open tasks (' + e.tasks.length + ')', tasksHtml(e)) +
        section('Assign a task', formHtml(e)) +
      '</div>';
  }

  /** The drawer with the form to add an employee to this store. */
  function openAddDrawer() {
    var overlay = document.getElementById('employee-drawer'), drawer = overlay.querySelector('.drawer');
    drawer.innerHTML = '<div class="drawer__header"><button class="drawer__close" id="employee-drawer-close" aria-label="Close"><lucide-icon name="x" style="font-size:24px"></lucide-icon></button>' +
      '<h3 class="drawer__title">Add employee</h3></div><div class="drawer__body">' + section('New team member of ' + esc(site().storeName), window.EmployeeForm.html()) + '</div>';
    overlay.classList.add('drawer-overlay--open');
    currentId = '';
    var input = drawer.querySelector('[name="name"]');
    if (input) input.focus();
  }

  function submitAdd(form) {
    var res = window.EmployeeForm.read(form, people.map(function(e) { return e.name; })), err = document.getElementById('add-employee-error');
    if (res.error) {
      err.textContent = res.error; err.hidden = false;
      var bad = form.querySelector('[name="' + res.field + '"]'); if (bad) bad.focus();
      return;
    }
    var person = window.EmployeesData.add(site(), program(), res.data);
    state.query = ''; state.quick = 'all';
    var search = document.getElementById('employees-search'); if (search) search.value = '';
    render();
    openDrawer(person.id, false);
    if (window.StoreOverview) window.StoreOverview.render();
    if (typeof window.showNotification === 'function') window.showNotification('success', person.name + ' was added to the team.');
  }

  function openDrawer(id, focusForm) {
    var e = people.filter(function(x) { return x.id === id; })[0];
    if (!e) return;
    var overlay = document.getElementById('employee-drawer');
    var drawer = overlay.querySelector('.drawer');
    drawer.innerHTML = drawerHtml(e);
    overlay.classList.add('drawer-overlay--open');
    currentId = id;
    var body = drawer.querySelector('.drawer__body');
    if (focusForm) {
      var form = drawer.querySelector('#assign-form');
      if (form) { form.scrollIntoView({ block: 'start' }); form.querySelector('select').focus({ preventScroll: true }); }
    } else if (body) {
      body.scrollTop = 0;
    }
  }

  function closeDrawer() {
    var overlay = document.getElementById('employee-drawer');
    if (overlay) overlay.classList.remove('drawer-overlay--open');
    currentId = null;
  }

  function submit(form) {
    var data = new FormData(form), err = document.getElementById('assign-error');
    var dueStr = data.get('due'), parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueStr || '');
    var due = parts ? new Date(+parts[1], +parts[2] - 1, +parts[3]) : null;
    if (!due || due < window.EmployeesData.today) {
      err.textContent = due ? 'The due date cannot be in the past.' : 'Choose a due date.';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    var product = data.get('product'), type = data.get('type');
    var task = window.EmployeesData.assign(site(), program(), currentId, {
      title: type + ' · ' + (product || data.get('area')), area: data.get('area'), product: product, priority: data.get('priority'), due: due, note: String(data.get('note') || '').trim()
    });
    if (!task) return;
    var id = currentId, name = task.who;
    renderRows();
    renderChips();
    openDrawer(id, false);
    if (window.StoreOverview) window.StoreOverview.render();
    if (typeof window.showNotification === 'function') window.showNotification('success', 'Task assigned to ' + name + '.');
  }

  /* ---------- wiring ---------- */

  function build(view) {
    view.dataset.ready = '1';
    view.innerHTML =
      '<div class="products-toolbar products-toolbar--stacked">' +
        '<div class="products-search"><lucide-icon name="search" style="font-size:16px"></lucide-icon>' +
          '<input type="text" id="employees-search" class="products-search__input" placeholder="Search by name, ID, role or area" autocomplete="off"></div>' +
        '<div class="form-group products-area" id="employees-area"></div>' +
        '<button type="button" class="btn btn--primary btn--medium emp-add toolbar-add" id="employees-add"><lucide-icon name="plus" style="font-size:16px"></lucide-icon> <span>Add employee</span></button>' +
        '<div class="products-chips" id="employees-chips"></div>' +
      '</div>' +
      '<div class="table-container products-container"><table class="table table--employees"><thead class="table__head"><tr class="table__row" id="employees-head"></tr></thead>' +
        '<tbody class="table__body" id="employees-body"></tbody></table></div>' +
      '<div class="drawer-overlay" id="employee-drawer"><div class="drawer drawer--right product-drawer"></div></div>';

    areaFilter = window.MultiSelect.create(document.getElementById('employees-area'), { options: window.EmployeesData.areas, onChange: renderRows });
    resizer = window.TableResize.create(view.querySelector('table'), { key: 'employees-v4', defaults: WIDTHS, grow: 5, fixed: [0] });

    view.addEventListener('input', function(e) {
      if (e.target.id !== 'employees-search') return;
      state.query = e.target.value.trim().toLowerCase();
      renderRows();
    });
    view.addEventListener('change', function(e) {
      if (e.target.name === 'area' && e.target.closest('#assign-form')) {
        e.target.closest('#assign-form').querySelector('[name="product"]').innerHTML = productOptions(e.target.value);
      }
    });
    view.addEventListener('submit', function(e) {
      if (e.target.id === 'add-employee-form') { e.preventDefault(); submitAdd(e.target); return; }
      if (e.target.id !== 'assign-form') return;
      e.preventDefault();
      submit(e.target);
    });
    view.addEventListener('click', function(e) {
      var chip = e.target.closest('[data-quick]');
      if (chip) {
        var q = chip.getAttribute('data-quick');
        state.quick = state.quick === q ? 'all' : q;
        renderChips();
        renderRows();
        return;
      }
      var th = e.target.closest('th[data-sort]');
      if (th) {
        var key = th.getAttribute('data-sort');
        state.sortDir = state.sortKey === key ? -state.sortDir : 1;
        state.sortKey = key;
        renderRows();
        return;
      }
      if (e.target.closest('.products-cell--select')) return;   // the tick boxes have their own handler (change)
      if (e.target.closest('#employees-add')) { openAddDrawer(); return; }
      var assign = e.target.closest('[data-assign]');
      if (assign) { if (!assign.disabled) openDrawer(assign.getAttribute('data-assign'), true); return; }
      var cp = e.target.closest('[data-copy]');
      if (cp) { copyText(cp.getAttribute('data-copy'), cp); return; }
      if (e.target.closest('#employee-drawer-close') || e.target.id === 'employee-drawer') { closeDrawer(); return; }
      var row = e.target.closest('.products-row');
      if (row) openDrawer(row.getAttribute('data-id'), false);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && currentId !== null) closeDrawer();
    });
    view.addEventListener('change', function(e) {
      var box = e.target;
      if (!box.classList || !box.classList.contains('products-check')) return;
      if (box.id === 'employees-select-all') {
        visible().forEach(function(p) { if (box.checked) selected[p.id] = true; else delete selected[p.id]; });
        renderRows();
        return;
      }
      var id = box.getAttribute('data-select'), tr = box.closest('tr');
      if (box.checked) selected[id] = true; else delete selected[id];
      if (tr) tr.classList.toggle('products-row--selected', box.checked);
      syncSelectAll();
    });
    view.addEventListener('keydown', function(e) {
      var row = e.target.closest && e.target.closest('.products-row');
      if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(row.getAttribute('data-id'), false); }
    });
  }

  window.EmployeesTable = {
    init: function() {
      var view = document.getElementById('employees-view');
      if (!view) return;
      build(view);
      render();
      // Dropdowns update the current city / store first (their listeners were attached earlier)
      ['program-select', 'site-select'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', render);
      });
    },
    render: render
  };
})();
