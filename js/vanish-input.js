/**
 * OmRestaurant — Vanish Input & Particle Disintegration System
 * Recreated from @skiper-ui/skiper56 (Devouring Details / VanishForm / Aceternity UI)
 *
 * Decomposes input text into an animated HTML5 Canvas particle system via ctx.getImageData().
 * On submission, the text disintegrates into hundreds of radiant golden particles
 * that burst, float outward with glowing dispersion, and vanish into thin air.
 * Also provides multi-placeholder rotating transitions when the input is idle.
 */
(function () {
    "use strict";

    var reducedMotion = Boolean(
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    var DEFAULT_PLACEHOLDERS = [
        "Enter your email for secret recipes...",
        "Claim 15% off your first table reservation...",
        "Get exclusive chef specials every Friday...",
        "Join 2,400+ food lovers in Khurja...",
        "Stay updated with OmRestaurant..."
    ];

    var BRAND_COLORS = [
        "rgba(254, 161, 22, 1)",   // Vibrant brand gold #FEA116
        "rgba(253, 107, 16, 1)",   // Table accent orange #FD6B10
        "rgba(255, 210, 125, 1)",  // Warm gold
        "rgba(255, 255, 255, 1)",  // White incandescent
        "rgba(254, 240, 138, 1)"   // Soft yellow highlight
    ];

    /**
     * Trigger the signature Skiper56 text-vanish particle explosion on an input element.
     * @param {HTMLInputElement} inputEl
     * @param {Function} [onComplete]
     */
    function triggerVanish(inputEl, onComplete) {
        if (!inputEl) {
            if (typeof onComplete === "function") onComplete();
            return;
        }

        var text = inputEl.value || "";
        if (!text.trim() || reducedMotion) {
            inputEl.value = "";
            if (typeof onComplete === "function") onComplete();
            return;
        }

        var rect = inputEl.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            inputEl.value = "";
            if (typeof onComplete === "function") onComplete();
            return;
        }

        var wrapper = inputEl.closest(".position-relative, .om-vanish-wrap") || inputEl.parentElement;
        if (!wrapper) {
            inputEl.value = "";
            if (typeof onComplete === "function") onComplete();
            return;
        }

        // Ensure wrapper has relative positioning
        var wrapStyle = window.getComputedStyle(wrapper);
        if (wrapStyle.position === "static") {
            wrapper.style.position = "relative";
        }

        // Measure input styling accurately
        var computed = window.getComputedStyle(inputEl);
        var inputRect = inputEl.getBoundingClientRect();
        var wrapperRect = wrapper.getBoundingClientRect();

        var offsetLeft = inputRect.left - wrapperRect.left;
        var offsetTop = inputRect.top - wrapperRect.top;
        var width = inputRect.width;
        var height = inputRect.height;

        var dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Create overlay canvas
        var canvas = document.createElement("canvas");
        canvas.className = "om-vanish-canvas";
        canvas.style.position = "absolute";
        canvas.style.left = offsetLeft + "px";
        canvas.style.top = offsetTop + "px";
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "25";
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        wrapper.appendChild(canvas);

        var ctx = canvas.getContext("2d");
        if (!ctx) {
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            inputEl.value = "";
            if (typeof onComplete === "function") onComplete();
            return;
        }

        // Draw the text onto offscreen buffer at high resolution
        ctx.scale(dpr, dpr);
        ctx.font = computed.font || (computed.fontWeight + " " + computed.fontSize + " " + computed.fontFamily);
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";

        var padLeft = parseFloat(computed.paddingLeft) || 16;
        var centerY = height / 2;

        ctx.fillStyle = computed.color && computed.color !== "rgba(0, 0, 0, 0)" ? computed.color : "#FEA116";
        ctx.fillText(text, padLeft, centerY);

        // Sample pixel data to extract particles
        var imgData = ctx.getImageData(0, 0, Math.round(width * dpr), Math.round(height * dpr));
        var data = imgData.data;
        var particles = [];

        var step = Math.max(2, Math.round(2 * dpr));
        var imgW = Math.round(width * dpr);
        var imgH = Math.round(height * dpr);

        for (var y = 0; y < imgH; y += step) {
            for (var x = 0; x < imgW; x += step) {
                var idx = (y * imgW + x) * 4;
                var alpha = data[idx + 3];
                if (alpha > 45) {
                    var px = x / dpr;
                    var py = y / dpr;
                    var angle = (Math.random() * Math.PI * 2);
                    var speed = Math.random() * 3.5 + 1.2;

                    var color = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];

                    particles.push({
                        x: px,
                        y: py,
                        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
                        vy: -Math.abs(Math.sin(angle) * speed * 1.5) - Math.random() * 2.5 - 0.5, // Natural upward & outward lift
                        r: Math.random() * 1.8 + 1.1,
                        alpha: 1,
                        fade: Math.random() * 0.022 + 0.018,
                        decay: 0.965,
                        color: color
                    });
                }
            }
        }

        // Immediately hide original text so it appears to dissolve into particles
        inputEl.style.color = "transparent";
        inputEl.value = "";

        // Particle physics animation loop
        var animId = 0;
        var startTime = performance.now();
        var maxDuration = 1100; // ms safety timeout

        function renderFrame(now) {
            ctx.clearRect(0, 0, width, height);

            var alive = 0;
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (p.alpha <= 0.01) continue;
                alive++;

                // Physics
                p.vx *= p.decay;
                p.vy *= p.decay;
                p.vy -= 0.04; // Gentle hot-air thermal lift
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.fade;
                p.r = Math.max(0.3, p.r * 0.98);

                // Render glowing particle dot
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            if (alive > 0 && now - startTime < maxDuration) {
                animId = requestAnimationFrame(renderFrame);
            } else {
                cleanup();
            }
        }

        function cleanup() {
            if (animId) cancelAnimationFrame(animId);
            ctx.clearRect(0, 0, width, height);
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            inputEl.style.color = "";
            if (typeof onComplete === "function") {
                onComplete();
            }
        }

        animId = requestAnimationFrame(renderFrame);
    }

    /**
     * Enhance an input field with Skiper56 rotating dynamic placeholders.
     * @param {HTMLInputElement} inputEl
     * @param {string[]} [placeholders]
     */
    function attachRotatingPlaceholders(inputEl, placeholders) {
        if (!inputEl || inputEl.dataset.omVanishPlaceholders === "true") return;
        inputEl.dataset.omVanishPlaceholders = "true";

        var list = Array.isArray(placeholders) && placeholders.length ? placeholders : DEFAULT_PLACEHOLDERS;
        var wrapper = inputEl.closest(".position-relative, .om-vanish-wrap") || inputEl.parentElement;
        if (!wrapper) return;

        // Ensure wrapper has relative positioning
        var wrapStyle = window.getComputedStyle(wrapper);
        if (wrapStyle.position === "static") {
            wrapper.style.position = "relative";
        }

        var label = document.createElement("span");
        label.className = "om-vanish-placeholder";
        label.setAttribute("aria-hidden", "true");
        label.textContent = list[0];

        // Measure text padding for accurate vertical & horizontal alignment
        var computed = window.getComputedStyle(inputEl);
        var padLeft = computed.paddingLeft || "16px";
        label.style.left = padLeft;

        wrapper.appendChild(label);

        // Keep real placeholder blank so custom animated text displays cleanly
        var originalPlaceholder = inputEl.getAttribute("placeholder") || "";
        inputEl.dataset.omOrigPlaceholder = originalPlaceholder;
        inputEl.setAttribute("placeholder", "");

        var index = 0;
        var intervalId = 0;

        function updatePlaceholderVisibility() {
            var hasVal = Boolean(inputEl.value && inputEl.value.trim().length > 0);
            var isFocused = document.activeElement === inputEl;
            if (hasVal || (isFocused && inputEl.value.length > 0)) {
                label.classList.add("is-hidden");
            } else {
                label.classList.remove("is-hidden");
            }
        }

        function cycleNext() {
            if (document.hidden || !document.body.contains(inputEl)) return;
            if (inputEl.value && inputEl.value.trim().length > 0) return;

            label.classList.add("is-sliding-out");
            window.setTimeout(function () {
                index = (index + 1) % list.length;
                label.textContent = list[index];
                label.classList.remove("is-sliding-out");
                label.classList.add("is-sliding-in");
                window.setTimeout(function () {
                    label.classList.remove("is-sliding-in");
                }, 280);
            }, 240);
        }

        intervalId = window.setInterval(cycleNext, 3400);

        inputEl.addEventListener("input", updatePlaceholderVisibility);
        inputEl.addEventListener("focus", function () {
            if (inputEl.value) {
                label.classList.add("is-hidden");
            }
        });
        inputEl.addEventListener("blur", updatePlaceholderVisibility);

        updatePlaceholderVisibility();
    }

    /**
     * Wire up any newsletter subscription form with Skiper56 vanish effect.
     * @param {HTMLFormElement} formEl
     */
    function attachVanishForm(formEl) {
        if (!formEl || formEl.dataset.omVanishBound === "true") return;
        formEl.dataset.omVanishBound = "true";

        var inputEl = formEl.querySelector("input[type='email'], input[name='email'], .om-vanish-input");
        if (!inputEl) return;

        attachRotatingPlaceholders(inputEl);

        var isVanishing = false;

        formEl.addEventListener("submit", function (event) {
            var val = (inputEl.value || "").trim();
            if (!val || isVanishing) return;

            // Simple basic email pattern check before triggering explosion
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                return; // Let standard validation handle error messaging
            }

            // Valid submission: intercept submit event, play particle vanish explosion, then fire native / EmailJS submit
            event.preventDefault();
            event.stopImmediatePropagation();
            isVanishing = true;

            var submitBtn = formEl.querySelector("button[type='submit']");
            if (submitBtn) {
                submitBtn.classList.add("om-btn-pulse-burst");
            }

            triggerVanish(inputEl, function () {
                isVanishing = false;
                if (submitBtn) {
                    submitBtn.classList.remove("om-btn-pulse-burst");
                    var origBtnText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<i class="fa fa-check me-1"></i>Subscribed!';
                    submitBtn.classList.remove("btn-primary");
                    submitBtn.classList.add("btn-success");
                    setTimeout(function () {
                        submitBtn.innerHTML = origBtnText;
                        submitBtn.classList.remove("btn-success");
                        submitBtn.classList.add("btn-primary");
                    }, 3000);
                }

                // Show inline success message
                var feedbackEl = formEl.querySelector(".om-newsletter-feedback");
                if (!feedbackEl) {
                    feedbackEl = document.createElement("div");
                    feedbackEl.className = "om-newsletter-feedback mt-2 text-warning small fw-semibold text-center";
                    formEl.appendChild(feedbackEl);
                }
                feedbackEl.innerHTML = '<i class="fa fa-check-circle text-success me-1"></i>Thanks for subscribing! Check your inbox soon.';
                setTimeout(function () {
                    if (feedbackEl) feedbackEl.innerHTML = "";
                }, 5000);

                // Show toast notification
                showNewsletterToast("Thanks for subscribing! We'll keep you updated with exclusive offers.");

                // If EmailJS is present and handles form, dispatch custom event or submit
                var syntheticEvent = new Event("submit", { bubbles: true, cancelable: true });
                formEl.dataset.omVanishDone = "true";
                formEl.dispatchEvent(syntheticEvent);
            });
        }, true); // Capture phase to preempt normal handlers during particle animation
    }

    function showNewsletterToast(msg) {
        var container = document.getElementById("omNewsletterToastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "omNewsletterToastContainer";
            container.className = "position-fixed bottom-0 end-0 p-3";
            container.style.zIndex = "1099";
            document.body.appendChild(container);
        }

        var toast = document.createElement("div");
        toast.className = "toast align-items-center text-white border-0 shadow-lg show mb-2";
        toast.style.background = "#0F172B";
        toast.style.borderLeft = "4px solid #16A34A";
        toast.style.borderRadius = "10px";
        toast.style.minWidth = "280px";
        toast.innerHTML = 
            '<div class="d-flex align-items-center p-3">' +
                '<i class="fa fa-check-circle text-success fa-lg me-3"></i>' +
                '<div class="flex-grow-1">' +
                    '<strong class="d-block text-white">Subscribed!</strong>' +
                    '<small class="text-white-50">' + msg + '</small>' +
                '</div>' +
                '<button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close"></button>' +
            '</div>';

        container.appendChild(toast);
        toast.querySelector(".btn-close").addEventListener("click", function () {
            toast.remove();
        });

        setTimeout(function () {
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.4s ease";
            setTimeout(function () { toast.remove(); }, 400);
        }, 4000);
    }

    function init() {
        // Auto-attach to all newsletter subscription forms
        document.querySelectorAll("form[action*='newsletter'], [data-om-vanish-form]").forEach(attachVanishForm);

        // Auto-attach to inputs explicitly marked with data-om-vanish
        document.querySelectorAll("input[data-om-vanish='true']").forEach(function (inp) {
            attachRotatingPlaceholders(inp);
            var parentForm = inp.closest("form");
            if (parentForm) attachVanishForm(parentForm);
        });
    }

    window.OMVanishInput = {
        init: init,
        vanish: triggerVanish,
        attachRotatingPlaceholders: attachRotatingPlaceholders,
        attachVanishForm: attachVanishForm
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
