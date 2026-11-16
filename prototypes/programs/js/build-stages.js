/**
 * Build Stages Module
 * Handles build stage navigation and rendering
 */

(function() {
  'use strict';
  
  window.BuildStages = {
    currentBuild: 'Installation',
    mpTarget: 'Installation',

    /**
     * Initialize and render build stages
     */
    init: function() {
      // Per-program default stage overrides. EX02 opens in Pre P1 because its
      // Process Flow / Equipment / Consumables tabs are intentionally empty.
      try {
        var code = (new URLSearchParams(window.location.search).get('code') || '').toUpperCase();
        var defaults = { 'EX02': 'Planning' };
        if (defaults[code]) this.currentBuild = defaults[code];
      } catch (e) {}
      this.render();
    },
    
    /**
     * Render build stages
     */
    render: function() {
      const container = document.getElementById('build-stages');
      if (!container) return;
      
      container.innerHTML = '';

      const buildStages = window.DetailData.getBuildStages();
      var activeIdx = -1;
      for (var i = 0; i < buildStages.length; i++) {
        if (buildStages[i].id === this.currentBuild) { activeIdx = i; break; }
      }

      buildStages.forEach((stage, i) => {
        if (i > 0) {
          var line = document.createElement('div');
          line.className = 'build-stage__connector';
          if (i <= activeIdx) line.classList.add('build-stage__connector--active');
          container.appendChild(line);
        }

        var stageEl = document.createElement('div');
        stageEl.className = 'build-stage';
        var isActive = stage.id === this.currentBuild;
        var isPast = i < activeIdx;
        if (isActive) stageEl.classList.add('build-stage--active');
        if (isPast) stageEl.classList.add('build-stage--completed');

        var circleClass = 'build-stage__circle';
        if (isActive) circleClass += ' build-stage__circle--active';
        if (isPast) circleClass += ' build-stage__circle--completed';

        var circleContent = '';
        if (isActive) {
          circleContent = '<lucide-icon name="check" style="font-size:8px;color:#fff"></lucide-icon>';
        } else if (isPast) {
          circleContent = '<div class="build-stage__dot"></div>';
        }

        stageEl.innerHTML =
          '<div class="build-stage__label">' + stage.id + '</div>' +
          '<div class="build-stage__circle-wrapper">' +
            '<div class="build-stage__line"></div>' +
            '<div class="' + circleClass + '">' + circleContent + '</div>' +
          '</div>' +
          '<div class="build-stage__sublabel">' + stage.date + '</div>';

        stageEl.addEventListener('click', () => {
          this.currentBuild = stage.id;
          this.render();
        });

        container.appendChild(stageEl);
      });
    },
    
    /**
     * Get current build
     */
    getCurrentBuild: function() {
      return this.currentBuild;
    },

    /**
     * Get the MP mirror target (build stage id) or null if unassigned.
     */
    getMpTarget: function() {
      return this.mpTarget;
    },

    /**
     * Set the MP mirror target. Pass null to clear.
     */
    setMpTarget: function(stageId) {
      this.mpTarget = stageId || null;
    }
  };
})();
