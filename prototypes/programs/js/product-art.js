/**
 * Product Art
 * One drawn picture per product of the catalog (a bag of rice, a carton of milk, a tray of steaks...), used on the product
 * cards while there are no photos. Each picture is a package (bag, bottle, carton, can, tub, tray, box, tube, bar, tin,
 * blister, pouch, pack, cup) with the content drawn on its label, or the product itself for loose produce.
 * ProductArt.svg(name) returns the SVG markup, or '' when the product has no picture.
 */

(function() {
  'use strict';

  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function T(x, y, size, text, fill) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="' + size + '" font-weight="700" fill="' + fill + '" font-family="Inter, Arial, sans-serif" letter-spacing=".5">' + esc(text) + '</text>';
  }
  function E(cx, cy, rx, ry, fill, stroke, rot) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.2"' : '') + (rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '') + '/>';
  }
  function C(cx, cy, r, fill, stroke) { return E(cx, cy, r, r, fill, stroke); }
  function R(x, y, w, h, rx, fill, stroke) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.2"' : '') + '/>';
  }
  function P(d, fill, stroke) { return '<path d="' + d + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.2" stroke-linejoin="round"' : '') + '/>'; }
  function G(x, y, s, inner) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + inner + '</g>'; }

  /* ---------- contents, drawn around (0, 0) in about 44 x 44 ---------- */

  var EM = {
    grain: function() { return E(-10, -6, 4, 9, '#F6EDCB', '#B89B4B', -30) + E(8, -8, 4, 9, '#F6EDCB', '#B89B4B', 25) + E(0, 6, 4, 9, '#F6EDCB', '#B89B4B', 80) + E(-12, 10, 4, 9, '#F6EDCB', '#B89B4B', 10) + E(12, 8, 4, 9, '#F6EDCB', '#B89B4B', -20); },
    beanRed: function() { return E(-9, -6, 6, 10, '#B5532F', '#6E2C14', -35) + E(9, -6, 6, 10, '#B5532F', '#6E2C14', 35) + E(0, 9, 6, 10, '#B5532F', '#6E2C14', 90) + E(-12, 10, 5, 8, '#C96A44', '#6E2C14', 20); },
    beanBlack: function() { return E(-9, -6, 6, 10, '#2B2B2E', '#000', -35) + E(9, -6, 6, 10, '#2B2B2E', '#000', 35) + E(0, 9, 6, 10, '#2B2B2E', '#000', 90) + E(-12, 10, 5, 8, '#3B3B40', '#000', 20) + E(-10, -9, 1.5, 4, '#777', '', -35); },
    sugar: function() { return R(-18, -2, 16, 16, 2, '#fff', '#B9C0CC') + R(0, -2, 16, 16, 2, '#fff', '#B9C0CC') + R(-9, -17, 16, 16, 2, '#fff', '#B9C0CC'); },
    coffee: function() { return E(0, 0, 14, 19, '#6B4226', '#3E2412', 25) + P('M-6 -15C4 -6 -4 4 6 15', 'none', '#3E2412'); },
    spaghetti: function() { return P('M-16 -18C-8 -4 -8 4 -16 18M-8 -18C0 -4 0 4 -8 18M0 -18C8 -4 8 4 0 18M8 -18C16 -4 16 4 8 18', 'none', '#E8C45A').replace('stroke-width="1.2"', 'stroke-width="3"'); },
    oil: function() { return P('M0 -20C12 -4 16 2 16 8A16 16 0 0 1-16 8C-16 2-12-4 0-20Z', '#F2C230', '#B8880A') + E(-6, 6, 3, 6, '#FFF3B0', '', 20); },
    cookie: function() { return C(-6, 0, 15, '#4A2C1A', '#2A180D') + C(8, 4, 15, '#4A2C1A', '#2A180D') + C(8, 4, 8, '#F7F2E8', ''); },
    cola: function() { return P('M-14 -18H14L12 18H-12Z', '#5A2A18', '#2A1008') + P('M-14 -18H14L13.4 -10H-13.4Z', '#fff', '') + C(-4, 2, 2.5, '#fff', '') + C(5, 8, 2, '#fff', '') + C(3, -2, 1.6, '#fff', ''); },
    orange: function() { return C(0, 0, 19, '#F59A1F', '#C06A00') + C(0, 0, 14, '#FFC25A', '') + P('M0 0L0-14M0 0L13-5M0 0L8 12M0 0L-8 12M0 0L-13-5', 'none', '#F59A1F'); },
    drop: function() { return P('M0 -20C12 -4 16 2 16 8A16 16 0 0 1-16 8C-16 2-12-4 0-20Z', '#4FA8E8', '#1F6FB0') + E(-6, 6, 3, 6, '#D6EEFF', '', 20); },
    beer: function() { return P('M-12 -12H10L8 18H-10Z', '#F2B21A', '#B77A00') + P('M-14 -12C-14-20-6-20-4-16C0-22 8-20 12-14L10-10H-12Z', '#fff', '#C9C9C9') + R(10, -6, 8, 14, 4, 'none', '#B77A00'); },
    milk: function() { return P('M0 -20C12 -4 16 2 16 8A16 16 0 0 1-16 8C-16 2-12-4 0-20Z', '#fff', '#8FB6D8') + C(-4, 4, 3, '#CFE3F3', '') + C(5, 9, 2.5, '#CFE3F3', ''); },
    yogurt: function() { return P('M-18 -4H18L12 18H-12Z', '#fff', '#D78FB0') + P('M-12 -4C-12-14 12-14 12-4', '#F7C9DC', '#D78FB0') + C(0, -12, 3, '#D8457A', ''); },
    cheese: function() { return P('M-18 12L18 12L18-2L-18-14Z', '#F7C948', '#C99A0F') + C(-6, 4, 3, '#E0A91A', '') + C(7, 6, 2, '#E0A91A', '') + C(-12, -2, 1.8, '#E0A91A', ''); },
    butter: function() { return P('M-18 4L-8-8H18L8 4Z', '#FFE88A', '#C9B04A') + R(-18, 4, 26, 12, 1, '#F7D857', '#C9B04A') + P('M8 4L18-8V4L8 16Z', '#E8C73F', '#C9B04A'); },
    spread: function() { return C(0, 2, 17, '#fff', '#C8C8D8') + P('M-12 0C-6-10 6-10 12 0C6 6-6 6-12 0Z', '#F5E6B8', '#D1B86A'); },
    choc: function() { return R(-16, -16, 15, 15, 2, '#6B3A1E', '#3E1F0C') + R(1, -16, 15, 15, 2, '#6B3A1E', '#3E1F0C') + R(-16, 1, 15, 15, 2, '#6B3A1E', '#3E1F0C') + R(1, 1, 15, 15, 2, '#6B3A1E', '#3E1F0C'); },
    cocoa: function() { return P('M-14 -6H10V12A6 6 0 0 1 4 18H-8A6 6 0 0 1-14 12Z', '#fff', '#6B3A1E') + P('M10 -2H14A5 5 0 0 1 14 8H10', 'none', '#6B3A1E') + P('M-6 -22C-10-16-2-14-6-8M2-22C-2-16 6-14 2-8', 'none', '#B58A6A') + R(-14, -6, 24, 7, 0, '#6B3A1E', ''); },
    bubbles: function() { return C(-8, 4, 12, '#CFEFFF', '#58B4E0') + C(10, -6, 8, '#E6F7FF', '#58B4E0') + C(12, 12, 5, '#E6F7FF', '#58B4E0') + C(-10, -14, 4, '#E6F7FF', '#58B4E0'); },
    roll: function() { return C(0, 0, 18, '#fff', '#C7CDE0') + C(0, 0, 8, '#EEF0F8', '#C7CDE0') + C(0, 0, 3, '#B7BDD0', ''); },
    hair: function() { return P('M-14 -16C-18 4-8 14-14 18M-5 -18C-9 2 1 14-5 20M4 -18C0 2 10 14 4 20M13 -16C9 4 19 14 13 18', 'none', '#7A4B2A').replace(/stroke-width="1.2"/, 'stroke-width="3.2"'); },
    soap: function() { return R(-16, -2, 32, 18, 6, '#F4C2D7', '#C9708F') + C(-8, -10, 6, '#fff', '#9FD6F0') + C(6, -14, 4, '#fff', '#9FD6F0') + C(12, -6, 3, '#fff', '#9FD6F0'); },
    tooth: function() { return P('M-14 -14C-14-20-4-20 0-16C4-20 14-20 14-14C14-4 10 2 8 16C6 20 2 20 0 10C-2 20-6 20-8 16C-10 2-14-4-14-14Z', '#fff', '#7FA8C9'); },
    paw: function() { return E(0, 8, 11, 9, '#7A4B2A', '', 0) + C(-14, -4, 5, '#7A4B2A', '') + C(-5, -14, 5, '#7A4B2A', '') + C(6, -14, 5, '#7A4B2A', '') + C(15, -4, 5, '#7A4B2A', ''); },
    cat: function() { return P('M-16 -16L-8 -8H8L16 -16V8A16 14 0 0 1-16 8Z', '#E8A860', '#9A6422') + C(-6, 0, 2.5, '#2B2B2E', '') + C(6, 0, 2.5, '#2B2B2E', '') + P('M-2 5H2L0 8Z', '#C0505F', ''); },
    wrapped: function() { return E(0, 0, 13, 9, '#E4457A', '#A01E4E', 0) + P('M-13 0L-22-8V8ZM13 0L22-8V8Z', '#E4457A', '#A01E4E') + P('M-6-5C-2 0 2 0 6 5', 'none', '#fff'); },
    lolly: function() { return P('M0 4V22', 'none', '#fff').replace('stroke-width="1.2"', 'stroke-width="3"') + C(0, -6, 14, '#E8457A', '#A01E4E') + P('M0-6m-9 0a9 9 0 1 1 18 0a5 5 0 1 1-10 0', 'none', '#fff'); },
    mint: function() { return P('M0 18C-16 6-14-12 0-18C14-12 16 6 0 18Z', '#4CC38A', '#1E8556') + P('M0 16V-12', 'none', '#1E8556'); },
    gum: function() { return R(-18, -14, 36, 11, 3, '#8ED6C0', '#3E9A80') + R(-18, 3, 36, 11, 3, '#8ED6C0', '#3E9A80'); },
    battery: function() { return R(-14, -12, 28, 26, 4, '#2B2B2E', '#000') + R(-14, -12, 28, 10, 4, '#F2B21A', '') + R(-6, -17, 12, 5, 2, '#9A9AA2', '') + T(0, 10, 9, 'AA', '#F2B21A'); },
    pizza: function() { return C(0, 0, 19, '#F2C46A', '#B78325') + C(0, 0, 15, '#E7553A', '') + P('M-15 0A15 15 0 0 1 15 0Z', '#F7DE8A', '') + C(-6, -5, 3, '#A52A1E', '') + C(7, -3, 3, '#A52A1E', '') + C(0, 8, 3, '#A52A1E', '') + C(-9, 7, 2.4, '#A52A1E', ''); },
    burger: function() { return P('M-18 -4A18 14 0 0 1 18 -4Z', '#D9923A', '#9A5E14') + R(-19, -3, 38, 5, 2, '#5CA83A', '') + R(-18, 2, 36, 8, 3, '#6B3A1E', '') + P('M-18 12H18A4 4 0 0 1 14 16H-14A4 4 0 0 1-18 12Z', '#D9923A', '#9A5E14'); },
    fish: function() { return P('M-18 0C-8-14 8-14 14 0C8 14-8 14-18 0Z', '#B8C6D4', '#6D8197') + P('M14 0L24-10V10Z', '#B8C6D4', '#6D8197') + C(-9, -2, 2, '#2B2B2E', ''); },
    shrimp: function() { return P('M-14-12C6-20 20-6 12 10C8 16 0 14-4 8', 'none', '#F08A6A').replace(/stroke-width="1.2"/, 'stroke-width="9"').replace('stroke-linejoin="round"', 'stroke-linecap="round"') + P('M-14-12L-20-18M-14-12L-22-8', 'none', '#D9603E'); },
    steak: function() { return P('M-18 2C-18-12-2-18 10-14C22-10 20 8 10 14C-2 20-18 14-18 2Z', '#C0394B', '#7A1727') + P('M-8 0C-4-8 6-8 8 0C6 6-4 8-8 0Z', '#F4B9C0', ''); },
    drumstick: function() { return P('M-14 -14C0-22 18-10 12 6C8 14-6 10-12 2C-16-2-16-8-14-14Z', '#D9822B', '#8A4B0E') + P('M10 6L20 16', 'none', '#F4EBD0').replace(/stroke-width="1.2"/, 'stroke-width="5"') + C(21, 18, 3, '#F4EBD0', '') + C(18, 20, 3, '#F4EBD0', ''); },
    sausage: function() { return P('M-18 6C-18-8-4-14 8-10C20-6 22 10 10 16C-2 20-18 18-18 6Z', '#B5523B', '#6E2414') + P('M-8 4C-4-2 4-4 10 0', 'none', '#D98068'); },
    ham: function() { return P('M-18 8C-18-8-4-14 10-8C22-2 18 14 4 16C-8 18-18 16-18 8Z', '#F29AA0', '#C25560') + P('M-8 6C-4 0 4-2 10 2', 'none', '#fff'); },
    bread: function() { return P('M-20 6C-20-8-8-14 0-14C10-14 20-8 20 6C20 14 14 16 0 16C-14 16-20 14-20 6Z', '#D9A04F', '#8F5E1B') + P('M-10-6L-6 4M0-8L4 4M10-6L12 4', 'none', '#F2D08F'); },
    cake: function() { return P('M-18 12L18 12L18-2L-18-2Z', '#F2C74E', '#B8860F') + P('M-18-2L-8-12H18L18-2Z', '#F7DE8A', '#B8860F') + C(0, -5, 1.5, '#B8860F', '') + C(8, 4, 1.5, '#B8860F', '') + C(-8, 5, 1.5, '#B8860F', ''); },
    wafer: function() { return R(-18, -14, 36, 8, 2, '#E7B26B', '#9A6422') + R(-18, -6, 36, 4, 1, '#6B3A1E', '') + R(-18, -2, 36, 8, 2, '#E7B26B', '#9A6422') + R(-18, 6, 36, 4, 1, '#6B3A1E', '') + R(-18, 10, 36, 8, 2, '#E7B26B', '#9A6422'); },
    icecream: function() { return P('M-12 -2L0 22L12 -2Z', '#E2A95B', '#9A6422') + C(-6, -6, 9, '#F7C9DC', '#D78FB0') + C(7, -7, 9, '#7A4B2A', '#4A2C1A') + C(0, -14, 9, '#fff', '#C8C8D8'); },
    bonbons: function() { return C(-9, -6, 9, '#6B3A1E', '#3E1F0C') + C(9, -6, 9, '#8A4B26', '#3E1F0C') + C(0, 9, 9, '#4A2C1A', '#2A180D') + C(-12, -9, 2, '#C9A27F', ''); },
    wash: function() { return P('M-14 -16H10V16H-14Z', '#fff', '#6FA3D6') + R(-14, -4, 24, 12, 0, '#6FA3D6', '') + C(14, -8, 5, '#CFEFFF', '#58B4E0') + C(18, 6, 3, '#CFEFFF', '#58B4E0'); },
    bleach: function() { return C(0, 0, 18, '#fff', '#6FB5D6') + P('M-8 -2L-2 5L9 -8', 'none', '#2C9AC8').replace(/stroke-width="1.2"/, 'stroke-width="3.4"'); },
    dish: function() { return C(0, 0, 18, '#BFF0C9', '#4CAF6A') + C(-6, -6, 5, '#fff', '#8CD7A0') + C(7, 4, 7, '#fff', '#8CD7A0') + C(-4, 9, 3, '#fff', '#8CD7A0'); }
  };

  /* ---------- packages: (colours [main, dark, tint], content, label text) ---------- */

  var PK = {
    bag: function(c, em, t) {
      return P('M34 20Q80 32 126 20L132 140Q80 152 28 140Z', c[0]) + P('M34 20Q80 32 126 20L127 31Q80 43 33 31Z', c[1]) + R(42, 54, 76, 76, 8, '#fff') + G(80, 86, 1, em) + T(80, 120, 10, t, c[1]);
    },
    sack: function(c, em, t) {
      return P('M26 18Q80 30 134 18L140 142Q80 154 20 142Z', c[0]) + P('M26 18Q80 30 134 18L135 30Q80 42 25 30Z', c[1]) + R(36, 52, 88, 80, 8, '#fff') + G(80, 86, 1.1, em) + T(80, 122, 10, t, c[1]);
    },
    pouch: function(c, em, t) {
      return P('M22 26H138L134 134H26Z', c[0]) + R(22, 26, 116, 12, 0, c[1]) + R(22, 122, 116, 12, 0, c[1]) + R(34, 46, 92, 70, 8, '#fff') + G(80, 76, 1, em) + T(80, 108, 10, t, c[1]);
    },
    pack: function(c, em, t) {
      return R(20, 40, 120, 80, 10, c[0]) + R(12, 44, 14, 72, 3, c[1]) + R(134, 44, 14, 72, 3, c[1]) + R(34, 52, 92, 56, 8, '#fff') + G(80, 76, 0.85, em) + T(80, 102, 9, t, c[1]);
    },
    packTall: function(c, em, t) {
      return R(44, 10, 72, 140, 6, c[0]) + R(44, 10, 72, 12, 2, c[1]) + R(44, 138, 72, 12, 2, c[1]) + R(52, 34, 56, 94, 6, '#fff') + G(80, 74, 1, em) + T(80, 114, 9, t, c[1]);
    },
    bottle: function(c, em, t) {
      return R(66, 8, 28, 14, 3, c[1]) + P('M68 22H92L94 36C108 44 118 52 118 66V138A8 8 0 0 1 110 146H50A8 8 0 0 1 42 138V66C42 52 52 44 66 36Z', c[2], c[1]) + R(42, 70, 76, 62, 0, c[0]) + G(80, 94, 0.8, em) + T(80, 124, 10, t, '#fff');
    },
    bottleTall: function(c, em, t) {
      return R(68, 6, 24, 12, 3, c[1]) + P('M70 18H90L92 32C104 40 112 48 112 62V140A8 8 0 0 1 104 148H56A8 8 0 0 1 48 140V62C48 48 56 40 68 32Z', c[2], c[1]) + R(48 , 64, 64, 66, 0, c[0]) + G(80, 88, 0.8, em) + T(80, 122, 10, t, '#fff');
    },
    carton: function(c, em, t) {
      return P('M42 44L80 12L118 44Z', c[1]) + R(42, 44, 76, 104, 2, c[0]) + P('M118 44V148L132 138V54Z', c[1], '') + R(50, 62, 60, 72, 6, '#fff') + G(80, 90, 0.9, em) + T(80, 124, 10, t, c[1]);
    },
    can: function(c, em, t) {
      return E(80, 30, 36, 10, c[1]) + P('M44 30V128C44 134 60 140 80 140S116 134 116 128V30C116 36 100 40 80 40S44 36 44 30Z', c[0]) + E(80, 30, 36, 10, c[2], c[1]) + R(44, 56, 72, 62, 0, '#fff') + G(80, 82, 0.8, em) + T(80, 110, 10, t, c[1]);
    },
    tin: function(c, em, t) {
      return P('M24 76V108C24 118 48 126 80 126S136 118 136 108V76C136 86 112 94 80 94S24 86 24 76Z', c[1]) + E(80, 76, 56, 18, c[0], c[1]) + G(80, 76, 0.8, em) + T(80, 114, 10, t, '#fff');
    },
    tub: function(c, em, t) {
      return P('M30 60H130L120 140H40Z', c[0]) + R(24, 40, 112, 22, 6, c[1]) + R(40, 74, 80, 52, 8, '#fff') + G(80, 96, 0.8, em) + T(80, 120, 9, t, c[1]);
    },
    cup: function(c, em, t) {
      return R(36, 36, 88, 14, 5, c[1]) + P('M40 50H120L112 140H48Z', c[0]) + R(52, 70, 56, 52, 8, '#fff') + G(80, 90, 0.75, em) + T(80, 114, 9, t, c[1]);
    },
    box: function(c, em, t) {
      return R(34, 14, 92, 132, 6, c[0]) + R(34, 14, 92, 24, 6, c[1]) + R(42, 48, 76, 86, 8, '#fff') + G(80, 84, 1.05, em) + T(80, 124, 10, t, c[1]);
    },
    tube: function(c, em, t) {
      return R(62, 6, 36, 18, 4, c[1]) + P('M52 24H108L100 144H60Z', c[0]) + P('M60 144H100L98 150H62Z', c[1]) + R(60, 52, 40, 64, 6, '#fff') + G(80, 76, 0.75, em) + T(80, 108, 9, t, c[1]);
    },
    bar: function(c, em, t) {
      return R(16, 40, 128, 80, 8, c[0]) + R(16, 40, 128, 14, 8, c[1]) + R(28, 62, 104, 50, 8, '#fff') + G(52, 87, 0.8, em) + T(100, 92, 10, t, c[1]);
    },
    blister: function(c, em, t) {
      return R(26, 12, 108, 136, 8, c[0]) + T(80, 34, 11, t, '#fff') + R(36, 44, 88, 94, 10, '#fff', c[1]) + G(80, 91, 1.4, em);
    },
    tray: function(c, em, t) {
      return P('M12 82H148L136 138H24Z', '#F4F4F6', '#C9CAD3') + G(80, 100, 1.5, em) + P('M16 86Q80 56 144 86L140 98Q80 70 20 98Z', '#fff').replace('fill="#fff"', 'fill="#fff" opacity=".45"') + R(98, 106, 40, 26, 4, c[0]) + T(118, 123, 9, t, '#fff');
    }
  };

  /* ---------- loose produce, drawn whole ---------- */

  var LOOSE = {
    banana: function() { return P('M30 54C34 100 78 130 130 108C116 112 84 108 62 80C50 64 52 50 54 44Z', '#F5D142', '#B8930F') + P('M54 44L56 34L64 36L60 48Z', '#7A5A1E') + P('M130 108L136 106L132 112Z', '#4A3410'); },
    apple: function() { return P('M80 46C60 34 30 48 34 88C38 124 62 142 80 134C98 142 122 124 126 88C130 48 100 34 80 46Z', '#D9372B', '#8E1C14') + P('M80 46C80 36 84 28 92 24', 'none', '#6B4A22').replace(/stroke-width="1.2"/, 'stroke-width="4"') + P('M92 30C102 20 116 26 114 34C106 40 96 38 92 30Z', '#4FA83A', '') + E(56, 84, 5, 12, '#F08A82', '', 15); },
    tomato: function() { return C(80, 88, 48, '#E23B2E', '#9A1C12') + P('M80 42L68 54L52 50L64 62L56 76L74 68L80 82L86 68L104 76L96 62L108 50L92 54Z', '#4FA83A', '#2E7A1E') + E(58, 82, 5, 12, '#F08A82', '', 15); },
    lettuce: function() { return E(80, 92, 50, 44, '#7CC24A', '#3F7F1E') + E(80, 96, 40, 36, '#9BD866', '') + P('M80 130C70 110 70 80 80 60C90 80 90 110 80 130Z', '#C9EFA0', '') + P('M50 100C60 90 70 90 80 100M110 100C100 90 90 90 80 100', 'none', '#5FA02E'); },
    potato: function() { return E(80, 90, 52, 38, '#C99A5B', '#8A6330', -12) + C(62, 78, 3, '#8A6330', '') + C(94, 100, 3, '#8A6330', '') + C(100, 74, 2.5, '#8A6330', '') + C(70, 104, 2.5, '#8A6330', ''); },
    onion: function() { return P('M80 38C74 52 40 62 40 98C40 126 62 140 80 140S120 126 120 98C120 62 86 52 80 38Z', '#E8B24A', '#A87818') + P('M80 38V28', 'none', '#A87818').replace(/stroke-width="1.2"/, 'stroke-width="4"') + P('M80 40C68 70 66 110 76 138M80 40C92 70 94 110 84 138', 'none', '#C98F2A'); },
    roll: function() { return P('M20 96C20 70 48 56 80 56S140 70 140 96C140 112 124 120 80 120S20 112 20 96Z', '#D9A04F', '#8F5E1B') + P('M44 70L56 100M72 64L82 104M100 66L108 102', 'none', '#F2D08F').replace(/stroke-width="1.2"/, 'stroke-width="5"'); }
  };

  /* ---------- the catalog: name -> [package, [main, dark, tint], content, label] ---------- */

  var W = ['#FFFFFF', '#6B7280', '#F3F4F6'], BR = ['#8A5A3C', '#4E2E1A', '#EAD9C8'], BL = ['#2F6FED', '#1B3F9A', '#DCE7FD'], RD = ['#D6453D', '#8E211B', '#FBE0DE'],
    GR = ['#2E9E5B', '#17613A', '#DBF1E4'], OR = ['#E08A1E', '#9A560B', '#FBEBD3'], YL = ['#F2B21A', '#9A6B00', '#FFF3CC'], PU = ['#7A4FD6', '#43268F', '#E8E0F8'],
    TL = ['#0F8FA3', '#085A68', '#D6EEF2'], PK2 = ['#C2407A', '#7E1E4C', '#F6DCE8'], DK = ['#3A3A40', '#17171A', '#E2E2E6'];

  var ART = {
    'Chocolate drink powder': ['can', BR, 'cocoa', 'CHOCO'],
    'White rice': ['bag', GR, 'grain', 'RICE'],
    'Carioca beans': ['bag', OR, 'beanRed', 'BEANS'],
    'Black beans': ['bag', DK, 'beanBlack', 'BLACK BEANS'],
    'Sugar': ['bag', BL, 'sugar', 'SUGAR'],
    'Ground roasted coffee': ['pouch', BR, 'coffee', 'COFFEE'],
    'Spaghetti': ['packTall', RD, 'spaghetti', 'SPAGHETTI'],
    'Soybean oil': ['bottleTall', YL, 'oil', 'SOY OIL'],
    'Sandwich cookies': ['pack', BL, 'cookie', 'COOKIES'],
    'Cola soft drink': ['bottleTall', RD, 'cola', 'COLA'],
    'Orange juice': ['carton', OR, 'orange', 'ORANGE'],
    'Mineral water': ['bottleTall', TL, 'drop', 'WATER'],
    'Pilsner beer': ['can', YL, 'beer', 'PILSNER'],
    'Whole milk': ['carton', BL, 'milk', 'MILK'],
    'Yogurt': ['cup', PK2, 'yogurt', 'YOGURT'],
    'Sliced mozzarella': ['pouch', YL, 'cheese', 'MOZZARELLA'],
    'Butter': ['tub', YL, 'butter', 'BUTTER'],
    'Creamy cheese spread': ['cup', BL, 'spread', 'CREAM CHEESE'],
    'Banana': ['loose', null, 'banana'], 'Apple': ['loose', null, 'apple'], 'Tomato': ['loose', null, 'tomato'], 'Lettuce': ['loose', null, 'lettuce'],
    'Potato': ['loose', null, 'potato'], 'Onion': ['loose', null, 'onion'], 'French bread roll': ['loose', null, 'roll'],
    'Cornmeal cake': ['box', YL, 'cake', 'CORN CAKE'],
    'Sliced bread': ['bag', OR, 'bread', 'BREAD'],
    'Striploin steak': ['tray', RD, 'steak', 'STRIPLOIN'],
    'Chicken breast': ['tray', OR, 'drumstick', 'CHICKEN'],
    'Pork sausage': ['pack', RD, 'sausage', 'SAUSAGE'],
    'Sliced ham': ['pouch', PK2, 'ham', 'HAM'],
    'Frozen pizza': ['box', RD, 'pizza', 'PIZZA'],
    'Ice cream': ['tub', PK2, 'icecream', 'ICE CREAM'],
    'Beef burger': ['box', DK, 'burger', 'BURGER'],
    'Tilapia fillet': ['tray', TL, 'fish', 'TILAPIA'],
    'Gray shrimp': ['pack', TL, 'shrimp', 'SHRIMP'],
    'Dish soap': ['bottle', GR, 'dish', 'DISH SOAP'],
    'Bleach': ['bottleTall', BL, 'bleach', 'BLEACH'],
    'Laundry powder': ['box', BL, 'wash', 'LAUNDRY'],
    'Toilet paper': ['pack', TL, 'roll', 'TOILET PAPER'],
    'Shampoo': ['bottle', PU, 'hair', 'SHAMPOO'],
    'Bar soap': ['bar', PK2, 'soap', 'SOAP'],
    'Toothpaste': ['tube', TL, 'tooth', 'TOOTHPASTE'],
    'Adult dog food': ['sack', BR, 'paw', 'DOG FOOD'],
    'Cat litter': ['sack', PU, 'cat', 'CAT LITTER'],
    'Chocolate bar': ['bar', BR, 'choc', 'CHOCOLATE'],
    'Chocolate bonbons': ['box', BR, 'bonbons', 'BONBONS'],
    'Chocolate wafer': ['pack', BR, 'wafer', 'WAFER'],
    'Hard candy': ['bag', PK2, 'wrapped', 'CANDY'],
    'Lollipop': ['pack', PK2, 'lolly', 'LOLLIPOP'],
    'Breath mints': ['tin', GR, 'mint', 'MINTS'],
    'Chewing gum': ['blister', GR, 'gum', 'GUM'],
    'Alkaline battery': ['blister', YL, 'battery', 'AA']
  };

  /* ---------- finish: volume, light and shadow, drawn over any package or produce ---------- */

  var DEFS = '<defs>' +
    '<linearGradient id="pa-cyl" gradientUnits="userSpaceOnUse" x1="26" y1="0" x2="134" y2="0">' +
      '<stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".10" stop-color="#000" stop-opacity=".05"/>' +
      '<stop offset=".26" stop-color="#fff" stop-opacity=".34"/><stop offset=".40" stop-color="#fff" stop-opacity=".08"/>' +
      '<stop offset=".68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>' +
    '<radialGradient id="pa-orb" gradientUnits="userSpaceOnUse" cx="64" cy="66" r="78">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></radialGradient>' +
    '<linearGradient id="pa-v" gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="150">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>' +
    '<linearGradient id="pa-gloss" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="76" y2="0">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="pa-floor" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".6" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
  '</defs>';
  var uid = 0;

  function finish(name, body, produce) {
    var id = 'pa-m' + (++uid);
    var light = produce ? 'url(#pa-orb)' : 'url(#pa-cyl)';
    return '<svg viewBox="0 0 160 160" role="img" aria-label="' + esc(name) + '" focusable="false">' + DEFS +
      '<ellipse cx="82" cy="151" rx="54" ry="7" fill="url(#pa-floor)"/>' +
      // The picture itself, then light over it: the shapes of the picture cut the light (mask by alpha), so the light never leaves the product
      '<g>' + body + '</g>' +
      '<mask id="' + id + '" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">' + body + '</mask>' +
      '<g mask="url(#' + id + ')">' +
        '<rect width="160" height="160" fill="' + light + '"/><rect width="160" height="160" fill="url(#pa-v)"/>' +
        (produce ? '' : '<rect x="40" y="0" width="36" height="160" fill="url(#pa-gloss)" transform="skewX(-6)"/>') +
      '</g></svg>';
  }

  window.ProductArt = {
    svg: function(name) {
      var a = ART[name];
      if (!a) return '';
      var loose = a[0] === 'loose';
      var body = loose ? LOOSE[a[2]]() : PK[a[0]](a[1], EM[a[2]](), a[3]);
      return finish(name, body, loose);
    }
  };
})();
