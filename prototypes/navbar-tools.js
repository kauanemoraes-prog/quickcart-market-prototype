/**
 * Navbar tools
 * The Dark mode button of the top bar (to the left of the AI Assistant button) switches the dark mode of the page, the same
 * switch the toolbar on the right had. The moon shows in the light mode and the sun in the dark mode (see shared-chrome.css).
 */

(function() {
  'use strict';

  // The toolbar on the right: a badge with the number of people editing on the People item, and the Full screen item
  function badge() {
    document.querySelectorAll('.proj-right-toolbar__item[data-item-id="people"] .proj-right-toolbar__item-icon').forEach(function(icon) {
      if (icon.querySelector('.bn-rt-badge')) return;
      var b = document.createElement('span');
      b.className = 'bn-rt-badge';
      b.textContent = '3';
      icon.appendChild(b);
    });
  }
  new MutationObserver(badge).observe(document.documentElement, { childList: true, subtree: true });
  badge();


  // Tooltips on the buttons of the top bar: the native title is slow and unstyled, so the text moves to the project tooltip
  // (the original is kept in data-bn-title, which the styles and scripts match like the title).
  var TIPS = { 'Dark mode': 'Dark mode', 'Help': 'Help', 'Smart Assistant': 'AI Assistant' };
  function tooltips() {
    Object.keys(TIPS).forEach(function(name) {
      document.querySelectorAll('button[title="' + name + '"]').forEach(function(b) {
        b.setAttribute('data-bn-title', name);
        b.setAttribute('data-proj-tooltip', TIPS[name]);
        b.setAttribute('data-proj-tooltip-placement', 'bottom');
        if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', name === 'Smart Assistant' ? 'AI Assistant' : name);
        b.removeAttribute('title');
      });
    });
  }
  new MutationObserver(tooltips).observe(document.documentElement, { childList: true, subtree: true });
  tooltips();

  // Drawers open over the navbar but under the ribbon "You are previewing a Prototype": they start at the top of the navbar.
  // The height depends on the ribbon (it can collapse), so it is measured and kept in --drawer-top.
  function drawerTop() {
    var bar = document.querySelector('.top-navbar');
    // Where the navbar ends: the sticky page headers stick right under it (the pages that do not load sticky-tables.js need it too)
    if (bar) document.documentElement.style.setProperty('--nav-bottom', Math.round(bar.getBoundingClientRect().bottom) + 'px');
    // Where the store header (City, Store and the tabs) ends: bars that stay in view under it stick there
    var dh = document.querySelector('.program-detail-header');
    if (bar) document.documentElement.style.setProperty('--detail-bottom', Math.round(bar.getBoundingClientRect().bottom + (dh ? dh.offsetHeight : 0)) + 'px');
    document.documentElement.style.setProperty('--drawer-top', bar ? Math.max(0, Math.round(bar.getBoundingClientRect().top)) + 'px' : '0px');
  }
  var watched = null;
  function watchBar() {
    var bar = document.querySelector('.top-navbar');
    if (!bar || bar === watched) return;
    watched = bar;
    drawerTop();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(drawerTop);
      ro.observe(bar);
      var header = bar.closest('header') || bar.parentNode;
      if (header) ro.observe(header);
    }
  }
  new MutationObserver(watchBar).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', drawerTop);
  window.addEventListener('scroll', drawerTop, { passive: true });
  document.addEventListener('click', function() { setTimeout(drawerTop, 250); });   // the ribbon collapses with a click on its tab
  watchBar();

  // The chevron of the user menu is a Lucide icon in the dark text colour (the system one is drawn in white and is lost on the white pill)
  function userChevron() {
    document.querySelectorAll('.top-navbar__user-menu .nav-menu__chevron').forEach(function(c) {
      if (c.querySelector('lucide-icon')) return;
      c.innerHTML = '<lucide-icon name="chevron-down" style="font-size:16px"></lucide-icon>';
    });
  }
  new MutationObserver(userChevron).observe(document.documentElement, { childList: true, subtree: true });
  userChevron();


  // Full screen: a button of the top bar, to the left of the dark mode button (it used to be in the toolbar on the right)
  function fullButton() {
    var actions = document.querySelector('.top-navbar__actions');
    if (!actions || actions.querySelector('.bn-full')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bn-full';
    b.style.cssText = 'width:3.2rem;height:3.2rem;padding:0;border:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.8rem;';
    b.setAttribute('aria-label', 'Full screen');
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('data-proj-tooltip', 'Full screen');
    b.setAttribute('data-proj-tooltip-placement', 'bottom');
    b.innerHTML = '<lucide-icon name="maximize-2"></lucide-icon>';
    actions.insertBefore(b, actions.firstChild);
  }
  function fullState() {
    var on = !!document.fullscreenElement;
    document.querySelectorAll('.bn-full').forEach(function(b) {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
      b.setAttribute('data-proj-tooltip', on ? 'Exit full screen' : 'Full screen');
      b.innerHTML = '<lucide-icon name="' + (on ? 'minimize-2' : 'maximize-2') + '"></lucide-icon>';
    });
  }
  new MutationObserver(fullButton).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('fullscreenchange', fullState);
  fullButton();

  // Help is shown as pressed while the help page is open
  function helpState() {
    var on = /help-landing-page/.test(window.location.pathname);
    document.querySelectorAll(':is(button[title="Help"], button[data-bn-title="Help"])').forEach(function(b) { if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on)); });
  }
  new MutationObserver(helpState).observe(document.documentElement, { childList: true, subtree: true });
  helpState();

  document.addEventListener('click', function(e) {
    if (e.target.closest('.proj-right-toolbar__item[data-item-id="expand"], .bn-full')) {
      if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      return;
    }
    if (!e.target.closest(':is(button[title="Dark mode"], button[data-bn-title="Dark mode"])')) return;
    if (window.ProjDarkMode && window.ProjDarkMode.toggle) window.ProjDarkMode.toggle();
    else document.documentElement.classList.toggle('dark-mode');
  });
})();
