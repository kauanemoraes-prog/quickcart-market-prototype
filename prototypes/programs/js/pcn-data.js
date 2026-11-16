/**
 * PCN Mock Data
 * Extracted from pcn-table.js so the table module stays under the 500-line threshold.
 */

(function() {
    'use strict';

    const pcnData = [
        {
            id: 1,
            action: 'New',
            description: 'Assembly area "Assembly Area 1" added.',
            before: 'No Assembly Area 1',
            after: 'Assembly Area 1 created with 5 workstations',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-15',
            createdBy: {
                name: 'John Smith',
                initials: 'JS',
                date: 'Aug 01, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: ''
            }
        },
        {
            id: 2,
            action: 'New',
            description: 'Workstation "Welding Workstation" added to assembly area "Assembly Area 1".',
            before: 'Assembly area without welding capability',
            after: 'Welding Workstation added at position 3',
            justification: 'Required for new product variant',
            justificationFile: 'station-specs.pdf',
            neededBy: '2025-08-30',
            createdBy: {
                name: 'Sarah Johnson',
                initials: 'SJ',
                date: 'Jul 28, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Coordinate with production team'
            }
        },
        {
            id: 3,
            action: 'New',
            description: 'Process "Quality Inspection" added to Workstation X.',
            before: 'No quality check at this workstation',
            after: 'Quality Inspection process implemented',
            justification: 'Customer requirement for quality assurance',
            justificationFile: null,
            neededBy: '2025-10-01',
            createdBy: {
                name: 'Michael Chen',
                initials: 'MC',
                date: 'Aug 05, 2025'
            },
            implementationDate: {
                selected: 'Q4 2025',
                notes: ''
            }
        },
        {
            id: 4,
            action: 'New',
            description: 'Tools "Robotic Arm Model X200" added to process "Assembly".',
            before: 'Manual assembly process',
            after: 'Automated assembly with Robotic Arm X200',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-20',
            createdBy: {
                name: 'Emily Davis',
                initials: 'ED',
                date: 'Aug 03, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: 'Requires operator training'
            }
        },
        {
            id: 5,
            action: 'New',
            description: 'Material "Welding Wire Grade A" added to process "Welding".',
            before: 'No material specified',
            after: 'Welding Wire Grade A specified',
            justification: 'Standardization across all welding processes',
            justificationFile: 'material-specs.xlsx',
            neededBy: '2025-08-25',
            createdBy: {
                name: 'Robert Wilson',
                initials: 'RW',
                date: 'Jul 30, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Supplier already approved'
            }
        },
        {
            id: 6,
            action: 'New',
            description: 'Specification "Torque Spec 50Nm" added to process "Fastening".',
            before: 'No torque specification',
            after: 'Torque Spec 50Nm ±5Nm defined',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-10',
            createdBy: {
                name: 'Lisa Anderson',
                initials: 'LA',
                date: 'Aug 02, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: ''
            }
        },
        {
            id: 7,
            action: 'New',
            description: 'Tools "Torque Wrench Digital" added.',
            before: 'No torque measurement tool',
            after: 'Digital Torque Wrench available',
            justification: 'Required for torque specification compliance',
            justificationFile: 'equipment-justification.pdf',
            neededBy: '2025-09-05',
            createdBy: {
                name: 'David Kim',
                initials: 'DK',
                date: 'Aug 04, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: 'Purchase order submitted'
            }
        },
        {
            id: 8,
            action: 'New',
            description: 'Material "Adhesive Type B" added.',
            before: 'No adhesive in BOM',
            after: 'Adhesive Type B added to materials list',
            justification: '',
            justificationFile: null,
            neededBy: '2025-08-28',
            createdBy: {
                name: 'Maria Garcia',
                initials: 'MG',
                date: 'Jul 29, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: ''
            }
        },
        {
            id: 9,
            action: 'New',
            description: 'Specification "Surface Finish Ra 1.6" added.',
            before: 'No surface finish requirement',
            after: 'Surface Finish Ra 1.6 specified',
            justification: 'Customer specification requirement',
            justificationFile: 'customer-requirements.pdf',
            neededBy: '2025-09-18',
            createdBy: {
                name: 'James Taylor',
                initials: 'JT',
                date: 'Aug 06, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: 'Requires process validation'
            }
        },
        {
            id: 10,
            action: 'Move',
            description: 'Assembly area "Packaging Area" above Assembly area "Assembly Area 2" and below assembly area "Assembly Area 1"',
            before: 'Packaging Area at end of sequence',
            after: 'Packaging Area between Assembly Assembly areas 1 and 2',
            justification: 'Optimize production flow',
            justificationFile: null,
            neededBy: '2025-09-25',
            createdBy: {
                name: 'Patricia Brown',
                initials: 'PB',
                date: 'Aug 07, 2025'
            },
            implementationDate: {
                selected: 'Q4 2025',
                notes: 'Requires layout reconfiguration'
            }
        },
        {
            id: 11,
            action: 'Move',
            description: 'Workstation "Inspection Workstation" above workstation "Final Assembly" and below workstation "Sub-Assembly"',
            before: 'Inspection after final assembly',
            after: 'Inspection between sub-assembly and final assembly',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-12',
            createdBy: {
                name: 'Thomas White',
                initials: 'TW',
                date: 'Aug 08, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: ''
            }
        },
        {
            id: 12,
            action: 'Move',
            description: 'Process "Cleaning" above process "Coating" and below process "Deburring"',
            before: 'Cleaning after coating',
            after: 'Cleaning between deburring and coating',
            justification: 'Improve coating adhesion quality',
            justificationFile: 'process-optimization.pdf',
            neededBy: '2025-08-22',
            createdBy: {
                name: 'Jennifer Lee',
                initials: 'JL',
                date: 'Jul 31, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Process validation required'
            }
        },
        {
            id: 13,
            action: 'Delete',
            description: 'Assembly area "Prototype Area" deleted.',
            before: 'Prototype Area active',
            after: 'Prototype Area removed',
            justification: 'Prototype phase completed, moving to production',
            justificationFile: 'phase-completion-report.pdf',
            neededBy: '2025-08-20',
            createdBy: {
                name: 'Christopher Martinez',
                initials: 'CM',
                date: 'Aug 09, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Tools to be relocated'
            }
        },
        {
            id: 14,
            action: 'Delete',
            description: 'Workstation "Manual Sorting" deleted from assembly area "Assembly Area 3".',
            before: 'Manual sorting workstation present',
            after: 'Manual sorting workstation removed',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-08',
            createdBy: {
                name: 'Amanda Rodriguez',
                initials: 'AR',
                date: 'Aug 10, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: 'Replaced by automated system'
            }
        },
        {
            id: 15,
            action: 'Delete',
            description: 'Process "Secondary Inspection" deleted from workstation "QC Workstation".',
            before: 'Dual inspection process',
            after: 'Single inspection process',
            justification: 'Redundant process identified during lean review',
            justificationFile: 'lean-analysis.xlsx',
            neededBy: '2025-08-15',
            createdBy: {
                name: 'Daniel Wilson',
                initials: 'DW',
                date: 'Jul 27, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Immediate implementation'
            }
        },
        {
            id: 16,
            action: 'Delete',
            description: 'Tools "Legacy Tester Model 2010" deleted.',
            before: 'Legacy Tester in use',
            after: 'Legacy Tester removed',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-01',
            createdBy: {
                name: 'Michelle Thompson',
                initials: 'MT',
                date: 'Aug 11, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: ''
            }
        },
        {
            id: 17,
            action: 'Delete',
            description: 'Material "Obsolete Lubricant Type X" deleted.',
            before: 'Lubricant Type X in BOM',
            after: 'Lubricant Type X removed',
            justification: 'Supplier discontinued product',
            justificationFile: 'supplier-notice.pdf',
            neededBy: '2025-08-18',
            createdBy: {
                name: 'Kevin Anderson',
                initials: 'KA',
                date: 'Aug 12, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Alternative already identified'
            }
        },
        {
            id: 18,
            action: 'Delete',
            description: 'Specification "Old Tolerance ±0.5mm" deleted.',
            before: 'Tolerance ±0.5mm specified',
            after: 'Specification removed',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-03',
            createdBy: {
                name: 'Laura Harris',
                initials: 'LH',
                date: 'Aug 13, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: 'Replaced with tighter tolerance'
            }
        },
        {
            id: 19,
            action: 'Update',
            description: 'Assembly area "Final Assembly" renamed to "Main Assembly Area".',
            before: 'Assembly area name: Final Assembly',
            after: 'Assembly area name: Main Assembly Area',
            justification: 'Naming standardization across facility',
            justificationFile: 'naming-convention.pdf',
            neededBy: '2025-08-26',
            createdBy: {
                name: 'Brian Clark',
                initials: 'BC',
                date: 'Aug 14, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Update all documentation'
            }
        },
        {
            id: 20,
            action: 'Update',
            description: 'Workstation "Test Workstation 1" cycle time updated from 45s to 38s.',
            before: 'Cycle time: 45 seconds',
            after: 'Cycle time: 38 seconds',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-14',
            createdBy: {
                name: 'Nancy Lewis',
                initials: 'NL',
                date: 'Aug 15, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: 'Process optimization completed'
            }
        },
        {
            id: 21,
            action: 'Update',
            description: 'Process "Heat Treatment" temperature changed from 180°C to 200°C.',
            before: 'Temperature: 180°C',
            after: 'Temperature: 200°C',
            justification: 'Improved material properties per engineering study',
            justificationFile: 'engineering-study.pdf',
            neededBy: '2025-08-29',
            createdBy: {
                name: 'Steven Walker',
                initials: 'SW',
                date: 'Aug 16, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Validation testing required'
            }
        },
        {
            id: 22,
            action: 'Update',
            description: 'Tools "Press Machine" force setting updated from 500kN to 550kN.',
            before: 'Force: 500kN',
            after: 'Force: 550kN',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-07',
            createdBy: {
                name: 'Karen Hall',
                initials: 'KH',
                date: 'Aug 17, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: ''
            }
        },
        {
            id: 23,
            action: 'Update',
            description: 'Material "Cutting Fluid" supplier changed from Supplier A to Supplier B.',
            before: 'Supplier: Supplier A',
            after: 'Supplier: Supplier B',
            justification: 'Cost reduction and improved delivery time',
            justificationFile: 'supplier-comparison.xlsx',
            neededBy: '2025-08-24',
            createdBy: {
                name: 'Paul Allen',
                initials: 'PA',
                date: 'Aug 18, 2025'
            },
            implementationDate: {
                selected: 'Q2 2025',
                notes: 'Qualification testing completed'
            }
        },
        {
            id: 24,
            action: 'Update',
            description: 'Specification "Hardness HRC 45-50" updated to "Hardness HRC 48-52".',
            before: 'Hardness: HRC 45-50',
            after: 'Hardness: HRC 48-52',
            justification: '',
            justificationFile: null,
            neededBy: '2025-09-11',
            createdBy: {
                name: 'Sandra Young',
                initials: 'SY',
                date: 'Aug 19, 2025'
            },
            implementationDate: {
                selected: 'Q3 2025',
                notes: 'Customer requirement change'
            }
        },
        {
            id: 25,
            action: 'Branch',
            description: 'Assembly area "Assembly Area 1" branched to create "Assembly Area 1-EU" variant.',
            before: 'Single Assembly Area 1',
            after: 'Assembly Area 1 (US) and Assembly Area 1-EU',
            justification: 'EU market requires different safety standards',
            justificationFile: 'eu-requirements.pdf',
            neededBy: '2025-09-30',
            createdBy: {
                name: 'Mark King',
                initials: 'MK',
                date: 'Aug 20, 2025'
            },
            implementationDate: {
                selected: 'Q4 2025',
                notes: 'CE certification in progress'
            }
        }
    ];

    window.PcnData = {
        getAll: function() { return pcnData; }
    };
})();
