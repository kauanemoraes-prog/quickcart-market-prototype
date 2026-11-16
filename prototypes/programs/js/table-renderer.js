/**
 * Table Renderer Module
 * Handles Handlebars template compilation and rendering
 */

(function() {
  'use strict';
  
  window.TableRenderer = {
    /**
     * Render the programs table using Handlebars template.
     * Optional predicate(program) filters which rows to render.
     */
    render: function(predicate) {
      const tableBody = document.getElementById('programs-table-body');
      const templateSource = document.getElementById('programs-table-template').innerHTML;
      const template = Handlebars.compile(templateSource);

      let programsData = window.ProgramsData.getAll();
      if (typeof predicate === 'function') {
        programsData = programsData.filter(predicate);
      }
      tableBody.innerHTML = template({ programs: programsData });
    }
  };
})();
