package com.omrestaurant.web;

import com.omrestaurant.service.FormService;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.view.RedirectView;

@Controller
public class FormController {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final FormService forms;

    public FormController(FormService forms) {
        this.forms = forms;
    }

    @PostMapping("/bookings")
    public RedirectView booking(@RequestParam(name = "name", defaultValue = "") String name,
                                @RequestParam(name = "email", defaultValue = "") String email,
                                @RequestParam(name = "date", defaultValue = "") String date,
                                @RequestParam(name = "people", defaultValue = "") String people,
                                @RequestParam(name = "request", defaultValue = "") String request) {
        try {
            int partySize = Integer.parseInt(people);
            LocalDateTime bookingTime = LocalDateTime.parse(date);
            if (name.isBlank() || !validEmail(email) || partySize < 1 || partySize > 100) {
                return redirect("booking.html?status=invalid");
            }
            forms.saveBooking(name.trim(), email.trim(), bookingTime, partySize, request.trim());
            return redirect("booking.html?status=booking-success");
        } catch (DateTimeParseException | NumberFormatException ex) {
            return redirect("booking.html?status=invalid");
        }
    }

    @PostMapping("/contact")
    public RedirectView contact(@RequestParam(name = "name", defaultValue = "") String name,
                                @RequestParam(name = "email", defaultValue = "") String email,
                                @RequestParam(name = "subject", defaultValue = "") String subject,
                                @RequestParam(name = "message", defaultValue = "") String message) {
        if (name.isBlank() || subject.isBlank() || message.isBlank() || !validEmail(email)) {
            return redirect("contact.html?status=invalid");
        }
        forms.saveContact(name.trim(), email.trim(), subject.trim(), message.trim());
        return redirect("contact.html?status=contact-success");
    }

    @PostMapping("/newsletter")
    public RedirectView newsletter(@RequestParam(name = "email", defaultValue = "") String email) {
        if (!validEmail(email)) {
            return redirect("index.html?status=invalid");
        }
        forms.subscribe(email.trim());
        return redirect("index.html?status=newsletter-success");
    }

    private static boolean validEmail(String email) {
        return EMAIL.matcher(email.trim()).matches();
    }

    private static RedirectView redirect(String path) {
        RedirectView view = new RedirectView("/" + path);
        view.setExposeModelAttributes(false);
        return view;
    }
}
