/**
 * Publish Process Flow Wizard
 * 3-step modal: PCN → Version Notes → Publish
 */

(function() {
  'use strict';

  window.PublishWizard = {
    init: function() {
      if (window.ModalShell) {
        window.ModalShell.render({
          modalId: 'publish-wizard',
          sizeClass: 'modal--medium',
          modalClass: 'publish-wizard',
          title: 'Publish Assembly Plan',
          titleId: 'publish-wizard-title',
          closeId: 'publish-wizard-close',
          bodyHtml: window.ModalShell.bodyFrom('publish-wizard-body'),
          footerHtml: window.ModalShell.bodyFrom('publish-wizard-footer'),
          footerClass: 'publish-wizard__footer'
        });
      }
      var openBtn = document.getElementById('publish-btn');
      var wizard = document.getElementById('publish-wizard');
      if (!openBtn || !wizard) return;

      var cancelBtn = document.getElementById('publish-wizard-cancel');
      var closeBtn = document.getElementById('publish-wizard-close');
      var nextBtn = document.getElementById('publish-wizard-next');
      var backBtn = document.getElementById('publish-wizard-back');
      var verifyLink = document.getElementById('publish-wizard-verify');

      var steps = wizard.querySelectorAll('.publish-wizard__step');
      var panels = wizard.querySelectorAll('.publish-wizard__panel');

      var current = 1;
      var total = steps.length;

      function open() {
        wizard.classList.add('modal-overlay--open');
        wizard.setAttribute('aria-hidden', 'false');
        goTo(1);
      }

      function close() {
        wizard.classList.remove('modal-overlay--open');
        wizard.setAttribute('aria-hidden', 'true');
      }

      function goTo(step) {
        current = step;
        steps.forEach(function(el, idx) {
          var n = idx + 1;
          el.classList.toggle('is-active', n === step);
          el.classList.toggle('is-completed', n < step);
        });
        panels.forEach(function(panel) {
          panel.classList.toggle('is-active', parseInt(panel.dataset.panel, 10) === step);
        });

        // Footer state
        if (step === 1) {
          verifyLink.hidden = false;
          backBtn.hidden = true;
          nextBtn.textContent = 'Next';
          nextBtn.classList.remove('publish-wizard__publish--disabled');
        } else if (step === 2) {
          verifyLink.hidden = true;
          backBtn.hidden = false;
          nextBtn.textContent = 'Publish';
          nextBtn.classList.add('publish-wizard__publish--disabled');
        } else if (step === 3) {
          verifyLink.hidden = true;
          backBtn.hidden = false;
          nextBtn.textContent = 'Done';
          nextBtn.classList.remove('publish-wizard__publish--disabled');
        }
      }

      openBtn.addEventListener('click', open);

      cancelBtn.addEventListener('click', close);
      if (closeBtn) closeBtn.addEventListener('click', close);

      nextBtn.addEventListener('click', function() {
        if (current < total) {
          goTo(current + 1);
        } else {
          close();
        }
      });

      backBtn.addEventListener('click', function() {
        if (current > 1) goTo(current - 1);
      });

      // Close on backdrop click
      wizard.addEventListener('click', function(e) {
        if (e.target === wizard) close();
      });

      // Close on Escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && wizard.classList.contains('modal-overlay--open')) {
          close();
        }
      });

      // Verify link — placeholder, just closes wizard for now
      if (verifyLink) {
        verifyLink.addEventListener('click', function(e) {
          e.preventDefault();
          close();
        });
      }
    }
  };
})();
