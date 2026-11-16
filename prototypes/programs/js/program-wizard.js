/**
 * Program Wizard
 * "Add Program from existing" — 7-step wizard modal.
 * Only step 1 is designed for now; Next is disabled until later steps land.
 */

(function() {
  'use strict';

  window.ProgramWizard = {
    currentStep: 1,
    totalSteps: 7,
    mode: 'full',
    stepTitles: {
      1: 'Add Exhibition from existing',
      2: 'Add Exhibition from existing',
      3: 'Add Exhibition from existing',
      4: 'Add Exhibition from existing',
      5: 'Add Exhibition from existing',
      6: 'Add Exhibition from existing',
      7: 'Add Exhibition from existing'
    },

    init: function() {
      var overlay = document.getElementById('wizard-modal');
      if (!overlay) return;
      this.overlay = overlay;

      var closeBtn = document.getElementById('wizard-close-btn');
      var cancelBtn = document.getElementById('wizard-cancel-btn');
      var nextBtn = document.getElementById('wizard-next-btn');
      var backBtn = document.getElementById('wizard-back-btn');
      var minimizeBtn = document.getElementById('wizard-minimize-btn');
      var restoreBtn = document.getElementById('wizard-mini-restore-btn');

      if (closeBtn) closeBtn.addEventListener('click', this.close.bind(this));
      if (cancelBtn) cancelBtn.addEventListener('click', this.close.bind(this));
      if (nextBtn) nextBtn.addEventListener('click', this.next.bind(this));
      if (backBtn) backBtn.addEventListener('click', this.back.bind(this));
      if (minimizeBtn) minimizeBtn.addEventListener('click', this.minimize.bind(this));
      if (restoreBtn) restoreBtn.addEventListener('click', this.restore.bind(this));

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.classList.remove('modal-overlay--open');
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('modal-overlay--open')) {
          overlay.classList.remove('modal-overlay--open');
        }
      });

      this.initBuildSchedules();
      this.initSiteRowsDrag();
      this.initAddSite();
      this.initSelectAll();
      this.initStep2Validation();
      this.initStep3();
      this.initStep4();
      this.initStep5();
      this.updateNextButton();
      this.updateFooterState();
    },

    /**
     * "+" button next to the Sites column header appends a fresh row
     * at the bottom of each sites table. Focuses the new Site input.
     */
    initAddSite: function() {
      var addBtns = document.querySelectorAll('[data-add-site]');
      addBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var table = btn.closest('.wizard-sites-table');
          if (!table) return;
          var body = table.querySelector('[data-sites-body]');
          if (!body) return;

          var tr = document.createElement('tr');
          tr.className = 'table__row wizard-site-row';
          tr.innerHTML =
            '<td class="table__cell wizard-drag-cell">' +
              '<span class="wizard-drag-handle" aria-label="Drag to reorder" role="button" tabindex="-1">' +
                '<lucide-icon name="line.3.horizontal"></lucide-icon>' +
              '</span>' +
            '</td>' +
            '<td class="table__cell">' +
              '<input type="text" class="form-input form-input--table-cell wizard-site-input" placeholder="Site name" aria-label="Site name">' +
            '</td>' +
            '<td class="table__cell">' +
              '<input type="text" class="form-input form-input--table-cell wizard-site-input" placeholder="Exhibition alias" aria-label="Exhibition alias">' +
            '</td>' +
            '<td class="table__cell">' +
              '<div class="wizard-build-schedule" data-build-schedule>' +
                '<button type="button" class="wizard-chip-add" aria-label="Add project phase">' +
                  '<lucide-icon name="plus.circle"></lucide-icon>' +
                '</button>' +
              '</div>' +
            '</td>';

          body.appendChild(tr);

          var siteInput = tr.querySelector('.wizard-site-input');
          if (siteInput) siteInput.focus();
        });
      });
    },

    /**
     * Drag-and-drop reorder for the sites table rows.
     * Row becomes draggable only when the user grabs the .wizard-drag-handle,
     * so text selection inside form-inputs still works normally.
     */
    initSiteRowsDrag: function() {
      var bodies = document.querySelectorAll('[data-sites-body]');
      bodies.forEach(function(body) {
        var dragged = null;

        body.addEventListener('mousedown', function(e) {
          var handle = e.target.closest('.wizard-drag-handle');
          if (!handle) return;
          var row = handle.closest('.wizard-site-row');
          if (row) row.setAttribute('draggable', 'true');
        });

        body.addEventListener('dragstart', function(e) {
          var row = e.target.closest('.wizard-site-row');
          if (!row) return;
          dragged = row;
          row.classList.add('is-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', 'row');
        });

        body.addEventListener('dragover', function(e) {
          var row = e.target.closest('.wizard-site-row');
          if (!row || row === dragged) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          body.querySelectorAll('.wizard-site-row').forEach(function(r) {
            r.classList.remove('drop-before', 'drop-after');
          });
          var rect = row.getBoundingClientRect();
          var isAfter = (e.clientY - rect.top) > rect.height / 2;
          row.classList.add(isAfter ? 'drop-after' : 'drop-before');
        });

        body.addEventListener('drop', function(e) {
          var target = e.target.closest('.wizard-site-row');
          if (!target || !dragged || target === dragged) return;
          e.preventDefault();
          var rect = target.getBoundingClientRect();
          var isAfter = (e.clientY - rect.top) > rect.height / 2;
          if (isAfter) {
            target.parentNode.insertBefore(dragged, target.nextSibling);
          } else {
            target.parentNode.insertBefore(dragged, target);
          }
        });

        body.addEventListener('dragend', function() {
          body.querySelectorAll('.wizard-site-row').forEach(function(r) {
            r.classList.remove('is-dragging', 'drop-before', 'drop-after');
            r.removeAttribute('draggable');
          });
          dragged = null;
        });
      });
    },

    /**
     * Build-schedule chips: editable segments separated by arrows + "add" button.
     * Delegates on each [data-build-schedule] container.
     */
    initBuildSchedules: function() {
      // Single document-level delegation so rows added later (via "Add site")
      // pick up the same behavior without re-init.
      document.addEventListener('click', function(e) {
        var container = e.target.closest('[data-build-schedule]');
        if (!container) return;

        var removeBtn = e.target.closest('.wizard-chip-remove');
        if (removeBtn) {
          var wrap = removeBtn.closest('.wizard-chip-wrap');
          if (!wrap) return;
          var prev = wrap.previousElementSibling;
          var next = wrap.nextElementSibling;
          if (prev && prev.classList.contains('wizard-chip-arrow')) {
            prev.remove();
          } else if (next && next.classList.contains('wizard-chip-arrow')) {
            next.remove();
          }
          wrap.remove();
          return;
        }

        var addBtn = e.target.closest('.wizard-chip-add');
        if (!addBtn) return;

        var hasExistingChips = container.querySelector('.wizard-chip-wrap');
        if (hasExistingChips) {
          var arrow = document.createElement('span');
          arrow.className = 'wizard-chip-arrow';
          arrow.setAttribute('aria-hidden', 'true');
          arrow.innerHTML = '&rarr;';
          container.insertBefore(arrow, addBtn);
        }

        var newWrap = document.createElement('span');
        newWrap.className = 'wizard-chip-wrap';

        var chip = document.createElement('span');
        chip.className = 'wizard-chip';
        chip.contentEditable = 'true';
        chip.spellcheck = false;

        var rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'wizard-chip-remove';
        rm.setAttribute('aria-label', 'Remove stage');
        rm.innerHTML = '&times;';

        newWrap.appendChild(chip);
        newWrap.appendChild(rm);
        container.insertBefore(newWrap, addBtn);
        chip.focus();
      });

      document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        if (!e.target.closest('[data-build-schedule]')) return;
        var chip = e.target.closest('.wizard-chip');
        if (!chip) return;
        e.preventDefault();
        chip.blur();
      });
    },

    open: function(opts) {
      var mode = (opts && opts.mode) || 'full';
      this.setMode(mode);
      if (this.overlay) {
        var modal = this.overlay.querySelector('.wizard-modal');
        if (modal && !modal.className.match(/wizard-modal--step\d/)) {
          modal.classList.add('wizard-modal--step' + this.currentStep);
        }
        this.overlay.classList.add('modal-overlay--open');
      }
    },

    /**
     * Two flows:
     *  - 'full': the classic 7-step wizard, opened from the "From existing" split-button.
     *  - 'skip-first': the site-row "Index" entry point — step 1 (New Program details)
     *    is hidden and the remaining 6 steps are renumbered 1–6 on the fly.
     */
    setMode: function(mode) {
      this.mode = mode;
      var step1 = this.overlay.querySelector('.wizard-step[data-step="1"]');
      if (step1) step1.hidden = (mode === 'skip-first');
      // Renumber the visible badges so they read 1..N regardless of mode.
      var visible = this.overlay.querySelectorAll('.wizard-step:not([hidden])');
      visible.forEach(function(s, i) {
        var badge = s.querySelector('.wizard-step__badge');
        if (badge) badge.textContent = String(i + 1);
      });
      this.currentStep = (mode === 'skip-first') ? 2 : 1;
      this.goToStep(this.currentStep);
    },

    close: function() {
      if (this.overlay) this.overlay.classList.remove('modal-overlay--open');
    },

    /**
     * Minimize the wizard into a bottom-center drawer. Any running progress
     * (step 7) keeps going in the background; drawer text reflects the
     * program being created.
     */
    minimize: function() {
      var drawer = document.getElementById('wizard-mini-drawer');
      if (!drawer || !this.overlay) return;
      var codeInput = this.overlay.querySelector('#wizard-program-code');
      var sourceSel = this.overlay.querySelector('#wizard-source-program');
      var code = (codeInput && codeInput.value.trim()) || 'D52';
      var source = 'EX01';
      if (sourceSel && sourceSel.selectedIndex >= 0) {
        var opt = sourceSel.options[sourceSel.selectedIndex];
        if (opt && opt.value) source = opt.textContent.trim();
      }
      var textEl = drawer.querySelector('[data-mini-text]');
      if (textEl) textEl.textContent = 'Creation of exhibition ' + code + ' based on ' + source + ' is in progress.';
      this.overlay.classList.remove('modal-overlay--open');
      drawer.hidden = false;
    },

    restore: function() {
      var drawer = document.getElementById('wizard-mini-drawer');
      if (drawer) drawer.hidden = true;
      if (this.overlay) this.overlay.classList.add('modal-overlay--open');
    },

    next: function() {
      if (this.currentStep >= this.totalSteps) return;
      var target = this.currentStep + 1;
      this.goToStep(target);
      if (target === 7) this.runIndexing();
    },

    /**
     * Step 7 flow: animate the progress bar to 100% over ~8s, put the
     * primary button in loading state, then commit the new program to the
     * listing, close the modal, and show a top-center MDS toast.
     */
    runIndexing: function() {
      var self = this;
      var fill = this.overlay.querySelector('[data-progress-fill]');
      var valueEl = this.overlay.querySelector('[data-progress-value]');
      var addBtn = this.overlay.querySelector('#wizard-next-btn');
      var cancelBtn = this.overlay.querySelector('#wizard-cancel-btn');
      var backBtn = this.overlay.querySelector('#wizard-back-btn');

      if (addBtn) { addBtn.classList.add('is-loading'); addBtn.disabled = true; }
      if (cancelBtn) cancelBtn.disabled = true;
      if (backBtn) backBtn.disabled = true;

      var duration = 8000;
      var start = performance.now();
      function tick(now) {
        var pct = Math.min(100, ((now - start) / duration) * 100);
        if (fill) fill.style.width = pct + '%';
        if (valueEl) valueEl.textContent = Math.floor(pct) + '%';
        if (pct < 100) {
          requestAnimationFrame(tick);
        } else {
          self.finishIndexing();
        }
      }
      requestAnimationFrame(tick);
    },

    finishIndexing: function() {
      var codeInput = this.overlay.querySelector('#wizard-program-code');
      var nameInput = this.overlay.querySelector('#wizard-program-name');
      var adminInput = this.overlay.querySelector('#wizard-program-admin');
      var code = (codeInput && codeInput.value.trim()) || 'D52';
      var name = (nameInput && nameInput.value.trim()) || '';
      var admin = (adminInput && adminInput.value.trim()) || 'Isaac Newton';

      if (window.ProgramsData && window.ProgramsData.add) {
        window.ProgramsData.add({
          code: code,
          name: name,
          admin: admin,
          lastUpdate: '27 Jul 2026',
          favorite: false,
          sites: []
        });
      }
      if (window.TableRenderer) window.TableRenderer.render();
      // Re-attach listing behaviors that depend on the table body's contents.
      if (window.TableSort) window.TableSort.init();
      if (window.RowExpander) window.RowExpander.init();
      if (window.Favorites) window.Favorites.init();
      if (window.ActionButtons) window.ActionButtons.init();

      this.close();
      var drawer = document.getElementById('wizard-mini-drawer');
      if (drawer) drawer.hidden = true;
      this.resetAfterCommit();

      if (typeof window.showNotification === 'function') {
        window.showNotification('success', 'Exhibition ' + code + ' has been added.');
      }
    },

    /**
     * Restore the wizard to step 1 so the next open starts fresh, and clear
     * any lingering loading state on the footer buttons.
     */
    resetAfterCommit: function() {
      var addBtn = this.overlay.querySelector('#wizard-next-btn');
      var cancelBtn = this.overlay.querySelector('#wizard-cancel-btn');
      var backBtn = this.overlay.querySelector('#wizard-back-btn');
      if (addBtn) { addBtn.classList.remove('is-loading'); addBtn.disabled = false; }
      if (cancelBtn) cancelBtn.disabled = false;
      if (backBtn) backBtn.disabled = false;
      var fill = this.overlay.querySelector('[data-progress-fill]');
      var valueEl = this.overlay.querySelector('[data-progress-value]');
      if (fill) fill.style.width = '0%';
      if (valueEl) valueEl.textContent = '0%';
      this.goToStep((this.mode === 'skip-first') ? 2 : 1);
    },

    back: function() {
      var minStep = (this.mode === 'skip-first') ? 2 : 1;
      if (this.currentStep <= minStep) return;
      this.goToStep(this.currentStep - 1);
    },

    goToStep: function(step) {
      if (!this.overlay) return;
      this.overlay.querySelectorAll('[data-step-panel]').forEach(function(p) {
        p.classList.toggle('wizard-step-panel--active', +p.dataset.stepPanel === step);
      });
      this.overlay.querySelectorAll('.wizard-step').forEach(function(s) {
        var n = +s.dataset.step;
        s.classList.toggle('wizard-step--complete', n < step);
        s.classList.toggle('wizard-step--active', n === step);
      });
      var modal = this.overlay.querySelector('.wizard-modal');
      if (modal) {
        for (var i = 1; i <= this.totalSteps; i++) {
          modal.classList.remove('wizard-modal--step' + i);
        }
        modal.classList.add('wizard-modal--step' + step);
      }
      var title = this.overlay.querySelector('[data-wizard-title]');
      if (title) {
        title.textContent = (this.mode === 'skip-first')
          ? 'Index'
          : (this.stepTitles[step] || 'Add Exhibition from existing');
      }
      var nextBtn = this.overlay.querySelector('#wizard-next-btn');
      if (nextBtn) nextBtn.textContent = (step === 6 || step === 7) ? 'Add' : 'Next';
      this.currentStep = step;
      var body = this.overlay.querySelector('.wizard-modal__body');
      if (body) body.scrollTop = 0;
      this.updateNextButton();
      this.updateFooterState();
    },

    /**
     * Show/hide the back arrow and selection counters based on the current step.
     * Back appears on step 2+; counters only on step 3.
     */
    updateFooterState: function() {
      var back = this.overlay.querySelector('#wizard-back-btn');
      var counters = this.overlay.querySelector('[data-wizard-counters]');
      var linesEl = this.overlay.querySelector('[data-lines-count]');
      var stationsEl = this.overlay.querySelector('[data-stations-count]');
      var itemsEl = this.overlay.querySelector('[data-items-count]');

      if (back) back.hidden = this.currentStep <= ((this.mode === 'skip-first') ? 2 : 1);
      if (counters) counters.hidden = this.currentStep !== 3 && this.currentStep !== 4 && this.currentStep !== 5;
      if (linesEl) linesEl.hidden = this.currentStep !== 3;
      if (stationsEl) stationsEl.hidden = this.currentStep !== 3;
      if (itemsEl) itemsEl.hidden = this.currentStep !== 4 && this.currentStep !== 5;
      if (itemsEl && this.currentStep === 5) this.updateStep5Counter();
      if (itemsEl && this.currentStep === 4) this.updateStep4Counter();
    },

    /**
     * Enable/disable the Next button based on the current step's requirements.
     * Step 2: all 4 source selects must have a value AND at least one checkbox checked.
     * Other steps: enabled (no validation defined yet).
     */
    updateNextButton: function() {
      var nextBtn = this.overlay && this.overlay.querySelector('#wizard-next-btn');
      if (!nextBtn) return;
      var valid = true;
      if (this.currentStep === 2) {
        var panel = this.overlay.querySelector('[data-step-panel="2"]');
        if (panel) {
          var selects = panel.querySelectorAll('.wizard-source-form select');
          var allSelected = Array.prototype.every.call(selects, function(s) { return !!s.value; });
          var anyChecked = !!panel.querySelector('.checkbox__input:checked');
          valid = allSelected && anyChecked;
        }
      }
      nextBtn.disabled = !valid;
    },

    /**
     * Wire change listeners inside step 2 so the Next button reacts live.
     */
    initStep2Validation: function() {
      var panel = this.overlay.querySelector('[data-step-panel="2"]');
      if (!panel) return;
      var self = this;
      panel.addEventListener('change', function(e) {
        if (e.target.matches('select, .checkbox__input')) {
          self.updateNextButton();
        }
      });
    },

    /**
     * Step 3: chevron expand/collapse for line rows + live selection counters.
     */
    initStep3: function() {
      var panel = this.overlay.querySelector('[data-step-panel="3"]');
      if (!panel) return;
      var self = this;

      panel.addEventListener('click', function(e) {
        var chev = e.target.closest('[data-chevron]');
        if (!chev) return;
        var row = chev.closest('.wizard-lines__row');
        if (!row) return;
        var line = row.getAttribute('data-line');
        var nested = panel.querySelector('[data-nested-for="' + line + '"]');
        var isOpen = chev.classList.toggle('wizard-line-chevron--open');
        row.classList.toggle('wizard-lines__row--expanded', isOpen);
        if (nested) {
          nested.style.display = isOpen ? '' : 'none';
        } else if (isOpen) {
          // No stations data for this line yet — collapse the visual state.
          chev.classList.remove('wizard-line-chevron--open');
          row.classList.remove('wizard-lines__row--expanded');
        }
      });

      panel.addEventListener('change', function(e) {
        if (e.target.matches('.checkbox__input')) self.updateStep3Counters();
      });

      // Hide nested rows for lines that aren't initially expanded.
      panel.querySelectorAll('.wizard-lines__nested').forEach(function(n) {
        var line = n.getAttribute('data-nested-for');
        var row = panel.querySelector('.wizard-lines__row[data-line="' + line + '"]');
        if (!row || !row.classList.contains('wizard-lines__row--expanded')) {
          n.style.display = 'none';
        }
      });

      // Zebra striping — alternate class per line row (skips nested rows).
      panel.querySelectorAll('.wizard-lines__row').forEach(function(row, i) {
        row.classList.add(i % 2 === 0 ? 'wizard-lines__row--odd' : 'wizard-lines__row--even');
      });

      this.updateStep3Counters();
    },

    updateStep3Counters: function() {
      var panel = this.overlay.querySelector('[data-step-panel="3"]');
      if (!panel) return;
      var lineCount = panel.querySelectorAll('[data-line-checkbox]:checked').length;
      var stationCount = panel.querySelectorAll('.wizard-stations tbody .checkbox__input:checked').length;
      var linesEl = this.overlay.querySelector('[data-lines-count]');
      var stationsEl = this.overlay.querySelector('[data-stations-count]');
      if (linesEl) linesEl.textContent = lineCount + ' assembly areas selected';
      if (stationsEl) stationsEl.textContent = stationCount + ' workstations selected';
    },

    /**
     * Step 4 — Equipment: bulk mark all as retrofit/carry-over + live items counter.
     */
    initStep4: function() {
      var panel = this.overlay.querySelector('[data-step-panel="4"]');
      if (!panel) return;
      var self = this;

      panel.addEventListener('click', function(e) {
        var mark = e.target.closest('[data-mark-all]');
        if (!mark) return;
        e.preventDefault();
        var value = mark.getAttribute('data-mark-all');
        panel.querySelectorAll('.wizard-revision').forEach(function(sel) {
          sel.value = value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      panel.addEventListener('change', function(e) {
        if (e.target.matches('[data-equip-checkbox]')) self.updateStep4Counter();
      });

      this.updateStep4Counter();
    },

    updateStep4Counter: function() {
      var panel = this.overlay.querySelector('[data-step-panel="4"]');
      if (!panel) return;
      var count = panel.querySelectorAll('[data-equip-checkbox]:checked').length;
      var el = this.overlay.querySelector('[data-items-count]');
      if (el && this.currentStep === 4) el.textContent = count + ' items selected';
    },

    /**
     * Step 5 — Consumable: live items counter.
     */
    initStep5: function() {
      var panel = this.overlay.querySelector('[data-step-panel="5"]');
      if (!panel) return;
      var self = this;
      panel.addEventListener('change', function(e) {
        if (e.target.matches('[data-cons-checkbox]')) self.updateStep5Counter();
      });
      this.updateStep5Counter();
    },

    updateStep5Counter: function() {
      var panel = this.overlay.querySelector('[data-step-panel="5"]');
      if (!panel) return;
      var count = panel.querySelectorAll('[data-cons-checkbox]:checked').length;
      var el = this.overlay.querySelector('[data-items-count]');
      if (el && this.currentStep === 5) el.textContent = count + ' items selected';
    },

    /**
     * "Select all" link toggles every checkbox in the same panel.
     */
    initSelectAll: function() {
      var self = this;
      var link = this.overlay.querySelector('[data-select-all]');
      if (!link) return;
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var panel = link.closest('.wizard-step-panel');
        if (!panel) return;
        var boxes = panel.querySelectorAll('.checkbox__input');
        var allChecked = Array.prototype.every.call(boxes, function(b) { return b.checked; });
        boxes.forEach(function(b) { b.checked = !allChecked; });
        link.textContent = allChecked ? 'Select all' : 'Deselect all';
        self.updateNextButton();
      });
    }
  };
})();
