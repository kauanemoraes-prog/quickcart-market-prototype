/* Equipment Vendor Prototype JavaScript */

(function() {
  'use strict';
  
  function safeInit() {
    try {
      init();
    } catch (err) {
      console.error('Tools Vendor init failed:', err);
    }
  }
  
  function init() {
    console.log('Tools Vendor prototype initialized');
    
    initVendorToggle();
  }
  
  function initVendorToggle() {
    const enableToggle = document.querySelector('.vendor-enable-toggle');
    const vendorCard = document.querySelector('.vendor-card');
    const formInputs = document.querySelectorAll('.form-input');
    
    if (enableToggle && vendorCard) {
      enableToggle.addEventListener('change', function() {
        const switchLabel = enableToggle.parentElement.querySelector('.switch__label');
        
        if (enableToggle.checked) {
          vendorCard.classList.remove('disabled');
          switchLabel.textContent = 'Enabled';
          // Enable all form inputs
          formInputs.forEach(input => {
            input.disabled = false;
          });
          console.log('Vendor enabled');
        } else {
          vendorCard.classList.add('disabled');
          switchLabel.textContent = 'Disabled';
          // Disable all form inputs
          formInputs.forEach(input => {
            input.disabled = true;
          });
          console.log('Vendor disabled');
        }
      });
      
      // Set initial state
      const switchLabel = enableToggle.parentElement.querySelector('.switch__label');
      if (enableToggle.checked) {
        switchLabel.textContent = 'Enabled';
        vendorCard.classList.remove('disabled');
        formInputs.forEach(input => {
          input.disabled = false;
        });
      } else {
        switchLabel.textContent = 'Disabled';
        vendorCard.classList.add('disabled');
        formInputs.forEach(input => {
          input.disabled = true;
        });
      }
    }
  }
  
  // Event-based initialization
  if (document.readyState === 'loading') {
    document.addEventListener('davinci:canvas:ready', safeInit);
  } else {
    safeInit();
  }
})();