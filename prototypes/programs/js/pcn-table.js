/**
 * PCN Table Module
 * Handles PCN table rendering and interactions
 */

(function() {
    'use strict';

    // "Today" anchor for the prototype — chosen so the seeded data shows a mix of overdue, due-soon, and normal states.
    const PCN_TODAY = new Date('2025-08-22T00:00:00');

    function getDueStatus(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return null;
        const diffDays = Math.floor((d - PCN_TODAY) / 86400000);
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 10) return 'due-soon';
        return null;
    }

    function dueIconHtml(status) {
        if (!status) return '';
        const label = status === 'overdue' ? 'Overdue' : 'Due soon';
        return `<lucide-icon class="pcn-needed-by__icon pcn-needed-by__icon--${status}" name="bell.and.waves.left.and.right.fill" style="font-size:18px"></lucide-icon>`;
    }

    // Manual mapping: PCN id → group label.
    // Group label format: "Type: Name" or "Type: Name / Type: Name" for hierarchical groups.
    // The trailing portion after each ": " is rendered bold.
    const PCN_GROUPS = {
        1: 'Material Application Name: Cons 2',
        2: 'Material Application Name: Cons 2',
        3: 'Material Application Name: Cons 2',
        4: 'Material Application Name: Cons 2',
        5: 'Material Application Name: Cons 1',
        6: 'Material Application Name: Cons 1',
        7: 'Material Application Name: Cons 1',
        8: 'Material Application Name: Cons 1',
        9: 'Assembly area: LIN3',
        10: 'Assembly area: LIN3',
        11: 'Assembly area: LIN3',
        12: 'Assembly area: LIN3',
        13: 'Assembly area: LIN3',
        14: 'Equipment: Equip 1',
        15: 'Equipment: Equip 1',
        16: 'Equipment: Equip 1',
        17: 'Equipment: Equip 1',
        18: 'Assembly area: Assembly area 1 / Workstation: Workstation C',
        19: 'Assembly area: Assembly area 1 / Workstation: Workstation C',
        20: 'Assembly area: Assembly area 1 / Workstation: Workstation C',
        21: 'Assembly area: Assembly area 1 / Workstation: Workstation C',
        22: 'Assembly area: Assembly area 1 / Workstation: Workstation A',
        23: 'Assembly area: Assembly area 1 / Workstation: Workstation A',
        24: 'Assembly area: Assembly area 1 / Workstation: Workstation A',
        25: 'Assembly area: Assembly area 1 / Workstation: Workstation A'
    };

    function formatGroupTitle(groupName) {
        return groupName.split(' / ').map(segment => {
            const idx = segment.indexOf(': ');
            if (idx < 0) return segment;
            return `${segment.slice(0, idx)}: <strong>${segment.slice(idx + 2)}</strong>`;
        }).join(' / ');
    }

    // PCN Action types with icons and colors
    const actionTypes = {
        'Branch': {
            icon: `<lucide-icon name="git-branch" style="font-size:20px"></lucide-icon>`,
            color: '#7C3AED'
        },
        'Delete': {
            icon: `<lucide-icon name="trash-2" style="font-size:20px"></lucide-icon>`,
            color: '#DC2626'
        },
        'New': {
            icon: `<lucide-icon name="plus" style="font-size:20px"></lucide-icon>`,
            color: '#16A34A'
        },
        'Move': {
            icon: `<lucide-icon name="arrow-up-down" style="font-size:20px"></lucide-icon>`,
            color: '#EA580C'
        },
        'Update': {
            icon: `<lucide-icon name="repeat" style="font-size:20px"></lucide-icon>`,
            color: '#7180AC'
        }
    };

    const pcnData = window.PcnData.getAll();

    window.PCNTable = {
        // Exposed for split modules (pcn-filters, pcn-row-actions).
        pcnData: pcnData,
        getDueStatus: getDueStatus,
        dueIconHtml: dueIconHtml,

        init: function() {
            this.renderTable();
            if (window.PCNRowActions) window.PCNRowActions.init();
            if (window.PCNFilters) window.PCNFilters.init();
            this.attachSelectAllListener();
            this.attachActionsBarListeners();
            this.updateTabBadge();
        },

        attachSelectAllListener: function() {
            const selectAll = document.getElementById('pcn-select-all');
            const tbody = document.getElementById('pcn-table-body');
            if (!selectAll || !tbody) return;

            function rowsForGroup(groupName) {
                return tbody.querySelectorAll(`tr.table__row[data-group="${groupName}"] input.checkbox__input[data-pcn-id]`);
            }

            function syncGroupCheckbox(groupName) {
                const groupCb = tbody.querySelector(`input.checkbox__input[data-group-checkbox="${groupName}"]`);
                if (!groupCb) return;
                const all = rowsForGroup(groupName);
                const checked = Array.from(all).filter(cb => cb.checked);
                if (checked.length === 0) {
                    groupCb.checked = false;
                    groupCb.indeterminate = false;
                } else if (checked.length === all.length) {
                    groupCb.checked = true;
                    groupCb.indeterminate = false;
                } else {
                    groupCb.checked = false;
                    groupCb.indeterminate = true;
                }
            }

            function syncSelectAll() {
                const all = tbody.querySelectorAll('input.checkbox__input[data-pcn-id]');
                const checked = tbody.querySelectorAll('input.checkbox__input[data-pcn-id]:checked');
                if (checked.length === 0) {
                    selectAll.checked = false;
                    selectAll.indeterminate = false;
                } else if (checked.length === all.length) {
                    selectAll.checked = true;
                    selectAll.indeterminate = false;
                } else {
                    selectAll.checked = false;
                    selectAll.indeterminate = true;
                }
            }

            // Header (select all) toggles every PCN
            selectAll.addEventListener('change', () => {
                const checked = selectAll.checked;
                tbody.querySelectorAll('input.checkbox__input[data-pcn-id]').forEach(cb => {
                    cb.checked = checked;
                });
                tbody.querySelectorAll('input.checkbox__input[data-group-checkbox]').forEach(cb => {
                    cb.checked = checked;
                    cb.indeterminate = false;
                });
                this.syncActionsBar();
            });

            // Group checkbox toggles every PCN inside that group
            tbody.addEventListener('change', (e) => {
                const target = e.target;
                if (target.matches('input.checkbox__input[data-group-checkbox]')) {
                    const groupName = target.dataset.groupCheckbox;
                    rowsForGroup(groupName).forEach(cb => {
                        cb.checked = target.checked;
                    });
                    target.indeterminate = false;
                    syncSelectAll();
                    this.syncActionsBar();
                } else if (target.matches('input.checkbox__input[data-pcn-id]')) {
                    const row = target.closest('tr.table__row');
                    const groupName = row && row.dataset.group;
                    if (groupName) syncGroupCheckbox(groupName);
                    syncSelectAll();
                    this.syncActionsBar();
                }
            });
        },

        /* Show/hide the bulk-action bar based on how many PCN checkboxes are checked. */
        syncActionsBar: function() {
            const tbody = document.getElementById('pcn-table-body');
            const bar = document.getElementById('pcn-actions-bar');
            const counter = document.getElementById('pcn-selected-count');
            if (!tbody || !bar) return;
            const checked = tbody.querySelectorAll('input.checkbox__input[data-pcn-id]:checked').length;
            if (checked === 0) {
                bar.style.display = 'none';
            } else {
                bar.style.display = '';
                if (counter) counter.textContent = `${checked} PCR${checked === 1 ? '' : 's'} selected:`;
            }
        },

        /* Wire Approve / Reject / Cancel buttons. Approve and Reject are no-ops in this prototype
         * (just clear the selection); Cancel clears the selection without acting. */
        attachActionsBarListeners: function() {
            const tbody = document.getElementById('pcn-table-body');
            if (!tbody) return;

            const clearAll = () => {
                const selectAll = document.getElementById('pcn-select-all');
                tbody.querySelectorAll('input.checkbox__input[data-pcn-id]:checked').forEach(cb => {
                    cb.checked = false;
                });
                tbody.querySelectorAll('input.checkbox__input[data-group-checkbox]').forEach(cb => {
                    cb.checked = false;
                    cb.indeterminate = false;
                });
                if (selectAll) {
                    selectAll.checked = false;
                    selectAll.indeterminate = false;
                }
                this.syncActionsBar();
            };

            ['pcn-approve-btn', 'pcn-reject-btn', 'pcn-cancel-btn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.addEventListener('click', clearAll);
            });
        },

        updateTabBadge: function() {
            const badge = document.getElementById('pcn-tab-badge');
            if (!badge) return;
            let hasAlert = false;
            pcnData.forEach(pcn => {
                const status = getDueStatus(pcn.neededBy);
                if (status === 'overdue' || status === 'due-soon') hasAlert = true;
            });
            badge.textContent = pcnData.length;
            badge.classList.toggle('pcn-tab-badge--alert', hasAlert);
        },

        renderTable: function() {
            const tbody = document.getElementById('pcn-table-body');
            if (!tbody) return;

            // MP stage: render empty body (header only).
            if (window.BuildStages && window.BuildStages.getCurrentBuild() === 'Dismantling') {
                tbody.innerHTML = '';
                return;
            }

            // Group PCNs using the manual id → label mapping
            const groupOrder = [];
            const groups = {};
            pcnData.forEach(pcn => {
                const groupName = PCN_GROUPS[pcn.id] || 'Other';
                if (!groups[groupName]) {
                    groups[groupName] = { name: groupName, pcns: [] };
                    groupOrder.push(groupName);
                }
                groups[groupName].pcns.push(pcn);
            });

            tbody.innerHTML = groupOrder.map(name => {
                const group = groups[name];
                return this.createGroupHeader(group) + group.pcns.map(pcn => this.createPCNRow(pcn, name)).join('');
            }).join('');
        },

        createGroupHeader: function(group) {
            let overdueCount = 0;
            let dueSoonCount = 0;
            group.pcns.forEach(pcn => {
                const status = getDueStatus(pcn.neededBy);
                if (status === 'overdue') overdueCount++;
                else if (status === 'due-soon') dueSoonCount++;
            });

            const statusHtml = (overdueCount > 0 || dueSoonCount > 0)
                ? `${overdueCount > 0 ? `<span class="pcn-group-status pcn-group-status--overdue"><lucide-icon name="bell.and.waves.left.and.right.fill" style="font-size:18px"></lucide-icon><span class="pcn-group-status__count">${overdueCount}</span><span class="pcn-group-status__label">Overdue</span></span>` : ''}${dueSoonCount > 0 ? `<span class="pcn-group-status pcn-group-status--due-soon"><lucide-icon name="bell.and.waves.left.and.right.fill" style="font-size:18px"></lucide-icon><span class="pcn-group-status__count">${dueSoonCount}</span><span class="pcn-group-status__label">Due soon</span></span>` : ''}<span class="pcn-group-separator"></span>`
                : '';

            return `
                <tr class="pcn-group-header" data-group="${group.name}">
                    <td class="pcn-group-header__cell pcn-group-header__cell--left">
                        <div class="pcn-group-header__left-content">
                            <label class="checkbox pcn-group-header__checkbox">
                                <input type="checkbox" class="checkbox__input" data-group-checkbox="${group.name}">
                                <span class="checkbox__box"></span>
                            </label>
                            <button class="pcn-group-toggle pcn-group-toggle--collapsed" data-group-toggle="${group.name}" aria-label="Toggle group" aria-expanded="false">
                                <lucide-icon name="chevron-down" class="pcn-group-chevron" style="font-size:14px"></lucide-icon>
                            </button>
                            <lucide-icon class="pcn-group-icon" name="doc.on.doc" style="font-size:14px"></lucide-icon>
                            <span class="pcn-group-title">${formatGroupTitle(group.name)}</span>
                        </div>
                    </td>
                    <td class="pcn-group-header__cell pcn-group-header__cell--filler" colspan="8"></td>
                    <td class="pcn-group-header__cell pcn-group-header__cell--right">
                        <div class="pcn-group-header__right-content">
                            ${statusHtml}
                            <span class="pcn-group-count">${group.pcns.length}</span>
                            <span class="pcn-group-count-label">PCR(s)</span>
                        </div>
                    </td>
                </tr>
            `;
        },

        createPCNRow: function(pcn, group) {
            const actionType = actionTypes[pcn.action];
            const acNumber = 'AC' + (1772742000000 + pcn.id * 197531);
            const groupAttr = group ? ` data-group="${group}"` : '';
            const hasFile = pcn.justificationFile ?
                `<a href="#" class="pcn-file-link" data-file="${pcn.justificationFile}">
                    <lucide-icon name="plus"></lucide-icon>
                    ${pcn.justificationFile}
                </a>` :
                `<a href="#" class="pcn-file-link" data-pcn-id="${pcn.id}">
                    <lucide-icon name="upload"></lucide-icon>
                    Upload file
                </a>`;

            return `
                <tr class="table__row" data-pcn-id="${pcn.id}"${groupAttr} style="display: none;">
                    <td class="table__cell table__cell--fixed-left">
                        <div class="pcn-action-wrapper">
                            <label class="checkbox">
                                <input type="checkbox" class="checkbox__input" data-pcn-id="${pcn.id}">
                                <span class="checkbox__box"></span>
                            </label>
                            <div class="pcn-action-content" style="color: ${actionType.color};">
                                ${actionType.icon}
                                <span class="pcn-action-label">${pcn.action}</span>
                            </div>
                        </div>
                        <div class="pcn-ac-row">
                            <button class="pcn-ac-copy" data-pcn-ac="${acNumber}" aria-label="Copy ID">
                                <lucide-icon name="doc.on.doc" style="font-size:14px"></lucide-icon>
                            </button>
                            <span class="pcn-ac-number">${acNumber}</span>
                        </div>
                        <span class="pcn-fixed-shadow pcn-fixed-shadow--right"></span>
                    </td>
                    <td class="table__cell">
                        <div class="pcn-text">${pcn.description}</div>
                    </td>
                    <td class="table__cell">
                        <div class="pcn-text">${pcn.before}</div>
                    </td>
                    <td class="table__cell">
                        <div class="pcn-text">${pcn.after}</div>
                    </td>
                    <td class="table__cell">
                        <textarea 
                            class="pcn-editable" 
                            placeholder="Enter justification..."
                            data-pcn-id="${pcn.id}"
                            data-field="justification"
                        >${pcn.justification}</textarea>
                    </td>
                    <td class="table__cell">
                        ${hasFile}
                    </td>
                    <td class="table__cell">
                        <div class="pcn-needed-by">
                            <input
                                type="date"
                                class="pcn-date-picker"
                                value="${pcn.neededBy}"
                                data-pcn-id="${pcn.id}"
                                data-field="neededBy"
                            >
                            ${dueIconHtml(getDueStatus(pcn.neededBy))}
                        </div>
                    </td>
                    <td class="table__cell">
                        <div class="pcn-created-by">
                            <div class="avatar avatar--small">${pcn.createdBy.initials}</div>
                            <div class="pcn-created-info">
                                <div class="pcn-created-name">${pcn.createdBy.name}</div>
                                <div class="pcn-created-date">${pcn.createdBy.date}</div>
                            </div>
                        </div>
                    </td>
                    <td class="table__cell">
                        <div class="pcn-implementation">
                            <select 
                                class="pcn-implementation-select"
                                data-pcn-id="${pcn.id}"
                                data-field="implementationDate"
                            >
                                <option value="Q1 2025" ${pcn.implementationDate.selected === 'Q1 2025' ? 'selected' : ''}>Q1 2025</option>
                                <option value="Q2 2025" ${pcn.implementationDate.selected === 'Q2 2025' ? 'selected' : ''}>Q2 2025</option>
                                <option value="Q3 2025" ${pcn.implementationDate.selected === 'Q3 2025' ? 'selected' : ''}>Q3 2025</option>
                                <option value="Q4 2025" ${pcn.implementationDate.selected === 'Q4 2025' ? 'selected' : ''}>Q4 2025</option>
                                <option value="Q1 2026" ${pcn.implementationDate.selected === 'Q1 2026' ? 'selected' : ''}>Q1 2026</option>
                            </select>
                            <textarea 
                                class="pcn-implementation-text" 
                                placeholder="Add implementation notes..."
                                data-pcn-id="${pcn.id}"
                                data-field="implementationNotes"
                            >${pcn.implementationDate.notes}</textarea>
                        </div>
                    </td>
                    <td class="table__cell table__cell--fixed-right">
                        <span class="pcn-fixed-shadow pcn-fixed-shadow--left"></span>
                        <div class="pcn-approval-buttons">
                            <button class="btn btn--success btn--small" data-action="approve" data-pcn-id="${pcn.id}">
                                Approve
                            </button>
                            <button class="btn btn--danger btn--small" data-action="reject" data-pcn-id="${pcn.id}">
                                Reject
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        },
    };
})();
