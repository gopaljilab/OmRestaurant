(function () {
    "use strict";

    var hero = document.querySelector(".hero-header");
    var reducedMotion = Boolean(
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    if (!hero || reducedMotion) {
        return;
    }

    var canvas = document.createElement("canvas");
    canvas.className = "hero-particles";
    canvas.setAttribute("aria-hidden", "true");

    var webglCanvas = hero.querySelector(".hero-webgl");
    if (webglCanvas && webglCanvas.nextSibling) {
        hero.insertBefore(canvas, webglCanvas.nextSibling);
    } else {
        hero.prepend(canvas);
    }

    var ctx;
    try {
        ctx = canvas.getContext("2d");
    } catch (_) {
        canvas.remove();
        return;
    }
    if (!ctx) {
        canvas.remove();
        return;
    }

    var COLORS = [
        "rgba(254, 161, 22, ",  // --primary warm amber
        "rgba(255, 196, 94, ",  // soft saffron highlight
        "rgba(241, 248, 255, "  // --light cool cream highlight
    ];

    var width = 0;
    var height = 0;
    var dpr = 1;
    var particles = [];
    var pointerX = 0;
    var pointerY = 0;
    var isVisible = true;
    var rafId = 0;

    function createParticle(spawnAtBottom) {
        var radius = 1.2 + Math.random() * 2.6;
        return {
            x: Math.random() * width,
            y: spawnAtBottom ? height + Math.random() * 40 : Math.random() * height,
            radius: radius,
            speedY: 0.22 + Math.random() * 0.48,
            swayAmp: 0.18 + Math.random() * 0.45,
            swayFreq: 0.004 + Math.random() * 0.008,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.16 + Math.random() * 0.42,
            colorPrefix: COLORS[Math.floor(Math.random() * COLORS.length)]
        };
    }

    function populate() {
        var count = width < 768 ? 22 : 38;
        particles = [];
        for (var i = 0; i < count; i += 1) {
            particles.push(createParticle(false));
        }
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        var nextW = Math.max(1, hero.clientWidth);
        var nextH = Math.max(1, hero.clientHeight);
        if (nextW === width && nextH === height) return;

        width = nextW;
        height = nextH;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        populate();
    }

    function tick(now) {
        if (!isVisible || document.hidden) {
            rafId = 0;
            return;
        }

        ctx.clearRect(0, 0, width, height);

        for (var i = 0; i < particles.length; i += 1) {
            var p = particles[i];
            p.y -= p.speedY;
            p.x += Math.sin(now * p.swayFreq + p.phase) * p.swayAmp + pointerX * 0.18;

            if (p.y < -12) {
                particles[i] = createParticle(true);
                continue;
            }
            if (p.x < -12) p.x = width + 10;
            if (p.x > width + 12) p.x = -10;

            var pulse = 0.72 + 0.28 * Math.sin(now * 0.002 + p.phase);
            var alpha = (p.alpha * pulse).toFixed(3);
            var drawY = p.y + pointerY * (p.radius * 2.5);

            ctx.beginPath();
            ctx.arc(p.x, drawY, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.colorPrefix + alpha + ")";
            ctx.fill();
        }

        rafId = window.requestAnimationFrame(tick);
    }

    function ensureRunning() {
        if (!rafId && isVisible && !document.hidden) {
            rafId = window.requestAnimationFrame(tick);
        }
    }

    hero.addEventListener("mousemove", function (event) {
        var rect = hero.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    }, { passive: true });

    hero.addEventListener("mouseleave", function () {
        pointerX = 0;
        pointerY = 0;
    }, { passive: true });

    if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                isVisible = entry.isIntersecting;
                if (isVisible) {
                    ensureRunning();
                }
            });
        }, { threshold: 0.05 });
        observer.observe(hero);
    }

    document.addEventListener("visibilitychange", ensureRunning);
    window.addEventListener("resize", resize, { passive: true });

    resize();
    ensureRunning();
})();
