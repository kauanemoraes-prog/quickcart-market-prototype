/**
 * Program Index — mock data
 * Source programs, sites, events, versions + items per group.
 */

(function() {
    'use strict';

    var SOURCE_PROGRAMS = [
        { code: 'H10', name: 'Wireless Audio' },
        { code: 'G09', name: 'Wireless Audio' },
        { code: 'F08', name: 'Wireless Audio' }
    ];

    var SITES = {
        'H10': [
            { id: 'h10-fxzz', alias: 'fxzz' },
            { id: 'h10-fxbz', alias: 'fxbz' },
            { id: 'h10-pgpd', alias: 'pgpd' },
            { id: 'h10-abcd', alias: 'ABCD' },
            { id: 'h10-abce', alias: 'ABCE' }
        ],
        'G09': [
            { id: 'g09-fxzz', alias: 'fxzz' },
            { id: 'g09-fxba', alias: 'fxba' },
            { id: 'g09-abcd', alias: 'ABCD' },
            { id: 'g09-abce', alias: 'ABCE' }
        ],
        'F08': [
            { id: 'f08-mqxq', alias: 'mqxq' },
            { id: 'f08-abcd', alias: 'ABCD' },
            { id: 'f08-abce', alias: 'ABCE' }
        ]
    };

    var EVENTS = {
        'h10-fxzz': [
            { id: 'h10-fxzz-p1', name: 'Preparation' },
            { id: 'h10-fxzz-p2', name: 'Installation' },
            { id: 'h10-fxzz-mp', name: 'Dismantling' }
        ],
        'h10-fxbz': [
            { id: 'h10-fxbz-p1', name: 'Preparation' },
            { id: 'h10-fxbz-p2', name: 'Installation' }
        ],
        'h10-pgpd': [
            { id: 'h10-pgpd-p1', name: 'Preparation' }
        ],
        'h10-abcd': [
            { id: 'h10-abcd-p1', name: 'Preparation' },
            { id: 'h10-abcd-p2', name: 'Installation' },
            { id: 'h10-abcd-mp', name: 'Dismantling' }
        ],
        'h10-abce': [
            { id: 'h10-abce-p1', name: 'Preparation' },
            { id: 'h10-abce-p2', name: 'Installation' },
            { id: 'h10-abce-mp', name: 'Dismantling' }
        ],
        'g09-fxzz': [
            { id: 'g09-fxzz-p1', name: 'Preparation' },
            { id: 'g09-fxzz-p2', name: 'Installation' }
        ],
        'g09-fxba': [
            { id: 'g09-fxba-p1', name: 'Preparation' }
        ],
        'g09-abcd': [
            { id: 'g09-abcd-p1', name: 'Preparation' },
            { id: 'g09-abcd-p2', name: 'Installation' }
        ],
        'g09-abce': [
            { id: 'g09-abce-p1', name: 'Preparation' },
            { id: 'g09-abce-p2', name: 'Installation' }
        ],
        'f08-mqxq': [
            { id: 'f08-mqxq-p1', name: 'Preparation' }
        ],
        'f08-abcd': [
            { id: 'f08-abcd-p1', name: 'Preparation' }
        ],
        'f08-abce': [
            { id: 'f08-abce-p1', name: 'Preparation' }
        ]
    };

    var VERSIONS = {
        'h10-fxzz-p1': [
            { id: 'h10-fxzz-p1-v1', label: 'V1', state: 'published' },
            { id: 'h10-fxzz-p1-v2', label: 'V2', state: 'published' },
            { id: 'h10-fxzz-p1-v3', label: 'V3', state: 'published' },
            { id: 'h10-fxzz-p1-v4', label: 'V4', state: 'published' },
            { id: 'h10-fxzz-p1-v5', label: 'V5', state: 'published' },
            { id: 'h10-fxzz-p1-v6', label: 'V6 (Draft)', state: 'draft' }
        ],
        'h10-fxzz-p2': [
            { id: 'h10-fxzz-p2-v1', label: 'V1', state: 'published' },
            { id: 'h10-fxzz-p2-v2', label: 'V2', state: 'published' },
            { id: 'h10-fxzz-p2-v3', label: 'V3', state: 'published' }
        ],
        'h10-fxzz-mp': [],
        'h10-fxbz-p1': [
            { id: 'h10-fxbz-p1-v1', label: 'V1', state: 'published' },
            { id: 'h10-fxbz-p1-v2', label: 'V2', state: 'published' },
            { id: 'h10-fxbz-p1-v3', label: 'V3', state: 'published' }
        ],
        'h10-fxbz-p2': [],
        'h10-pgpd-p1': [
            { id: 'h10-pgpd-p1-v1', label: 'V1', state: 'published' }
        ],
        'h10-abcd-p1': [
            { id: 'h10-abcd-p1-v1', label: 'V1', state: 'published' },
            { id: 'h10-abcd-p1-v2', label: 'V2', state: 'published' },
            { id: 'h10-abcd-p1-v3', label: 'V3', state: 'published' },
            { id: 'h10-abcd-p1-v4', label: 'V4', state: 'published' }
        ],
        'h10-abcd-p2': [
            { id: 'h10-abcd-p2-v1', label: 'V1', state: 'published' },
            { id: 'h10-abcd-p2-v2', label: 'V2', state: 'published' }
        ],
        'h10-abcd-mp': [],
        'h10-abce-p1': [
            { id: 'h10-abce-p1-v1', label: 'V1', state: 'published' },
            { id: 'h10-abce-p1-v2', label: 'V2', state: 'published' },
            { id: 'h10-abce-p1-v3', label: 'V3', state: 'published' },
            { id: 'h10-abce-p1-v4', label: 'V4', state: 'published' }
        ],
        'h10-abce-p2': [
            { id: 'h10-abce-p2-v1', label: 'V1', state: 'published' },
            { id: 'h10-abce-p2-v2', label: 'V2', state: 'published' }
        ],
        'h10-abce-mp': [],
        'g09-fxzz-p1': [
            { id: 'g09-fxzz-p1-v1', label: 'V1', state: 'published' },
            { id: 'g09-fxzz-p1-v2', label: 'V2', state: 'published' },
            { id: 'g09-fxzz-p1-v3', label: 'V3', state: 'published' }
        ],
        'g09-fxzz-p2': [],
        'g09-fxba-p1': [
            { id: 'g09-fxba-p1-v1', label: 'V1', state: 'published' }
        ],
        'g09-abcd-p1': [
            { id: 'g09-abcd-p1-v1', label: 'V1', state: 'published' },
            { id: 'g09-abcd-p1-v2', label: 'V2', state: 'published' },
            { id: 'g09-abcd-p1-v3', label: 'V3', state: 'published' },
            { id: 'g09-abcd-p1-v4', label: 'V4', state: 'published' },
            { id: 'g09-abcd-p1-v5', label: 'V5', state: 'published' }
        ],
        'g09-abcd-p2': [
            { id: 'g09-abcd-p2-v1', label: 'V1', state: 'published' }
        ],
        'g09-abce-p1': [
            { id: 'g09-abce-p1-v1', label: 'V1', state: 'published' },
            { id: 'g09-abce-p1-v2', label: 'V2', state: 'published' },
            { id: 'g09-abce-p1-v3', label: 'V3', state: 'published' }
        ],
        'g09-abce-p2': [
            { id: 'g09-abce-p2-v1', label: 'V1', state: 'published' }
        ],
        'f08-mqxq-p1': [
            { id: 'f08-mqxq-p1-v1', label: 'V1', state: 'published' }
        ],
        'f08-abcd-p1': [
            { id: 'f08-abcd-p1-v1', label: 'V1', state: 'published' },
            { id: 'f08-abcd-p1-v2', label: 'V2', state: 'published' },
            { id: 'f08-abcd-p1-v3', label: 'V3', state: 'published' }
        ],
        'f08-abce-p1': [
            { id: 'f08-abce-p1-v1', label: 'V1', state: 'published' },
            { id: 'f08-abce-p1-v2', label: 'V2', state: 'published' }
        ]
    };

    var ITEMS = {
        lines: [
            {
                id: 'l1', name: 'Final Assembly Area A', group: 'A', status: 'Online', type: 'FATP',
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
                stations: [
                    { id: 'l1-s1', name: 'Solder Paste Print', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 30 },
                    { id: 'l1-s2', name: 'Pick & Place', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 45 },
                    { id: 'l1-s3', name: 'Reflow Oven', discipline: 'TE', engIntent: 'DOE', mpIntent: 'POR', cycleTime: 240 },
                    { id: 'l1-s4', name: 'Final Inspection', discipline: 'ME', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', cycleTime: 25 }
                ]
            },
            {
                id: 'l2', name: 'Final Assembly Area B', group: 'A', status: 'Online', type: 'FATP',
                description: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.',
                stations: [
                    { id: 'l2-s1', name: 'Solder Paste Print', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 32 },
                    { id: 'l2-s2', name: 'Pick & Place', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 48 },
                    { id: 'l2-s3', name: 'Sub-Assembly', discipline: 'DFM', engIntent: 'DOE', mpIntent: 'DOE', cycleTime: 60 },
                    { id: 'l2-s4', name: 'Final Test', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 35 }
                ]
            },
            {
                id: 'l3', name: 'Acoustic Tuning Area', group: 'B', status: 'Online', type: 'FATP',
                description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
                stations: [
                    { id: 'l3-s1', name: 'Calibration Box', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 18 },
                    { id: 'l3-s2', name: 'Frequency Sweep', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 22 },
                    { id: 'l3-s3', name: 'Final QA', discipline: 'ME', engIntent: 'MP Evaluation', mpIntent: 'POR', cycleTime: 15 }
                ]
            },
            {
                id: 'l4', name: 'Pack-out Assembly area A', group: 'C', status: 'Online', type: 'FATP',
                description: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
                stations: [
                    { id: 'l4-s1', name: 'Insert Placement', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 12 },
                    { id: 'l4-s2', name: 'Carton Sealer', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 8 },
                    { id: 'l4-s3', name: 'Label Printer', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 6 }
                ]
            },
            {
                id: 'l5', name: 'Pack-out Assembly area B', group: 'C', status: 'Offline', type: 'FATP',
                description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.',
                stations: [
                    { id: 'l5-s1', name: 'Insert Placement', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 12 },
                    { id: 'l5-s2', name: 'Carton Sealer', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 8 },
                    { id: 'l5-s3', name: 'Label Printer', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 6 }
                ]
            },
            {
                id: 'l6', name: 'PCB Inspection Area', group: 'A', status: 'Online', type: 'FATP',
                description: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
                stations: [
                    { id: 'l6-s1', name: 'AOI Camera', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 14 },
                    { id: 'l6-s2', name: 'ICT Tester', discipline: 'TE', engIntent: 'DOE', mpIntent: 'POR', cycleTime: 28 },
                    { id: 'l6-s3', name: 'Defect Sort', discipline: 'DFM', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', cycleTime: 20 }
                ]
            },
            {
                id: 'l7', name: 'Battery Sub-Assembly', group: 'B', status: 'Online', type: 'FATP',
                description: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis.',
                stations: [
                    { id: 'l7-s1', name: 'Cell Mount', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 40 },
                    { id: 'l7-s2', name: 'Laser Welder', discipline: 'AE', engIntent: 'DOE', mpIntent: 'DOE', cycleTime: 18 },
                    { id: 'l7-s3', name: 'Voltage Test', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 22 }
                ]
            },
            {
                id: 'l8', name: 'Repair Bay', group: 'C', status: 'Online', type: 'Repair',
                description: 'Itaque earum rerum hic tenetur a sapiente delectus ut aut reiciendis voluptatibus.',
                stations: [
                    { id: 'l8-s1', name: 'Defect Triage', discipline: 'DFM', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', cycleTime: 90 },
                    { id: 'l8-s2', name: 'Rework Workstation', discipline: 'AE', engIntent: 'MP Evaluation', mpIntent: 'MP Evaluation', cycleTime: 180 },
                    { id: 'l8-s3', name: 'Retest', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', cycleTime: 60 },
                    { id: 'l8-s4', name: 'Sign-off', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', cycleTime: 30 }
                ]
            }
        ],
        equipment: [
            { id: 'e1', name: 'Speaker Press 1200', shortName: 'SP1200', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
            { id: 'e2', name: 'Acoustic Test Chamber', shortName: 'ATC04', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna.' },
            { id: 'e3', name: 'PCB Pick & Place', shortName: 'PCB-PP', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', description: 'Ut enim ad minim veniam quis nostrud exercitation ullamco.' },
            { id: 'e4', name: 'Solder Paste Printer', shortName: 'SPP2', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', description: 'Duis aute irure dolor in reprehenderit in voluptate velit.' },
            { id: 'e5', name: 'AOI Inspection Cam', shortName: 'AOI12', discipline: 'TE', engIntent: 'DOE', mpIntent: 'POR', description: 'Excepteur sint occaecat cupidatat non proident sunt in culpa.' },
            { id: 'e6', name: 'Reflow Oven', shortName: 'RO9', discipline: 'AE', engIntent: 'POR', mpIntent: 'POR', description: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit.' },
            { id: 'e7', name: 'Battery Welder', shortName: 'BW3', discipline: 'AE', engIntent: 'DOE', mpIntent: 'DOE', description: 'At vero eos et accusamus et iusto odio dignissimos ducimus.' },
            { id: 'e8', name: 'In-Circuit Tester', shortName: 'ICT22', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem.' },
            { id: 'e9', name: 'Functional Test Rig', shortName: 'FTR7', discipline: 'TE', engIntent: 'POR', mpIntent: 'POR', description: 'Itaque earum rerum hic tenetur a sapiente delectus ut aut.' },
            { id: 'e10', name: 'Carton Sealer', shortName: 'CS2', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', description: 'Quis autem vel eum iure reprehenderit qui in ea voluptate velit.' },
            { id: 'e11', name: 'Label Printer', shortName: 'LP4', discipline: 'ME', engIntent: 'POR', mpIntent: 'POR', description: 'Nam libero tempore cum soluta nobis est eligendi optio cumque.' },
            { id: 'e12', name: 'Acoustic Calibration Box', shortName: 'ACB1', discipline: 'TE', engIntent: 'MP Evaluation', mpIntent: 'POR', description: 'Temporibus autem quibusdam et aut officiis debitis aut rerum.' }
        ],
        consumables: [
            { id: 'c1', applicationName: 'PCB Solder', name: 'Solder Paste SAC305', engIntent: 'POR', mpIntent: 'POR', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
            { id: 'c2', applicationName: 'Cleaning', name: 'IPA Solvent', engIntent: 'POR', mpIntent: 'POR', description: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
            { id: 'c3', applicationName: 'Acoustic Seal', name: 'Mesh 50um', engIntent: 'POR', mpIntent: 'POR', description: 'Ut enim ad minim veniam quis nostrud exercitation.' },
            { id: 'c4', applicationName: 'Acoustic Seal', name: 'Foam Gasket A', engIntent: 'DOE', mpIntent: 'POR', description: 'Duis aute irure dolor in reprehenderit voluptate velit.' },
            { id: 'c5', applicationName: 'Bonding', name: 'Adhesive Tape 3M-468', engIntent: 'POR', mpIntent: 'POR', description: 'Excepteur sint occaecat cupidatat non proident sunt.' },
            { id: 'c6', applicationName: 'Mechanical', name: 'Lubricant Type B', engIntent: 'POR', mpIntent: 'POR', description: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur.' },
            { id: 'c7', applicationName: 'Cleaning', name: 'PCB Cleaning Wipes', engIntent: 'POR', mpIntent: 'POR', description: 'At vero eos et accusamus et iusto odio dignissimos.' },
            { id: 'c8', applicationName: 'ESD Safety', name: 'ESD Gloves', engIntent: 'POR', mpIntent: 'POR', description: 'Sed ut perspiciatis unde omnis iste natus error sit.' },
            { id: 'c9', applicationName: 'Test Rig', name: 'Pogo Pin Replacement', engIntent: 'DOE', mpIntent: 'DOE', description: 'Itaque earum rerum hic tenetur a sapiente delectus.' },
            { id: 'c10', applicationName: 'Pack-out', name: 'Carton Tape', engIntent: 'POR', mpIntent: 'POR', description: 'Quis autem vel eum iure reprehenderit qui in ea voluptate.' }
        ]
    };

    window.PIData = {
        getSourcePrograms: function() { return SOURCE_PROGRAMS.slice(); },
        getSites: function(programCode) { return (SITES[programCode] || []).slice(); },
        getEvents: function(siteId) { return (EVENTS[siteId] || []).slice(); },
        getVersions: function(eventId, includeAll) {
            var versions = (VERSIONS[eventId] || []).slice();
            versions.sort(function(a, b) {
                var na = parseInt(a.label.replace(/[^0-9]/g, ''), 10) || 0;
                var nb = parseInt(b.label.replace(/[^0-9]/g, ''), 10) || 0;
                return nb - na;
            });
            if (includeAll) return versions;
            return versions.filter(function(v) { return v.state === 'published'; });
        },
        getProgramByCode: function(code) {
            for (var i = 0; i < SOURCE_PROGRAMS.length; i++) {
                if (SOURCE_PROGRAMS[i].code === code) return SOURCE_PROGRAMS[i];
            }
            return null;
        },
        getSiteById: function(siteId) {
            for (var pCode in SITES) {
                var arr = SITES[pCode];
                for (var j = 0; j < arr.length; j++) {
                    if (arr[j].id === siteId) return arr[j];
                }
            }
            return null;
        },
        getEventById: function(eventId) {
            for (var sId in EVENTS) {
                var arr = EVENTS[sId];
                for (var j = 0; j < arr.length; j++) {
                    if (arr[j].id === eventId) return arr[j];
                }
            }
            return null;
        },
        getVersionById: function(versionId) {
            for (var eId in VERSIONS) {
                var arr = VERSIONS[eId];
                for (var j = 0; j < arr.length; j++) {
                    if (arr[j].id === versionId) return arr[j];
                }
            }
            return null;
        },
        getItems: function(group) { return (ITEMS[group] || []).slice(); },
        getItemCount: function(group) { return (ITEMS[group] || []).length; },

        // Target program (current context — H11)
        TARGET_PROGRAM: 'H11',
        TARGET_PROGRAM_NAME: 'QA Testing 11',
        TARGET_PROGRAM_ADMIN: 'Loki Doe',
        TARGET_LOB: 'LOB-004',
        TARGET_PRODUCT_LINE: 'LOB-04 - Studio Pen',
        TARGET_ARCHITECTURE: 'v1.0',

        TARGET_SITES: [
            {
                id: 'site-abce',
                code: 'ABCE',
                alias: 'test2',
                indexed: false,
                buildEvents: [
                    { id: 'h11-abce-p1', name: 'p1', active: true, locked: false, pfStatus: 'Draft' },
                    { id: 'h11-abce-p2', name: 'p2', active: false, locked: false, pfStatus: 'Published' },
                    { id: 'h11-abce-mp', name: 'Dismantling', active: false, locked: true, pfStatus: 'Empty' }
                ]
            },
            {
                id: 'site-abcd',
                code: 'ABCD',
                alias: 'test2',
                indexed: false,
                buildEvents: [
                    { id: 'h11-abcd-p1', name: 'Preparation', active: false, locked: false, pfStatus: 'Published' },
                    { id: 'h11-abcd-mp', name: 'Dismantling', active: false, locked: true, pfStatus: 'Empty' }
                ]
            }
        ],

        PROGRAM_USERS: [
            { name: 'Thor Doe', userId: '1273592347', company: 'External Company', access: 'Line Of Business DRI', accessInfo: true, userDept: 'Select', removable: true },
            { name: 'Wanda Doe', userId: '198735275', company: '', access: 'Line Of Business DRI', accessInfo: true, userDept: 'Select', removable: true },
            { name: 'Johnny Doe', userId: '2700939254', company: 'QuickCart Market Inc.', access: 'Admin', accessInfo: false, userDept: 'Select', removable: true },
            { name: 'Batman Doe', userId: '8362375643', company: 'External Company', access: 'Editor', accessInfo: false, userDept: 'Select', removable: true },
            { name: 'Loki Doe', userId: '936593746', company: '', access: 'Exhibition Admin', accessInfo: false, userDept: 'Select', removable: false }
        ],

        getSiteByCode: function(code) {
            for (var i = 0; i < this.TARGET_SITES.length; i++) {
                if (this.TARGET_SITES[i].code === code) return this.TARGET_SITES[i];
            }
            return null;
        }
    };
})();
