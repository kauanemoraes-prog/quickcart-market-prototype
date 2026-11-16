/**
 * Import Modal
 * Opens when the Import button in the tabs toolbar is clicked.
 */

(function() {
  'use strict';

  window.ImportModal = {
    init: function() {
      if (window.ModalShell) {
        window.ModalShell.render({
          modalId: 'import-modal',
          sizeClass: 'modal--medium',
          title: 'Import',
          titleId: 'import-modal-title',
          closeId: 'import-modal-close',
          bodyHtml: window.ModalShell.bodyFrom('import-modal-body'),
          footerHtml: window.ModalShell.bodyFrom('import-modal-footer')
        });
      }
      var openBtn = document.getElementById('import-btn');
      var modal = document.getElementById('import-modal');
      var cancelBtn = document.getElementById('import-modal-cancel');
      var closeBtn = document.getElementById('import-modal-close');
      if (!openBtn || !modal) return;

      function open() {
        modal.classList.add('modal-overlay--open');
        modal.setAttribute('aria-hidden', 'false');
      }

      function close() {
        modal.classList.remove('modal-overlay--open');
        modal.setAttribute('aria-hidden', 'true');
      }

      openBtn.addEventListener('click', open);
      if (cancelBtn) cancelBtn.addEventListener('click', close);
      if (closeBtn) closeBtn.addEventListener('click', close);

      modal.addEventListener('click', function(e) {
        if (e.target === modal) close();
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('modal-overlay--open')) close();
      });

      // Close when an action link is clicked (placeholder behavior)
      modal.querySelectorAll('.import-modal__link:not(.import-modal__link--disabled)').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          close();
        });
      });
    }
  };
})();
