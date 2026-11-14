/**
 * OmRestaurant - Instant Live Menu Search & Category Filter
 * High-performance client-side filtering across all 174 authentic dishes.
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const searchInput = document.getElementById('omMenuSearchInput');
        const clearBtn = document.getElementById('omMenuSearchClear');
        const countBadge = document.getElementById('omMenuFilterCount');
        const emptyState = document.getElementById('omMenuEmptyState');
        const resetBtn = document.getElementById('omMenuResetSearchBtn');
        const tabContent = document.getElementById('omMenuTabContent');
        const allTabs = document.querySelectorAll('.om-menu-pills .nav-link');

        if (!searchInput) return;

        let activeTabHref = '#tab-all';

        // Track active tab changes
        allTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', function (e) {
                activeTabHref = e.target.getAttribute('href');
                if (searchInput.value.trim() !== '') {
                    // Re-apply current search on tab switch
                    applySearch(searchInput.value.trim());
                } else {
                    updateCountForTab(activeTabHref);
                }
            });
        });

        // Search Input Listener
        searchInput.addEventListener('input', function () {
            const query = this.value.trim().toLowerCase();
            if (query.length > 0) {
                clearBtn.style.display = 'block';
                // If not currently on tab-all, we can either switch or search within tab
                // Switching to tab-all ensures universal catalog search
                const allTabPill = document.querySelector('.om-menu-pills a[href="#tab-all"]');
                if (allTabPill && activeTabHref !== '#tab-all') {
                    const bsTab = bootstrap.Tab.getInstance(allTabPill) || new bootstrap.Tab(allTabPill);
                    bsTab.show();
                    activeTabHref = '#tab-all';
                }
                applySearch(query);
            } else {
                clearBtn.style.display = 'none';
                resetSearch();
            }
        });

        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                resetSearch();
                searchInput.focus();
            });
        }

        // Reset button in empty state
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                searchInput.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
                resetSearch();
                searchInput.focus();
            });
        }

        function applySearch(query) {
            const activePane = document.querySelector(activeTabHref);
            if (!activePane) return;

            const cards = activePane.querySelectorAll('.om-menu-col');
            let matchCount = 0;

            cards.forEach(card => {
                const dishName = (card.getAttribute('data-dish-name') || '').toLowerCase();
                const desc = (card.querySelector('.om-menu-desc')?.textContent || '').toLowerCase();
                const tag = (card.querySelector('.om-menu-tag')?.textContent || '').toLowerCase();

                if (dishName.includes(query) || desc.includes(query) || tag.includes(query)) {
                    card.style.display = '';
                    matchCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Handle category headers in tab-all
            if (activeTabHref === '#tab-all') {
                const groups = activePane.querySelectorAll('.om-menu-category-group');
                groups.forEach(group => {
                    const visibleInGroup = group.querySelectorAll('.om-menu-col:not([style*="display: none"])').length;
                    group.style.display = visibleInGroup > 0 ? '' : 'none';
                });
            }

            // Update counter
            if (countBadge) {
                countBadge.innerHTML = `Found <strong class="text-primary">${matchCount}</strong> dishes matching &ldquo;${escapeHtml(query)}&rdquo;`;
            }

            // Empty state handling
            if (emptyState) {
                if (matchCount === 0) {
                    emptyState.classList.remove('d-none');
                    if (tabContent) tabContent.classList.add('d-none');
                } else {
                    emptyState.classList.add('d-none');
                    if (tabContent) tabContent.classList.remove('d-none');
                }
            }
        }

        function resetSearch() {
            const activePane = document.querySelector(activeTabHref);
            if (!activePane) return;

            const cards = activePane.querySelectorAll('.om-menu-col');
            cards.forEach(card => card.style.display = '');

            if (activeTabHref === '#tab-all') {
                const groups = activePane.querySelectorAll('.om-menu-category-group');
                groups.forEach(group => group.style.display = '');
            }

            if (emptyState) emptyState.classList.add('d-none');
            if (tabContent) tabContent.classList.remove('d-none');

            updateCountForTab(activeTabHref);
        }

        function updateCountForTab(tabHref) {
            if (!countBadge) return;
            const activePane = document.querySelector(tabHref);
            if (!activePane) return;

            const total = activePane.querySelectorAll('.om-menu-col').length;
            if (tabHref === '#tab-all') {
                countBadge.textContent = `Showing all ${total} authentic items`;
            } else {
                const activeTabLink = document.querySelector(`.om-menu-pills a[href="${tabHref}"] span`) || document.querySelector(`.om-menu-pills a[href="${tabHref}"] h6`);
                const tabTitle = activeTabLink ? activeTabLink.textContent.trim() : 'Section';
                countBadge.textContent = `Showing ${total} items in ${tabTitle}`;
            }
        }

        function escapeHtml(str) {
            return str.replace(/[&<>"']/g, function (m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[m];
            });
        }
    });
})();
