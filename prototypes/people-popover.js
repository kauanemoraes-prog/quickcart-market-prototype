/**
 * People popover
 * Click a person's name (any element with class "person-link" and data-person / data-role) to open a
 * small card with ways to contact them. The details are generated from the name because the mock
 * data only has names: a fictitious e-mail and phone number.
 *
 * Closes on Esc, on a click outside, on scroll and on resize. Focus moves into the card and goes back
 * to the name when it closes. The name has no title attribute on purpose: a native tooltip would
 * stack on top of the card.
 */

(function() {
  'use strict';

  var ORG = 'QuickCart Market Inc.';
  var DOMAIN = 'quickcart.example';
  var card = null;
  var trigger = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function slug(name) {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  }

  function initials(name) {
    var parts = name.trim().split(/\s+/);
    return ((parts[0] || '')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  /** Stable fictitious phone number for a name. */
  function phone(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 100000000;
    var n = ('00000000' + h).slice(-8);
    return '+55 11 9' + n.slice(0, 4) + '-' + n.slice(4);
  }

  function close() {
    if (!card) return;
    card.remove();
    card = null;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      if (document.contains(trigger)) trigger.focus({ preventScroll: true });
    }
    trigger = null;
  }

  function open(el) {
    close();
    var name = el.getAttribute('data-person');
    var role = el.getAttribute('data-role') || '';
    var email = slug(name) + '@' + DOMAIN;
    var tel = phone(name);

    card = document.createElement('div');
    card.className = 'person-popover';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Contact ' + name);
    card.tabIndex = -1;
    card.innerHTML =
      '<div class="person-popover__header">' +
        '<span class="person-popover__avatar" aria-hidden="true">' + (window.PeopleAvatars && window.PeopleAvatars.url(name) ? '<img src="' + window.PeopleAvatars.url(name) + '" alt="">' : esc(initials(name))) + '</span>' +
        '<div class="person-popover__who">' +
          '<strong class="person-popover__name">' + esc(name) + '</strong>' +
          '<span class="person-popover__org">' + esc(role ? role + ' · ' + ORG : ORG) + '</span>' +
        '</div>' +
      '</div>' +
      '<dl class="person-popover__contacts">' +
        '<div><dt>Email</dt><dd><a href="mailto:' + esc(email) + '">' + esc(email) + '</a></dd></div>' +
        '<div><dt>Phone</dt><dd><a href="tel:' + esc(tel.replace(/\s/g, '')) + '">' + esc(tel) + '</a></dd></div>' +
      '</dl>';
    document.body.appendChild(card);

    // Below the name, aligned to its left edge; above it when there is no room underneath.
    var r = el.getBoundingClientRect();
    var w = card.offsetWidth, h = card.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
    card.style.left = left + window.scrollX + 'px';
    card.style.top = top + window.scrollY + 'px';

    trigger = el;
    el.setAttribute('aria-expanded', 'true');
    card.focus({ preventScroll: true });
  }

  document.addEventListener('click', function(e) {
    var link = e.target.closest && e.target.closest('.person-link');
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      if (trigger === link) close(); else open(link);
      return;
    }
    if (card && !(e.target.closest && e.target.closest('.person-popover'))) close();
  }, true);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && card) close();
  });

  window.addEventListener('resize', close);
  window.addEventListener('scroll', function(e) {
    if (card && !(e.target.closest && e.target.closest('.person-popover'))) close();
  }, true);
})();
