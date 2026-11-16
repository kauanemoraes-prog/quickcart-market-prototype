(function() {
    'use strict';

    // Scenario 1 (3 dots): Planning is current + selected
    var scenario1 = [
        { label: 'Planning', value: '04/01/2026', current: true,  selected: true },
        { label: 'Preparation', value: '04/15/2026', current: false, selected: false },
        { label: 'Closing', value: '04/30/2026', current: false, selected: false }
    ];
    
    // Scenario 2 (3 dots): Planning is current, Preparation is selected
    var scenario2 = [
        { label: 'Planning', value: '04/01/2026', current: true,  selected: false },
        { label: 'Preparation', value: '04/15/2026', current: false, selected: true },
        { label: 'Closing', value: '04/30/2026', current: false, selected: false }
    ];

    // Scenario 3 (6 dots): Preparation is current + selected
    var scenario3 = [
        { label: 'Planning', value: '04/01/2026', current: false, selected: false },
        { label: 'Preparation', value: '04/15/2026', current: true,  selected: true },
        { label: 'Installation', value: '04/30/2026', current: false, selected: false },
        { label: 'Opening', value: 'TBD',       current: false, selected: false },
        { label: 'Dismantling', value: 'TBD',       current: false, selected: false },
        { label: 'Closing',  value: '09/30/2026', current: false, selected: false }
    ];

    // Scenario 4 (6 dots): Preparation is selected, Installation is current
    var scenario4 = [
        { label: 'Planning', value: '04/01/2026', current: false, selected: false },
        { label: 'Preparation', value: '04/15/2026', current: false, selected: true },
        { label: 'Installation', value: '04/30/2026', current: true,  selected: false },
        { label: 'Opening', value: 'TBD',       current: false, selected: false },
        { label: 'Dismantling', value: 'TBD',       current: false, selected: false },
        { label: 'Closing',  value: '09/30/2026', current: false, selected: false }
    ];

    // Scenario 5 (6 dots): Installation is current, Opening is selected (future + selected)
    var scenario5 = [
        { label: 'Planning', value: '04/01/2026', current: false, selected: false },
        { label: 'Preparation', value: '04/15/2026', current: false, selected: false },
        { label: 'Installation', value: '04/30/2026', current: true,  selected: false },
        { label: 'Opening', value: 'TBD',       current: false, selected: true },
        { label: 'Dismantling', value: 'TBD',       current: false, selected: false },
        { label: 'Closing',  value: '09/30/2026', current: false, selected: false }
    ];

    // Scenario 6 (6 dots): Same as 5 but Installation is draft (current + draft)
    var scenario6 = [
        { label: 'Planning', value: '04/01/2026', current: false, selected: false },
        { label: 'Preparation', value: '04/15/2026', current: false, selected: false },
        { label: 'Installation', value: '04/30/2026', current: true,  selected: false, draft: true },
        { label: 'Opening', value: 'TBD',       current: false, selected: true },
        { label: 'Dismantling', value: 'TBD',       current: false, selected: false },
        { label: 'Closing',  value: '09/30/2026', current: false, selected: false }
    ];

    // Scenario 7 (4 dots): Planning is current + selected
    var scenario7 = [
        { label: 'Planning', value: '04/01/2026', current: true,  selected: true },
        { label: 'Preparation', value: '04/15/2026', current: false, selected: false },
        { label: 'Installation', value: '04/15/2026', current: false, selected: false },
        { label: 'Closing', value: '04/30/2026', current: false, selected: false }
    ];
    

    window.TimelineDemo = {
        init: function() {
            var demos = [
                { id: 'timeline-demo-1', data: scenario1 },
                { id: 'timeline-demo-2', data: scenario2 },
                { id: 'timeline-demo-3', data: scenario3 },
                { id: 'timeline-demo-4', data: scenario4 },
                { id: 'timeline-demo-5', data: scenario5 },
                { id: 'timeline-demo-6', data: scenario6 },
                { id: 'timeline-demo-7', data: scenario7 }
            ];
            for (var i = 0; i < demos.length; i++) {
                ProjTimeline.create({
                    containerId: demos[i].id,
                    templateId: 'timeline-template',
                    milestones: demos[i].data
                }).init();
            }
        }
    };
})();
