/* proj-station-settings-drawer.js */
/* Plugin component: Station Settings Drawer                          */
/* Mounts the drawer on first open into <body>, wires close/backdrop/ */
/* Escape/history-toggle/dropzone. Update Station is a stub — real    */
/* persistence is out of scope for the mock.                          */

(function() {
  'use strict';

  var TEMPLATE_ID = 'proj-station-settings-drawer-template';
  var MOUNT_ID = 'proj-station-settings-drawer-mount';

  function template() {
    return (
      '<div class="drawer-overlay proj-station-settings-drawer" id="' + MOUNT_ID + '">' +
        '<div class="drawer drawer--left drawer--medium">' +
          '<div class="drawer__header proj-station-settings-drawer__header">' +
            '<button class="drawer__close" data-station-settings="close" aria-label="Close">' +
              '<lucide-icon name="xmark"></lucide-icon>' +
            '</button>' +
            '<a href="#" class="proj-station-settings-drawer__step-link" data-station-settings="process-step">' +
              '<lucide-icon name="info.circle"></lucide-icon>' +
              '<span>Process Step</span>' +
              '<lucide-icon name="chevron.right"></lucide-icon>' +
            '</a>' +
          '</div>' +
          '<div class="drawer__body proj-station-settings-drawer__body">' +
            '<h2 class="proj-station-settings-drawer__title">Update Station</h2>' +

            '<div class="form-group form-group--medium">' +
              '<label class="form-label" for="proj-station-settings-name">Station Name</label>' +
              '<input type="text" id="proj-station-settings-name" class="form-input" value="">' +
            '</div>' +

            '<hr class="proj-station-settings-drawer__sep">' +

            '<div class="proj-station-settings-drawer__row">' +
              '<div class="form-group form-group--medium">' +
                '<label class="form-label" for="proj-station-settings-keypart">Key Part (Optional)</label>' +
                '<select id="proj-station-settings-keypart" class="form-select form-select--stylized" data-stylized-empty="true" data-empty-title="No key parts available" data-empty-subtitle="">' +
                  '<option value="">Type custom key part</option>' +
                '</select>' +
              '</div>' +
              '<button type="button" class="proj-station-settings-drawer__info" aria-label="Key Part info">' +
                '<lucide-icon name="info.circle"></lucide-icon>' +
              '</button>' +
            '</div>' +

            '<hr class="proj-station-settings-drawer__sep">' +

            '<div class="form-group form-group--medium">' +
              '<label class="form-label" for="proj-station-settings-dept">Department</label>' +
              '<select id="proj-station-settings-dept" class="form-select form-select--stylized">' +
                '<option value="DFM">DFM</option>' +
                '<option value="AE">AE</option>' +
                '<option value="ME">ME</option>' +
                '<option value="TE">TE</option>' +
              '</select>' +
            '</div>' +

            '<div class="form-group form-group--medium">' +
              '<label class="form-label" for="proj-station-settings-cm-dept">CM Department (Optional)</label>' +
              '<select id="proj-station-settings-cm-dept" class="form-select form-select--stylized" data-stylized-empty="true" data-empty-title="No CM departments available" data-empty-subtitle="">' +
                '<option value="">Type custom cm department</option>' +
              '</select>' +
            '</div>' +

            '<div class="form-group form-group--medium">' +
              '<label class="form-label" for="proj-station-settings-eng-intent">ENG Intent</label>' +
              '<select id="proj-station-settings-eng-intent" class="form-select form-select--stylized">' +
                '<option value="POR">POR</option>' +
                '<option value="DOE">DOE</option>' +
                '<option value="MP Evaluation">MP Evaluation</option>' +
              '</select>' +
            '</div>' +

            '<div class="form-group form-group--medium">' +
              '<label class="form-label" for="proj-station-settings-mp-intent">MP Intent</label>' +
              '<select id="proj-station-settings-mp-intent" class="form-select form-select--stylized">' +
                '<option value="POR">POR</option>' +
                '<option value="DOE">DOE</option>' +
                '<option value="MP Evaluation">MP Evaluation</option>' +
              '</select>' +
            '</div>' +

            '<hr class="proj-station-settings-drawer__sep">' +

            '<div class="proj-station-settings-drawer__row">' +
              '<div class="form-group form-group--medium">' +
                '<label class="form-label" for="proj-station-settings-reporting">Reporting Method (Optional)</label>' +
                '<select id="proj-station-settings-reporting" class="form-select form-select--stylized">' +
                  '<option value="Non-reporting">Non-reporting</option>' +
                  '<option value="Reporting">Reporting</option>' +
                '</select>' +
              '</div>' +
              '<button type="button" class="proj-station-settings-drawer__clear" data-station-settings="clear-reporting" aria-label="Clear reporting method">' +
                '<lucide-icon name="xmark"></lucide-icon>' +
              '</button>' +
            '</div>' +

            '<hr class="proj-station-settings-drawer__sep">' +

            '<div class="form-group form-group--medium">' +
              '<label class="form-label" for="proj-station-settings-env">Environment (Optional)</label>' +
              '<select id="proj-station-settings-env" class="form-select form-select--stylized" data-stylized-empty="true" data-empty-title="No environments available" data-empty-subtitle="">' +
                '<option value="">Type custom environment</option>' +
              '</select>' +
            '</div>' +

            '<hr class="proj-station-settings-drawer__sep">' +

            '<p class="proj-station-settings-drawer__sop-label">SOP file upload (Optional):</p>' +
            '<div class="proj-station-settings-drawer__dropzone" data-station-settings="dropzone">' +
              '<lucide-icon name="square.and.arrow.up"></lucide-icon>' +
              '<span>Drag and drop a file (.png, .jpeg or .pdf) here or</span>' +
              '<button type="button" class="btn btn--link btn--medium" data-station-settings="browse">browse</button>' +
            '</div>' +

            '<div class="proj-station-settings-drawer__history" data-history-open="true">' +
              '<button type="button" class="proj-station-settings-drawer__history-toggle" data-station-settings="toggle-history">' +
                '<lucide-icon name="chevron.up"></lucide-icon>' +
                '<span>Upload history</span>' +
              '</button>' +
              '<ul class="proj-station-settings-drawer__history-list">' +
                '<li class="proj-station-settings-drawer__history-item">' +
                  '<div class="proj-station-settings-drawer__history-body">' +
                    '<a href="#" class="proj-station-settings-drawer__history-name">JSON Schemas.png</a>' +
                    '<p class="proj-station-settings-drawer__history-meta">Uploaded by Johnny Appleseed on 09/04/2026</p>' +
                  '</div>' +
                  '<button type="button" class="proj-station-settings-drawer__history-download" aria-label="Download file">' +
                    '<lucide-icon name="square.and.arrow.down"></lucide-icon>' +
                  '</button>' +
                '</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +

          '<div class="drawer__footer proj-station-settings-drawer__footer">' +
            '<button class="btn btn--secondary btn--medium" data-station-settings="close">Cancel</button>' +
            '<button class="btn btn--primary btn--medium" data-station-settings="save">Update Station</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function ensureMounted() {
    var existing = document.getElementById(MOUNT_ID);
    if (existing) return existing;

    var wrap = document.createElement('div');
    wrap.innerHTML = template();
    var el = wrap.firstChild;
    document.body.appendChild(el);
    attachHandlers(el);
    /* MDS auto-inits form-select--stylized on DOMContentLoaded and on
     * davinci:canvas:ready. Because this drawer is mounted lazily (well after
     * both events fired), the freshly-inserted <select> elements never get the
     * MDS custom panel and fall through to the native browser dropdown.
     * Re-dispatching davinci:canvas:ready is idempotent (MDS guards each init
     * with :not([data-stylized-init])) so already-initialized selects stay put. */
    document.dispatchEvent(new CustomEvent('davinci:canvas:ready'));
    return el;
  }

  function attachHandlers(el) {
    el.addEventListener('click', function(e) {
      var action = e.target.closest('[data-station-settings]');
      if (action) {
        var kind = action.getAttribute('data-station-settings');
        if (kind === 'close') { close(); return; }
        if (kind === 'save') {
          /* Bubble up the edited values so the host prototype can persist and
           * re-render. The drawer stays purely presentational — it does not
           * mutate DetailData or repaint the L2 row itself. */
          var nameInput = el.querySelector('#proj-station-settings-name');
          var stationName = nameInput ? nameInput.value.trim() : '';
          document.dispatchEvent(new CustomEvent('davinci:station-settings:save', {
            detail: {
              stationId: el.getAttribute('data-station-id') || '',
              lineId: el.getAttribute('data-line-id') || '',
              stationName: stationName
            }
          }));
          close();
          return;
        }
        if (kind === 'process-step') { e.preventDefault(); return; }
        if (kind === 'browse') { e.preventDefault(); return; }
        if (kind === 'clear-reporting') {
          var sel = el.querySelector('#proj-station-settings-reporting');
          if (sel) { sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); }
          return;
        }
        if (kind === 'toggle-history') {
          var host = action.closest('.proj-station-settings-drawer__history');
          if (host) host.setAttribute('data-history-open', host.getAttribute('data-history-open') === 'true' ? 'false' : 'true');
          return;
        }
        if (kind === 'dropzone') { return; }
      }
      /* Backdrop click — only when the overlay itself is clicked, not the drawer content. */
      if (e.target === el) close();
    });

    /* Dropzone visual feedback only (no real upload in the mock). */
    var dz = el.querySelector('[data-station-settings="dropzone"]');
    if (dz) {
      ['dragenter', 'dragover'].forEach(function(evt) {
        dz.addEventListener(evt, function(e) { e.preventDefault(); dz.classList.add('is-drag-over'); });
      });
      ['dragleave', 'drop'].forEach(function(evt) {
        dz.addEventListener(evt, function(e) { e.preventDefault(); dz.classList.remove('is-drag-over'); });
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && el.classList.contains('drawer-overlay--open')) close();
    });
  }

  function open(opts) {
    opts = opts || {};
    var el = ensureMounted();
    var nameInput = el.querySelector('#proj-station-settings-name');
    if (nameInput) nameInput.value = opts.stationName || '';
    if (opts.stationId) el.setAttribute('data-station-id', opts.stationId);
    if (opts.lineId) el.setAttribute('data-line-id', opts.lineId);
    el.classList.add('drawer-overlay--open');
    if (nameInput) { try { nameInput.focus(); nameInput.select(); } catch (err) { /* noop */ } }
  }

  function close() {
    var el = document.getElementById(MOUNT_ID);
    if (el) el.classList.remove('drawer-overlay--open');
  }

  window.ProjStationSettingsDrawer = {
    init: function() { /* lazy — no-op until first open() */ },
    open: open,
    close: close
  };
})();
