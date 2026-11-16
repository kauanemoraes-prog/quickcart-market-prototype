/**
 * Button motion
 * Every button answers a click: it presses in and springs back, with a soft ring. Tabs have their own motion (tab-motion.js)
 * and the AI Assistant button has the three stars, so they are left out.
 */

(function() {
  'use strict';

  var BUTTONS = 'button, .btn, a.btn, [role="button"]';
  var SKIP = '.bn-top, .tabs__tab, .rq-subtab, .bn-ai__fab, :is(button[title="Smart Assistant"], button[data-bn-title="Smart Assistant"]), .column-resize-handle, .fin-seg__btn[disabled]';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function press(e) {
    if (reduced) return;
    var b = e.target.closest ? e.target.closest(BUTTONS) : null;
    if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true' || b.matches(SKIP)) return;
    b.classList.remove('md-press');
    void b.offsetWidth;
    b.classList.add('md-press');
    b.addEventListener('animationend', function done(ev) {
      if (ev.animationName !== 'md-press') return;
      b.classList.remove('md-press');
      b.removeEventListener('animationend', done);
    });
  }

  document.addEventListener('pointerdown', press, true);
})();
