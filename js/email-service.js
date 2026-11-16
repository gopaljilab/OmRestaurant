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

    function notify(message, type) {
        if (typeof window.showOmToast === "function") {
            window.showOmToast(message, type);
        } else {
            window.alert(message);
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

                    notify("Thank you for subscribing! A confirmation email has been sent to " + email, "success");
                    form.reset();
                    setButtonState(btn, false, "Subscribe");
                }).catch(function (err) {
                    console.error("EmailJS newsletter sending error:", err);
                    notify("Could not send email automatically: " + (err.text || err.message || "Please check your network or EmailJS settings."), "error");
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

                    notify("We received your message! A confirmation email has been sent to " + senderEmail, "success");
                    form.reset();
                    setButtonState(btn, false, "Send Message");
                }).catch(function (err) {
                    console.error("EmailJS contact sending error:", err);
                    notify("Could not send email: " + (err.text || err.message || "Please try again later."), "error");
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
            const tableIdInput = form.querySelector("input[name='table_id']");
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
                const specialReq = (requestInput && requestInput.value.trim()) || "None";
                const tableId = tableIdInput ? tableIdInput.value.trim() : "";
                const tableNumber = tableIdInput && tableIdInput.dataset.tableNumber ? tableIdInput.dataset.tableNumber : "";
                const tableZone = tableIdInput && tableIdInput.dataset.tableZone ? tableIdInput.dataset.tableZone : "";
                const tableInfo = tableNumber
                    ? ("Table " + tableNumber + (tableZone ? " (" + tableZone + ")" : ""))
                    : "Auto-assigned best table";

                const formData = new FormData(form);
                let savedToBackend = false;

                fetch(form.action, {
                    method: "POST",
                    headers: { Accept: "application/json" },
                    body: new URLSearchParams(formData)
                })
                    .then(function (res) {
                        if (res.status === 409 || res.status === 400) {
                            return res.json().catch(function () { return {}; }).then(function (errData) {
                                const err = new Error(errData.error || "Could not reserve the selected table.");
                                err.isBookingRejection = true;
                                err.isConflict = res.status === 409 || errData.status === "table-unavailable";
                                throw err;
                            });
                        }
                        if (res.ok) {
                            savedToBackend = true;
                            return res.json().catch(function () { return {}; });
                        }
                        return null;
                    })
                    .catch(function (err) {
                        if (err && err.isBookingRejection) {
                            throw err;
                        }
                        // Static preview / offline fallback when no POST backend responds
                        return null;
                    })
                    .then(function (backendData) {
                        const rawBookingId = backendData && (backendData.booking_id || backendData.id);
                        const fallbackCode = Date.now().toString().slice(-6);
                        const confirmedResId = (backendData && backendData.reservation_id)
                            || (rawBookingId ? ("OM-B" + rawBookingId) : ("OM-B" + fallbackCode));

                        const confirmedTableNum = (backendData && backendData.table_number) || tableNumber;
                        const confirmedZone = (backendData && backendData.zone) || tableZone;
                        const confirmedTableInfo = confirmedTableNum
                            ? ("Table " + confirmedTableNum + (confirmedZone ? " (" + confirmedZone + ")" : ""))
                            : tableInfo;

                        let formattedDate = bookingDateTime;
                        let formattedTime = "";

                        if (bookingDateTime) {
                            try {
                                const dt = new Date(bookingDateTime);
                                if (!isNaN(dt.getTime())) {
                                    formattedDate = dt.toLocaleDateString("en-IN", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric"
                                    });
                                    formattedTime = dt.toLocaleTimeString("en-IN", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true
                                    });
                                }
                            } catch (e) {}

                            if (!formattedTime && bookingDateTime.indexOf("T") !== -1) {
                                const parts = bookingDateTime.split("T");
                                formattedDate = parts[0];
                                const timePart = parts[1] || "";
                                const timeSub = timePart.split(":");
                                if (timeSub.length >= 2) {
                                    let hour = parseInt(timeSub[0], 10);
                                    const min = timeSub[1];
                                    const ampm = hour >= 12 ? "PM" : "AM";
                                    hour = hour % 12 || 12;
                                    formattedTime = hour + ":" + min + " " + ampm;
                                } else {
                                    formattedTime = timePart;
                                }
                            }
                        }

                        const combinedDateTime = formattedTime
                            ? (formattedDate + " at " + formattedTime)
                            : formattedDate;

                        return window.emailjs.send(creds.serviceId, creds.templateId, {
                            name: guestName,
                            to_name: guestName,
                            guest_name: guestName,
                            user_name: guestName,
                            email: guestEmail,
                            to_email: guestEmail,
                            user_email: guestEmail,
                            guest_email: guestEmail,
                            reply_to: guestEmail,
                            reservation_id: confirmedResId,
                            booking_id: confirmedResId,
                            reservationId: confirmedResId,
                            bookingId: confirmedResId,
                            id: rawBookingId || confirmedResId,
                            order_id: confirmedResId,
                            booking_number: confirmedResId,
                            reservation_number: confirmedResId,
                            date: formattedDate,
                            booking_date: formattedDate,
                            reservation_date: formattedDate,
                            time: formattedTime,
                            booking_time: formattedTime,
                            reservation_time: formattedTime,
                            date_time: combinedDateTime,
                            booking_date_time: combinedDateTime,
                            people: partySize,
                            guests: partySize,
                            party_size: partySize,
                            num_guests: partySize,
                            table_id: (backendData && backendData.table_id) || tableId || "auto",
                            table_number: confirmedTableNum || "Auto",
                            table_zone: confirmedZone || "Any",
                            table_info: confirmedTableInfo,
                            request: specialReq,
                            special_request: specialReq,
                            message: specialReq,
                            from_name: "OmRestaurant"
                        }, creds.publicKey).then(function () {
                            return { confirmedResId: confirmedResId, confirmedTableInfo: confirmedTableInfo };
                        });
                    })
                    .then(function (result) {
                        const resSuffix = result && result.confirmedResId ? (" [ID: #" + result.confirmedResId + "]") : "";
                        const tableSuffix = tableNumber ? (" (" + (result ? result.confirmedTableInfo : tableInfo) + ")") : "";
                        notify("Reservation confirmed" + tableSuffix + resSuffix + "! A confirmation email has been sent to " + guestEmail, "success");
                        form.reset();
                        document.dispatchEvent(new CustomEvent("om:booking-complete"));
                        setButtonState(btn, false, "Book Now");
                    })
                    .catch(function (err) {
                        if (err && err.isBookingRejection) {
                            notify(err.message, "error");
                            if (err.isConflict) {
                                document.dispatchEvent(new CustomEvent("om:table-conflict"));
                            }
                            setButtonState(btn, false, "Book Now");
                            return;
                        }
                        console.error("EmailJS booking error:", err);
                        if (savedToBackend) {
                            notify("Reservation saved" + (tableNumber ? " (" + tableInfo + ")" : "") + ", though EmailJS delivery could not complete automatically.", "info");
                            form.reset();
                            document.dispatchEvent(new CustomEvent("om:booking-complete"));
                        } else {
                            notify("Could not send email: " + (err.text || err.message || "Please try again later."), "error");
                        }
                        setButtonState(btn, false, "Book Now");
                    });
            }
        });
    });
})();
