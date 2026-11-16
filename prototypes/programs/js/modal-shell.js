/**
 * Modal Shell
 * Shared renderer for the standard modal overlay shell (overlay + modal + header + body + footer).
 * Each consumer passes its own ids, title, body HTML (as a string), and footer HTML (as a string).
 * Body/footer typically come from <script type="text/html"> fragments in the page so the markup
 * stays declarative.
 * Idempotent: safe to call more than once with the same modalId.
 */

(function() {
  'use strict';

  window.ModalShell = {
    render: function(params) {
      var mount = document.getElementById('modals-mount');
      var tplEl = document.getElementById('modal-shell-template');
      if (!mount || !tplEl || typeof Handlebars === 'undefined') return;
      if (document.getElementById(params.modalId)) return;
      var tpl = Handlebars.compile(tplEl.innerHTML);
      var holder = document.createElement('template');
      holder.innerHTML = tpl(params).trim();
      Array.prototype.forEach.call(holder.content.children, function(node) {
        mount.appendChild(node);
      });
    },

    bodyFrom: function(id) {
      var el = document.getElementById(id);
      return el ? el.innerHTML : '';
    }
  };
})();
