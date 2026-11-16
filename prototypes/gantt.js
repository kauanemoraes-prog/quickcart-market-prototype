/**
 * Gantt timeline renderer, shared by the dashboard (next milestones) and the Schedule page.
 *
 *   Gantt.render(container, {
 *     rows:   [{ type: 'group', label, sub } | { type: 'row', label, sub, href, placement }],
 *     start:  Date, end: Date,        // visible range
 *     base:   '../programs/',         // folder of program-detail.html relative to the page
 *     empty:  'text shown without rows'
 *   });
 *
 * Positions are percentages of the visible range, so the chart fits its container. Each phase is a
 * link to the exhibition detail (code + museum); the opening date and the closing date are
 * diamonds, with the opening date written under the bar.
 */

(function() {
  'use strict';

  var M = window.ScheduleModel;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function key(phase) {
    return phase.toLowerCase();
  }

  function statusKey(status) {
    return String(status).toLowerCase().replace(/\s+/g, '-');
  }

  function render(container, opts) {
    var start = opts.start, end = opts.end;
    var span = M.daysBetween(start, end) || 1;
    var base = opts.base;
    var pct = function(date) { return (M.daysBetween(start, date) / span) * 100; };

    // Month axis: a tick at the first day of each month inside the range
    var ticks = '';
    var cursor = new Date(start.getFullYear(), start.getMonth() + (start.getDate() > 1 ? 1 : 0), 1);
    while (cursor < end) {
      var left = pct(cursor);
      var label = M.MONTH_NAMES[cursor.getMonth()] + (cursor.getMonth() === 0 || ticks === '' ? ' ' + cursor.getFullYear() : '');
      ticks += '<span class="gantt__tick" style="left:' + left.toFixed(3) + '%"><span>' + label + '</span></span>';
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    var todayLeft = pct(M.TODAY);
    var todayVisible = todayLeft >= 0 && todayLeft <= 100;

    // Month lines behind the rows (same positions as the axis ticks)
    var lines = '';
    var c2 = new Date(start.getFullYear(), start.getMonth() + (start.getDate() > 1 ? 1 : 0), 1);
    while (c2 < end) {
      lines += '<span class="gantt__line" style="left:' + pct(c2).toFixed(3) + '%"></span>';
      c2 = new Date(c2.getFullYear(), c2.getMonth() + 1, 1);
    }

    var rowsHtml = opts.rows.map(function(r) {
      if (r.type === 'group') {
        return '<div class="gantt__group"><span class="gantt__group-label">' + esc(r.label) + '</span>' +
          (r.sub ? '<span class="gantt__group-sub">' + esc(r.sub) + '</span>' : '') + '</div>';
      }
      var pl = r.placement;
      var href = M.detailHref(pl.p.code, pl.s.site, base);
      var bars = pl.segments.map(function(seg) {
        if (seg.end <= start || seg.start >= end) return '';
        var l = Math.max(pct(seg.start), 0), rgt = Math.min(pct(seg.end), 100);
        var cls = 'gantt-bar gantt-bar--' + key(seg.phase) + ' gantt-bar--' + seg.state +
          (seg.state === 'current' ? ' gantt-bar--status-' + statusKey(pl.s.status) : '');
        var title = seg.phase + ' · ' + M.shortDate(seg.start) + ' – ' + M.shortDate(seg.end) +
          (seg.state === 'current' ? ' · ' + pl.s.status : '');
        return '<a class="' + cls + '" style="left:' + l.toFixed(3) + '%;width:' + (rgt - l).toFixed(3) + '%" href="' + href + '" title="' + esc(title) + '">' +
          '<span>' + seg.phase + '</span></a>';
      }).join('');

      var marks = '';
      if (pl.open >= start && pl.open <= end) {
        marks += '<a class="gantt-milestone gantt-milestone--opening" style="left:' + pct(pl.open).toFixed(3) + '%" href="' + href + '" title="Opening · ' + M.fullDate(pl.open) + '">' +
          '<i></i><span>' + M.shortDate(pl.open) + '</span></a>';
      }
      if (pl.close >= start && pl.close <= end) {
        marks += '<a class="gantt-milestone gantt-milestone--closing" style="left:' + pct(pl.close).toFixed(3) + '%" href="' + href + '" title="Closing · ' + M.fullDate(pl.close) + '"><i></i></a>';
      }

      return '<div class="gantt__row">' +
        '<a class="gantt__label" href="' + href + '"><strong>' + esc(r.label) + '</strong>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</a>' +
        '<div class="gantt__track">' + bars + marks + '</div>' +
      '</div>';
    }).join('');

    if (!opts.rows.length) {
      container.innerHTML = '<p class="gantt__empty">' + esc(opts.empty || 'Nothing to show.') + '</p>';
      return;
    }

    container.innerHTML =
      '<div class="gantt">' +
        '<div class="gantt__head"><div class="gantt__corner">' + esc(opts.corner || '') + '</div><div class="gantt__axis">' + ticks + '</div></div>' +
        '<div class="gantt__body">' +
          '<div class="gantt__overlay" aria-hidden="true">' +
            lines +
            (todayVisible ? '<span class="gantt__today" style="left:' + todayLeft.toFixed(3) + '%"></span>' : '') +
          '</div>' +
          rowsHtml +
        '</div>' +
      '</div>';
  }

  /** Legend for the phase colors and the markers. */
  function legend() {
    return '<ul class="gantt-legend">' +
      M.PHASES.map(function(ph) { return '<li><i class="gantt-legend__swatch gantt-bar--' + key(ph) + '"></i>' + ph + '</li>'; }).join('') +
      '<li><i class="gantt-legend__diamond"></i>Opening date</li>' +
      '<li><i class="gantt-legend__diamond gantt-legend__diamond--hollow"></i>Closing</li>' +
      '<li><i class="gantt-legend__line"></i>Today</li>' +
    '</ul>';
  }

  window.Gantt = { render: render, legend: legend };
})();
