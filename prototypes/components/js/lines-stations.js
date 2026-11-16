/**
 * Lines → Stations — Use case for ProjNestedTable plugin
 *
 * Demonstrates a nested table with:
 *   Level 1: Manufacturing lines (flat data table)
 *   Level 2: Stations per line (rich detail panel with tags, actions, key processes)
 */
(function() {
    'use strict';

    // Sample data — Level 1 (Lines) with nested Level 2 (Stations)
    var linesData = [
        {
            id: 'line-1', index: '01', name: 'Assembly area 2', description: '', targetUPH: '',
            stationCount: 3, processCount: 4, hc: 0, equipCount: 1, uniqueEquipCount: 1, uniqueCons: 0,
            stations: [
                {
                    id: 'st-1', index: '01', name: 'bla', color: '#A4D787',
                    department: 'ME',
                    tags: [
                        { label: 'ME', type: 'primary' },
                        { label: 'ENG: MP Evaluation', type: 'gray' },
                        { label: 'MP: MP Evaluation', type: 'gray' },
                        { label: 'Non-reporting', type: 'gray' }
                    ],
                    keyProcesses: [
                        { index: '01', name: 'test', equipment: 'Equip 1 MP E...' },
                        { index: '02', name: 'new', equipment: '' }
                    ]
                },
                {
                    id: 'st-2', index: '02', name: 'Workstation B', color: '#A4D787',
                    department: 'ME',
                    tags: [
                        { label: 'ME', type: 'primary' },
                        { label: 'ENG: MP Evaluation', type: 'gray' },
                        { label: 'MP: MP Evaluation', type: 'gray' },
                        { label: 'Non-reporting', type: 'gray' },
                        { label: 'SOP File', type: 'primary' }
                    ],
                    keyProcesses: [
                        { index: '01', name: 'Task 1', equipment: '' }
                    ]
                }
            ]
        },
        {
            id: 'line-2', index: '02', name: 'LIN3', description: '', targetUPH: '',
            stationCount: 0, processCount: 0, hc: 0, equipCount: 0, uniqueEquipCount: 0, uniqueCons: 0,
            stations: []
        },
        {
            id: 'line-3', index: '03', name: 'Assembly area 1', description: '', targetUPH: '',
            stationCount: 3, processCount: 0, hc: 0, equipCount: 0, uniqueEquipCount: 0, uniqueCons: 0,
            stations: []
        }
    ];

    window.LinesStations = {
        data: linesData,

        init: function() {
            var table = ProjNestedTable.create({
                tbodyId: 'lines-table-body',
                level1TemplateId: 'lines-row-template',
                level2TemplateId: 'stations-panel-template',
                data: this.data,
                dataKey: 'data-line-id',
                idField: 'id',
                childrenField: 'stations',
                colspan: 10,
                level1DataKey: 'lines',
                level2DataKey: 'stations'
            });
            table.init();
        }
    };
})();
