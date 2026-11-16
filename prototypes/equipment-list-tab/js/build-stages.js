(function() {
  'use strict';

  window.BuildStages = {
    currentBuild: 'Preparation',

    init: function() { this.render(); },

    render: function() {
      var container = document.getElementById('build-stages');
      if (!container) return;
      container.innerHTML = '';

      var stages = window.EquipData.getBuildStages();
      var activeIdx = 0;
      for (var i = 0; i < stages.length; i++) {
        if (stages[i].id === this.currentBuild) { activeIdx = i; break; }
      }

      for (var i = 0; i < stages.length; i++) {
        if (i > 0) {
          var line = document.createElement('div');
          line.className = 'build-stage__connector';
          if (i <= activeIdx) line.classList.add('build-stage__connector--active');
          container.appendChild(line);
        }

        var s = stages[i];
        var el = document.createElement('div');
        el.className = 'build-stage';
        var isActive = s.id === this.currentBuild;
        var isPast = i < activeIdx;
        if (isActive) el.classList.add('build-stage--active');
        if (isPast) el.classList.add('build-stage--completed');

        var cClass = 'build-stage__circle';
        if (isActive) cClass += ' build-stage__circle--active';
        if (isPast) cClass += ' build-stage__circle--completed';

        var inner = '';
        if (isActive) {
          inner = '<lucide-icon name="check" style="font-size:12px;color:#fff"></lucide-icon>';
        } else if (isPast) {
          inner = '<div class="build-stage__dot"></div>';
        }

        el.innerHTML =
          '<div class="' + cClass + '">' + inner + '</div>' +
          '<div class="build-stage__label">' + s.id + '</div>' +
          '<div class="build-stage__sublabel">' + s.date + '</div>';

        var self = this;
        (function(id) {
          el.addEventListener('click', function() {
            self.currentBuild = id;
            self.render();
          });
        })(s.id);

        container.appendChild(el);
      }
    }
  };
})();
