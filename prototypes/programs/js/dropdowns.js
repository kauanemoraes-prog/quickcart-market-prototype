/**
 * Dropdowns Module
 * Handles program and site selection dropdowns
 */

(function() {
  'use strict';
  
  window.Dropdowns = {
    currentProgram: null,
    currentSite: null,
    
    /**
     * Initialize dropdowns with URL parameter
     */
    init: function() {
      // Get program code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const programCode = urlParams.get('code') || 'EX01';
      
      // Find program
      this.currentProgram = window.ProgramsData.findByCode(programCode);
      if (!this.currentProgram) {
        this.currentProgram = window.ProgramsData.getAll()[0];
      }
      
      // Pick the site from ?site=, falling back to the first one
      const siteParam = urlParams.get('site');
      this.currentSite = this.currentProgram.sites.find(s => s.site === siteParam)
        || this.currentProgram.sites[0];
      
      // Populate dropdowns
      this.populateProgramDropdown();
      this.populateSiteDropdown();
      
      // Attach event listeners
      this.attachListeners();
    },
    
    /**
     * Populate program dropdown
     */
    populateProgramDropdown: function() {
      const select = document.getElementById('program-select');
      select.innerHTML = '';
      
      const programsData = window.ProgramsData.getAll();
      programsData.forEach(program => {
        const option = document.createElement('option');
        option.value = program.code;
        option.textContent = program.name;
        if (program.code === this.currentProgram.code) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    },
    
    /**
     * Populate site dropdown
     */
    populateSiteDropdown: function() {
      const select = document.getElementById('site-select');
      select.innerHTML = '';
      
      if (this.currentProgram && this.currentProgram.sites) {
        this.currentProgram.sites.forEach(site => {
          const option = document.createElement('option');
          option.value = site.site;
          option.textContent = site.site;
          if (site.site === this.currentSite.site) {
            option.selected = true;
          }
          select.appendChild(option);
        });
      }
    },
    
    /**
     * Attach event listeners to dropdowns
     */
    attachListeners: function() {
      const programSelect = document.getElementById('program-select');
      const siteSelect = document.getElementById('site-select');
      
      programSelect.addEventListener('change', (e) => {
        const newProgram = window.ProgramsData.findByCode(e.target.value);
        if (newProgram) {
          this.currentProgram = newProgram;
          this.currentSite = newProgram.sites[0];
          this.populateSiteDropdown();
          if (window.MPTargetSelector) window.MPTargetSelector.reset();
        }
      });
      
      siteSelect.addEventListener('change', (e) => {
        const newSite = this.currentProgram.sites.find(s => s.site === e.target.value);
        if (newSite) {
          this.currentSite = newSite;
        }
      });
    },
    
    /**
     * Get current program
     */
    getCurrentProgram: function() {
      return this.currentProgram;
    },
    
    /**
     * Get current site
     */
    getCurrentSite: function() {
      return this.currentSite;
    }
  };
})();
