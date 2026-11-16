/**
 * ProjProgressDrawer — bottom-anchored progress drawer for long-running
 * operations. Non-dismissible while running; auto-removes after `duration`.
 *
 * API: window.ProjProgressDrawer.show(config)
 *   config.message    {string}   Top-row message
 *   config.steps      {string[]} Step labels (each shown for duration/steps.length)
 *   config.duration   {number}   Total ms (default 5000)
 *   config.onComplete {function} Called after slide-out animation finishes
 */
(function() {
  'use strict';

  function build(message) {
    var root = document.createElement('div');
    root.className = 'proj-progress-drawer';
    root.innerHTML =
      '<div class="proj-progress-drawer__top">' +
        '<span class="proj-progress-drawer__spinner"></span>' +
        '<span class="proj-progress-drawer__message"></span>' +
        '<svg class="proj-progress-drawer__chevron" width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 7.5L7 1.5L13 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div>' +
      '<div class="proj-progress-drawer__bottom">' +
        '<span class="proj-progress-drawer__step-label"></span>' +
        '<div class="proj-progress-drawer__bar"><div class="proj-progress-drawer__bar-fill"></div></div>' +
        '<span class="proj-progress-drawer__step-counter"></span>' +
      '</div>';
    root.querySelector('.proj-progress-drawer__message').textContent = message || '';
    return root;
  }

  function show(config) {
    config = config || {};
    var steps = (config.steps && config.steps.length) ? config.steps : ['Working'];
    var duration = typeof config.duration === 'number' ? config.duration : 5000;
    var stepDuration = duration / steps.length;
    var onComplete = config.onComplete;

    document.querySelectorAll('.proj-progress-drawer').forEach(function(el) { el.remove(); });

    var root = build(config.message);
    document.body.appendChild(root);

    var labelEl = root.querySelector('.proj-progress-drawer__step-label');
    var counterEl = root.querySelector('.proj-progress-drawer__step-counter');
    var fillEl = root.querySelector('.proj-progress-drawer__bar-fill');

    function showStep(i) {
      labelEl.textContent = steps[i];
      counterEl.textContent = (i + 1) + '/' + steps.length;
    }
    showStep(0);

    requestAnimationFrame(function() {
      root.classList.add('proj-progress-drawer--open');
      fillEl.style.transition = 'width ' + duration + 'ms linear';
      fillEl.style.width = '100%';
    });

    var current = 1;
    var stepTimer = null;
    if (steps.length > 1) {
      stepTimer = setInterval(function() {
        if (current >= steps.length) {
          clearInterval(stepTimer);
          return;
        }
        showStep(current);
        current++;
      }, stepDuration);
    }

    setTimeout(function() {
      if (stepTimer) clearInterval(stepTimer);
      root.classList.remove('proj-progress-drawer--open');
      setTimeout(function() {
        root.remove();
        if (typeof onComplete === 'function') onComplete();
      }, 300);
    }, duration);
  }

  window.ProjProgressDrawer = {
    show: show
  };
})();
