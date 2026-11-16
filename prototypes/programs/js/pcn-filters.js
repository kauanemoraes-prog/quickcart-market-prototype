/**
 * PCN Filters
 * Search input + due-date filter for the PCN table.
 * Reads `window.PCNTable.pcnData` lazily so init order doesn't matter.
 */

(function() {
    'use strict';

    function getPcnData() {
        return (window.PCNTable && window.PCNTable.pcnData) || [];
    }

    window.PCNFilters = {
        init: function() {
            this.attachSearchListener();
            this.attachDueFilterListener();
        },

        attachSearchListener: function() {
            const searchInput = document.getElementById('pcn-search');
            if (!searchInput) return;
            searchInput.addEventListener('input', (e) => {
                this.filterTable(e.target.value);
            });
        },

        filterTable: function(searchTerm) {
            const tbody = document.getElementById('pcn-table-body');
            if (!tbody) return;

            const term = searchTerm.toLowerCase().trim();
            const rows = tbody.querySelectorAll('.table__row');

            if (!term) {
                rows.forEach(row => { row.style.display = ''; });
                return;
            }

            const pcnData = getPcnData();
            rows.forEach(row => {
                const pcnId = row.dataset.pcnId;
                const pcn = pcnData.find(p => p.id === parseInt(pcnId));
                if (pcn) {
                    const searchableText = [
                        pcn.action,
                        pcn.description,
                        pcn.before,
                        pcn.after,
                        pcn.justification,
                        pcn.justificationFile || '',
                        pcn.createdBy.name,
                        pcn.implementationDate.selected,
                        pcn.implementationDate.notes
                    ].join(' ').toLowerCase();
                    row.style.display = searchableText.includes(term) ? '' : 'none';
                }
            });

            const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
            if (visibleRows.length === 0) {
                if (!tbody.querySelector('.no-results-row')) {
                    const noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'table__row no-results-row';
                    noResultsRow.innerHTML = `
                        <td colspan="10" style="text-align: center; padding: var(--space-xl); color: var(--color-glyph-gray-secondary);">
                            No PCRs found matching "${searchTerm}"
                        </td>
                    `;
                    tbody.appendChild(noResultsRow);
                }
            } else {
                const noResultsRow = tbody.querySelector('.no-results-row');
                if (noResultsRow) noResultsRow.remove();
            }
        },

        attachDueFilterListener: function() {
            const filterSwitch = document.getElementById('pcn-due-filter');
            if (!filterSwitch) return;
            filterSwitch.addEventListener('change', (e) => {
                this.filterByDueDate(e.target.checked);
            });
        },

        filterByDueDate: function(showOnlyDue) {
            const tbody = document.getElementById('pcn-table-body');
            if (!tbody) return;

            const rows = tbody.querySelectorAll('.table__row');

            if (!showOnlyDue) {
                rows.forEach(row => {
                    if (!row.classList.contains('no-results-row')) {
                        row.style.display = '';
                    }
                });
                const noResultsRow = tbody.querySelector('.no-results-row');
                if (noResultsRow) noResultsRow.remove();
                return;
            }

            // Match rows that have the bell icon next to the Needed By date input —
            // this mirrors getDueStatus() logic exactly (overdue or due-soon).
            let visibleCount = 0;
            rows.forEach(row => {
                if (row.classList.contains('no-results-row')) {
                    row.remove();
                    return;
                }
                const hasIcon = row.querySelector('.pcn-needed-by__icon');
                if (hasIcon) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            if (visibleCount === 0) {
                const noResultsRow = document.createElement('tr');
                noResultsRow.className = 'table__row no-results-row';
                noResultsRow.innerHTML = `
                    <td colspan="10" style="text-align: center; padding: var(--space-xl); color: var(--color-glyph-gray-secondary);">
                        No due soon or overdue PCRs
                    </td>
                `;
                tbody.appendChild(noResultsRow);
            }
        }
    };
})();
