/**
 * Program Detail Page - Main Entry Point
 * Coordinates all feature modules for detail page
 */

(function() {
  'use strict';

  /* Populate every `.pf-filter__info-wrap` with the shared help popover markup
   * from the `#pf-filter-info-template` <script> template. Idempotent — skips
   * wraps that already contain a popover. Runs once at init since the wraps
   * are static HTML that never re-render. */
  function injectFilterInfoPopovers() {
    var tpl = document.getElementById('pf-filter-info-template');
    if (!tpl) return;
    var html = tpl.innerHTML;
    document.querySelectorAll('.pf-filter__info-wrap').forEach(function(wrap) {
      if (wrap.querySelector('.pf-filter__info-popover')) return;
      wrap.insertAdjacentHTML('beforeend', html);
    });
  }

  /**
   * Initialize the page
   */
  function init() {
    injectFilterInfoPopovers();
    // Initialize dropdowns (program/site selection)
    window.Dropdowns.init();

    // Render timeline
    var stages = window.DetailData.getBuildStages();
    // Default stage is P2, but EX02 opens on Pre P1 (empty-tables demo).
    var defaultStageId = 'Installation';
    var isEmptyProgram = false;
    try {
      var code = (new URLSearchParams(window.location.search).get('code') || '').toUpperCase();
      if (code === 'EX02') { defaultStageId = 'Planning'; isEmptyProgram = true; }
    } catch (e) {}
    var currentIdx = stages.findIndex(function(s) { return s.id === defaultStageId; });
    if (currentIdx < 0) currentIdx = 2;
    if (window.BuildStages) window.BuildStages.currentBuild = stages[currentIdx].id;
    var initialPage = document.querySelector('.program-detail-page');
    if (initialPage) initialPage.classList.toggle('program-detail-page--pre-p1', defaultStageId === 'Planning');
    if (isEmptyProgram) {
      var pageEl = document.querySelector('.program-detail-page');
      if (pageEl) pageEl.classList.add('program-detail-page--empty');
      // Empty programs can't be exported or published — disable both toolbar buttons.
      var exportBtn = document.getElementById('export-btn');
      var publishBtn = document.getElementById('publish-btn');
      if (exportBtn) exportBtn.disabled = true;
      if (publishBtn) publishBtn.disabled = true;
    }
    // What each phase means (shown as a tooltip) and how far along the current phase is.
    var STAGE_TIPS = {
      Planning: 'Defining goals and strategy',
      Preparation: 'Organizing resources',
      Installation: 'Executing the exhibition setup',
      Opening: 'Official launch',
      Dismantling: 'Closing and removal'
    };
    var currentSite = window.Dropdowns && window.Dropdowns.getCurrentSite ? window.Dropdowns.getCurrentSite() : null;
    var milestones = stages.map(function(s, i) {
      return {
        label: s.id,
        value: s.date,
        current: i === currentIdx,
        selected: i === currentIdx,
        tooltip: STAGE_TIPS[s.id] || '',
        progress: i === currentIdx && currentSite && typeof currentSite.progress === 'number' ? currentSite.progress : null
      };
    });
    ProjTimeline.create({
      containerId: 'program-timeline',
      milestones: milestones,
      // Clicking a milestone updates BuildStages and refreshes the four detail tables.
      // The MP stage gates each table to render only its header row (empty body).
      onSelect: function(milestone) {
        if (window.BuildStages) window.BuildStages.currentBuild = milestone.label;
        var page = document.querySelector('.program-detail-page');
        var isMp = milestone.label === 'Dismantling';
        var isPrePre = milestone.label === 'Planning';
        var hasTarget = !!(window.BuildStages && window.BuildStages.getMpTarget());
        if (page) {
          page.classList.toggle('program-detail-page--mp', isMp);
          page.classList.toggle('program-detail-page--mp-no-target', isMp && !hasTarget);
          page.classList.toggle('program-detail-page--pre-p1', isPrePre);
        }
        var versionTag = document.getElementById('program-version-tag');
        if (versionTag) versionTag.textContent = isMp ? 'Read-only' : 'V1 - Draft';
        if (window.LinesTable && typeof window.LinesTable.refreshForStage === 'function') {
          window.LinesTable.refreshForStage();
        }
        if (window.ProductsTable) window.ProductsTable.render();
        if (window.EmployeesTable) window.EmployeesTable.render();
        if (window.SuppliesTable) window.SuppliesTable.render();
        if (window.ConsumablesTable) window.ConsumablesTable.render();
        if (window.PCNTable) window.PCNTable.renderTable();
        // Apply / clear read-only on the freshly rendered DOM so MP-with-target
        // is locked down and any other stage is editable again.
        if (window.MPTargetSelector) {
          if (isMp && hasTarget) window.MPTargetSelector.applyReadonly();
          else window.MPTargetSelector.clearReadonly();
          window.MPTargetSelector.syncTags();
        }
      }
    }).init();

    // Initialize right toolbar
    if (window.ProjRightToolbar) {
      ProjRightToolbar.init();
    }

    // Render lines table
    window.LinesTable.render();

    // Initialize Process Flow filter panel (replaces the old search-bar)
    if (window.PFFilter) {
      window.PFFilter.init();
    }
    
    // Products tab (table + product drawer)
    if (window.ProductsTable) window.ProductsTable.init();
    if (window.EmployeesTable) window.EmployeesTable.init();
    if (window.SuppliesTable) window.SuppliesTable.init();
    if (window.AreasTree) window.AreasTree.init();
    if (window.FinanceView) window.FinanceView.init();
    if (window.AreaDrawer) window.AreaDrawer.init();
    if (window.StoreMap) window.StoreMap.init();
    if (window.StoreOverview) window.StoreOverview.init();

    // Initialize Process Flow (PF1) filter panel — same modern UX as EqFilter,
    // scoped to `#process-flow` / `.table--lines` (the flat lines table).
    if (window.PF1Filter) {
      window.PF1Filter.init();
    }

    // Initialize consumables table
    if (window.ConsumablesTable) {
      window.ConsumablesTable.init();
    }

    // Initialize Consumables filter panel — must run AFTER ConsumablesTable.init
    // because renderHeaders() replaces the thead, and injectHeaderShortcutIcons
    // needs the fresh `data-cs-field` headers to attach shortcut buttons to.
    if (window.ConsFilter) {
      window.ConsFilter.init();
    }

    // Initialize consumables view-settings drawer
    if (window.ConsumablesViewDrawer) {
      window.ConsumablesViewDrawer.init();
    }
    
    // Initialize PCN table
    if (window.PCNTable) {
      window.PCNTable.init();
    }

    // Purchase requests (after the PCN table, which also writes the number on the tab)
    if (window.RequestsView) window.RequestsView.init();
    
    // Initialize file upload modal
    if (window.FileUploadModal) {
      window.FileUploadModal.init();
    }

    // Initialize publish wizard
    if (window.PublishWizard) {
      window.PublishWizard.init();
    }

    // Initialize import modal
    if (window.ImportModal) {
      window.ImportModal.init();
    }

    // Initialize column resizer for tables
    if (window.ColumnResizer) {
      window.ColumnResizer.init('.table--pcn');
      window.ColumnResizer.init('.table--consumables');
      window.ColumnResizer.init('.table--lines');
      window.ColumnResizer.init('.table--vendors');
    }

    // Initialize MP target selector (PF2 empty state)
    if (window.MPTargetSelector) {
      window.MPTargetSelector.init();
    }

    // Initialize AFMD Sync — paints per-station sync status badges + inline CTA
    // on the Process Flow tab (L1 aggregate + L2 per-station), handles shift-click
    // multi-select, bulk actions bar, confirmation modal, diff drawer, progress dock.
    if (window.AfmdSync) {
      window.AfmdSync.init();
    }
    
    // Initialize tabs
    window.Tabs.init();

    // ?tab=revenue (or purchase-spend, consumables...) opens that tab: the Finance page links to the store tabs
    var wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted === 'revenue' || wanted === 'purchase-spend') {
      if (window.FinanceView) window.FinanceView.show(wanted);
      wanted = null;
    }
    var wantedTab = wanted && document.querySelector('.tabs__tab[data-tab="' + wanted.replace(/[^a-z0-9-]/gi, '') + '"]');
    if (wantedTab) wantedTab.click();

    console.log('Exhibition detail page initialized successfully');
  }
  
  /**
   * Safe initialization wrapper. Guarded against re-entry — page init is
   * idempotent by design, but any component (e.g. a lazy-mounted plugin
   * drawer that dispatches `davinci:canvas:ready` to force MDS to init its
   * selects) that re-fires the ready event would otherwise re-run every
   * `LinesTable.render` / plugin init and nuke the current UI state
   * (collapsing expanded rows, resetting selection, etc.).
   */
  var __detailInitDone = false;
  function safeInit() {
    if (__detailInitDone) return;
    __detailInitDone = true;
    try {
      init();
    } catch (err) {
      console.error('Init failed:', err);
    }
  }
  
  /**
   * CRITICAL: This initialization pattern is required for all prototypes
   */
  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();
