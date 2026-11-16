(function() {
  'use strict';

  function safeInit() {
    try { init(); } catch (err) { console.error('Init failed:', err); }
  }

  function init() {
    if (window.BuildStages) BuildStages.init();
    if (window.EquipTable) EquipTable.init();
    if (window.ProjRightToolbar) ProjRightToolbar.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
