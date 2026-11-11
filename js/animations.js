(function () {
    "use strict";

    var reducedMotion = Boolean(
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    var hasFinePointer = Boolean(
        window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
    var hasGsap = typeof window.gsap !== "undefined";

    /* -------------------------------------------------------------------------
     * 1. Toast Notification System (replaces window.alert with accessible toasts)
     * ---------------------------------------------------------------------- */
    var TOAST_ICONS = {
        success: "fa-check-circle",
        error: "fa-exclamation-circle",
        info: "fa-info-circle"
    };

    function getToastContainer() {
        var container = document.getElementById("om-toast-container");
        if (container) return container;

        container = document.createElement("div");
        container.id = "om-toast-container";
        container.className = "om-toast-container";
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "true");
        document.body.appendChild(container);
        return container;
    }

    /**
     * Display a non-blocking, accessible toast notification.
     * @param {string} message - Plain text notification message.
     * @param {"success"|"error"|"info"} [type="info"] - Visual style variant.
     * @param {number} [duration=4800] - Auto-dismiss delay in milliseconds.
     */
    function showOmToast(message, type, duration) {
        if (!message) return;
        if (!document.body) {
            window.addEventListener("DOMContentLoaded", function () {
                showOmToast(message, type, duration);
            }, { once: true });
            return;
        }

        var variant = type === "success" || type === "error" ? type : "info";
        var dismissAfter = typeof duration === "number" && duration > 0 ? duration : 4800;
        var container = getToastContainer();

        var toast = document.createElement("div");
        toast.className = "om-toast om-toast--" + variant;
        toast.setAttribute("role", variant === "error" ? "alert" : "status");

        var iconWrap = document.createElement("span");
        iconWrap.className = "om-toast__icon";
        iconWrap.setAttribute("aria-hidden", "true");
        var icon = document.createElement("i");
        icon.className = "fas " + (TOAST_ICONS[variant] || TOAST_ICONS.info);
        iconWrap.appendChild(icon);

        var body = document.createElement("div");
        body.className = "om-toast__body";
        body.textContent = String(message);

        var closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "om-toast__close";
        closeBtn.setAttribute("aria-label", "Close notification");
        closeBtn.innerHTML = "&times;";

        var progress = document.createElement("span");
        progress.className = "om-toast__progress";
        progress.setAttribute("aria-hidden", "true");

        toast.appendChild(iconWrap);
        toast.appendChild(body);
        toast.appendChild(closeBtn);
        toast.appendChild(progress);
        container.appendChild(toast);

        var dismissed = false;
        var timerId = 0;
        var remaining = dismissAfter;
        var startedAt = Date.now();

        function removeToast() {
            if (dismissed) return;
            dismissed = true;
            window.clearTimeout(timerId);

            if (hasGsap && !reducedMotion) {
                window.gsap.to(toast, {
                    opacity: 0,
                    x: 42,
                    scale: 0.96,
                    duration: 0.28,
                    ease: "power2.in",
                    onComplete: function () {
                        toast.remove();
                    }
                });
            } else {
                toast.remove();
            }
        }

        function startTimer() {
            startedAt = Date.now();
            window.clearTimeout(timerId);
            timerId = window.setTimeout(removeToast, remaining);
            progress.style.animationPlayState = "running";
        }

        function pauseTimer() {
            window.clearTimeout(timerId);
            remaining = Math.max(300, remaining - (Date.now() - startedAt));
            progress.style.animationPlayState = "paused";
        }

        progress.style.animationDuration = dismissAfter + "ms";
        closeBtn.addEventListener("click", removeToast);
        toast.addEventListener("mouseenter", pauseTimer);
        toast.addEventListener("mouseleave", startTimer);
        toast.addEventListener("focusin", pauseTimer);
        toast.addEventListener("focusout", startTimer);

        if (hasGsap && !reducedMotion) {
            window.gsap.fromTo(
                toast,
                { opacity: 0, x: 48, scale: 0.96 },
                { opacity: 1, x: 0, scale: 1, duration: 0.42, ease: "power3.out" }
            );
        } else {
            toast.classList.add("is-visible");
        }

        startTimer();
    }

    window.showOmToast = showOmToast;

    /* -------------------------------------------------------------------------
     * 2. Smooth Page Transitions (Progress bar + subtle dark veil)
     * ---------------------------------------------------------------------- */
    function initPageTransitions() {
        if (reducedMotion) return;

        var bar = document.createElement("div");
        bar.id = "om-page-progress";
        bar.className = "om-page-progress";
        bar.setAttribute("aria-hidden", "true");

        var veil = document.createElement("div");
        veil.id = "om-page-veil";
        veil.className = "om-page-veil";
        veil.setAttribute("aria-hidden", "true");

        document.body.appendChild(bar);
        document.body.appendChild(veil);

        var isNavigating = false;

        function resetTransitionState() {
            isNavigating = false;
            veil.classList.remove("is-active");
            bar.classList.remove("is-active", "is-done");
            bar.style.transform = "scaleX(0)";
            bar.style.opacity = "0";
        }

        // Handle back/forward cache (bfcache) restoration cleanly
        window.addEventListener("pageshow", resetTransitionState);

        document.addEventListener("click", function (event) {
            var link = event.target.closest("a[href]");
            if (!link || event.defaultPrevented || event.button !== 0 ||
                event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
                link.target || link.hasAttribute("download") ||
                link.hasAttribute("data-bs-toggle")) {
                return;
            }

            var rawHref = (link.getAttribute("href") || "").trim();
            if (!rawHref || rawHref.charAt(0) === "#" ||
                rawHref.indexOf("mailto:") === 0 ||
                rawHref.indexOf("tel:") === 0 ||
                rawHref.indexOf("javascript:") === 0) {
                return;
            }

            var destination;
            try {
                destination = new URL(link.href, window.location.href);
            } catch (_) {
                return;
            }

            if (destination.origin !== window.location.origin) {
                return;
            }

            // Do not hijack same-page hash navigation
            if (destination.pathname === window.location.pathname && destination.hash) {
                return;
            }

            if (isNavigating) {
                event.preventDefault();
                return;
            }

            event.preventDefault();
            isNavigating = true;

            bar.style.opacity = "1";
            bar.classList.add("is-active");
            veil.classList.add("is-active");

            window.setTimeout(function () {
                window.location.href = destination.href;
            }, 190);
        });
    }

    /* -------------------------------------------------------------------------
     * 3. Word-Mask Split Text Helper (preserves <br>, <i>, and screen readers)
     * ---------------------------------------------------------------------- */
    function splitTextNodesIntoMasks(element) {
        if (!element || element.dataset.omSplit === "true") {
            return Array.prototype.slice.call(element ? element.querySelectorAll(".om-mask-word") : []);
        }

        var originalText = Array.prototype.map
            .call(element.childNodes, function (child) {
                if (child.nodeName === "BR") return " ";
                return child.textContent || "";
            })
            .join("")
            .replace(/\s+/g, " ")
            .trim();
        if (originalText && !element.getAttribute("aria-label")) {
            element.setAttribute("aria-label", originalText);
        }

        var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        var textNodes = [];
        var current;
        while ((current = walker.nextNode())) {
            if (current.nodeValue && current.nodeValue.trim().length > 0) {
                textNodes.push(current);
            }
        }

        var wordSpans = [];
        textNodes.forEach(function (node) {
            var tokens = node.nodeValue.split(/(\s+)/);
            var fragment = document.createDocumentFragment();

            tokens.forEach(function (token) {
                if (!token) return;
                if (/^\s+$/.test(token)) {
                    fragment.appendChild(document.createTextNode(token));
                    return;
                }

                var mask = document.createElement("span");
                mask.className = "om-mask-wrap";
                mask.setAttribute("aria-hidden", "true");

                var word = document.createElement("span");
                word.className = "om-mask-word";
                word.textContent = token;

                mask.appendChild(word);
                fragment.appendChild(mask);
                wordSpans.push(word);
            });

            if (node.parentNode) {
                node.parentNode.replaceChild(fragment, node);
            }
        });

        element.dataset.omSplit = "true";
        return wordSpans;
    }

    /* -------------------------------------------------------------------------
     * 4. Hero & Section Title Text Reveal (Animmaster-inspired)
     * ---------------------------------------------------------------------- */
    function initTextReveals() {
        if (!hasGsap || reducedMotion) return;

        var heroHeading = document.querySelector(".hero-header h1");
        if (heroHeading) {
            heroHeading.classList.remove("animated", "slideInLeft", "slideInDown");
            var heroWords = splitTextNodesIntoMasks(heroHeading);
            if (heroWords.length) {
                window.gsap.fromTo(
                    heroWords,
                    { yPercent: 115, opacity: 0, clipPath: "inset(0 0 100% 0)" },
                    {
                        yPercent: 0,
                        opacity: 1,
                        clipPath: "inset(0 0 0% 0)",
                        duration: 0.72,
                        stagger: 0.055,
                        ease: "power3.out",
                        clearProps: "clipPath,transform"
                    }
                );
            }
        }

        var sectionTitles = Array.prototype.slice.call(document.querySelectorAll(".section-title"));
        if (!sectionTitles.length) return;

        var titleWordsMap = new Map();
        sectionTitles.forEach(function (titleEl) {
            var words = splitTextNodesIntoMasks(titleEl);
            if (words.length) {
                window.gsap.set(words, { yPercent: 105, opacity: 0 });
                titleWordsMap.set(titleEl, words);
            }
        });

        function revealTitle(titleEl) {
            if (titleEl.dataset.omTitleDone === "true") return;
            titleEl.dataset.omTitleDone = "true";
            var words = titleWordsMap.get(titleEl);
            if (!words || !words.length) return;
            window.gsap.to(words, {
                yPercent: 0,
                opacity: 1,
                duration: 0.58,
                stagger: 0.05,
                ease: "power3.out",
                clearProps: "transform"
            });
        }

        if (!("IntersectionObserver" in window)) {
            sectionTitles.forEach(revealTitle);
            return;
        }

        var titleObserver = new IntersectionObserver(
            function (entries, obs) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    revealTitle(entry.target);
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0.2, rootMargin: "0px 0px -30px 0px" }
        );

        sectionTitles.forEach(function (titleEl) {
            var rect = titleEl.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight * 0.92) {
                revealTitle(titleEl);
            } else {
                titleObserver.observe(titleEl);
            }
        });
    }

    /* -------------------------------------------------------------------------
     * 5. Scroll-Triggered Staggered Reveals (IntersectionObserver + GSAP)
     * ---------------------------------------------------------------------- */
    function initScrollReveals() {
        var revealNodes = Array.prototype.slice.call(document.querySelectorAll(".om-reveal"));
        if (!revealNodes.length || !hasGsap || reducedMotion) {
            return;
        }

        function getInitialVars(el) {
            var variant = el.getAttribute("data-om-reveal") || "up";
            if (variant === "zoom") {
                return { opacity: 0, scale: 0.92, y: 18 };
            }
            if (variant === "fade") {
                return { opacity: 0, y: 10 };
            }
            return { opacity: 0, y: 28 };
        }

        function isVisibleElement(el) {
            return el.offsetParent !== null || window.getComputedStyle(el).position === "fixed";
        }

        function animateReveal(el, delaySeconds, durationSeconds) {
            if (el.dataset.omRevealed === "true") return;
            el.dataset.omRevealed = "true";

            window.gsap.to(el, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: durationSeconds || 0.72,
                delay: delaySeconds,
                ease: "power3.out",
                clearProps: "transform"
            });
        }

        // Prime unseen elements cleanly; items inside inactive Bootstrap tabs are handled on tab switch
        revealNodes.forEach(function (el) {
            var vars = getInitialVars(el);
            window.gsap.set(el, vars);
        });

        if (!("IntersectionObserver" in window)) {
            revealNodes.forEach(function (el, idx) {
                animateReveal(el, Math.min(idx * 0.04, 0.35));
            });
            return;
        }

        var revealObserver = new IntersectionObserver(
            function (entries, obs) {
                var batchIndex = 0;
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    var el = entry.target;
                    var attrDelay = parseFloat(el.getAttribute("data-om-delay") || "0");
                    var staggerDelay = !isNaN(attrDelay) && attrDelay > 0 ? attrDelay : Math.min(batchIndex * 0.08, 0.4);
                    batchIndex += 1;
                    animateReveal(el, staggerDelay);
                    obs.unobserve(el);
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
        );

        revealNodes.forEach(function (el) {
            if (!isVisibleElement(el)) {
                revealObserver.observe(el);
                return;
            }
            var rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.94) {
                var attrDelay = parseFloat(el.getAttribute("data-om-delay") || "0");
                animateReveal(el, !isNaN(attrDelay) ? attrDelay : 0);
            } else {
                revealObserver.observe(el);
            }
        });

        // Reveal menu items cleanly when switching Bootstrap tabs
        document.addEventListener("shown.bs.tab", function (event) {
            var trigger = event.target;
            var targetSelector = trigger && (trigger.getAttribute("href") || trigger.getAttribute("data-bs-target"));
            if (!targetSelector || targetSelector.charAt(0) !== "#") return;
            var pane = document.querySelector(targetSelector);
            if (!pane) return;

            var items = Array.prototype.slice.call(pane.querySelectorAll(".om-reveal"));
            items.forEach(function (item, index) {
                if (item.dataset.omRevealed === "true") {
                    window.gsap.fromTo(
                        item,
                        { opacity: 0, y: 18 },
                        { opacity: 1, y: 0, duration: 0.42, delay: Math.min(index * 0.04, 0.24), ease: "power2.out", clearProps: "transform" }
                    );
                } else {
                    animateReveal(item, Math.min(index * 0.04, 0.24), 0.45);
                    revealObserver.unobserve(item);
                }
            });
        });
    }

    /* -------------------------------------------------------------------------
     * 6. GSAP-Driven Counter Animation (index.html & about.html)
     * ---------------------------------------------------------------------- */
    function initCounters() {
        var counters = Array.prototype.slice.call(document.querySelectorAll('[data-toggle="counter-up"]'));
        if (!counters.length) return;

        function runCounter(el) {
            if (el.dataset.omCounted === "true") return;
            el.dataset.omCounted = "true";

            var raw = (el.textContent || "").replace(/[^\d]/g, "");
            var target = parseInt(raw, 10);
            if (isNaN(target)) return;

            if (!hasGsap || reducedMotion) {
                el.textContent = String(target);
                return;
            }

            var state = { value: 0 };
            el.textContent = "0";
            window.gsap.to(state, {
                value: target,
                duration: 1.8,
                ease: "power2.out",
                onUpdate: function () {
                    el.textContent = String(Math.round(state.value));
                },
                onComplete: function () {
                    el.textContent = String(target);
                }
            });
        }

        if (!("IntersectionObserver" in window)) {
            counters.forEach(runCounter);
            return;
        }

        var counterObserver = new IntersectionObserver(
            function (entries, obs) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    runCounter(entry.target);
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0.35 }
        );

        counters.forEach(function (el) {
            counterObserver.observe(el);
        });
    }

    /* -------------------------------------------------------------------------
     * 7. Magnetic Spring Hover on CTA Buttons & Video Play Button (Vengeance UI)
     * ---------------------------------------------------------------------- */
    function initMagneticButtons() {
        if (!hasFinePointer || !hasGsap || reducedMotion) return;

        var ctaButtons = Array.prototype.slice.call(
            document.querySelectorAll(".btn-primary:not(.btn-square):not(.position-absolute):not(.back-to-top)")
        );

        ctaButtons.forEach(function (btn) {
            var animClasses = ["animated", "slideInLeft", "slideInRight", "slideInDown", "slideInUp", "fadeInUp", "fadeIn", "zoomIn"];
            var clearAnimClasses = function () {
                btn.classList.remove.apply(btn.classList, animClasses);
            };
            btn.addEventListener("animationend", clearAnimClasses, { once: true });

            var isFullWidth = btn.classList.contains("w-100");
            var maxX = isFullWidth ? 4 : 9;
            var maxY = isFullWidth ? 4 : 7;

            btn.addEventListener("mousemove", function (event) {
                clearAnimClasses();
                var rect = btn.getBoundingClientRect();
                var relX = event.clientX - rect.left - rect.width / 2;
                var relY = event.clientY - rect.top - rect.height / 2;
                var dx = Math.max(-maxX, Math.min(maxX, relX * 0.22));
                var dy = Math.max(-maxY, Math.min(maxY, relY * 0.25));

                window.gsap.to(btn, {
                    x: dx,
                    y: dy,
                    duration: 0.3,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            });

            btn.addEventListener("mouseleave", function () {
                window.gsap.to(btn, {
                    x: 0,
                    y: 0,
                    duration: 0.65,
                    ease: "elastic.out(1, 0.45)",
                    overwrite: "auto",
                    clearProps: "transform"
                });
            });
        });

        var playBtn = document.querySelector(".video .btn-play");
        if (playBtn) {
            playBtn.addEventListener("mousemove", function (event) {
                var rect = playBtn.getBoundingClientRect();
                var relX = event.clientX - rect.left - rect.width / 2;
                var relY = event.clientY - rect.top - rect.height / 2;
                var dx = Math.max(-10, Math.min(10, relX * 0.25));
                var dy = Math.max(-10, Math.min(10, relY * 0.25));

                window.gsap.to(playBtn, {
                    xPercent: -50,
                    yPercent: -50,
                    x: dx,
                    y: dy,
                    duration: 0.3,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            });

            playBtn.addEventListener("mouseleave", function () {
                window.gsap.to(playBtn, {
                    xPercent: -50,
                    yPercent: -50,
                    x: 0,
                    y: 0,
                    duration: 0.7,
                    ease: "elastic.out(1, 0.4)",
                    overwrite: "auto"
                });
            });
        }
    }

    /* -------------------------------------------------------------------------
     * 8. 3D Tilt + Cursor Spotlight Glow on Cards (Skiper UI-inspired)
     * ---------------------------------------------------------------------- */
    function initCardTiltGlow() {
        if (!hasFinePointer || !hasGsap || reducedMotion) return;

        var cards = Array.prototype.slice.call(document.querySelectorAll(".team-item, .service-item"));
        cards.forEach(function (card) {
            card.classList.add("om-interactive-card");

            var glow = card.querySelector(".om-card-glow");
            if (!glow) {
                glow = document.createElement("div");
                glow.className = "om-card-glow";
                glow.setAttribute("aria-hidden", "true");
                card.appendChild(glow);
            }

            card.addEventListener("mousemove", function (event) {
                var rect = card.getBoundingClientRect();
                if (!rect.width || !rect.height) return;

                var px = (event.clientX - rect.left) / rect.width;
                var py = (event.clientY - rect.top) / rect.height;
                var tiltY = (px - 0.5) * 9;
                var tiltX = (0.5 - py) * 9;

                card.style.setProperty("--om-glow-x", (px * 100).toFixed(1) + "%");
                card.style.setProperty("--om-glow-y", (py * 100).toFixed(1) + "%");
                glow.style.opacity = "1";

                window.gsap.to(card, {
                    rotationX: tiltX,
                    rotationY: tiltY,
                    transformPerspective: 900,
                    transformOrigin: "center center",
                    duration: 0.32,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            });

            card.addEventListener("mouseleave", function () {
                glow.style.opacity = "0";
                window.gsap.to(card, {
                    rotationX: 0,
                    rotationY: 0,
                    duration: 0.55,
                    ease: "power3.out",
                    overwrite: "auto",
                    clearProps: "transform"
                });
            });
        });
    }

    function boot() {
        document.documentElement.classList.add("om-anim-ready");
        initPageTransitions();
        initTextReveals();
        initScrollReveals();
        initCounters();
        initMagneticButtons();
        initCardTiltGlow();
    }

    window.OMAnimations = {
        showToast: showOmToast
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
