(function ($) {
    "use strict";

    // Smoothly scroll to in-page links with GSAP. Keep native scrolling as a
    // fallback when GSAP is unavailable or the visitor requests reduced motion.
    if (window.gsap && window.ScrollToPlugin) {
        gsap.registerPlugin(ScrollToPlugin);
    }

    document.addEventListener("click", function (event) {
        const link = event.target.closest("a[href]");
        if (!link || event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
            link.target || link.hasAttribute("download") || link.hasAttribute("data-bs-toggle")) {
            return;
        }

        const destination = new URL(link.href, window.location.href);
        if (destination.origin !== window.location.origin ||
            destination.pathname !== window.location.pathname || !destination.hash) {
            return;
        }

        const target = destination.hash === "#" ? null : document.getElementById(decodeURIComponent(destination.hash.slice(1)));
        if (destination.hash !== "#" && !target) {
            return;
        }

        event.preventDefault();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const navbar = document.querySelector(".navbar");
        const offsetY = window.scrollY > 45 && navbar ? navbar.offsetHeight + 12 : 0;
        const complete = function () {
            window.history.replaceState({}, document.title, destination.pathname + destination.search + destination.hash);
        };

        if (window.gsap && window.ScrollToPlugin && !reducedMotion) {
            gsap.to(window, {
                duration: 1.1,
                ease: "power2.inOut",
                scrollTo: { y: target || 0, offsetY: offsetY, autoKill: true },
                onComplete: complete
            });
        } else {
            window.scrollTo({ top: target ? target.getBoundingClientRect().top + window.scrollY - offsetY : 0, behavior: "auto" });
            complete();
        }
    });

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();

    // Show the result after a form's Post/Redirect/Get cycle.
    const formStatus = new URLSearchParams(window.location.search).get("status");
    const statusMessages = {
        "booking-success": "Booking received. We will notify you soon.",
        "contact-success": "We will reach you soon.",
        "newsletter-success": "Thanks for subscribing.",
        "invalid": "Please check the form and enter valid information."
    };
    if (formStatus && statusMessages[formStatus]) {
        window.alert(statusMessages[formStatus]);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 45) {
            $('.navbar').addClass('sticky-top shadow-sm');
        } else {
            $('.navbar').removeClass('sticky-top shadow-sm');
        }
    });
    
    
    // Dropdown on mouse hover
    const $dropdown = $(".dropdown");
    const $dropdownToggle = $(".dropdown-toggle");
    const $dropdownMenu = $(".dropdown-menu");
    const showClass = "show";
    
    $(window).on("load resize", function() {
        if (this.matchMedia("(min-width: 992px)").matches) {
            $dropdown.hover(
            function() {
                const $this = $(this);
                $this.addClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "true");
                $this.find($dropdownMenu).addClass(showClass);
            },
            function() {
                const $this = $(this);
                $this.removeClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "false");
                $this.find($dropdownMenu).removeClass(showClass);
            }
            );
        } else {
            $dropdown.off("mouseenter mouseleave");
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });


    // Modal Video
    $(document).ready(function () {
        var $videoSrc;
        $('.btn-play').click(function () {
            $videoSrc = $(this).data("src");
        });
        console.log($videoSrc);

        $('#videoModal').on('shown.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
        })

        $('#videoModal').on('hide.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc);
        })
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: true,
        margin: 24,
        dots: true,
        loop: true,
        nav : false,
        responsive: {
            0:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });

    
    
})(jQuery);

