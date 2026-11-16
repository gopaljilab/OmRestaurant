/**
 * OmRestaurant - Live Order Tracking Engine
 * Provides real-time order status tracking, kitchen station progress, and auto-refresh polling.
 */
(function () {
    'use strict';

    let pollInterval = null;
    let currentTrackingOrder = null;

    const STATUS_MAP = {
        incoming: {
            step: 1,
            label: "Order Received",
            badgeClass: "bg-info text-dark",
            icon: "fa-receipt",
            desc: "Your pure vegetarian order has been received and queued for the kitchen."
        },
        preparing: {
            step: 2,
            label: "Preparing in Kitchen",
            badgeClass: "bg-warning text-dark",
            icon: "fa-fire-burner",
            desc: "Our chefs are freshly crafting your dishes across our specialized kitchen stations."
        },
        ready: {
            step: 3,
            label: "Ready for Pickup / Table",
            badgeClass: "bg-primary text-white",
            icon: "fa-bell-concierge",
            desc: "All dishes are cooked and freshly plated! Ready to be served hot."
        },
        served: {
            step: 4,
            label: "Served / Active Dining",
            badgeClass: "bg-success text-white",
            icon: "fa-utensils",
            desc: "Dishes have been served to your table. Enjoy your authentic pure veg meal!"
        },
        completed: {
            step: 4,
            label: "Completed",
            badgeClass: "bg-success text-white",
            icon: "fa-check-double",
            desc: "Thank you for dining with OM Restaurant. We look forward to serving you again!"
        },
        cancelled: {
            step: 0,
            label: "Cancelled",
            badgeClass: "bg-danger text-white",
            icon: "fa-ban",
            desc: "This order has been cancelled. Please contact our reception desk for assistance."
        }
    };

    const STATION_LABELS = {
        tandoor: { name: "Tandoor & Breads", icon: "fa-fire" },
        curry: { name: "Mughlai Curries", icon: "fa-bowl-rice" },
        south_indian: { name: "South Indian", icon: "fa-circle-dot" },
        chinese: { name: "Indo-Chinese", icon: "fa-utensils" },
        beverage: { name: "Beverages & Shakes", icon: "fa-martini-glass-citrus" }
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(isoString) {
        if (!isoString) return '--:--';
        try {
            const d = new Date(isoString);
            if (!isNaN(d.getTime())) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            }
        } catch (e) {}
        return isoString.replace('T', ' ').slice(11, 16);
    }

    function initOrderTracker() {
        const trackForms = document.querySelectorAll('.om-order-track-form');
        if (trackForms.length === 0) return;

        trackForms.forEach(form => {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const input = form.querySelector('.om-order-track-input');
                if (!input) return;
                const query = input.value.trim();
                if (!query) {
                    input.focus();
                    return;
                }
                trackOrder(query, form);
            });
        });

        // Refresh button listener
        document.addEventListener('click', function (e) {
            const refreshBtn = e.target.closest('.om-track-refresh-btn');
            if (refreshBtn && currentTrackingOrder) {
                e.preventDefault();
                trackOrder(currentTrackingOrder);
            }
        });

        // Check URL params for direct link: ?order=OM-1001 or ?search=... or ?query=...
        const urlParams = new URLSearchParams(window.location.search);
        const orderFromUrl = urlParams.get('order')
            || urlParams.get('orderNumber')
            || urlParams.get('search')
            || urlParams.get('query')
            || urlParams.get('phone');
        if (orderFromUrl) {
            const inputs = document.querySelectorAll('.om-order-track-input');
            inputs.forEach(i => i.value = orderFromUrl);
            trackOrder(orderFromUrl);
        } else {
            // Check session storage
            const saved = sessionStorage.getItem('om_last_order');
            if (saved) {
                const inputs = document.querySelectorAll('.om-order-track-input');
                inputs.forEach(i => i.value = saved);
            }
        }
    }

    function setFormLoading(form, loading) {
        const forms = form ? [form] : document.querySelectorAll('.om-order-track-form');
        forms.forEach(f => {
            const btn = f.querySelector('button[type="submit"]');
            if (!btn) return;
            if (loading) {
                btn.dataset.origHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Tracking...';
            } else {
                btn.disabled = false;
                if (btn.dataset.origHtml) {
                    btn.innerHTML = btn.dataset.origHtml;
                }
            }
        });
    }

    function trackOrder(searchTerm, sourceForm) {
        if (!searchTerm) return;
        const cleanTerm = searchTerm.trim();
        if (!cleanTerm) return;
        currentTrackingOrder = cleanTerm;
        sessionStorage.setItem('om_last_order', cleanTerm);

        setFormLoading(sourceForm, true);

        // Clear active polling
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }

        const encoded = encodeURIComponent(cleanTerm);
        const primaryEndpoint = `/api/orders/track?search=${encoded}&query=${encoded}&orderNumber=${encoded}&phone=${encoded}`;
        const fallbackEndpoint = `/api/track-order?search=${encoded}&query=${encoded}`;

        function parseOrderJson(res) {
            if (!res.ok) {
                return res.json().catch(() => ({})).then(errData => {
                    const msg = errData.error || errData.message || `Order not found (Status ${res.status})`;
                    const err = new Error(msg);
                    err.status = res.status;
                    throw err;
                });
            }
            return res.json();
        }

        fetch(primaryEndpoint, {
            headers: { 'Accept': 'application/json' }
        })
            .then(res => {
                if (res.status === 404) {
                    return fetch(fallbackEndpoint, { headers: { 'Accept': 'application/json' } })
                        .then(parseOrderJson);
                }
                return parseOrderJson(res);
            })
            .then(data => {
                const order = (data && data.data) ? data.data : data;
                if (!order || (!order.id && !order.order_number)) {
                    throw new Error("No order found matching '" + cleanTerm + "'. Please check your order number or phone.");
                }
                renderOrderResult(order);
                setFormLoading(sourceForm, false);

                // Setup auto-refresh if order is in progress
                const normStatus = (order.status || '').toLowerCase();
                if (normStatus === 'incoming' || normStatus === 'preparing' || normStatus === 'ready') {
                    startAutoPoll(cleanTerm);
                }
            })
            .catch(err => {
                renderError(err.message || 'Could not retrieve order details. Please check the order number or phone number.');
                setFormLoading(sourceForm, false);
            });
    }

    function startAutoPoll(searchTerm) {
        if (pollInterval) clearInterval(pollInterval);
        const encoded = encodeURIComponent(searchTerm);
        pollInterval = setInterval(() => {
            if (!currentTrackingOrder || currentTrackingOrder !== searchTerm) {
                clearInterval(pollInterval);
                return;
            }
            fetch(`/api/orders/track?search=${encoded}&query=${encoded}`, {
                headers: { 'Accept': 'application/json' }
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    const order = (data && data.data) ? data.data : data;
                    if (order) {
                        renderOrderResult(order, true);
                        const norm = (order.status || '').toLowerCase();
                        if (norm === 'served' || norm === 'completed' || norm === 'cancelled') {
                            clearInterval(pollInterval);
                        }
                    }
                })
                .catch(() => {});
        }, 10000);
    }

    function renderError(message) {
        const containers = document.querySelectorAll('.om-order-result-container');
        containers.forEach(c => {
            c.innerHTML = `
                <div class="card border-0 shadow-sm p-4 text-center my-4 bg-light rounded-4 om-fade-in">
                    <div class="mb-3">
                        <span class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle" style="width: 64px; height: 64px;">
                            <i class="fa fa-circle-exclamation fa-2x"></i>
                        </span>
                    </div>
                    <h5 class="fw-bold text-dark mb-2">Order Not Found</h5>
                    <p class="text-muted mb-3" style="max-width: 480px; margin: 0 auto;">${escapeHtml(message)}</p>
                    <div class="small text-muted">
                        <p class="mb-2"><strong>Tips:</strong></p>
                        <ul class="list-unstyled mb-0 d-inline-block text-start small">
                            <li><i class="fa fa-check text-primary me-2"></i>Verify your 4-digit order number (e.g. <strong>OM-1001</strong>).</li>
                            <li><i class="fa fa-check text-primary me-2"></i>Or enter the 10-digit mobile number given during ordering.</li>
                            <li><i class="fa fa-check text-primary me-2"></i>Need instant assistance? Call our reception desk at <strong>+91 93897 34344</strong>.</li>
                        </ul>
                    </div>
                </div>
            `;
            c.classList.remove('d-none');
        });
    }

    function renderOrderResult(order, isSilentPoll = false) {
        const containers = document.querySelectorAll('.om-order-result-container');
        if (containers.length === 0) return;

        const statusKey = (order.status || 'incoming').toLowerCase();
        const statusMeta = STATUS_MAP[statusKey] || STATUS_MAP.incoming;
        const currentStep = statusMeta.step;

        const isCancelled = statusKey === 'cancelled';
        const formattedTotal = Number(order.total_amount || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const diningTypeBadge = (order.order_type === 'takeaway')
            ? '<span class="badge bg-secondary text-white px-3 py-2 rounded-pill"><i class="fa fa-bag-shopping me-1"></i>Takeaway</span>'
            : `<span class="badge bg-dark text-white px-3 py-2 rounded-pill"><i class="fa fa-chair me-1"></i>Table ${escapeHtml(order.table_number || '-')} (${escapeHtml(order.zone || 'Dine-In')})</span>`;

        // Render Step Items
        const steps = [
            { num: 1, title: "Order Received", sub: "Kitchen Queued", icon: "fa-receipt" },
            { num: 2, title: "In Kitchen", sub: "Fresh Cooking", icon: "fa-fire-burner" },
            { num: 3, title: "Ready", sub: "Plated & Garnished", icon: "fa-bell-concierge" },
            { num: 4, title: "Served", sub: "Enjoy Meal", icon: "fa-utensils" }
        ];

        let stepperHtml = '';
        if (!isCancelled) {
            stepperHtml = `
                <div class="om-tracker-stepper mb-4">
                    <div class="d-flex justify-content-between position-relative om-stepper-track">
                        <div class="om-stepper-progress-bar" style="width: ${((currentStep - 1) / 3) * 100}%;"></div>
                        ${steps.map(s => {
                            const isDone = currentStep > s.num;
                            const isActive = currentStep === s.num;
                            const stateClass = isDone ? 'is-done' : (isActive ? 'is-active' : 'is-pending');
                            return `
                                <div class="om-step-node ${stateClass} text-center">
                                    <div class="om-step-circle mx-auto mb-2">
                                        <i class="fa ${isDone ? 'fa-check' : s.icon}"></i>
                                    </div>
                                    <div class="om-step-title fw-bold">${s.title}</div>
                                    <div class="om-step-sub text-muted small d-none d-sm-block">${s.sub}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } else {
            stepperHtml = `
                <div class="alert alert-danger d-flex align-items-center rounded-3 p-3 mb-4" role="alert">
                    <i class="fa fa-circle-xmark fa-2x me-3 flex-shrink-0"></i>
                    <div>
                        <h6 class="alert-heading fw-bold mb-1">Order Cancelled</h6>
                        <p class="mb-0 small">${escapeHtml(statusMeta.desc)}</p>
                    </div>
                </div>
            `;
        }

        // Render Items
        const items = order.items || [];
        const itemsHtml = items.map(item => {
            const stn = (item.station || 'curry').toLowerCase();
            const stnInfo = STATION_LABELS[stn] || { name: item.category || 'Kitchen', icon: 'fa-utensils' };
            const itemPrice = Number(item.unit_price || 0).toLocaleString('en-IN');
            const itemSubtotal = (Number(item.unit_price || 0) * (item.quantity || 1)).toLocaleString('en-IN');

            let itemStatusBadge = '';
            const iStatus = (item.item_status || 'pending').toLowerCase();
            if (iStatus === 'done') {
                itemStatusBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill"><i class="fa fa-check me-1"></i>Done</span>';
            } else if (iStatus === 'cooking') {
                itemStatusBadge = '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill"><i class="fa fa-spinner fa-spin me-1"></i>Cooking</span>';
            } else {
                itemStatusBadge = '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill"><i class="fa fa-clock me-1"></i>Queued</span>';
            }

            return `
                <div class="om-order-item-row p-3 border-bottom d-flex align-items-center justify-content-between gap-3">
                    <div class="d-flex align-items-center gap-3">
                        <span class="om-veg-leaf-icon" title="100% Pure Vegetarian">🟢</span>
                        <div>
                            <div class="fw-bold text-dark">${escapeHtml(item.dish_name)}</div>
                            <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">
                                <span class="badge bg-light text-muted border small"><i class="fa ${stnInfo.icon} text-primary me-1"></i>${escapeHtml(stnInfo.name)}</span>
                                ${item.spice_level ? `<span class="badge bg-light text-muted border small">Spice: ${escapeHtml(item.spice_level)}</span>` : ''}
                                ${item.notes ? `<span class="small text-muted fst-italic">"${escapeHtml(item.notes)}"</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-end text-nowrap">
                        <div class="fw-bold text-dark">&#8377;${itemSubtotal} <small class="text-muted fw-normal">(${item.quantity} × &#8377;${itemPrice})</small></div>
                        <div class="mt-1">${itemStatusBadge}</div>
                    </div>
                </div>
            `;
        }).join('');

        const orderHtml = `
            <div class="card border-0 shadow-lg rounded-4 overflow-hidden om-order-card my-4 ${isSilentPoll ? '' : 'om-fade-in'}">
                <!-- Card Header -->
                <div class="card-header bg-dark text-white p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                        <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                            <span class="fs-4 fw-bold text-primary font-monospace">${escapeHtml(order.order_number)}</span>
                            ${diningTypeBadge}
                            <span class="badge ${statusMeta.badgeClass} px-3 py-2 rounded-pill fw-bold">
                                <i class="fa ${statusMeta.icon} me-1"></i>${statusMeta.label}
                            </span>
                        </div>
                        <div class="small text-white-50">
                            Placed for <strong>${escapeHtml(order.customer_name || 'Valued Guest')}</strong>
                            ${order.customer_phone ? `· <i class="fa fa-phone small me-1"></i>${escapeHtml(order.customer_phone)}` : ''}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-white bg-opacity-10 text-white-50 small d-none d-md-inline-flex align-items-center gap-1">
                            <span class="om-live-pulse-dot"></span>Live Sync
                        </span>
                        <button type="button" class="btn btn-sm btn-outline-light rounded-pill px-3 om-track-refresh-btn" title="Refresh order status">
                            <i class="fa fa-rotate me-1"></i>Refresh
                        </button>
                    </div>
                </div>

                <!-- Card Body -->
                <div class="card-body p-4 p-md-5 bg-white">
                    <!-- Progress Stepper -->
                    ${stepperHtml}

                    <div class="row g-4 mt-2">
                        <!-- Left: Order Details & Special Notes -->
                        <div class="col-lg-5">
                            <div class="p-4 bg-light rounded-4 h-100 border">
                                <h6 class="fw-bold text-dark text-uppercase small tracking-wide mb-3">
                                    <i class="fa fa-circle-info text-primary me-2"></i>Order Information
                                </h6>
                                <div class="d-flex justify-content-between py-2 border-bottom small">
                                    <span class="text-muted">Order ID:</span>
                                    <span class="fw-semibold text-dark font-monospace">#${order.id}</span>
                                </div>
                                <div class="d-flex justify-content-between py-2 border-bottom small">
                                    <span class="text-muted">Dining Option:</span>
                                    <span class="fw-semibold text-dark text-capitalize">${escapeHtml((order.order_type || 'dine_in').replace('_', ' '))}</span>
                                </div>
                                ${order.table_number ? `
                                <div class="d-flex justify-content-between py-2 border-bottom small">
                                    <span class="text-muted">Table / Zone:</span>
                                    <span class="fw-semibold text-dark">Table ${escapeHtml(order.table_number)} (${escapeHtml(order.zone || 'Main')})</span>
                                </div>` : ''}
                                <div class="d-flex justify-content-between py-2 border-bottom small">
                                    <span class="text-muted">Party Size:</span>
                                    <span class="fw-semibold text-dark">${order.guest_count || 1} ${order.guest_count > 1 ? 'Guests' : 'Guest'}</span>
                                </div>
                                <div class="d-flex justify-content-between py-2 border-bottom small">
                                    <span class="text-muted">Payment:</span>
                                    <span class="badge ${order.payment_status === 'paid' ? 'bg-success' : 'bg-warning text-dark'} text-uppercase small">${escapeHtml(order.payment_status || 'pending')}</span>
                                </div>
                                ${order.special_notes ? `
                                <div class="mt-3 p-3 bg-white rounded-3 border">
                                    <span class="text-muted small d-block mb-1"><i class="fa fa-comment-dots text-primary me-1"></i>Special Chef Note:</span>
                                    <span class="small fw-semibold text-dark fst-italic">"${escapeHtml(order.special_notes)}"</span>
                                </div>` : ''}

                                <div class="mt-4 p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25 text-success small d-flex align-items-center gap-2">
                                    <i class="fa fa-leaf fa-lg flex-shrink-0"></i>
                                    <span><strong>100% Pure Vegetarian Assurance:</strong> Zero meat, zero eggs, strictly pure ghee and fresh dairy since 1942.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Dish Itemization -->
                        <div class="col-lg-7">
                            <div class="border rounded-4 overflow-hidden">
                                <div class="p-3 bg-light border-bottom d-flex align-items-center justify-content-between">
                                    <h6 class="fw-bold text-dark text-uppercase small tracking-wide mb-0">
                                        <i class="fa fa-utensils text-primary me-2"></i>Ordered Dishes (${items.length})
                                    </h6>
                                    <span class="small text-muted">Freshly Prepared</span>
                                </div>
                                <div class="om-order-items-scroll">
                                    ${itemsHtml || '<div class="p-4 text-center text-muted">No items itemized.</div>'}
                                </div>
                                <div class="p-4 bg-light border-top d-flex align-items-center justify-content-between">
                                    <span class="fs-5 fw-bold text-dark">Total Bill Amount:</span>
                                    <span class="fs-4 fw-bold text-primary font-monospace">&#8377;${formattedTotal}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card Footer Support Note -->
                <div class="card-footer bg-light p-3 px-4 border-top text-center text-md-start d-flex flex-wrap align-items-center justify-content-between gap-2 small text-muted">
                    <div>
                        <i class="fa fa-clock text-primary me-1"></i>Preparation Time: Freshly cooked on order. Need changes? Inform your server immediately.
                    </div>
                    <div>
                        Need Help? <a href="tel:+919389734344" class="text-primary fw-bold text-decoration-none"><i class="fa fa-phone me-1"></i>+91 93897 34344</a>
                    </div>
                </div>
            </div>
        `;

        containers.forEach(c => {
            c.innerHTML = orderHtml;
            c.classList.remove('d-none');
        });

        // If not silent poll and container is not in view, scroll gently
        if (!isSilentPoll) {
            const firstContainer = containers[0];
            if (firstContainer) {
                firstContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    // Expose to window for external triggers
    window.OmOrderTracker = {
        track: trackOrder,
        refresh: () => {
            if (currentTrackingOrder) trackOrder(currentTrackingOrder);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOrderTracker);
    } else {
        initOrderTracker();
    }
})();
