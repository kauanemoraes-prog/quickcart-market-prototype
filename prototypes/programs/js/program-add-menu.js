/**
 * Program Add Menu
 * Hover-triggered dropdown ("From scratch" / "From existing") on the toolbar.
 * The show/hide of the menu is CSS-only (:hover on .add-program-hover);
 * this module just routes item clicks to the drawer or wizard modal.
 */

(function() {
  'use strict';

  window.ProgramAddMenu = {
    init: function() {
      var menu = document.querySelector('.add-program-hover__menu');
      if (!menu) return;

      menu.addEventListener('click', function(e) {
        var item = e.target.closest('[data-add-program-action]');
        if (!item) return;
        var action = item.getAttribute('data-add-program-action');

        // Take focus off so :focus-within releases and the menu closes.
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }

        if (action === 'scratch') {
          var drawer = document.getElementById('program-drawer');
          if (drawer) drawer.classList.add('drawer-overlay--open');
        } else if (action === 'existing') {
          if (window.ProgramWizard) window.ProgramWizard.open();
        }
      });

      // Deep link from the dashboard: ?add=scratch or ?add=existing opens the same flow.
      var add = new URLSearchParams(window.location.search).get('add');
      if (add) {
        var item = menu.querySelector('[data-add-program-action="' + add + '"]');
        if (item) item.click();
      }
    }
  };
})();
