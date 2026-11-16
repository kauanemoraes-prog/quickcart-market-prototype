/**
 * Product Cards
 * The card view of the Products tabs (a store and the whole network). A card shows the package photo, the name and brand,
 * the variant and size, the SKU and barcode, and the stock status in a large badge. There are no photos in the prototype,
 * so the package is drawn: its shape follows the package type and its colours follow the brand.
 */

(function() {
  'use strict';

  // Photos live in img/products/<product name>.jpg (lowercase, words joined by "-"). A product without a photo shows the drawn package.
  var PHOTOS = (document.currentScript ? document.currentScript.src.replace(/js\/[^\/]*$/, '') : '') + 'img/products/';

  function slug(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  var TONE = { 'In stock': 'success', 'Low stock': 'warning', 'Out of stock': 'danger' };
  var PALETTE = [['#2F6FED', '#DCE7FD'], ['#D6453D', '#FBE0DE'], ['#2E9E5B', '#DBF1E4'], ['#E08A1E', '#FBEBD3'], ['#7A4FD6', '#E8E0F8'], ['#0F8FA3', '#D6EEF2'], ['#C2407A', '#F6DCE8'], ['#6B7280', '#E5E7EB']];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hash(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return h;
  }

  /** The drawn package: `pack` is the package type (Bag, Bottle, Box...), `brand` picks the colours and `variant` is printed on the label. */
  function art(pack, brand, variant, name) {
    var drawn = window.ProductArt && name ? window.ProductArt.svg(name) : '';
    if (drawn) return drawn;
    var c = PALETTE[hash(brand || 'Loose') % PALETTE.length], dark = c[0], light = c[1];
    var initial = esc((brand && brand !== 'Loose' ? brand : (variant || '?')).charAt(0).toUpperCase());
    var label = '<rect x="30" y="62" width="60" height="38" rx="4" fill="#fff" opacity=".92"/><text x="60" y="88" text-anchor="middle" font-size="24" font-weight="700" fill="' + dark + '">' + initial + '</text>';
    var body;
    switch (pack) {
      case 'Bottle':
        body = '<rect x="50" y="10" width="20" height="16" rx="3" fill="' + dark + '"/><path d="M48 26h24l8 16v78a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6V42z" fill="' + light + '" stroke="' + dark + '" stroke-width="3"/>' +
          '<rect x="40" y="64" width="40" height="34" fill="' + dark + '"/><text x="60" y="88" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">' + initial + '</text>';
        break;
      case 'Can': case 'Tin': case 'Tub': case 'Cup':
        body = '<ellipse cx="60" cy="30" rx="34" ry="9" fill="' + dark + '"/><path d="M26 30v78c0 5 15 9 34 9s34-4 34-9V30c0 5-15 9-34 9S26 35 26 30z" fill="' + light + '" stroke="' + dark + '" stroke-width="3"/>' +
          '<path d="M26 56v36c0 5 15 9 34 9s34-4 34-9V56c0 5-15 9-34 9S26 61 26 56z" fill="' + dark + '"/><text x="60" y="92" text-anchor="middle" font-size="24" font-weight="700" fill="#fff">' + initial + '</text>';
        break;
      case 'Bag':
        body = '<path d="M24 22q36 10 72 0l4 92q-40 10-80 0z" fill="' + light + '" stroke="' + dark + '" stroke-width="3"/><path d="M24 22q36 12 72 0" fill="none" stroke="' + dark + '" stroke-width="3" stroke-dasharray="3 4"/>' + label;
        break;
      case 'Tube':
        body = '<path d="M40 14h40l6 12H34z" fill="' + dark + '"/><path d="M34 26h52l-8 94H42z" fill="' + light + '" stroke="' + dark + '" stroke-width="3"/><rect x="46" y="62" width="28" height="30" rx="3" fill="' + dark + '"/><text x="60" y="84" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">' + initial + '</text>';
        break;
      case 'Loose':
        body = '<circle cx="60" cy="70" r="40" fill="' + light + '" stroke="' + dark + '" stroke-width="3"/><path d="M60 30c0-12 8-18 16-18-1 10-6 17-16 18z" fill="' + dark + '"/><text x="60" y="82" text-anchor="middle" font-size="30" font-weight="700" fill="' + dark + '">' + initial + '</text>';
        break;
      case 'Tray':
        body = '<path d="M14 62h92l-8 46H22z" fill="' + light + '" stroke="' + dark + '" stroke-width="3"/><ellipse cx="42" cy="58" rx="18" ry="12" fill="' + dark + '"/><ellipse cx="78" cy="58" rx="18" ry="12" fill="' + dark + '" opacity=".75"/><text x="60" y="94" text-anchor="middle" font-size="20" font-weight="700" fill="' + dark + '">' + initial + '</text>';
        break;
      default:   // Box, Carton, Pack, Package
        body = '<rect x="22" y="14" width="76" height="104" rx="5" fill="' + light + '" stroke="' + dark + '" stroke-width="3"/><rect x="22" y="14" width="76" height="16" fill="' + dark + '"/>' + label;
    }
    return '<svg viewBox="0 0 120 130" role="img" aria-label="' + esc((brand || '') + ' ' + (pack || 'package')) + '" focusable="false">' + body + '</svg>';
  }

  /** One card. `o`: name, brand, variant, size, pack, sku, ean, status, headline (big number text), headlineTone, footer (html), attrs (html attributes), cls. */
  function card(o) {
    var brand = o.brand && o.brand !== 'Loose' ? o.brand : 'Loose';
    return '<article class="pc-card' + (o.cls ? ' ' + o.cls : '') + '" ' + (o.attrs || '') + ' tabindex="0">' +
      '<div class="pc-card__main">' +
        '<div class="pc-card__photo">' + art(o.pack, o.brand, o.variant, o.art === false ? '' : o.name) +
          '<img class="pc-card__img" src="' + PHOTOS + slug(o.name) + '.jpg" alt="' + esc(o.name) + '" loading="lazy" onerror="this.remove()"></div>' +
        '<div class="pc-card__body">' +
          '<h4 class="pc-card__name">' + esc(o.name) + '</h4>' +
          '<p class="pc-card__brand">' + esc(brand) + '</p>' +
          '<p class="pc-card__meta">' + esc(o.variant) + ' · ' + esc(o.size) + '</p>' +
          (o.price ? '<p class="pc-card__price">' + o.price + '</p>' : '') +
          (o.expiry ? '<p class="pc-card__exp' + (o.expiryTone ? ' pc-card__exp--' + o.expiryTone : '') + '">' + o.expiry + '</p>' : '') +
          '<p class="pc-card__code">' + (o.codes || [['SKU', o.sku], ['EAN', o.ean]]).map(function(c) { return '<span>' + c[0] + '</span> ' + esc(c[1]); }).join('<br>') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="pc-card__stock pc-card__stock--' + (o.tone || TONE[o.status]) + '">' +
        '<span class="pc-card__status">' + esc(o.status) + '</span><span class="pc-card__qty">' + o.headline + '</span>' +
        (o.footer ? '<span class="pc-card__footer">' + o.footer + '</span>' : '') +
      '</div>' +
    '</article>';
  }

  /** The List / Cards switch of the toolbar. */
  function toggleHtml(current) {
    function b(key, icon, label) {
      return '<button type="button" class="pc-toggle__btn' + (current === key ? ' pc-toggle__btn--active' : '') + '" data-view="' + key + '" aria-pressed="' + (current === key) + '">' +
        '<lucide-icon name="' + icon + '" style="font-size:16px"></lucide-icon><span>' + label + '</span></button>';
    }
    return '<div class="pc-toggle" role="group" aria-label="View">' + b('table', 'list', 'List') + b('cards', 'layout-grid', 'Cards') + '</div>';
  }

  window.ProductCards = { slug: slug, art: art, card: card, toggleHtml: toggleHtml };
})();
