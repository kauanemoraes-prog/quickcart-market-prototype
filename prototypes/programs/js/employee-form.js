/**
 * Employee form
 * The form to add an employee, used by the Employees tab of a store and by the Employees page of the network (which also asks for the store).
 *   EmployeeForm.html({ stores: [{ value, label }] })   // the form; the Store field only appears when stores are given
 *   EmployeeForm.read(form, existingNames)               // { data } or { error, field }
 */

(function() {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function opts(list, selected) {
    return list.map(function(v) {
      var value = typeof v === 'string' ? v : v.value, label = typeof v === 'string' ? v : v.label;
      return '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
  }

  window.EmployeeForm = {
    html: function(o) {
      o = o || {};
      var D = window.EmployeesData;
      return '<form class="emp-form" id="add-employee-form" novalidate>' +
        (o.stores ? '<label class="emp-form__field emp-form__field--wide">Store<select name="store" class="form-select form-select--stylized">' + opts(o.stores) + '</select></label>' : '') +
        '<label class="emp-form__field emp-form__field--wide">Full name<input type="text" name="name" class="form-input" autocomplete="off" placeholder="First and last name"></label>' +
        '<label class="emp-form__field">Role<select name="role" class="form-select form-select--stylized">' + opts(D.roles().filter(function(r) { return r !== 'Store Manager'; }), 'Stock Clerk') + '</select></label>' +
        '<label class="emp-form__field">Usual area<select name="area" class="form-select form-select--stylized">' + opts(D.areas) + '</select></label>' +
        '<label class="emp-form__field">Shift<select name="shift" class="form-select form-select--stylized">' + opts(D.shifts) + '</select></label>' +
        '<label class="emp-form__field">Contract<select name="contract" class="form-select form-select--stylized">' + opts(['Full-time', 'Part-time']) + '</select></label>' +
        '<label class="emp-form__field">E-mail<input type="email" name="email" class="form-input" placeholder="Optional"></label>' +
        '<label class="emp-form__field">Phone<input type="tel" name="phone" class="form-input" placeholder="Optional"></label>' +
        '<p class="emp-form__error" id="add-employee-error" hidden></p>' +
        '<div class="emp-form__actions"><button type="submit" class="btn btn--primary btn--medium">Add employee</button></div>' +
      '</form>';
    },
    read: function(form, existing) {
      var f = new FormData(form), name = String(f.get('name') || '').replace(/\s+/g, ' ').trim(), email = String(f.get('email') || '').trim();
      if (name.split(' ').length < 2 || name.length < 5) return { error: 'Enter the first and the last name.', field: 'name' };
      if ((existing || []).some(function(n) { return n.toLowerCase() === name.toLowerCase(); })) return { error: name + ' already works in this store.', field: 'name' };
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid e-mail, like name@quickcart.example.', field: 'email' };
      return { data: { name: name, role: f.get('role'), area: f.get('area'), shift: f.get('shift'), contract: f.get('contract'), email: email, phone: String(f.get('phone') || '').trim(), store: f.get('store') } };
    }
  };
})();
