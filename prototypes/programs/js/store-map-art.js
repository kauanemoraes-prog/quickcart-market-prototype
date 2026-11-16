/**
 * Store Map Art
 * The artwork of the store map: a flat isometric illustration in the style of the stock "supermarket" scenes (light tiled floor
 * on a thick slab, white shelves full of colored packages, glass fridges with colored headers, wooden crates of fruit, orange
 * checkout lanes, little people). Everything is drawn from a few primitives (a floor point is [x, y, height] on a grid; x and y
 * run along the two walls). StoreMap decides where things go and handles the clicks; this file only knows how to draw them.
 *
 *   StoreMapArt.parts(area)   // [{ box, html }] the pieces of an area, each with its footprint to sort the drawing
 *   StoreMapArt.props()       // [{ box, html }] shoppers, cashiers, carts and gates
 *   StoreMapArt.floor()       // the tiled floor and its slab
 */

(function() {
  'use strict';

  var S = 28;                       // pixels per grid unit
  var C = 0.866, H = 0.5;           // isometric projection of the grid axes
  var FLOOR = { w: 34, d: 23 };
  var OX = (FLOOR.d + 0.6) * C * S + 40, OY = 160;   // 40px of space at the left of the back wall and 40px at the right of the floor
  var ROW_DEPTH = 1.4;

  /* ---------- primitives ---------- */

  function pt(x, y, z) {
    return [Math.round((OX + (x - y) * C * S) * 10) / 10, Math.round((OY + (x + y) * H * S - (z || 0) * S) * 10) / 10];
  }

  function poly(points, fill, extra) {
    return '<polygon points="' + points.map(function(p) { return p.join(','); }).join(' ') + '" fill="' + fill + '"' + (extra || '') + '/>';
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var mix = f < 0 ? 0 : 255, k = Math.abs(f);
    var ch = function(v) { return Math.round(v + (mix - v) * k); };
    return '#' + [ch(r), ch(g), ch(b)].map(function(v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  /** The three faces of a box that the viewer sees: top, the face towards +y (left) and the face towards +x (right). */
  function tones(base) { return { top: shade(base, 0.32), left: base, right: shade(base, -0.18) }; }

  function cuboid(x, y, w, d, h, base, z0, opacity) {
    z0 = z0 || 0;
    var t = typeof base === 'string' ? tones(base) : base, o = opacity != null ? ' fill-opacity="' + opacity + '"' : '';
    return poly([pt(x, y + d, z0), pt(x + w, y + d, z0), pt(x + w, y + d, z0 + h), pt(x, y + d, z0 + h)], t.left, o) +
      poly([pt(x + w, y, z0), pt(x + w, y + d, z0), pt(x + w, y + d, z0 + h), pt(x + w, y, z0 + h)], t.right, o) +
      poly([pt(x, y, z0 + h), pt(x + w, y, z0 + h), pt(x + w, y + d, z0 + h), pt(x, y + d, z0 + h)], t.top, o);
  }

  /** A flat rectangle on the face towards +y (a door, a label...), from x0 to x1 and from z0 to z1, at depth y. */
  function front(x0, x1, y, z0, z1, fill, extra) {
    return poly([pt(x0, y, z0), pt(x1, y, z0), pt(x1, y, z1), pt(x0, y, z1)], fill, extra);
  }

  function ellipse(x, y, z, rx, ry, fill) {
    var p = pt(x, y, z);
    return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"/>';
  }

  function line(a, b, stroke, width) {
    return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round"/>';
  }

  /* ---------- palettes ---------- */

  var GREEN = '#86D14B', YELLOW = '#F6B93B', BLUE = '#3F94E5', ORANGE = '#EF7A3C', RED = '#E5493A', PURPLE = '#8F67D1', PINK = '#EE7FA8', TEAL = '#36B8A8', BROWN = '#B97A45', WHITE = '#FFFFFF';
  var PACKAGES = {
    'Grocery': [GREEN, YELLOW, BLUE, ORANGE],
    'Beverages': [BLUE, GREEN, RED, YELLOW],
    'Cleaning': [BLUE, TEAL, WHITE, GREEN],
    'Health & Beauty': [PINK, PURPLE, WHITE, TEAL],
    'Pet Shop': [BROWN, ORANGE, GREEN, YELLOW]
  };

  /* ---------- shelves: a white unit full of colored packages ---------- */

  function shelfRow(r, h, name, seed) {
    var x = r[0], y = r[1], len = r[2], d = ROW_DEPTH, colors = PACKAGES[name] || PACKAGES['Grocery'], out = '';
    var frame = '#E7C48C', board = '#F6E8CB';
    out += cuboid(x, y, len, 0.1, h, frame, 0);                                  // back panel
    out += cuboid(x, y, 0.1, d, h, shade(frame, -0.04), 0);                      // left end
    var levels = [0.12, 0.7, 1.28, 1.86];
    levels.forEach(function(z, lv) {
      out += cuboid(x + 0.1, y + 0.1, len - 0.1, d - 0.1, 0.07, board, z);       // shelf board
      var tall = name === 'Beverages' ? 0.6 : 0.5, wide = name === 'Beverages' ? 0.2 : 0.3, gap = name === 'Beverages' ? 0.07 : 0.1, n = Math.floor((len - 0.4) / (wide + gap));
      for (var i = 0; i < n; i++) {
        var group = Math.floor((i + seed * 3 + lv * 2) / 4), c = colors[group % colors.length];
        // The packages stand at the front edge of the shelf, so the board above does not hide them
        var bd = name === 'Beverages' ? 0.34 : 0.5, bx = x + 0.3 + i * (wide + gap), by = y + d - 0.08 - bd - (lv % 2 ? 0.06 : 0);
        out += cuboid(bx, by, wide, bd, tall, c, z + 0.07);
      }
    });
    out += cuboid(x + len - 0.1, y, 0.1, d, h, frame, 0);                         // right end
    out += cuboid(x, y, len, d, 0.08, shade(frame, -0.02), h - 0.08);             // top
    return out;
  }

  /* ---------- fridges: tall cabinets with a colored header and glass doors ---------- */

  function fridge(a, header, seed) {
    var out = '', doors = Math.round(a.w / 1.6), dw = a.w / doors, y1 = a.y + a.d;
    var cols = [BLUE, GREEN, YELLOW, RED, PURPLE, TEAL];
    for (var k = 0; k < doors; k++) {
      var x0 = a.x + k * dw, x1 = x0 + dw;
      out += cuboid(x0, a.y, dw, a.d, a.h - 0.36, '#E7C48C', 0);
      out += cuboid(x0, a.y, dw, a.d, 0.38, header[k % header.length], a.h - 0.38);
      // glass door with four shelves of bottles and packages
      out += front(x0 + 0.1, x1 - 0.1, y1, 0.22, a.h - 0.5, '#CFE9F7');
      for (var s = 0; s < 4; s++) {
        var z = 0.38 + s * 0.62;
        out += front(x0 + 0.1, x1 - 0.1, y1, z + 0.5, z + 0.56, '#B9D6E6');
        var n = Math.floor((dw - 0.4) / 0.22);
        for (var i = 0; i < n; i++) {
          var c = cols[(i + s + k + seed) % cols.length];
          out += front(x0 + 0.2 + i * 0.22, x0 + 0.2 + i * 0.22 + 0.15, y1 + 0.01, z, z + 0.46, c);
        }
      }
      out += front(x0 + 0.1, x1 - 0.1, y1 + 0.02, 0.22, a.h - 0.5, '#FFFFFF', ' fill-opacity="0.28"');
      out += line(pt(x1 - 0.22, y1 + 0.03, 0.9), pt(x1 - 0.22, y1 + 0.03, 2.1), '#8B97A3', 2.4);
    }
    return out;
  }

  /* ---------- counters: a display case with a glass top ---------- */

  function counter(a, kind) {
    var alongY = a.d > a.w, out = '';
    out += cuboid(a.x, a.y, a.w, a.d, a.h * 0.72, '#F3E5CC', 0);
    out += cuboid(a.x - 0.04, a.y - 0.04, a.w + 0.08, a.d + 0.08, 0.1, '#F08A2C', 0);           // orange base stripe
    var cx = a.x + 0.18, cy = a.y + 0.18, cw = a.w - 0.36, cd = a.d - 0.36, z = a.h * 0.72;
    out += cuboid(cx, cy, cw, cd, 0.12, '#DCE5EA', z);
    var colors = kind === 'Fish Counter' ? ['#BFD3E0', '#F59A82', '#9EC1D6'] : kind === 'Bakery' ? ['#E3A24B', '#F1C27A', '#C9833A'] : ['#E5584B', '#F08A86', '#C7413A'];
    var n = Math.floor((alongY ? cd : cw) / 0.7);
    for (var i = 0; i < n; i++) {
      var px = alongY ? cx + 0.05 : cx + 0.1 + i * ((cw - 0.2) / n), py = alongY ? cy + 0.1 + i * ((cd - 0.2) / n) : cy + 0.05;
      out += cuboid(px, py, alongY ? cw - 0.1 : (cw - 0.2) / n - 0.1, alongY ? (cd - 0.2) / n - 0.1 : cd - 0.1, 0.22, colors[i % colors.length], z + 0.12);
    }
    out += cuboid(cx, cy, cw, cd, 0.5, '#CFE9F7', z + 0.12, 0.38);                               // glass
    out += cuboid(cx, cy, cw, cd, 0.04, '#FFFFFF', z + 0.62, 0.7);
    return out;
  }

  /* ---------- produce: crates of fruit and vegetables ---------- */

  function produce(a, seed) {
    var WOOD = '#D9A55C', cols = 3, rows = 2, m = 0.22, out = '';
    var mounds = [['#E5483A', '#F7857A'], ['#F18A2F', '#F9B66B'], ['#F6D33B', '#FBEB86'], ['#7BC742', '#B0E27E'], ['#3E9B4A', '#79C985'], ['#8E4E9E', '#BB86C8'], ['#D9382B', '#F27B6E'], ['#A8D34A', '#D2EB86']];
    out += cuboid(a.x, a.y, a.w, a.d, 0.55, WOOD, 0);                                                // the crate
    out += cuboid(a.x + m, a.y + m, a.w - 2 * m, a.d - 2 * m, 0.06, '#9A6A32', 0.5);                  // its dark inside
    var cw = (a.w - 2 * m) / cols, cd = (a.d - 2 * m) / rows, dots = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = a.x + m + c * cw, y = a.y + m + r * cd, col = mounds[(r * cols + c + seed * 2) % mounds.length];
        // A full heap: rows of fruit that fill the compartment from edge to edge, piled in three layers, in two kinds per compartment
        var alt = mounds[(r * cols + c + seed * 2 + 3) % mounds.length], nx = 7, ny = 5;
        for (var layer = 0; layer < 3; layer++) {
          var cnt = layer === 0 ? 1 : (layer === 1 ? 0.8 : 0.55);
          for (var gy = 0; gy < ny; gy++) {
            for (var gx = 0; gx < nx; gx++) {
              var u = (gx + 0.5 + (layer % 2 ? 0.5 : 0) + (((gy * 5 + gx * 3 + layer) % 3) - 1) * 0.12) / (nx + 0.5), v = (gy + 0.5 + (((gx * 7 + gy + layer) % 3) - 1) * 0.1) / ny;
              if (layer && (u < 0.5 - cnt / 2 || u > 0.5 + cnt / 2 || v < 0.5 - cnt / 2 || v > 0.5 + cnt / 2)) continue;
              var k = gx * 3 + gy * 5 + layer;
              dots.push({ fx: x + cw * (0.07 + u * 0.86), fy: y + cd * (0.07 + v * 0.86), z: 0.58 + layer * 0.17, col: k % 5 === 0 ? alt : col, i: k });
            }
          }
        }
      }
    }
    // Compartment dividers (low wooden slats), then the produce from the back to the front so it piles up
    for (var k = 1; k < cols; k++) out += cuboid(a.x + m + k * cw - 0.05, a.y + m, 0.1, a.d - 2 * m, 0.34, WOOD, 0.5);
    for (var q = 1; q < rows; q++) out += cuboid(a.x + m, a.y + m + q * cd - 0.05, a.w - 2 * m, 0.1, 0.34, WOOD, 0.5);
    dots.sort(function(p1, p2) { return (p1.fx + p1.fy + p1.z * 0.5) - (p2.fx + p2.fy + p2.z * 0.5); });
    dots.forEach(function(d) {
      out += ellipse(d.fx, d.fy, d.z, 7.4, 5.8, shade(d.col[0], -0.14));
      out += ellipse(d.fx, d.fy, d.z + 0.03, 6.8, 5.2, d.col[0]);
      out += ellipse(d.fx - 0.05, d.fy - 0.07, d.z + 0.09, 2.8, 1.8, d.col[1]);
    });
    return out;
  }

  /* ---------- the stock room: a closed block with a door and cartons outside ---------- */

  function room(a) {
    var out = cuboid(a.x, a.y, a.w, a.d, a.h, { top: '#D5DAE0', left: '#B8C0CA', right: '#9AA4B1' }, 0);
    out += front(a.x, a.x + a.w, a.y + a.d, a.h - 0.45, a.h - 0.15, '#3F94E5');                                  // blue trim
    out += poly([pt(a.x + a.w, a.y, a.h - 0.45), pt(a.x + a.w, a.y + a.d, a.h - 0.45), pt(a.x + a.w, a.y + a.d, a.h - 0.15), pt(a.x + a.w, a.y, a.h - 0.15)], '#2F76BE');
    out += front(a.x + a.w / 2 - 1.1, a.x + a.w / 2 + 1.1, a.y + a.d, 0, 2.0, '#6C7686');
    for (var i = 0; i < 5; i++) out += front(a.x + a.w / 2 - 1.1, a.x + a.w / 2 + 1.1, a.y + a.d + 0.02, 0.35 + i * 0.35, 0.38 + i * 0.35, '#8A95A5');
    var cartons = [[a.x + 0.4, a.y + a.d + 0.4, 0.9], [a.x + 1.5, a.y + a.d + 0.5, 0.7], [a.x + 0.7, a.y + a.d + 0.4, 0.9, 0.9]];
    out += cuboid(a.x + 0.4, a.y + a.d + 0.3, 1.0, 0.9, 0.8, '#D4A06A', 0);
    out += cuboid(a.x + 0.5, a.y + a.d + 0.4, 0.8, 0.7, 0.6, '#E0B27F', 0.8);
    out += cuboid(a.x + 1.7, a.y + a.d + 0.3, 1.1, 0.9, 0.6, '#C98F55', 0);
    out += cuboid(a.x + a.w - 2.4, a.y + a.d + 0.3, 1.0, 0.9, 0.8, '#D4A06A', 0);
    out += cuboid(a.x + a.w - 1.2, a.y + a.d + 0.3, 0.9, 0.9, 0.5, '#C98F55', 0);
    return out;
  }

  /* ---------- checkout lanes ---------- */

  function checkout(a) {
    var out = '', lanes = 4, ld = 1.0, gap = (a.d - lanes * ld) / (lanes - 1), len = a.w - 1.2;
    for (var i = 0; i < lanes; i++) {
      var y = a.y + i * (ld + gap);
      out += cuboid(a.x, y, len, ld, 0.85, '#F08A2C', 0);
      out += cuboid(a.x, y, len, ld, 0.07, '#F6EAD0', 0.85);
      out += cuboid(a.x + 0.3, y + 0.2, len * 0.55, ld - 0.4, 0.05, '#5C6573', 0.92);        // conveyor belt
      out += cuboid(a.x + len, y + 0.08, 1.1, ld - 0.16, 1.0, '#E7EBEF', 0);                  // till
      out += cuboid(a.x + len + 0.25, y + 0.25, 0.6, ld - 0.5, 0.42, '#2F3A49', 1.0);
      out += front(a.x + len + 0.3, a.x + len + 0.8, y + ld - 0.24, 1.08, 1.34, '#5AB0F0');
    }
    return out;
  }

  /* ---------- the areas ---------- */

  /** A soft shadow on the floor, cast to the right and to the front of a footprint. */
  function shadow(x, y, w, d) {
    return poly([pt(x + 0.1, y + 0.1, 0), pt(x + w + 0.7, y + 0.1, 0), pt(x + w + 0.7, y + d + 0.7, 0), pt(x + 0.1, y + d + 0.7, 0)], 'rgba(40,52,70,0.16)', ' pointer-events="none"');
  }

  function box(x0, x1, y0, y1) { return { x0: x0, x1: x1, y0: y0, y1: y1 }; }

  function parts(a, seed) {
    if (a.kind === 'aisle') {
      return a.rows.map(function(r, i) { return { box: box(r[0], r[0] + r[2], r[1], r[1] + ROW_DEPTH), html: shadow(r[0], r[1], r[2], ROW_DEPTH) + shelfRow(r, a.h, a.name, seed + i) }; });
    }
    var html;
    if (a.kind === 'fridge') html = fridge(a, a.name === 'Dairy' ? [BLUE, WHITE, BLUE, WHITE] : [RED, RED, GREEN, GREEN], seed);
    else if (a.kind === 'counter') html = counter(a, a.name);
    else if (a.kind === 'produce') html = produce(a, seed);
    else if (a.kind === 'room') html = room(a);
    else html = checkout(a);
    var extraY = a.kind === 'room' ? 1.4 : 0;
    return [{ box: box(a.x, a.x + a.w, a.y, a.y + a.d + extraY), html: shadow(a.x, a.y, a.w, a.d) + html }];
  }

  /* ---------- the floor: light tiles on a thick slab ---------- */

  function floor() {
    var t = 1.0, out = '';
    out += poly([pt(0, FLOOR.d, 0), pt(FLOOR.w, FLOOR.d, 0), pt(FLOOR.w, FLOOR.d, -t), pt(0, FLOOR.d, -t)], '#D9DDE2');
    out += poly([pt(FLOOR.w, 0, 0), pt(FLOOR.w, FLOOR.d, 0), pt(FLOOR.w, FLOOR.d, -t), pt(FLOOR.w, 0, -t)], '#B9BFC8');
    out += poly([pt(0, FLOOR.d, -t * 0.72), pt(FLOOR.w, FLOOR.d, -t * 0.72), pt(FLOOR.w, FLOOR.d, -t), pt(0, FLOOR.d, -t)], '#C4C9D0');
    out += poly([pt(FLOOR.w, 0, -t * 0.72), pt(FLOOR.w, FLOOR.d, -t * 0.72), pt(FLOOR.w, FLOOR.d, -t), pt(FLOOR.w, 0, -t)], '#A5ABB5');
    // Grey tiles with visible grout, like the floor of the reference
    var tile = 2;
    for (var i = 0; i < FLOOR.w; i += tile) {
      for (var j = 0; j < FLOOR.d; j += tile) {
        var x1 = Math.min(i + tile, FLOOR.w), y1 = Math.min(j + tile, FLOOR.d);
        out += poly([pt(i, j, 0), pt(x1, j, 0), pt(x1, y1, 0), pt(i, y1, 0)], ((i + j) / tile) % 2 ? '#C5CAD1' : '#CDD2D8', ' stroke="#AEB4BD" stroke-width="1"');
      }
    }
    out += '<defs><radialGradient id="sm-glow" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#4A5568" stop-opacity=".12"/></radialGradient></defs>';
    out += poly([pt(0, 0, 0), pt(FLOOR.w, 0, 0), pt(FLOOR.w, FLOOR.d, 0), pt(0, FLOOR.d, 0)], 'url(#sm-glow)', ' pointer-events="none"');
    return out;
  }

  /* ---------- the two walls at the back of the store ---------- */

  /** Walls on the two back edges (x = 0 and y = 0): pale walls with a wooden skirting and a band of windows, like the top of the reference. */
  function walls() {
    var t = 0.9, top = 3.9, base = -1.0, band = 0.5, out = '';
    var upper = { top: '#F4F6F8', left: '#E3E8ED', right: '#CDD4DC' }, lower = { top: '#E7C48C', left: '#C99A5C', right: '#B5854A' };
    out += cuboid(-t, 0, t, FLOOR.d, band - base, lower, base);
    out += cuboid(-t, 0, t, FLOOR.d, top - band, upper, band);
    out += cuboid(-t, -t, FLOOR.w + t, t, band - base, lower, base);
    out += cuboid(-t, -t, FLOOR.w + t, t, top - band, upper, band);
    // Windows: a glass band with white mullions on both walls
    var gz0 = 2.3, gz1 = 3.5;
    out += poly([pt(0.4, 0, gz0), pt(FLOOR.w - 0.4, 0, gz0), pt(FLOOR.w - 0.4, 0, gz1), pt(0.4, 0, gz1)], '#CFE6F2');
    for (var wx = 0.4; wx <= FLOOR.w - 0.3; wx += 2.4) out += line(pt(wx, 0, gz0), pt(wx, 0, gz1), '#FFFFFF', 3);
    out += poly([pt(0, 0.4, gz0), pt(0, FLOOR.d - 0.4, gz0), pt(0, FLOOR.d - 0.4, gz1), pt(0, 0.4, gz1)], '#B9D5E4');
    for (var wy = 0.4; wy <= FLOOR.d - 0.3; wy += 2.4) out += line(pt(0, wy, gz0), pt(0, wy, gz1), '#FFFFFF', 3);
    return out;
  }

  /* ---------- people, carts and gates ---------- */

  var SKIN = ['#F2C7A3', '#E0A67B', '#B97A52', '#8A5A3A'];
  var HAIR = ['#2F2A26', '#5A3A24', '#C9A24B', '#8A3B2A', '#1E1E22'];

  /** A person standing at the floor point (x, y). o: shirt, pants, skin, hair, style ('short', 'long', 'cap'), item ('basket', 'box'). */
  function person(x, y, o) {
    var b = pt(x, y, 0), X = b[0], Y = b[1], skin = SKIN[o.skin % SKIN.length], hair = HAIR[o.hair % HAIR.length], out = '';
    var PERSON_SCALE = 1.3;
    out += '<ellipse cx="' + X + '" cy="' + (Y + 1) + '" rx="10" ry="4.6" fill="rgba(40,60,80,0.2)"/>';
    if (o.style === 'long') out += '<rect x="' + (X - 6.4) + '" y="' + (Y - 36) + '" width="12.8" height="17" rx="5" fill="' + hair + '"/>';
    out += '<rect x="' + (X - 5.6) + '" y="' + (Y - 12) + '" width="4.6" height="12" rx="1.8" fill="' + o.pants + '"/>';
    out += '<rect x="' + (X + 1) + '" y="' + (Y - 12) + '" width="4.6" height="12" rx="1.8" fill="' + o.pants + '"/>';
    out += '<rect x="' + (X - 6.4) + '" y="' + (Y - 26) + '" width="12.8" height="16" rx="4.6" fill="' + o.shirt + '"/>';
    out += '<rect x="' + (X - 6.4) + '" y="' + (Y - 14) + '" width="12.8" height="3" fill="' + shade(o.shirt, -0.14) + '"/>';
    var handY = o.item ? Y - 17 : Y - 13;
    out += line([X - 6.2, Y - 24], [X - 9, handY], o.shirt, 3.6) + line([X + 6.2, Y - 24], [X + 9, handY], o.shirt, 3.6);
    out += '<circle cx="' + (X - 9) + '" cy="' + handY + '" r="2.1" fill="' + skin + '"/><circle cx="' + (X + 9) + '" cy="' + handY + '" r="2.1" fill="' + skin + '"/>';
    if (o.item === 'basket') {
      out += '<path d="M' + (X + 4) + ' ' + (handY + 1) + 'h10l-1.6 7h-6.8z" fill="#43B66B"/><path d="M' + (X + 6) + ' ' + (handY + 1) + 'a3 3.4 0 0 1 6 0" fill="none" stroke="#2F8F50" stroke-width="1.4"/>' +
        '<rect x="' + (X + 6) + '" y="' + (handY - 2) + '" width="2.6" height="3.4" rx="1" fill="#F6B93B"/><rect x="' + (X + 9.4) + '" y="' + (handY - 3) + '" width="2.6" height="4.4" rx="1" fill="#E5493A"/>';
    } else if (o.item === 'box') {
      out += '<rect x="' + (X - 5) + '" y="' + (handY - 5) + '" width="10" height="7" rx="1" fill="#D4A06A"/><rect x="' + (X - 5) + '" y="' + (handY - 2) + '" width="10" height="1.4" fill="#B98350"/>';
    }
    out += '<circle cx="' + X + '" cy="' + (Y - 31) + '" r="5.6" fill="' + skin + '"/>';
    if (o.style === 'cap') {
      out += '<path d="M' + (X - 6) + ' ' + (Y - 32) + 'a6 5.4 0 0 1 12 0z" fill="' + (o.cap || '#F6C534') + '"/><rect x="' + (X - 1) + '" y="' + (Y - 33) + '" width="8" height="2" rx="1" fill="' + (o.cap || '#F6C534') + '"/>';
    } else {
      out += '<path d="M' + (X - 5.9) + ' ' + (Y - 31) + 'a5.9 5.9 0 0 1 11.8 0c-1.6-2.6-3.8-3.2-5.9-3.2s-4.3 .6-5.9 3.2z" fill="' + hair + '"/>';
    }
    return '<g transform="translate(' + X + ' ' + Y + ') scale(' + PERSON_SCALE + ') translate(' + (-X) + ' ' + (-Y) + ')">' + out + '</g>';
  }

  /** A shopping cart with groceries in it. */
  function cart(x, y) {
    var out = cuboid(x, y, 0.9, 1.1, 0.5, '#B9C3CD', 0.28);
    out += cuboid(x + 0.1, y + 0.15, 0.3, 0.4, 0.34, RED, 0.78) + cuboid(x + 0.45, y + 0.2, 0.3, 0.4, 0.4, GREEN, 0.78) + cuboid(x + 0.2, y + 0.65, 0.35, 0.35, 0.3, YELLOW, 0.78);
    out += line(pt(x, y, 0.9), pt(x, y + 1.1, 0.9), '#8B97A3', 2.4);
    return out;
  }

  /** A potted plant. */
  function plant(x, y) {
    var out = cuboid(x, y, 0.8, 0.8, 0.6, '#E8ECEF', 0);
    out += ellipse(x + 0.4, y + 0.4, 0.95, 11, 7, '#43B66B') + ellipse(x + 0.2, y + 0.3, 1.2, 8, 6, '#5CCB82') + ellipse(x + 0.6, y + 0.45, 1.3, 8, 6, '#2F9E57');
    return out;
  }

  /** A stack of red shopping baskets. */
  function basketStack(x, y) {
    var out = '';
    for (var i = 0; i < 4; i++) out += cuboid(x, y, 0.8, 0.8, 0.2, '#E5493A', 0.2 * i + 0.02);
    return out;
  }

  /** Anti-theft gate: two white posts with rounded tops. */
  function gate(x, y) {
    return cuboid(x, y, 0.2, 0.2, 1.7, '#F4F6F8', 0) + cuboid(x, y + 1.1, 0.2, 0.2, 1.7, '#F4F6F8', 0) + cuboid(x - 0.02, y - 0.02, 0.24, 0.24, 0.16, '#9AA6B2', 1.7) + cuboid(x - 0.02, y + 1.08, 0.24, 0.24, 0.16, '#9AA6B2', 1.7);
  }

  function props() {
    var P = [];
    var add = function(x, y, html, w) { w = w || 0.5; P.push({ box: box(x - w / 2, x + w / 2, y - w / 2, y + w / 2), html: html }); };
    // Carts by the exit
    add(27.6, 10.6, cart(27.6, 10.6), 1);
    add(30.6, 11.7, cart(30.6, 11.7), 1);
    // Plants and a stack of baskets by the entrance
    P.push({ box: box(32.4, 33.2, 11.2, 12.0), html: plant(32.4, 11.2) });
    P.push({ box: box(32.4, 33.2, 13.2, 14.0), html: plant(32.4, 13.2) });
    P.push({ box: box(27.2, 28.0, 12.9, 13.7), html: basketStack(27.2, 12.9) });
    // Gates by the exit
    P.push({ box: box(31.5, 31.9, 9.6, 10.9), html: gate(31.5, 9.6) });
    P.push({ box: box(31.5, 31.9, 11.8, 13.1), html: gate(31.5, 11.8) });
    return P;
  }

  /** Depth order for a drawing seen from the +x +y corner: A goes before B (is behind it) when A ends before B starts on x or on y. */
  function behind(a, b) { return a.x1 <= b.x0 + 1e-6 || a.y1 <= b.y0 + 1e-6; }

  /** Sort pieces so that every piece is drawn after the ones behind it. */
  function order(pieces) {
    var n = pieces.length, before = pieces.map(function() { return []; }), indeg = pieces.map(function() { return 0; });
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var a = pieces[i].box, b = pieces[j].box, ab = behind(a, b), ba = behind(b, a);
        if (ab && !ba) { before[i].push(j); indeg[j]++; }
        else if (ba && !ab) { before[j].push(i); indeg[i]++; }
      }
    }
    var key = function(p) { return p.box.x1 + p.box.y1; };
    var ready = [], out = [];
    for (var k = 0; k < n; k++) if (!indeg[k]) ready.push(k);
    while (ready.length) {
      ready.sort(function(p, q) { return key(pieces[p]) - key(pieces[q]); });
      var cur = ready.shift();
      out.push(pieces[cur]);
      before[cur].forEach(function(m) { if (--indeg[m] === 0) ready.push(m); });
    }
    pieces.forEach(function(p, idx) { if (out.indexOf(p) === -1) out.push(p); });   // a cycle (touching pieces): keep them anyway
    return out;
  }

  window.StoreMapArt = { S: S, C: C, H: H, FLOOR: FLOOR, OX: OX, OY: OY, ROW_DEPTH: ROW_DEPTH, pt: pt, shade: shade, parts: parts, props: props, floor: floor, walls: walls, order: order };
})();
