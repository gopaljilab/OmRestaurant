/**
 * OmRestaurant - Interactive Digital Menu Ordering & Booking Bridge
 * Handles real-time item selection, live price computation, and cart summary bar.
 */
(function () {
    'use strict';

    let cart = [];

    function initMenuOrder() {
        // If we are on the booking page, check for prefill
        checkBookingPagePrefill();

        const orderButtons = document.querySelectorAll('.om-order-btn');
        if (orderButtons.length === 0) return;

        // Create Toast Container at the bottom
        if (!document.getElementById('omMenuToastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'omMenuToastContainer';
            toastContainer.setAttribute('aria-live', 'polite');
            toastContainer.setAttribute('aria-atomic', 'true');
            toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '1095';
            document.body.appendChild(toastContainer);
        }

        // Create Floating Cart Bar if not present
        if (!document.getElementById('omFloatingCartBar')) {
            const cartBar = document.createElement('div');
            cartBar.id = 'omFloatingCartBar';
            cartBar.className = 'om-floating-cart-bar text-white';
            cartBar.setAttribute('role', 'region');
            cartBar.setAttribute('aria-label', 'Selected Order Summary');
            cartBar.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="om-cart-badge" id="omCartCount">0</span>
                    <span class="fw-semibold small" id="omCartSummaryText">0 items</span>
                    <span class="text-white-50">·</span>
                    <span class="fw-bold text-primary" id="omCartTotalPrice">&#8377;0</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <a href="booking.html" id="omCartBookingLink" class="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-bold text-nowrap">
                        <i class="fa fa-calendar-check me-1"></i>Book Table with Pre-Order
                    </a>
                    <button type="button" id="omClearCartBtn" class="btn btn-sm btn-link text-white-50 text-decoration-none p-0 ms-1" title="Clear all selected items">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            `;
            document.body.appendChild(cartBar);

            // Bind clear button
            document.getElementById('omClearCartBtn').addEventListener('click', function () {
                cart = [];
                updateCartUI();
                showToast('Order cleared', 'info');
            });
        }

        // Attach click listeners to all order buttons
        orderButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const name = this.getAttribute('data-name');
                const price = parseFloat(this.getAttribute('data-price')) || 0;

                addToCart(name, price);

                // Button micro-interaction
                const originalHtml = this.innerHTML;
                this.classList.add('added');
                this.innerHTML = '<i class="fa fa-check me-1"></i>Added';

                setTimeout(() => {
                    this.classList.remove('added');
                    const count = cart.filter(item => item.name === name).length;
                    this.innerHTML = count > 0 
                        ? `<i class="fa fa-plus me-1"></i>Add (${count})` 
                        : originalHtml;
                }, 1200);

                showToast(`Added <strong>${name}</strong> (&#8377;${price}) to your order!`, 'success');
            });
        });

        // Load existing session cart if any
        loadFromSession();
    }

    function addToCart(name, price) {
        cart.push({ name, price });
        updateCartUI();
        saveToSession();
    }

    function updateCartUI() {
        const cartBar = document.getElementById('omFloatingCartBar');
        const countEl = document.getElementById('omCartCount');
        const summaryTextEl = document.getElementById('omCartSummaryText');
        const totalPriceEl = document.getElementById('omCartTotalPrice');
        const bookingLinkEl = document.getElementById('omCartBookingLink');

        if (!cartBar) return;

        const count = cart.length;
        const total = cart.reduce((sum, item) => sum + item.price, 0);

        if (count > 0) {
            countEl.textContent = count;
            summaryTextEl.textContent = count === 1 ? '1 dish' : `${count} dishes`;
            totalPriceEl.innerHTML = `&#8377;${total}`;
            
            // Encode selected items into URL for booking page prefill
            const itemNames = encodeURIComponent(cart.map(i => i.name).join(', '));
            bookingLinkEl.href = `booking.html?preorder=${itemNames}&estTotal=${total}`;

            cartBar.classList.add('show');
        } else {
            cartBar.classList.remove('show');
            // Reset button counts
            document.querySelectorAll('.om-order-btn').forEach(btn => {
                btn.innerHTML = '<i class="fa fa-plus me-1"></i>Order';
                btn.classList.remove('added');
            });
        }
    }

    function saveToSession() {
        try {
            sessionStorage.setItem('om_restaurant_cart', JSON.stringify(cart));
        } catch (e) {
            // Ignore sessionStorage restrictions
        }
    }

    function loadFromSession() {
        try {
            const saved = sessionStorage.getItem('om_restaurant_cart');
            if (saved) {
                cart = JSON.parse(saved);
                if (Array.isArray(cart) && cart.length > 0) {
                    updateCartUI();
                }
            }
        } catch (e) {}
    }

    function checkBookingPagePrefill() {
        const messageField = document.getElementById('message');
        if (messageField && messageField.value.includes('Pre-ordered Dishes:')) {
            messageField.value = messageField.value.replace(/Pre-ordered Dishes:[^\n]*\n?/g, '').trim();
        }

        const params = new URLSearchParams(window.location.search);
        let preorder = params.get('preorder');
        let total = params.get('estTotal');

        if (!preorder) {
            try {
                const saved = JSON.parse(sessionStorage.getItem('om_restaurant_cart') || '[]');
                if (Array.isArray(saved) && saved.length > 0) {
                    preorder = saved.map(i => i.name).join(', ');
                    total = saved.reduce((s, i) => s + i.price, 0);
                }
            } catch (e) {}
        }

            const preorderInput = document.getElementById('selectedPreorder');
            if (preorderInput) {
                preorderInput.value = preorder;
            }

            const form = document.querySelector('form[action="/bookings"]');
            if (form) {
                if (preorderInput && !preorderInput.value) {
                    preorderInput.value = preorder;
                }
                form.addEventListener('submit', function () {
                    const pi = document.getElementById('selectedPreorder');
                    if (pi && !pi.value && preorder) {
                        pi.value = preorder;
                    }
                });
            }

            if (form && !document.getElementById('omPreorderNotice')) {
                const notice = document.createElement('div');
                notice.id = 'omPreorderNotice';
                notice.className = 'alert d-flex align-items-center justify-content-between mb-4 p-3 rounded-3 text-white border-0';
                notice.style.background = 'rgba(254, 161, 22, 0.15)';
                notice.style.borderLeft = '4px solid #FEA116';
                notice.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="fa fa-utensils text-primary fa-lg me-3"></i>
                        <div>
                            <strong class="text-primary d-block">Pre-Order Attached to Table Reservation</strong>
                            <small class="text-white-50">${preorder}${total ? ` · &#8377;${total}` : ''}</small>
                        </div>
                    </div>
                    <a href="menu.html" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1">View Menu</a>
                `;
                form.parentNode.insertBefore(notice, form);
            }
        }
    }

    function showToast(messageHtml, type) {
        const container = document.getElementById('omMenuToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white border-0 shadow-lg show mb-2';
        toast.style.background = type === 'info' ? '#1E293B' : '#0F172B';
        toast.style.borderLeft = type === 'info' ? '4px solid #38BDF8' : '4px solid #FEA116';
        toast.style.borderRadius = '10px';
        toast.style.minWidth = '260px';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center py-2 px-3">
                    <i class="fa ${type === 'info' ? 'fa-info-circle text-info' : 'fa-check-circle text-primary'} me-2"></i>
                    <span>${messageHtml}</span>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        container.appendChild(toast);

        // Bind dismiss button
        toast.querySelector('.btn-close').addEventListener('click', () => {
            toast.remove();
        });

        // Auto remove after 3s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenuOrder);
    } else {
        initMenuOrder();
    }
})();
