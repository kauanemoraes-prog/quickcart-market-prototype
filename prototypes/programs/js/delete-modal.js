/**
 * Delete Confirmation Modal
 * Shared renderer for the standard delete-confirmation modal.
 * Each consumer passes its own ids + body copy; the markup is one template.
 * Idempotent: safe to call more than once with the same modalId.
 */

(function() {
  'use strict';

  window.DeleteModal = {
    render: function(params) {
      var mount = document.getElementById('modals-mount');
      var tplEl = document.getElementById('delete-confirmation-modal-template');
      if (!mount || !tplEl || typeof Handlebars === 'undefined') return;
      if (document.getElementById(params.modalId)) return;
      var tpl = Handlebars.compile(tplEl.innerHTML);
      var holder = document.createElement('template');
      holder.innerHTML = tpl(params).trim();
      Array.prototype.forEach.call(holder.content.children, function(node) {
        mount.appendChild(node);
      });
    }
  };
})();
