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
        return `<img src="../../.davinci/assets/icons/regular/bell-and-waves-left-and-right-fill.svg" alt="" width="18" height="18" class="pcn-needed-by__icon pcn-needed-by__icon--${status}" title="${label}">`;
    }

    // Manual mapping: PCN id → group label.
    // Group label format: "Type: Name" or "Type: Name / Type: Name" for hierarchical groups.
    // The trailing portion after each ": " is rendered bold.
    const PCN_GROUPS = {
        1: 'Consumable Application Name: Cons 2',
        2: 'Consumable Application Name: Cons 2',
        3: 'Consumable Application Name: Cons 2',
        4: 'Consumable Application Name: Cons 2',
        5: 'Consumable Application Name: Cons 1',
        6: 'Consumable Application Name: Cons 1',
        7: 'Consumable Application Name: Cons 1',
        8: 'Consumable Application Name: Cons 1',
        9: 'Line: LIN3',
        10: 'Line: LIN3',
        11: 'Line: LIN3',
        12: 'Line: LIN3',
        13: 'Line: LIN3',
        14: 'Equipment: Equip 1',
        15: 'Equipment: Equip 1',
        16: 'Equipment: Equip 1',
        17: 'Equipment: Equip 1',
        18: 'Line: Line 1 / Station: Station C',
        19: 'Line: Line 1 / Station: Station C',
        20: 'Line: Line 1 / Station: Station C',
        21: 'Line: Line 1 / Station: Station C',
        22: 'Line: Line 1 / Station: Station A',
        23: 'Line: Line 1 / Station: Station A',
        24: 'Line: Line 1 / Station: Station A',
        25: 'Line: Line 1 / Station: Station A'
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
            icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 7C15.1046 7 16 6.10457 16 5C16 3.89543 15.1046 3 14 3C12.8954 3 12 3.89543 12 5C12 6.10457 12.8954 7 14 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6 13C7.10457 13 8 12.1046 8 11C8 9.89543 7.10457 9 6 9C4.89543 9 4 9.89543 4 11C4 12.1046 4.89543 13 6 13Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 17C15.1046 17 16 16.1046 16 15C16 13.8954 15.1046 13 14 13C12.8954 13 12 13.8954 12 15C12 16.1046 12.8954 17 14 17Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12.5 5.5L8 10.5M8 11.5L12.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
            color: '#7C3AED'
        },
        'Delete': {
            icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 5H4.16667H17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8.33333 9.16667V14.1667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11.6667 9.16667V14.1667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
            color: '#DC2626'
        },
        'New': {
            icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4.16667V15.8333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4.16667 10H15.8333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
            color: '#16A34A'
        },
        'Move': {
            icon: `<svg width="20" height="20" viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13.6128522,1.22053431 L0.761113045,14.3527604 C0.32306087,14.8178387 0.0365217392,15.4554039 0.0365217392,16.0449691 C0.0365217392,17.3961169 0.971634784,18.3097343 2.30128696,18.3097343 C2.94986087,18.3097343 3.44191305,18.0826735 3.88549566,17.639143 L9.18876523,12.1738213 L13.2723131,7.40423866 L13.0182783,13.2968648 L13.0182783,46.0377326 C13.0182783,47.3833657 13.9803652,48.3294561 15.3100174,48.3294561 C16.6396696,48.3294561 17.5962783,47.3833657 17.5962783,46.0377326 L17.5962783,13.2968648 L17.3477739,7.40423866 L21.4312696,12.1738213 L26.7345913,17.639143 C27.1781218,18.0826735 27.6646957,18.3097343 28.3188,18.3097343 C29.6429218,18.3097343 30.5835131,17.3961169 30.5835131,16.0449691 C30.5835131,15.4554039 30.296974,14.8178387 29.8589218,14.3527604 L17.0342087,1.22053431 C16.0721218,0.236951701 14.5749392,0.204447353 13.6128522,1.22053431 Z M46.0743131,47.5673987 L58.9263131,34.4351778 C59.3640523,33.9700996 59.6504871,33.3055604 59.6504871,32.7429691 C59.6504871,31.3918213 58.7155305,30.4782039 57.3861392,30.4782039 C56.7370957,30.4782039 56.2450957,30.7052648 55.8016175,31.1487952 L50.498661,36.614117 L46.4150088,41.3567152 L46.6419653,35.4910735 L46.6419653,2.75022127 C46.6419653,1.43157779 45.7122262,0.485456049 44.3771479,0.485456049 C43.0475479,0.485456049 42.0909392,1.43157779 42.0909392,2.75022127 L42.0909392,35.4910735 L42.3394435,41.3567152 L38.2344522,36.614117 L32.9256001,31.1487952 C32.514574,30.7052648 31.9954957,30.4782039 31.3414435,30.4782039 C30.0172696,30.4782039 29.1037044,31.3918213 29.1037044,32.7429691 C29.1037044,33.3055604 29.3632174,33.9700996 29.8282957,34.4351778 L42.6530088,47.5673987 C43.6150957,48.5780126 45.1122262,48.610517 46.0743131,47.5673987 Z" transform="translate(2 7.74)"/></svg>`,
            color: '#EA580C'
        },
        'Update': {
            icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.1667 2.5L17.5 5.83333L14.1667 9.16667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2.5 9.16667V7.5C2.5 6.83696 2.76339 6.20107 3.23223 5.73223C3.70107 5.26339 4.33696 5 5 5H17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5.83333 17.5L2.5 14.1667L5.83333 10.8333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17.5 10.8333V12.5C17.5 13.163 17.2366 13.7989 16.7678 14.2678C16.2989 14.7366 15.663 15 15 15H2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
            color: '#2563EB'
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
                if (counter) counter.textContent = `${checked} PCN${checked === 1 ? '' : 's'} selected:`;
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
            if (window.BuildStages && window.BuildStages.getCurrentBuild() === 'MP') {
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
                ? `${overdueCount > 0 ? `<span class="pcn-group-status pcn-group-status--overdue"><img src="../../.davinci/assets/icons/regular/bell-and-waves-left-and-right-fill.svg" alt="" width="18" height="18"><span class="pcn-group-status__count">${overdueCount}</span><span class="pcn-group-status__label">Overdue</span></span>` : ''}${dueSoonCount > 0 ? `<span class="pcn-group-status pcn-group-status--due-soon"><img src="../../.davinci/assets/icons/regular/bell-and-waves-left-and-right-fill.svg" alt="" width="18" height="18"><span class="pcn-group-status__count">${dueSoonCount}</span><span class="pcn-group-status__label">Due soon</span></span>` : ''}<span class="pcn-group-separator"></span>`
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
                                <svg class="pcn-group-chevron" width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <img src="../../.davinci/assets/icons/regular/doc-on-doc.svg" alt="" width="14" height="14" class="pcn-group-icon">
                            <span class="pcn-group-title">${formatGroupTitle(group.name)}</span>
                        </div>
                    </td>
                    <td class="pcn-group-header__cell pcn-group-header__cell--filler" colspan="8"></td>
                    <td class="pcn-group-header__cell pcn-group-header__cell--right">
                        <div class="pcn-group-header__right-content">
                            ${statusHtml}
                            <span class="pcn-group-count">${group.pcns.length}</span>
                            <span class="pcn-group-count-label">PCN(s)</span>
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
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2V8M8 8V14M8 8H14M8 8H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    ${pcn.justificationFile}
                </a>` :
                `<a href="#" class="pcn-file-link" data-pcn-id="${pcn.id}">
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
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
                                <img src="../../.davinci/assets/icons/regular/doc-on-doc.svg" alt="" width="14" height="14">
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
