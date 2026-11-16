/* DaVinci Plugins — Project-level custom component behaviors */
/* Auto-loaded by canvas framework alongside MDS */

(function() {
  'use strict';

  /* ========================================
     Dark Mode (global toggle, persisted)
     ======================================== */

  var DARK_KEY = 'davinci:dark-mode';
  var DARK_CLASS = 'dark-mode';

  function readDarkMode() {
    try { return localStorage.getItem(DARK_KEY) === '1'; } catch (e) { return false; }
  }
  function writeDarkMode(enabled) {
    try { localStorage.setItem(DARK_KEY, enabled ? '1' : '0'); } catch (e) { /* private mode */ }
  }
  function applyDarkMode(enabled) {
    document.documentElement.classList.toggle(DARK_CLASS, enabled);
    document.dispatchEvent(new CustomEvent('davinci:dark-mode:change', { detail: { enabled: enabled } }));
  }
  function syncToggleState() {
    var enabled = document.documentElement.classList.contains(DARK_CLASS);
    document.querySelectorAll('.proj-right-toolbar__item[data-item-id="dark-mode"]').forEach(function(btn) {
      btn.classList.toggle('proj-right-toolbar__item--active', enabled);
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    });
  }

  /* Restore IMMEDIATELY on script load to minimize flash of light mode.
   * (Prototypes can ALSO add an inline <head> snippet for zero-flash.) */
  applyDarkMode(readDarkMode());

  window.ProjDarkMode = {
    init: function() {
      applyDarkMode(readDarkMode());
      syncToggleState();
    },
    isEnabled: function() {
      return document.documentElement.classList.contains(DARK_CLASS);
    },
    enable: function() {
      applyDarkMode(true);
      writeDarkMode(true);
      syncToggleState();
    },
    disable: function() {
      applyDarkMode(false);
      writeDarkMode(false);
      syncToggleState();
    },
    toggle: function() {
      if (this.isEnabled()) this.disable();
      else this.enable();
    },
    syncToggleState: syncToggleState
  };

  /* ========================================
     Plugin orchestrator — fires after DOM ready
     ======================================== */

  window.davinciPlugins = {
    init: function() {
      ProjDarkMode.init();
      if (window.ProjRightToolbar) ProjRightToolbar.init();
      if (window.ProjStationSettingsDrawer) ProjStationSettingsDrawer.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      DaVinciPlugins.init();
    });
  } else {
    DaVinciPlugins.init();
  }
})();
