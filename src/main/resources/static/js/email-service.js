(function () {
    "use strict";

    const config = window.EMAILJS_CONFIG || {};

    const isConfigured = function (val) {
        return Boolean(val && typeof val === "string" && !val.startsWith("YOUR_") && val.trim().length > 0);
    };

    function getFormCredentials(formType) {
        const formConfig = (config.forms && config.forms[formType]) || {};
        const pKey = formConfig.publicKey || config.publicKey;
        const sId = formConfig.serviceId || config.serviceId;
        const tId = formConfig.templateId || (config.templates && config.templates[formType]);
        return {
            publicKey: pKey,
            serviceId: sId,
            templateId: tId,
            isValid: Boolean(isConfigured(pKey) && isConfigured(sId) && isConfigured(tId))
        };
    }

    // Initialize default EmailJS SDK instance if default key is configured
    if (window.emailjs && isConfigured(config.publicKey)) {
        try {
            window.emailjs.init({ publicKey: config.publicKey });
        } catch (e) {
            console.warn("EmailJS init warning:", e);
        }
    }

    function setButtonState(btn, loading, defaultText) {
        if (!btn) return;
        if (loading) {
            btn.dataset.origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.origText || defaultText;
        }
    }

    // 1. Newsletter Subscription
    document.querySelectorAll("form[action*='newsletter']").forEach(function (form) {
        form.addEventListener("submit", function (e) {
            const emailInput = form.querySelector("input[name='email']");
            const email = emailInput ? emailInput.value.trim() : "";
            if (!email) return;

            const creds = getFormCredentials("newsletter");
            if (creds.isValid) {
                e.preventDefault();
                const btn = form.querySelector("button[type='submit']");
                setButtonState(btn, true, "Subscribe");

                window.emailjs.send(creds.serviceId, creds.templateId, {
                    to_email: email,
                    email: email,
                    user_email: email,
                    subscriber_email: email,
                    reply_to: email,
                    to_name: email.split("@")[0],
                    from_name: "OmRestaurant",
                    message: "Thank you for subscribing to OmRestaurant's newsletter! We are delighted to have you with us.",
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString()
                }, creds.publicKey).then(function () {
                    try {
                        const formData = new FormData(form);
                        fetch(form.action, { method: "POST", body: new URLSearchParams(formData) }).catch(function () {});
                    } catch (_) {}

                    window.alert("Thank you for subscribing! A confirmation email has been sent to " + email);
                    form.reset();
                    setButtonState(btn, false, "Subscribe");
                }).catch(function (err) {
                    console.error("EmailJS newsletter sending error:", err);
                    window.alert("Could not send email automatically: " + (err.text || err.message || "Please check your network or EmailJS settings."));
                    setButtonState(btn, false, "Subscribe");
                });
            }
        });
    });

    // 2. Contact Us Form
    document.querySelectorAll("form[action*='contact']").forEach(function (form) {
        form.addEventListener("submit", function (e) {
            const nameInput = form.querySelector("input[name='name']");
            const emailInput = form.querySelector("input[name='email']");
            const subjectInput = form.querySelector("input[name='subject']");
            const messageInput = form.querySelector("textarea[name='message']");
            if (!emailInput || !emailInput.value.trim()) return;

            const creds = getFormCredentials("contact");
            if (creds.isValid) {
                e.preventDefault();
                const btn = form.querySelector("button[type='submit']");
                setButtonState(btn, true, "Send Message");

                const senderName = nameInput ? nameInput.value.trim() : "Valued Guest";
                const senderEmail = emailInput.value.trim();
                const msgSubject = subjectInput ? subjectInput.value.trim() : "General Inquiry";
                const msgContent = messageInput ? messageInput.value.trim() : "";

                window.emailjs.send(creds.serviceId, creds.templateId, {
                    name: senderName,
                    to_name: senderName,
                    from_name: senderName,
                    user_name: senderName,
                    email: senderEmail,
                    to_email: senderEmail,
                    user_email: senderEmail,
                    reply_to: senderEmail,
                    subject: msgSubject,
                    message: msgContent,
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString()
                }, creds.publicKey).then(function () {
                    try {
                        const formData = new FormData(form);
                        fetch(form.action, { method: "POST", body: new URLSearchParams(formData) }).catch(function () {});
                    } catch (_) {}

                    window.alert("We received your message! A confirmation email has been sent to " + senderEmail);
                    form.reset();
                    setButtonState(btn, false, "Send Message");
                }).catch(function (err) {
                    console.error("EmailJS contact sending error:", err);
                    window.alert("Could not send email: " + (err.text || err.message || "Please try again later."));
                    setButtonState(btn, false, "Send Message");
                });
            }
        });
    });

    // 3. Table Booking Form
    document.querySelectorAll("form[action*='bookings'], form[action*='booking']").forEach(function (form) {
        form.addEventListener("submit", function (e) {
            const nameInput = form.querySelector("input[name='name']");
            const emailInput = form.querySelector("input[name='email']");
            const dateInput = form.querySelector("input[name='date']");
            const peopleInput = form.querySelector("select[name='people']") || form.querySelector("input[name='people']");
            const requestInput = form.querySelector("textarea[name='request']");
            if (!emailInput || !emailInput.value.trim()) return;

            const creds = getFormCredentials("booking");
            if (creds.isValid) {
                e.preventDefault();
                const btn = form.querySelector("button[type='submit']");
                setButtonState(btn, true, "Book Now");

                const guestName = nameInput ? nameInput.value.trim() : "Valued Guest";
                const guestEmail = emailInput.value.trim();
                const bookingDateTime = dateInput ? dateInput.value.trim() : "";
                const partySize = peopleInput ? peopleInput.value.trim() : "1";
                const specialReq = requestInput ? requestInput.value.trim() : "None";

                window.emailjs.send(creds.serviceId, creds.templateId, {
                    name: guestName,
                    to_name: guestName,
                    guest_name: guestName,
                    user_name: guestName,
                    email: guestEmail,
                    to_email: guestEmail,
                    user_email: guestEmail,
                    guest_email: guestEmail,
                    reply_to: guestEmail,
                    date: bookingDateTime,
                    booking_date: bookingDateTime,
                    reservation_date: bookingDateTime,
                    date_time: bookingDateTime,
                    people: partySize,
                    guests: partySize,
                    party_size: partySize,
                    num_guests: partySize,
                    request: specialReq,
                    special_request: specialReq,
                    message: specialReq,
                    from_name: "OmRestaurant"
                }, creds.publicKey).then(function () {
                    try {
                        const formData = new FormData(form);
                        fetch(form.action, { method: "POST", body: new URLSearchParams(formData) }).catch(function () {});
                    } catch (_) {}

                    window.alert("Reservation confirmed! A confirmation email has been sent to " + guestEmail);
                    form.reset();
                    setButtonState(btn, false, "Book Now");
                }).catch(function (err) {
                    console.error("EmailJS booking sending error:", err);
                    window.alert("Could not send email: " + (err.text || err.message || "Please try again later."));
                    setButtonState(btn, false, "Book Now");
                });
            }
        });
    });
})();
