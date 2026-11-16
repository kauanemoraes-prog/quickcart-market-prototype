/**
 * Multi Select
 * Area filter of the tables: a dropdown where every area has a check box. A checked area is shown in the table,
 * an unchecked one is hidden, so the list always tells what the table is showing. Everything is checked at first.
 * The button shows the selection in words ("All areas", "Produce, Bakery", "3 of 13 areas").
 *
 *   var ms = MultiSelect.create(host, { options: ['Produce', ...], label: 'areas', onChange: function(selected) {} });
 *   ms.shows('Produce')   // is this area checked?
 *   ms.set(['Produce'])   // check only these
 */

(function() {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function create(host, opts) {
    var options = opts.options.slice(), noun = opts.label || 'areas', selected = options.slice();

    host.classList.add('ms');
    host.innerHTML =
      '<button type="button" class="ms__trigger" aria-haspopup="listbox" aria-expanded="false"><span class="ms__value"></span>' +
        '<lucide-icon name="chevron-down" style="font-size:16px"></lucide-icon></button>' +
      '<div class="ms__panel" role="listbox" aria-multiselectable="true" hidden>' +
        '<div class="ms__actions"><button type="button" class="ms__link" data-ms-all>Select all</button><button type="button" class="ms__link" data-ms-none>Clear</button></div>' +
        '<ul class="ms__list"></ul></div>';
    var trigger = host.querySelector('.ms__trigger'), panel = host.querySelector('.ms__panel'), list = host.querySelector('.ms__list');

    function summary() {
      if (selected.length === options.length) return 'All ' + noun;
      if (!selected.length) return 'No ' + noun;
      if (selected.length <= 2) return selected.join(', ');
      return selected.length + ' of ' + options.length + ' ' + noun;
    }

    function paint() {
      var value = host.querySelector('.ms__value');
      value.textContent = summary();
      trigger.title = selected.length === options.length ? '' : selected.join(', ');
      list.innerHTML = options.map(function(o) {
        var on = selected.indexOf(o) !== -1;
        return '<li><button type="button" class="ms__item' + (on ? ' ms__item--on' : '') + '" role="option" aria-selected="' + on + '" data-ms-option="' + esc(o) + '">' +
          '<span class="ms__box">' + (on ? '<lucide-icon name="check" style="font-size:12px"></lucide-icon>' : '') + '</span><span class="ms__name">' + esc(o) + '</span></button></li>';
      }).join('');
    }

    function change(next) {
      selected = options.filter(function(o) { return next.indexOf(o) !== -1; });
      paint();
      if (opts.onChange) opts.onChange(selected.slice());
    }

    function open(on) {
      panel.hidden = !on;
      trigger.setAttribute('aria-expanded', String(on));
    }

    trigger.addEventListener('click', function() { open(panel.hidden); });
    panel.addEventListener('click', function(e) {
      if (e.target.closest('[data-ms-all]')) { change(options); return; }
      if (e.target.closest('[data-ms-none]')) { change([]); return; }
      var item = e.target.closest('[data-ms-option]');
      if (!item) return;
      var name = item.getAttribute('data-ms-option');
      change(selected.indexOf(name) === -1 ? selected.concat([name]) : selected.filter(function(x) { return x !== name; }));
    });
    document.addEventListener('click', function(e) { if (!panel.hidden && e.composedPath().indexOf(host) === -1) open(false); });
    host.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !panel.hidden) { open(false); trigger.focus(); } });

    paint();

    return {
      shows: function(name) { return selected.indexOf(name) !== -1; },
      isAll: function() { return selected.length === options.length; },
      get: function() { return selected.slice(); },
      /** Replace the list of options (the filter that depends on another one): everything stays checked if everything was. */
      setOptions: function(names) {
        var wasAll = selected.length === options.length;
        options = names.slice();
        selected = wasAll ? options.slice() : options.filter(function(o) { return selected.indexOf(o) !== -1; });
        paint();
      },
      set: function(names) { selected = options.filter(function(o) { return names.indexOf(o) !== -1; }); paint(); }
    };
  }

  window.MultiSelect = { create: create };
})();
