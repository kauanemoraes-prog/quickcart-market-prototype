/**
 * Schedule page
 * The full timeline: one row per exhibition at a museum, grouped by exhibition or by museum, filtered
 * by exhibition, museum, phase and status. Clicking a block, a milestone or a label opens the
 * exhibition detail for that museum.
 */

(function() {
  'use strict';

  var M = window.ScheduleModel;
  var ALL = 'all';
  var state = { exhibition: ALL, museum: ALL, phase: ALL, status: ALL, group: 'exhibition', range: 'full' };
  var STATUSES = ['On track', 'At risk', 'Delayed'];

  var RANGES = [
    { id: 'full', label: 'Full schedule' },
    { id: '6m', label: 'Next 6 months', before: 30, after: 183 },
    { id: '3m', label: 'Next 3 months', before: 30, after: 92 },
    { id: '1m', label: 'Next 30 days', before: 7, after: 37 }
  ];

  var placements = [];

  function fillSelect(id, allLabel, options) {
    var el = document.getElementById(id);
    el.innerHTML = '<option value="' + ALL + '">' + allLabel + '</option>' +
      options.map(function(o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    return el;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function setupControls() {
    var programs = window.ProgramsData.getAll();
    var museums = {};
    placements.forEach(function(pl) { museums[pl.s.site] = true; });

    fillSelect('filter-exhibition', 'All exhibitions', programs.map(function(p) { return [esc(p.code), esc(p.code + ' · ' + p.name)]; }));
    fillSelect('filter-museum', 'All museums', Object.keys(museums).sort().map(function(m) { return [esc(m), esc(m)]; }));
    fillSelect('filter-phase', 'All phases', M.PHASES.map(function(ph) { return [ph, ph]; }));
    fillSelect('filter-status', 'All statuses', STATUSES.map(function(st) { return [st, st]; }));

    var range = document.getElementById('filter-range');
    range.innerHTML = RANGES.map(function(r) { return '<option value="' + r.id + '">' + r.label + '</option>'; }).join('');

    [['filter-exhibition', 'exhibition'], ['filter-museum', 'museum'], ['filter-phase', 'phase'], ['filter-status', 'status'], ['filter-range', 'range']]
      .forEach(function(pair) {
        document.getElementById(pair[0]).addEventListener('change', function(e) {
          state[pair[1]] = e.target.value;
          draw();
        });
      });

    document.querySelectorAll('.schedule-toggle__btn').forEach(function(b) {
      b.addEventListener('click', function() {
        state.group = b.getAttribute('data-group');
        document.querySelectorAll('.schedule-toggle__btn').forEach(function(x) {
          var on = x === b;
          x.classList.toggle('schedule-toggle__btn--active', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        draw();
      });
    });

    document.getElementById('filter-reset').addEventListener('click', function() {
      ['exhibition', 'museum', 'phase', 'status'].forEach(function(k) {
        state[k] = ALL;
        var sel = document.getElementById('filter-' + k);
        sel.value = ALL;
        sel.dispatchEvent(new Event('input', { bubbles: true }));
      });
      draw();
    });

    document.getElementById('schedule-legend').innerHTML = window.Gantt.legend();
  }

  function visibleRange() {
    var r = RANGES.filter(function(x) { return x.id === state.range; })[0];
    if (r && r.after) return [M.addDays(M.TODAY, -r.before), M.addDays(M.TODAY, r.after)];
    var start = placements.reduce(function(a, pl) { return pl.start < a ? pl.start : a; }, placements[0].start);
    var end = placements.reduce(function(a, pl) { return pl.end > a ? pl.end : a; }, placements[0].end);
    return [M.addDays(start, -7), M.addDays(end, 7)];
  }

  function matches(pl) {
    return (state.exhibition === ALL || pl.p.code === state.exhibition) &&
      (state.museum === ALL || pl.s.site === state.museum) &&
      (state.phase === ALL || pl.s.currentPhase === state.phase) &&
      (state.status === ALL || pl.s.status === state.status);
  }

  function draw() {
    var range = visibleRange();
    var rows = placements.filter(function(pl) { return matches(pl) && pl.end > range[0] && pl.start < range[1]; })
      .sort(function(a, b) { return a.open - b.open; });

    var byExhibition = state.group === 'exhibition';
    var groups = {};
    rows.forEach(function(pl) {
      var k = byExhibition ? pl.p.code : pl.s.site;
      (groups[k] = groups[k] || []).push(pl);
    });

    var flat = [];
    Object.keys(groups).sort().forEach(function(k) {
      var first = groups[k][0];
      flat.push(byExhibition
        ? { type: 'group', label: first.p.code + ' ' + first.p.name, sub: 'Admin: ' + first.p.admin }
        : { type: 'group', label: k, sub: groups[k].length + (groups[k].length === 1 ? ' exhibition' : ' exhibitions') });
      groups[k].forEach(function(pl) {
        flat.push({
          type: 'row',
          placement: pl,
          label: byExhibition ? pl.s.site : pl.p.code + ' ' + pl.p.name,
          sub: pl.s.currentPhase + ' · ' + pl.s.status + ' · ' + pl.s.lead
        });
      });
    });

    var exhibitions = {}, museums = {};
    rows.forEach(function(pl) { exhibitions[pl.p.code] = true; museums[pl.s.site] = true; });
    document.getElementById('schedule-summary').textContent =
      rows.length + ' placements · ' + Object.keys(exhibitions).length + ' exhibitions · ' + Object.keys(museums).length + ' museums';

    window.Gantt.render(document.getElementById('schedule-gantt'), {
      rows: flat,
      start: range[0],
      end: range[1],
      base: '../programs/',
      corner: byExhibition ? 'Exhibition / Museum' : 'Museum / Exhibition',
      empty: 'No placements match these filters.'
    });
  }

  function init() {
    placements = M.placements();
    setupControls();
    draw();
  }

  function safeInit() {
    try { init(); } catch (err) { console.error('Schedule init failed:', err); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
