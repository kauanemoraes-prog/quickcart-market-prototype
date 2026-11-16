/**
 * PCN Row Actions
 * Row-level event delegation on the PCN tbody: field edits, file-link clicks,
 * approve/reject buttons, AC copy, group expand/collapse.
 * Reads `window.PCNTable.pcnData` and the due-status helpers lazily.
 */

(function() {
    'use strict';

    function getPcnData() {
        return (window.PCNTable && window.PCNTable.pcnData) || [];
    }

    function getDueStatus(dateStr) {
        return window.PCNTable && window.PCNTable.getDueStatus
            ? window.PCNTable.getDueStatus(dateStr)
            : null;
    }

    function dueIconHtml(status) {
        return window.PCNTable && window.PCNTable.dueIconHtml
            ? window.PCNTable.dueIconHtml(status)
            : '';
    }

    window.PCNRowActions = {
        init: function() {
            const tbody = document.getElementById('pcn-table-body');
            if (!tbody) return;
            const self = this;

            // Handle editable field changes
            tbody.addEventListener('input', (e) => {
                if (e.target.classList.contains('pcn-editable') ||
                    e.target.classList.contains('pcn-implementation-text') ||
                    e.target.classList.contains('pcn-date-picker') ||
                    e.target.classList.contains('pcn-implementation-select')) {
                    self.handleFieldChange(e.target);
                }
            });

            // Handle file upload link clicks
            tbody.addEventListener('click', (e) => {
                const fileLink = e.target.closest('.pcn-file-link');
                if (fileLink) {
                    e.preventDefault();
                    const pcnId = fileLink.dataset.pcnId;
                    if (pcnId) {
                        if (window.FileUploadModal) {
                            window.FileUploadModal.open(pcnId);
                        }
                    } else {
                        const fileName = fileLink.dataset.file;
                        console.log('View file:', fileName);
                        if (typeof showNotification === 'function') {
                            showNotification('info', `Viewing file: ${fileName}`);
                        }
                    }
                }
            });

            // Handle approval/reject buttons
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (btn) {
                    const action = btn.dataset.action;
                    const pcnId = btn.dataset.pcnId;
                    self.handleApproval(action, pcnId);
                }
            });

            // Handle AC number copy buttons
            tbody.addEventListener('click', (e) => {
                const copyBtn = e.target.closest('.pcn-ac-copy');
                if (copyBtn) {
                    e.preventDefault();
                    const ac = copyBtn.dataset.pcnAc;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(ac);
                    }
                    copyBtn.classList.add('pcn-ac-copy--copied');
                    setTimeout(() => copyBtn.classList.remove('pcn-ac-copy--copied'), 1200);
                }
            });

            // Handle group expand/collapse toggle
            tbody.addEventListener('click', (e) => {
                const toggleBtn = e.target.closest('[data-group-toggle]');
                if (!toggleBtn) return;
                const groupName = toggleBtn.dataset.groupToggle;
                const isExpanded = toggleBtn.getAttribute('aria-expanded') !== 'false';
                const nextState = !isExpanded;
                toggleBtn.setAttribute('aria-expanded', nextState ? 'true' : 'false');
                toggleBtn.classList.toggle('pcn-group-toggle--collapsed', !nextState);
                tbody.querySelectorAll(`tr[data-group="${groupName}"]:not(.pcn-group-header)`).forEach(row => {
                    row.style.display = nextState ? '' : 'none';
                });
            });
        },

        handleFieldChange: function(field) {
            const pcnId = field.dataset.pcnId;
            const fieldName = field.dataset.field;
            const value = field.value;

            console.log(`PCR ${pcnId} - ${fieldName} changed to:`, value);

            const pcn = getPcnData().find(p => p.id === parseInt(pcnId));
            if (pcn) {
                if (fieldName === 'justification') {
                    pcn.justification = value;
                } else if (fieldName === 'neededBy') {
                    pcn.neededBy = value;
                    // Refresh the due/overdue icon next to the date input
                    const wrapper = field.closest('.pcn-needed-by');
                    if (wrapper) {
                        wrapper.querySelectorAll('.pcn-needed-by__icon').forEach(el => el.remove());
                        const status = getDueStatus(value);
                        if (status) {
                            wrapper.insertAdjacentHTML('beforeend', dueIconHtml(status));
                        }
                    }
                } else if (fieldName === 'implementationDate') {
                    pcn.implementationDate.selected = value;
                } else if (fieldName === 'implementationNotes') {
                    pcn.implementationDate.notes = value;
                }
            }
        },

        handleApproval: function(action, pcnId) {
            const pcn = getPcnData().find(p => p.id === parseInt(pcnId));
            if (!pcn) return;

            const actionText = action === 'approve' ? 'approved' : 'rejected';
            const notifType = action === 'approve' ? 'success' : 'error';

            console.log(`PCR ${pcnId} (${pcn.action}) ${actionText}`);

            if (typeof showNotification === 'function') {
                showNotification(notifType, `PCR "${pcn.action}" has been ${actionText}`);
            }

            // Placeholder: in a real app this would round-trip to the server.
            setTimeout(() => {
                const row = document.querySelector(`tr[data-pcn-id="${pcnId}"]`);
                if (row) {
                    row.style.transition = 'opacity 0.3s ease';
                    row.style.opacity = '0';
                    setTimeout(() => {
                        row.remove();
                        const tbody = document.getElementById('pcn-table-body');
                        if (tbody && tbody.children.length === 0) {
                            tbody.innerHTML = `
                                <tr>
                                    <td colspan="10" style="text-align: center; padding: var(--space-xl); color: var(--color-glyph-gray-secondary);">
                                        No pending PCRs
                                    </td>
                                </tr>
                            `;
                        }
                    }, 300);
                }
            }, 1000);
        },

        updateFileLink: function(pcnId, fileName) {
            const row = document.querySelector(`tr[data-pcn-id="${pcnId}"]`);
            if (!row) return;

            const fileCell = row.querySelector('.pcn-file-link').parentElement;
            fileCell.innerHTML = `
                <a href="#" class="pcn-file-link" data-file="${fileName}">
                    <lucide-icon name="plus"></lucide-icon>
                    ${fileName}
                </a>
            `;

            const pcn = getPcnData().find(p => p.id === parseInt(pcnId));
            if (pcn) {
                pcn.justificationFile = fileName;
            }
        }
    };
})();
