(function() {
  'use strict';

  var buildStages = [
    { id: 'Preparation', date: '04/01/2026' },
    { id: 'Installation', date: '04/15/2026' },
    { id: 'Dismantling', date: '04/30/2026' }
  ];

  var equipmentData = [
    {
      id: 1,
      name: 'CREATE TOOLS',
      shortName: '',
      vendorDfmTotal: 2,
      vendorDfmApproved: 0,
      vendorDfmStatus: 'Approved',
      processFlowUsage: '01',
      department: 'DFM',
      category: '',
      engIntent: 'MP Evaluation',
      mpIntent: 'MP Evaluation',
      riskOpportunity: '',
      vendor: '',
      vendors: [
        { name: 'ACME Corp', enabled: true },
        { name: 'Foxconn',   enabled: true },
        { name: 'Pegatron',  enabled: true }
      ]
    },
    {
      id: 2,
      name: 'Equip 01',
      shortName: '',
      vendorDfmTotal: 1,
      vendorDfmApproved: 0,
      vendorDfmStatus: 'Approved',
      processFlowUsage: '01',
      department: 'ME',
      category: '',
      engIntent: 'POR',
      mpIntent: 'MP Evaluation',
      riskOpportunity: '',
      vendor: '',
      vendors: [
        { name: 'Wistron',   enabled: true },
        { name: 'Compal',    enabled: false }
      ]
    },
    {
      id: 3,
      name: 'test',
      shortName: '',
      vendorDfmTotal: 1,
      vendorDfmApproved: 0,
      vendorDfmStatus: 'Approved',
      processFlowUsage: '00',
      department: '',
      category: '',
      engIntent: 'MP Evaluation',
      mpIntent: 'MP Evaluation',
      riskOpportunity: '',
      vendor: '',
      vendors: [
        { name: 'Quanta',    enabled: true }
      ]
    }
  ];

  window.EquipData = {
    getBuildStages: function() { return buildStages; },
    getEquipment: function() { return equipmentData; }
  };
})();
