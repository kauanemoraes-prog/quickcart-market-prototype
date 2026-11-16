/**
 * Schedule model
 * Turns the mock exhibition data into a timeline: for every exhibition at a museum (a "placement")
 * the date range of each phase, plus the milestones (opening, closing).
 *
 * The phases are laid out around the opening date O (in days from O):
 *   Planning      O-204 .. O-134
 *   Preparation   O-134 .. O-74
 *   Installation  O-74  .. O-14
 *   Opening       O-14  .. O+60   (the opening date O sits inside this phase)
 *   Dismantling   O+60  .. O+90
 * The mock openingDate values are generated so that "today" falls inside each placement's
 * current phase.
 */

(function() {
  'use strict';

  var MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY = 86400000;

  // The mock data is dated up to 19 Feb 2026; deadlines are measured from 20 Feb 2026.
  var TODAY = new Date(2026, 11, 10);

  var PHASES = ['Planning', 'Preparation', 'Installation', 'Opening', 'Dismantling'];
  var OFFSETS = {
    Planning: [-204, -134],
    Preparation: [-134, -74],
    Installation: [-74, -14],
    Opening: [-14, 60],
    Dismantling: [60, 90]
  };
  var CLOSING_OFFSET = 60;

  function parseDate(str) {
    var m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(String(str || '').trim());
    return m ? new Date(+m[3], MONTHS[m[2]], +m[1]) : null;
  }

  function addDays(date, n) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / DAY);
  }

  function shortDate(date) {
    return date.getDate() + ' ' + MONTH_NAMES[date.getMonth()];
  }

  function fullDate(date) {
    return shortDate(date) + ' ' + date.getFullYear();
  }

  function detailHref(code, site, base) {
    return (base || '../programs/') + 'program-detail.html?code=' + encodeURIComponent(code) + '&site=' + encodeURIComponent(site);
  }

  /** One entry per exhibition at a museum, with its phase windows and milestones. */
  function placements() {
    var out = [];
    window.ProgramsData.getAll().forEach(function(p) {
      p.sites.forEach(function(s) {
        var open = parseDate(s.openingDate);
        if (!open) return;
        var segments = PHASES.map(function(ph) {
          var start = addDays(open, OFFSETS[ph][0]);
          var end = addDays(open, OFFSETS[ph][1]);
          return {
            phase: ph,
            start: start,
            end: end,
            state: end <= TODAY ? 'past' : (start <= TODAY ? 'current' : 'future')
          };
        });
        out.push({
          p: p,
          s: s,
          open: open,
          close: addDays(open, CLOSING_OFFSET),
          start: segments[0].start,
          end: segments[segments.length - 1].end,
          segments: segments
        });
      });
    });
    return out;
  }

  window.ScheduleModel = {
    TODAY: TODAY,
    PHASES: PHASES,
    MONTH_NAMES: MONTH_NAMES,
    parseDate: parseDate,
    addDays: addDays,
    daysBetween: daysBetween,
    shortDate: shortDate,
    fullDate: fullDate,
    detailHref: detailHref,
    placements: placements
  };
})();
