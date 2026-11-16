/**
 * MP Target Selector — empty states inside the MP-aware tabs (Process Flow,
 * Process Flow 2, Equipment List, Consumables) that let an admin assign a
 * target Build Event for the MP mirror view, plus the "Edit Target" modal
 * that lets an admin pick a different target after the initial assign.
 *
 * State lives in BuildStages.mpTarget. The page root carries a
 * `program-detail-page--mp-no-target` class while a target is unassigned
 * and MP is the active stage; CSS uses it to swap the panel content for
 * the empty state. Assigning a target removes the class.
 *
 * Uses the project's `equip-dropdown` pattern (the same custom dropdown used
 * in the lines/equipment tables) so the menu always opens below the trigger.
 * The outside-click closer registered by EquipmentTable closes our dropdowns
 * too, since it's a global document-level listener.
 */
(function() {
  'use strict';

  var MP_PANEL_SELECTOR = '#process-flow, #process-flow-2, #equipment-list, #materials';
  var DEFAULT_LABEL = 'Select Project Phase...';
  var MIRROR_STEPS = ['Locating target', 'Filtering POR items', 'Mirroring', 'Finalizing'];

  /** Update the two MP target tags in the page header based on the current
   * stage and `BuildStages.mpTarget`:
   * - `#mp-target-source-tag`: shown in MP, names the build event being mirrored
   * - `#mp-target-indicator-tag`: shown on the build event that IS the target */
  function syncTags() {
    if (!window.BuildStages) return;
    var current = window.BuildStages.getCurrentBuild();
    var mpTarget = window.BuildStages.getMpTarget();
    var sourceTag = document.getElementById('mp-target-source-tag');
    var sourceName = document.getElementById('mp-target-source-name');
    var targetTag = document.getElementById('mp-target-indicator-tag');

    if (sourceTag) {
      var showSource = current === 'Dismantling' && !!mpTarget;
      sourceTag.style.display = showSource ? '' : 'none';
      if (showSource && sourceName) sourceName.textContent = mpTarget;
    }
    if (targetTag) {
      var showIndicator = current !== 'Dismantling' && !!mpTarget && current === mpTarget;
      targetTag.style.display = showIndicator ? '' : 'none';
    }
  }

  /** Block keyboard edits in the MP-aware panels by setting readOnly on all
   * text inputs/textareas and disabled on all native selects. CSS already
   * blocks mouse interaction, but Tab + type would still let the user edit
   * values without these attributes. Called after every render that might
   * land in MP-with-target state. */
  function applyReadonly() {
    document.querySelectorAll(MP_PANEL_SELECTOR).forEach(function(panel) {
      panel.querySelectorAll('input, textarea').forEach(function(el) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.disabled = true;
        } else {
          el.readOnly = true;
        }
      });
      panel.querySelectorAll('select').forEach(function(el) { el.disabled = true; });
    });
  }

  function clearReadonly() {
    document.querySelectorAll(MP_PANEL_SELECTOR).forEach(function(panel) {
      panel.querySelectorAll('input, textarea').forEach(function(el) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.disabled = false;
        } else {
          el.readOnly = false;
        }
      });
      panel.querySelectorAll('select').forEach(function(el) { el.disabled = false; });
    });
  }

  /** Build options for an equip-dropdown menu. Excludes MP and any stages
   * in `excludeIds` (used by the Edit Target modal to hide the currently
   * assigned target). */
  function buildOptions(menu, stages, excludeIds) {
    excludeIds = excludeIds || [];
    menu.innerHTML = '';
    stages.forEach(function(s) {
      if (s.id === 'Dismantling') return;
      if (excludeIds.indexOf(s.id) !== -1) return;
      var li = document.createElement('li');
      li.className = 'equip-dropdown__option';
      li.dataset.value = s.id;
      li.textContent = s.id;
      menu.appendChild(li);
    });
  }

  function populate() {
    if (!window.DetailData) return;
    var stages = window.DetailData.getBuildStages();
    document.querySelectorAll('.mp-empty-state .equip-dropdown__menu').forEach(function(menu) {
      buildOptions(menu, stages);
    });
  }

  /** Wire an equip-dropdown (trigger + menu) to:
   * - Open/close on trigger click (closing other open dropdowns first)
   * - Update value + selected state on item click
   * - Call `onChange(value)` when the user picks something */
  function wireDropdown(dropdown, onChange) {
    var trigger = dropdown.querySelector('.equip-dropdown__trigger');
    var valueEl = dropdown.querySelector('.equip-dropdown__value');
    var menu = dropdown.querySelector('.equip-dropdown__menu');
    if (!trigger || !valueEl || !menu) return;

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var wasOpen = dropdown.classList.contains('equip-dropdown--open');
      document.querySelectorAll('.equip-dropdown--open').forEach(function(el) {
        el.classList.remove('equip-dropdown--open');
      });
      if (!wasOpen) dropdown.classList.add('equip-dropdown--open');
    });

    menu.addEventListener('click', function(e) {
      var option = e.target.closest('.equip-dropdown__option');
      if (!option) return;
      e.stopPropagation();
      dropdown.dataset.value = option.dataset.value;
      valueEl.textContent = option.textContent;
      menu.querySelectorAll('.equip-dropdown__option--selected').forEach(function(el) {
        el.classList.remove('equip-dropdown__option--selected');
      });
      option.classList.add('equip-dropdown__option--selected');
      dropdown.classList.remove('equip-dropdown--open');
      if (typeof onChange === 'function') onChange(option.dataset.value);
    });
  }

  /** Run the full mirror flow: 3s simulated commit (button shows an inline
   * loading spinner via `.btn--loading`), then set the target, remove the
   * no-target class, re-render tables, lock read-only, sync tags, and show a
   * success toast. Used by the empty-state Confirm and the Edit Target modal
   * Confirm — each passes its own trigger button so the loading state is
   * scoped to that button. */
  function runMirrorFlow(value, triggerBtn, onDone) {
    if (triggerBtn) triggerBtn.classList.add('btn--loading');

    setTimeout(function() {
      if (window.BuildStages) window.BuildStages.setMpTarget(value);
      var page = document.querySelector('.program-detail-page');
      if (page) page.classList.remove('program-detail-page--mp-no-target');
      if (window.LinesTable && typeof window.LinesTable.refreshForStage === 'function') {
        window.LinesTable.refreshForStage();
      }
      if (window.ProductsTable) window.ProductsTable.render();
      if (window.ConsumablesTable) window.ConsumablesTable.render();
      applyReadonly();
      syncTags();
      if (typeof window.showNotification === 'function') {
        window.showNotification('success', 'Target project phase ' + value + ' mirrored to Dismantling.');
      }
      if (triggerBtn) triggerBtn.classList.remove('btn--loading');
      if (typeof onDone === 'function') onDone();
    }, 3000);
  }

  /** Mount the Edit Target modal via ModalShell and wire its open/close +
   * picker behavior. The dropdown is re-populated each time the modal opens
   * so it can exclude the currently-assigned target. */
  function initEditTargetModal() {
    if (!window.ModalShell) return;
    window.ModalShell.render({
      modalId: 'mp-edit-target-modal',
      sizeClass: 'modal--small',
      title: 'Edit Dismantling Target',
      titleId: 'mp-edit-target-modal-title',
      closeId: 'mp-edit-target-modal-close',
      bodyHtml: window.ModalShell.bodyFrom('mp-edit-target-modal-body'),
      footerHtml: window.ModalShell.bodyFrom('mp-edit-target-modal-footer')
    });

    var modal = document.getElementById('mp-edit-target-modal');
    var openBtn = document.getElementById('mp-edit-target-btn');
    var closeBtn = document.getElementById('mp-edit-target-modal-close');
    var cancelBtn = document.getElementById('mp-edit-target-modal-cancel');
    var confirmBtn = document.getElementById('mp-edit-target-modal-confirm');
    if (!modal || !openBtn || !confirmBtn) return;

    var dropdown = modal.querySelector('.equip-dropdown');
    var menu = modal.querySelector('.equip-dropdown__menu');
    var valueEl = modal.querySelector('.equip-dropdown__value');

    function resetModalUI() {
      if (dropdown) {
        dropdown.dataset.value = '';
        dropdown.classList.remove('equip-dropdown--open');
      }
      if (valueEl) valueEl.textContent = DEFAULT_LABEL;
      confirmBtn.disabled = true;
    }

    function open() {
      resetModalUI();
      var stages = (window.DetailData && window.DetailData.getBuildStages) ? window.DetailData.getBuildStages() : [];
      var current = (window.BuildStages && window.BuildStages.getMpTarget) ? window.BuildStages.getMpTarget() : null;
      if (menu) buildOptions(menu, stages, current ? [current] : []);
      modal.classList.add('modal-overlay--open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function close() {
      modal.classList.remove('modal-overlay--open');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (dropdown) {
      wireDropdown(dropdown, function() { confirmBtn.disabled = false; });
    }

    openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);
    confirmBtn.addEventListener('click', function() {
      var value = dropdown && dropdown.dataset.value;
      if (!value) return;
      runMirrorFlow(value, confirmBtn, close);
    });
    modal.addEventListener('click', function(e) {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('modal-overlay--open')) close();
    });
  }

  function bind() {
    document.querySelectorAll('.mp-empty-state').forEach(function(emptyState) {
      var dropdown = emptyState.querySelector('.equip-dropdown');
      var assignBtn = emptyState.querySelector('.mp-target-assign');
      if (!dropdown || !assignBtn) return;

      wireDropdown(dropdown, function() { assignBtn.disabled = false; });

      assignBtn.addEventListener('click', function() {
        var value = dropdown.dataset.value;
        if (!value) return;
        runMirrorFlow(value, assignBtn);
      });
    });
  }

  /** Clear any assigned target and reset every empty-state UI. Re-applies
   * the no-target class if MP is currently the active stage. Called by
   * `Dropdowns` when the program changes. */
  function reset() {
    if (window.BuildStages) window.BuildStages.setMpTarget(null);
    document.querySelectorAll('.mp-empty-state .equip-dropdown').forEach(function(d) {
      d.dataset.value = '';
      d.classList.remove('equip-dropdown--open');
    });
    document.querySelectorAll('.mp-empty-state .equip-dropdown__value').forEach(function(v) {
      v.textContent = DEFAULT_LABEL;
    });
    document.querySelectorAll('.mp-empty-state .equip-dropdown__option--selected').forEach(function(el) {
      el.classList.remove('equip-dropdown__option--selected');
    });
    document.querySelectorAll('.mp-target-assign').forEach(function(b) { b.disabled = true; });
    var page = document.querySelector('.program-detail-page');
    if (page && page.classList.contains('program-detail-page--mp')) {
      page.classList.add('program-detail-page--mp-no-target');
    }
    if (window.LinesTable && typeof window.LinesTable.refreshForStage === 'function') {
      window.LinesTable.refreshForStage();
    }
    if (window.ProductsTable) window.ProductsTable.render();
    if (window.ConsumablesTable) window.ConsumablesTable.render();
    clearReadonly();
    syncTags();
  }

  window.MPTargetSelector = {
    init: function() {
      populate();
      bind();
      initEditTargetModal();
      syncTags();
    },
    reset: reset,
    applyReadonly: applyReadonly,
    clearReadonly: clearReadonly,
    syncTags: syncTags
  };
})();
