package com.omrestaurant.web;

import com.omrestaurant.model.RestaurantTable;
import com.omrestaurant.service.FormService;
import com.omrestaurant.service.FormService.TableCapacityException;
import com.omrestaurant.service.FormService.TableUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public Object booking(@RequestParam(name = "name", defaultValue = "") String name,
                          @RequestParam(name = "email", defaultValue = "") String email,
                          @RequestParam(name = "date", defaultValue = "") String date,
                          @RequestParam(name = "people", defaultValue = "") String people,
                          @RequestParam(name = "request", defaultValue = "") String request,
                          @RequestParam(name = "table_id", required = false) String tableIdParam,
                          HttpServletRequest httpRequest) {
        boolean wantsJson = expectsJson(httpRequest);
        try {
            int partySize = Integer.parseInt(people.trim());
            LocalDateTime bookingTime = LocalDateTime.parse(date.trim());
            Long tableId = parseOptionalTableId(tableIdParam);

            if (name.isBlank() || !validEmail(email) || partySize < 1 || partySize > 100) {
                return bookingErrorResponse(wantsJson, HttpStatus.BAD_REQUEST, "invalid",
                        "Please provide a valid name, email, date, and party size.");
            }

            RestaurantTable selectedTable = forms.saveBooking(
                    name.trim(), email.trim(), bookingTime, partySize, request.trim(), tableId
            );

            if (wantsJson) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("ok", true);
                body.put("status", "booking-success");
                if (selectedTable != null) {
                    body.put("table_id", selectedTable.id());
                    body.put("table_number", selectedTable.tableNumber());
                    body.put("zone", selectedTable.zone());
                }
                return ResponseEntity.ok(body);
            }
            return redirect("booking.html?status=booking-success");
        } catch (TableUnavailableException ex) {
            return bookingErrorResponse(wantsJson, HttpStatus.CONFLICT, "table-unavailable", ex.getMessage());
        } catch (TableCapacityException | IllegalArgumentException | DateTimeParseException ex) {
            return bookingErrorResponse(wantsJson, HttpStatus.BAD_REQUEST, "invalid",
                    ex.getMessage() != null && !ex.getMessage().isBlank()
                            ? ex.getMessage()
                            : "Please check the form and enter valid information.");
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

    private static Long parseOptionalTableId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        long id = Long.parseLong(raw.trim());
        if (id <= 0) {
            throw new IllegalArgumentException("Invalid table selection.");
        }
        return id;
    }

    private static boolean expectsJson(HttpServletRequest req) {
        String accept = req.getHeader("Accept");
        return accept != null && accept.contains("application/json");
    }

    private static Object bookingErrorResponse(boolean wantsJson, HttpStatus status, String code, String message) {
        if (wantsJson) {
            return ResponseEntity.status(status).body(Map.of(
                    "ok", false,
                    "status", code,
                    "error", message
            ));
        }
        return redirect("booking.html?status=" + code);
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
